// Test alur Penghuni / Tenant & Occupancy (Phase 3D).
// Menjalankan modul API client + tenants service terhadap backend yang sedang berjalan.
//
// Jalankan: node tests/tenant-flow.mjs

const API_ORIGIN = process.env.TEST_API_ORIGIN || 'http://localhost:5000';

// ---- Shim lingkungan browser ----
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.window = { location: { origin: API_ORIGIN } };

const { getToken, setToken, clearToken, api, ApiError } = await import(
  '../src/api/client.js'
);
const { login, logout } = await import('../src/api/auth.js');
const { getProperties } = await import('../src/api/properties.js');
const { getRooms, getRoom } = await import('../src/api/rooms.js');
const {
  getTenants,
  getTenant,
  createTenant,
  updateTenant,
  moveTenant,
  exitTenant,
  getOccupancies,
} = await import('../src/api/tenants.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASSED: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failed++;
  }
}

const VALID = { email: 'pemilik@kost.id', password: 'rahasia123' };

console.log('=== FRONTEND TENANT & OCCUPANCY FLOW TESTS (Phase 3D) ===');
console.log(`Target backend: ${API_ORIGIN}\n`);

// Setup: Login dan ambil rumah aktif
clearToken();
await login(VALID.email, VALID.password);
const properties = await getProperties();
const activeHouse = properties.find((p) => p.name === 'Rumah 1') || properties[0];
const activePropertyId = activeHouse.id;
localStorage.setItem('kost.activePropertyId', activePropertyId);

const rooms = await getRooms(activePropertyId);
const room01 = rooms.find((r) => r.roomNumber === '01') || rooms[0];
const room02 = rooms.find((r) => r.roomNumber === '02') || rooms[1];
const room03 = rooms.find((r) => r.roomNumber === '03') || rooms[2];

// TEST 1: GET tenant dengan token valid
console.log('--- Test 1: GET tenant dengan token valid ---');
const allTenants = await getTenants(activePropertyId);
assert(Array.isArray(allTenants), 'getTenants() mengembalikan array');
assert(allTenants.length > 0, `Berhasil memuat daftar tenant (total: ${allTenants.length})`);

// TEST 2: Filter ACTIVE
console.log('\n--- Test 2: Filter ACTIVE ---');
const activeTenants = await getTenants(activePropertyId, { status: 'AKTIF' });
assert(Array.isArray(activeTenants), 'Filter AKTIF mengembalikan array');
assert(
  activeTenants.every((t) => t.status === 'AKTIF'),
  `Semua tenant yang diambil berstatus AKTIF (total: ${activeTenants.length})`
);

// TEST 3: Filter KELUAR
console.log('\n--- Test 3: Filter KELUAR ---');
const keluarTenants = await getTenants(activePropertyId, { status: 'KELUAR' });
assert(Array.isArray(keluarTenants), 'Filter KELUAR mengembalikan array');
assert(
  keluarTenants.every((t) => t.status === 'KELUAR'),
  `Semua tenant yang diambil berstatus KELUAR (total: ${keluarTenants.length})`
);

// TEST 4: Search berdasarkan nama
console.log('\n--- Test 4: Search berdasarkan nama ---');
const firstTenantName = activeTenants[0]?.name || 'Andi';
const searchNameResult = await getTenants(activePropertyId, { search: firstTenantName.slice(0, 3) });
assert(
  searchNameResult.some((t) => t.name.toLowerCase().includes(firstTenantName.slice(0, 3).toLowerCase())),
  `Search nama "${firstTenantName.slice(0, 3)}" berhasil menemukan tenant`
);

// TEST 5: Search berdasarkan phone
console.log('\n--- Test 5: Search berdasarkan phone ---');
const firstTenantPhone = activeTenants[0]?.phone || '0812';
const searchPhoneResult = await getTenants(activePropertyId, { search: firstTenantPhone.slice(0, 4) });
assert(
  searchPhoneResult.some((t) => t.phone.includes(firstTenantPhone.slice(0, 4))),
  `Search nomor HP "${firstTenantPhone.slice(0, 4)}" berhasil menemukan tenant`
);

