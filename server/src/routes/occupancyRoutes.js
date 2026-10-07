import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authMiddleware.js';

// Helper: sanitize error message supaya tidak membocorkan detail internal di production
const safeError = (err) => process.env.NODE_ENV === 'production' ? undefined : (err && err.message);

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticateToken);

// Middleware check property ownership
async function checkPropertyOwnership(req, res, next) {
  try {
    const { propertyId } = req.params;
    const userId = req.user.id;

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        userId,
      },
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Rumah tidak ditemukan.',
      });
    }

    req.property = property;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memverifikasi kepemilikan rumah.',
      error: safeError(error),
    });
  }
}

router.use(checkPropertyOwnership);

// GET /api/v1/properties/:propertyId/occupancies
// Endpoint untuk melihat histori penghuni/kamar.
router.get('/', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { roomId, tenantId, status } = req.query;

    const whereClause = {
      propertyId,
    };

    if (roomId) {
      whereClause.roomId = roomId;
    }
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    if (status) {
      const normalizedStatus = status.toUpperCase();
      if (['AKTIF', 'PINDAH', 'KELUAR'].includes(normalizedStatus)) {
        whereClause.status = normalizedStatus;
      }
    }

    const occupancies = await prisma.occupancy.findMany({
      where: whereClause,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
          },
        },
        room: {
          select: {
            id: true,
            roomNumber: true,
            price: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    const formattedOccupancies = occupancies.map((occ) => ({
      id: occ.id,
      tenant: {
        id: occ.tenant.id,
        name: occ.tenant.name,
        phone: occ.tenant.phone,
        status: occ.tenant.status,
      },
      room: {
        id: occ.room.id,
        roomNumber: occ.room.roomNumber,
        price: occ.room.price,
      },
      moveInDate: occ.startDate,
      exitDate: occ.endDate,
      status: occ.status,
      notes: occ.notes,
      createdAt: occ.createdAt,
      updatedAt: occ.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: formattedOccupancies,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data histori hunian.',
      error: safeError(error),
    });
  }
});

export default router;
