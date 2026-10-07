// Security Hardening Test Suite (Phase 3H-7)
import assert from 'assert';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000';
let passed = 0;
let failed = 0;

function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAILED: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  };
}

async function run() {
  console.log('=== TEST SUITE: SECURITY HARDENING (PHASE 3H-7) ===\n');

  // Setup: Ambil token login yang valid
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'pemilik@kost.id', password: 'rahasia123' }),
  });
  const loginData = await loginRes.json();
  assert.strictEqual(loginRes.status, 200, 'Login setup harus berhasil');
  const validToken = loginData.token;
  const authHeaders = { Authorization: `Bearer ${validToken}`, 'Content-Type': 'application/json' };

  // Ambil property pemilik 1
  const propsRes = await fetch(`${BASE_URL}/api/v1/properties`, { headers: authHeaders });
  const propsData = await propsRes.json();
  assert.strictEqual(propsRes.status, 200);
  const house1Id = propsData.data[0].id;

  // Buat token untuk pemilik lain / dummy user
  const user2Token = jwt.sign(
    { id: 'user-hacker-uuid', email: 'hacker@attacker.com', name: 'Hacker' },
    'kost-manager-secret-key-2026',
    { expiresIn: '1h' }
  );
  const user2Headers = { Authorization: `Bearer ${user2Token}`, 'Content-Type': 'application/json' };

  // 1. Login tanpa credential valid -> 401
  await test('1. Login tanpa credential valid ditolak (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pemilik@kost.id', password: 'passwordsalah123' }),
    });
    assert.strictEqual(res.status, 401);
  })();

  // 2. Token invalid -> 403
  await test('2. Token invalid ditolak (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: 'Bearer token.palsu.invalid' },
    });
    assert.strictEqual(res.status, 403);
  })();

  // 3. Token expired -> 403
  await test('3. Token expired ditolak (403)', async () => {
    const expiredToken = jwt.sign(
      { id: 'some-user-id', email: 'user@kost.id' },
      'kost-manager-secret-key-2026',
      { expiresIn: '-1s' }
    );
    const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.strictEqual(res.status, 403);
  })();

  // 4. Endpoint protected tanpa token -> 401
  await test('4. Endpoint protected tanpa token ditolak (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/properties`);
    assert.strictEqual(res.status, 401);
  })();

  // 5. Property A tidak dapat diakses oleh user B -> 404
  await test('5. Isolasi Properti: User B ditolak mengakses Properti User A (404)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/properties/${house1Id}/rooms`, {
      headers: user2Headers,
    });
    assert.strictEqual(res.status, 404);
  })();

  // 6. Tenant KTP isolasi: Tenant property lain tidak dapat mengambil KTP
  await test('6. KTP Protection: Tenant properti lain ditolak mengambil KTP (404)', async () => {
    const tenantsRes = await fetch(`${BASE_URL}/api/v1/properties/${house1Id}/tenants`, {
      headers: authHeaders,
    });
    const tenantsData = await tenantsRes.json();
    const tenantId = tenantsData.data[0]?.id;
    assert(tenantId, 'Harus ada tenant');

    // Akses via user lain
    const res = await fetch(`${BASE_URL}/api/v1/properties/${house1Id}/tenants/${tenantId}/ktp`, {
      headers: user2Headers,
    });
    assert.strictEqual(res.status, 404);
  })();

  // 7. Path traversal KTP ditolak
  await test('7. Path traversal pada endpoint KTP ditolak (404)', async () => {
    const traversalTenantId = encodeURIComponent('../../package.json');
    const res = await fetch(`${BASE_URL}/api/v1/properties/${house1Id}/tenants/${traversalTenantId}/ktp`, {
      headers: authHeaders,
    });
    assert.strictEqual(res.status, 404);
  })();

  // 8. Upload file invalid ditolak
  await test('8. Upload berkas non-gambar ditolak (400)', async () => {
    const formData = new FormData();
    formData.append('ktp', new Blob(['hacked script'], { type: 'application/x-sh' }), 'exploit.sh');
    const res = await fetch(`${BASE_URL}/api/v1/properties/${house1Id}/tenants/upload-ktp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${validToken}` },
      body: formData,
    });
    assert.strictEqual(res.status, 400);
  })();

  // 9. Request body terlalu besar ditolak (413 Payload Too Large)
  await test('9. Request JSON body melebihi batas 1MB ditolak (413)', async () => {
    const hugePayload = 'A'.repeat(1.5 * 1024 * 1024); // 1.5 MB string
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pemilik@kost.id', password: hugePayload }),
    });
    assert.strictEqual(res.status, 413);
  })();

  // 10. Secret tidak muncul di response
  await test('10. JWT Secret & DATABASE_URL tidak bocor di response', async () => {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthText = await healthRes.text();
    assert(!healthText.includes('kost-manager-secret-key-2026'), 'JWT secret tidak boleh ada di health');
    assert(!healthText.includes('DATABASE_URL'), 'DATABASE_URL tidak boleh ada di health');
  })();

  // 11. Password hash tidak muncul di response user
  await test('11. Password hash tidak pernah dikirim ke frontend', async () => {
    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    assert.strictEqual(meData.user.passwordHash, undefined, 'passwordHash harus undefined');
  })();

  // 12. Security Headers (Helmet) terpasang
  await test('12. Helmet security headers terpasang pada response', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert(res.headers.get('x-dns-prefetch-control'), 'X-DNS-Prefetch-Control harus ada');
    assert(res.headers.get('x-frame-options'), 'X-Frame-Options harus ada');
    assert(res.headers.get('x-content-type-options'), 'X-Content-Type-Options harus ada');
  })();

  // 13. CORS Policy membatasi origin asing yang tidak sah
  await test('13. CORS Policy menolak origin asing tak dikenal', async () => {
    const res = await fetch(`${BASE_URL}/api/health`, {
      headers: { Origin: 'http://malicious-website.com' },
    });
    assert.strictEqual(res.status, 403, 'Malicious origin harus ditolak dengan 403');
  })();

  console.log(`\n=== HASIL TEST SECURITY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Security Test Runner Error:', err);
  process.exit(1);
});
