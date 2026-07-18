const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE user_xp ADD COLUMN equipped_skin VARCHAR(191) DEFAULT 'default';`);
    console.log("Column equipped_skin added successfully!");
  } catch (e) {
    if (e.message.includes('Duplicate column')) {
      console.log("Column equipped_skin already exists, ignoring.");
    } else {
      console.error(e);
    }
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE user_xp ADD COLUMN chests INT DEFAULT 0;`);
    console.log("Column chests added successfully!");
  } catch (e) {
    if (e.message.includes('Duplicate column')) {
      console.log("Column chests already exists, ignoring.");
    } else {
      console.error(e);
    }
  }
}

main().finally(() => prisma.$disconnect());
