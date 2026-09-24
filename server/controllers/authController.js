const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const OtpVerification = require('../models/OtpVerification');
const UserSecurity = require('../models/UserSecurity');

const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const sendSms = require('../utils/smsService');

const {
  generateOtp,
  hashOtp,
  compareOtp,
  getOtpExpiry,
  getResendCooldownMs,
  getMaxAttempts,
} = require('../utils/otp');

// ============================================================
// HELPERS
// ============================================================

const normalizeEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase();

const normalizeUsername = (username) =>
  String(username || '')
    .trim()
    .toLowerCase();

const normalizePhone = (phone) => {
  let value = String(phone || '')
    .trim()
    .replace(/[^\d+]/g, '');

  if (!value) {
    return '';
  }

  if (
    value.startsWith('0') &&
    value.length === 11
  ) {
    value = `+234${value.slice(1)}`;
  }

  if (
    value.startsWith('234') &&
    !value.startsWith('+')
  ) {
    value = `+${value}`;
  }

  if (value.startsWith('00')) {
    value = `+${value.slice(2)}`;
  }

  return value;
};

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidPhone = (phone) =>
  /^\+[1-9]\d{7,14}$/.test(phone);

const maskEmail = (email) => {
  const [name, domain] =
    String(email).split('@');

  if (!name || !domain) {
    return 'your email address';
  }

  const visible =
    name.length <= 2
      ? name.charAt(0)
      : name.slice(0, 2);

  return `${visible}***@${domain}`;
};

const maskPhone = (phone) => {
  const value = String(phone || '');

  if (value.length <= 4) {
    return 'your phone number';
  }

  return `••••••${value.slice(-4)}`;
};

const genericRecoveryResponse = {
  success: true,
  message:
    'If the account exists and the selected verification method is available, a verification code has been sent.',
};

