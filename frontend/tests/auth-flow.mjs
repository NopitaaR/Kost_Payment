// Test alur autentikasi frontend (Phase 3A).
// Menjalankan modul API client + auth yang sama dengan aplikasi React,
// dengan shim window/localStorage di Node, terhadap backend yang sedang berjalan.
//
// Jalankan: node tests/auth-flow.mjs

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

const { getToken, setToken, clearToken, api, ApiError, setOnSessionExpired } = await import(
  '../src/api/client.js'
);
const { login, getMe, logout } = await import('../src/api/auth.js');

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

console.log('=== FRONTEND AUTH FLOW TESTS (Phase 3A) ===');
console.log(`Target backend: ${API_ORIGIN}\n`);

// TEST 1: login benar
console.log('--- Test 1: Login dengan kredensial benar ---');
clearToken();
const loginResult = await login(VALID.email, VALID.password);
assert(typeof loginResult.token === 'string' && loginResult.token.length > 20, 'Token JWT diterima');
assert(getToken() === loginResult.token, 'Token tersimpan di storage (kost.token)');
assert(loginResult.user && loginResult.user.email === VALID.email, 'Data user diterima dari API');
assert(loginResult.user && loginResult.user.passwordHash === undefined, 'passwordHash tidak dibocorkan ke client');

// TEST 2: password salah
console.log('\n--- Test 2: Login dengan password salah ---');
const existingToken = getToken();
let err2 = null;
try {
  await login(VALID.email, 'password-salah');
} catch (e) {
  err2 = e;
}
assert(err2 instanceof ApiError, 'Login gagal melempar ApiError');
assert(err2 && err2.status === 401, `Status 401 (got ${err2 && err2.status})`);
assert(err2 && err2.message === 'Email atau password salah.', `Pesan error dari backend (got "${err2 && err2.message}")`);
assert(getToken() === existingToken, 'Gagal login tidak menghapus sesi lama (requireAuth: false)');

// TEST 3: email tidak terdaftar
console.log('\n--- Test 3: Login dengan email tidak terdaftar ---');
let err3 = null;
try {
  await login('tidak-ada@kost.id', 'apapun');
} catch (e) {
  err3 = e;
}
assert(err3 && err3.status === 401, `Status 401 (got ${err3 && err3.status})`);

// TEST 4: field kosong ditolak backend
console.log('\n--- Test 4: Login tanpa mengisi field ---');
let err4 = null;
try {
  await login('', '');
} catch (e) {
  err4 = e;
}
assert(err4 && err4.status === 400, `Status 400 (got ${err4 && err4.status})`);
assert(err4 && /wajib diisi/i.test(err4.message), `Pesan validasi backend (got "${err4 && err4.message}")`);

// TEST 5: persistence — token tersimpan dipakai GET /auth/me (simulasi refresh browser)
console.log('\n--- Test 5: GET /auth/me memakai token tersimpan (refresh browser) ---');
const me = await getMe();
assert(me && me.id === loginResult.user.id, 'User berhasil dimuat ulang dari token tersimpan');
assert(me && me.name === 'Pemilik Kost', 'Nama pemilik terbaca');

// TEST 6: Bearer header benar-benar dikirim
console.log('\n--- Test 6: Authorization Bearer terkirim ---');
let err6 = null;
try {
  await api.get('/auth/me', { requireAuth: true });
} catch (e) {
  err6 = e;
}
assert(err6 === null, 'Request dengan token tersimpan berhasil tanpa error');

const beforeRemove = getToken();
setToken('token-palsu');
let err6b = null;
try {
  await api.get('/auth/me');
} catch (e) {
  err6b = e;
}
assert(err6b && (err6b.status === 403 || err6b.status === 401), `Token palsu ditolak (${err6b && err6b.status})`);
setToken(beforeRemove);

// TEST 7: akses protected route tanpa token
console.log('\n--- Test 7: Akses endpoint tanpa token ---');
clearToken();
let err7 = null;
try {
  await api.get('/properties');
} catch (e) {
  err7 = e;
}
assert(err7 && err7.status === 401, `Status 401 tanpa token (got ${err7 && err7.status})`);
assert(err7 && /token otentikasi tidak ditemukan/i.test(err7.message), `Pesan 401 backend (got "${err7 && err7.message}")`);

// TEST 8: token invalid memicu pembersihan sesi + callback
console.log('\n--- Test 8: Token invalid → sesi dibersihkan otomatis ---');
let sessionExpiredFired = false;
setOnSessionExpired(() => {
  sessionExpiredFired = true;
});
setToken('jwt.yang.tidak-valid');
let err8 = null;
try {
  await api.get('/properties');
} catch (e) {
  err8 = e;
}
assert(err8 && err8.status === 403, `Status 403 token invalid (got ${err8 && err8.status})`);
assert(sessionExpiredFired === true, 'Callback onSessionExpired dipanggil (AppContext → setUser(null))');
assert(getToken() === null, 'Token invalid otomatis dihapus dari storage');
setOnSessionExpired(null);

// TEST 9: logout
console.log('\n--- Test 9: Logout ---');
await login(VALID.email, VALID.password);
assert(getToken() !== null, 'Login ulang sebelum logout: token ada');
logout();
assert(getToken() === null, 'Logout menghapus token');
let err9 = null;
try {
  await api.get('/auth/me');
} catch (e) {
  err9 = e;
}
assert(err9 && err9.status === 401, 'Setelah logout, endpoint protected ditolak (401)');

// TEST 10: data pemilik hanya milik user yang login
console.log('\n--- Test 10: Data yang dimuat hanya milik user yang login ---');
await login(VALID.email, VALID.password);
const houseList = await api.get('/properties');
assert(Array.isArray(houseList.data), 'GET /properties mengembalikan array data');
assert(houseList.data.length === 3, `Pemilik melihat 3 rumahnya (got ${houseList.data.length})`);
assert(houseList.data.every((h) => h.id && h.name), 'Setiap rumah punya id dan name (bekal propertyId Phase 3B)');

// TEST 11: token palsu pada endpoint protected → ditolak & sesi dibersihkan
console.log('\n--- Test 11: Token palsu pada endpoint protected ---');
setToken('token-palsu-lagi');
let err11 = null;
try {
  await api.get('/properties');
} catch (e) {
  err11 = e;
}
assert(err11 && err11.status === 403, `Akses dengan token palsu ditolak (got ${err11 && err11.status})`);
assert(getToken() === null, 'Token palsu dihapus otomatis dari storage');

// TEST 12: network failure menghasilkan pesan Bahasa Indonesia
console.log('\n--- Test 12: Penanganan kegagalan jaringan ---');
const savedOrigin = globalThis.window.location.origin;
globalThis.window.location = { origin: 'http://127.0.0.1:59999' };
let err12 = null;
try {
  await api.get('/properties');
} catch (e) {
  err12 = e;
}
assert(err12 instanceof ApiError && err12.status === 0, `Network error → ApiError status 0 (got ${err12 && err12.status})`);
assert(err12 && /tidak dapat terhubung ke server/i.test(err12.message), `Pesan jaringan (got "${err12 && err12.message}")`);
globalThis.window.location = { origin: savedOrigin };
clearToken();

console.log(`\n=================================`);
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed.`);
console.log(`=================================`);

if (failed > 0) process.exit(1);
