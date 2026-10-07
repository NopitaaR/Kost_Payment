import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/authMiddleware.js';

// Helper: sanitize error message supaya tidak membocorkan detail internal di production
const safeError = (err) => process.env.NODE_ENV === 'production' ? undefined : (err && err.message);

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticateToken);

// Middleware memverifikasi kepemilikan rumah (user JWT -> property)
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

// Helper fungsi untuk kalkulasi status tagihan
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

// POST /api/v1/properties/:propertyId/bills/:billId/payments
// Mencatat pembayaran baru untuk tagihan
router.post('/bills/:billId/payments', async (req, res) => {
  try {
    const { propertyId, billId } = req.params;
    const { amount, method, paymentDate, notes } = req.body;

    // 1. Validasi nominal
    const numericAmount = Number(amount);
    if (amount === undefined || amount === null || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nominal pembayaran harus berupa angka dan lebih besar dari 0.',
      });
    }

    // 2. Validasi metode pembayaran
    if (!method || !['CASH', 'TRANSFER'].includes(String(method).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Metode pembayaran tidak valid. Gunakan CASH atau TRANSFER.',
      });
    }

    // 3. Validasi tanggal
    const pDate = paymentDate ? new Date(paymentDate) : new Date();
    if (isNaN(pDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Format tanggal pembayaran tidak valid.',
      });
    }

    // 4. Cari bill dan pastikan milik propertyId ini
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        propertyId,
      },
      include: {
        payments: true,
      },
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Tagihan tidak ditemukan pada rumah ini.',
      });
    }

    // 5. Hitung sisa tagihan saat ini
    const currentTotalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
    const currentRemaining = bill.amount - currentTotalPaid;

    if (currentRemaining <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Tagihan ini sudah lunas. Tidak dapat menambah pembayaran.',
      });
    }

    const roundedAmount = Math.round(numericAmount);
    if (roundedAmount > currentRemaining) {
      return res.status(400).json({
        success: false,
        message: `Jumlah pembayaran (${roundedAmount}) melebihi sisa tagihan (${currentRemaining}).`,
      });
    }

    // 6. Buat pembayaran dan update status Bill dalam transaction
    const newTotalPaid = currentTotalPaid + roundedAmount;
    const newStatus = calculateBillStatus(bill.amount, newTotalPaid, bill.dueDate);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          billId: bill.id,
          amount: roundedAmount,
          method: String(method).toUpperCase(),
          paymentDate: pDate,
          notes: notes ? String(notes) : null,
        },
      });

      await tx.bill.update({
        where: { id: bill.id },
        data: { status: newStatus },
      });

      return payment;
    });

    const finalRemaining = Math.max(0, bill.amount - newTotalPaid);

    return res.status(201).json({
      success: true,
      data: {
        payment: {
          id: result.id,
          billId: result.billId,
          amount: result.amount,
          method: result.method,
          paymentDate: result.paymentDate,
          notes: result.notes,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        },
        bill: {
          id: bill.id,
          amount: bill.amount,
          totalPaid: newTotalPaid,
          remaining: finalRemaining,
          status: newStatus,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mencatat pembayaran.',
      error: safeError(error),
    });
  }
});

// GET /api/v1/properties/:propertyId/bills/:billId/payments
// Mengambil histori pembayaran untuk satu tagihan
router.get('/bills/:billId/payments', async (req, res) => {
  try {
    const { propertyId, billId } = req.params;

    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        propertyId,
      },
      include: {
        payments: {
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

    const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, bill.amount - totalPaid);
    const calculatedStatus = calculateBillStatus(bill.amount, totalPaid, bill.dueDate);

    return res.status(200).json({
      success: true,
      data: {
        billId: bill.id,
        amount: bill.amount,
        totalPaid,
        remaining,
        status: calculatedStatus,
        payments: bill.payments,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil histori pembayaran tagihan.',
      error: safeError(error),
    });
  }
});

// GET /api/v1/properties/:propertyId/payments
// Mengambil daftar seluruh pembayaran pada satu rumah
router.get('/payments', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { billId, method } = req.query;

    const whereClause = {
      bill: {
        propertyId,
      },
    };

    if (billId) {
      whereClause.billId = billId;
    }

    if (method) {
      const normalizedMethod = String(method).toUpperCase();
      if (['CASH', 'TRANSFER'].includes(normalizedMethod)) {
        whereClause.method = normalizedMethod;
      }
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        bill: {
          select: {
            id: true,
            amount: true,
            dueDate: true,
            room: {
              select: {
                id: true,
                roomNumber: true,
              },
            },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const formattedPayments = payments.map((p) => ({
      id: p.id,
      billId: p.billId,
      roomNumber: p.bill.room.roomNumber,
      amount: p.amount,
      method: p.method,
      paymentDate: p.paymentDate,
      notes: p.notes,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: formattedPayments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar pembayaran rumah.',
      error: safeError(error),
    });
  }
});

export default router;
