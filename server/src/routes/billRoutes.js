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

// Helper function untuk menghitung status tagihan secara tepat
function calculateBillStatus(amount, totalPaid, dueDate) {
  const remaining = amount - totalPaid;
  if (remaining <= 0) {
    return 'LUNAS';
  }
  if (totalPaid > 0) {
    return 'SEBAGIAN';
  }
  const now = new Date();
  const due = new Date(dueDate);
  if (now > due) {
    return 'TERLAMBAT';
  }
  return 'BELUM_BAYAR';
}

// GET /api/v1/properties/:propertyId/bills
// Daftar semua tagihan pada rumah tersebut dengan filter opsional.
router.get('/', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { status, roomId } = req.query;

    const whereClause = {
      propertyId,
    };

    if (roomId) {
      whereClause.roomId = roomId;
    }

    const bills = await prisma.bill.findMany({
      where: whereClause,
      include: {
        room: {
          select: {
            id: true,
            roomNumber: true,
            price: true,
          },
        },
        occupancy: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        payments: {
          select: {
            amount: true,
            paymentDate: true,
            method: true,
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    const formattedBills = bills.map((bill) => {
      const totalPaid = (bill.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(0, bill.amount - totalPaid);
      const calculatedStatus = calculateBillStatus(bill.amount, totalPaid, bill.dueDate);

      // Cari tenant terkait dari occupancy snapshot atau occupancy aktif kamar
      const tenants = bill.occupancy && bill.occupancy.tenant ? [
        {
          id: bill.occupancy.tenant.id,
          name: bill.occupancy.tenant.name,
          phone: bill.occupancy.tenant.phone,
        }
      ] : [];

      return {
        id: bill.id,
        propertyId: bill.propertyId,
        room: {
          id: bill.room.id,
          roomNumber: bill.room.roomNumber,
          currentPrice: bill.room.price,
        },
        occupancyId: bill.occupancyId,
        tenants,
        periodStart: bill.periodStart,
        periodEnd: bill.periodEnd,
        amount: bill.amount,
        dueDate: bill.dueDate,
        totalPaid,
        remaining,
        status: calculatedStatus,
        notes: bill.notes,
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
      };
    });

    let filteredResult = formattedBills;
    if (status) {
      const normalizedStatus = status.toUpperCase();
      filteredResult = formattedBills.filter((b) => b.status === normalizedStatus);
    }

    return res.status(200).json({
      success: true,
      data: filteredResult,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar tagihan.',
      error: error.message,
    });
  }
});

// GET /api/v1/properties/:propertyId/bills/:billId
// Detail tagihan
router.get('/:billId', async (req, res) => {
  try {
    const { propertyId, billId } = req.params;

    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        propertyId,
      },
      include: {
        room: {
          select: {
            id: true,
            roomNumber: true,
            price: true,
          },
        },
        occupancy: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            paymentDate: true,
            amount: true,
            method: true,
            notes: true,
          },
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Tagihan tidak ditemukan.',
      });
    }

    const totalPaid = (bill.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, bill.amount - totalPaid);
    const calculatedStatus = calculateBillStatus(bill.amount, totalPaid, bill.dueDate);

    // Ambil semua penghuni aktif kamar saat ini jika occupancy snapshot kosong
    let tenants = [];
    if (bill.occupancy && bill.occupancy.tenant) {
      tenants.push({
        id: bill.occupancy.tenant.id,
        name: bill.occupancy.tenant.name,
        phone: bill.occupancy.tenant.phone,
      });
    } else {
      const activeOccupancies = await prisma.occupancy.findMany({
        where: { roomId: bill.roomId, status: 'AKTIF' },
        include: { tenant: { select: { id: true, name: true, phone: true } } },
      });
      tenants = activeOccupancies.map((o) => o.tenant);
    }

    return res.status(200).json({
      success: true,
      data: {
        id: bill.id,
        propertyId: bill.propertyId,
        room: {
          id: bill.room.id,
          roomNumber: bill.room.roomNumber,
          currentPrice: bill.room.price,
        },
        occupancyId: bill.occupancyId,
        tenants,
        periodStart: bill.periodStart,
        periodEnd: bill.periodEnd,
        amount: bill.amount,
        dueDate: bill.dueDate,
        totalPaid,
        remaining,
        status: calculatedStatus,
        notes: bill.notes,
        payments: bill.payments,
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail tagihan.',
      error: error.message,
    });
  }
});

// POST /api/v1/properties/:propertyId/bills
// Membuat bill manual untuk satu kamar
router.post('/', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { roomId, periodStart, periodEnd, dueDate, notes } = req.body;

    if (!roomId || typeof roomId !== 'string') {
      return res.status(400).json({ success: false, message: 'ID kamar (roomId) wajib diisi.' });
    }
    if (!periodStart || !periodEnd || !dueDate) {
      return res.status(400).json({ success: false, message: 'Periode (periodStart, periodEnd) dan jatuh tempo (dueDate) wajib diisi.' });
    }

    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);
    const dDate = new Date(dueDate);

    if (isNaN(pStart.getTime()) || isNaN(pEnd.getTime()) || isNaN(dDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Format tanggal tidak valid.' });
    }

    // Pastikan room milik propertyId
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

    // Ambil occupancy aktif kamar (jika ada) untuk snapshot occupancyId
    const activeOccupancy = await prisma.occupancy.findFirst({
      where: {
        roomId: room.id,
        status: 'AKTIF',
      },
      orderBy: { startDate: 'desc' },
    });

    // Pengecekan duplicate bill untuk kamar & periode yang persis sama
    const existingBill = await prisma.bill.findFirst({
      where: {
        roomId: room.id,
        periodStart: pStart,
        periodEnd: pEnd,
      },
    });

    if (existingBill) {
      return res.status(400).json({
        success: false,
        message: `Tagihan untuk Kamar ${room.roomNumber} pada periode ini sudah ada.`,
      });
    }

    // Amount WAJIB berupa SNAPSHOT dari harga kamar saat ini
    const amountSnapshot = room.price;

    const newBill = await prisma.bill.create({
      data: {
        propertyId,
        roomId: room.id,
        occupancyId: activeOccupancy ? activeOccupancy.id : null,
        periodStart: pStart,
        periodEnd: pEnd,
        dueDate: dDate,
        amount: amountSnapshot,
        status: 'BELUM_BAYAR',
        notes: notes ? String(notes) : null,
      },
      include: {
        room: {
          select: {
            id: true,
            roomNumber: true,
            price: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: newBill.id,
        propertyId: newBill.propertyId,
        room: {
          id: newBill.room.id,
          roomNumber: newBill.room.roomNumber,
        },
        periodStart: newBill.periodStart,
        periodEnd: newBill.periodEnd,
        dueDate: newBill.dueDate,
        amount: newBill.amount,
        totalPaid: 0,
        remaining: newBill.amount,
        status: newBill.status,
        notes: newBill.notes,
        createdAt: newBill.createdAt,
        updatedAt: newBill.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat tagihan.',
      error: error.message,
    });
  }
});

// POST /api/v1/properties/:propertyId/bills/generate
// Generate bill otomatis berdasarkan occupancy aktif & billing cycle (Idempotent)
router.post('/generate', async (req, res) => {
  try {
    const { propertyId } = req.params;

    // Cari semua occupancy AKTIF pada property ini
    const activeOccupancies = await prisma.occupancy.findMany({
      where: {
        propertyId,
        status: 'AKTIF',
      },
      include: {
        room: true,
        tenant: true,
      },
    });

    if (activeOccupancies.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Tidak ada hunian aktif untuk digenerate tagihannya.',
        data: { generatedCount: 0, bills: [] },
      });
    }

    const createdBills = [];

    // Grouping per kamar (1 kamar = 1 bill meskipun multi tenant)
    const roomOccupanciesMap = new Map();
    for (const occ of activeOccupancies) {
      if (!roomOccupanciesMap.has(occ.roomId)) {
        roomOccupanciesMap.set(occ.roomId, occ);
      }
    }

    for (const [roomId, mainOcc] of roomOccupanciesMap.entries()) {
      const room = mainOcc.room;

      // Hitung siklus tagihan dari startDate hunian
      const startDate = new Date(mainOcc.startDate);
      const now = new Date();

      // Buat tanggal periode berjalan (misal startDate = 20 Jan 2026, sekarang Oct 2026)
      let pStart = new Date(now.getFullYear(), now.getMonth(), startDate.getDate());
      let pEnd = new Date(now.getFullYear(), now.getMonth() + 1, startDate.getDate());
      let dDate = new Date(pEnd); // Due date sama dengan tanggal akhir periode

      // Cek apakah bill untuk room + periodStart ini sudah ada
      const existingBill = await prisma.bill.findFirst({
        where: {
          roomId: room.id,
          periodStart: pStart,
        },
      });

      if (!existingBill) {
        const newBill = await prisma.bill.create({
          data: {
            propertyId,
            roomId: room.id,
            occupancyId: mainOcc.id,
            periodStart: pStart,
            periodEnd: pEnd,
            dueDate: dDate,
            amount: room.price,
            status: 'BELUM_BAYAR',
            notes: `Tagihan otomatis periode ${pStart.toISOString().slice(0, 10)} - ${pEnd.toISOString().slice(0, 10)}`,
          },
        });
        createdBills.push(newBill);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Generate tagihan selesai. ${createdBills.length} tagihan baru dibuat.`,
      data: {
        generatedCount: createdBills.length,
        bills: createdBills,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengenerate tagihan.',
      error: error.message,
    });
  }
});

export default router;
