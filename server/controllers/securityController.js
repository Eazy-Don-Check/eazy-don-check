const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

const {
  authenticator,
} = require('@otplib/v12-adapter');

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const User = require('../models/User');
const UserSecurity = require('../models/UserSecurity');
const UserSettings = require('../models/UserSettings');


// ============================================================
// CONFIGURATION
// ============================================================

const RP_NAME =
  process.env.WEBAUTHN_RP_NAME ||
  'EAZY DON CHECK';

const RP_ID =
  process.env.WEBAUTHN_RP_ID ||
  'localhost';

const RP_ORIGIN =
  process.env.WEBAUTHN_ORIGIN ||
  'http://localhost:5173';

const TWO_FACTOR_ISSUER =
  process.env.TWO_FACTOR_ISSUER ||
  'EAZY DON CHECK';


// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) =>
  req.user?._id ||
  req.user?.id ||
  req.user?.userId;


const getRequiredUserId = (req) => {
  const userId = getUserId(req);

  if (!userId) {
    throw new Error(
      'Authenticated user ID is unavailable.'
    );
  }

  return userId;
};


const getOrCreateSecurity = async (userId) => {
  return UserSecurity.findOneAndUpdate(
    {
      user: userId,
    },
    {
      $setOnInsert: {
        user: userId,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
};


// ============================================================
// SECRET ENCRYPTION
// ============================================================

const getEncryptionKey = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is required for security secret encryption.'
    );
  }

  return crypto
    .createHash('sha256')
    .update(
      `${process.env.JWT_SECRET}:EAZY-DON-CHECK-SECURITY`
    )
    .digest();
};


const encryptSecret = (secret) => {
  const key = getEncryptionKey();

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
};


const decryptSecret = ({
  encrypted,
  iv,
  authTag,
}) => {
  if (
    !encrypted ||
    !iv ||
    !authTag
  ) {
    throw new Error(
      'Encrypted security secret is incomplete.'
    );
  }

  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(
    Buffer.from(authTag, 'base64')
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(encrypted, 'base64')
    ),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};


// ============================================================
// RECOVERY CODES
// ============================================================

const generateRecoveryCodes = (
  count = 10
) => {
  return Array.from(
    { length: count },
    () => {
      const first = crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase();

      const second = crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase();

      return `${first}-${second}`;
    }
  );
};


const hashRecoveryCode = (code) => {
  return crypto
    .createHash('sha256')
    .update(
      String(code)
        .trim()
        .toUpperCase()
    )
    .digest('hex');
};


const consumeRecoveryCode = async (
  security,
  code
) => {
  if (
    !code ||
    !Array.isArray(
      security.totp.recoveryCodes
    )
  ) {
    return false;
  }

  const normalized = String(code)
    .trim()
    .toUpperCase();

  const hash = hashRecoveryCode(
    normalized
  );

  const recoveryCode =
    security.totp.recoveryCodes.find(
      (item) =>
        item.hash === hash &&
        !item.usedAt
    );

  if (!recoveryCode) {
    return false;
  }

  recoveryCode.usedAt = new Date();

  await security.save();

  return true;
};


// ============================================================
// JWT
// ============================================================

const issueAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is missing.'
    );
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
};


const issueTwoFactorChallenge = (
  userId
) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is missing.'
    );
  }

  return jwt.sign(
    {
      id: userId,
      purpose: '2fa-login',
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '5m',
    }
  );
};


const verifyTwoFactorChallenge = (
  token
) => {
  if (!token) {
    throw new Error(
      'Two-factor challenge is required.'
    );
  }

  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET
  );

  if (
    decoded?.purpose !==
    '2fa-login'
  ) {
    throw new Error(
      'Invalid two-factor challenge.'
    );
  }

  return decoded;
};


const sanitizeUser = (user) => {
  const data = user.toObject();

  delete data.password;

  return data;
};


// ============================================================
// WEBAUTHN HELPERS
// ============================================================

const getUserDisplayName = (user) => {
  return (
    user?.name ||
    user?.fullName ||
    [
      user?.firstName,
      user?.middleName,
      user?.lastName,
    ]
      .filter(Boolean)
      .join(' ') ||
    user?.email ||
    user?.username ||
    'EAZY DON CHECK User'
  );
};


