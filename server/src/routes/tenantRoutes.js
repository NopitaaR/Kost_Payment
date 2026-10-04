import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authMiddleware.js';

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
      error: error.message,
    });
  }
}

router.use(checkPropertyOwnership);

// GET /api/v1/properties/:propertyId/tenants
// Tampilkan daftar penghuni pada rumah tersebut.
router.get('/', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { status, search } = req.query;

    const whereClause = {
      occupancies: {
        some: {
          propertyId,
        },
      },
    };

    if (status) {
      const normalizedStatus = status.toUpperCase();
      if (normalizedStatus === 'ACTIVE' || normalizedStatus === 'AKTIF') {
        whereClause.status = 'AKTIF';
      } else if (normalizedStatus === 'KELUAR') {
        whereClause.status = 'KELUAR';
      }
    }

    if (search && search.trim() !== '') {
      const queryStr = search.trim();
      whereClause.OR = [
        { name: { contains: queryStr } },
        { phone: { contains: queryStr } },
      ];
    }

    const tenants = await prisma.tenant.findMany({
      where: whereClause,
      include: {
        occupancies: {
          where: { propertyId },
          include: {
            room: {
              select: {
                id: true,
                roomNumber: true,
                price: true,
              },
            },
          },
          orderBy: { startDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedTenants = tenants.map((tenant) => {
      const activeOccupancy = tenant.occupancies.find((occ) => occ.status === 'AKTIF');
      const latestOccupancy = tenant.occupancies[0];
      const initialOccupancy = tenant.occupancies[tenant.occupancies.length - 1];

      const currentRoom = activeOccupancy
        ? {
            id: activeOccupancy.room.id,
            roomNumber: activeOccupancy.room.roomNumber,
          }
        : null;

      const currentRoomPrice = activeOccupancy ? activeOccupancy.room.price : null;
      const currentOccupancyId = activeOccupancy ? activeOccupancy.id : null;
      const moveInDate = activeOccupancy ? activeOccupancy.startDate : (initialOccupancy ? initialOccupancy.startDate : null);

      return {
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
        ktpPhoto: tenant.ktpPhoto,
        originAddress: tenant.originAddress,
        occupation: tenant.occupation,
        moveInDate,
        status: tenant.status,
        currentRoom,
        currentRoomPrice,
        currentOccupancyId,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedTenants,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar penghuni.',
      error: error.message,
    });
  }
});

// POST /api/v1/properties/:propertyId/tenants
// Tambah penghuni baru & buat occupancy AKTIF transactional
router.post('/', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { name, phone, ktpPhoto, originAddress, occupation, moveInDate, roomId, notes } = req.body;

    // Validasi field wajib
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Nama penghuni wajib diisi.' });
    }
    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      return res.status(400).json({ success: false, message: 'Nomor HP wajib diisi.' });
    }
    if (!originAddress || typeof originAddress !== 'string' || originAddress.trim() === '') {
      return res.status(400).json({ success: false, message: 'Alamat asal wajib diisi.' });
    }
    if (!occupation || typeof occupation !== 'string' || occupation.trim() === '') {
      return res.status(400).json({ success: false, message: 'Pekerjaan wajib diisi.' });
    }
    if (!moveInDate) {
      return res.status(400).json({ success: false, message: 'Tanggal masuk (moveInDate) wajib diisi.' });
    }
    if (!roomId || typeof roomId !== 'string') {
      return res.status(400).json({ success: false, message: 'ID kamar (roomId) wajib diisi.' });
    }

    const startDate = new Date(moveInDate);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Format tanggal masuk tidak valid.' });
    }

    // Pastikan room ada dan milik propertyId ini
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        propertyId,
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Kamar tidak ditemukan pada rumah ini.',
      });
    }

    // Transaction pembuatan tenant + occupancy
    const result = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          ktpPhoto: ktpPhoto ? String(ktpPhoto) : null,
          originAddress: originAddress.trim(),
          occupation: occupation.trim(),
          status: 'AKTIF',
          notes: notes ? String(notes) : null,
        },
      });

      const newOccupancy = await tx.occupancy.create({
        data: {
          tenantId: newTenant.id,
          propertyId,
          roomId: room.id,
          startDate,
          status: 'AKTIF',
          notes: notes ? String(notes) : null,
        },
      });

      if (room.status === 'KOSONG') {
        await tx.room.update({
          where: { id: room.id },
          data: { status: 'TERISI' },
        });
      }

      return { newTenant, newOccupancy };
    });

    return res.status(201).json({
      success: true,
      data: {
        id: result.newTenant.id,
        name: result.newTenant.name,
        phone: result.newTenant.phone,
        ktpPhoto: result.newTenant.ktpPhoto,
        originAddress: result.newTenant.originAddress,
        occupation: result.newTenant.occupation,
        status: result.newTenant.status,
        moveInDate: result.newOccupancy.startDate,
        currentRoom: {
          id: room.id,
          roomNumber: room.roomNumber,
        },
        currentRoomPrice: room.price,
        currentOccupancyId: result.newOccupancy.id,
        createdAt: result.newTenant.createdAt,
        updatedAt: result.newTenant.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menambah penghuni.',
      error: error.message,
    });
  }
});

