const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@fif.org';
  const password = 'Password123!';
  const name = 'System Admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin user already exists');
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'system_admin',
      subscriptionTier: 'vvip',
      isActive: true
    }
  });

  console.log('Admin user created successfully:');
  console.log('Email:', email);
  console.log('Password:', password);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