const buildOtpEmail = ({
  name,
  otp,
  purpose,
}) => {
  const title =
    purpose === 'SIGNUP'
      ? 'Verify Your Account'
      : 'Password Reset Verification';

  const intro =
    purpose === 'SIGNUP'
      ? 'Use the verification code below to complete your EAZY DON CHECK registration.'
      : 'Use the verification code below to reset your EAZY DON CHECK password.';

  return {
    subject:
      purpose === 'SIGNUP'
        ? 'EAZY DON CHECK - Verify Your Account'
        : 'EAZY DON CHECK - Password Reset Code',

    text: `
Hello ${name || 'there'},

${intro}

Your verification code is:

${otp}

This code will expire in ${
      Number(
        process.env.OTP_EXPIRES_MINUTES || 10
      )
    } minutes.

For your security, never share this code with anyone.

Regards,
EAZY DON CHECK
`,

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>${title}</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f1f5f9;
  font-family:Arial,Helvetica,sans-serif;
  color:#0f172a;
">

  <div style="
    max-width:600px;
    margin:40px auto;
    background:#ffffff;
    border-radius:18px;
    overflow:hidden;
    border:1px solid #e2e8f0;
  ">

    <div style="
      padding:28px;
      background:#0f172a;
      color:#ffffff;
      text-align:center;
    ">
      <h1 style="
        margin:0;
        font-size:24px;
      ">
        EAZY DON CHECK
      </h1>

      <p style="
        margin:8px 0 0;
        color:#cbd5e1;
        font-size:14px;
      ">
        ${title}
      </p>
    </div>

    <div style="padding:32px;">

      <p style="
        font-size:15px;
        line-height:1.7;
        color:#475569;
      ">
        Hello ${name || 'there'},
      </p>

      <p style="
        font-size:15px;
        line-height:1.7;
        color:#475569;
      ">
        ${intro}
      </p>

      <div style="
        margin:30px 0;
        text-align:center;
      ">

        <div style="
          display:inline-block;
          padding:18px 28px;
          background:#eff6ff;
          border:1px solid #bfdbfe;
          border-radius:12px;
          color:#1d4ed8;
          font-size:32px;
          font-weight:800;
          letter-spacing:8px;
        ">
          ${otp}
        </div>

      </div>

      <p style="
        font-size:13px;
        line-height:1.6;
        color:#64748b;
      ">
        This code expires in
        <strong>${
          Number(
            process.env.OTP_EXPIRES_MINUTES || 10
          )
        } minutes</strong>.
      </p>

      <p style="
        font-size:13px;
        line-height:1.6;
        color:#64748b;
      ">
        If you did not request this code,
        you can safely ignore this message.
      </p>

    </div>

    <div style="
      padding:20px;
      text-align:center;
      background:#f8fafc;
      color:#94a3b8;
      font-size:12px;
    ">
      EAZY DON CHECK<br />
      Secure account verification
    </div>

  </div>

</body>
</html>
`,
  };
};

const sendOtpToChannel = async ({
  channel,
  destination,
  name,
  otp,
  purpose,
}) => {
  if (channel === 'email') {
    const email = buildOtpEmail({
      name,
      otp,
      purpose,
    });

    await sendEmail({
      to: destination,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    return;
  }

  if (channel === 'phone') {
    await sendSms({
      to: destination,
      message:
        purpose === 'SIGNUP'
          ? `EAZY DON CHECK verification code: ${otp}. It expires in ${
              Number(
                process.env.OTP_EXPIRES_MINUTES || 10
              )
            } minutes.`
          : `EAZY DON CHECK password reset code: ${otp}. It expires in ${
              Number(
                process.env.OTP_EXPIRES_MINUTES || 10
              )
            } minutes.`,
    });

    return;
  }

  throw new Error(
    'Unsupported verification channel.'
  );
};

const createOrReplaceOtp = async ({
  purpose,
  channel,
  destination,
  referenceId,
  name,
}) => {
  const existing =
    await OtpVerification.findOne({
      purpose,
      channel,
      referenceId,
      verifiedAt: null,
    });

  const now = Date.now();

  if (existing) {
    const cooldown =
      getResendCooldownMs();

    const lastSent =
      existing.lastSentAt
        ? existing.lastSentAt.getTime()
        : 0;

    if (
      now - lastSent <
      cooldown
    ) {
      const secondsRemaining =
        Math.ceil(
          (
            cooldown -
            (now - lastSent)
          ) / 1000
        );

      const error =
        new Error(
          `Please wait ${secondsRemaining} seconds before requesting another code.`
        );

      error.code =
        'OTP_COOLDOWN';

      throw error;
    }

    if (existing.sendCount >= 5) {
      const error =
        new Error(
          'Too many verification codes have been requested. Please start again later.'
        );

      error.code =
        'OTP_SEND_LIMIT';

      throw error;
    }
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = getOtpExpiry();

  if (existing) {
    existing.otpHash = otpHash;
    existing.expiresAt = expiresAt;
    existing.attempts = 0;
    existing.sendCount += 1;
    existing.lastSentAt = new Date();

    await existing.save();
  } else {
    await OtpVerification.create({
      purpose,
      channel,
      destination,
      referenceId,
      otpHash,
      expiresAt,
      attempts: 0,
      sendCount: 1,
      lastSentAt: new Date(),
    });
  }

  try {
    await sendOtpToChannel({
      channel,
      destination,
      name,
      otp,
      purpose,
    });
  } catch (error) {
    if (existing) {
      await OtpVerification.deleteOne({
        _id: existing._id,
      });
    } else {
      await OtpVerification.deleteOne({
        purpose,
        channel,
        referenceId,
      });
    }

    throw error;
  }

  return {
    expiresAt,
  };
};

const verifyStoredOtp = async ({
  purpose,
  channel,
  referenceId,
  otp,
}) => {
  const record =
    await OtpVerification.findOne({
      purpose,
      channel,
      referenceId,
      verifiedAt: null,
      expiresAt: {
        $gt: new Date(),
      },
    }).select(
      '+otpHash'
    );

  if (!record) {
    return {
      success: false,
      message:
        'The verification code is invalid or has expired.',
    };
  }

  const maxAttempts =
    getMaxAttempts();

  if (
    record.attempts >=
    maxAttempts
  ) {
    await OtpVerification.deleteOne({
      _id: record._id,
    });

    return {
      success: false,
      message:
        'Too many incorrect verification attempts. Please request a new code.',
    };
  }

  const valid =
    compareOtp(
      String(otp || '').trim(),
      record.otpHash
    );

  if (!valid) {
    record.attempts += 1;
    await record.save();

    return {
      success: false,
      message:
        `Incorrect verification code. ${
          Math.max(
            maxAttempts -
              record.attempts,
            0
          )
        } attempts remaining.`,
    };
  }

  record.verifiedAt =
    new Date();

  await record.save();

  return {
    success: true,
    record,
  };
};

// ============================================================
// REGISTER
// ============================================================

const startRegistration = async (
  req,
  res
) => {
  try {
    const {
      name,
      username,
      email,
      password,
      phone,
      location,
      gender,
      relationshipStatus,
      education,
      avatarUrl,
    } = req.body;

    const normalizedEmail =
      normalizeEmail(email);

    const normalizedUsername =
      normalizeUsername(username);

    const normalizedPhone =
      normalizePhone(phone);

    if (
      !name ||
      !normalizedUsername ||
      !normalizedEmail ||
      !password ||
      !normalizedPhone
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please fill in all required registration fields.',
      });
    }

    if (
      !isValidEmail(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide a valid email address.',
      });
    }

    if (
      !isValidPhone(
        normalizedPhone
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide a valid phone number. Example: +2348012345678',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 6 characters long.',
      });
    }

    if (
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Password is too long.',
      });
    }

    const [
      existingEmail,
      existingUsername,
      existingPhone,
    ] = await Promise.all([
      User.findOne({
        email: normalizedEmail,
      }),

      User.findOne({
        username:
          normalizedUsername,
      }),

      User.findOne({
        phone:
          normalizedPhone,
      }),
    ]);

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message:
          'An account already exists with this email address.',
      });
    }

    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message:
          'This username is already taken.',
      });
    }

    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message:
          'An account already exists with this phone number.',
      });
    }

    await PendingRegistration.deleteMany({
      $or: [
        {
          email:
            normalizedEmail,
        },
        {
          username:
            normalizedUsername,
        },
        {
          phone:
            normalizedPhone,
        },
      ],
    });

    const passwordHash =
      await bcrypt.hash(
        password,
        10
      );

    const pending =
      await PendingRegistration.create({
        name:
          String(name).trim(),

        username:
          normalizedUsername,

        email:
          normalizedEmail,

        phone:
          normalizedPhone,

        passwordHash,

        location:
          String(
            location || ''
          ).trim(),

        gender:
          String(
            gender ||
              'Not specified'
          ).trim(),

        relationshipStatus:
          String(
            relationshipStatus ||
              'Single'
          ).trim(),

        education: {
          highestQualification:
            String(
              education
                ?.highestQualification ||
                ''
            ).trim(),

          institution:
            String(
              education
                ?.institution ||
                ''
            ).trim(),

          courseOfStudy:
            String(
              education
                ?.courseOfStudy ||
                ''
            ).trim(),

          graduationYear:
            String(
              education
                ?.graduationYear ||
                ''
            ).trim(),
        },

        avatarUrl:
          String(
            avatarUrl || ''
          ).trim(),

        expiresAt:
          new Date(
            Date.now() +
              30 * 60 * 1000
          ),
      });

    return res.status(201).json({
      success: true,
      message:
        'Registration details accepted. Please verify your identity with an OTP.',
      data: {
        registrationId:
          pending._id,
        email:
          maskEmail(
            pending.email
          ),
        phone:
          maskPhone(
            pending.phone
          ),
        availableChannels: [
          'email',
          'phone',
        ],
      },
    });
  } catch (error) {
    console.error(
      'Start registration error:',
      error
    );

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          'An account or registration with these details already exists.',
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Server registration error.',
    });
  }
};

const registerUser = startRegistration;

// ============================================================
// SEND SIGNUP OTP
// ============================================================

const sendSignupOtp = async (
  req,
  res
) => {
  try {
    const {
      registrationId,
      channel,
    } = req.body;

    if (
      !registrationId ||
      !channel
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Registration ID and verification method are required.',
      });
    }

    if (
      !['email', 'phone'].includes(
        channel
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid verification method.',
      });
    }

    const pending =
      await PendingRegistration.findById(
        registrationId
      );

    if (!pending) {
      return res.status(400).json({
        success: false,
        message:
          'This registration session has expired. Please start signup again.',
      });
    }

    if (
      pending.expiresAt <=
      new Date()
    ) {
      await PendingRegistration.deleteOne({
        _id:
          pending._id,
      });

      return res.status(400).json({
        success: false,
        message:
          'This registration session has expired. Please start signup again.',
      });
    }

    const destination =
      channel === 'email'
        ? pending.email
        : pending.phone;

    const result =
      await createOrReplaceOtp({
        purpose: 'SIGNUP',
        channel,
        destination,
        referenceId:
          pending._id,
        name: pending.name,
      });

    pending.verificationChannel =
      channel;

    await pending.save();

    return res.status(200).json({
      success: true,
      message:
        channel === 'email'
          ? `A verification code has been sent to ${maskEmail(
              pending.email
            )}.`
          : `A verification code has been sent to ${maskPhone(
              pending.phone
            )}.`,
      data: {
        channel,
        expiresAt:
          result.expiresAt,
        destination:
          channel === 'email'
            ? maskEmail(
                pending.email
              )
            : maskPhone(
                pending.phone
              ),
      },
    });
  } catch (error) {
    console.error(
      'Send signup OTP error:',
      error
    );

    if (
      error.code ===
      'OTP_COOLDOWN'
    ) {
      return res.status(429).json({
        success: false,
        message:
          error.message,
      });
    }

    if (
      error.code ===
      'OTP_SEND_LIMIT'
    ) {
      return res.status(429).json({
        success: false,
        message:
          error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to send verification code.',
    });
  }
};

// ============================================================
// VERIFY SIGNUP OTP
// ============================================================

const verifySignupOtp = async (
  req,
  res
) => {
  try {
    const {
      registrationId,
      channel,
      otp,
    } = req.body;

    if (
      !registrationId ||
      !channel ||
      !otp
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Registration ID, verification method and OTP are required.',
      });
    }

    if (
      !['email', 'phone'].includes(
        channel
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid verification method.',
      });
    }

    if (
      !/^\d{6}$/.test(
        String(otp).trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Verification code must contain exactly 6 digits.',
      });
    }

    const pending =
      await PendingRegistration.findById(
        registrationId
      );

    if (!pending) {
      return res.status(400).json({
        success: false,
        message:
          'This registration session has expired. Please start signup again.',
      });
    }

    if (
      pending.expiresAt <=
      new Date()
    ) {
      await PendingRegistration.deleteOne({
        _id:
          pending._id,
      });

      return res.status(400).json({
        success: false,
        message:
          'This registration session has expired. Please start signup again.',
      });
    }

    const verification =
      await verifyStoredOtp({
        purpose: 'SIGNUP',
        channel,
        referenceId:
          pending._id,
        otp,
      });

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message:
          verification.message,
      });
    }

    const existing =
      await User.findOne({
        $or: [
          {
            email:
              pending.email,
          },
          {
            username:
              pending.username,
          },
          {
            phone:
              pending.phone,
          },
        ],
      });

    if (existing) {
      await OtpVerification.deleteMany({
        purpose: 'SIGNUP',
        referenceId:
          pending._id,
      });

      await PendingRegistration.deleteOne({
        _id:
          pending._id,
      });

      return res.status(409).json({
        success: false,
        message:
          'An account with these details has already been created.',
      });
    }

    const user =
      new User({
        name:
          pending.name,

        username:
          pending.username,

        email:
          pending.email,

        phone:
          pending.phone,

        password:
          pending.passwordHash,

        location:
          pending.location,

        gender:
          pending.gender,

        relationshipStatus:
          pending.relationshipStatus,

        education:
          pending.education,

        avatarUrl:
          pending.avatarUrl,

        accountStatus:
          'active',

        registrationVerified:
          true,

        gamification: {
          emailVerified:
            channel === 'email',

          phoneVerified:
            channel === 'phone',

          xpPoints: 0,

          profileCompletion: 0,

          starRank: 'Bronze',
        },
      });

    user.$locals =
      user.$locals || {};

    user.$locals.passwordAlreadyHashed =
      true;

    await user.save();

    await OtpVerification.deleteMany({
      purpose: 'SIGNUP',
      referenceId:
        pending._id,
    });

    await PendingRegistration.deleteOne({
      _id:
        pending._id,
    });

    return res.status(201).json({
      success: true,
      message:
        'Your account has been verified successfully. You can now log in with your credentials.',
      data: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountStatus:
          user.accountStatus,
        registrationVerified:
          user.registrationVerified,
        gamification:
          user.gamification,
        avatar:
          user.avatar,
      },
    });
  } catch (error) {
    console.error(
      'Verify signup OTP error:',
      error
    );

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          'An account with these details already exists.',
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Unable to complete account verification.',
    });
  }
};

// ============================================================
// LOGIN
// ============================================================

const loginUser = async (
  req,
  res
) => {
  try {
    const {
      email,
      identifier,
      password,
    } = req.body;

    const loginIdentifier =
      String(
        identifier ||
          email ||
          ''
      ).trim();

    if (
      !loginIdentifier ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide your email/username and password.',
      });
    }

    const normalized =
      loginIdentifier.toLowerCase();

    const query =
      normalized.includes('@')
        ? {
            email: normalized,
          }
        : {
            $or: [
              {
                username:
                  normalized,
              },
              {
                email:
                  normalized,
              },
            ],
          };

    const user =
      await User.findOne(
        query
      ).select(
        '+password'
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid email/username or password.',
      });
    }

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid email/username or password.',
      });
    }

    if (
      user.accountStatus ===
        'suspended' ||
      user.accountStatus ===
        'banned'
    ) {
      return res.status(403).json({
        success: false,
        message:
          `Your account has been ${user.accountStatus}. Contact support.`,
      });
    }

    if (
      user.registrationVerified ===
      false
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Please verify your account before logging in.',
      });
    }

    // ========================================================
    // TWO-FACTOR AUTHENTICATION ENFORCEMENT
    // ========================================================
    //
    // Password verification happens first.
    // When TOTP 2FA is enabled, DO NOT issue the normal JWT.
    // Instead, issue the short-lived 2FA challenge token created
    // by securityController.js.
    //
    // Requiring the security record itself to say enabled prevents
    // a stale UserSettings flag from accidentally locking users out.
    // ========================================================

    let security = null;

    try {
      security =
        await UserSecurity.findOne({
          user: user._id,
        });
    } catch (securityError) {
      console.error(
        'Login security lookup error:',
        securityError
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to verify account security settings.',
      });
    }

    if (
      security?.totp?.enabled === true
    ) {
      /*
       * Require the security controller's challenge issuer.
       * This keeps the actual 2FA challenge implementation in one
       * place and prevents creating a second incompatible token.
       */
      const {
        issueTwoFactorChallenge,
      } = require('./securityController');

      const challengeToken =
        issueTwoFactorChallenge(
          user._id
        );

      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        message:
          'Two-factor authentication is required to complete login.',
        challengeToken,
        data: {
          requiresTwoFactor: true,
          challengeToken,
          userId:
            user._id,
          email:
            user.email,
        },
      });
    }

    // ========================================================
    // NORMAL LOGIN — 2FA NOT ENABLED
    // ========================================================

    return res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        avatarUrl:
          user.avatarUrl,
        accountStatus:
          user.accountStatus,
        registrationVerified:
          user.registrationVerified,
        gamification:
          user.gamification,
        subscription:
          user.subscription,
        usage:
          user.usage,
        token:
          generateToken(
            user._id,
            user.role
          ),
      },
    });
  } catch (error) {
    console.error(
      'Login error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Server login error.',
    });
  }
};

// ============================================================
// CURRENT USER
// ============================================================

const getMe = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.user._id
      ).select(
        '-password'
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(
      'Get current user error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Error fetching user profile.',
    });
  }
};

// ============================================================
// FORGOT PASSWORD - SEND OTP
// ============================================================

const forgotPassword =
  async (req, res) => {
    try {
      const {
        identifier,
        email,
        channel,
      } = req.body;

      const value =
        String(
          identifier ||
            email ||
            ''
        ).trim();

      if (!value) {
        return res.status(400).json({
          success: false,
          message:
            'Please provide your email address or phone number.',
        });
      }

      if (
        !['email', 'phone'].includes(
          channel
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Please select Email or Phone verification.',
        });
      }

      const normalizedEmail =
        normalizeEmail(value);

      const normalizedPhone =
        normalizePhone(value);

      let user = null;

      if (channel === 'email') {
        user =
          await User.findOne({
            email:
              normalizedEmail,
          });
      } else {
        user =
          await User.findOne({
            phone:
              normalizedPhone,
          });
      }

      if (
        !user ||
        user.accountStatus ===
          'banned'
      ) {
        return res.status(200).json(
          genericRecoveryResponse
        );
      }

      const destination =
        channel === 'email'
          ? user.email
          : user.phone;

      if (
        channel === 'email' &&
        user.gamification
          ?.emailVerified !== true
      ) {
        return res.status(200).json(
          genericRecoveryResponse
        );
      }

      if (
        channel === 'phone' &&
        user.gamification
          ?.phoneVerified !== true
      ) {
        return res.status(200).json(
          genericRecoveryResponse
        );
      }

      await createOrReplaceOtp({
        purpose:
          'PASSWORD_RESET',
        channel,
        destination,
        referenceId:
          user._id,
        name:
          user.name,
      });

      return res.status(200).json({
        ...genericRecoveryResponse,
        data: {
          resetRequestId:
            user._id,
          channel,
          destination:
            channel === 'email'
              ? maskEmail(
                  user.email
                )
              : maskPhone(
                  user.phone
                ),
        },
      });
    } catch (error) {
      console.error(
        'Forgot password error:',
        error
      );

      if (
        error.code ===
        'OTP_COOLDOWN'
      ) {
        return res.status(429).json({
          success: false,
          message:
            error.message,
        });
      }

      if (
        error.code ===
        'OTP_SEND_LIMIT'
      ) {
        return res.status(429).json({
          success: false,
          message:
            error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          'Unable to initiate password recovery.',
      });
    }
  };

// ============================================================
// RESET PASSWORD WITH OTP
// ============================================================

const resetPassword =
  async (req, res) => {
    try {
      const {
        resetRequestId,
        channel,
        otp,
        password,
        confirmPassword,
      } = req.body;

      if (
        !resetRequestId ||
        !channel ||
        !otp ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Reset request, verification method, OTP and new password are required.',
        });
      }

      if (
        !['email', 'phone'].includes(
          channel
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid verification method.',
        });
      }

      if (
        !/^\d{6}$/.test(
          String(otp).trim()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Verification code must contain exactly 6 digits.',
        });
      }

      if (
        password.length < 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Password must be at least 6 characters long.',
        });
      }

      if (
        password.length > 128
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Password is too long.',
        });
      }

      if (
        password !==
        confirmPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Passwords do not match.',
        });
      }

      const user =
        await User.findById(
          resetRequestId
        ).select(
          '+password'
        );

      if (!user) {
        return res.status(400).json({
          success: false,
          message:
            'This password reset request is invalid or has expired.',
        });
      }

      if (
        user.accountStatus ===
        'banned'
      ) {
        return res.status(403).json({
          success: false,
          message:
            'This account cannot reset its password.',
        });
      }

      const verification =
        await verifyStoredOtp({
          purpose:
            'PASSWORD_RESET',
          channel,
          referenceId:
            user._id,
          otp,
        });

      if (!verification.success) {
        return res.status(400).json({
          success: false,
          message:
            verification.message,
        });
      }

      user.password =
        password;

      user.passwordResetToken =
        undefined;

      user.passwordResetExpires =
        undefined;

      await user.save();

      await OtpVerification.deleteMany({
        purpose:
          'PASSWORD_RESET',
        referenceId:
          user._id,
      });

      return res.status(200).json({
        success: true,
        message:
          'Password reset successful. You can now log in with your new password.',
      });
    } catch (error) {
      console.error(
        'Reset password error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Error resetting password.',
      });
    }
  };

// ============================================================
// UPDATE PASSWORD
// ============================================================

const updatePassword =
  async (req, res) => {
    try {
      const {
        currentPassword,
        newPassword,
      } = req.body;

      if (
        !currentPassword ||
        !newPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Please provide both current and new password.',
        });
      }

      if (
        newPassword.length < 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            'New password must be at least 6 characters long.',
        });
      }

      const user =
        await User.findById(
          req.user._id
        ).select(
          '+password'
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            'User account not found.',
        });
      }

      const isMatch =
        await bcrypt.compare(
          currentPassword,
          user.password
        );

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message:
            'Incorrect current password.',
        });
      }

      user.password =
        newPassword;

      await user.save();

      return res.status(200).json({
        success: true,
        message:
          'Password updated successfully.',
        token:
          generateToken(
            user._id,
            user.role
          ),
      });
    } catch (error) {
      console.error(
        'Update password error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Error updating password.',
      });
    }
  };

// ============================================================
// LOGOUT
// ============================================================

const logoutUser = async (
  req,
  res
) => {
  return res.status(200).json({
    success: true,
    message:
      'User logged out successfully.',
  });
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  registerUser,
  startRegistration,
  sendSignupOtp,
  verifySignupOtp,
  loginUser,
  getMe,
  forgotPassword,
  resetPassword,
  updatePassword,
  logoutUser,
};