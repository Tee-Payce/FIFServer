const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const initialPricing = [
    { id: 'standard', price: 12 },
    { id: 'premium', price: 29 },
    { id: 'vvip', price: 99 }
  ];

  for (const p of initialPricing) {
    await prisma.pricing.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    });
  }
  console.log('Initial pricing seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
