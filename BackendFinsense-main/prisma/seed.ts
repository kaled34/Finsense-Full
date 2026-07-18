import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding FinSense database...');

  // Categorías con keywords en español para Tuxtla Gutiérrez
  const categories = [
    { name: 'Alimentacion', keywords: JSON.stringify(['comida', 'restaurant', 'taqueria', 'pollo', 'super', 'walmart', 'mercado', 'tortillas']), icon: '🍽', color: '#F59E0B' },
    { name: 'Transporte', keywords: JSON.stringify(['taxi', 'uber', 'gasolina', 'camion', 'colectivo', 'pasaje', 'bus']), icon: '🚌', color: '#3B82F6' },
    { name: 'Salud', keywords: JSON.stringify(['farmacia', 'medicina', 'doctor', 'hospital', 'consulta', 'dentista']), icon: '💊', color: '#EF4444' },
    { name: 'Educacion', keywords: JSON.stringify(['universidad', 'colegio', 'libros', 'inscripcion', 'curso', 'clases']), icon: '📚', color: '#8B5CF6' },
    { name: 'Entretenimiento', keywords: JSON.stringify(['cine', 'netflix', 'spotify', 'juegos', 'bar', 'concierto']), icon: '🎮', color: '#EC4899' },
    { name: 'Servicios', keywords: JSON.stringify(['luz', 'agua', 'internet', 'telmex', 'telcel', 'renta']), icon: '💡', color: '#10B981' },
    { name: 'Ropa', keywords: JSON.stringify(['ropa', 'zapatos', 'calzado', 'camiseta', 'plaza', 'fashion']), icon: '👕', color: '#F97316' },
    { name: 'Ahorro', keywords: JSON.stringify(['deposito', 'ahorro', 'inversion', 'retiro']), icon: '💰', color: '#22C55E' },
    { name: 'Colectivo', keywords: JSON.stringify(['colectivo', 'ruta', 'combi', 'pasaje', 'conejobus', 'colectivos']), icon: '🚌', color: '#00C2FF' },
    { name: 'Pozol', keywords: JSON.stringify(['pozol', 'antojitos', 'empanadas', 'memelas', 'tamal', 'tascalate', 'chalupas', 'tacos', 'comida']), icon: '🍽', color: '#E28743' },
    { name: 'Copias', keywords: JSON.stringify(['copias', 'impresiones', 'engargolado', 'ciber', 'papeleria', 'tareas', 'impresion']), icon: '📚', color: '#9B5DE5' },
    { name: 'Renta', keywords: JSON.stringify(['renta', 'roomie', 'cuarto', 'departamento', 'habitacion', 'alquiler', 'roomies']), icon: '🏠', color: '#FF82A9' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  // Benchmarks locales de Tuxtla Gutiérrez — Mayo 2026
  const month = '2026-05';
  const benchmarks = [
    { category: 'Alimentación', avgAmount: 3200, percentile25: 1800, percentile75: 4500 },
    { category: 'Transporte', avgAmount: 800, percentile25: 400, percentile75: 1500 },
    { category: 'Entretenimiento', avgAmount: 600, percentile25: 200, percentile75: 1200 },
    { category: 'Servicios', avgAmount: 1200, percentile25: 800, percentile75: 1800 },
    { category: 'Ropa', avgAmount: 700, percentile25: 200, percentile75: 1500 },
    { category: 'Salud', avgAmount: 400, percentile25: 100, percentile75: 800 },
    { category: 'Educación', avgAmount: 1500, percentile25: 500, percentile75: 3000 },
  ];

  for (const b of benchmarks) {
    await prisma.cityBenchmark.upsert({
      where: { city_category_month: { city: 'Tuxtla Gutiérrez', category: b.category, month } },
      update: {},
      create: { city: 'Tuxtla Gutiérrez', category: b.category, month, ...b },
    });
  }

  console.log('✅ Seed completado — categorías y benchmarks listos');
}

main().catch(console.error).finally(() => prisma.$disconnect());
