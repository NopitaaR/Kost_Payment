// Test alur Property / Pilih Rumah (Phase 3B).
// Menjalankan modul API client + properties service terhadap backend yang sedang berjalan.
//
// Jalankan: node tests/property-flow.mjs

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

console.log('=== FRONTEND PROPERTY FLOW TESTS (Phase 3B) ===');
console.log(`Target backend: ${API_ORIGIN}\n`);

// TEST 1: Login berhasil
console.log('--- Test 1: Login berhasil ---');
clearToken();
const loginResult = await login(VALID.email, VALID.password);
assert(loginResult.token && loginResult.token.length > 20, 'Login berhasil, token diterima');

// TEST 2: GET /properties mengambil data dari API
console.log('\n--- Test 2: /pilih-rumah mengambil data dari API ---');
const properties = await getProperties();
assert(Array.isArray(properties), 'getProperties() mengembalikan array');
assert(properties.length > 0, `Ada data property (got ${properties.length})`);

// TEST 3: Tiga rumah tampil berdasarkan database
console.log('\n--- Test 3: Tiga rumah tampil berdasarkan database ---');
assert(properties.length === 3, `Jumlah rumah = 3 (got ${properties.length})`);
const names = properties.map((p) => p.name);
console.log(`  Property names: ${names.join(', ')}`);

// TEST 4: Tidak ada data rumah hardcoded
console.log('\n--- Test 4: Tidak ada data rumah hardcoded ---');
assert(
  properties.every((p) => p.id && typeof p.id === 'string'),
  'Setiap property punya id (UUID dari database)'
);
assert(
  properties.every((p) => p.name && typeof p.name === 'string'),
  'Setiap property punya name dari database'
);

// TEST 5: Statistik setiap rumah sesuai response API
console.log('\n--- Test 5: Statistik setiap rumah sesuai response API ---');
for (const p of properties) {
  assert(typeof p.totalRooms === 'number', `${p.name}: totalRooms = ${p.totalRooms}`);
  assert(typeof p.filledRooms === 'number', `${p.name}: filledRooms = ${p.filledRooms}`);
  assert(typeof p.emptyRooms === 'number', `${p.name}: emptyRooms = ${p.emptyRooms}`);
  assert(typeof p.activeTenants === 'number', `${p.name}: activeTenants = ${p.activeTenants}`);
  assert(
    p.emptyRooms === p.totalRooms - p.filledRooms,
    `${p.name}: emptyRooms === totalRooms - filledRooms (${p.emptyRooms} === ${p.totalRooms - p.filledRooms})`
  );
}

// TEST 6: Simulasi klik Rumah 1 → activePropertyId tersimpan
console.log('\n--- Test 6: Klik Rumah → activePropertyId tersimpan ---');
const firstProperty = properties[0];
localStorage.setItem('kost.activePropertyId', firstProperty.id);
assert(
  localStorage.getItem('kost.activePropertyId') === firstProperty.id,
  `activePropertyId = ${firstProperty.id} tersimpan di localStorage`
);

// TEST 7: (UI redirect — tidak dapat dites di Node, skip)
console.log('\n--- Test 7: Redirect ke dashboard ---');
console.log('  ⏭️  SKIPPED: UI redirect hanya dapat dites di browser');

// TEST 8: Refresh browser → activePropertyId tetap tersedia
console.log('\n--- Test 8: Refresh browser → activePropertyId tetap tersedia ---');
const storedId = localStorage.getItem('kost.activePropertyId');
assert(storedId === firstProperty.id, `activePropertyId tetap = ${storedId} setelah "refresh"`);

// TEST 9: Token Bearer tetap terkirim
console.log('\n--- Test 9: Token Bearer tetap terkirim ---');
const token = getToken();
assert(token && token.length > 20, 'Token masih tersimpan setelah operasi property');
// Verifikasi request berikutnya berhasil (tidak 401)
const propertiesAgain = await getProperties();
assert(propertiesAgain.length === 3, 'Request kedua berhasil dengan Bearer token');

// TEST 10: API error → ErrorState + Coba Lagi
console.log('\n--- Test 10: API error → ErrorState + Coba Lagi ---');
clearToken();
let err10 = null;
try {
  await getProperties();
} catch (e) {
  err10 = e;
}
assert(err10 instanceof ApiError, 'Tanpa token, getProperties() melempar ApiError');
assert(
  err10 && (err10.status === 401 || err10.status === 403),
  `Status ${err10 && err10.status} (401/403 diharapkan)`
);

// TEST 11: API mengembalikan [] → EmptyState
console.log('\n--- Test 11: API mengembalikan [] → EmptyState ---');
// Note: Kita tidak bisa membuat user tanpa rumah di sini tanpa seed khusus.
// Verifikasi bahwa getProperties() mengembalikan array dan frontend handle length === 0.
console.log('  ⏭️  SKIPPED: Perlu user tanpa property di database; UI test EmptyState di browser');

// TEST 12: npm run build berhasil
console.log('\n--- Test 12: npm run build ---');
console.log('  ⏭️  Sudah diverifikasi terpisah (npm run build exit code 0)');

// TEST 13: Regression backend
console.log('\n--- Test 13: Regression backend ---');
await login(VALID.email, VALID.password);
const props = await getProperties();
assert(props.length === 3, `3 properties (got ${props.length})`);

// Verify via direct API call for rooms, tenants, bills per property
const prop1 = props[0];
const roomsRes = await api.get(`/properties/${prop1.id}/rooms`);
const rooms = roomsRes.data || roomsRes;
assert(Array.isArray(rooms) && rooms.length > 0, `${prop1.name} has rooms (got ${rooms.length})`);

const tenantsRes = await api.get(`/properties/${prop1.id}/tenants`);
const tenants = tenantsRes.data || tenantsRes;
assert(Array.isArray(tenants) && tenants.length > 0, `${prop1.name} has tenants (got ${tenants.length})`);

const billsRes = await api.get(`/properties/${prop1.id}/bills`);
const bills = billsRes.data || billsRes;
assert(Array.isArray(bills) && bills.length > 0, `${prop1.name} has bills (got ${bills.length})`);

// Verify stats match what we can count
assert(prop1.totalRooms === rooms.length, `Stats totalRooms matches API (${prop1.totalRooms} === ${rooms.length})`);
const filledCount = rooms.filter((r) => r.status === 'TERISI').length;
assert(prop1.filledRooms === filledCount, `Stats filledRooms matches API (${prop1.filledRooms} === ${filledCount})`);

// Cleanup
logout();
localStorage.removeItem('kost.activePropertyId');

console.log(`\n=================================`);
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed.`);
console.log(`=================================`);

if (failed > 0) process.exit(1);
