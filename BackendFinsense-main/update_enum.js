const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Modificando enum NotificationType...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE notifications 
      MODIFY COLUMN type ENUM(
        'budget_exceeded',
        'streak_at_risk',
        'goal_deadline',
        'reminder',
        'badge_earned',
        'spending_anomaly',
        'subscription_reminder',
        'budget_warning',
        'challenge_invite',
        'group_invite'
      ) NOT NULL;
    `);
    console.log('Enum modificado correctamente.');
  } catch (error) {
    console.error('Error modificando enum:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
