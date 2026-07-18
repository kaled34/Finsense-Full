const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`group_messages\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`group_id\` VARCHAR(191) NOT NULL,
        \`sender_id\` VARCHAR(191) NOT NULL,
        \`content\` TEXT NOT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`group_messages_group_id_idx\` (\`group_id\`),
        INDEX \`group_messages_sender_id_idx\` (\`sender_id\`),
        CONSTRAINT \`group_messages_group_id_fkey\` FOREIGN KEY (\`group_id\`) REFERENCES \`groups\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`group_messages_sender_id_fkey\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Table group_messages created successfully!");
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log("Table already exists.");
    } else {
      console.error(e);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