const getWebAuthnUserName = (user) => {
  return (
    user?.email ||
    user?.username ||
    String(user?._id)
  );
};


const getCredentialIdFromRequest = (
  requestBody
) => {
  return (
    requestBody?.id ||
    requestBody?.rawId ||
    requestBody?.response?.id ||
    requestBody?.response?.rawId ||
    null
  );
};


const getRegistrationResponse = (
  requestBody
) => {
  if (
    requestBody?.response &&
    typeof requestBody.response === 'object'
  ) {
    return requestBody;
  }

  return requestBody;
};


/*
 * IMPORTANT:
 *
 * SimpleWebAuthn's verifyAuthenticationResponse()
 * expects the COMPLETE browser WebAuthn authentication
 * response:
 *
 * {
 *   id,
 *   rawId,
 *   response,
 *   type
 * }
 *
 * Do NOT return requestBody.response here.
 */
const getAuthenticationResponse = (
  requestBody
) => {
  if (
    !requestBody ||
    typeof requestBody !== 'object'
  ) {
    return null;
  }

  return requestBody;
};


const getDeviceName = (requestBody) => {
  const name = String(
    requestBody?.deviceName || ''
  ).trim();

  if (!name) {
    return 'This device';
  }

  return name.slice(0, 80);
};


/*
 * MongoDB/Mongoose may return a WebAuthn public key
 * as a Buffer, BSON Binary, Uint8Array, or another
 * binary representation.
 *
 * SimpleWebAuthn expects Uint8Array.
 */
const normalizeCredentialPublicKey = (
  publicKey
) => {
  if (!publicKey) {
    throw new Error(
      'Stored biometric public key is missing.'
    );
  }

  if (
    publicKey instanceof Uint8Array
  ) {
    return publicKey;
  }

  if (
    Buffer.isBuffer(publicKey)
  ) {
    return new Uint8Array(
      publicKey
    );
  }

  if (
    publicKey?.buffer instanceof ArrayBuffer
  ) {
    return new Uint8Array(
      publicKey.buffer,
      publicKey.byteOffset || 0,
      publicKey.byteLength
    );
  }

  if (
    publicKey?.value &&
    Buffer.isBuffer(publicKey.value)
  ) {
    return new Uint8Array(
      publicKey.value
    );
  }

  if (
    publicKey?.value instanceof Uint8Array
  ) {
    return new Uint8Array(
      publicKey.value
    );
  }

  try {
    return new Uint8Array(
      Buffer.from(publicKey)
    );
  } catch (error) {
    throw new Error(
      'Stored biometric public key has an invalid format.'
    );
  }
};


/*
 * Normalize the stored WebAuthn signature counter.
 */
const normalizeCredentialCounter = (
  counter
) => {
  const parsed =
    Number(counter);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};


// ============================================================
// GET SECURITY STATUS
// ============================================================

const getSecurityStatus = async (
  req,
  res
) => {
  try {
    const userId =
      getRequiredUserId(req);

    const security =
      await getOrCreateSecurity(userId);

    const credentials =
      Array.isArray(
        security.webauthn?.credentials
      )
        ? security.webauthn.credentials
        : [];

    res.json({
      success: true,

      data: {
        twoFactorEnabled:
          Boolean(
            security.totp?.enabled
          ),

        recoveryCodesRemaining:
          Array.isArray(
            security.totp?.recoveryCodes
          )
            ? security.totp.recoveryCodes.filter(
                (code) => !code.usedAt
              ).length
            : 0,

        biometricEnabled:
          credentials.length > 0,

        biometricCredentials:
          credentials.map(
            (credential) => ({
              id: credential._id,
              deviceName:
                credential.deviceName,
              createdAt:
                credential.createdAt,
              lastUsedAt:
                credential.lastUsedAt,
              transports:
                credential.transports || [],
            })
          ),
      },
    });
  } catch (error) {
    console.error(
      'GET SECURITY STATUS ERROR:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to load security status.',
    });
  }
};


// ============================================================
// 2FA SETUP
// ============================================================

