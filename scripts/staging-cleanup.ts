/**
 * ShareO — Limpeza do banco de staging (hard delete global com keep-list)
 * -----------------------------------------------------------------------
 * ATENÇÃO: Esta operação é IRREVERSÍVEL. Execute o backup do Supabase staging
 * antes de usar --confirm.
 *
 * Comportamento:
 *   SEM --confirm  → dry-run apenas: exibe keep-list e contagens. NÃO apaga nada.
 *   COM --confirm  → executa o hard delete global (exceto keep-list + configs).
 *
 * Keep-list (calculada por consulta):
 *   - roberto.epifanio* (e-mail parcial)
 *   - raimundo1965* (e-mail parcial)
 *   - Thiago Garbuio (nome parcial)
 *   - Qualquer usuário com role=ADMIN e e-mail @shareo.com.br
 *
 * O script ABORTA se algum dos 3 humanos não for encontrado.
 *
 * Uso:
 *   npx tsx scripts/staging-cleanup.ts                 # dry-run
 *   npx tsx scripts/staging-cleanup.ts --confirm       # hard delete (após backup!)
 */

import { loadEnvFile, makePrisma } from "./lib/sim-shared"

// ─────────────────────────────────────────────────────────────────────────────
// Setup do ambiente — SEMPRE staging
// ─────────────────────────────────────────────────────────────────────────────

if (!loadEnvFile(".env.staging-migrate")) {
  console.error("✗ .env.staging-migrate não encontrado. Necessário para rodar o cleanup.")
  process.exit(1)
}

const confirm = process.argv.includes("--confirm")

// ─────────────────────────────────────────────────────────────────────────────
// Resolução da keep-list
// ─────────────────────────────────────────────────────────────────────────────

async function resolveKeepList(prisma: ReturnType<typeof makePrisma>) {
  // Busca cada "humano" por critérios específicos
  const [robertoRows, raimundoRows, thiagoRows, adminRows] = await Promise.all([
    prisma.user.findMany({
      where: { email: { contains: "roberto.epifanio", mode: "insensitive" } },
      select: { id: true, name: true, email: true, role: true, userType: true },
    }),
    prisma.user.findMany({
      where: { email: { contains: "raimundo1965", mode: "insensitive" } },
      select: { id: true, name: true, email: true, role: true, userType: true },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: "Thiago Garbuio", mode: "insensitive" } },
          { email: { contains: "thiago", mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, role: true, userType: true },
    }),
    prisma.user.findMany({
      where: {
        role: "ADMIN",
        email: { endsWith: "@shareo.com.br" },
      },
      select: { id: true, name: true, email: true, role: true, userType: true },
    }),
  ])

  return { robertoRows, raimundoRows, thiagoRows, adminRows }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contagens do que seria apagado
// ─────────────────────────────────────────────────────────────────────────────

