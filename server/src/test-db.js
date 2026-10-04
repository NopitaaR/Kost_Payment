import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuery() {
  const users = await prisma.user.findMany();
  const properties = await prisma.property.findMany({ include: { rooms: true } });
  const tenants = await prisma.tenant.findMany({ include: { occupancies: true } });
  const bills = await prisma.bill.findMany({ include: { payments: true } });

  console.log('=== TEST QUERY DATA ===');
  console.log(`Users: ${users.length}`);
  console.log(`Properties: ${properties.length} -> ${properties.map(p => p.name).join(', ')}`);
  console.log(`Tenants: ${tenants.length}`);
  console.log(`Bills: ${bills.length}`);
  console.log('======================');
}

testQuery()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