const setupTwoFactor = async (
  req,
  res
) => {
  try {
    const userId =
      getRequiredUserId(req);

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          'User account not found.',
      });
    }

    const security =
      await getOrCreateSecurity(userId);

    if (
      security.totp.enabled
    ) {
      return res.status(409).json({
        success: false,
        message:
          'Two-factor authentication is already enabled.',
      });
    }

    const secret =
      authenticator.generateSecret();

    const encrypted =
      encryptSecret(secret);

    security.totp.pendingSecretEncrypted =
      encrypted.encrypted;

    security.totp.pendingSecretIv =
      encrypted.iv;

    security.totp.pendingSecretAuthTag =
      encrypted.authTag;

    await security.save();

    const accountName =
      user.email ||
      user.username ||
      String(user._id);

    const label =
      `${TWO_FACTOR_ISSUER}:${accountName}`;

    const otpauthUrl =
      `otpauth://totp/${encodeURIComponent(
        label
      )}?secret=${encodeURIComponent(
        secret
      )}&issuer=${encodeURIComponent(
        TWO_FACTOR_ISSUER
      )}&algorithm=SHA1&digits=6&period=30`;

    const qrCode =
      await QRCode.toDataURL(
        otpauthUrl,
        {
          width: 280,
          margin: 2,
          errorCorrectionLevel: 'M',
        }
      );

    res.json({
      success: true,

      data: {
        qrCode,
        secret,
        otpauthUrl,
        issuer:
          TWO_FACTOR_ISSUER,
        account:
          accountName,
      },
    });
  } catch (error) {
    console.error(
      '2FA SETUP ERROR:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to start two-factor setup.',
    });
  }
};


// ============================================================
// ENABLE 2FA
// ============================================================

const enableTwoFactor = async (
  req,
  res
) => {
  try {
    const userId =
      getRequiredUserId(req);

    const {
      code,
    } = req.body || {};

    const normalizedCode =
      String(code || '')
        .replace(/\s/g, '');

    if (
      !/^\d{6}$/.test(
        normalizedCode
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Enter the 6-digit authenticator code.',
      });
    }

    const security =
      await getOrCreateSecurity(userId);

    if (
      security.totp.enabled
    ) {
      return res.status(409).json({
        success: false,
        message:
          'Two-factor authentication is already enabled.',
      });
    }

    const pending =
      security.totp;

    if (
      !pending.pendingSecretEncrypted ||
      !pending.pendingSecretIv ||
      !pending.pendingSecretAuthTag
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Start the two-factor setup process first.',
      });
    }

    const secret =
      decryptSecret({
        encrypted:
          pending.pendingSecretEncrypted,
        iv:
          pending.pendingSecretIv,
        authTag:
          pending.pendingSecretAuthTag,
      });

    const valid =
      authenticator.verify({
        token:
          normalizedCode,
        secret,
      });

    if (!valid) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid authenticator code.',
      });
    }

    const recoveryCodes =
      generateRecoveryCodes(10);

    security.totp.enabled = true;

    security.totp.secretEncrypted =
      pending.pendingSecretEncrypted;

    security.totp.secretIv =
      pending.pendingSecretIv;

    security.totp.secretAuthTag =
      pending.pendingSecretAuthTag;

    security.totp.pendingSecretEncrypted =
      null;

    security.totp.pendingSecretIv =
      null;

    security.totp.pendingSecretAuthTag =
      null;

    security.totp.enabledAt =
      new Date();

    security.totp.lastVerifiedAt =
      new Date();

    security.totp.recoveryCodes =
      recoveryCodes.map(
        (recoveryCode) => ({
          hash:
            hashRecoveryCode(
              recoveryCode
            ),
          usedAt: null,
        })
      );

    await security.save();

    await UserSettings.findOneAndUpdate(
      {
        user: userId,
      },
      {
        $set: {
          'security.twoFactorEnabled':
            true,
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,

      message:
        'Two-factor authentication has been enabled.',

      data: {
        enabled: true,
        recoveryCodes,
      },
    });
  } catch (error) {
    console.error(
      'ENABLE 2FA ERROR:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to enable two-factor authentication.',
    });
  }
};


