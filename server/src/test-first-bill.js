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

// Currency formatters to test (same as frontend implementation)
function formatRupiah(val) {
  if (val === null || val === undefined || val === '') return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';
  return 'Rp' + num.toLocaleString('id-ID');
}

function parseRupiah(val) {
  if (!val) return 0;
  const digits = String(val).replace(/\D/g, '');
  return parseInt(digits, 10) || 0;
}

async function runTests() {
  console.log('=== TEST SUITE: FIRST BILL & CURRENCY FORMATTER ===\n');

  // 1. Setup Auth & Property
  const user = await prisma.user.findUnique({ where: { email: 'pemilik@kost.id' } });
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
  const house = await prisma.property.findFirst({ where: { userId: user.id, name: 'Rumah 1' } });

  // Cari atau buat kamar khusus test agar bersih
  let testRoom = await prisma.room.findFirst({
    where: { propertyId: house.id, roomNumber: 'TEST-01' },
  });

  if (!testRoom) {
    testRoom = await prisma.room.create({
      data: {
        propertyId: house.id,
        roomNumber: 'TEST-01',
        price: 800000,
        status: 'KOSONG',
      },
    });
  } else {
    // Bersihkan tagihan dan occupancy lama kamar test jika ada
    await prisma.bill.deleteMany({ where: { roomId: testRoom.id } });
    await prisma.occupancy.deleteMany({ where: { roomId: testRoom.id } });
    await prisma.room.update({ where: { id: testRoom.id }, data: { status: 'KOSONG', price: 800000 } });
  }

  // ==========================================
  // BAGIAN A: FIRST BILL SAAT TENANT MASUK
  // ==========================================
  console.log('--- A. Test First Bill Otomatis Saat Tenant Masuk ---');
  const moveInDateStr = '2026-01-20';
  const resTenant1 = await fetch(`${API_URL}/properties/${house.id}/tenants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Andi Test First Bill',
      phone: '081234567800',
      originAddress: 'Bandung',
      occupation: 'Akuntan',
      moveInDate: moveInDateStr,
      roomId: testRoom.id,
    }),
  });

  assert(resTenant1.status === 201, `1. Create tenant + active occupancy return 201 (got ${resTenant1.status})`);
  const tenant1Body = await resTenant1.json();
  assert(tenant1Body.success === true, 'Response tenant 1 success');

  // Cek database untuk first bill yang otomatis dibuat
  const bills = await prisma.bill.findMany({
    where: { roomId: testRoom.id },
  });

  assert(bills.length === 1, `2. First bill otomatis dibuat untuk kamar (got ${bills.length} bills)`);
  const firstBill = bills[0];

  assert(firstBill.amount === testRoom.price, `3. Nominal tagihan = harga kamar (got ${firstBill.amount}, expected ${testRoom.price})`);

  const expectedDueDate = new Date(moveInDateStr).toISOString().slice(0, 10);
  const actualDueDate = new Date(firstBill.dueDate).toISOString().slice(0, 10);
  assert(actualDueDate === expectedDueDate, `4. Due date = tanggal masuk (${actualDueDate} === ${expectedDueDate})`);

  const expectedPeriodStart = new Date(moveInDateStr).toISOString().slice(0, 10);
  const actualPeriodStart = new Date(firstBill.periodStart).toISOString().slice(0, 10);
  assert(actualPeriodStart === expectedPeriodStart, `5. Period start = tanggal masuk (${actualPeriodStart} === ${expectedPeriodStart})`);

  // Satu bulan setelah 2026-01-20 adalah 2026-02-20
  const expectedPeriodEnd = '2026-02-20';
  const actualPeriodEnd = new Date(firstBill.periodEnd).toISOString().slice(0, 10);
  assert(actualPeriodEnd === expectedPeriodEnd, `6. Period end = satu bulan setelah tanggal masuk (${actualPeriodEnd} === ${expectedPeriodEnd})`);

  assert(firstBill.status === 'BELUM_BAYAR', `7. Status tagihan pertama = BELUM_BAYAR (got ${firstBill.status})`);

  // ==========================================
  // BAGIAN B: DUPLICATE PROTECTION (ONE ROOM = ONE BILL PER PERIOD)
  // ==========================================
  console.log('\n--- B. Test Duplicate Protection (Penghuni Kedua ke Kamar yang Sama) ---');
  // Tambah penghuni kedua ke kamar TEST-01 pada periode yang sama
  const resTenant2 = await fetch(`${API_URL}/properties/${house.id}/tenants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Budi Test Roommate',
      phone: '081234567801',
      originAddress: 'Jakarta',
      occupation: 'Desainer',
      moveInDate: moveInDateStr,
      roomId: testRoom.id,
    }),
  });

  assert(resTenant2.status === 201, `Penghuni kedua berhasil ditambahkan (201, got ${resTenant2.status})`);
  const tenant2Body = await resTenant2.json();
  assert(tenant2Body.success === true, 'Response tenant 2 success');

  // Pastikan tagihan TIDAK bertambah (tetap 1 tagihan untuk kamar tersebut)
  const billsAfterTenant2 = await prisma.bill.findMany({
    where: { roomId: testRoom.id },
  });

  assert(
    billsAfterTenant2.length === 1,
    `8. Duplicate protection: Tagihan kamar tidak duplicate (got ${billsAfterTenant2.length}, expected 1)`
  );

  // ==========================================
  // BAGIAN C: CURRENCY FORMATTER
  // ==========================================
  console.log('\n--- C. Test Currency Formatter & Payload ---');
  assert(formatRupiah(5000) === 'Rp5.000', `9. formatRupiah(5000) === 'Rp5.000' (got ${formatRupiah(5000)})`);
  assert(formatRupiah(300000) === 'Rp300.000', `10. formatRupiah(300000) === 'Rp300.000' (got ${formatRupiah(300000)})`);
  assert(formatRupiah(1500000) === 'Rp1.500.000', `11. formatRupiah(1500000) === 'Rp1.500.000' (got ${formatRupiah(1500000)})`);

  const parsedNumeric = parseRupiah('Rp300.000');
  assert(
    typeof parsedNumeric === 'number' && parsedNumeric === 300000,
    `12. parseRupiah('Rp300.000') menghasilkan integer 300000 (got ${parsedNumeric}, type: ${typeof parsedNumeric})`
  );

  // Test paste & edge case
  assert(formatRupiah('Rp 950.000') === 'Rp950.000', 'Edge case: paste "Rp 950.000" terformat dengan benar');
  assert(formatRupiah(0) === 'Rp0', 'Edge case: 0 terformat menjadi "Rp0"');
  assert(parseRupiah('') === 0, 'Edge case: empty string diparse menjadi 0');

  // Cleanup data kamar test
  console.log('\n--- Cleanup Data Test ---');
  await prisma.bill.deleteMany({ where: { roomId: testRoom.id } });
  await prisma.occupancy.deleteMany({ where: { roomId: testRoom.id } });
  await prisma.tenant.deleteMany({ where: { phone: { in: ['081234567800', '081234567801'] } } });
  await prisma.room.delete({ where: { id: testRoom.id } });
  console.log('  ✅ Data test berhasil dibersihkan.');

  console.log('\n=================================');
  console.log(`TEST SUMMARY: ${passedTests} passed, ${failedTests} failed.`);
  console.log('=================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
