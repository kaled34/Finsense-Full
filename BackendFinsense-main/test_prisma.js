const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log("No user found");
      return;
    }
    const group = await prisma.group.create({
      data: {
        name: "Test Group",
        createdBy: user.id,
        members: { create: [{ userId: user.id }] },
      },
      include: { members: { include: { user: { select: { id: true, name: true } } } } },
    });
    console.log("Success:", group);
  } catch (e) {
    console.error("Prisma Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