// ============================================================
// VERIFY TOTP DURING LOGIN
// ============================================================

const verifyTwoFactorLogin =
  async (req, res) => {
    try {
      const {
        challengeToken,
        code,
      } = req.body || {};

      const decoded =
        verifyTwoFactorChallenge(
          challengeToken
        );

      const user =
        await User.findById(
          decoded.id
        );

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            'Account not found.',
        });
      }

      const security =
        await getOrCreateSecurity(
          user._id
        );

      if (
        !security.totp.enabled
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Two-factor authentication is not enabled for this account.',
        });
      }

      const normalizedCode =
        String(code || '')
          .replace(/\s/g, '');

      let valid = false;

      if (
        /^\d{6}$/.test(
          normalizedCode
        )
      ) {
        const secret =
          decryptSecret({
            encrypted:
              security.totp.secretEncrypted,
            iv:
              security.totp.secretIv,
            authTag:
              security.totp.secretAuthTag,
          });

        valid =
          authenticator.verify({
            token:
              normalizedCode,
            secret,
          });
      }

      if (!valid) {
        valid =
          await consumeRecoveryCode(
            security,
            normalizedCode
          );
      }

      if (!valid) {
        return res.status(401).json({
          success: false,
          message:
            'Invalid two-factor authentication code.',
        });
      }

      security.totp.lastVerifiedAt =
        new Date();

      await security.save();

      user.isOnline = true;
      user.lastSeen = new Date();

      await user.save();

      const token =
        issueAccessToken(user);

      res.json({
        success: true,
        token,
        user:
          sanitizeUser(user),
      });
    } catch (error) {
      console.error(
        'VERIFY 2FA LOGIN ERROR:',
        error
      );

      res.status(401).json({
        success: false,
        message:
          'Two-factor verification failed.',
      });
    }
  };


// ============================================================
// DISABLE 2FA
// ============================================================

const disableTwoFactor =
  async (req, res) => {
    try {
      const userId =
        getRequiredUserId(req);

      const {
        password,
        code,
      } = req.body || {};

      const user =
        await User.findById(userId)
          .select('+password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            'User account not found.',
        });
      }

      if (!user.password) {
        return res.status(400).json({
          success: false,
          message:
            'Password hash missing for this account.',
        });
      }

      const passwordValid =
        await bcrypt.compare(
          String(password || ''),
          user.password
        );

      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          message:
            'Current password is incorrect.',
        });
      }

      const security =
        await getOrCreateSecurity(
          userId
        );

      if (
        !security.totp.enabled
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Two-factor authentication is not enabled.',
        });
      }

      const secret =
        decryptSecret({
          encrypted:
            security.totp.secretEncrypted,
          iv:
            security.totp.secretIv,
          authTag:
            security.totp.secretAuthTag,
        });

      const valid =
        authenticator.verify({
          token:
            String(code || '')
              .replace(/\s/g, ''),
          secret,
        });

      if (!valid) {
        return res.status(401).json({
          success: false,
          message:
            'Invalid authenticator code.',
        });
      }

      security.totp.enabled =
        false;

      security.totp.secretEncrypted =
        null;

      security.totp.secretIv =
        null;

      security.totp.secretAuthTag =
        null;

      security.totp.pendingSecretEncrypted =
        null;

      security.totp.pendingSecretIv =
        null;

      security.totp.pendingSecretAuthTag =
        null;

      security.totp.recoveryCodes =
        [];

      security.totp.enabledAt =
        null;

      security.totp.lastVerifiedAt =
        null;

      await security.save();

      await UserSettings.findOneAndUpdate(
        {
          user: userId,
        },
        {
          $set: {
            'security.twoFactorEnabled':
              false,
          },
        }
      );

      res.json({
        success: true,
        message:
          'Two-factor authentication has been disabled.',
      });
    } catch (error) {
      console.error(
        'DISABLE 2FA ERROR:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          'Unable to disable two-factor authentication.',
      });
    }
  };


// ============================================================
// WEBAUTHN REGISTRATION OPTIONS
// ============================================================

