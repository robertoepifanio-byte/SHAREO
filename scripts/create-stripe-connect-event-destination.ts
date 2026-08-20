/**
 * create-stripe-connect-event-destination.ts — cria o Event Destination v2
 * (ADR-028, pendência "Webhooks de Connect") que entrega eventos "thin" de
 * mudança de status das connected accounts (Accounts v2) para
 * app/api/webhooks/stripe-connect/route.ts.
 *
 * Contas v2 não disparam o webhook clássico `account.updated` (v1) — sem
 * este Event Destination configurado no lado Stripe, aquela rota nunca
 * recebe nada e a sincronização de status continua dependendo só do retorno
 * do onboarding (ver comentário no topo da rota).
 *
 * Quais eventos são assinados: lib/stripe-connect-events.ts (mesma constante
 * que a rota trata — a lista NÃO se repete aqui de propósito, senão as duas
 * divergem em silêncio).
 *
 * Idempotente: lista os destinations existentes antes de criar — se já
 * existir um apontando pra mesma URL, não duplica.
 *
 * IMPORTANTE: a Stripe só devolve o `signing_secret` UMA VEZ, na criação
 * (`include: ["webhook_endpoint.signing_secret"]`). Esse valor precisa virar
 * a env var STRIPE_CONNECT_WEBHOOK_SECRET — nos DOIS lados (mesmo gotcha do
 * CLAUDE.md p/ troca de banco): Vercel (runtime) E, se algum dia isso rodar
 * em CI, GitHub Secrets. Este script só IMPRIME o valor — não grava em
 * nenhum lugar (não temos acesso de escrita a Vercel/GitHub daqui).
 *
 * Comportamento:
 *   SEM --confirm  → dry-run: mostra o que seria criado (URL, eventos). NÃO cria.
 *   COM --confirm  → cria de verdade via API e imprime o signing_secret.
 *
 * Uso:
 *   pnpm tsx scripts/create-stripe-connect-event-destination.ts                                    # dry-run, URL default (staging)
 *   pnpm tsx scripts/create-stripe-connect-event-destination.ts --confirm                           # cria
 *   pnpm tsx scripts/create-stripe-connect-event-destination.ts --confirm --url=https://outro.com   # outra URL
 */
import { loadEnvFile } from "./lib/sim-shared"
import { getStripe } from "../lib/stripe"
import { STRIPE_CONNECT_EVENT_TYPES, STRIPE_CONNECT_WEBHOOK_PATH } from "../lib/stripe-connect-events"

const DEFAULT_URL = "https://staging.shareo.com.br"
// Mesma lista que a rota trata (lib/stripe-connect-events.ts) — assinar e
// tratar a partir da mesma fonte evita assinar um evento que ninguém trata.
const ENABLED_EVENTS = [...STRIPE_CONNECT_EVENT_TYPES]

if (!loadEnvFile(".env.local")) {
  console.error("✗ .env.local não encontrado. Necessário para STRIPE_SECRET_KEY.")
  process.exit(1)
}

const confirm  = process.argv.includes("--confirm")
const urlArg   = process.argv.find((a) => a.startsWith("--url="))
const targetUrl = `${(urlArg ? urlArg.slice("--url=".length) : DEFAULT_URL).replace(/\/+$/, "")}${STRIPE_CONNECT_WEBHOOK_PATH}`

async function main() {
  console.log("\nShareO — Criar Event Destination v2 do Stripe Connect (ADR-028)")
  console.log("─".repeat(60))
  console.log(`Modo: ${confirm ? "⚠  CRIANDO (--confirm)" : "DRY-RUN (somente leitura)"}`)
  console.log(`URL alvo: ${targetUrl}`)
  console.log(`Eventos: ${ENABLED_EVENTS.join(", ")}`)
  console.log("─".repeat(60))

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("✗ STRIPE_SECRET_KEY vazio em .env.local.")
    process.exit(1)
  }
  // getStripe() (lazy) em vez de `new Stripe(...)`: a apiVersion fica pinada
  // só em lib/stripe.ts — os nomes de evento da v2 são sensíveis a ela.
  const stripe = getStripe()

  const existing = await stripe.v2.core.eventDestinations.list({ include: ["webhook_endpoint.url"] })
  const dup = existing.data.find((d) => d.webhook_endpoint?.url === targetUrl)

  if (dup) {
    console.log(`\nJá existe um Event Destination para essa URL: ${dup.id} (status: ${dup.status})`)
    console.log("Nada a fazer — não duplica. Para trocar os eventos assinados, atualize via Dashboard ou stripe.v2.core.eventDestinations.update().")
    return
  }

  console.log("\nNenhum Event Destination existente para essa URL.")

  if (!confirm) {
    console.log("\nDRY-RUN concluído — nada foi criado.")
    console.log("Para criar, rode com --confirm.")
    return
  }

  const created = await stripe.v2.core.eventDestinations.create({
    name:           "shareo-connect-status",
    description:    "ADR-028 — sincroniza stripeConnectStatus/etc a partir de mudanças de capability das connected accounts (Accounts v2).",
    type:           "webhook_endpoint",
    event_payload:  "thin",
    enabled_events: ENABLED_EVENTS,
    webhook_endpoint: { url: targetUrl },
    include: ["webhook_endpoint.signing_secret", "webhook_endpoint.url"],
  })

  console.log(`\n✓ Criado: ${created.id} (status: ${created.status})`)
  console.log("\n⚠  COPIE AGORA — a Stripe só mostra o signing_secret esta vez:")
  console.log(`\n   STRIPE_CONNECT_WEBHOOK_SECRET=${created.webhook_endpoint?.signing_secret}`)
  console.log("\nPróximo passo (manual, fora deste script):")
  console.log("  1. Adicionar essa env var no Vercel (Production + Preview conforme o ambiente do staging).")
  console.log("  2. Se algum workflow de CI precisar dela, adicionar também em GitHub Secrets.")
  console.log("  3. Sem redeploy explícito, o Vercel pode exigir um novo build para pegar a env var nova.")
}

main().catch((e) => {
  console.error("\n✗ Erro fatal:", e instanceof Error ? e.stack : e)
  process.exit(1)
})
