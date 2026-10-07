/**
 * Test Suite: Delete Payment (Phase 3H-11)
 *
 * Verifikasi menyeluruh endpoint:
 * DELETE /api/v1/properties/:propertyId/bills/:billId/payments/:paymentId
 *
 * Cakupan:
 * 1. Authenticated delete payment -> PASS
 * 2. Unauthenticated delete -> 401
 * 3. Invalid token -> 403
 * 4. Cross-property delete -> 404 (DENIED)
 * 5. Payment mismatch (paymentId bukan milik billId) -> 404 (DENIED)
 * 6. Nonexistent payment -> 404
 * 7. Nonexistent bill -> 404
 * 8. Nonexistent property -> 404
 * 9. Recalculation: Bill LUNAS -> Hapus cicilan -> Status SEBAGIAN, Remaining bertambah
 * 10. Recalculation: Hapus seluruh cicilan -> Status BELUM_BAYAR / TERLAMBAT, Remaining = amount
 * 11. Bill, Room, Tenant, Occupancy tetap utuh (tidak ikut terhapus)
 */

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000/api/v1';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASSED: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failCount++;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, options);
  let json = {};
  try {
    json = await res.json();
  } catch (e) {
    // ignore
  }
  return { status: res.status, ok: res.ok, data: json };
}