const beginBiometricRegistration =
  async (req, res) => {
    try {
      const userId =
        getRequiredUserId(req);

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            'User account not found.',
        });
      }

      const security =
        await getOrCreateSecurity(
          userId
        );

      const existingCredentials =
        Array.isArray(
          security.webauthn?.credentials
        )
          ? security.webauthn.credentials
          : [];

      const webAuthnUserId =
        new TextEncoder().encode(
          String(user._id)
        );

      const options =
        await generateRegistrationOptions({
          rpName:
            RP_NAME,

          rpID:
            RP_ID,

          userID:
            webAuthnUserId,

          userName:
            getWebAuthnUserName(user),

          userDisplayName:
            getUserDisplayName(user),

          attestationType:
            'none',

          timeout:
            60000,

          excludeCredentials:
            existingCredentials.map(
              (credential) => ({
                id:
                  credential.credentialId,

                type:
                  'public-key',

                transports:
                  Array.isArray(
                    credential.transports
                  )
                    ? credential.transports
                    : [],
              })
            ),

          authenticatorSelection: {
            authenticatorAttachment:
              'platform',

            residentKey:
              'preferred',

            userVerification:
              'required',
          },
        });

      security.webauthn.registrationChallenge =
        options.challenge;

      security.webauthn.registrationChallengeExpiresAt =
        new Date(
          Date.now() +
            5 * 60 * 1000
        );

      await security.save();

      return res.status(200).json({
        success: true,

        data: {
          options,
        },
      });
    } catch (error) {
      console.error(
        'BIOMETRIC REGISTRATION OPTIONS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          'Unable to start biometric registration.',
      });
    }
  };


// ============================================================
// WEBAUTHN REGISTRATION VERIFY
// ============================================================

const finishBiometricRegistration =
  async (req, res) => {
    try {
      const userId =
        getRequiredUserId(req);

      const security =
        await getOrCreateSecurity(
          userId
        );

      const challenge =
        security.webauthn
          ?.registrationChallenge;

      const expiresAt =
        security.webauthn
          ?.registrationChallengeExpiresAt;

      if (
        !challenge ||
        !expiresAt ||
        expiresAt < new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Biometric registration challenge has expired. Please try again.',
        });
      }

      const registrationResponse =
        getRegistrationResponse(
          req.body
        );

      if (
        !registrationResponse ||
        typeof registrationResponse !==
          'object'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid biometric registration response.',
        });
      }

      if (
        !registrationResponse.id ||
        !registrationResponse.response
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Incomplete biometric registration response.',
        });
      }

      const verification =
        await verifyRegistrationResponse({
          response:
            registrationResponse,

          expectedChallenge:
            challenge,

          expectedOrigin:
            RP_ORIGIN,

          expectedRPID:
            RP_ID,

          requireUserVerification:
            true,
        });

      if (
        !verification.verified ||
        !verification.registrationInfo
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Biometric registration could not be verified.',
        });
      }

      const {
        credential,
      } =
        verification.registrationInfo;

      if (
        !credential ||
        !credential.id ||
        !credential.publicKey
      ) {
        return res.status(400).json({
          success: false,
          message:
            'The biometric credential data was incomplete.',
        });
      }

      const credentialId =
        credential.id;

      const existing =
        security.webauthn.credentials.find(
          (item) =>
            String(
              item.credentialId
            ) ===
            String(
              credentialId
            )
        );

      if (existing) {
        security.webauthn.registrationChallenge =
          null;

        security.webauthn.registrationChallengeExpiresAt =
          null;

        await security.save();

        return res.status(409).json({
          success: false,
          message:
            'This biometric credential is already registered on your account.',
        });
      }

      const responseTransports =
        registrationResponse?.response
          ?.transports;

      const credentialTransports =
        credential.transports;

      const transports =
        Array.isArray(
          credentialTransports
        )
          ? credentialTransports
          : Array.isArray(
              responseTransports
            )
            ? responseTransports
            : [];

      security.webauthn.credentials.push({
        credentialId:
          String(
            credentialId
          ),

        publicKey:
          Buffer.from(
            credential.publicKey
          ),

        counter:
          Number(
            credential.counter || 0
          ),

        transports,

        deviceName:
          getDeviceName(
            req.body
          ),

        createdAt:
          new Date(),

        lastUsedAt:
          null,
      });

      security.webauthn.registrationChallenge =
        null;

      security.webauthn.registrationChallengeExpiresAt =
        null;

      await security.save();

      await UserSettings.findOneAndUpdate(
        {
          user: userId,
        },
        {
          $set: {
            'security.biometricEnabled':
              true,
          },
        },
        {
          upsert: true,
          setDefaultsOnInsert:
            true,
        }
      );

      return res.status(200).json({
        success: true,

        message:
          'Biometric login has been registered successfully.',

        data: {
          biometricEnabled:
            true,

          credentialId:
            String(
              credentialId
            ),
        },
      });
    } catch (error) {
      console.error(
        'BIOMETRIC REGISTRATION VERIFY ERROR:',
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          'Biometric registration failed.',
      });
    }
  };


