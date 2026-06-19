/**
 * seed-ambassador-demo.ts
 * Popula dados de demonstração do Programa de Embaixadores no staging.
 *
 * Cenário criado:
 *  - 3 embaixadores (Bronze, Silver, Gold)
 *  - 15 indicados (ACTIVE) + 3 (PENDING) + 2 (EXPIRED)
 *  - Comissões PENDING, APPROVED e PAID distribuídas
 *
 * Uso:
 *   npx tsx scripts/seed-ambassador-demo.ts [--staging]
 *
 * Com --staging, usa DATABASE_URL do .env.staging-migrate.
 */

import * as fs from "fs"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const isStaging = process.argv.includes("--staging")

function loadEnv() {
  if (isStaging) {
    const envContent = fs.readFileSync(".env.staging-migrate", "utf-8")
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const val = match[2].trim().replace(/^["']|["']$/g, "")
        process.env[key] = val
      }
    }
    console.log("🔧 Usando banco de STAGING")
  } else {
    // Carrega .env local
    const envContent = fs.existsSync(".env") ? fs.readFileSync(".env", "utf-8") : ""
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const val = match[2].trim().replace(/^["']|["']$/g, "")
        if (!process.env[key]) process.env[key] = val
      }
    }
    console.log("🔧 Usando banco LOCAL (.env)")
  }
}

