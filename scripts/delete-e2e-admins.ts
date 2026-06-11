import { PrismaClient } from "@prisma/client"

async function main() {
  const prisma = new PrismaClient()
  const result = await prisma.user.deleteMany({
    where: { email: { contains: "admin.e2e." } }
  })
  console.log("deleted:", result.count)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e.message); process.exit(1) })
