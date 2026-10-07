// Test Verifikasi Koneksi & Integritas Database MySQL (Phase 3H-6)
import { PrismaClient } from '@prisma/client';
import assert from 'assert';

const prisma = new PrismaClient();

async function run() {
  console.log('=== TEST DATABASE MYSQL & DATA INTEGRITY (PHASE 3H-6) ===\n');

  // 1. Verifikasi koneksi dan engine database
  console.log('[1/6] Verifikasi Koneksi dan Dialek MySQL...');
  const result = await prisma.$queryRaw`SELECT VERSION() as version, DATABASE() as db;`;
  assert(Array.isArray(result) && result.length > 0, 'Query raw ke MySQL harus berhasil');
  console.log(`  ✅ Terhubung ke MySQL/MariaDB: ${result[0].version}, Database: ${result[0].db}`);
  assert(result[0].db === 'kost_manager', 'Database aktif harus kost_manager');

  // 2. Verifikasi Data Model & Relasi
  console.log('\n[2/6] Verifikasi User & Property Relation...');
  const owner = await prisma.user.findUnique({
    where: { email: 'pemilik@kost.id' },
    include: { properties: true },
  });
  assert(owner, 'Akun demo pemilik@kost.id harus ada di MySQL');
  assert(owner.properties.length === 3, 'Pemilik harus memiliki 3 property');
  console.log(`  ✅ User: ${owner.name} (${owner.email}) memiliki ${owner.properties.length} properti`);

  // 3. Verifikasi Rooms, Occupancies, Tenants
  console.log('\n[3/6] Verifikasi Rooms & Occupancies...');
  const house1 = owner.properties.find((p) => p.name === 'Rumah 1');
  assert(house1, 'Rumah 1 harus ditemukan');

  const rooms = await prisma.room.findMany({
    where: { propertyId: house1.id },
    include: { occupancies: { where: { status: 'AKTIF' } } },
  });
  assert(rooms.length === 5, 'Rumah 1 harus memiliki 5 kamar');
  console.log(`  ✅ Kamar di Rumah 1: ${rooms.length} kamar berhasil diambil`);

  // 4. Verifikasi ENUM Types di MySQL
  console.log('\n[4/6] Verifikasi Native MySQL Enum Types...');
  const room1 = rooms.find((r) => r.roomNumber === '01');
  assert(room1, 'Kamar 01 harus ditemukan');
  assert(room1.status === 'TERISI', 'Status kamar harus berupa ENUM TERISI');

  const bills = await prisma.bill.findMany({
    where: { propertyId: house1.id },
  });
  assert(bills.length > 0, 'Harus ada tagihan di database');
  assert(['BELUM_BAYAR', 'SEBAGIAN', 'LUNAS', 'TERLAMBAT'].includes(bills[0].status), 'Status tagihan valid ENUM');
  console.log(`  ✅ MySQL ENUM fields berfungsi dengan benar`);

  // 5. Verifikasi Foreign Key Cascade
  console.log('\n[5/6] Verifikasi Foreign Key Constraint...');
  const settingKey = `test_setting_${Date.now()}`;
  const setting = await prisma.setting.create({
    data: {
      propertyId: house1.id,
      settingKey,
      settingValue: 'mysql_test_val',
    },
  });
  assert(setting.id, 'Setting berhasil dibuat dengan foreign key ke Property');
  await prisma.setting.delete({ where: { id: setting.id } });
  console.log(`  ✅ Foreign key relation & constraints aktif dan valid`);

  // 6. Verifikasi Historical Price Snapshot
  console.log('\n[6/6] Verifikasi Historical Price Snapshot...');
  const paidBill = bills.find((b) => b.roomId === room1.id);
  assert(paidBill, 'Tagihan untuk kamar 01 harus ada');
  assert(paidBill.amount > 0, 'Amount tagihan snapshot harus bernilai positif');
  console.log(`  ✅ Snapshot nominal tagihan tersimpan: Rp ${paidBill.amount}`);

  console.log('\n=== SEMUA VERIFIKASI MYSQL PASS (6/6) ===\n');
}

run()
  .catch((err) => {
    console.error('MySQL Test Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