loadEnv()
const prisma = new PrismaClient()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ago(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

async function upsertUser(data: {
  email:    string
  name:     string
  city:     string
  state:    string
  latitude: number
  longitude: number
}) {
  return prisma.user.upsert({
    where:  { email: data.email },
    update: {},
    create: {
      email:          data.email,
      passwordHash:   await bcrypt.hash("Shareo@2026", 10),
      name:           data.name,
      userType:       "PF",
      isVerified:     true,
      city:           data.city,
      state:          data.state,
      latitude:       data.latitude,
      longitude:      data.longitude,
      consentAt:      ago(120),
      consentVersion: "v1.0",
    },
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Seed — Programa de Embaixadores\n")

  // ── 1. Usuário dono dos itens de referência (usa o admin existente) ──────────
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  if (!adminUser) throw new Error("Admin não encontrado — rode o seed principal primeiro.")

  const item = await prisma.item.findFirst({
    where: { status: "AVAILABLE", deletedAt: null },
  })
  if (!item) throw new Error("Nenhum item disponível — rode o seed principal primeiro.")

  // ── 2. Embaixadores ──────────────────────────────────────────────────────────

  const [emb1, emb2, emb3] = await Promise.all([
    upsertUser({
      email:     "emb.bronze@shareo-demo.com",
      name:      "Carlos Embaixador (Bronze)",
      city:      "São Paulo",
      state:     "SP",
      latitude:  -23.5505,
      longitude: -46.6333,
    }),
    upsertUser({
      email:     "emb.silver@shareo-demo.com",
      name:      "Ana Embaixadora (Prata)",
      city:      "Rio de Janeiro",
      state:     "RJ",
      latitude:  -22.9068,
      longitude: -43.1729,
    }),
    upsertUser({
      email:     "emb.gold@shareo-demo.com",
      name:      "Roberto Embaixador (Ouro)",
      city:      "Belo Horizonte",
      state:     "MG",
      latitude:  -19.9167,
      longitude: -43.9345,
    }),
  ])

  console.log("✅ 3 embaixadores criados/encontrados")

  // ── 3. Indicados (20 usuários) ───────────────────────────────────────────────

  const referredData = [
    // Bronze (Carlos): 5 ACTIVE, 2 PENDING, 1 EXPIRED
    { email: "ref-b1@shareo-demo.com", name: "Indicado Bronze 1",  status: "ACTIVE",   ambassadorIdx: 0, daysAgo: 25 },
    { email: "ref-b2@shareo-demo.com", name: "Indicado Bronze 2",  status: "ACTIVE",   ambassadorIdx: 0, daysAgo: 20 },
    { email: "ref-b3@shareo-demo.com", name: "Indicado Bronze 3",  status: "ACTIVE",   ambassadorIdx: 0, daysAgo: 18 },
    { email: "ref-b4@shareo-demo.com", name: "Indicado Bronze 4",  status: "ACTIVE",   ambassadorIdx: 0, daysAgo: 15 },
    { email: "ref-b5@shareo-demo.com", name: "Indicado Bronze 5",  status: "ACTIVE",   ambassadorIdx: 0, daysAgo: 10 },
    { email: "ref-b6@shareo-demo.com", name: "Indicado Bronze 6",  status: "PENDING",  ambassadorIdx: 0, daysAgo: 5  },
    { email: "ref-b7@shareo-demo.com", name: "Indicado Bronze 7",  status: "PENDING",  ambassadorIdx: 0, daysAgo: 2  },
    { email: "ref-b8@shareo-demo.com", name: "Indicado Bronze 8",  status: "EXPIRED",  ambassadorIdx: 0, daysAgo: 90 },

    // Silver (Ana): 12 ACTIVE, 1 PENDING, 1 EXPIRED
    { email: "ref-s1@shareo-demo.com",  name: "Indicado Prata 1",   status: "ACTIVE",   ambassadorIdx: 1, daysAgo: 60 },
    { email: "ref-s2@shareo-demo.com",  name: "Indicado Prata 2",   status: "ACTIVE",   ambassadorIdx: 1, daysAgo: 55 },
    { email: "ref-s3@shareo-demo.com",  name: "Indicado Prata 3",   status: "ACTIVE",   ambassadorIdx: 1, daysAgo: 50 },
    { email: "ref-s4@shareo-demo.com",  name: "Indicado Prata 4",   status: "ACTIVE",   ambassadorIdx: 1, daysAgo: 45 },
    { email: "ref-s5@shareo-demo.com",  name: "Indicado Prata 5",   status: "ACTIVE",   ambassadorIdx: 1, daysAgo: 40 },
    { email: "ref-s6@shareo-demo.com",  name: "Indicado Prata 6",   status: "ACTIVE",   ambassadorIdx: 1, daysAgo: 35 },
    { email: "ref-s7@shareo-demo.com",  name: "Indicado Prata 7",   status: "ACTIVE",   ambassadorIdx: 1, daysAgo: 30 },
    { email: "ref-s8@shareo-demo.com",  name: "Indicado Prata 8",   status: "ACTIVE",   ambassadorIdx: 1, daysAgo: 25 },
    { email: "ref-s9@shareo-demo.com",  name: "Indicado Prata 9",   status: "ACTIVE",   ambassadorIdx: 1, daysAgo: 20 },
    { email: "ref-s10@shareo-demo.com", name: "Indicado Prata 10",  status: "ACTIVE",   ambassadorIdx: 1, daysAgo: 15 },
    { email: "ref-s11@shareo-demo.com", name: "Indicado Prata 11",  status: "ACTIVE",   ambassadorIdx: 1, daysAgo: 12 },
    { email: "ref-s12@shareo-demo.com", name: "Indicado Prata 12",  status: "ACTIVE",   ambassadorIdx: 1, daysAgo: 8  },
    { email: "ref-s13@shareo-demo.com", name: "Indicado Prata 13",  status: "PENDING",  ambassadorIdx: 1, daysAgo: 3  },
    { email: "ref-s14@shareo-demo.com", name: "Indicado Prata 14",  status: "EXPIRED",  ambassadorIdx: 1, daysAgo: 100},

    // Gold (Roberto): 55 ACTIVE — para ficar no tier GOLD (51+)
    // Criamos 10 reais no banco, o resto denormalizado via activeReferralsCnt
    { email: "ref-g1@shareo-demo.com",  name: "Indicado Ouro 1",   status: "ACTIVE",   ambassadorIdx: 2, daysAgo: 80 },
    { email: "ref-g2@shareo-demo.com",  name: "Indicado Ouro 2",   status: "ACTIVE",   ambassadorIdx: 2, daysAgo: 75 },
    { email: "ref-g3@shareo-demo.com",  name: "Indicado Ouro 3",   status: "ACTIVE",   ambassadorIdx: 2, daysAgo: 70 },
    { email: "ref-g4@shareo-demo.com",  name: "Indicado Ouro 4",   status: "ACTIVE",   ambassadorIdx: 2, daysAgo: 65 },
    { email: "ref-g5@shareo-demo.com",  name: "Indicado Ouro 5",   status: "ACTIVE",   ambassadorIdx: 2, daysAgo: 60 },
    { email: "ref-g6@shareo-demo.com",  name: "Indicado Ouro 6",   status: "ACTIVE",   ambassadorIdx: 2, daysAgo: 55 },
    { email: "ref-g7@shareo-demo.com",  name: "Indicado Ouro 7",   status: "ACTIVE",   ambassadorIdx: 2, daysAgo: 50 },
    { email: "ref-g8@shareo-demo.com",  name: "Indicado Ouro 8",   status: "ACTIVE",   ambassadorIdx: 2, daysAgo: 45 },
    { email: "ref-g9@shareo-demo.com",  name: "Indicado Ouro 9",   status: "ACTIVE",   ambassadorIdx: 2, daysAgo: 40 },
    { email: "ref-g10@shareo-demo.com", name: "Indicado Ouro 10",  status: "ACTIVE",   ambassadorIdx: 2, daysAgo: 35 },
  ]

  const ambassadors = [emb1, emb2, emb3]
  const hashPwd = await bcrypt.hash("Shareo@2026", 10)

  const referredUsers = await Promise.all(
    referredData.map((r) =>
      prisma.user.upsert({
        where:  { email: r.email },
        update: {},
        create: {
          email:          r.email,
          passwordHash:   hashPwd,
          name:           r.name,
          userType:       "PF",
          isVerified:     true,
          city:           "São Paulo",
          state:          "SP",
          latitude:       -23.5505,
          longitude:      -46.6333,
          consentAt:      ago(r.daysAgo + 5),
          consentVersion: "v1.0",
        },
      })
    )
  )

  console.log(`✅ ${referredUsers.length} usuários indicados criados/encontrados`)

  // ── 4. AmbassadorProfile ──────────────────────────────────────────────────────

  // Contagens reais de ACTIVE por embaixador
  const activeCounts = [5, 12, 10] // bronze, silver, gold (reais no DB)
  const tiers: ("BRONZE" | "SILVER" | "GOLD")[] = ["BRONZE", "SILVER", "GOLD"]
  // Para Gold: denormaliza como 55 para refletir tier (51+ = GOLD)
  const denormalizedActive = [5, 12, 55]

  // Comissões acumuladas aproximadas em centavos
  const pendingCents  = [45000, 185000, 620000]
  const paidCents     = [0,     52000,  240000]

  const profiles = await Promise.all(
    ambassadors.map((emb, i) =>
      prisma.ambassadorProfile.upsert({
        where:  { userId: emb.id },
        update: {
          currentTier:                tiers[i],
          activeReferralsCnt:         denormalizedActive[i],
          totalCommissionPendingCents: pendingCents[i],
          totalCommissionPaidCents:    paidCents[i],
        },
        create: {
          userId:                      emb.id,
          currentTier:                 tiers[i],
          activeReferralsCnt:          denormalizedActive[i],
          totalCommissionPendingCents: pendingCents[i],
          totalCommissionPaidCents:    paidCents[i],
          consentAt:                   ago(120),
          consentVersion:              "v1.0",
          consentIp:                   "127.0.0.1",
        },
      })
    )
  )

  console.log("✅ 3 AmbassadorProfile criados/atualizados")

  // ── 5. Referrals ──────────────────────────────────────────────────────────────

  let referralCount = 0
  const referralMap: Record<string, { id: string; ambassadorIdx: number }> = {}

  for (let i = 0; i < referredData.length; i++) {
    const r     = referredData[i]
    const refer = referredUsers[i]
    const emb   = ambassadors[r.ambassadorIdx]

    // Checa se já existe (unique [referrerId, referredId])
    const existing = await prisma.referral.findFirst({
      where: { referrerId: emb.id, referredId: refer.id },
    })
    if (existing) {
      referralMap[refer.id] = { id: existing.id, ambassadorIdx: r.ambassadorIdx }
      continue
    }

    const referral = await prisma.referral.create({
      data: {
        referrerId:  emb.id,
        referredId:  refer.id,
        status:      r.status as "PENDING" | "ACTIVE" | "EXPIRED",
        createdAt:   ago(r.daysAgo),
        activatedAt: r.status === "ACTIVE" ? ago(r.daysAgo - 2) : undefined,
        expiredAt:   r.status === "EXPIRED" ? ago(30)            : undefined,
      },
    })
    referralMap[refer.id] = { id: referral.id, ambassadorIdx: r.ambassadorIdx }
    referralCount++
  }

  console.log(`✅ ${referralCount} Referrals criados (${referredData.length - referralCount} já existiam)`)

  // ── 6. Bookings + Commissions (só para ACTIVE) ───────────────────────────────

  const tierBp: Record<string, number> = { BRONZE: 300, SILVER: 500, GOLD: 700 }
  const PLATFORM_FEE_RATE = 1500 // 15% em basis points

  // Comissões por indicado ACTIVE: 1–3 bookings cada
  const activeReferreds = referredData
    .map((r, i) => ({ ...r, user: referredUsers[i] }))
    .filter((r) => r.status === "ACTIVE")

  let bookingCount = 0
  let commissionCount = 0

  for (const r of activeReferreds) {
    const { id: referralId, ambassadorIdx } = referralMap[r.user.id] ?? {}
    if (!referralId) continue

    const profile = profiles[ambassadorIdx]
    const emb     = ambassadors[ambassadorIdx]
    const bp      = tierBp[tiers[ambassadorIdx]]

    // 1–2 bookings por indicado ACTIVE (variação para dados mais realistas)
    const numBookings = ambassadorIdx === 2 ? 2 : 1

    for (let b = 0; b < numBookings; b++) {
      const daysAgo    = r.daysAgo - b * 7
      const totalPrice = [7000, 14000, 10000, 21000, 5000][Math.floor(Math.random() * 5)]
      const platFee    = Math.round(totalPrice * PLATFORM_FEE_RATE / 10000)
      const commission = Math.round(platFee * bp / 10000)

      // Determina status da comissão baseado na idade do booking
      const commStatus: "PENDING" | "APPROVED" | "PAID" =
        daysAgo > 30 ? "APPROVED" :
        daysAgo > 8  ? "PENDING"  : "PENDING"

      // Checa se booking fake já existe (slug único via stripeSessionId)
      const fakeSessionId = `cs_demo_${r.user.id}_${b}`
      const existingBooking = await prisma.booking.findUnique({
        where: { stripeSessionId: fakeSessionId },
      })

      let bookingId: string
      if (existingBooking) {
        bookingId = existingBooking.id
      } else {
        const booking = await prisma.booking.create({
          data: {
            itemId:               item.id,
            borrowerId:           r.user.id,
            ownerId:              adminUser.id,
            status:               "COMPLETED",
            paymentStatus:        "PAID",
            startDate:            ago(daysAgo + 3),
            endDate:              ago(daysAgo),
            totalDays:            3,
            dailyPrice:           item.pricePerDay,
            totalPrice,
            platformFeeRate:      PLATFORM_FEE_RATE,
            platformFeeAmount:    platFee,
            ownerNetAmount:       totalPrice - platFee,
            paidAt:               ago(daysAgo + 3),
            stripeSessionId:      fakeSessionId,
            stripePaymentIntentId: `pi_demo_${r.user.id}_${b}`,
            createdAt:            ago(daysAgo + 4),
          },
        })
        bookingId = booking.id
        bookingCount++
      }

      // Comissão
      const existingComm = await prisma.ambassadorCommission.findFirst({
        where: { bookingId, referralId },
      })
      if (!existingComm) {
        await prisma.ambassadorCommission.create({
          data: {
            ambassadorProfileId: profile.id,
            ambassadorUserId:    emb.id,
            referralId,
            bookingId,
            tierSnapshot:        tiers[ambassadorIdx],
            tierPercentBp:       bp,
            platformFeeAmount:   platFee,
            amountCents:         commission,
            status:              commStatus,
            approvedAt:          commStatus === "APPROVED" ? ago(daysAgo - 7) : undefined,
            createdAt:           ago(daysAgo + 3),
          },
        })
        commissionCount++
      }
    }
  }

  console.log(`✅ ${bookingCount} bookings demo criados`)
  console.log(`✅ ${commissionCount} comissões criadas`)

  // ── 7. Resumo ─────────────────────────────────────────────────────────────────

  const totals = await Promise.all([
    prisma.ambassadorProfile.count(),
    prisma.referral.count(),
    prisma.ambassadorCommission.count(),
  ])

  console.log("\n📊 Totais no banco após seed:")
  console.log(`   AmbassadorProfile: ${totals[0]}`)
  console.log(`   Referral:          ${totals[1]}`)
  console.log(`   Commission:        ${totals[2]}`)
  console.log("\n✅ Seed de embaixadores concluído!\n")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