// ============================================================
// WEBAUTHN LOGIN OPTIONS
// ============================================================

const beginBiometricLogin =
  async (req, res) => {
    try {
      const {
        identifier,
      } = req.body || {};

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message:
            'Email or username is required.',
        });
      }

      const normalized =
        String(identifier)
          .trim()
          .toLowerCase();

      const user =
        await User.findOne({
          $or: [
            {
              email:
                normalized,
            },
            {
              username:
                normalized,
            },
          ],
        });

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            'Biometric authentication is unavailable for this account.',
        });
      }

      const security =
        await getOrCreateSecurity(
          user._id
        );

      const credentials =
        Array.isArray(
          security.webauthn?.credentials
        )
          ? security.webauthn.credentials
          : [];

      if (
        credentials.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'No biometric credential is registered for this account.',
        });
      }

      const options =
        await generateAuthenticationOptions({
          rpID:
            RP_ID,

          userVerification:
            'required',

          timeout:
            60000,

          allowCredentials:
            credentials.map(
              (credential) => ({
                id:
                  credential.credentialId,

                type:
                  'public-key',

                transports:
                  Array.isArray(
                    credential.transports
                  )
                    ? credential.transports
                    : [],
              })
            ),
        });

      security.webauthn.authenticationChallenge =
        options.challenge;

      security.webauthn.authenticationChallengeExpiresAt =
        new Date(
          Date.now() +
            5 * 60 * 1000
        );

      await security.save();

      return res.status(200).json({
        success: true,

        data: {
          options,

          userId:
            String(
              user._id
            ),
        },
      });
    } catch (error) {
      console.error(
        'BIOMETRIC LOGIN OPTIONS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          'Unable to start biometric login.',
      });
    }
  };


// ============================================================
// WEBAUTHN LOGIN VERIFY
// ============================================================

