const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const books = await prisma.book.findMany();
  console.log('Books in DB:', books.length);
  console.log(books);
}

main().catch(console.error).finally(() => prisma.$disconnect());
