import express from 'express';
import cors from 'cors';
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

app.use(cors());
app.use(express.json());

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
      error: error.message,
    });
  }
});

// Endpoint pengujian ringkas data seed (untuk verifikasi endpoint)
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

app.listen(PORT, () => {
  console.log(`[SERVER] Kost Manager Express backend server running on port ${PORT}`);
});