const finishBiometricLogin =
  async (req, res) => {
    try {
      const {
        userId,
      } = req.body || {};

      if (!userId) {
        return res.status(400).json({
          success: false,
          message:
            'Biometric account identifier is missing.',
        });
      }

      const user =
        await User.findById(
          userId
        );

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            'Biometric authentication failed.',
        });
      }

      const security =
        await getOrCreateSecurity(
          user._id
        );

      const challenge =
        security.webauthn
          ?.authenticationChallenge;

      const expiresAt =
        security.webauthn
          ?.authenticationChallengeExpiresAt;

      if (
        !challenge ||
        !expiresAt ||
        expiresAt < new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Biometric challenge has expired. Please try again.',
        });
      }

      /*
       * IMPORTANT:
       * Pass the COMPLETE browser WebAuthn response.
       */
      const authenticationResponse =
        getAuthenticationResponse(
          req.body
        );

      if (
        !authenticationResponse ||
        !authenticationResponse.id ||
        !authenticationResponse.response
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Incomplete biometric authentication response.',
        });
      }

      const credentialId =
        getCredentialIdFromRequest(
          req.body
        );

      if (!credentialId) {
        return res.status(400).json({
          success: false,
          message:
            'Credential identifier is missing from authentication response.',
        });
      }

      const credentials =
        Array.isArray(
          security.webauthn?.credentials
        )
          ? security.webauthn.credentials
          : [];

      const credential =
        credentials.find(
          (item) =>
            String(
              item.credentialId
            ) ===
            String(
              credentialId
            )
        );

      if (!credential) {
        return res.status(400).json({
          success: false,
          message:
            'Biometric credential not found on account.',
        });
      }

      /*
       * Convert the stored MongoDB Buffer/Binary
       * back into Uint8Array for SimpleWebAuthn.
       */
      const publicKey =
        normalizeCredentialPublicKey(
          credential.publicKey
        );

      /*
       * Normalize the authenticator counter.
       */
      const counter =
        normalizeCredentialCounter(
          credential.counter
        );

      /*
       * IMPORTANT:
       *
       * Current SimpleWebAuthn expects:
       *
       * credential: {
       *   id,
       *   publicKey,
       *   counter,
       *   transports
       * }
       *
       * NOT:
       *
       * authenticator: {
       *   credentialID,
       *   credentialPublicKey,
       *   counter
       * }
       */
      const verification =
        await verifyAuthenticationResponse({
          response:
            authenticationResponse,

          expectedChallenge:
            challenge,

          expectedOrigin:
            RP_ORIGIN,

          expectedRPID:
            RP_ID,

          credential: {
            id:
              String(
                credential.credentialId
              ),

            publicKey,

            counter,

            transports:
              Array.isArray(
                credential.transports
              )
                ? credential.transports
                : [],
          },

          requireUserVerification:
            true,
        });

      if (
        !verification.verified
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Biometric verification failed.',
        });
      }

      /*
       * Store the new WebAuthn counter returned
       * by SimpleWebAuthn.
       */
      const newCounter =
        verification
          ?.authenticationInfo
          ?.newCounter;

      if (
        Number.isFinite(
          Number(newCounter)
        )
      ) {
        credential.counter =
          Number(newCounter);
      }

      credential.lastUsedAt =
        new Date();

      /*
       * Consume the challenge so that it cannot
       * be replayed.
       */
      security.webauthn.authenticationChallenge =
        null;

      security.webauthn.authenticationChallengeExpiresAt =
        null;

      await security.save();

      user.isOnline = true;
      user.lastSeen = new Date();

      await user.save();

      const token =
        issueAccessToken(user);

      return res.status(200).json({
        success: true,

        token,

        user:
          sanitizeUser(user),
      });
    } catch (error) {
      console.error(
        'BIOMETRIC LOGIN VERIFY ERROR:',
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          'Biometric login failed.',
      });
    }
  };


// ============================================================
// REMOVE BIOMETRIC CREDENTIAL
// ============================================================

const removeBiometricCredential =
  async (req, res) => {
    try {
      const userId =
        getRequiredUserId(req);

      const {
        credentialId,
      } = req.params;

      if (!credentialId) {
        return res.status(400).json({
          success: false,
          message:
            'Credential identifier is required.',
        });
      }

      const security =
        await getOrCreateSecurity(
          userId
        );

      const initialLength =
        security.webauthn
          .credentials.length;

      security.webauthn.credentials =
        security.webauthn.credentials.filter(
          (item) =>
            String(item._id) !==
              String(credentialId) &&
            String(item.credentialId) !==
              String(credentialId)
        );

      if (
        security.webauthn.credentials
          .length === initialLength
      ) {
        return res.status(404).json({
          success: false,
          message:
            'Biometric credential not found.',
        });
      }

      await security.save();

      if (
        security.webauthn.credentials
          .length === 0
      ) {
        await UserSettings.findOneAndUpdate(
          {
            user: userId,
          },
          {
            $set: {
              'security.biometricEnabled':
                false,
            },
          }
        );
      }

      return res.status(200).json({
        success: true,

        message:
          'Biometric credential removed successfully.',

        data: {
          biometricEnabled:
            security.webauthn.credentials
              .length > 0,
        },
      });
    } catch (error) {
      console.error(
        'REMOVE BIOMETRIC CREDENTIAL ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          'Unable to remove biometric credential.',
      });
    }
  };


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getSecurityStatus,
  setupTwoFactor,
  enableTwoFactor,
  verifyTwoFactorLogin,
  disableTwoFactor,

  beginBiometricRegistration,
  finishBiometricRegistration,

  beginBiometricLogin,
  finishBiometricLogin,

  removeBiometricCredential,
};