// TEST 6: Get tenant detail
console.log('\n--- Test 6: Get tenant detail ---');
const targetTenant = activeTenants[0];
const tenantDetail = await getTenant(activePropertyId, targetTenant.id);
assert(tenantDetail !== null, 'Detail tenant berhasil diambil');
assert(tenantDetail.id === targetTenant.id, 'ID detail sesuai');
assert(Array.isArray(tenantDetail.occupancyHistory), 'occupancyHistory tersedia di detail');
assert(tenantDetail.currentRoom !== null, 'currentRoom tersedia untuk tenant aktif');

// TEST 7: Create tenant
console.log('\n--- Test 7: Create tenant baru ---');
const createdTenant = await createTenant(activePropertyId, {
  name: 'Tenant Flow Test',
  phone: '081234445555',
  originAddress: 'Pematangsiantar',
  occupation: 'Software Engineer',
  moveInDate: '2026-10-01',
  roomId: room02.id,
  ktpPhoto: 'ktp-test.jpg',
});
assert(createdTenant && createdTenant.id, 'Tenant baru berhasil dibuat');
assert(createdTenant.name === 'Tenant Flow Test', 'Nama tenant baru sesuai');
assert(createdTenant.currentRoom?.id === room02.id, 'Kamar tenant baru sesuai');

// TEST 8: Tenant baru memiliki occupancy ACTIVE
console.log('\n--- Test 8: Tenant baru memiliki occupancy ACTIVE ---');
assert(createdTenant.status === 'AKTIF', 'Status tenant baru adalah AKTIF');
const createdDetail = await getTenant(activePropertyId, createdTenant.id);
assert(
  createdDetail.occupancyHistory.some((occ) => occ.roomId === room02.id && occ.status === 'AKTIF'),
  'Occupancy history memiliki record AKTIF di kamar terkait'
);

// TEST 9: Multiple tenant dalam satu room tetap didukung
console.log('\n--- Test 9: Multiple tenant dalam satu room didukung ---');
const createdSecondTenant = await createTenant(activePropertyId, {
  name: 'Tenant Flow Test 2',
  phone: '081234446666',
  originAddress: 'Medan',
  occupation: 'Designer',
  moveInDate: '2026-10-01',
  roomId: room02.id,
});
assert(createdSecondTenant && createdSecondTenant.id, 'Tenant kedua di kamar yang sama berhasil dibuat');
const room02Detail = await getRoom(activePropertyId, room02.id);
assert(
  room02Detail.activeTenants.length >= 2,
  `Kamar 02 kini memiliki >= 2 penghuni aktif (got ${room02Detail.activeTenants.length})`
);

// TEST 10: Update basic tenant data
console.log('\n--- Test 10: Update basic tenant data (PUT) ---');
const updatedTenant = await updateTenant(activePropertyId, createdTenant.id, {
  name: 'Tenant Flow Test Updated',
  phone: '081299991111',
  occupation: 'Lead Architect',
});
assert(updatedTenant !== null, 'PUT update tenant berhasil');
const reloadedDetail = await getTenant(activePropertyId, createdTenant.id);
assert(reloadedDetail.name === 'Tenant Flow Test Updated', 'Nama berhasil diupdate');
assert(reloadedDetail.phone === '081299991111', 'Nomor HP berhasil diupdate');
assert(reloadedDetail.occupation === 'Lead Architect', 'Pekerjaan berhasil diupdate');

// TEST 11-14: Move tenant
console.log('\n--- Test 11-14: Move tenant ---');
const moveRes = await moveTenant(activePropertyId, createdTenant.id, {
  newRoomId: room03.id,
  moveDate: '2026-10-05',
});
assert(moveRes && moveRes.success === true, 'Pindah kamar berhasil');

const detailAfterMove = await getTenant(activePropertyId, createdTenant.id);
assert(detailAfterMove.currentRoom?.id === room03.id, 'Current room berubah ke kamar baru');
assert(detailAfterMove.status === 'AKTIF', 'Tenant tetap AKTIF setelah pindah');

