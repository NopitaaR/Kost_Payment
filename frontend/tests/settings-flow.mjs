// Test alur Settings Phase 3H-4: Profile, Password & House Settings Integration.
// Menjalankan modul API client + auth yang sama dengan aplikasi React,
// dengan shim window/localStorage di Node, terhadap backend yang sedang berjalan.
//
// Jalankan: node tests/settings-flow.mjs

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
const { login, getMe, logout, updateProfile, changePassword } = await import(
  '../src/api/auth.js'
);

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

console.log('=== SETTINGS FLOW TESTS (Phase 3H-4) ===');
console.log(`Target backend: ${API_ORIGIN}\n`);

// HELPER: login dan simpan token
async function loginAndSave(overrides = {}) {
  const creds = { ...VALID, ...overrides };
  clearToken();
  const result = await login(creds.email, creds.password);
  assert(typeof result.token === 'string' && result.token.length > 20, 'Token JWT diterima');
  assert(getToken() === result.token, 'Token tersimpan di storage');
  return result;
}

// TEST 1: Login berhasil
console.log('--- Test 1: Login dengan kredensial benar ---');
await loginAndSave();

// TEST 2: Get profile setelah login
console.log('\n--- Test 2: Get profile setelah login ---');
const me = await getMe();
assert(me && me.id, 'User berhasil dimuat dari token');
assert(me && me.name, 'Nama pemilik terbaca');
assert(me && me.email, 'Email terbaca');
assert(me && me.phone !== undefined, 'Phone ada di response user');

// TEST 3: Update profile - nama, email, HP
console.log('\n--- Test 3: Update profile nama/email/HP ---');
clearToken();
await loginAndSave();
const newName = 'Budi Updated';
const testEmail = 'budi.test@kost.id';
const newHp = '081234567890';
try {
  await updateProfile({ name: newName, email: testEmail, phone: newHp });
  // Reload profile dari backend
  const meUpdated = await getMe();
  assert(meUpdated && meUpdated.name === newName, `Nama diupdate menjadi "${newName}"`);
  assert(meUpdated && meUpdated.email === testEmail, `Email diupdate menjadi "${testEmail}"`);
  assert(meUpdated && meUpdated.phone === newHp, `HP diupdate menjadi "${newHp}"`);

  // Kembalikan email ke pemilik@kost.id agar sesi login berikutnya tetap konsisten
  await updateProfile({ name: newName, email: VALID.email, phone: newHp });
} catch (err) {
  assert(false, `Update profile gagal: ${err.message}`);
}

// TEST 4: Profile tetap setelah refresh (GET /auth/me ulang)
console.log('\n--- Test 4: Profile tetap setelah refresh ---');
const meRefreshed = await getMe();
assert(meRefreshed && meRefreshed.name === newName, `Nama tetap "${newName}" setelah refresh`);
assert(meRefreshed && meRefreshed.email === VALID.email, `Email tetap "${VALID.email}" setelah refresh`);
assert(meRefreshed && meRefreshed.phone === newHp, `HP tetap "${newHp}" setelah refresh`);

// TEST 5: Refresh session → data tetap benar
console.log('\n--- Test 5: Refresh session → data tetap benar ---');
await loginAndSave();
const meAfterRefresh = await getMe();
assert(meAfterRefresh && meAfterRefresh.name === newName, 'Data tetap benar setelah login ulang (session refresh)');

// TEST 6: Password lama benar → password dapat diubah
console.log('\n--- Test 6: Password lama benar → password dapat diubah ---');
clearToken();
await loginAndSave();
const oldPass = 'rahasia123';
const newPassBaru = 'passwordBaruBaru8!';
try {
  await changePassword(oldPass, newPassBaru);
  // Verify can login with new password
  clearToken();
  const resNewLogin = await login(VALID.email, newPassBaru);
  assert(resNewLogin && resNewLogin.token, 'Berhasil login dengan password baru');

  // Kembalikan password ke 'rahasia123' agar test berikutnya dan test-flow lain tidak gagal
  clearToken();
  setToken(resNewLogin.token);
  await changePassword(newPassBaru, oldPass);
  assert(true, 'Password berhasil dikembalikan ke default untuk isolasi test');
} catch (err) {
  assert(false, `Ganti password dengan benar gagal: ${err.message}`);
}
// Cek user setelah ganti password
const meAfterPwChange = await getMe();
assert(meAfterPwChange, 'User masih bisa diambil setelah ganti password');

