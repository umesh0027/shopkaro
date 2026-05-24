

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const dotenv   = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
app.set('trust proxy', 1);

// ─── Rate Limiting ───────────────────────────────────────────────
// Global limiter — 300 req / 15 min per IP (production-safe)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});

// Strict limiter — auth routes only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' }
});

// ─── Middleware ──────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL ,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ye wala render k liye rkhna
// app.use(fileUpload({
//   useTempFiles: true,
//   tempFileDir: "/tmp/",
// }));


// ─── express-fileupload (replaces multer) ─────────────────────────
const fileUpload = require('express-fileupload');
const connectDB = require('./config/db');
app.use(fileUpload({
  useTempFiles: false,      // buffer mode — works on Vercel
  limits: { fileSize: 5 * 1024 * 1024 },// 5MB safe
  // limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  abortOnLimit: true,
  safeFileNames: true,
  preserveExtension: true,
}));

// Apply global limiter to all /api routes
app.use('/api/', globalLimiter);

// ─── Connection Pool & Timeout ───────────────────────────────────
// Mongoose connection options — prevents crash on high concurrency
const mongoOptions = {
  maxPoolSize:        5,   // max 5 simultaneous DB connections
  minPoolSize:        2,    // keep 2 alive always
  socketTimeoutMS:    45000,
  serverSelectionTimeoutMS: 5000,
  heartbeatFrequencyMS:     10000,
  retryWrites: true,
  retryReads:  true,
};

// ─── Request Queue / Concurrency Control ────────────────────────
// Prevent server crash when too many simultaneous requests come in
// let activeRequests = 0;
// const MAX_CONCURRENT = 50; // adjust based on your server

// app.use((req, res, next) => {
//   if (activeRequests >= MAX_CONCURRENT) {
//     return res.status(503).json({
//       success: false,
//       message: 'Server is busy. Please retry in a moment.'
//     });
//   }
//   activeRequests++;
//   res.on('finish',  () => activeRequests--);
//   res.on('close',   () => activeRequests--);
//   next();
// });

// ─── Request Timeout ────────────────────────────────────────────
// Auto-cancel requests that take too long
// app.use((req, res, next) => {
//   req.setTimeout(30000, () => {
//     if (!res.headersSent) {
//       res.status(408).json({ success: false, message: 'Request timeout.' });
//     }
//   });
//   next();
// });

// ─── Routes ─────────────────────────────────────────────────────
app.use('/api/auth',       authLimiter);  // strict limit on auth only
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/users',      require('./routes/userRoutes'));
app.use('/api/products',   require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/orders',     require('./routes/orderRoutes'));
app.use('/api/payment',    require('./routes/paymentRoutes'));
app.use('/api/reviews',    require('./routes/reviewRoutes'));
app.use('/api/contact',    require('./routes/contactRoutes'));
app.use('/api/admin',      require('./routes/adminRoutes'));
app.use('/api/bundles',  require('./routes/bundleRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
   
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// ─── Error Handlers ─────────────────────────────────────────────
// Catch async errors from routes
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong.'
      : err.message
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// // ─── Graceful Shutdown ───────────────────────────────────────────
// const gracefulShutdown = (signal) => {
//   console.log(`\n${signal} received. Closing server gracefully...`);
//   server.close(() => {
//     console.log('HTTP server closed.');
//     mongoose.connection.close(false).then(() => {
//       console.log('MongoDB connection closed.');
//       process.exit(0);
//     });
//   });
//   // Force close after 15s if stuck
//   setTimeout(() => { process.exit(1); }, 15000);
// };

// ─── Unhandled Errors ────────────────────────────────────────────
// Prevent server crash on unhandled promise rejections
// process.on('unhandledRejection', (reason, promise) => {
//   console.error('[UnhandledRejection]', reason);
//   // Don't crash — just log in production
// });

// process.on('uncaughtException', (err) => {
//   console.error('[UncaughtException]', err);
//   // Give time to log, then exit — PM2/container will restart
//   setTimeout(() => process.exit(1), 1000);
// });

// ─── MongoDB Connect + Start Server ─────────────────────────────
let server;
connectDB();
// mongoose.connect(process.env.MONGO_URI, mongoOptions)
//   .then(() => {
//     console.log('✅ MongoDB Connected');

//     // Reconnect on disconnect
//     mongoose.connection.on('disconnected', () => {
//       console.warn('⚠️  MongoDB disconnected. Attempting reconnect...');
//     });
//     mongoose.connection.on('reconnected', () => {
//       console.log('✅ MongoDB reconnected');
//     });

    server = app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
      // console.log(`📊 Max concurrent requests: ${MAX_CONCURRENT}`);
      // console.log(`🔒 Rate limit: ${globalLimiter.max || 300} req/15min`);
    });

    // Keep-alive for production
    // server.keepAliveTimeout    = 65000;
    // server.headersTimeout      = 66000;

    // process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    // process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
  // })
  // .catch(err => {
  //   console.error('❌ MongoDB connection error:', err.message);
  //   process.exit(1);
  // });

  // module.exports = app;