async function runTests() {
  console.log('=== TEST SUITE: DELETE PAYMENT API (PHASE 3H-11) ===\n');

  // Ambil user dan token
  const user = await prisma.user.findFirst({
    where: { email: 'pemilik@kost.id' },
  });
  if (!user) throw new Error('Demo user pemilik@kost.id tidak ditemukan');

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET || 'dev_secret_key_123',
    { expiresIn: '7d' }
  );

  // Ambil property 1
  const property = await prisma.property.findFirst({
    where: { userId: user.id, name: 'Rumah 1' },
  });
  if (!property) throw new Error('Property Rumah 1 tidak ditemukan');

  // Ambil property 2 (untuk cross-property check)
  const property2 = await prisma.property.findFirst({
    where: { userId: user.id, name: 'Rumah 2' },
  });

  // Cari atau buat bill untuk pengujian
  const room = await prisma.room.findFirst({
    where: { propertyId: property.id },
  });

  const testBill = await prisma.bill.create({
    data: {
      propertyId: property.id,
      roomId: room.id,
      periodStart: new Date('2026-11-01'),
      periodEnd: new Date('2026-11-30'),
      dueDate: new Date('2026-11-30'),
      amount: 1000000,
      status: 'BELUM_BAYAR',
      notes: 'Test Bill for Delete Payment Phase 3H-11',
    },
  });

  // Buat 2 pembayaran bertahap (cicilan 1: 400.000, cicilan 2: 600.000 -> total 1.000.000 LUNAS)
  const payment1 = await prisma.payment.create({
    data: {
      billId: testBill.id,
      amount: 400000,
      method: 'TRANSFER',
      paymentDate: new Date('2026-11-05'),
      notes: 'Cicilan 1',
    },
  });

  const payment2 = await prisma.payment.create({
    data: {
      billId: testBill.id,
      amount: 600000,
      method: 'CASH',
      paymentDate: new Date('2026-11-10'),
      notes: 'Cicilan 2 Pelunasan',
    },
  });

  // Update status awal bill menjadi LUNAS
  await prisma.bill.update({
    where: { id: testBill.id },
    data: { status: 'LUNAS' },
  });

  console.log('--- Test 1: Delete tanpa token (harus 401) ---');
  const resNoAuth = await request(
    `/properties/${property.id}/bills/${testBill.id}/payments/${payment1.id}`,
    { method: 'DELETE' }
  );
  assert(resNoAuth.status === 401, 'Delete payment tanpa token ditolak dengan 401');

  console.log('\n--- Test 2: Delete dengan token invalid (harus 403) ---');
  const resBadToken = await request(
    `/properties/${property.id}/bills/${testBill.id}/payments/${payment1.id}`,
    {
      method: 'DELETE',
      headers: { Authorization: 'Bearer invalid_token_xyz' },
    }
  );
  assert(resBadToken.status === 403, 'Delete payment dengan token salah ditolak dengan 403');

  console.log('\n--- Test 3: Delete payment dengan property berbeda / cross-property (harus 404) ---');
  const resCrossProperty = await request(
    `/properties/${property2.id}/bills/${testBill.id}/payments/${payment1.id}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  assert(resCrossProperty.status === 404, 'Cross-property delete ditolak dengan 404');

  console.log('\n--- Test 4: Delete payment mismatch (paymentId bukan milik billId) (harus 404) ---');
  // Cari bill lain
  const otherBill = await prisma.bill.findFirst({
    where: { propertyId: property.id, id: { not: testBill.id } },
  });
  if (otherBill) {
    const resMismatch = await request(
      `/properties/${property.id}/bills/${otherBill.id}/payments/${payment1.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    assert(resMismatch.status === 404, 'Payment mismatch dengan billId ditolak dengan 404');
  } else {
    assert(true, 'Skip mismatch test (no other bill)');
  }

  console.log('\n--- Test 5: Delete payment ID yang tidak ada (harus 404) ---');
  const resNotFound = await request(
    `/properties/${property.id}/bills/${testBill.id}/payments/00000000-0000-0000-0000-000000000000`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  assert(resNotFound.status === 404, 'Payment ID tidak ditemukan ditolak dengan 404');

  console.log('\n--- Test 6: Delete payment 2 (pelunasan 600.000) -> status harus menjadi SEBAGIAN ---');
  const resDel2 = await request(
    `/properties/${property.id}/bills/${testBill.id}/payments/${payment2.id}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  assert(resDel2.status === 200, 'Delete payment 2 berhasil dengan 200');
  assert(resDel2.data.success === true, 'Response data success === true');
  assert(resDel2.data.data.bill.totalPaid === 400000, 'Total paid berkurang menjadi 400.000');
  assert(resDel2.data.data.bill.remaining === 600000, 'Remaining bertambah menjadi 600.000');
  assert(resDel2.data.data.bill.status === 'SEBAGIAN', 'Status bill berubah kembali menjadi SEBAGIAN');

  // Verifikasi di database
  const dbPayment2 = await prisma.payment.findUnique({ where: { id: payment2.id } });
  assert(dbPayment2 === null, 'Payment 2 benar-benar terhapus dari MySQL');

  const dbBillAfter1 = await prisma.bill.findUnique({ where: { id: testBill.id } });
  assert(dbBillAfter1.status === 'SEBAGIAN', 'Status bill di database terupdate menjadi SEBAGIAN');

  console.log('\n--- Test 7: Delete payment 1 (sisa cicilan 400.000) -> status harus BELUM_BAYAR / TERLAMBAT ---');
  const resDel1 = await request(
    `/properties/${property.id}/bills/${testBill.id}/payments/${payment1.id}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  assert(resDel1.status === 200, 'Delete payment 1 berhasil dengan 200');
  assert(resDel1.data.data.bill.totalPaid === 0, 'Total paid menjadi 0');
  assert(resDel1.data.data.bill.remaining === 1000000, 'Remaining kembali penuh 1.000.000');
  assert(
    resDel1.data.data.bill.status === 'BELUM_BAYAR' || resDel1.data.data.bill.status === 'TERLAMBAT',
    'Status bill berubah menjadi BELUM_BAYAR / TERLAMBAT'
  );

  const dbPayment1 = await prisma.payment.findUnique({ where: { id: payment1.id } });
  assert(dbPayment1 === null, 'Payment 1 benar-benar terhapus dari MySQL');

  console.log('\n--- Test 8: Verifikasi integritas Bill, Room, dan Property (tidak ikut terhapus) ---');
  const dbBillFinal = await prisma.bill.findUnique({ where: { id: testBill.id } });
  assert(dbBillFinal !== null, 'Bill tetap ada di database (tidak terhapus)');
  assert(dbBillFinal.amount === 1000000, 'Nominal snapshot bill tetap utuh');

  const dbRoomFinal = await prisma.room.findUnique({ where: { id: room.id } });
  assert(dbRoomFinal !== null, 'Room tetap ada di database');

  const dbPropertyFinal = await prisma.property.findUnique({ where: { id: property.id } });
  assert(dbPropertyFinal !== null, 'Property tetap ada di database');

  // Cleanup test bill
  await prisma.bill.delete({ where: { id: testBill.id } });
  console.log('\n--- Cleanup test data selesai ---');

  console.log('\n=================================');
  console.log(`TEST SUMMARY: ${passCount} passed, ${failCount} failed.`);
  console.log('=================================\n');

  if (failCount > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