// GET /api/v1/properties/:propertyId/tenants/:tenantId
// Detail penghuni
router.get('/:tenantId', async (req, res) => {
  try {
    const { propertyId, tenantId } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        occupancies: {
          where: { propertyId },
          include: {
            room: {
              select: {
                id: true,
                roomNumber: true,
                price: true,
              },
            },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!tenant || tenant.occupancies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Penghuni tidak ditemukan pada rumah ini.',
      });
    }

    const activeOccupancy = tenant.occupancies.find((occ) => occ.status === 'AKTIF');
    const initialOccupancy = tenant.occupancies[tenant.occupancies.length - 1];

    const currentRoom = activeOccupancy
      ? {
          id: activeOccupancy.room.id,
          roomNumber: activeOccupancy.room.roomNumber,
        }
      : null;

    const currentRoomPrice = activeOccupancy ? activeOccupancy.room.price : null;

    const occupancyHistory = tenant.occupancies.map((occ) => ({
      id: occ.id,
      roomId: occ.room.id,
      roomNumber: occ.room.roomNumber,
      price: occ.room.price,
      startDate: occ.startDate,
      endDate: occ.endDate,
      status: occ.status,
      notes: occ.notes,
    }));

    return res.status(200).json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
        ktpPhoto: tenant.ktpPhoto,
        originAddress: tenant.originAddress,
        occupation: tenant.occupation,
        status: tenant.status,
        notes: tenant.notes,
        moveInDate: activeOccupancy ? activeOccupancy.startDate : (initialOccupancy ? initialOccupancy.startDate : null),
        exitDate: activeOccupancy ? null : tenant.occupancies[0]?.endDate,
        currentOccupancy: activeOccupancy
          ? {
              id: activeOccupancy.id,
              startDate: activeOccupancy.startDate,
              status: activeOccupancy.status,
            }
          : null,
        currentRoom,
        currentRoomPrice,
        occupancyHistory,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail penghuni.',
      error: error.message,
    });
  }
});

// PUT /api/v1/properties/:propertyId/tenants/:tenantId
// Edit data dasar penghuni
router.put('/:tenantId', async (req, res) => {
  try {
    const { propertyId, tenantId } = req.params;
    const { name, phone, ktpPhoto, originAddress, occupation, moveInDate } = req.body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        occupancies: {
          where: { propertyId },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!tenant || tenant.occupancies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Penghuni tidak ditemukan pada rumah ini.',
      });
    }

    const updateData = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ success: false, message: 'Nama tidak boleh kosong.' });
      }
      updateData.name = name.trim();
    }
    if (phone !== undefined) {
      if (typeof phone !== 'string' || phone.trim() === '') {
        return res.status(400).json({ success: false, message: 'Nomor HP tidak boleh kosong.' });
      }
      updateData.phone = phone.trim();
    }
    if (ktpPhoto !== undefined) {
      updateData.ktpPhoto = ktpPhoto ? String(ktpPhoto) : null;
    }
    if (originAddress !== undefined) {
      if (typeof originAddress !== 'string' || originAddress.trim() === '') {
        return res.status(400).json({ success: false, message: 'Alamat asal tidak boleh kosong.' });
      }
      updateData.originAddress = originAddress.trim();
    }
    if (occupation !== undefined) {
      if (typeof occupation !== 'string' || occupation.trim() === '') {
        return res.status(400).json({ success: false, message: 'Pekerjaan tidak boleh kosong.' });
      }
      updateData.occupation = occupation.trim();
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: updateData,
        });
      }

      if (moveInDate) {
        const newStartDate = new Date(moveInDate);
        if (isNaN(newStartDate.getTime())) {
          throw new Error('Format tanggal masuk (moveInDate) tidak valid.');
        }
        const activeOccupancy = tenant.occupancies.find((occ) => occ.status === 'AKTIF');
        if (activeOccupancy) {
          await tx.occupancy.update({
            where: { id: activeOccupancy.id },
            data: { startDate: newStartDate },
          });
        }
      }
    });

    const updatedTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    return res.status(200).json({
      success: true,
      data: updatedTenant,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Gagal memperbarui data penghuni.',
    });
  }
});

