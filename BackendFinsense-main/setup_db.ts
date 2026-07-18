import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(191) NOT NULL,
        user_id VARCHAR(191) NOT NULL,
        name VARCHAR(191) NOT NULL,
        cost DECIMAL(10,2) NOT NULL,
        currency VARCHAR(191) NOT NULL DEFAULT 'MXN',
        billingCycle VARCHAR(191) NOT NULL DEFAULT 'monthly',
        next_billing_date DATETIME(3) NOT NULL,
        status VARCHAR(191) NOT NULL DEFAULT 'active',
        category VARCHAR(191) NOT NULL DEFAULT 'other',
        icon_url VARCHAR(191) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        INDEX subscriptions_user_id_idx (user_id),
        CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Table created successfully");
  } catch (e) {
    console.error("Error creating table", e);
  }
}

main().finally(() => prisma.$disconnect());
