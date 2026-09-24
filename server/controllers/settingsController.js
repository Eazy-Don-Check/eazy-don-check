const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} = require('docx');

const UserSettings = require('../models/UserSettings');
const User = require('../models/User');


// ============================================================
// DEFAULT SETTINGS
// ============================================================

const DEFAULT_SETTINGS = {
  appearance: {
    theme: 'system',
  },

  notifications: {
    system: true,
    messages: true,
    friendRequests: true,
    comments: true,
    likes: true,
    email: true,
  },

  privacy: {
    profileVisibility: 'public',
    whoCanMessage: 'everyone',
    showOnlineStatus: true,
    showActivityStatus: true,
  },

  security: {
    twoFactorEnabled: false,
    biometricEnabled: false,
    sensitiveActionConfirmation: true,
  },

  verification: {
    scanNotifications: true,
    verificationResults: true,
    saveScanHistory: true,
  },

  community: {
    friendRequests: true,
    communityNotifications: true,
    profileSuggestions: true,
  },
};


// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId
  );
};


const isPlainObject = (value) => {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
};


const deepMerge = (base, patch) => {
  const result = {
    ...(isPlainObject(base) ? base : {}),
  };

  if (!isPlainObject(patch)) {
    return result;
  }

  Object.keys(patch).forEach((key) => {
    const patchValue = patch[key];
    const baseValue = result[key];

    if (
      isPlainObject(patchValue) &&
      isPlainObject(baseValue)
    ) {
      result[key] = deepMerge(
        baseValue,
        patchValue
      );
    } else {
      result[key] = patchValue;
    }
  });

  return result;
};


const pickBoolean = (
  source,
  key,
  fallback
) => {
  if (
    !isPlainObject(source) ||
    source[key] === undefined
  ) {
    return fallback;
  }

  if (typeof source[key] !== 'boolean') {
    throw new Error(
      `${key} must be a boolean.`
    );
  }

  return source[key];
};


const pickEnum = (
  source,
  key,
  allowedValues,
  fallback
) => {
  if (
    !isPlainObject(source) ||
    source[key] === undefined
  ) {
    return fallback;
  }

  if (!allowedValues.includes(source[key])) {
    throw new Error(
      `${key} must be one of: ${allowedValues.join(', ')}.`
    );
  }

  return source[key];
};


// ============================================================
// NORMALIZE SETTINGS
// ============================================================

const normalizeSettings = (settings) => {
  const source = settings || {};

  const appearance = isPlainObject(source.appearance)
    ? source.appearance
    : {};

  const notifications = isPlainObject(source.notifications)
    ? source.notifications
    : {};

  const privacy = isPlainObject(source.privacy)
    ? source.privacy
    : {};

  const security = isPlainObject(source.security)
    ? source.security
    : {};

  const verification = isPlainObject(source.verification)
    ? source.verification
    : {};

  const community = isPlainObject(source.community)
    ? source.community
    : {};

  return {
    appearance: {
      theme: pickEnum(
        appearance,
        'theme',
        ['light', 'dark', 'system'],
        DEFAULT_SETTINGS.appearance.theme
      ),
    },

    notifications: {
      system: pickBoolean(
        notifications,
        'system',
        DEFAULT_SETTINGS.notifications.system
      ),

      messages: pickBoolean(
        notifications,
        'messages',
        DEFAULT_SETTINGS.notifications.messages
      ),

      friendRequests: pickBoolean(
        notifications,
        'friendRequests',
        DEFAULT_SETTINGS.notifications.friendRequests
      ),

      comments: pickBoolean(
        notifications,
        'comments',
        DEFAULT_SETTINGS.notifications.comments
      ),

      likes: pickBoolean(
        notifications,
        'likes',
        DEFAULT_SETTINGS.notifications.likes
      ),

      email: pickBoolean(
        notifications,
        'email',
        DEFAULT_SETTINGS.notifications.email
      ),
    },

    privacy: {
      profileVisibility: pickEnum(
        privacy,
        'profileVisibility',
        ['public', 'friends', 'private'],
        DEFAULT_SETTINGS.privacy.profileVisibility
      ),

      whoCanMessage: pickEnum(
        privacy,
        'whoCanMessage',
        ['everyone', 'friends', 'nobody'],
        DEFAULT_SETTINGS.privacy.whoCanMessage
      ),

      showOnlineStatus: pickBoolean(
        privacy,
        'showOnlineStatus',
        DEFAULT_SETTINGS.privacy.showOnlineStatus
      ),

      showActivityStatus: pickBoolean(
        privacy,
        'showActivityStatus',
        DEFAULT_SETTINGS.privacy.showActivityStatus
      ),
    },

    security: {
      twoFactorEnabled: pickBoolean(
        security,
        'twoFactorEnabled',
        DEFAULT_SETTINGS.security.twoFactorEnabled
      ),

      biometricEnabled: pickBoolean(
        security,
        'biometricEnabled',
        DEFAULT_SETTINGS.security.biometricEnabled
      ),

      sensitiveActionConfirmation: pickBoolean(
        security,
        'sensitiveActionConfirmation',
        DEFAULT_SETTINGS.security.sensitiveActionConfirmation
      ),
    },

    verification: {
      scanNotifications: pickBoolean(
        verification,
        'scanNotifications',
        DEFAULT_SETTINGS.verification.scanNotifications
      ),

      verificationResults: pickBoolean(
        verification,
        'verificationResults',
        DEFAULT_SETTINGS.verification.verificationResults
      ),

      saveScanHistory: pickBoolean(
        verification,
        'saveScanHistory',
        DEFAULT_SETTINGS.verification.saveScanHistory
      ),
    },

    community: {
      friendRequests: pickBoolean(
        community,
        'friendRequests',
        DEFAULT_SETTINGS.community.friendRequests
      ),

      communityNotifications: pickBoolean(
        community,
        'communityNotifications',
        DEFAULT_SETTINGS.community.communityNotifications
      ),

      profileSuggestions: pickBoolean(
        community,
        'profileSuggestions',
        DEFAULT_SETTINGS.community.profileSuggestions
      ),
    },
  };
};


