import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authMiddleware.js';
import roomRoutes from './roomRoutes.js';
import tenantRoutes from './tenantRoutes.js';
import occupancyRoutes from './occupancyRoutes.js';
import billRoutes from './billRoutes.js';
import paymentRoutes from './paymentRoutes.js';

const router = express.Router();
const prisma = new PrismaClient();

// Mount sub-routes under /:propertyId
router.use('/:propertyId/rooms', roomRoutes);
router.use('/:propertyId/tenants', tenantRoutes);
router.use('/:propertyId/occupancies', occupancyRoutes);
router.use('/:propertyId/bills', billRoutes);
router.use('/:propertyId', paymentRoutes);

// PUT /api/v1/properties/:propertyId/name - Update nama rumah (hanya pemilik yang bisa)
router.put('/:propertyId/name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const { propertyId } = req.params;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama rumah wajib diisi.',
      });
    }

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        userId,
      },
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Rumah tidak ditemukan atau bukan milik Anda.',
      });
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: { name: name.trim() },
      select: { id: true, name: true, userId: true },
    });

    return res.status(200).json({
      success: true,
      data: { id: updatedProperty.id, name: updatedProperty.name },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui nama rumah.',
      error: error.message,
    });
  }
});

// Semua route property memerlukan otentikasi JWT
router.use(authenticateToken);

// GET /api/v1/properties
// Mengembalikan daftar rumah milik user yang sedang login
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const properties = await prisma.property.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            rooms: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Hitung kamar terisi, kamar kosong, dan penghuni aktif per rumah
    const formattedProperties = await Promise.all(
      properties.map(async (p) => {
        const totalRooms = p._count.rooms;
        const filledRooms = await prisma.room.count({
          where: { propertyId: p.id, status: 'TERISI' },
        });
        const activeOccupancies = await prisma.occupancy.count({
          where: { propertyId: p.id, status: 'AKTIF' },
        });

        return {
          id: p.id,
          name: p.name,
          totalRooms,
          filledRooms,
          emptyRooms: totalRooms - filledRooms,
          activeTenants: activeOccupancies,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: formattedProperties,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar rumah.',
      error: error.message,
    });
  }
});

// GET /api/v1/properties/:id
// Mengembalikan detail & ringkasan rumah milik user yang sedang login
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Cari property dan pastikan milik user yang sedang login
    const property = await prisma.property.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        rooms: {
          select: {
            id: true,
            roomNumber: true,
            price: true,
            status: true,
            notes: true,
          },
        },
        bills: {
          include: {
            payments: {
              select: {
                amount: true,
              },
            },
          },
        },
      },
    });

    // Jika property tidak ada atau bukan milik user, kembalikan 404 (keamanan: tidak membocorkan data user lain)
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Rumah tidak ditemukan.',
      });
    }

    const totalRooms = property.rooms.length;
    const filledRooms = property.rooms.filter((r) => r.status === 'TERISI').length;
    const emptyRooms = totalRooms - filledRooms;

    // Hitung jumlah penghuni aktif
    const activeTenants = await prisma.occupancy.count({
      where: { propertyId: id, status: 'AKTIF' },
    });

    // Hitung total tunggakan dari bills
    let totalUnpaidAmount = 0;
    let unpaidBillCount = 0;

    property.bills.forEach((bill) => {
      const totalPaid = (bill.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const remaining = bill.amount - totalPaid;
      if (remaining > 0) {
        totalUnpaidAmount += remaining;
        unpaidBillCount += 1;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        id: property.id,
        name: property.name,
        summary: {
          totalRooms,
          filledRooms,
          emptyRooms,
          activeTenants,
          unpaidBillCount,
          totalUnpaidAmount,
        },
        rooms: property.rooms,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail rumah.',
      error: error.message,
    });
  }
});

export default router;