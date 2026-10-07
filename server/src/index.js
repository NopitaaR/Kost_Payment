import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import { authenticateToken } from './middleware/authMiddleware.js';

dotenv.config({ path: '../.env' });
dotenv.config(); // juga load server/.env jika ada

const app = express();
const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

// Security Headers via Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS Policy Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:5000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa header origin (seperti tools test Node, curl, backend scripts)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: origin tidak diizinkan.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

// Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.',
  },
});
app.use(globalLimiter);

// Auth Login Brute Force Protection Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login, coba lagi setelah beberapa menit.',
  },
});
app.use('/api/v1/auth/login', authLimiter);

// Request body size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Auth Routes (/api/v1/auth)
app.use('/api/v1/auth', authRoutes);

// Property Routes (/api/v1/properties)
app.use('/api/v1/properties', propertyRoutes);

// Protected Auth Verification Test Endpoint
app.get('/api/v1/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    const propertyCount = await prisma.property.count();
    res.json({
      success: true,
      message: 'Kost Manager API is running',
      dbStatus: 'Connected',
      dataSummary: {
        users: userCount,
        properties: propertyCount,
      },
    });
  } catch (error) {
    res.json({
      success: true,
      message: 'Kost Manager API is running',
      dbStatus: 'Error connecting to database',
      error: process.env.NODE_ENV === 'production' ? 'Database connection error' : error.message,
    });
  }
});

// Endpoint pengujian data seed (hanya aktif di non-production)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/test-data', async (req, res) => {
    try {
      const properties = await prisma.property.findMany({
        include: {
          _count: {
            select: { rooms: true, occupancies: true, bills: true },
          },
        },
      });
      res.json({
        success: true,
        properties,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });
}

// Centralized error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Ukuran request body melebihi batas yang diizinkan (maksimal 1MB).',
    });
  }
  if (err.message && err.message.includes('CORS policy')) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  const isProd = process.env.NODE_ENV === 'production';
  const safeMessage = isProd
    ? 'Terjadi kesalahan pada server.'
    : err.message || 'Internal server error';

  res.status(err.status || 500).json({
    success: false,
    message: safeMessage,
  });
});

app.listen(PORT, () => {
  console.log(`[SERVER] Kost Manager Express backend server running on port ${PORT}`);
});

export { app, prisma };
export default app;