// POST /api/v1/properties/:propertyId/tenants/:tenantId/move
// Memindahkan penghuni ke kamar lain
router.post('/:tenantId/move', async (req, res) => {
  try {
    const { propertyId, tenantId } = req.params;
    const { newRoomId, moveDate } = req.body;

    if (!newRoomId || typeof newRoomId !== 'string') {
      return res.status(400).json({ success: false, message: 'ID kamar baru (newRoomId) wajib diisi.' });
    }
    if (!moveDate) {
      return res.status(400).json({ success: false, message: 'Tanggal pindah (moveDate) wajib diisi.' });
    }

    const moveDateTime = new Date(moveDate);
    if (isNaN(moveDateTime.getTime())) {
      return res.status(400).json({ success: false, message: 'Format tanggal pindah tidak valid.' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        occupancies: {
          where: { propertyId },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!tenant || tenant.occupancies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Penghuni tidak ditemukan pada rumah ini.',
      });
    }

    if (tenant.status === 'KELUAR') {
      return res.status(400).json({
        success: false,
        message: 'Penghuni berstatus KELUAR tidak dapat dipindahkan kamar.',
      });
    }

    const activeOccupancy = tenant.occupancies.find((occ) => occ.status === 'AKTIF');
    if (!activeOccupancy) {
      return res.status(400).json({
        success: false,
        message: 'Penghuni tidak memiliki hunian aktif.',
      });
    }

    if (activeOccupancy.roomId === newRoomId) {
      return res.status(400).json({
        success: false,
        message: 'Kamar baru tidak boleh sama dengan kamar saat ini.',
      });
    }

    const newRoom = await prisma.room.findFirst({
      where: {
        id: newRoomId,
        propertyId,
      },
    });

    if (!newRoom) {
      return res.status(404).json({
        success: false,
        message: 'Kamar baru tidak ditemukan pada rumah ini.',
      });
    }

    const oldRoomId = activeOccupancy.roomId;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Tutup occupancy lama
      await tx.occupancy.update({
        where: { id: activeOccupancy.id },
        data: {
          status: 'PINDAH',
          endDate: moveDateTime,
        },
      });

      // 2. Buat occupancy baru
      const newOccupancy = await tx.occupancy.create({
        data: {
          tenantId,
          propertyId,
          roomId: newRoomId,
          startDate: moveDateTime,
          status: 'AKTIF',
        },
      });

      // 3. Cek sisa penghuni di kamar lama
      const activeCountOldRoom = await tx.occupancy.count({
        where: {
          roomId: oldRoomId,
          status: 'AKTIF',
        },
      });
      if (activeCountOldRoom === 0) {
        await tx.room.update({
          where: { id: oldRoomId },
          data: { status: 'KOSONG' },
        });
      }

      // 4. Update kamar baru status => TERISI
      await tx.room.update({
        where: { id: newRoomId },
        data: { status: 'TERISI' },
      });

      return newOccupancy;
    });

    return res.status(200).json({
      success: true,
      message: 'Penghuni berhasil dipindahkan.',
      data: {
        tenantId,
        oldRoomId,
        newRoomId: newRoom.id,
        newRoomNumber: newRoom.roomNumber,
        newRoomPrice: newRoom.price,
        moveDate: result.startDate,
        occupancyId: result.id,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memindahkan penghuni.',
      error: error.message,
    });
  }
});

// POST /api/v1/properties/:propertyId/tenants/:tenantId/exit
// Mencatat penghuni keluar
router.post('/:tenantId/exit', async (req, res) => {
  try {
    const { propertyId, tenantId } = req.params;
    const { exitDate } = req.body;

    if (!exitDate) {
      return res.status(400).json({ success: false, message: 'Tanggal keluar (exitDate) wajib diisi.' });
    }

    const exitDateTime = new Date(exitDate);
    if (isNaN(exitDateTime.getTime())) {
      return res.status(400).json({ success: false, message: 'Format tanggal keluar tidak valid.' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        occupancies: {
          where: { propertyId },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!tenant || tenant.occupancies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Penghuni tidak ditemukan pada rumah ini.',
      });
    }

    if (tenant.status === 'KELUAR') {
      return res.status(400).json({
        success: false,
        message: 'Penghuni sudah berstatus KELUAR.',
      });
    }

    const activeOccupancy = tenant.occupancies.find((occ) => occ.status === 'AKTIF');

    await prisma.$transaction(async (tx) => {
      // 1. Update status tenant -> KELUAR
      await tx.tenant.update({
        where: { id: tenantId },
        data: { status: 'KELUAR' },
      });

      // 2. Tutup active occupancy jika ada
      if (activeOccupancy) {
        await tx.occupancy.update({
          where: { id: activeOccupancy.id },
          data: {
            status: 'KELUAR',
            endDate: exitDateTime,
          },
        });

        // 3. Cek sisa penghuni di kamar
        const activeCountRoom = await tx.occupancy.count({
          where: {
            roomId: activeOccupancy.roomId,
            status: 'AKTIF',
          },
        });
        if (activeCountRoom === 0) {
          await tx.room.update({
            where: { id: activeOccupancy.roomId },
            data: { status: 'KOSONG' },
          });
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Penghuni berhasil dicatat keluar.',
      data: {
        tenantId,
        status: 'KELUAR',
        exitDate: exitDateTime,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mencatat penghuni keluar.',
      error: error.message,
    });
  }
});

export default router;
