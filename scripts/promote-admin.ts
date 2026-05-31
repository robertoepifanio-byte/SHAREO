import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin.fixture@shareo-test.com'

  // Check current state
  const user = await prisma.user.findUnique({
    where:  { email },
    select: { id: true, email: true, role: true },
  })

  if (!user) {
    console.error(`User not found: ${email}`)
    console.log('Available fixture users:')
    const all = await prisma.user.findMany({
      where:  { email: { contains: 'shareo-test' } },
      select: { id: true, email: true, role: true },
    })
    console.log(JSON.stringify(all, null, 2))
    return
  }

  console.log(`Found: ${user.email} | role: ${user.role}`)

  if (user.role === 'ADMIN') {
    console.log('Already ADMIN — nothing to do.')
    return
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data:  { role: 'ADMIN' },
    select: { id: true, email: true, role: true },
  })

  console.log(`✅ Promoted: ${updated.email} → role: ${updated.role}`)
}

main()
  .catch(e => { console.error(e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