async function countToDelete(prisma: ReturnType<typeof makePrisma>, keepIds: string[]) {
  const [
    users, items, bookings, messages, conversations,
    payouts, platformTx, ambassadorCommissions, reviews,
    bookingPhotos, contractAcceptances, coupons,
    favorites, notifications, itemImages, ownerAccounts,
  ] = await Promise.all([
    prisma.user.count({ where: { id: { notIn: keepIds } } }),
    prisma.item.count({ where: { ownerId: { notIn: keepIds } } }),
    prisma.booking.count({
      where: { OR: [{ ownerId: { notIn: keepIds } }, { borrowerId: { notIn: keepIds } }] },
    }),
    // Messages: via conversations de bookings a deletar
    prisma.message.count({ where: { sender: { id: { notIn: keepIds } } } }),
    prisma.conversation.count({ where: { booking: { OR: [{ ownerId: { notIn: keepIds } }, { borrowerId: { notIn: keepIds } }] } } }),
    prisma.payout.count({ where: { booking: { OR: [{ ownerId: { notIn: keepIds } }, { borrowerId: { notIn: keepIds } }] } } }),
    prisma.platformTransaction.count({ where: { booking: { OR: [{ ownerId: { notIn: keepIds } }, { borrowerId: { notIn: keepIds } }] } } }),
    prisma.ambassadorCommission.count({ where: { ambassadorUserId: { notIn: keepIds } } }),
    prisma.review.count({ where: { OR: [{ reviewerId: { notIn: keepIds } }, { revieweeId: { notIn: keepIds } }] } }),
    prisma.bookingPhoto.count({ where: { booking: { OR: [{ ownerId: { notIn: keepIds } }, { borrowerId: { notIn: keepIds } }] } } }),
    prisma.contractAcceptance.count({ where: { booking: { OR: [{ ownerId: { notIn: keepIds } }, { borrowerId: { notIn: keepIds } }] } } }),
    prisma.coupon.count({ where: { userId: { notIn: keepIds } } }),
    prisma.favorite.count({ where: { OR: [{ userId: { notIn: keepIds } }, { item: { ownerId: { notIn: keepIds } } }] } }),
    prisma.notification.count({ where: { userId: { notIn: keepIds } } }),
    prisma.itemImage.count({ where: { item: { ownerId: { notIn: keepIds } } } }),
    prisma.ownerPaymentAccount.count({ where: { userId: { notIn: keepIds } } }),
  ])

  return {
    users, items, bookings, messages, conversations,
    payouts, platformTx, ambassadorCommissions, reviews,
    bookingPhotos, contractAcceptances, coupons,
    favorites, notifications, itemImages, ownerAccounts,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hard delete em ordem FK-safe (folha → raiz)
// ─────────────────────────────────────────────────────────────────────────────

async function hardDelete(
  prisma: ReturnType<typeof makePrisma>,
  keepIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}

  // Busca IDs das entidades para deleção granular
  const bookingsToDelete = await prisma.booking.findMany({
    where: {
      OR: [{ ownerId: { notIn: keepIds } }, { borrowerId: { notIn: keepIds } }],
    },
    select: { id: true },
  })
  const bIds = bookingsToDelete.map((b) => b.id)

  const itemsToDelete = await prisma.item.findMany({
    where: { ownerId: { notIn: keepIds } },
    select: { id: true },
  })
  const iIds = itemsToDelete.map((i) => i.id)

  const convsToDelete = await prisma.conversation.findMany({
    where: { bookingId: { in: bIds } },
    select: { id: true },
  })
  const cIds = convsToDelete.map((c) => c.id)

  const del = async (label: string, fn: () => Promise<{ count: number }>) => {
    const result = await fn()
    counts[label] = result.count
    console.log(`  ✓ ${label}: ${result.count} registro(s) deletado(s)`)
  }

  // Ordem: folhas primeiro, raízes por último
  await del("messages", () =>
    prisma.message.deleteMany({ where: { conversationId: { in: cIds } } }),
  )
  await del("conversationParticipants", () =>
    prisma.conversationParticipant.deleteMany({ where: { conversationId: { in: cIds } } }),
  )
  await del("conversations", () =>
    prisma.conversation.deleteMany({ where: { id: { in: cIds } } }),
  )
  await del("payouts", () =>
    prisma.payout.deleteMany({ where: { bookingId: { in: bIds } } }),
  )
  await del("platformTransactions", () =>
    prisma.platformTransaction.deleteMany({ where: { bookingId: { in: bIds } } }),
  )
  await del("ambassadorCommissions", () =>
    prisma.ambassadorCommission.deleteMany({ where: { bookingId: { in: bIds } } }),
  )
  await del("reviews", () =>
    prisma.review.deleteMany({ where: { bookingId: { in: bIds } } }),
  )
  await del("bookingPhotos", () =>
    prisma.bookingPhoto.deleteMany({ where: { bookingId: { in: bIds } } }),
  )
  await del("contractAcceptances", () =>
    prisma.contractAcceptance.deleteMany({ where: { bookingId: { in: bIds } } }),
  )
  await del("coupons", () =>
    prisma.coupon.deleteMany({ where: { userId: { notIn: keepIds } } }),
  )
  await del("bookings", () =>
    prisma.booking.deleteMany({ where: { id: { in: bIds } } }),
  )
  await del("favorites", () =>
    prisma.favorite.deleteMany({
      where: {
        OR: [{ itemId: { in: iIds } }, { userId: { notIn: keepIds } }],
      },
    }),
  )
  await del("notifications", () =>
    prisma.notification.deleteMany({ where: { userId: { notIn: keepIds } } }),
  )
  await del("itemImages", () =>
    prisma.itemImage.deleteMany({ where: { itemId: { in: iIds } } }),
  )
  await del("items", () =>
    prisma.item.deleteMany({ where: { id: { in: iIds } } }),
  )
  await del("ownerPaymentAccounts", () =>
    prisma.ownerPaymentAccount.deleteMany({ where: { userId: { notIn: keepIds } } }),
  )

  // Também limpa FounderLeads não vinculados a usuários da keep-list
  await del("founderLeads", () =>
    prisma.founderLead.deleteMany({
      where: {
        OR: [
          { convertedUserId: null },
          { convertedUserId: { notIn: keepIds } },
        ],
      },
    }),
  )

  // Referrals (limpa onde referrer ou referred não estão na keep-list)
  await del("referrals", () =>
    prisma.referral.deleteMany({
      where: {
        OR: [
          { referrerId: { notIn: keepIds } },
          { referredId: { notIn: keepIds } },
        ],
      },
    }),
  )

  // AmbassadorProfile (cascade já deve ter limpo, mas garantindo)
  await del("ambassadorProfiles", () =>
    prisma.ambassadorProfile.deleteMany({
      where: { userId: { notIn: keepIds } },
    }),
  )

  // Sessões NextAuth dos não-mantidos
  await del("sessions", () =>
    prisma.session.deleteMany({ where: { userId: { notIn: keepIds } } }),
  )
  await del("accounts", () =>
    prisma.account.deleteMany({ where: { userId: { notIn: keepIds } } }),
  )

  // AdminLog, ExportJob, OutboundWebhook têm FK para User — apagar antes dos usuários
  await del("adminLogs", () =>
    prisma.adminLog.deleteMany({ where: { adminId: { notIn: keepIds } } }),
  )
  await del("exportJobs", () =>
    prisma.exportJob.deleteMany({ where: { requestedBy: { notIn: keepIds } } }),
  )
  await del("outboundWebhooks", () =>
    prisma.outboundWebhook.deleteMany({ where: { userId: { notIn: keepIds } } }),
  )

  // Usuários — por último
  await del("users", () =>
    prisma.user.deleteMany({ where: { id: { notIn: keepIds } } }),
  )

  return counts
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\nShareO — Cleanup do staging")
  console.log("─".repeat(60))
  console.log(`Modo: ${confirm ? "⚠  HARD DELETE (--confirm)" : "DRY-RUN (somente leitura)"}`)
  console.log("─".repeat(60))

  const prisma = makePrisma()

  try {
    // 1. Resolver keep-list
    console.log("\n[1/3] Resolvendo keep-list...")
    const { robertoRows, raimundoRows, thiagoRows, adminRows } =
      await resolveKeepList(prisma)

    // Validação: os 3 humanos devem existir
    const missing: string[] = []
    if (robertoRows.length === 0) missing.push("roberto.epifanio*")
    if (raimundoRows.length === 0) missing.push("raimundo1965*")
    if (thiagoRows.length === 0) missing.push("Thiago Garbuio")

    if (missing.length > 0) {
      console.error(
        `\n✗ ABORTANDO — os seguintes usuários da keep-list NÃO foram encontrados no banco:\n  ${missing.join(", ")}\n\nVerifique se o banco é o correto (staging) e se os usuários existem.`,
      )
      process.exit(1)
    }

    // Montar keep-list deduplicada
    const keepMap = new Map<string, { name: string; email: string; role: string; userType: string; motivo: string }>()

    const addKeep = (rows: typeof robertoRows, motivo: string) => {
      for (const r of rows) {
        keepMap.set(r.id, {
          name: r.name,
          email: r.email,
          role: r.role,
          userType: r.userType,
          motivo,
        })
      }
    }

    addKeep(robertoRows, "humano (roberto.epifanio*)")
    addKeep(raimundoRows, "humano (raimundo1965*)")
    addKeep(thiagoRows, "humano (Thiago Garbuio)")
    addKeep(adminRows, "admin @shareo.com.br")

    const keepIds = [...keepMap.keys()]

    // 2. Exibir keep-list
    console.log(`\n[2/3] Keep-list (${keepIds.length} usuário(s) MANTIDO(S)):\n`)
    console.log(
      "  ID".padEnd(30) +
        "Nome".padEnd(26) +
        "E-mail".padEnd(35) +
        "Role".padEnd(12) +
        "Tipo".padEnd(6) +
        "Motivo",
    )
    console.log("  " + "─".repeat(115))
    for (const [id, info] of keepMap.entries()) {
      console.log(
        `  ${id.slice(0, 28).padEnd(30)}${info.name.slice(0, 24).padEnd(26)}${info.email.slice(0, 33).padEnd(35)}${info.role.padEnd(12)}${info.userType.padEnd(6)}${info.motivo}`,
      )
    }

    // 3. Contagens
    console.log("\n[3/3] Contagem do que SERIA apagado:\n")
    const counts = await countToDelete(prisma, keepIds)
    const total = Object.values(counts).reduce((s, n) => s + n, 0)
    const maxLabel = Math.max(...Object.keys(counts).map((k) => k.length))
    for (const [label, count] of Object.entries(counts)) {
      console.log(`  ${label.padEnd(maxLabel + 2)} ${String(count).padStart(6)} registro(s)`)
    }
    console.log(`\n  ${"TOTAL".padEnd(maxLabel + 2)} ${String(total).padStart(6)} registro(s)`)

    // 4. Executar (se --confirm)
    if (!confirm) {
      console.log(
        "\n⚠  DRY-RUN concluído — nenhum dado foi alterado.\n   Para executar o hard delete, rode com --confirm APÓS backup do Supabase.\n",
      )
      return
    }

    console.log("\n⚠  Iniciando hard delete em 3 segundos... (Ctrl+C para cancelar)")
    await new Promise((r) => setTimeout(r, 3000))

    console.log("\nExecutando hard delete em ordem FK-safe...\n")
    const deleted = await hardDelete(prisma, keepIds)
    const deletedTotal = Object.values(deleted).reduce((s, n) => s + n, 0)

    console.log(`\n✓ Hard delete concluído. ${deletedTotal} registros removidos.`)
    console.log(
      `  Mantidos: ${keepIds.length} usuário(s) (${keepMap
        .values()
        .next()
        .value?.motivo ?? ""} + admins)`,
    )
    console.log("\n  Preservados: Category, PlatformConfig, FounderBenefit, PlatformConfig (configs).\n")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("\n✗ Erro fatal:", e instanceof Error ? e.stack : e)
  process.exit(1)
})
