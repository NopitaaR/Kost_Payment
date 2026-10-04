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
  console.log('=== RUNNING TENANT & OCCUPANCY API TESTS ===\n');

  console.log('1. Fetching test database state & setting up users...');
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
  let user2Room = await prisma.room.findFirst({ where: { propertyId: user2Property.id } });
  if (!user2Room) {
    user2Room = await prisma.room.create({
      data: {
        propertyId: user2Property.id,
        roomNumber: 'U2-01',
        price: 500000,
        status: 'KOSONG',
      },
    });
  }

  const house1 = await prisma.property.findFirst({ where: { userId: user1.id, name: 'Rumah 1' } });
  const room01 = await prisma.room.findFirst({ where: { propertyId: house1.id, roomNumber: '01' } });
  const room02 = await prisma.room.findFirst({ where: { propertyId: house1.id, roomNumber: '02' } });

  const tokenUser1 = jwt.sign({ id: user1.id, email: user1.email }, JWT_SECRET, { expiresIn: '1h' });
  const tokenUser2 = jwt.sign({ id: user2.id, email: user2.email }, JWT_SECRET, { expiresIn: '1h' });
  const invalidToken = 'invalid.jwt.token';

  // TEST 1: GET tenants tanpa token (401)
  console.log('\n--- Test 1: GET tenants tanpa token ---');
  const res1 = await fetch(`${API_URL}/properties/${house1.id}/tenants`);
  assert(res1.status === 401, `Status code 401 (got ${res1.status})`);

  // TEST 2: GET tenants token invalid (403)
  console.log('\n--- Test 2: GET tenants token invalid ---');
  const res2 = await fetch(`${API_URL}/properties/${house1.id}/tenants`, {
    headers: { Authorization: `Bearer ${invalidToken}` },
  });
  assert(res2.status === 403, `Status code 403 (got ${res2.status})`);

  // TEST 3: GET tenants token valid (200)
  console.log('\n--- Test 3: GET tenants token valid ---');
  const res3 = await fetch(`${API_URL}/properties/${house1.id}/tenants`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  assert(res3.status === 200, `Status code 200 (got ${res3.status})`);
  const data3 = await res3.json();
  assert(data3.success === true, 'Response success === true');
  assert(Array.isArray(data3.data), 'Data is array');
  assert(data3.data.length >= 5, `Tenant count >= 5 (got ${data3.data.length})`);

  // TEST 4: POST tenant baru + occupancy (201)
  console.log('\n--- Test 4: POST tenant baru + occupancy ---');
  const res4 = await fetch(`${API_URL}/properties/${house1.id}/tenants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Budi Test',
      phone: '081299998888',
      originAddress: 'Jakarta',
      occupation: 'Developer',
      moveInDate: '2026-10-01',
      roomId: room02.id,
    }),
  });
  assert(res4.status === 201, `Status code 201 (got ${res4.status})`);
  const data4 = await res4.json();
  assert(data4.success === true, 'Response success === true');
  assert(data4.data.name === 'Budi Test', 'Tenant name is Budi Test');
  assert(data4.data.currentRoom.id === room02.id, 'Room ID matches room02');
  assert(data4.data.status === 'AKTIF', 'Status is AKTIF');
  const newTenantId = data4.data.id;

  // TEST 5: Tenant masuk ke kamar yang valid -> Kamar 02 menjadi TERISI
  console.log('\n--- Test 5: Verifikasi kamar 02 status TERISI setelah tenant masuk ---');
  const room02Check = await prisma.room.findUnique({ where: { id: room02.id } });
  assert(room02Check.status === 'TERISI', 'Room 02 status updated to TERISI');

  // TEST 6: Tenant masuk ke room milik property lain -> ditolak (404)
  console.log('\n--- Test 6: Tenant masuk ke room milik property lain ---');
  const res6 = await fetch(`${API_URL}/properties/${house1.id}/tenants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Illegal Room Tenant',
      phone: '081200000000',
      originAddress: 'Bandung',
      occupation: 'Tester',
      moveInDate: '2026-10-01',
      roomId: user2Room.id,
    }),
  });
  assert(res6.status === 404, `Status code 404 (got ${res6.status})`);

  // TEST 7: GET tenant detail -> berhasil + occupancy history
  console.log('\n--- Test 7: GET tenant detail ---');
  const res7 = await fetch(`${API_URL}/properties/${house1.id}/tenants/${newTenantId}`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  assert(res7.status === 200, `Status code 200 (got ${res7.status})`);
  const data7 = await res7.json();
  assert(data7.data.name === 'Budi Test', 'Detail name is Budi Test');
  assert(Array.isArray(data7.data.occupancyHistory), 'Occupancy history is array');
  assert(data7.data.occupancyHistory.length === 1, '1 occupancy record exists');

  // TEST 8: PUT data tenant -> berhasil
  console.log('\n--- Test 8: PUT data tenant ---');
  const res8 = await fetch(`${API_URL}/properties/${house1.id}/tenants/${newTenantId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Budi Test Updated',
      phone: '081299999999',
    }),
  });
  assert(res8.status === 200, `Status code 200 (got ${res8.status})`);
  const data8 = await res8.json();
  assert(data8.data.name === 'Budi Test Updated', 'Updated name is Budi Test Updated');

  // TEST 9: Move tenant ke kamar lain (02 -> 01) -> berhasil
  console.log('\n--- Test 9: Move tenant ke kamar lain ---');
  const res9 = await fetch(`${API_URL}/properties/${house1.id}/tenants/${newTenantId}/move`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      newRoomId: room01.id,
      moveDate: '2026-10-05',
    }),
  });
  assert(res9.status === 200, `Status code 200 (got ${res9.status})`);

  // TEST 10 & 11 & 12: Pastikan occupancy lama PINDAH, occupancy baru AKTIF, current room berubah
  console.log('\n--- Test 10-12: Verifikasi occupancy & room status setelah move ---');
  const tenantDetailAfterMove = await fetch(`${API_URL}/properties/${house1.id}/tenants/${newTenantId}`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  }).then((r) => r.json());

  const occHistory = tenantDetailAfterMove.data.occupancyHistory;
  assert(occHistory.length === 2, 'Has 2 occupancy history records');
  assert(tenantDetailAfterMove.data.currentRoom.id === room01.id, 'Current room is now room01');

  const oldOcc = occHistory.find((o) => o.roomId === room02.id);
  const newOcc = occHistory.find((o) => o.roomId === room01.id);
  assert(oldOcc.status === 'PINDAH', 'Old occupancy status is PINDAH');
  assert(newOcc.status === 'AKTIF', 'New occupancy status is AKTIF');

  const room02AfterMove = await prisma.room.findUnique({ where: { id: room02.id } });
  assert(room02AfterMove.status === 'KOSONG', 'Room 02 becomes KOSONG after tenant moved out');

  // TEST 13 & 14 & 15 & 16: Exit tenant -> berhasil
  console.log('\n--- Test 13-16: Exit tenant ---');
  const res13 = await fetch(`${API_URL}/properties/${house1.id}/tenants/${newTenantId}/exit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      exitDate: '2026-10-10',
    }),
  });
  assert(res13.status === 200, `Status code 200 (got ${res13.status})`);

  const tenantDetailAfterExit = await fetch(`${API_URL}/properties/${house1.id}/tenants/${newTenantId}`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  }).then((r) => r.json());

  assert(tenantDetailAfterExit.data.status === 'KELUAR', 'Tenant status is KELUAR');
  assert(tenantDetailAfterExit.data.exitDate !== null, 'Exit date is stored');
  assert(tenantDetailAfterExit.data.occupancyHistory.length === 2, 'Occupancy history still intact');

  // TEST 17: Tenant property lain -> 404 / ditolak
  console.log('\n--- Test 17: Tenant property lain ---');
  const res17 = await fetch(`${API_URL}/properties/${house1.id}/tenants/${newTenantId}`, {
    headers: { Authorization: `Bearer ${tokenUser2}` },
  });
  assert(res17.status === 404, `Status code 404 for tenant of another user (got ${res17.status})`);

  // TEST 18: Endpoint occupancies -> berhasil
  console.log('\n--- Test 18: GET occupancies ---');
  const res18 = await fetch(`${API_URL}/properties/${house1.id}/occupancies`, {
    headers: { Authorization: `Bearer ${tokenUser1}` },
  });
  assert(res18.status === 200, `Status code 200 (got ${res18.status})`);
  const data18 = await res18.json();
  assert(Array.isArray(data18.data), 'Occupancies is array');
  assert(data18.data.length >= 5, `Occupancies count >= 5 (got ${data18.data.length})`);

  // ADDITIONAL TESTS
  console.log('\n--- Test Edge Cases ---');

  // Move tenant yang berstatus KELUAR -> ditolak 400
  const resMoveExit = await fetch(`${API_URL}/properties/${house1.id}/tenants/${newTenantId}/move`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      newRoomId: room02.id,
      moveDate: '2026-10-12',
    }),
  });
  assert(resMoveExit.status === 400, `Move tenant KELUAR returns 400 (got ${resMoveExit.status})`);

  // Exit tenant yang sudah KELUAR -> ditolak 400
  const resExitAgain = await fetch(`${API_URL}/properties/${house1.id}/tenants/${newTenantId}/exit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      exitDate: '2026-10-15',
    }),
  });
  assert(resExitAgain.status === 400, `Exit tenant KELUAR returns 400 (got ${resExitAgain.status})`);

  // Move ke room yang sama -> ditolak 400
  const activeTenant = await prisma.tenant.findFirst({
    where: { status: 'AKTIF', occupancies: { some: { propertyId: house1.id, status: 'AKTIF' } } },
    include: { occupancies: { where: { status: 'AKTIF' } } },
  });
  if (activeTenant) {
    const currentRoomId = activeTenant.occupancies[0].roomId;
    const resMoveSame = await fetch(`${API_URL}/properties/${house1.id}/tenants/${activeTenant.id}/move`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenUser1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        newRoomId: currentRoomId,
        moveDate: '2026-10-12',
      }),
    });
    assert(resMoveSame.status === 400, `Move to same room returns 400 (got ${resMoveSame.status})`);
  }

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