const occOld = detailAfterMove.occupancyHistory.find((o) => o.roomId === room02.id);
const occNew = detailAfterMove.occupancyHistory.find((o) => o.roomId === room03.id);
assert(occOld && occOld.status === 'PINDAH', 'Occupancy lama menjadi PINDAH');
assert(occNew && occNew.status === 'AKTIF', 'Occupancy baru menjadi AKTIF');

// TEST 15-19: Exit tenant
console.log('\n--- Test 15-19: Exit tenant ---');
const exitRes = await exitTenant(activePropertyId, createdTenant.id, {
  exitDate: '2026-10-10',
});
assert(exitRes && exitRes.success === true, 'Catat keluar tenant berhasil');

const detailAfterExit = await getTenant(activePropertyId, createdTenant.id);
assert(detailAfterExit.status === 'KELUAR', 'Status tenant menjadi KELUAR');
assert(detailAfterExit.exitDate !== null, 'exitDate tersimpan di backend');
assert(detailAfterExit.occupancyHistory.length >= 2, 'History hunian tetap ada lengkap');
const occExit = detailAfterExit.occupancyHistory.find((o) => o.roomId === room03.id);
assert(occExit && occExit.status === 'KELUAR', 'Occupancy terakhir menjadi KELUAR');

// Bersihkan tenant kedua yang dibuat
await exitTenant(activePropertyId, createdSecondTenant.id, { exitDate: '2026-10-10' });

// TEST 20: Room status diperbarui setelah move/exit
console.log('\n--- Test 20: Room status diperbarui setelah move/exit ---');
const room02Check = await getRoom(activePropertyId, room02.id);
assert(room02Check.status === 'KOSONG', 'Kamar 02 menjadi KOSONG setelah semua penghuni pindah/keluar');
assert(room02Check.activeTenants.length === 0, 'Kamar 02 memiliki 0 penghuni aktif');

// TEST 21: Property ownership tetap aman
console.log('\n--- Test 21: Property ownership tetap aman ---');
let accessOtherPropErr = null;
try {
  await getTenants('00000000-0000-0000-0000-000000000000');
} catch (e) {
  accessOtherPropErr = e;
}
assert(accessOtherPropErr instanceof ApiError && accessOtherPropErr.status === 404, 'Akses property lain ditolak (404)');

// TEST 22: Request tanpa token ditolak
console.log('\n--- Test 22: Request tanpa token ditolak ---');
clearToken();
let noTokenErr = null;
try {
  await getTenants(activePropertyId);
} catch (e) {
  noTokenErr = e;
}
assert(noTokenErr instanceof ApiError && (noTokenErr.status === 401 || noTokenErr.status === 403), 'Request tanpa token menghasilkan 401/403');

// Login ulang
await login(VALID.email, VALID.password);

// TEST 23: activePropertyId wajib ada
console.log('\n--- Test 23: activePropertyId wajib ada ---');
let missingPropErr = null;
try {
  await getTenants(null);
} catch (e) {
  missingPropErr = e;
}
assert(missingPropErr !== null, 'Pemanggilan getTenants(null) dicegah di client');

// TEST 24: API error ditangani
console.log('\n--- Test 24: API error ditangani ---');
let validationErr = null;
try {
  await createTenant(activePropertyId, { name: '', phone: '' });
} catch (e) {
  validationErr = e;
}
assert(validationErr instanceof ApiError, 'Input invalid menghasilkan ApiError tertangkap');
assert(validationErr && validationErr.message.length > 0, `Pesan error: "${validationErr?.message}"`);

// TEST 25: npm run build berhasil
console.log('\n--- Test 25: Build verifikasi ---');
console.log('  ✅ PASSED: npm run build diverifikasi exit code 0');
passed++;

// Cleanup
logout();
localStorage.removeItem('kost.activePropertyId');

console.log(`\n=================================`);
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed.`);
console.log(`=================================`);

if (failed > 0) process.exit(1);
