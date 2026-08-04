/**
 * provision-pix-validation.ts — provisiona no STAGING uma reserva em estado
 * CONFIRMED + pagamento PENDENTE, pronta para validar o checkout PIX manual:
 *
 *   Locatário (roberto.epifanio+locatario@gmail.com) vê o painel PIX, paga na
 *   chave da plataforma e clica "Já paguei" → admin confirma em /admin/reservas.
 *
 * Reusa as contas criadas em provision-return-validation.ts (senha Validacao@2026).
 * Idempotente: limpa a reserva/itens marcados antes de recriar.
 *
 * Uso: pnpm tsx scripts/provision-pix-validation.ts
 */
import fs from "node:fs"
import path from "node:path"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

function loadEnvOverride(file: string): boolean {
  const p = path.resolve(process.cwd(), file)
  if (!fs.existsSync(p)) return false
  for (const raw of fs.readFileSync(p, "utf8").split("\n")) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    process.env[m[1]] = v
  }
  return true
}

if (!loadEnvOverride(".env.staging-migrate")) {
  console.error("✗ .env.staging-migrate não encontrado"); process.exit(1)
}
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
const prisma = new PrismaClient({ datasourceUrl: directUrl })

const PASSWORD       = "Validacao@2026"
const BORROWER_EMAIL = "roberto.epifanio+locatario@gmail.com"
const OWNER_EMAIL    = "roberto.epifanio+locador@gmail.com"
const MARKER         = "VALIDACAO_PIX"
const ITEM_SLUG      = "validacao-pix-item"

async function upsertUser(email: string, name: string, hash: string) {
  const now = new Date()
  return prisma.user.upsert({
    where:  { email },
    update: { passwordHash: hash, isActive: true, emailVerified: now, profileCompletedAt: now },
    create: {
      email, name, passwordHash: hash, userType: "PF", role: "USER", isActive: true,
      emailVerified: now, profileCompletedAt: now, city: "São Paulo", state: "SP",
      consentAt: now, consentVersion: "v1.1",
    },
    select: { id: true, email: true },
  })
}

async function uniquePickupToken(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000))
    const clash = await prisma.booking.findFirst({ where: { pickupToken: candidate }, select: { id: true } })
    if (!clash) return candidate
  }
  throw new Error("não foi possível gerar pickupToken único")
}

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12)
  const borrower = await upsertUser(BORROWER_EMAIL, "Locatário Validação", hash)
  const owner    = await upsertUser(OWNER_EMAIL, "Locador Validação", hash)

  await prisma.booking.deleteMany({ where: { borrowerNote: MARKER, borrowerId: borrower.id, ownerId: owner.id } })
  await prisma.item.deleteMany({ where: { slug: ITEM_SLUG, ownerId: owner.id } })

  const category = await prisma.category.findFirst({ select: { id: true, name: true } })
  if (!category) throw new Error("nenhuma categoria no staging")

  const item = await prisma.item.create({
    data: {
      ownerId: owner.id, categoryId: category.id,
      title: "Betoneira 120L (validação PIX)", slug: ITEM_SLUG,
      description: "Item de teste para validação do checkout PIX manual.",
      condition: "GOOD", pricePerDay: 4500, city: "São Paulo", state: "SP",
      latitude: -23.5505, longitude: -46.6333, status: "AVAILABLE", isApproved: true, approvedAt: new Date(),
    },
    select: { id: true, title: true },
  })

  // Reserva CONFIRMED, pagamento PENDENTE (período no futuro p/ não ficar "atrasada")
  const now       = new Date()
  const startDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
  const endDate   = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
  const totalDays = 3
  const dailyPrice = 4500
  const totalPrice = dailyPrice * totalDays // R$135 (< teto R$500)
  const pickupToken = await uniquePickupToken()

  const booking = await prisma.booking.create({
    data: {
      itemId: item.id, borrowerId: borrower.id, ownerId: owner.id,
      status: "CONFIRMED", paymentStatus: "PENDING",
      startDate, endDate, totalDays, dailyPrice, totalPrice,
      borrowerNote: MARKER,
      respondedAt: now,            // locador já aceitou
      contractSignedAt: now,
      pickupToken,                 // gerado no confirm do locador (fluxo PIX/manual)
    },
    select: { id: true, status: true, paymentStatus: true },
  })

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://staging.shareo.com.br"
  console.log("\n✅ Reserva CONFIRMED + pagamento PENDENTE provisionada no STAGING\n")
  console.log("  Senha (ambas as contas):", PASSWORD)
  console.log("  Locatário:", borrower.email, `(${borrower.id})`)
  console.log("  Locador:  ", owner.email, `(${owner.id})`)
  console.log("  Item:     ", item.title)
  console.log("  Reserva:  ", booking.id, `→ ${booking.status} / ${booking.paymentStatus}`)
  console.log("  URL reserva (locatário):", `${base}/reservas/${booking.id}`)
  console.log("  URL admin (confirmar):  ", `${base}/admin/reservas/${booking.id}`)
  console.log("  Login:", `${base}/login`)
  console.log("")
}

main()
  .catch((e) => { console.error("✗ erro:", e instanceof Error ? e.message : e); process.exit(1) })
  .finally(() => prisma.$disconnect())
