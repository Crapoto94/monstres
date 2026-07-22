const { PrismaClient } = require('./dist/generated/prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
(async () => {
  const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });
  await prisma.user.update({ where: { email: 'pwa-toggle-test@example.com' }, data: { role: 'SUPER_ADMIN' } });
  console.log('promoted');
  await prisma.$disconnect();
})();
