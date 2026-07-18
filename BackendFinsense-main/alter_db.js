const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE investments ADD COLUMN ticker VARCHAR(191), ADD COLUMN shares DECIMAL(10,4);');
  console.log("Columns added successfully");
}
main().catch(console.error).finally(() => prisma.$disconnect());
