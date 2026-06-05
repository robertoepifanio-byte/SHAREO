import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()

  const updated = await prisma.user.updateMany({
    where: { email: 'admin.fixture@shareo-test.com' },
    data:  { role: 'ADMIN', adminRole: 'ADMIN_SUPERADMIN' },
  })
  console.log('Rows updated:', updated.count)

  const user = await prisma.user.findUnique({
    where:  { email: 'admin.fixture@shareo-test.com' },
    select: { email: true, role: true, adminRole: true },
  })
  console.log('User state:', JSON.stringify(user))

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
