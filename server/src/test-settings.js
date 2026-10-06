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
  console.log('=== RUNNING SETTINGS & PROFILE API TESTS (Phase 3H-4) ===\n');

  console.log('1. Setting up users and properties...');
  const user1 = await prisma.user.findUnique({ where: { email: 'pemilik@kost.id' } });
  if (!user1) {
    throw new Error('User pemilik@kost.id tidak ditemukan di database.');
  }

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

  const house1 = await prisma.property.findFirst({ where: { userId: user1.id } });
  if (!house1) {
    throw new Error('Property user 1 tidak ditemukan.');
  }

  const tokenUser1 = jwt.sign({ id: user1.id, email: user1.email }, JWT_SECRET, { expiresIn: '1h' });
  const tokenUser2 = jwt.sign({ id: user2.id, email: user2.email }, JWT_SECRET, { expiresIn: '1h' });
  const invalidToken = 'invalid.jwt.token';

  // ==========================================
  // PART 1: PUT /api/v1/auth/profile
  // ==========================================
  console.log('\n--- PART 1: PUT /auth/profile ---');

  // Test 1: Tanpa token
  console.log('Test 1: Tanpa token');
  const res1 = await fetch(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test', email: 'test@kost.id' }),
  });
  assert(res1.status === 401, `Status code 401 tanpa token (got ${res1.status})`);

  // Test 2: Token invalid
  console.log('Test 2: Token invalid');
  const res2 = await fetch(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${invalidToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Test', email: 'test@kost.id' }),
  });
  assert(res2.status === 403, `Status code 403 token invalid (got ${res2.status})`);

  // Test 3: Body tidak lengkap (nama kosong)
  console.log('Test 3: Body tidak lengkap');
  const res3 = await fetch(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: '', email: 'pemilik@kost.id' }),
  });
  assert(res3.status === 400, `Status code 400 nama kosong (got ${res3.status})`);

  // Test 4: Update profile valid
  console.log('Test 4: Update profile valid');
  const res4 = await fetch(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Pemilik Diperbarui',
      email: 'pemilik@kost.id',
      phone: '081299998888',
    }),
  });
  assert(res4.status === 200, `Status code 200 update profile (got ${res4.status})`);
  const data4 = await res4.json();
  assert(data4.success === true, 'Response success === true');
  assert(data4.user && data4.user.name === 'Pemilik Diperbarui', 'Nama terupdate di response');
  assert(data4.user && data4.user.phone === '081299998888', 'Phone terupdate di response');

  // Test 5: Verify ke database
  console.log('Test 5: Verifikasi perubahan tersimpan di database');
  const dbUser = await prisma.user.findUnique({ where: { id: user1.id } });
  assert(dbUser.name === 'Pemilik Diperbarui', 'Nama tersimpan di database');
  assert(dbUser.phone === '081299998888', 'Phone tersimpan di database');

  // Test 6: Restore profile original
  console.log('Test 6: Restore profile original');
  const res6 = await fetch(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: user1.name || 'Pemilik Kost',
      email: user1.email,
      phone: user1.phone || '081234567890',
    }),
  });
  assert(res6.status === 200, `Profile original dipulihkan (got ${res6.status})`);

  // ==========================================
  // PART 2: POST /api/v1/auth/change-password
  // ==========================================
  console.log('\n--- PART 2: POST /auth/change-password ---');

  // Test 7: Tanpa token
  console.log('Test 7: Tanpa token');
  const res7 = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword: 'a', newPassword: 'b' }),
  });
  assert(res7.status === 401, `Status code 401 tanpa token (got ${res7.status})`);

  // Test 8: Token invalid
  console.log('Test 8: Token invalid');
  const res8 = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${invalidToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ oldPassword: 'a', newPassword: 'b' }),
  });
  assert(res8.status === 403, `Status code 403 token invalid (got ${res8.status})`);

  // Test 9: Field kosong
  console.log('Test 9: Field kosong');
  const res9 = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ oldPassword: '', newPassword: '' }),
  });
  assert(res9.status === 400, `Status code 400 field kosong (got ${res9.status})`);

  // Test 10: Password baru < 8 karakter
  console.log('Test 10: Password baru < 8 karakter');
  const res10 = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ oldPassword: 'rahasia123', newPassword: 'pendek' }),
  });
  assert(res10.status === 400, `Status code 400 password baru < 8 karakter (got ${res10.status})`);

  // Test 11: Password lama salah
  console.log('Test 11: Password lama salah');
  const res11 = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ oldPassword: 'passwordSalahTotal', newPassword: 'passwordBaru123!' }),
  });
  assert(res11.status === 401, `Status code 401 password lama salah (got ${res11.status})`);

  // Test 12: Ganti password sukses
  console.log('Test 12: Ganti password sukses');
  const res12 = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ oldPassword: 'rahasia123', newPassword: 'passwordBaru123!' }),
  });
  assert(res12.status === 200, `Status code 200 ganti password sukses (got ${res12.status})`);

  // Test 13: Verifikasi login dengan password baru
  console.log('Test 13: Login dengan password baru');
  const res13 = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'pemilik@kost.id', password: 'passwordBaru123!' }),
  });
  assert(res13.status === 200, `Status code 200 login dengan password baru (got ${res13.status})`);
  const data13 = await res13.json();
  assert(!!data13.token, 'Token baru diterima saat login dengan password baru');

  // Test 14: Kembalikan password ke 'rahasia123'
  console.log('Test 14: Kembalikan password ke rahasia123');
  const res14 = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${data13.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ oldPassword: 'passwordBaru123!', newPassword: 'rahasia123' }),
  });
  assert(res14.status === 200, `Status code 200 kembalikan password (got ${res14.status})`);

  // Test 15: Login kembali dengan password original
  console.log('Test 15: Login dengan password original rahasia123');
  const res15 = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'pemilik@kost.id', password: 'rahasia123' }),
  });
  assert(res15.status === 200, `Status code 200 login kembali normal (got ${res15.status})`);

  // ==========================================
  // PART 3: PUT /api/v1/properties/:propertyId/name
  // ==========================================
  console.log('\n--- PART 3: PUT /properties/:propertyId/name ---');

  // Test 16: Tanpa token
  console.log('Test 16: Tanpa token');
  const res16 = await fetch(`${API_URL}/properties/${house1.id}/name`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Rumah Baru' }),
  });
  assert(res16.status === 401, `Status code 401 tanpa token (got ${res16.status})`);

  // Test 17: Token invalid
  console.log('Test 17: Token invalid');
  const res17 = await fetch(`${API_URL}/properties/${house1.id}/name`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${invalidToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Rumah Baru' }),
  });
  assert(res17.status === 403, `Status code 403 token invalid (got ${res17.status})`);

  // Test 18: Nama kosong
  console.log('Test 18: Nama kosong');
  const res18 = await fetch(`${API_URL}/properties/${house1.id}/name`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: '   ' }),
  });
  assert(res18.status === 400, `Status code 400 nama kosong (got ${res18.status})`);

  // Test 19: User 2 coba update property User 1 (ownership check)
  console.log('Test 19: User 2 coba update property User 1');
  const res19 = await fetch(`${API_URL}/properties/${house1.id}/name`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenUser2}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Rumah Dibajak' }),
  });
  assert(res19.status === 404, `Status code 404 unauthorized property update (got ${res19.status})`);

  // Test 20: Property ID tidak ditemukan
  console.log('Test 20: Property ID tidak valid');
  const res20 = await fetch(`${API_URL}/properties/00000000-0000-0000-0000-000000000000/name`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Rumah Antah Berantah' }),
  });
  assert(res20.status === 404, `Status code 404 property tidak ada (got ${res20.status})`);

  // Test 21: Update nama property sukses
  console.log('Test 21: Update nama property sukses');
  const originalHouseName = house1.name;
  const res21 = await fetch(`${API_URL}/properties/${house1.id}/name`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Kost Mawar Indah' }),
  });
  assert(res21.status === 200, `Status code 200 update nama (got ${res21.status})`);
  const data21 = await res21.json();
  assert(data21.success === true, 'Response success === true');
  assert(data21.data && data21.data.name === 'Kost Mawar Indah', 'Nama property terupdate di response');

  // Test 22: Verify perubahan di database
  console.log('Test 22: Verifikasi nama property di database');
  const dbHouse = await prisma.property.findUnique({ where: { id: house1.id } });
  assert(dbHouse.name === 'Kost Mawar Indah', 'Nama tersimpan di database');

  // Test 23: Kembalikan nama property original
  console.log('Test 23: Kembalikan nama property original');
  const res23 = await fetch(`${API_URL}/properties/${house1.id}/name`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenUser1}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: originalHouseName }),
  });
  assert(res23.status === 200, `Nama property dipulihkan ke ${originalHouseName} (got ${res23.status})`);

  console.log(`\n=================================`);
  console.log(`TEST SUMMARY: ${passedTests} passed, ${failedTests} failed.`);
  console.log(`=================================`);

  if (failedTests > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
