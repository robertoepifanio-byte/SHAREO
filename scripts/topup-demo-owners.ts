/**
 * Top-up da base demo: garante que cada anunciante DEMO tenha pelo menos N itens
 * AVAILABLE, para que o quadro "Ou itens do mesmo anunciante" (Story B) apareça com
 * frequência ao navegar.
 *
 * - Só mexe em contas @demo.shareo.com.br (NÃO toca humanos/admins/daily-sim).
 * - Aditivo: apenas CRIA itens (clonando conteúdo de itens reais existentes — foto,
 *   categoria, preço), co-localizados no endereço do próprio anunciante. NÃO deleta nada.
 * - Dry-run por padrão; aplica de verdade só com --confirm.
 *
 * Uso (apontando para o staging):
 *   set -a; . ./.env.staging-migrate; set +a
 *   npx tsx scripts/topup-demo-owners.ts            # dry-run
 *   npx tsx scripts/topup-demo-owners.ts --confirm  # aplica
 */
import { prisma } from "../lib/prisma"

const TARGET = 3                      // itens AVAILABLE desejados por anunciante demo
// Só contas de TESTE (NÃO toca humanos nem admins @shareo.com.br)
const DEMO_SUFFIXES = ["@demo.shareo.com.br", "@daily-sim.shareo.test"]
const APPLY = process.argv.includes("--confirm")

type PoolItem = {
  title: string; description: string; categoryId: string
  pricePerDay: number; pricePerWeek: number | null; pricePerMonth: number | null
  condition: import("@prisma/client").ItemCondition
  images: { url: string; order: number }[]
}

function pickDistinct<T>(arr: T[], n: number, rng = Math.random): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0])
  return out
}

async function main() {
  // Pool de clonagem: itens AVAILABLE com foto (conteúdo válido garantido)
  const pool = (await prisma.item.findMany({
    where: { status: "AVAILABLE", isApproved: true, deletedAt: null, images: { some: {} } },
    select: {
      title: true, description: true, categoryId: true,
      pricePerDay: true, pricePerWeek: true, pricePerMonth: true, condition: true,
      images: { select: { url: true, order: true }, orderBy: { order: "asc" }, take: 3 },
    },
    take: 300,
  })) as PoolItem[]

  // Anunciantes demo + seus itens AVAILABLE (com local de referência)
  const owners = await prisma.user.findMany({
    where: { OR: DEMO_SUFFIXES.map((s) => ({ email: { endsWith: s } })) },
    select: {
      id: true, name: true,
      items: {
        where: { status: "AVAILABLE", isApproved: true, deletedAt: null },
        select: { title: true, city: true, state: true, neighborhood: true, latitude: true, longitude: true },
      },
    },
  })

  let totalToCreate = 0
  const plan: { ownerId: string; name: string; have: number; create: number }[] = []
  for (const o of owners) {
    const have = o.items.length
    if (have === 0 || have >= TARGET) continue // sem referência de local OU já satisfeito
    const create = TARGET - have
    plan.push({ ownerId: o.id, name: o.name, have, create })
    totalToCreate += create
  }

  console.log(`Anunciantes demo: ${owners.length} | a completar p/ ${TARGET}: ${plan.length} | itens a criar: ${totalToCreate}`)
  console.log(`Modo: ${APPLY ? "APLICAR (--confirm)" : "DRY-RUN (use --confirm p/ aplicar)"}\n`)
  plan.slice(0, 8).forEach((p) => console.log(`  ${p.name}: tem ${p.have} → criar ${p.create}`))
  if (plan.length > 8) console.log(`  … +${plan.length - 8} anunciantes`)

  if (!APPLY) { console.log("\n(dry-run — nada foi gravado)"); return }

  let created = 0
  for (const o of owners) {
    const have = o.items.length
    if (have === 0 || have >= TARGET) continue
    const ref = o.items[0] // endereço de referência do anunciante
    const existingTitles = new Set(o.items.map((i) => i.title))
    const sources = pickDistinct(pool.filter((p) => !existingTitles.has(p.title)), TARGET - have)
    for (const src of sources) {
      await prisma.item.create({
        data: {
          ownerId: o.id,
          categoryId: src.categoryId,
          title: src.title,
          description: src.description,
          condition: src.condition,
          pricePerDay: src.pricePerDay,
          pricePerWeek: src.pricePerWeek,
          pricePerMonth: src.pricePerMonth,
          city: ref.city,
          state: ref.state,
          neighborhood: ref.neighborhood,
          latitude: ref.latitude,
          longitude: ref.longitude,
          status: "AVAILABLE",
          isApproved: true,
          images: { create: src.images.map((im) => ({ url: im.url, order: im.order })) },
        },
      })
      created++
    }
  }
  console.log(`\n✅ Itens criados: ${created}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
