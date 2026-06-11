import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

async function main() {
  const prisma = new PrismaClient()
  const hash = await bcrypt.hash("Fixture@Admin99", 12)
  const u = await prisma.user.update({
    where: { email: "admin.fixture@shareo-test.com" },
    data: { passwordHash: hash, isActive: true },
    select: { id: true, email: true, role: true, isActive: true }
  })
  console.log(JSON.stringify(u))
  await prisma.$disconnect()
}

main().catch(e => { console.error(e.message); process.exit(1) })
