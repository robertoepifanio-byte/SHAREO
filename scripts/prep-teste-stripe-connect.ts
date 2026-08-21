/**
 * prep-teste-stripe-connect.ts — prepara os dados de STAGING para o roteiro
 * docs/testes/roteiro-teste-stripe-connect.md (ADR-028).
 *
 * O que cria (tudo idempotente, tudo INSERT — nada é apagado ou sobrescrito):
 *   1. telefone nos usuários fixture (o registro deixou null)
 *   2. um item do proprietário fixture, AVAILABLE, com foto, R$ 35/dia
 *   3. três reservas CONFIRMED e NÃO pagas, prontas para os passos 2.3 / 2.4 / 2.5
 *      (crédito aprovado, débito aprovado, cartão recusado) — datas sem sobreposição
 *
 * O que NÃO faz, de propósito:
 *   - não cria OwnerPaymentAccount para o proprietário fixture. Essa linha tem
 *     que nascer do onboarding real da fase 1, senão o teste do Connect vira
 *     encenação. `getOrCreateConnectedAccount` faz upsert e preencheria o
 *     `stripeAccountId` depois, mas aí não teríamos provado o caminho.
 *   - não paga nada, não cria Payout, não chama a Stripe.
 *   - NUNCA roda reset. A base demo de staging é compartilhada.
 *
 * Comportamento:
 *   SEM --confirm  → dry-run: lista o que faria. NÃO grava.
 *   COM --confirm  → grava.
 *
 * Uso:
 *   npx tsx scripts/prep-teste-stripe-connect.ts
 *   npx tsx scripts/prep-teste-stripe-connect.ts --confirm
 */
import { loadEnvFile, makePrisma, reaisToCents, fmtBRL } from "./lib/sim-shared"
import { derivePrices } from "./lib/demo-catalog"
import { FIXTURE_LOCATARIO, FIXTURE_PROPRIETARIO } from "../e2e/fixtures/test-credentials"

if (!loadEnvFile(".env.staging-migrate")) {
  console.error("✗ .env.staging-migrate não encontrado — é ele que aponta para o shareo-staging.")
  process.exit(1)
}

const confirm = process.argv.includes("--confirm")

/** Marca tudo que este script cria, para dar pra achar e limpar depois. */
const TAG = "[ADR-028 TESTE]"

const ITEM_TITLE = `Furadeira de Impacto 650W ${TAG}`
/** R$ 35,00 — diária de referência de "ferramentas" (CLAUDE.md). */
const PRICE_PER_DAY = reaisToCents(35)
/** Semana = 3× diária, mês = 15× — mesma regra dos seeds, sem recopiar. */
const PRICES = derivePrices(35)

/** Reservas do roteiro: 3 dias cada, R$ 105,00 — bem abaixo do teto de R$ 500. */
const RESERVAS = [
  { rotulo: "2.3 — crédito aprovado (4242…)",  offsetDias: 7 },
  { rotulo: "2.4 — débito aprovado (4000 0566…)", offsetDias: 14 },
  { rotulo: "2.5 — cartão recusado (…0002)",   offsetDias: 21 },
]

const DIAS_POR_RESERVA = 3

function emDias(n: number): Date {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + n)
  return d
}