// ============================================================
// SAFE USER EXPORT
// ============================================================

const buildSafeUserExport = (user) => {
  if (!user) {
    return null;
  }

  const safeUser = {
    name: user.name || '',
    username: user.username || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || '',
    accountStatus: user.accountStatus || '',
    registrationVerified:
      user.registrationVerified ?? false,

    subscription: user.subscription || {},

    usage: user.usage || {},

    avatarUrl: user.avatarUrl || '',
    coverPhoto: user.coverPhoto || '',

    bio: user.bio || '',
    statusUpdate: user.statusUpdate || '',

    gender: user.gender || '',
    age: user.age ?? null,
    location: user.location || '',

    socialLinks: user.socialLinks || {},

    relationshipStatus:
      user.relationshipStatus || '',

    education: user.education || {},

    friends: Array.isArray(user.friends)
      ? user.friends.map((friend) =>
          friend?._id
            ? String(friend._id)
            : String(friend)
        )
      : [],

    gamification: user.gamification || {},

    isOnline: user.isOnline ?? false,
    lastSeen: user.lastSeen || null,

    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };

  return safeUser;
};


// ============================================================
// SAFE SETTINGS EXPORT
// ============================================================

const buildSafeSettingsExport = (settings) => {
  return {
    appearance: {
      theme:
        settings?.appearance?.theme ||
        DEFAULT_SETTINGS.appearance.theme,
    },

    notifications: {
      ...(settings?.notifications ||
        DEFAULT_SETTINGS.notifications),
    },

    privacy: {
      ...(settings?.privacy ||
        DEFAULT_SETTINGS.privacy),
    },

    security: {
      twoFactorEnabled:
        settings?.security?.twoFactorEnabled ??
        false,

      biometricEnabled:
        settings?.security?.biometricEnabled ??
        false,

      sensitiveActionConfirmation:
        settings?.security
          ?.sensitiveActionConfirmation ??
        true,
    },

    verification: {
      ...(settings?.verification ||
        DEFAULT_SETTINGS.verification),
    },

    community: {
      ...(settings?.community ||
        DEFAULT_SETTINGS.community),
    },
  };
};


// ============================================================
// BUILD EXPORT DATA
// ============================================================

const buildExportData = (
  user,
  settings
) => {
  return {
    export: {
      application: 'EAZY DON CHECK',
      type: 'personal-data-export',
      version: '1.0',
      exportedAt: new Date().toISOString(),
    },

    account: buildSafeUserExport(user),

    settings: buildSafeSettingsExport(
      settings
    ),
  };
};


