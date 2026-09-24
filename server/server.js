const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

const connectDB = require('./config/db');

// ==========================================
// LOAD ENVIRONMENT VARIABLES
// ==========================================
dotenv.config();

// ==========================================
// IMPORT ROUTES
// ==========================================
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const scanRoutes = require('./routes/scanRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const photoRoutes = require('./routes/photoRoutes');
const chatRoutes = require('./routes/chatRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const profileRoutes = require('./routes/profileRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const friendRoutes = require('./routes/friendRoutes');
const feedRoutes = require('./routes/feedRoutes');
const feedUploadRoutes = require('./routes/feedUploadRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const webrtcRoutes = require('./routes/webrtcRoutes');

// User settings
const settingsRoutes = require('./routes/settingsRoutes');

// Security: 2FA + WebAuthn/Biometric
const securityRoutes = require('./routes/securityRoutes');

// ==========================================
// IMPORT SOCKET HANDLERS
// ==========================================
const initializeChatSocket = require('./sockets/chat');

// ==========================================
// ENVIRONMENT VALIDATION
// ==========================================
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET'
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(
      `❌ Critical Error: Missing required environment variable [${envVar}]`
    );
  }
});

if (!process.env.REPLICATE_API_TOKEN) {
  console.warn(
    '⚠️ Warning: REPLICATE_API_TOKEN is missing. Photo enhancement routes may fail until it is configured.'
  );
}

if (!process.env.GROQ_API_KEY) {
  console.warn(
    '⚠️ Warning: GROQ_API_KEY is missing. AI receipt verification will not work until it is configured.'
  );
}

// ==========================================
// PAYSTACK ENVIRONMENT CHECK
// ==========================================
if (!process.env.PAYSTACK_SECRET_KEY) {
  console.warn(
    '⚠️ Warning: PAYSTACK_SECRET_KEY is missing. Paystack subscription payments will not work until it is configured.'
  );
}

if (!process.env.PAYSTACK_CALLBACK_URL) {
  console.warn(
    '⚠️ Warning: PAYSTACK_CALLBACK_URL is missing. Paystack payment redirects may not work correctly until it is configured.'
  );
}

// ==========================================
// DATABASE
// ==========================================
connectDB();

// ==========================================
// EXPRESS APPLICATION
// ==========================================
const app = express();

// ==========================================
// HTTP SERVER
// ==========================================
const server = http.createServer(app);

// ==========================================
// CORS CONFIGURATION
// ==========================================
//
// IMPORTANT:
//
// The frontend can be opened from:
//
// http://localhost:5173
//
// OR:
//
// http://192.168.x.x:5173
//
// When testing on a phone, the second origin is used.
//
// We therefore allow:
// - localhost
// - 127.0.0.1
// - local network IPv4 addresses
// - explicitly configured CLIENT_URL origins
//
// This prevents a CLIENT_URL containing only
// http://localhost:5173 from blocking your phone.
// ==========================================

const configuredOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

/**
 * Determine whether an origin is allowed.
 */
const isAllowedOrigin = (origin) => {
  // Non-browser requests may have no Origin header.
  if (!origin) {
    return true;
  }

  // Explicitly configured origins always allowed.
  if (configuredOrigins.includes(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);

    const hostname = parsed.hostname;

    // Localhost
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1'
    ) {
      return true;
    }

    // IPv4 LAN addresses
    //
    // 192.168.x.x
    // 10.x.x.x
    // 172.16.x.x - 172.31.x.x
    //
    // These are commonly used for local network
    // phone testing.
    const ipv4Parts = hostname.split('.');

    if (ipv4Parts.length === 4) {
      const parts = ipv4Parts.map(Number);

      const isValidIPv4 = parts.every(
        (part) =>
          Number.isInteger(part) &&
          part >= 0 &&
          part <= 255
      );

      if (isValidIPv4) {
        const [a, b] = parts;

        // 10.0.0.0/8
        if (a === 10) {
          return true;
        }

        // 192.168.0.0/16
        if (
          a === 192 &&
          b === 168
        ) {
          return true;
        }

        // 172.16.0.0/12
        if (
          a === 172 &&
          b >= 16 &&
          b <= 31
        ) {
          return true;
        }

        // 127.0.0.0/8
        if (a === 127) {
          return true;
        }
      }
    }

    // Development environments can sometimes use
    // other local hostnames.
    if (
      process.env.NODE_ENV !== 'production' &&
      (
        hostname.endsWith('.local') ||
        hostname.endsWith('.test')
      )
    ) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
};

/**
 * CORS origin callback.
 */
const corsOrigin = (origin, callback) => {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
  } else {
    console.warn(
      `⚠️ CORS blocked origin: ${origin}`
    );

    callback(
      new Error(
        `CORS blocked origin: ${origin}`
      )
    );
  }
};

// ==========================================
// SOCKET.IO
// ==========================================
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ],
    credentials: true
  }
});

// Initialize Socket.IO chat handlers
initializeChatSocket(io);

// Make Socket.IO available to Express routes if needed later
app.set('io', io);

// ==========================================
// SECURITY HEADERS
// ==========================================
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
);

// ==========================================
// EXPRESS CORS
// ==========================================
app.use(
  cors({
    origin: corsOrigin,
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization'
    ],
    credentials: true
  })
);

// ==========================================
// RATE LIMITING
// ==========================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many requests from this IP, please try again later.'
  }
});

app.use('/api', globalLimiter);

// ==========================================
// BODY PARSERS
// ==========================================
//
// IMPORTANT:
// Paystack webhook signature verification requires
// the ORIGINAL raw request body.
//
// The verify callback stores the raw Buffer in
// req.rawBody before Express parses the JSON.
// ==========================================

app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb'
  })
);

