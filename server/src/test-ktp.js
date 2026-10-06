import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../uploads/ktp');

const BASE_URL = 'http://localhost:5000/api/v1';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  return { status: response.status, data, headers: response.headers };
}

// 1x1 1-byte PNG buffer
function createSmallPng() {
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ]);
}

// Small valid JPEG
function createSmallJpg() {
  return Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
    0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
    0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
    0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
    0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
    0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
    0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4,
    0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF,
    0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
    0x00, 0x7F, 0x00, 0xFF, 0xD9
  ]);
}

async function run() {
  console.log('=== RUNNING BACKEND KTP UPLOAD TEST ===');

  // 1. Login user
  const loginRes = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'pemilik@kost.id', password: 'rahasia123' }),
  });
  assert.strictEqual(loginRes.status, 200, 'Login failed');
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Get properties
  const propRes = await request('/properties', { headers: authHeaders });
  assert.strictEqual(propRes.status, 200);
  assert(propRes.data.data.length > 0, 'No properties found');
  const propertyId = propRes.data.data[0].id;

  // 3. Test: Upload tanpa token -> 401
  const formDataNoAuth = new FormData();
  formDataNoAuth.append('ktp', new Blob([createSmallJpg()], { type: 'image/jpeg' }), 'test.jpg');
  const noAuthRes = await request(`/properties/${propertyId}/tenants/upload-ktp`, {
    method: 'POST',
    body: formDataNoAuth,
  });
  assert.strictEqual(noAuthRes.status, 401, 'Upload without token must return 401');
  console.log('✓ 1. Upload tanpa token ditolak (401)');

  // 4. Test: Upload format invalid (.txt) -> 400
  const formDataInvalid = new FormData();
  formDataInvalid.append('ktp', new Blob(['hello world text'], { type: 'text/plain' }), 'test.txt');
  const invalidRes = await request(`/properties/${propertyId}/tenants/upload-ktp`, {
    method: 'POST',
    headers: authHeaders,
    body: formDataInvalid,
  });
  assert.strictEqual(invalidRes.status, 400, 'Invalid format must return 400');
  console.log('✓ 2. Upload file format invalid (.txt) ditolak (400)');

  // 5. Test: Upload file terlalu besar (> 5MB) -> 400
  const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
  const formDataBig = new FormData();
  formDataBig.append('ktp', new Blob([bigBuffer], { type: 'image/jpeg' }), 'big.jpg');
  const bigRes = await request(`/properties/${propertyId}/tenants/upload-ktp`, {
    method: 'POST',
    headers: authHeaders,
    body: formDataBig,
  });
  assert.strictEqual(bigRes.status, 400, 'Oversized file must return 400');
  console.log('✓ 3. Upload file > 5MB ditolak (400)');

  // 6. Test: Upload JPG valid via /upload-ktp
  const formDataJpg = new FormData();
  formDataJpg.append('ktp', new Blob([createSmallJpg()], { type: 'image/jpeg' }), 'ktp-sample.jpg');
  const uploadJpgRes = await request(`/properties/${propertyId}/tenants/upload-ktp`, {
    method: 'POST',
    headers: authHeaders,
    body: formDataJpg,
  });
  assert.strictEqual(uploadJpgRes.status, 200, 'Valid JPG upload should succeed');
  assert(uploadJpgRes.data.data.filename, 'Must return uploaded filename');
  const draftFilename = uploadJpgRes.data.data.filename;
  console.log('✓ 4. Upload JPG valid berhasil:', draftFilename);

  // Verifikasi file ada di server disk
  const draftDiskPath = path.resolve(UPLOAD_DIR, draftFilename);
  assert(fs.existsSync(draftDiskPath), 'Draft KTP file must exist in uploads directory');

  // 7. Buat tenant baru dengan KTP tersebut
  const roomsRes = await request(`/properties/${propertyId}/rooms`, { headers: authHeaders });
  const room = roomsRes.data.data[0];

  const tenantName = `Penghuni KTP Test ${Date.now()}`;
  const createTenantRes = await request(`/properties/${propertyId}/tenants`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: tenantName,
      phone: '081234567890',
      originAddress: 'Bandung',
      occupation: 'Developer',
      roomId: room.id,
      moveInDate: '2026-03-01',
      ktpPhoto: draftFilename,
    }),
  });
  assert.strictEqual(createTenantRes.status, 201, 'Create tenant must succeed');
  const createdTenantId = createTenantRes.data.data.id;
  assert.strictEqual(createTenantRes.data.data.ktpPhoto, draftFilename);
  console.log('✓ 5. Tenant dibuat dengan referensi KTP di database');

  // 8. Ambil file KTP terproteksi (GET /tenants/:id/ktp)
  const getKtpRes = await fetch(`${BASE_URL}/properties/${propertyId}/tenants/${createdTenantId}/ktp`, {
    headers: authHeaders,
  });
  assert.strictEqual(getKtpRes.status, 200, 'GET KTP file must return 200');
  const getKtpBuffer = Buffer.from(await getKtpRes.arrayBuffer());
  assert(getKtpBuffer.length > 0, 'Returned KTP buffer must not be empty');
  console.log('✓ 6. Mengambil file KTP terproteksi (GET) berhasil');

  // 9. Akses KTP tanpa token -> 401
  const getKtpNoAuth = await fetch(`${BASE_URL}/properties/${propertyId}/tenants/${createdTenantId}/ktp`);
  assert.strictEqual(getKtpNoAuth.status, 401, 'GET KTP without auth must return 401');
  console.log('✓ 7. Akses KTP tanpa token ditolak (401)');

  // 10. Akses KTP dengan property ID fiktif / tidak dimiliki -> 404
  const getKtpWrongProp = await fetch(`${BASE_URL}/properties/prop-fake-id/tenants/${createdTenantId}/ktp`, {
    headers: authHeaders,
  });
  assert.strictEqual(getKtpWrongProp.status, 404, 'GET KTP for invalid property must return 404');
  console.log('✓ 8. Akses KTP properti lain ditolak (404)');

  // 11. Upload ulang PNG valid mengganti KTP lama
  const formDataPng = new FormData();
  formDataPng.append('ktp', new Blob([createSmallPng()], { type: 'image/png' }), 'ktp-replacement.png');
  const replaceRes = await request(`/properties/${propertyId}/tenants/${createdTenantId}/ktp`, {
    method: 'POST',
    headers: authHeaders,
    body: formDataPng,
  });
  assert.strictEqual(replaceRes.status, 200, 'Replace KTP must succeed');
  const newFilename = replaceRes.data.data.filename;
  assert.notStrictEqual(newFilename, draftFilename, 'New filename must differ from old filename');

  // Pastikan file baru ada dan file lama sudah dihapus
  const newDiskPath = path.resolve(UPLOAD_DIR, newFilename);
  assert(fs.existsSync(newDiskPath), 'New KTP file must exist');
  assert(!fs.existsSync(draftDiskPath), 'Old KTP file must be unlinked/deleted from disk');
  console.log('✓ 9. Upload ulang mengganti KTP dan menghapus file lama secara aman');

  // 12. Verifikasi data tenant lainnya tetap aman
  const tenantDetailRes = await request(`/properties/${propertyId}/tenants/${createdTenantId}`, {
    headers: authHeaders,
  });
  assert.strictEqual(tenantDetailRes.status, 200);
  assert.strictEqual(tenantDetailRes.data.data.name, tenantName);
  assert.strictEqual(tenantDetailRes.data.data.ktpPhoto, newFilename);
  console.log('✓ 10. Data tenant lainnya tetap aman dan sinkron');

  // Cleanup: exit/delete test tenant & remove file
  if (fs.existsSync(newDiskPath)) {
    try { fs.unlinkSync(newDiskPath); } catch (e) {}
  }
  await request(`/properties/${propertyId}/tenants/${createdTenantId}/exit`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ exitDate: '2026-03-02' }),
  });

  console.log('\n=== SEMUA TEST KTP BACKEND PASS (10/10) ===\n');
}

run().catch((err) => {
  console.error('KTP Test Failed:', err);
  process.exit(1);
});