async function main() {
  console.log("\nShareO — Preparar staging para o roteiro Stripe Connect (ADR-028)")
  console.log("─".repeat(66))
  console.log(`Modo: ${confirm ? "⚠  GRAVANDO (--confirm)" : "DRY-RUN (somente leitura)"}`)
  console.log("─".repeat(66))

  const prisma = makePrisma()

  try {
    // ── Usuários ────────────────────────────────────────────────────────────
    const [locatario, proprietario] = await Promise.all([
      prisma.user.findUnique({
        where:  { email: FIXTURE_LOCATARIO.email },
        select: { id: true, phone: true },
      }),
      prisma.user.findUnique({
        where:  { email: FIXTURE_PROPRIETARIO.email },
        select: { id: true, phone: true },
      }),
    ])

    if (!locatario || !proprietario) {
      console.error("\n✗ Usuários fixture não encontrados no staging.")
      console.error("  Rode antes: npx tsx scripts/create-staging-fixtures.ts")
      process.exit(1)
    }

    console.log(`\n1. Usuários fixture`)
    console.log(`   locatário    ${FIXTURE_LOCATARIO.email}    (${locatario.id})`)
    console.log(`   proprietário ${FIXTURE_PROPRIETARIO.email} (${proprietario.id})`)

    const semTelefone = [
      { u: locatario,    email: FIXTURE_LOCATARIO.email,    phone: FIXTURE_LOCATARIO.phone },
      { u: proprietario, email: FIXTURE_PROPRIETARIO.email, phone: FIXTURE_PROPRIETARIO.phone },
    ].filter((x) => !x.u.phone)

    if (semTelefone.length === 0) {
      console.log(`   telefone: já preenchido nos dois`)
    } else {
      for (const x of semTelefone) {
        console.log(`   telefone: ${confirm ? "gravando" : "gravaria"} ${x.phone} em ${x.email}`)
        if (confirm) await prisma.user.update({ where: { id: x.u.id }, data: { phone: x.phone } })
      }
    }

    // ── Item ────────────────────────────────────────────────────────────────
    console.log(`\n2. Item do proprietário`)

    let item = await prisma.item.findFirst({
      where:  { ownerId: proprietario.id, title: ITEM_TITLE, deletedAt: null },
      select: { id: true, title: true, status: true },
    })

    if (item) {
      console.log(`   já existe: ${item.title} [${item.status}] (${item.id})`)
    } else if (!confirm) {
      console.log(`   criaria: ${ITEM_TITLE} — ${fmtBRL(PRICE_PER_DAY)}/dia, AVAILABLE, 1 foto`)
    } else {
      const categoria = await prisma.category.findUnique({ where: { slug: "ferramentas" }, select: { id: true } })
      if (!categoria) throw new Error('Categoria "ferramentas" não existe no staging.')

      item = await prisma.item.create({
        data: {
          ownerId:     proprietario.id,
          categoryId:  categoria.id,
          title:       ITEM_TITLE,
          description: `Item criado para o roteiro de teste do Stripe Connect (ADR-028). ${TAG} — não é um anúncio real.`,
          condition:   "GOOD",
          ...PRICES,
          estimatedRetailPrice: Math.round(PRICE_PER_DAY / 0.04), // diária ≈ 4% do valor do bem
          city:         FIXTURE_PROPRIETARIO.city,
          state:        FIXTURE_PROPRIETARIO.state,
          neighborhood: "Centro",
          latitude:     -5.7945,
          longitude:    -35.211,
          status:       "AVAILABLE",
          isApproved:   true,
          approvedAt:   new Date(),
          images: { create: [{ url: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80&fit=crop", order: 0 }] },
        },
        select: { id: true, title: true, status: true },
      })
      console.log(`   ✓ criado: ${item.title} (${item.id})`)
    }

    // ── Reservas ────────────────────────────────────────────────────────────
    console.log(`\n3. Reservas CONFIRMED, aguardando pagamento`)

    if (!item) console.log(`   (o item ainda não existe no dry-run — as 3 reservas nasceriam sobre ele)`)

    for (const r of RESERVAS) {
      const inicio = emDias(r.offsetDias)
      const fim    = emDias(r.offsetDias + DIAS_POR_RESERVA)
      const total  = PRICE_PER_DAY * DIAS_POR_RESERVA
      const quando = `${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}, ${fmtBRL(total)}`

      // Sem item ainda (só possível em dry-run) não há o que consultar.
      const existente = item
        ? await prisma.booking.findFirst({
            where:  { itemId: item.id, borrowerId: locatario.id, startDate: inicio },
            select: { id: true, status: true, paymentStatus: true },
          })
        : null

      if (existente) {
        console.log(`   já existe — ${r.rotulo}: ${existente.id} [${existente.status}/${existente.paymentStatus}]`)
        continue
      }

      if (!confirm || !item) {
        console.log(`   criaria — ${r.rotulo}: ${quando}`)
        continue
      }

      const booking = await prisma.booking.create({
        data: {
          itemId:     item.id,
          borrowerId: locatario.id,
          ownerId:    proprietario.id,
          status:     "CONFIRMED", // já confirmada: o checkout só abre a partir daqui
          startDate:  inicio,
          endDate:    fim,
          totalDays:  DIAS_POR_RESERVA,
          dailyPrice: PRICE_PER_DAY,
          totalPrice: total,
          borrowerNote: `${TAG} ${r.rotulo}`,
        },
        select: { id: true },
      })
      console.log(`   ✓ ${r.rotulo}: ${booking.id}`)
      console.log(`     → /reservas/${booking.id}`)
    }

    // ── Fase 5.6: proprietário SEM Connect ──────────────────────────────────
    console.log(`\n4. Fase 5.6 — proprietário sem conta Connect (repasse manual via PIX)`)
    const semConnect = await prisma.ownerPaymentAccount.findFirst({
      where: {
        stripeAccountId: null,
        status:          "VERIFIED",
        user:            { items: { some: { status: "AVAILABLE", deletedAt: null } } },
      },
      select: { id: true, user: { select: { email: true } } },
    })
    if (semConnect) {
      console.log(`   usar: ${semConnect.user.email} — já tem conta PIX VERIFIED e nenhuma conta Stripe.`)
      console.log(`   Nada a criar. É o caminho de convivência com o modelo antigo.`)
    } else {
      console.log(`   ⚠ nenhum proprietário elegível encontrado — a fase 5.6 precisa de um.`)
    }

    // ── Fechamento ──────────────────────────────────────────────────────────
    console.log("\n" + "─".repeat(66))
    if (!confirm) {
      console.log("DRY-RUN concluído — nada foi gravado.")
      console.log("Para gravar: npx tsx scripts/prep-teste-stripe-connect.ts --confirm")
    } else {
      console.log("✓ Staging preparado.")
      console.log(`\nPróximo passo do roteiro: FASE 1 (onboarding do proprietário).`)
      console.log(`  Entre como ${FIXTURE_PROPRIETARIO.email} e vá em /perfil/recebimentos.`)
      console.log(`  A fase 1 é pré-requisito da fase 4 — sem OwnerPaymentAccount, o Payout`)
      console.log(`  não nasce e o erro só aparece no log.`)
      console.log(`\nPara achar tudo que este script criou depois: buscar por "${TAG}".`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("\n✗ Erro fatal:", e instanceof Error ? e.stack : e)
  process.exit(1)
})
