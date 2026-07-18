const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.category.findMany();
  console.log('Categories:', cats.map(c => c.name));
  const bench = await prisma.cityBenchmark.findMany();
  console.log('Benchmarks:', [...new Set(bench.map(b => b.category))]);
}
main().finally(() => prisma.$disconnect());
