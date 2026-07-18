const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS friendships (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        user_id VARCHAR(191) NOT NULL,
        friend_id VARCHAR(191) NOT NULL,
        status VARCHAR(191) NOT NULL DEFAULT 'accepted',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE INDEX friendships_user_id_friend_id_key(user_id, friend_id),
        INDEX friendships_user_id_idx(user_id),
        INDEX friendships_friend_id_idx(friend_id)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Friendships table created successfully.");
  } catch (e) {
    console.error("Error creating table:", e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
