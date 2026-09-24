const mongoose = require('mongoose');


// ============================================================
// RECOVERY CODE SCHEMA
// ============================================================

const RecoveryCodeSchema = new mongoose.Schema(
  {
    hash: {
      type: String,
      required: true,
    },

    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);


// ============================================================
// WEBAUTHN CREDENTIAL SCHEMA
// ============================================================

const WebAuthnCredentialSchema = new mongoose.Schema(
  {
    credentialId: {
      type: String,
      required: true,
    },

    publicKey: {
      type: Buffer,
      required: true,
    },

    counter: {
      type: Number,
      default: 0,
    },

    transports: {
      type: [String],
      default: [],
    },

    deviceName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'Biometric Device',
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: true,
  }
);


// ============================================================
// USER SECURITY SCHEMA
// ============================================================

const UserSecuritySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },


    // ========================================================
    // TOTP / TWO-FACTOR AUTHENTICATION
    // ========================================================

    totp: {
      enabled: {
        type: Boolean,
        default: false,
      },

      secretEncrypted: {
        type: String,
        default: null,
      },

      secretIv: {
        type: String,
        default: null,
      },

      secretAuthTag: {
        type: String,
        default: null,
      },

      pendingSecretEncrypted: {
        type: String,
        default: null,
      },

      pendingSecretIv: {
        type: String,
        default: null,
      },

      pendingSecretAuthTag: {
        type: String,
        default: null,
      },

      recoveryCodes: {
        type: [RecoveryCodeSchema],
        default: [],
      },

      enabledAt: {
        type: Date,
        default: null,
      },

      lastVerifiedAt: {
        type: Date,
        default: null,
      },
    },


    // ========================================================
    // WEBAUTHN / PASSKEYS
    // ========================================================

    webauthn: {
      credentials: {
        type: [WebAuthnCredentialSchema],
        default: [],
      },

      registrationChallenge: {
        type: String,
        default: null,
      },

      registrationChallengeExpiresAt: {
        type: Date,
        default: null,
      },

      authenticationChallenge: {
        type: String,
        default: null,
      },

      authenticationChallengeExpiresAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);


module.exports =
  mongoose.models.UserSecurity ||
  mongoose.model(
    'UserSecurity',
    UserSecuritySchema
  );