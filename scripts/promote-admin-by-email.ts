import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Uso: node --env-file=.env.prod-run --import tsx scripts/promote-admin-by-email.ts <email>')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where:  { email },
    select: { id: true, email: true, role: true, adminRole: true },
  })

  if (!user) {
    console.error(`Usuário não encontrado: ${email}`)
    console.error('Confirme que a conta já foi criada via cadastro normal no ambiente de destino.')
    process.exit(1)
  }

  console.log(`Encontrado: ${user.email} | role: ${user.role} | adminRole: ${user.adminRole}`)

  const updated = await prisma.user.update({
    where:  { id: user.id },
    data:   { role: 'ADMIN', adminRole: 'ADMIN_SUPERADMIN' },
    select: { email: true, role: true, adminRole: true },
  })

  console.log(`✅ Promovido: ${updated.email} → role: ${updated.role}, adminRole: ${updated.adminRole}`)
}

main()
  .catch(e => { console.error(e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
