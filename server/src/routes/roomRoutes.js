import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authMiddleware.js';

// Helper: sanitize error message supaya tidak membocorkan detail internal di production
const safeError = (err) => process.env.NODE_ENV === 'production' ? undefined : (err && err.message);

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

// Semua endpoint kamar memerlukan otentikasi JWT
router.use(authenticateToken);

// Middleware untuk memverifikasi kepemilikan rumah (user JWT -> property)
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

// GET /api/v1/properties/:propertyId/rooms
// Daftar semua kamar pada rumah tersebut.
router.get('/', async (req, res) => {
  try {
    const { propertyId } = req.params;

    const rooms = await prisma.room.findMany({
      where: { propertyId },
      include: {
        occupancies: {
          where: { status: 'AKTIF' },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                phone: true,
                occupation: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { roomNumber: 'asc' },
    });

    const formattedRooms = rooms.map((room) => {
      const activeTenants = room.occupancies.map((occ) => ({
        id: occ.tenant.id,
        name: occ.tenant.name,
        phone: occ.tenant.phone,
        occupation: occ.tenant.occupation,
        startDate: occ.startDate,
      }));

      const status = activeTenants.length > 0 ? 'TERISI' : room.status;

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        price: room.price,
        status,
        notes: room.notes,
        activeTenants,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedRooms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar kamar.',
      error: safeError(error),
    });
  }
});

// POST /api/v1/properties/:propertyId/rooms
// Tambah kamar baru pada rumah tersebut.
router.post('/', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { roomNumber, price, notes } = req.body;

    if (!roomNumber || typeof roomNumber !== 'string' || roomNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Nomor kamar wajib diisi.',
      });
    }

    const numericPrice = Number(price);
    if (price === undefined || price === null || isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Harga kamar harus berupa angka yang valid.',
      });
    }

    const trimmedRoomNumber = roomNumber.trim();

    // Cek apakah nomor kamar sudah ada di rumah ini
    const existingRoom = await prisma.room.findUnique({
      where: {
        propertyId_roomNumber: {
          propertyId,
          roomNumber: trimmedRoomNumber,
        },
      },
    });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: `Nomor kamar ${trimmedRoomNumber} sudah digunakan di rumah ini.`,
      });
    }

    const newRoom = await prisma.room.create({
      data: {
        propertyId,
        roomNumber: trimmedRoomNumber,
        price: Math.round(numericPrice),
        notes: notes ? String(notes) : '',
        status: 'KOSONG',
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: newRoom.id,
        roomNumber: newRoom.roomNumber,
        price: newRoom.price,
        status: newRoom.status,
        notes: newRoom.notes,
        createdAt: newRoom.createdAt,
        updatedAt: newRoom.updatedAt,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Nomor kamar sudah digunakan di rumah ini.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Gagal menambah kamar.',
      error: safeError(error),
    });
  }
});

// GET /api/v1/properties/:propertyId/rooms/:roomId
// Detail kamar beserta penghuni aktif & histori penghuni.
router.get('/:roomId', async (req, res) => {
  try {
    const { propertyId, roomId } = req.params;

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        propertyId,
      },
      include: {
        occupancies: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                phone: true,
                ktpPhoto: true,
                originAddress: true,
                occupation: true,
                status: true,
              },
            },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Kamar tidak ditemukan.',
      });
    }

    const activeTenants = room.occupancies
      .filter((occ) => occ.status === 'AKTIF')
      .map((occ) => ({
        occupancyId: occ.id,
        tenantId: occ.tenant.id,
        name: occ.tenant.name,
        phone: occ.tenant.phone,
        occupation: occ.tenant.occupation,
        startDate: occ.startDate,
      }));

    const occupancyHistory = room.occupancies.map((occ) => ({
      id: occ.id,
      tenant: {
        id: occ.tenant.id,
        name: occ.tenant.name,
        phone: occ.tenant.phone,
        occupation: occ.tenant.occupation,
      },
      startDate: occ.startDate,
      endDate: occ.endDate,
      status: occ.status,
      notes: occ.notes,
    }));

    const currentStatus = activeTenants.length > 0 ? 'TERISI' : room.status;

    return res.status(200).json({
      success: true,
      data: {
        id: room.id,
        roomNumber: room.roomNumber,
        price: room.price,
        status: currentStatus,
        notes: room.notes,
        activeTenants,
        occupancyHistory,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail kamar.',
      error: safeError(error),
    });
  }
});

// PUT /api/v1/properties/:propertyId/rooms/:roomId
// Edit kamar (nomor, harga, notes). Perubahan harga tidak mengubah Bill lama.
router.put('/:roomId', async (req, res) => {
  try {
    const { propertyId, roomId } = req.params;
    const { roomNumber, price, notes } = req.body;

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        propertyId,
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Kamar tidak ditemukan.',
      });
    }

    const updateData = {};

    if (roomNumber !== undefined) {
      if (typeof roomNumber !== 'string' || roomNumber.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Nomor kamar tidak boleh kosong.',
        });
      }
      const trimmedRoomNumber = roomNumber.trim();

      if (trimmedRoomNumber !== room.roomNumber) {
        const duplicate = await prisma.room.findUnique({
          where: {
            propertyId_roomNumber: {
              propertyId,
              roomNumber: trimmedRoomNumber,
            },
          },
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `Nomor kamar ${trimmedRoomNumber} sudah digunakan di rumah ini.`,
          });
        }
        updateData.roomNumber = trimmedRoomNumber;
      }
    }

    if (price !== undefined) {
      const numericPrice = Number(price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Harga kamar harus berupa angka yang valid.',
        });
      }
      updateData.price = Math.round(numericPrice);
    }

    if (notes !== undefined) {
      updateData.notes = String(notes);
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      data: {
        id: updatedRoom.id,
        roomNumber: updatedRoom.roomNumber,
        price: updatedRoom.price,
        status: updatedRoom.status,
        notes: updatedRoom.notes,
        createdAt: updatedRoom.createdAt,
        updatedAt: updatedRoom.updatedAt,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Nomor kamar sudah digunakan di rumah ini.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Gagal mengedit kamar.',
      error: safeError(error),
    });
  }
});

// DELETE /api/v1/properties/:propertyId/rooms/:roomId
// Hapus kamar hanya jika tidak ada histori Occupancy atau Bill.
router.delete('/:roomId', async (req, res) => {
  try {
    const { propertyId, roomId } = req.params;

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        propertyId,
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Kamar tidak ditemukan.',
      });
    }

    const occupancyCount = await prisma.occupancy.count({
      where: { roomId },
    });

    const billCount = await prisma.bill.count({
      where: { roomId },
    });

    if (occupancyCount > 0 || billCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Kamar tidak dapat dihapus karena memiliki riwayat hunian atau tagihan.',
      });
    }

    await prisma.room.delete({
      where: { id: roomId },
    });

    return res.status(200).json({
      success: true,
      message: 'Kamar berhasil dihapus.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus kamar.',
      error: safeError(error),
    });
  }
});

export default router;
