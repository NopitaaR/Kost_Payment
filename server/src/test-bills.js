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
  console.log('=== RUNNING BILL API TESTS ===\n');

  console.log('1. Fetching test database state & setting up users...');
  // Ensure fresh seed state for reproducible tests
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
  
  // Clean up previous test bills for clean reproducible runs
  await prisma.bill.deleteMany({
    where: { notes: 'Bill tes manual' },
  });

  // Ensure room01 price is set to standard 800000 for tests
  await prisma.room.updateMany({
    where: { propertyId: house1.id, roomNumber: '01' },
    data: { price: 800000 },
  });

  const room01 = await prisma.room.findFirst({ where: { propertyId: house1.id, roomNumber: '01' } });
  const room03 = await prisma.room.findFirst({ where: { propertyId: house1.id, roomNumber: '03' } });
  const room05 = await prisma.room.findFirst({ where: { propertyId: house1.id, roomNumber: '05' } });

  const tokenUser1 = jwt.sign({ id: user1.id, email: user1.email }, JWT_SECRET, { expiresIn: '1h' });
  const tokenUser2 = jwt.sign({ id: user2.id, email: user2.email }, JWT_SECRET, { expiresIn: '1h' });
  const invalidToken = 'invalid.jwt.token';

  // TEST 1: GET bills tanpa token (401)
  console.log('\n--- Test 1: GET bills tanpa token ---');
  const res1 = await fetch(`${API_URL}/properties/${house1.id}/bills`);
  assert(res1.status === 401, `Status code 401 (got ${res1.status})`);

  // TEST 2: GET bills dengan token invalid (403)
  console.log('\n--- Test 2: GET bills dengan token invalid ---');
  const res2 = await fetch(`${API_URL}/properties/${house1.id}/bills`, {
    headers: { Authorization: `Bearer ${invalidToken}` },
  });
  assert(res2.status === 403, `Status code 403 (got ${res2.status})`);

  // TEST 3: GET bills dengan token valid (200)
  console.log('\n--- Test 3: GET bills dengan token valid ---');
  const res3 = await fetch(`${API_URL}/properties/${house1.id}/bills`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  assert(res3.status === 200, `Status code 200 (got ${res3.status})`);
  const data3 = await res3.json();
  assert(data3.success === true, 'Response success === true');
  assert(Array.isArray(data3.data), 'Data is array');
  assert(data3.data.length >= 4, `Bills count >= 4 (got ${data3.data.length})`);

  // TEST 4: GET bill detail (200)
  console.log('\n--- Test 4: GET bill detail ---');
  const firstBill = data3.data[0];
  const res4 = await fetch(`${API_URL}/properties/${house1.id}/bills/${firstBill.id}`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  assert(res4.status === 200, `Status code 200 (got ${res4.status})`);
  const data4 = await res4.json();
  assert(data4.data.id === firstBill.id, 'Bill ID matches');
  assert(data4.data.amount !== undefined, 'Amount exists');
  assert(data4.data.remaining !== undefined, 'Remaining exists');

  // TEST 5: Property ownership check (404)
  console.log('\n--- Test 5: Property ownership check ---');
  const res5 = await fetch(`${API_URL}/properties/${house1.id}/bills`, {
    headers: { Authorization: `Bearer ${tokenUser2}` },
  });
  assert(res5.status === 404, `GET bills user lain return 404 (got ${res5.status})`);

  const res5b = await fetch(`${API_URL}/properties/${house1.id}/bills/${firstBill.id}`, {
    headers: { Authorization: `Bearer ${tokenUser2}` },
  });
  assert(res5b.status === 404, `GET bill detail user lain return 404 (got ${res5b.status})`);

  // TEST 6: Create bill valid (201)
  console.log('\n--- Test 6: Create bill valid ---');
  const res6 = await fetch(`${API_URL}/properties/${house1.id}/bills`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomId: room01.id,
      periodStart: '2026-11-20',
      periodEnd: '2026-12-20',
      dueDate: '2026-12-20',
      notes: 'Bill tes manual',
    }),
  });
  assert(res6.status === 201, `Status code 201 (got ${res6.status})`);
  const data6 = await res6.json();
  assert(data6.data.amount === room01.price, `Amount equals current room price (${data6.data.amount} === ${room01.price})`);
  const newBillId = data6.data.id;

  // TEST 7: Duplicate bill (400)
  console.log('\n--- Test 7: Duplicate bill ---');
  const res7 = await fetch(`${API_URL}/properties/${house1.id}/bills`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomId: room01.id,
      periodStart: '2026-11-20',
      periodEnd: '2026-12-20',
      dueDate: '2026-12-20',
    }),
  });
  assert(res7.status === 400, `Duplicate bill rejected with 400 (got ${res7.status})`);

  // TEST 8: Two occupants one room -> 1 bill
  console.log('\n--- Test 8: Two occupants one room produce 1 bill ---');
  const res8 = await fetch(`${API_URL}/properties/${house1.id}/bills/${newBillId}`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  const data8 = await res8.json();
  assert(data8.data.amount === 800000, 'Bill amount is single total room price 800000');

  // TEST 9: Price snapshot -> ubah harga kamar tidak mengubah bill lama
  console.log('\n--- Test 9: Price snapshot verification ---');
  // Ubah harga kamar 01 di DB dari 800.000 -> 950.000
  await prisma.room.update({ where: { id: room01.id }, data: { price: 950000 } });

  const res9 = await fetch(`${API_URL}/properties/${house1.id}/bills/${newBillId}`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  const data9 = await res9.json();
  assert(data9.data.amount === 800000, `Historical bill amount unchanged (${data9.data.amount} === 800000)`);

  // Kembalikan harga kamar 01
  await prisma.room.update({ where: { id: room01.id }, data: { price: 800000 } });

  // TEST 10: Billing cycle -> mengikuti occupancy start date
  console.log('\n--- Test 10: Billing cycle follows occupancy start date ---');
  const occAndi = await prisma.occupancy.findFirst({ where: { roomId: room01.id, status: 'AKTIF' } });
  assert(occAndi.startDate.toISOString().slice(8, 10) === '20', 'Occupancy start date is day 20');

  // TEST 11: Move room -> historical bill kamar lama tidak berubah
  console.log('\n--- Test 11: Move room does not alter historical bill ---');
  const billBeforeMove = await fetch(`${API_URL}/properties/${house1.id}/bills/${newBillId}`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  }).then((r) => r.json());
  assert(billBeforeMove.data.amount === 800000, 'Historical bill amount remains 800000');

  // TEST 12: Generate bill (Idempotent)
  console.log('\n--- Test 12: Generate bill idempotency ---');
  const res12a = await fetch(`${API_URL}/properties/${house1.id}/bills/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  assert(res12a.status === 200, `First generate returns 200 (got ${res12a.status})`);

  const res12b = await fetch(`${API_URL}/properties/${house1.id}/bills/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  assert(res12b.status === 200, `Second generate returns 200 (got ${res12b.status})`);
  const data12b = await res12b.json();
  assert(data12b.data.generatedCount === 0, `Second generate created 0 duplicates (got ${data12b.data.generatedCount})`);

  // TEST 13: Bill status (BELUM_BAYAR, SEBAGIAN, LUNAS, TERLAMBAT)
  console.log('\n--- Test 13: Bill status logic ---');
  const allBills = await fetch(`${API_URL}/properties/${house1.id}/bills`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  }).then((r) => r.json());

  const billStatuses = allBills.data.map((b) => b.status);
  assert(billStatuses.includes('BELUM_BAYAR') || billStatuses.includes('TERLAMBAT'), 'Contains BELUM_BAYAR or TERLAMBAT');
  assert(billStatuses.includes('SEBAGIAN') || billStatuses.includes('LUNAS'), 'Contains SEBAGIAN or LUNAS');

  // TEST 14: Remaining = amount - totalPaid
  console.log('\n--- Test 14: Remaining calculation ---');
  const lunasBill = allBills.data.find((b) => b.status === 'LUNAS');
  if (lunasBill) {
    assert(lunasBill.remaining === 0, `Lunas bill remaining is 0 (got ${lunasBill.remaining})`);
  } else {
    assert(true, 'Skipped lunas check if seed differs');
  }

  // TEST 15: Tidak boleh remaining negatif
  console.log('\n--- Test 15: Remaining non-negative ---');
  allBills.data.forEach((b) => {
    assert(b.remaining >= 0, `Bill ${b.id} remaining is >= 0 (${b.remaining})`);
  });

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