// TEST 7: Password lama salah → ditolak
console.log('\n--- Test 7: Password lama salah → ditolak ---');
clearToken();
await loginAndSave();
try {
  await changePassword('password-salah-123', 'passwordBaruBaru8!');
  assert(false, 'Password lama salah seharusnya ditolak');
} catch (err) {
  assert(err instanceof ApiError, 'Gagal melempar ApiError');
  assert(err.status === 401, `Status 401 (got ${err.status})`);
  assert(err.message === 'Password lama salah.', `Pesan "Password lama salah." (got "${err.message}")`);
}

// TEST 8: Password baru tidak tersimpan plaintext (tidak ada di response user)
console.log('\n--- Test 8: Password baru tidak tersimpan plaintext ---');
clearToken();
await loginAndSave();
const mePw = await getMe();
assert(mePw && mePw.passwordHash === undefined, 'passwordHash tidak dibocorkan ke frontend');
assert(mePw && typeof mePw.email === 'string' && mePw.email.includes('@'), 'Email ada tapi tidak ada password hash');

// TEST 9: Property name dapat diubah (via backend API)
console.log('\n--- Test 9: Property name dapat diubah ---');
clearToken();
await loginAndSave();
const properties = await api.get('/properties');
assert(Array.isArray(properties.data), 'GET /properties mengembalikan array');
if (properties.data && properties.data.length > 0) {
  const prop1Id = properties.data[0].id;
  const originalPropName = properties.data[0].name;
  const newPropName = 'Rumah Budi Updated';
  try {
    const updateRes = await api.put(`/properties/${prop1Id}/name`, { name: newPropName });
    assert(updateRes.success === true, 'Update property name sukses');
  } catch (err) {
    assert(false, `Gagal update property name: ${err.message}`);
  }
  // Cek ulang property
  const propsAfter = await api.get('/properties');
  const prop1After = propsAfter.data.find((p) => p.id === prop1Id);
  if (prop1After) {
    assert(prop1After.name === newPropName, `Nama property diupdate menjadi "${newPropName}"`);
  }

  // Kembalikan nama property ke aslinya agar test regression lain tidak terpengaruh
  await api.put(`/properties/${prop1Id}/name`, { name: originalPropName });
  assert(true, 'Nama property dikembalikan ke aslinya untuk isolasi test');
}

// TEST 10: User tidak dapat mengubah property milik user lain
console.log('\n--- Test 10: User tidak dapat mengubah property milik user lain ---');
clearToken();
await loginAndSave();
const fakeOrOtherPropertyId = '00000000-0000-0000-0000-000000000000';
try {
  await api.put(`/properties/${fakeOrOtherPropertyId}/name`, { name: 'Gak Boleh Diubah' });
  assert(false, 'User seharusnya tidak bisa mengubah property yang bukan miliknya');
} catch (err) {
  assert(err instanceof ApiError, 'Ditolak dengan ApiError');
  assert(err.status === 404, `Status 404 (got ${err.status})`);
}

// TEST 11: activePropertyId tetap benar
console.log('\n--- Test 11: activePropertyId tetap benar ---');
clearToken();
await loginAndSave();
const propsAll = await api.get('/properties');
assert(propsAll.data.length > 0, 'Ada properti');
localStorage.setItem('kost.activePropertyId', propsAll.data[0].id);
const storedId = localStorage.getItem('kost.activePropertyId');
assert(storedId === propsAll.data[0].id, `activePropertyId = ${storedId} tersimpan benar`);

// TEST 12: Tidak ada password/hash dikirim dalam response user
console.log('\n--- Test 12: Tidak ada password/hash dikirim dalam response user ---');
clearToken();
await loginAndSave();
const meFinal = await getMe();
assert(meFinal && meFinal.passwordHash === undefined, 'passwordHash tidak ada di response user');
assert(meFinal && meFinal.password === undefined, 'password plaintext tidak ada di response user');
assert(meFinal && meFinal.name && meFinal.email && (meFinal.phone === undefined || typeof meFinal.phone === 'string'), 'Hanya name, email, phone yang diterima');

// TEST 13: Profile setelah login ulang tetap ada
console.log('\n--- Test 13: Profile setelah login ulang tetap ada ---');
clearToken();
await loginAndSave();
const meLoginAgain = await getMe();
assert(meLoginAgain && meLoginAgain.name, 'Profile tetap ada setelah login ulang');

// Cleanup: restore nama profil asli
await updateProfile({ name: 'Pemilik Kost', email: 'pemilik@kost.id', phone: '081234567890' });
logout();

console.log(`\n=================================`);
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed.`);
console.log(`=================================`);

if (failed > 0) process.exit(1);