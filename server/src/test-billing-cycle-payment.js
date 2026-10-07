/**
 * Regression Test Suite: Billing Cycle & Payment Bill Isolation
 * 
 * Verifies:
 * CASE A: Tenant masuk 7 Okt -> first bill tepat 1 (7 Okt -> 7 Nov, dueDate 7 Okt)
 * CASE B: Generate pada 7 Okt -> tetap tepat 1 bill untuk periode 7 Okt–7 Nov
 * CASE C: Payment partial -> hanya bill tersebut berubah menjadi SEBAGIAN
 * CASE D: Payment full -> hanya bill tersebut menjadi LUNAS
 * CASE E: Generate ketika sudah masuk 7 Nov -> membuat bill siklus berikutnya 7 Nov–7 Des (dueDate 7 Nov)
 * CASE F: Generate ulang -> tidak duplicate (Idempotent)
 */

import { PrismaClient } from '@prisma/client';
import assert from 'assert';

const API_URL = 'http://localhost:5000/api/v1';
const prisma = new PrismaClient();

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(err);
    throw err;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('RUNNING REGRESSION: BILLING CYCLE & PAYMENT ISOLATION');
  console.log('======================================================\n');

  // 1. Setup Auth
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'pemilik@kost.id',
      password: 'rahasia123',
    }),
  });
  const loginData = await loginRes.json();
  assert(loginData.success, 'Login harus sukses');
  const token = loginData.token || (loginData.data && loginData.data.token);
  assert(token, 'Token harus ada');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Dapatkan properti aktif
  const propRes = await fetch(`${API_URL}/properties`, {
    headers: authHeaders,
  });
  const propData = await propRes.json();
  const property = propData.data[0];
  assert(property, 'Property harus tersedia');
  const propertyId = property.id;

  // 3. Siapkan kamar uji khusus untuk Novita
  const roomNumber = `TEST-${Date.now().toString().slice(-4)}`;
  const roomPrice = 900000;
  const roomRes = await fetch(`${API_URL}/properties/${propertyId}/rooms`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      roomNumber,
      price: roomPrice,
      notes: 'Kamar test Novita billing cycle & payment isolation',
    }),
  });
  const roomData = await roomRes.json();
  assert(roomData.success, `Room creation harus sukses: ${roomData.message}`);
  const roomId = roomData.data.id;

  let tenantId;
  let firstBillId;
  let secondBillId;

  try {
    // ---------------------------------------------------------
    // CASE A: Tenant masuk 7 Okt -> first bill tepat 1 (7 Okt - 7 Nov, dueDate 7 Okt)
    // ---------------------------------------------------------
    console.log('\n--- CASE A: Tenant masuk 7 Okt -> first bill tepat 1 ---');
    const moveInDate = '2026-10-07';
    const tenantRes = await fetch(`${API_URL}/properties/${propertyId}/tenants`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        roomId,
        name: 'Novita Regression',
        phone: '081299990001',
        originAddress: 'Jakarta',
        occupation: 'Mahasiswi',
        moveInDate,
      }),
    });
    const tenantData = await tenantRes.json();
    assert(tenantData.success, `Tenant creation harus sukses: ${tenantData.message}`);
    tenantId = tenantData.data.id;

    const billsAfterTenantRes = await fetch(`${API_URL}/properties/${propertyId}/bills?roomId=${roomId}`, {
      headers: authHeaders,
    });
    const billsAfterTenant = await billsAfterTenantRes.json();

    it('CASE A: First bill otomatis dibuat tepat 1 tagihan (7 Okt -> 7 Nov, dueDate 7 Okt)', () => {
      assert.strictEqual(billsAfterTenant.data.length, 1);
      const b1 = billsAfterTenant.data[0];
      assert.strictEqual(b1.amount, 900000);
      assert.strictEqual(b1.totalPaid, 0);
      assert.strictEqual(b1.remaining, 900000);
      assert(b1.periodStart.startsWith('2026-10-07'), `periodStart harus 2026-10-07, got ${b1.periodStart}`);
      assert(b1.periodEnd.startsWith('2026-11-07'), `periodEnd harus 2026-11-07, got ${b1.periodEnd}`);
      assert(b1.dueDate.startsWith('2026-10-07'), `dueDate harus 2026-10-07, got ${b1.dueDate}`);
    });

    firstBillId = billsAfterTenant.data[0].id;

    // ---------------------------------------------------------
    // CASE B: Generate pada 7 Okt -> tetap tepat 1 bill untuk periode 7 Okt–7 Nov
    // ---------------------------------------------------------
    console.log('\n--- CASE B: Generate pada 7 Okt -> tetap tepat 1 bill ---');
    const genResB = await fetch(`${API_URL}/properties/${propertyId}/bills/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        simulatedDate: '2026-10-07T00:00:00.000Z',
      }),
    });
    const genDataB = await genResB.json();
    assert(genDataB.success, 'Generate harus sukses');

    const billsAfterGenBRes = await fetch(`${API_URL}/properties/${propertyId}/bills?roomId=${roomId}`, {
      headers: authHeaders,
    });
    const billsAfterGenB = await billsAfterGenBRes.json();

    it('CASE B: Generate pada 7 Okt tidak membuat duplicate / bill kedua (jumlah bill tetap 1 untuk periode 7 Okt - 7 Nov)', () => {
      assert.strictEqual(billsAfterGenB.data.length, 1);
      assert.strictEqual(billsAfterGenB.data[0].id, firstBillId);
    });

    // ---------------------------------------------------------
    // CASE C: Payment partial -> hanya bill tersebut berubah menjadi SEBAGIAN
    // ---------------------------------------------------------
    console.log('\n--- CASE C: Partial Payment Isolation ---');
    const partialPayRes = await fetch(`${API_URL}/properties/${propertyId}/bills/${firstBillId}/payments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 400000,
        method: 'CASH',
        paymentDate: '2026-10-07',
        notes: 'Cicilan 1 Oktober',
      }),
    });
    const partialPayData = await partialPayRes.json();
    assert(partialPayData.success, `Partial payment harus sukses: ${partialPayData.message}`);

    const billOctC = await fetch(`${API_URL}/properties/${propertyId}/bills/${firstBillId}`, {
      headers: authHeaders,
    }).then((r) => r.json());

    it('CASE C: Bill Oktober berubah menjadi SEBAGIAN (totalPaid 400.000, remaining 500.000)', () => {
      assert.strictEqual(billOctC.data.status, 'SEBAGIAN');
      assert.strictEqual(billOctC.data.totalPaid, 400000);
      assert.strictEqual(billOctC.data.remaining, 500000);
    });

    // ---------------------------------------------------------
    // CASE D: Payment full -> hanya bill tersebut menjadi LUNAS
    // ---------------------------------------------------------
    console.log('\n--- CASE D: Full Payment (LUNAS) Isolation ---');
    const fullPayRes = await fetch(`${API_URL}/properties/${propertyId}/bills/${firstBillId}/payments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 500000,
        method: 'TRANSFER',
        paymentDate: '2026-10-07',
        notes: 'Pelunasan Oktober',
      }),
    });
    const fullPayData = await fullPayRes.json();
    assert(fullPayData.success, `Full payment harus sukses: ${fullPayData.message}`);

    const billOctD = await fetch(`${API_URL}/properties/${propertyId}/bills/${firstBillId}`, {
      headers: authHeaders,
    }).then((r) => r.json());

    it('CASE D: Bill Oktober sekarang LUNAS (totalPaid 900.000, remaining 0)', () => {
      assert.strictEqual(billOctD.data.status, 'LUNAS');
      assert.strictEqual(billOctD.data.totalPaid, 900000);
      assert.strictEqual(billOctD.data.remaining, 0);
    });

    // ---------------------------------------------------------
    // CASE E: Generate ketika sudah masuk 7 Nov -> membuat bill 7 Nov–7 Des
    // ---------------------------------------------------------
    console.log('\n--- CASE E: Generate ketika sudah masuk 7 Nov -> membuat bill 7 Nov–7 Des ---');
    const genResE = await fetch(`${API_URL}/properties/${propertyId}/bills/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        simulatedDate: '2026-11-07T00:00:00.000Z',
      }),
    });
    const genDataE = await genResE.json();
    assert(genDataE.success, 'Generate tanggal 7 Nov harus sukses');

    const billsAfterGenE = await fetch(`${API_URL}/properties/${propertyId}/bills?roomId=${roomId}`, {
      headers: authHeaders,
    }).then((r) => r.json());

    it('CASE E.1: Generate pada 7 Nov membuat bill siklus berikutnya (7 Nov -> 7 Des)', () => {
      assert.strictEqual(billsAfterGenE.data.length, 2);
      const nextBill = billsAfterGenE.data.find((b) => b.periodStart.startsWith('2026-11-07'));
      assert(nextBill, 'Tagihan periode 7 Nov -> 7 Des harus ada');
      assert(nextBill.periodEnd.startsWith('2026-12-07'), `periodEnd harus 2026-12-07, got ${nextBill.periodEnd}`);
      assert(nextBill.dueDate.startsWith('2026-11-07'), `dueDate harus 2026-11-07, got ${nextBill.dueDate}`);
      assert.strictEqual(nextBill.amount, 900000);
      assert.strictEqual(nextBill.status, 'BELUM_BAYAR');
      secondBillId = nextBill.id;
    });

    it('CASE E.2: Bill Oktober tetap LUNAS dan tidak ada duplicate periode 7 Okt -> 7 Nov', () => {
      const octBills = billsAfterGenE.data.filter((b) => b.periodStart.startsWith('2026-10-07'));
      assert.strictEqual(octBills.length, 1, 'Hanya boleh ada tepat 1 bill untuk periode 7 Okt - 7 Nov');
      assert.strictEqual(octBills[0].status, 'LUNAS');
      assert.strictEqual(octBills[0].totalPaid, 900000);
    });

    it('CASE E.3: Bill November berstatus BELUM_BAYAR (payment isolation: tidak ikut lunas)', () => {
      const novBill = billsAfterGenE.data.find((b) => b.periodStart.startsWith('2026-11-07'));
      assert.strictEqual(novBill.status, 'BELUM_BAYAR');
      assert.strictEqual(novBill.totalPaid, 0);
      assert.strictEqual(novBill.remaining, 900000);
    });

    // ---------------------------------------------------------
    // CASE F: Generate ulang pada 7 Nov -> tidak duplicate (Idempotent)
    // ---------------------------------------------------------
    console.log('\n--- CASE F: Generate Ulang Idempotency ---');
    const genRepeat = await fetch(`${API_URL}/properties/${propertyId}/bills/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        simulatedDate: '2026-11-07T00:00:00.000Z',
      }),
    });
    const genRepeatData = await genRepeat.json();
    assert(genRepeatData.success, 'Generate repeat sukses');

    const billsAfterRepeat = await fetch(`${API_URL}/properties/${propertyId}/bills?roomId=${roomId}`, {
      headers: authHeaders,
    }).then((r) => r.json());

    it('CASE F.1: Generate kedua kali menghasilkan 0 duplicate', () => {
      assert.strictEqual(genRepeatData.data.generatedCount, 0);
    });

    it('CASE F.2: Jumlah tagihan kamar tetap tepat 2 tanpa ada duplikasi (1 Okt-Nov, 1 Nov-Des)', () => {
      assert.strictEqual(billsAfterRepeat.data.length, 2);
    });

    // Cleanup data test yang dibuat dalam script ini
    console.log('\n--- CLEANING UP TEST DATA ---');
    await prisma.payment.deleteMany({
      where: { billId: { in: [firstBillId, secondBillId].filter(Boolean) } },
    });
    await prisma.bill.deleteMany({
      where: { roomId },
    });
    await prisma.occupancy.deleteMany({
      where: { roomId },
    });
    await prisma.tenant.deleteMany({
      where: { id: tenantId },
    });
    await prisma.room.deleteMany({
      where: { id: roomId },
    });
    console.log('  Cleaned up all test rooms, tenants, bills, and payments.');

  } catch (error) {
    // Bersihkan room jika terjadi kegagalan
    try {
      if (firstBillId || secondBillId) {
        await prisma.payment.deleteMany({
          where: { billId: { in: [firstBillId, secondBillId].filter(Boolean) } },
        });
      }
      await prisma.bill.deleteMany({ where: { roomId } });
      await prisma.occupancy.deleteMany({ where: { roomId } });
      if (tenantId) await prisma.tenant.delete({ where: { id: tenantId } });
      await prisma.room.delete({ where: { id: roomId } });
    } catch (_) {}
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n======================================================`);
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log(`======================================================\n`);
}

runTests().catch((e) => {
  console.error('Test suite failed:', e);
  process.exit(1);
});
