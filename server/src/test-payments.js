import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'kost-manager-secret-key-2026';
const API_URL = 'http://localhost:5000/api/v1';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASSED: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('=== RUNNING PAYMENT API TESTS ===\n');

  console.log('1. Fetching database state & setting up users...');
  const user1 = await prisma.user.findUnique({ where: { email: 'pemilik@kost.id' } });
  
  let user2 = await prisma.user.findUnique({ where: { email: 'pemilik2@kost.id' } });
  if (!user2) {
    user2 = await prisma.user.create({
      data: {
        name: 'Pemilik 2',
        email: 'pemilik2@kost.id',
        passwordHash: 'dummy',
      },
    });
  }

  let user2Property = await prisma.property.findFirst({ where: { userId: user2.id } });
  if (!user2Property) {
    user2Property = await prisma.property.create({
      data: {
        name: 'Rumah User 2',
        userId: user2.id,
      },
    });
  }

  const house1 = await prisma.property.findFirst({ where: { userId: user1.id, name: 'Rumah 1' } });
  const room01 = await prisma.room.findFirst({ where: { propertyId: house1.id, roomNumber: '01' } });

  const tokenUser1 = jwt.sign({ id: user1.id, email: user1.email }, JWT_SECRET, { expiresIn: '1h' });
  const tokenUser2 = jwt.sign({ id: user2.id, email: user2.email }, JWT_SECRET, { expiresIn: '1h' });
  const invalidToken = 'invalid.jwt.token';

  // Buat 1 test bill khusus untuk pengujian payment
  await prisma.payment.deleteMany({
    where: { bill: { notes: 'Bill test payment' } },
  });
  await prisma.bill.deleteMany({
    where: { notes: 'Bill test payment' },
  });

  const testBill = await prisma.bill.create({
    data: {
      propertyId: house1.id,
      roomId: room01.id,
      periodStart: new Date('2026-11-01'),
      periodEnd: new Date('2026-12-01'),
      dueDate: new Date('2026-12-01'),
      amount: 1000000,
      status: 'BELUM_BAYAR',
      notes: 'Bill test payment',
    },
  });

  // TEST 1: POST payment tanpa token (401)
  console.log('\n--- Test 1: POST payment tanpa token ---');
  const res1 = await fetch(`${API_URL}/properties/${house1.id}/bills/${testBill.id}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 100000, method: 'CASH' }),
  });
  assert(res1.status === 401, `Status code 401 (got ${res1.status})`);

  // TEST 2: POST payment token invalid (403)
  console.log('\n--- Test 2: POST payment token invalid ---');
  const res2 = await fetch(`${API_URL}/properties/${house1.id}/bills/${testBill.id}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${invalidToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: 100000, method: 'CASH' }),
  });
  assert(res2.status === 403, `Status code 403 (got ${res2.status})`);

  // TEST 3: POST payment valid (201) - Cicilan Pertama Rp300.000
  console.log('\n--- Test 3: POST payment valid (Partial 1) ---');
  const res3 = await fetch(`${API_URL}/properties/${house1.id}/bills/${testBill.id}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: 300000,
      method: 'CASH',
      notes: 'Cicilan 1',
    }),
  });
  assert(res3.status === 201, `Status code 201 (got ${res3.status})`);
  const data3 = await res3.json();
  assert(data3.success === true, 'Response success === true');
  assert(data3.data.bill.totalPaid === 300000, 'Total paid is 300000');
  assert(data3.data.bill.remaining === 700000, 'Remaining is 700000');
  assert(data3.data.bill.status === 'SEBAGIAN', 'Status updated to SEBAGIAN');
  const firstPaymentId = data3.data.payment.id;

  // TEST 4: GET payments valid (200)
  console.log('\n--- Test 4: GET payments valid ---');
  const res4 = await fetch(`${API_URL}/properties/${house1.id}/payments`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  assert(res4.status === 200, `Status code 200 (got ${res4.status})`);
  const data4 = await res4.json();
  assert(Array.isArray(data4.data), 'Data is array');
  assert(data4.data.length >= 1, 'Contains payments');

  // TEST 5: GET payment history bill (200)
  console.log('\n--- Test 5: GET payment history bill ---');
  const res5 = await fetch(`${API_URL}/properties/${house1.id}/bills/${testBill.id}/payments`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  assert(res5.status === 200, `Status code 200 (got ${res5.status})`);
  const data5 = await res5.json();
  assert(data5.data.payments.length === 1, 'Bill has 1 payment in history');

  // TEST 6: Ownership check (404)
  console.log('\n--- Test 6: Ownership check ---');
  const res6 = await fetch(`${API_URL}/properties/${house1.id}/bills/${testBill.id}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser2}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: 100000, method: 'CASH' }),
  });
  assert(res6.status === 404, `User 2 post payment returns 404 (got ${res6.status})`);

  // TEST 7: Payment amount > remaining (400)
  console.log('\n--- Test 7: Payment amount > remaining ---');
  const res7 = await fetch(`${API_URL}/properties/${house1.id}/bills/${testBill.id}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: 800000, // sisa 700.000, coba bayar 800.000
      method: 'CASH',
    }),
  });
  assert(res7.status === 400, `Exceeding amount rejected with 400 (got ${res7.status})`);

  // TEST 8 & 9 & 10: Multiple payment = remaining -> status LUNAS
  console.log('\n--- Test 8-10: Second payment equals remaining -> LUNAS ---');
  const res8 = await fetch(`${API_URL}/properties/${house1.id}/bills/${testBill.id}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: 700000, // sisa 700.000
      method: 'TRANSFER',
      notes: 'Pelunasan',
    }),
  });
  assert(res8.status === 201, `Status code 201 (got ${res8.status})`);
  const data8 = await res8.json();
  assert(data8.data.bill.totalPaid === 1000000, 'Total paid is 1000000');
  assert(data8.data.bill.remaining === 0, 'Remaining is 0');
  assert(data8.data.bill.status === 'LUNAS', 'Status updated to LUNAS');

  // TEST 11: Total payment calculation
  console.log('\n--- Test 11: Total payment calculation ---');
  const res11 = await fetch(`${API_URL}/properties/${house1.id}/bills/${testBill.id}/payments`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  const data11 = await res11.json();
  assert(data11.data.totalPaid === 1000000, 'Calculated totalPaid === 1000000');

  // TEST 12: Remaining calculation
  console.log('\n--- Test 12: Remaining calculation ---');
  assert(data11.data.remaining === 0, 'Remaining === 0');

  // TEST 13: Remaining non-negative
  console.log('\n--- Test 13: Remaining non-negative ---');
  assert(data11.data.remaining >= 0, 'Remaining is >= 0');

  // TEST 14: Payment method validation (400)
  console.log('\n--- Test 14: Payment method validation ---');
  const res14 = await fetch(`${API_URL}/properties/${house1.id}/bills/${testBill.id}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: 100000,
      method: 'BITCOIN', // Invalid method
    }),
  });
  assert(res14.status === 400, `Invalid method rejected with 400 (got ${res14.status})`);

  // TEST 15: Amount 0 (400)
  console.log('\n--- Test 15: Amount 0 ---');
  const res15 = await fetch(`${API_URL}/properties/${house1.id}/bills/${testBill.id}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: 0,
      method: 'CASH',
    }),
  });
  assert(res15.status === 400, `Amount 0 rejected with 400 (got ${res15.status})`);

  // TEST 16: Amount negatif (400)
  console.log('\n--- Test 16: Amount negatif ---');
  const res16 = await fetch(`${API_URL}/properties/${house1.id}/bills/${testBill.id}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: -50000,
      method: 'CASH',
    }),
  });
  assert(res16.status === 400, `Negative amount rejected with 400 (got ${res16.status})`);

  // TEST 17: Bill status sequence verification (BELUM_BAYAR -> SEBAGIAN -> LUNAS)
  console.log('\n--- Test 17: Bill status sequence ---');
  // Buat bill baru Rp500.000
  const seqBill = await prisma.bill.create({
    data: {
      propertyId: house1.id,
      roomId: room01.id,
      periodStart: new Date('2026-12-01'),
      periodEnd: new Date('2027-01-01'),
      dueDate: new Date('2027-01-01'),
      amount: 500000,
      status: 'BELUM_BAYAR',
      notes: 'Bill test sequence',
    },
  });
  assert(seqBill.status === 'BELUM_BAYAR', 'Initial status is BELUM_BAYAR');

  const pSeq1 = await fetch(`${API_URL}/properties/${house1.id}/bills/${seqBill.id}/payments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenUser1}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 200000, method: 'CASH' }),
  }).then((r) => r.json());
  assert(pSeq1.data.bill.status === 'SEBAGIAN', 'Status after 200k paid is SEBAGIAN');

  const pSeq2 = await fetch(`${API_URL}/properties/${house1.id}/bills/${seqBill.id}/payments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenUser1}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 300000, method: 'CASH' }),
  }).then((r) => r.json());
  assert(pSeq2.data.bill.status === 'LUNAS', 'Status after remaining 300k paid is LUNAS');

  // TEST 18: Payment ke bill property lain (404)
  console.log('\n--- Test 18: Payment ke bill property lain ---');
  const res18 = await fetch(`${API_URL}/properties/${house1.id}/bills/${seqBill.id}/payments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenUser2}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 100000, method: 'CASH' }),
  });
  assert(res18.status === 404, `Other user payment returns 404 (got ${res18.status})`);

  // TEST 19: Historical payment utuh
  console.log('\n--- Test 19: Historical payment intact ---');
  const res19 = await fetch(`${API_URL}/properties/${house1.id}/bills/${testBill.id}/payments`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  }).then((r) => r.json());
  assert(res19.data.payments.length === 2, '2 historical payments exist and intact');

  // Clean up test sequence bills
  await prisma.payment.deleteMany({ where: { bill: { notes: { in: ['Bill test payment', 'Bill test sequence'] } } } });
  await prisma.bill.deleteMany({ where: { notes: { in: ['Bill test payment', 'Bill test sequence'] } } });

  console.log(`\n=================================`);
  console.log(`TEST SUMMARY: ${passedTests} passed, ${failedTests} failed.`);
  console.log(`=================================`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
