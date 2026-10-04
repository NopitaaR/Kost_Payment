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
  console.log('=== RUNNING ROOM API TESTS ===\n');

  // Reset database via seed first
  console.log('1. Fetching test database state...');
  const user1 = await prisma.user.findUnique({ where: { email: 'pemilik@kost.id' } });
  
  // Create User 2 for authorization testing
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
  const room02 = await prisma.room.findFirst({ where: { propertyId: house1.id, roomNumber: '02' } });

  const tokenUser1 = jwt.sign({ id: user1.id, email: user1.email }, JWT_SECRET, { expiresIn: '1h' });
  const tokenUser2 = jwt.sign({ id: user2.id, email: user2.email }, JWT_SECRET, { expiresIn: '1h' });
  const invalidToken = 'invalid.jwt.token';

  // TEST 1: GET rooms tanpa token (401)
  console.log('\n--- Test 1: GET rooms tanpa token ---');
  const res1 = await fetch(`${API_URL}/properties/${house1.id}/rooms`);
  assert(res1.status === 401, `Status code 401 (got ${res1.status})`);
  const data1 = await res1.json();
  assert(data1.success === false, 'Response success === false');

  // TEST 2: GET rooms dengan token invalid (403)
  console.log('\n--- Test 2: GET rooms dengan token invalid ---');
  const res2 = await fetch(`${API_URL}/properties/${house1.id}/rooms`, {
    headers: { Authorization: `Bearer ${invalidToken}` },
  });
  assert(res2.status === 403, `Status code 403 (got ${res2.status})`);
  const data2 = await res2.json();
  assert(data2.success === false, 'Response success === false');

  // TEST 3: GET rooms dengan token valid (200)
  console.log('\n--- Test 3: GET rooms dengan token valid ---');
  const res3 = await fetch(`${API_URL}/properties/${house1.id}/rooms`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  assert(res3.status === 200, `Status code 200 (got ${res3.status})`);
  const data3 = await res3.json();
  assert(data3.success === true, 'Response success === true');
  assert(Array.isArray(data3.data), 'Data is array');
  assert(data3.data.length >= 5, `Rooms count >= 5 (got ${data3.data.length})`);
  const room1Data = data3.data.find((r) => r.roomNumber === '01');
  assert(room1Data.activeTenants.length === 2, `Kamar 01 has 2 active tenants (got ${room1Data?.activeTenants?.length})`);

  // TEST 4: POST kamar baru (201)
  console.log('\n--- Test 4: POST kamar baru ---');
  const res4 = await fetch(`${API_URL}/properties/${house1.id}/rooms`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomNumber: '99',
      price: 850000,
      notes: 'Kamar baru untuk test',
    }),
  });
  assert(res4.status === 201, `Status code 201 (got ${res4.status})`);
  const data4 = await res4.json();
  assert(data4.success === true, 'Response success === true');
  assert(data4.data.roomNumber === '99', 'Room number is 99');
  assert(data4.data.price === 850000, 'Price is 850000');
  const newRoomId = data4.data.id;

  // TEST 5: POST duplicate roomNumber (400)
  console.log('\n--- Test 5: POST duplicate roomNumber ---');
  const res5 = await fetch(`${API_URL}/properties/${house1.id}/rooms`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomNumber: '01',
      price: 900000,
    }),
  });
  assert(res5.status === 400, `Status code 400 (got ${res5.status})`);
  const data5 = await res5.json();
  assert(data5.success === false, 'Response success === false');

  // TEST 6: GET detail room (200)
  console.log('\n--- Test 6: GET detail room (Kamar 01 dengan active & history) ---');
  const res6 = await fetch(`${API_URL}/properties/${house1.id}/rooms/${room01.id}`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  assert(res6.status === 200, `Status code 200 (got ${res6.status})`);
  const data6 = await res6.json();
  assert(data6.success === true, 'Response success === true');
  assert(data6.data.roomNumber === '01', 'Room number 01');
  assert(data6.data.activeTenants.length === 2, 'Has 2 active tenants');
  assert(Array.isArray(data6.data.occupancyHistory), 'Has occupancyHistory array');

  // TEST 7: PUT harga kamar & verifikasi Bill lama tidak berubah (200)
  console.log('\n--- Test 7: PUT harga kamar & verifikasi Bill lama tidak berubah ---');
  // Ambil Bill lama milik Kamar 01 sebelum edit harga
  const billBefore = await prisma.bill.findFirst({ where: { roomId: room01.id } });
  const oldBillAmount = billBefore.amount;

  const res7 = await fetch(`${API_URL}/properties/${house1.id}/rooms/${room01.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price: 950000,
      notes: 'Harga dinaikkan',
    }),
  });
  assert(res7.status === 200, `Status code 200 (got ${res7.status})`);
  const data7 = await res7.json();
  assert(data7.data.price === 950000, 'Price updated to 950000');

  // Cek Bill lama di database
  const billAfter = await prisma.bill.findFirst({ where: { id: billBefore.id } });
  assert(billAfter.amount === oldBillAmount, `Bill lama tidak berubah (${billAfter.amount} === ${oldBillAmount})`);

  // TEST 8: Akses room/property milik user lain (404)
  console.log('\n--- Test 8: Akses room/property milik user lain ---');
  const res8 = await fetch(`${API_URL}/properties/${house1.id}/rooms`, {
    headers: { Authorization: `Bearer ${tokenUser2}` },
  });
  assert(res8.status === 404, `GET property user lain return 404 (got ${res8.status})`);

  const res8b = await fetch(`${API_URL}/properties/${house1.id}/rooms/${room01.id}`, {
    headers: { Authorization: `Bearer ${tokenUser2}` },
  });
  assert(res8b.status === 404, `GET room user lain return 404 (got ${res8b.status})`);

  // TEST 9: DELETE kamar tanpa histori (200)
  console.log('\n--- Test 9: DELETE kamar tanpa histori ---');
  const res9 = await fetch(`${API_URL}/properties/${house1.id}/rooms/${newRoomId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  assert(res9.status === 200, `Status code 200 (got ${res9.status})`);
  const data9 = await res9.json();
  assert(data9.success === true, 'Response success === true');

  // TEST 10: DELETE kamar yang memiliki histori (400)
  console.log('\n--- Test 10: DELETE kamar yang memiliki histori ---');
  const res10 = await fetch(`${API_URL}/properties/${house1.id}/rooms/${room01.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  assert(res10.status === 400, `Status code 400 (got ${res10.status})`);
  const data10 = await res10.json();
  assert(data10.success === false, 'Response success === false');
  assert(data10.message.includes('riwayat') || data10.message.includes('tagihan'), 'Error message clear');

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