// ============================================================
// FORMAT VALUE FOR DOCUMENTS
// ============================================================

const formatValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 'Not specified';
  }

  if (typeof value === 'boolean') {
    return value ? 'Enabled' : 'Disabled';
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return 'None';
    }

    return value
      .map((item) =>
        typeof item === 'object'
          ? JSON.stringify(item)
          : String(item)
      )
      .join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(
      value,
      null,
      2
    );
  }

  return String(value);
};


// ============================================================
// PDF HELPERS
// ============================================================

const addPdfSectionTitle = (
  doc,
  title
) => {
  doc
    .moveDown(0.8)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(title);

  doc
    .moveDown(0.25)
    .fontSize(9)
    .font('Helvetica');
};


const addPdfField = (
  doc,
  label,
  value
) => {
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .text(`${label}: `, {
      continued: true,
    })
    .font('Helvetica')
    .text(formatValue(value));

  doc.moveDown(0.15);
};


const addPdfObjectSection = (
  doc,
  title,
  object
) => {
  addPdfSectionTitle(
    doc,
    title
  );

  Object.entries(object || {}).forEach(
    ([key, value]) => {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(formatLabel(key));

        Object.entries(value).forEach(
          ([nestedKey, nestedValue]) => {
            addPdfField(
              doc,
              `  ${formatLabel(nestedKey)}`,
              nestedValue
            );
          }
        );
      } else {
        addPdfField(
          doc,
          formatLabel(key),
          value
        );
      }
    }
  );
};


const formatLabel = (value) => {
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};


// ============================================================
// GENERATE PDF
// ============================================================