// ==========================================
// STATIC UPLOADS
// ==========================================
app.use(
  '/uploads',
  express.static(
    path.join(__dirname, 'uploads')
  )
);

// ==========================================
// API BASE / HEALTH CHECK
// ==========================================

app.get('/api/v1', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    message: 'EAZY DON CHECK API v1 Base Route'
  });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    message:
      'EAZY DON CHECK API is running smoothly.'
  });
});

// ==========================================
// API ROUTES
// ==========================================

// Authentication
app.use(
  '/api/v1/auth',
  authRoutes
);

// Admin
app.use(
  '/api/v1/admin',
  adminRoutes
);

// Receipt scanning / verification
app.use(
  '/api/v1/scan',
  scanRoutes
);

// Photo enhancement
app.use(
  '/api/v1/photos',
  photoRoutes
);

// Chat file uploads
app.use(
  '/api/v1/chat/upload',
  uploadRoutes
);

// WebRTC ICE server discovery (authenticated)
app.use(
  '/api/v1/webrtc',
  webrtcRoutes
);

// Chat rooms, messages and direct messages
app.use(
  '/api/v1/chat',
  chatRoutes
);

// User profile
app.use(
  '/api/v1/profile',
  profileRoutes
);

// User management
app.use(
  '/api/v1/users',
  userRoutes
);

// Notifications
app.use(
  '/api/v1/notifications',
  notificationRoutes
);

// Friends
app.use(
  '/api/v1/friends',
  friendRoutes
);

// Feed
app.use(
  '/api/v1/feed',
  feedRoutes
);

// Feed media uploads
app.use(
  '/api/v1/feed/upload',
  feedUploadRoutes
);

// User settings
app.use(
  '/api/v1/settings',
  settingsRoutes
);

// Security
app.use(
  '/api/v1/security',
  securityRoutes
);

// Subscriptions / Paystack
app.use(
  '/api/v1/subscription',
  subscriptionRoutes
);

// Feedback
app.use(
  '/api/v1/feedback',
  feedbackRoutes
);

// ==========================================
// BACKWARD-COMPATIBLE RECEIPT ROUTES
// ==========================================

app.use(
  '/api/receipts',
  scanRoutes
);

app.use(
  '/api/v1/receipts',
  scanRoutes
);

// ==========================================
// INVOICE ROUTES
// ==========================================

app.use(
  '/api/v1/invoices',
  invoiceRoutes
);

// ==========================================
// 404 HANDLER
// ==========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================
app.use(
  (err, req, res, next) => {
    console.error(
      'Unhandled Server Error:',
      err
    );

    res.status(err.status || 500).json({
      success: false,
      message:
        err.message ||
        'Internal Server Error'
    });
  }
);

// ==========================================
// FIND LOCAL NETWORK IP ADDRESSES
// ==========================================

const getNetworkAddresses = () => {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  Object.keys(interfaces).forEach((interfaceName) => {
    const interfaceAddresses =
      interfaces[interfaceName] || [];

    interfaceAddresses.forEach((addressInfo) => {
      if (
        addressInfo.family === 'IPv4' &&
        !addressInfo.internal
      ) {
        addresses.push(addressInfo.address);
      }
    });
  });

  return addresses;
};

// ==========================================
// SERVER START
// ==========================================

const PORT =
  process.env.PORT || 5000;

// IMPORTANT:
// 0.0.0.0 makes the backend accessible from
// other devices on the same local network.
server.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log('');
    console.log(
      '=============================================='
    );
    console.log(
      '🚀 EAZY DON CHECK SERVER STARTED'
    );
    console.log(
      '=============================================='
    );

    console.log(
      `📡 Local API: http://localhost:${PORT}`
    );

    console.log(
      `🔗 Local API v1: http://localhost:${PORT}/api/v1`
    );

    const networkAddresses =
      getNetworkAddresses();

    if (networkAddresses.length > 0) {
      console.log('');
      console.log(
        '📱 NETWORK ACCESS:'
      );

      networkAddresses.forEach(
        (address) => {
          console.log(
            `   http://${address}:${PORT}`
          );

          console.log(
            `   http://${address}:${PORT}/api/v1`
          );
        }
      );
    } else {
      console.log('');
      console.log(
        '⚠️ No LAN IPv4 address detected.'
      );
    }

    console.log('');
    console.log(
      `💬 Socket.IO: http://localhost:${PORT}`
    );

    console.log(
      `💬 Chat API: http://localhost:${PORT}/api/v1/chat`
    );

    console.log(
      `⚙️ Settings API: http://localhost:${PORT}/api/v1/settings`
    );

    console.log(
      `🔐 Security API: http://localhost:${PORT}/api/v1/security`
    );

    console.log(
      `💳 Subscription API: http://localhost:${PORT}/api/v1/subscription`
    );

    console.log(
      `🔔 Paystack Webhook: http://localhost:${PORT}/api/v1/subscription/paystack/webhook`
    );

    console.log(
      `❤️ Health: http://localhost:${PORT}/api/v1/health`
    );

    console.log('');
    console.log(
      '📱 PHONE TESTING:'
    );

    console.log(
      '   Connect your phone and PC to the same Wi-Fi.'
    );

    console.log(
      '   Open the NETWORK address shown above on your phone.'
    );

    console.log(
      '=============================================='
    );
    console.log('');
  }
);

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

const gracefulShutdown = (
  signal
) => {
  console.log(
    `\n⚠️ Received ${signal}. Shutting down...`
  );

  server.close(() => {
    console.log(
      '🛑 HTTP server closed.'
    );

    process.exit(0);
  });
};

process.on(
  'SIGTERM',
  () => gracefulShutdown('SIGTERM')
);

process.on(
  'SIGINT',
  () => gracefulShutdown('SIGINT')
);