import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Cleaning existing database records...');
  await prisma.payment.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.occupancy.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.room.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  console.log('[SEED] Creating default owner user...');
  const passwordHash = await bcrypt.hash('rahasia123', 10);
  const owner = await prisma.user.create({
    data: {
      name: 'Pemilik Kost',
      email: 'pemilik@kost.id',
      phone: '0812-0000-1234',
      passwordHash,
    },
  });

  console.log('[SEED] Creating 3 Properties (Rumah 1, Rumah 2, Rumah 3)...');
  const house1 = await prisma.property.create({
    data: { name: 'Rumah 1', userId: owner.id },
  });
  const house2 = await prisma.property.create({
    data: { name: 'Rumah 2', userId: owner.id },
  });
  const house3 = await prisma.property.create({
    data: { name: 'Rumah 3', userId: owner.id },
  });

  console.log('[SEED] Creating Rooms for Rumah 1...');
  const r01 = await prisma.room.create({
    data: { propertyId: house1.id, roomNumber: '01', price: 800000, status: 'TERISI', notes: '' },
  });
  const r02 = await prisma.room.create({
    data: { propertyId: house1.id, roomNumber: '02', price: 700000, status: 'KOSONG', notes: '' },
  });
  const r03 = await prisma.room.create({
    data: { propertyId: house1.id, roomNumber: '03', price: 1000000, status: 'TERISI', notes: 'Ada kamar mandi dalam' },
  });
  const r04 = await prisma.room.create({
    data: { propertyId: house1.id, roomNumber: '04', price: 700000, status: 'TERISI', notes: '' },
  });
  const r05 = await prisma.room.create({
    data: { propertyId: house1.id, roomNumber: '05', price: 750000, status: 'TERISI', notes: '' },
  });

  // Seed sample rooms for house2 & house3
  await prisma.room.createMany({
    data: [
      { propertyId: house2.id, roomNumber: '101', price: 900000, status: 'KOSONG' },
      { propertyId: house2.id, roomNumber: '102', price: 900000, status: 'KOSONG' },
      { propertyId: house3.id, roomNumber: 'A1', price: 1200000, status: 'KOSONG' },
    ],
  });

  console.log('[SEED] Creating Tenants & Occupancies...');
  // Tenant 1: Andi (Kamar 01)
  const tAndi = await prisma.tenant.create({
    data: {
      name: 'Andi',
      phone: '0812-3456-7801',
      originAddress: 'Binjai',
      occupation: 'Karyawan',
      status: 'AKTIF',
    },
  });
  const occAndi = await prisma.occupancy.create({
    data: {
      tenantId: tAndi.id,
      propertyId: house1.id,
      roomId: r01.id,
      startDate: new Date('2026-01-20'),
      status: 'AKTIF',
    },
  });

  // Tenant 2: Budi Santoso (Kamar 01 - Multi tenant in Kamar 01)
  const tBudi = await prisma.tenant.create({
    data: {
      name: 'Budi Santoso',
      phone: '0813-9988-2210',
      originAddress: 'Medan',
      occupation: 'Mahasiswa',
      status: 'AKTIF',
    },
  });
  const occBudi = await prisma.occupancy.create({
    data: {
      tenantId: tBudi.id,
      propertyId: house1.id,
      roomId: r01.id,
      startDate: new Date('2026-01-20'),
      status: 'AKTIF',
    },
  });

  // Tenant 3: Sari (Kamar 03)
  const tSari = await prisma.tenant.create({
    data: {
      name: 'Sari',
      phone: '0821-7000-1122',
      originAddress: 'Pematangsiantar',
      occupation: 'Perawat',
      status: 'AKTIF',
    },
  });
  const occSari = await prisma.occupancy.create({
    data: {
      tenantId: tSari.id,
      propertyId: house1.id,
      roomId: r03.id,
      startDate: new Date('2026-08-25'),
      status: 'AKTIF',
    },
  });

  // Tenant 4: Dewi (Kamar 04)
  const tDewi = await prisma.tenant.create({
    data: {
      name: 'Dewi',
      phone: '0857-1200-3344',
      originAddress: 'Tebing Tinggi',
      occupation: 'Guru',
      status: 'AKTIF',
    },
  });
  const occDewi = await prisma.occupancy.create({
    data: {
      tenantId: tDewi.id,
      propertyId: house1.id,
      roomId: r04.id,
      startDate: new Date('2026-09-28'),
      status: 'AKTIF',
    },
  });

  // Tenant 5: Rina (Kamar 05)
  const tRina = await prisma.tenant.create({
    data: {
      name: 'Rina',
      phone: '0852-6677-8899',
      originAddress: 'Kisaran',
      occupation: 'Mahasiswa',
      status: 'AKTIF',
    },
  });
  const occRina = await prisma.occupancy.create({
    data: {
      tenantId: tRina.id,
      propertyId: house1.id,
      roomId: r05.id,
      startDate: new Date('2026-05-01'),
      status: 'AKTIF',
    },
  });

  // Tenant 6: Joko (Keluar dari Kamar 02)
  const tJoko = await prisma.tenant.create({
    data: {
      name: 'Joko',
      phone: '0811-2233-4455',
      originAddress: 'Lubuk Pakam',
      occupation: 'Karyawan',
      status: 'KELUAR',
    },
  });
  await prisma.occupancy.create({
    data: {
      tenantId: tJoko.id,
      propertyId: house1.id,
      roomId: r02.id,
      startDate: new Date('2026-01-20'),
      endDate: new Date('2026-06-30'),
      status: 'KELUAR',
    },
  });

  console.log('[SEED] Creating Bills and Payments...');
  // Bill 1: Kamar 01 (20 Sep - 20 Okt 2026) - BELUM_BAYAR
  await prisma.bill.create({
    data: {
      propertyId: house1.id,
      roomId: r01.id,
      occupancyId: occAndi.id,
      periodStart: new Date('2026-09-20'),
      periodEnd: new Date('2026-10-20'),
      amount: 800000,
      dueDate: new Date('2026-10-20'),
      status: 'BELUM_BAYAR',
    },
  });

  // Bill 2: Kamar 03 (25 Sep - 25 Okt 2026) - SEBAGIAN (600k paid of 1m)
  const bill2 = await prisma.bill.create({
    data: {
      propertyId: house1.id,
      roomId: r03.id,
      occupancyId: occSari.id,
      periodStart: new Date('2026-09-25'),
      periodEnd: new Date('2026-10-25'),
      amount: 1000000,
      dueDate: new Date('2026-10-25'),
      status: 'SEBAGIAN',
    },
  });
  await prisma.payment.create({
    data: {
      billId: bill2.id,
      paymentDate: new Date('2026-10-02'),
      amount: 600000,
      method: 'TRANSFER',
    },
  });

  // Bill 3: Kamar 04 (28 Agu - 28 Sep 2026) - TERLAMBAT
  await prisma.bill.create({
    data: {
      propertyId: house1.id,
      roomId: r04.id,
      occupancyId: occDewi.id,
      periodStart: new Date('2026-08-28'),
      periodEnd: new Date('2026-09-28'),
      amount: 700000,
      dueDate: new Date('2026-09-28'),
      status: 'TERLAMBAT',
    },
  });

  // Bill 4: Kamar 05 (1 Sep - 1 Okt 2026) - LUNAS
  const bill4 = await prisma.bill.create({
    data: {
      propertyId: house1.id,
      roomId: r05.id,
      occupancyId: occRina.id,
      periodStart: new Date('2026-09-01'),
      periodEnd: new Date('2026-10-01'),
      amount: 750000,
      dueDate: new Date('2026-10-01'),
      status: 'LUNAS',
    },
  });
  await prisma.payment.create({
    data: {
      billId: bill4.id,
      paymentDate: new Date('2026-09-30'),
      amount: 750000,
      method: 'CASH',
    },
  });

  console.log('[SEED] Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[SEED ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