const generatePdfExport = (
  exportData,
  res,
  filename
) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
    info: {
      Title:
        'EAZY DON CHECK - Personal Data Export',
      Author: 'EAZY DON CHECK',
      Subject:
        'Personal Account Data Export',
    },
  });

  res.setHeader(
    'Content-Type',
    'application/pdf'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`
  );

  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, private'
  );

  doc.pipe(res);

  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------

  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('EAZY DON CHECK', {
      align: 'center',
    });

  doc
    .fontSize(13)
    .font('Helvetica')
    .text('Personal Data Export', {
      align: 'center',
    });

  doc.moveDown(0.5);

  doc
    .fontSize(9)
    .fillColor('#555555')
    .text(
      `Exported: ${new Date(
        exportData.export.exportedAt
      ).toLocaleString()}`,
      {
        align: 'center',
      }
    );

  doc.fillColor('#000000');

  doc.moveDown(1);

  // ----------------------------------------------------------
  // ACCOUNT
  // ----------------------------------------------------------

  addPdfSectionTitle(
    doc,
    'Account Information'
  );

  const account =
    exportData.account || {};

  const accountFields = [
    ['Name', account.name],
    ['Username', account.username],
    ['Email', account.email],
    ['Phone', account.phone],
    ['Role', account.role],
    [
      'Account Status',
      account.accountStatus,
    ],
    [
      'Registration Verified',
      account.registrationVerified,
    ],
    ['Gender', account.gender],
    ['Age', account.age],
    ['Location', account.location],
    [
      'Relationship Status',
      account.relationshipStatus,
    ],
    ['Bio', account.bio],
    [
      'Status Update',
      account.statusUpdate,
    ],
    [
      'Online Status',
      account.isOnline,
    ],
    [
      'Last Seen',
      account.lastSeen,
    ],
    [
      'Created At',
      account.createdAt,
    ],
    [
      'Updated At',
      account.updatedAt,
    ],
  ];

  accountFields.forEach(
    ([label, value]) => {
      addPdfField(
        doc,
        label,
        value
      );
    }
  );

  // ----------------------------------------------------------
  // SUBSCRIPTION
  // ----------------------------------------------------------

  addPdfSectionTitle(
    doc,
    'Subscription'
  );

  Object.entries(
    account.subscription || {}
  ).forEach(([key, value]) => {
    addPdfField(
      doc,
      formatLabel(key),
      value
    );
  });

  // ----------------------------------------------------------
  // USAGE
  // ----------------------------------------------------------

  addPdfSectionTitle(
    doc,
    'Usage'
  );

  Object.entries(
    account.usage || {}
  ).forEach(([key, value]) => {
    addPdfField(
      doc,
      formatLabel(key),
      value
    );
  });

  // ----------------------------------------------------------
  // EDUCATION
  // ----------------------------------------------------------

  addPdfObjectSection(
    doc,
    'Education',
    account.education
  );

  // ----------------------------------------------------------
  // SOCIAL LINKS
  // ----------------------------------------------------------

  addPdfObjectSection(
    doc,
    'Social Links',
    account.socialLinks
  );

  // ----------------------------------------------------------
  // GAMIFICATION
  // ----------------------------------------------------------

  addPdfObjectSection(
    doc,
    'Gamification',
    account.gamification
  );

  // ----------------------------------------------------------
  // SETTINGS
  // ----------------------------------------------------------

  addPdfSectionTitle(
    doc,
    'Account Settings'
  );

  const settings =
    exportData.settings || {};

  addPdfObjectSection(
    doc,
    'Appearance',
    settings.appearance
  );

  addPdfObjectSection(
    doc,
    'Notifications',
    settings.notifications
  );

  addPdfObjectSection(
    doc,
    'Privacy',
    settings.privacy
  );

  addPdfObjectSection(
    doc,
    'Security Preferences',
    settings.security
  );

  addPdfObjectSection(
    doc,
    'Verification',
    settings.verification
  );

  addPdfObjectSection(
    doc,
    'Community',
    settings.community
  );

  // ----------------------------------------------------------
  // FOOTER
  // ----------------------------------------------------------

  doc
    .moveDown(1)
    .fontSize(8)
    .fillColor('#666666')
    .text(
      'This document contains personal account information exported from EAZY DON CHECK.',
      {
        align: 'center',
      }
    );

  doc.end();
};


// ============================================================
// DOCX HELPERS
// ============================================================

const createDocxField = (
  label,
  value
) => {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
      }),

      new TextRun({
        text: formatValue(value),
      }),
    ],

    spacing: {
      after: 100,
    },
  });
};


const createDocxObjectSection = (
  title,
  object
) => {
  const paragraphs = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_2,
      spacing: {
        before: 250,
        after: 120,
      },
    }),
  ];

  Object.entries(object || {}).forEach(
    ([key, value]) => {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: formatLabel(key),
                bold: true,
              }),
            ],
            spacing: {
              before: 100,
              after: 80,
            },
          })
        );

        Object.entries(value).forEach(
          ([nestedKey, nestedValue]) => {
            paragraphs.push(
              createDocxField(
                `  ${formatLabel(
                  nestedKey
                )}`,
                nestedValue
              )
            );
          }
        );
      } else {
        paragraphs.push(
          createDocxField(
            formatLabel(key),
            value
          )
        );
      }
    }
  );

  return paragraphs;
};


// ============================================================
// GENERATE DOCX
// ============================================================

const generateDocxExport = async (
  exportData,
  res,
  filename
) => {
  const account =
    exportData.account || {};

  const settings =
    exportData.settings || {};

  const children = [];

  // ----------------------------------------------------------
  // TITLE
  // ----------------------------------------------------------

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'EAZY DON CHECK',
          bold: true,
          size: 36,
        }),
      ],
      alignment:
        AlignmentType.CENTER,
      spacing: {
        after: 100,
      },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Personal Data Export',
          size: 24,
        }),
      ],
      alignment:
        AlignmentType.CENTER,
      spacing: {
        after: 100,
      },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Exported: ${new Date(
            exportData.export.exportedAt
          ).toLocaleString()}`,
          size: 18,
        }),
      ],
      alignment:
        AlignmentType.CENTER,
      spacing: {
        after: 300,
      },
    })
  );

  // ----------------------------------------------------------
  // ACCOUNT INFORMATION
  // ----------------------------------------------------------

  children.push(
    new Paragraph({
      text: 'Account Information',
      heading:
        HeadingLevel.HEADING_1,
    })
  );

  const accountFields = [
    ['Name', account.name],
    ['Username', account.username],
    ['Email', account.email],
    ['Phone', account.phone],
    ['Role', account.role],
    [
      'Account Status',
      account.accountStatus,
    ],
    [
      'Registration Verified',
      account.registrationVerified,
    ],
    ['Gender', account.gender],
    ['Age', account.age],
    ['Location', account.location],
    [
      'Relationship Status',
      account.relationshipStatus,
    ],
    ['Bio', account.bio],
    [
      'Status Update',
      account.statusUpdate,
    ],
    [
      'Online Status',
      account.isOnline,
    ],
    [
      'Last Seen',
      account.lastSeen,
    ],
    [
      'Created At',
      account.createdAt,
    ],
    [
      'Updated At',
      account.updatedAt,
    ],
  ];

  accountFields.forEach(
    ([label, value]) => {
      children.push(
        createDocxField(
          label,
          value
        )
      );
    }
  );

  // ----------------------------------------------------------
  // SUBSCRIPTION
  // ----------------------------------------------------------

  children.push(
    new Paragraph({
      text: 'Subscription',
      heading:
        HeadingLevel.HEADING_2,
    })
  );

  Object.entries(
    account.subscription || {}
  ).forEach(([key, value]) => {
    children.push(
      createDocxField(
        formatLabel(key),
        value
      )
    );
  });

  // ----------------------------------------------------------
  // USAGE
  // ----------------------------------------------------------

  children.push(
    new Paragraph({
      text: 'Usage',
      heading:
        HeadingLevel.HEADING_2,
    })
  );

  Object.entries(
    account.usage || {}
  ).forEach(([key, value]) => {
    children.push(
      createDocxField(
        formatLabel(key),
        value
      )
    );
  });

  // ----------------------------------------------------------
  // EDUCATION
  // ----------------------------------------------------------

  children.push(
    ...createDocxObjectSection(
      'Education',
      account.education
    )
  );

  // ----------------------------------------------------------
  // SOCIAL LINKS
  // ----------------------------------------------------------

  children.push(
    ...createDocxObjectSection(
      'Social Links',
      account.socialLinks
    )
  );

  // ----------------------------------------------------------
  // GAMIFICATION
  // ----------------------------------------------------------

  children.push(
    ...createDocxObjectSection(
      'Gamification',
      account.gamification
    )
  );

  // ----------------------------------------------------------
  // SETTINGS
  // ----------------------------------------------------------

  children.push(
    new Paragraph({
      text: 'Account Settings',
      heading:
        HeadingLevel.HEADING_1,
      spacing: {
        before: 300,
      },
    })
  );

  children.push(
    ...createDocxObjectSection(
      'Appearance',
      settings.appearance
    )
  );

  children.push(
    ...createDocxObjectSection(
      'Notifications',
      settings.notifications
    )
  );

  children.push(
    ...createDocxObjectSection(
      'Privacy',
      settings.privacy
    )
  );

  children.push(
    ...createDocxObjectSection(
      'Security Preferences',
      settings.security
    )
  );

  children.push(
    ...createDocxObjectSection(
      'Verification',
      settings.verification
    )
  );

  children.push(
    ...createDocxObjectSection(
      'Community',
      settings.community
    )
  );

  // ----------------------------------------------------------
  // FOOTER
  // ----------------------------------------------------------

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text:
            'This document contains personal account information exported from EAZY DON CHECK.',
          size: 16,
          color: '666666',
        }),
      ],
      alignment:
        AlignmentType.CENTER,
      spacing: {
        before: 400,
      },
    })
  );

  const document = new Document({
    creator: 'EAZY DON CHECK',
    title:
      'EAZY DON CHECK - Personal Data Export',
    description:
      'Personal account data export',
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer =
    await Packer.toBuffer(
      document
    );

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`
  );

  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, private'
  );

  return res
    .status(200)
    .send(buffer);
};


// ============================================================
// GET SETTINGS
// ============================================================

/**
 * @desc    Get authenticated user's settings
 * @route   GET /api/v1/settings
 * @access  Private
 */
const getSettings = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      });
    }

    let settings =
      await UserSettings.findOne({
        user: userId,
      }).lean();

    if (!settings) {
      settings =
        await UserSettings.create({
          user: userId,
        });

      settings =
        settings.toObject();
    }

    delete settings.__v;

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error(
      'GET SETTINGS ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to load account settings.',
    });
  }
};


// ============================================================
// UPDATE SETTINGS
// ============================================================

/**
 * @desc    Update authenticated user's settings
 * @route   PUT /api/v1/settings
 * @access  Private
 */
const updateSettings = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid user ID.',
      });
    }

    if (!isPlainObject(req.body)) {
      return res.status(400).json({
        success: false,
        message:
          'Settings payload must be an object.',
      });
    }

    // ----------------------------------------------------------
    // IMPORTANT:
    // Merge the existing settings before normalization.
    //
    // This prevents changing one setting from accidentally
    // resetting all other settings to defaults.
    // ----------------------------------------------------------

    const existing =
      await UserSettings.findOne({
        user: userId,
      }).lean();

    const mergedSettings =
      deepMerge(
        DEFAULT_SETTINGS,
        existing || {}
      );

    const requestedSettings =
      deepMerge(
        mergedSettings,
        req.body
      );

    let normalized;

    try {
      normalized =
        normalizeSettings(
          requestedSettings
        );
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message:
          validationError.message,
      });
    }

    const settings =
      await UserSettings.findOneAndUpdate(
        {
          user: userId,
        },
        {
          $set: {
            appearance:
              normalized.appearance,

            notifications:
              normalized.notifications,

            privacy:
              normalized.privacy,

            security:
              normalized.security,

            verification:
              normalized.verification,

            community:
              normalized.community,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      ).lean();

    delete settings.__v;

    return res.status(200).json({
      success: true,
      message:
        'Settings saved successfully.',
      data: settings,
    });
  } catch (error) {
    console.error(
      'UPDATE SETTINGS ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to save account settings.',
    });
  }
};


// ============================================================
// EXPORT USER DATA
// ============================================================

/**
 * @desc    Export authenticated user's account data
 * @route   GET /api/v1/settings/export
 * @access  Private
 *
 * Query:
 *   ?format=pdf
 *   ?format=docx
 *
 * Default:
 *   pdf
 */
const exportUserData = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    // ----------------------------------------------------------
    // AUTHENTICATION
    // ----------------------------------------------------------

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    // ----------------------------------------------------------
    // OBJECT ID
    // ----------------------------------------------------------

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid user ID.',
      });
    }

    // ----------------------------------------------------------
    // FORMAT
    // ----------------------------------------------------------

    const requestedFormat =
      String(
        req.query?.format ||
          'pdf'
      ).toLowerCase();

    const format =
      requestedFormat === 'word' ||
      requestedFormat === 'docx'
        ? 'docx'
        : requestedFormat === 'pdf'
          ? 'pdf'
          : null;

    if (!format) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid export format. Use pdf or docx.',
      });
    }

    // ----------------------------------------------------------
    // GET USER
    // ----------------------------------------------------------

    const user =
      await User.findById(userId)
        .select(
          [
            'name',
            'username',
            'email',
            'phone',
            'role',
            'accountStatus',
            'registrationVerified',
            'subscription',
            'usage',
            'avatarUrl',
            'coverPhoto',
            'bio',
            'statusUpdate',
            'gender',
            'age',
            'location',
            'socialLinks',
            'relationshipStatus',
            'education',
            'friends',
            'gamification',
            'isOnline',
            'lastSeen',
            'createdAt',
            'updatedAt',
          ].join(' ')
        )
        .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          'User account could not be found.',
      });
    }

    // ----------------------------------------------------------
    // GET SETTINGS
    // ----------------------------------------------------------

    let settings =
      await UserSettings.findOne({
        user: userId,
      }).lean();

    if (!settings) {
      settings =
        await UserSettings.create({
          user: userId,
        });

      settings =
        settings.toObject();
    }

    // ----------------------------------------------------------
    // BUILD SAFE EXPORT
    // ----------------------------------------------------------

    const exportData =
      buildExportData(
        user,
        settings
      );

    // ----------------------------------------------------------
    // DATE / FILENAMES
    // ----------------------------------------------------------

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    // ----------------------------------------------------------
    // PDF
    // ----------------------------------------------------------

    if (format === 'pdf') {
      const filename =
        `EAZY-DON-CHECK-personal-data-${date}.pdf`;

      return generatePdfExport(
        exportData,
        res,
        filename
      );
    }

    // ----------------------------------------------------------
    // WORD / DOCX
    // ----------------------------------------------------------

    const filename =
      `EAZY-DON-CHECK-personal-data-${date}.docx`;

    return await generateDocxExport(
      exportData,
      res,
      filename
    );
  } catch (error) {
    console.error(
      'EXPORT USER DATA ERROR:',
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message:
          'Failed to export your account data.',
      });
    }

    return res.end();
  }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getSettings,
  updateSettings,
  exportUserData,
};