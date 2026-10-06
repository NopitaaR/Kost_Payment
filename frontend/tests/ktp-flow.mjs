// Test alur KTP Upload & Security (Phase 3H-5).
// Menjalankan modul API client + tenants service terhadap backend yang sedang berjalan.
//
// Jalankan: node tests/ktp-flow.mjs

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
const { login } = await import('../src/api/auth.js');
const { getProperties } = await import('../src/api/properties.js');
const { getRooms } = await import('../src/api/rooms.js');
const {
  getTenant,
  createTenant,
  updateTenant,
  exitTenant,
  uploadKtp,
  uploadTenantKtp,
  getTenantKtpBlob,
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

function makeDummyJpg() {
  const bytes = new Uint8Array([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
    0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9
  ]);
  return new File([bytes], 'sample-ktp.jpg', { type: 'image/jpeg' });
}

function makeDummyPng() {
  const bytes = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82
  ]);
  return new File([bytes], 'sample-ktp2.png', { type: 'image/png' });
}

console.log('=== TEST SUITE: KTP FLOW (PHASE 3H-5) ===\n');

// 1. Login
console.log('[1/7] Login & Inisialisasi');
await login('pemilik@kost.id', 'rahasia123');
assert(Boolean(getToken()), 'Login berhasil dan token tersimpan');

const props = await getProperties();
assert(Array.isArray(props) && props.length > 0, 'Mendapatkan daftar properti');
const propertyId = props[0].id;

const rooms = await getRooms(propertyId);
assert(Array.isArray(rooms) && rooms.length > 0, 'Mendapatkan daftar kamar');
const roomId = rooms[0].id;

// 2. Upload KTP Draft
console.log('\n[2/7] Upload KTP Draft (Multipart FormData)');
const draftFile = makeDummyJpg();
const uploadDraftRes = await uploadKtp(propertyId, draftFile);
assert(uploadDraftRes && uploadDraftRes.filename, `Upload KTP draft berhasil (${uploadDraftRes?.filename})`);
const draftFilename = uploadDraftRes.filename;

// 3. Simpan Tenant dengan KTP
console.log('\n[3/7] Simpan Penghuni dengan Foto KTP');
const tenantName = `Tenant KTP ${Date.now()}`;
const newTenant = await createTenant(propertyId, {
  name: tenantName,
  phone: '081299887766',
  originAddress: 'Surabaya',
  occupation: 'Akuntan',
  moveInDate: '2026-03-01',
  roomId,
  ktpPhoto: draftFilename,
});
assert(newTenant && newTenant.id, 'Tenant berhasil dibuat');
assert(newTenant.ktpPhoto === draftFilename, 'ktpPhoto tenant sesuai dengan file yang diunggah');

// 4. Ambil KTP Blob Terautentikasi
console.log('\n[4/7] Ambil Foto KTP Blob Terproteksi');
const blob = await getTenantKtpBlob(propertyId, newTenant.id);
assert(blob && blob.size > 0, `Blob KTP berhasil diambil (ukuran: ${blob.size} bytes)`);

// 5. Upload Ulang KTP (Ganti KTP Tenant)
console.log('\n[5/7] Unggah Ulang / Ganti KTP Tenant');
const replacementFile = makeDummyPng();
const updateKtpRes = await uploadTenantKtp(propertyId, newTenant.id, replacementFile);
assert(updateKtpRes && updateKtpRes.filename, `KTP berhasil diperbarui (${updateKtpRes?.filename})`);
assert(updateKtpRes.filename !== draftFilename, 'Nama berkas KTP baru berbeda dari berkas lama');

const tenantAfterReplace = await getTenant(propertyId, newTenant.id);
assert(tenantAfterReplace.ktpPhoto === updateKtpRes.filename, 'Detail tenant merefleksikan file KTP yang baru');

// 6. Edit data tenant tanpa mengubah KTP
console.log('\n[6/7] Edit Data Tenant (KTP Lama Harus Tetap Ada)');
const updatedTenant = await updateTenant(propertyId, newTenant.id, {
  name: `${tenantName} (Updated)`,
  phone: '081299887766',
  originAddress: 'Surabaya Timur',
  occupation: 'Senior Akuntan',
});
assert(updatedTenant.name.includes('(Updated)'), 'Nama tenant berhasil diupdate');
assert(updatedTenant.ktpPhoto === updateKtpRes.filename, 'KTP lama tetap aman dan tidak terhapus saat edit data');

// 7. Validasi Error Format & Ukuran
console.log('\n[7/7] Validasi Format & Ukuran KTP');
let invalidFormatRejected = false;
try {
  const invalidFile = new File(['text'], 'document.txt', { type: 'text/plain' });
  await uploadKtp(propertyId, invalidFile);
} catch (e) {
  invalidFormatRejected = true;
}
assert(invalidFormatRejected, 'Upload file dengan format non-gambar ditolak');

let oversizeRejected = false;
try {
  const hugeBytes = new Uint8Array(6 * 1024 * 1024);
  const hugeFile = new File([hugeBytes], 'huge.jpg', { type: 'image/jpeg' });
  await uploadKtp(propertyId, hugeFile);
} catch (e) {
  oversizeRejected = true;
}
assert(oversizeRejected, 'Upload file melebihi batas 5MB ditolak');

// Cleanup: exit test tenant
await exitTenant(propertyId, newTenant.id, { exitDate: '2026-03-02' });

console.log(`\n=== HASIL TEST KTP FLOW: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) process.exit(1);
