/**
 * enable-stripe-connect-staging.ts — liga a flag PlatformConfig.stripeConnectEnabled
 * no STAGING (ADR-028: onboarding do proprietário via Stripe Connect Express).
 *
 * Pré-requisito: o perfil de Connect precisa estar habilitado no Dashboard da
 * Stripe (modo teste) — Settings → Connect → Marketplace → Express. Sem isso,
 * `stripe.accounts.create({ type: "express" })` falha mesmo com a flag ligada.
 *
 * Este script só grava `value = "true"` — não mexe em nenhum código, mesmo
 * padrão dos demais scripts de flag em staging.
 *
 * Comportamento:
 *   SEM --confirm  → dry-run: mostra o valor atual e o que seria escrito. NÃO grava.
 *   COM --confirm  → grava value="true" via upsert.
 *
 * Uso:
 *   pnpm tsx scripts/enable-stripe-connect-staging.ts             # dry-run
 *   pnpm tsx scripts/enable-stripe-connect-staging.ts --confirm   # grava
 *
 * Após rodar com --confirm: a app lê PlatformConfig com um cache em memória
 * de até 60s (CONFIG_TTL_MS em lib/platform-config.ts) por instância
 * serverless — a mudança propaga sozinha dentro desse prazo, sem precisar
 * de redeploy.
 */
import { loadEnvFile, makePrisma } from "./lib/sim-shared"

const KEY   = "stripeConnectEnabled"
const VALUE = "true"

if (!loadEnvFile(".env.staging-migrate")) {
  console.error("✗ .env.staging-migrate não encontrado. Necessário para apontar para o staging.")
  process.exit(1)
}

const confirm = process.argv.includes("--confirm")

async function main() {
  console.log("\nShareO — Ligar Stripe Connect em staging (ADR-028)")
  console.log("─".repeat(60))
  console.log(`Modo: ${confirm ? "⚠  GRAVANDO (--confirm)" : "DRY-RUN (somente leitura)"}`)
  console.log("─".repeat(60))

  const prisma = makePrisma()

  try {
    const current = await prisma.platformConfig.findUnique({ where: { key: KEY } })

    if (current?.value === VALUE) {
      console.log(`\nJá está em "${VALUE}" — nada a fazer.`)
      return
    }

    if (current) {
      console.log(`\nEstado atual: ${KEY} = "${current.value}" (atualizado em ${current.updatedAt.toISOString()}, por ${current.updatedBy ?? "desconhecido"})`)
    } else {
      console.log(`\nNenhuma linha "${KEY}" encontrada — hoje cai no default do código (enabled: false).`)
    }

    console.log(`\nSeria gravado: ${KEY} = "${VALUE}"`)

    if (!confirm) {
      console.log("\nDRY-RUN concluído — nenhum dado foi alterado.")
      console.log("Para gravar, rode com --confirm.")
      return
    }

    const updated = await prisma.platformConfig.upsert({
      where:  { key: KEY },
      create: { key: KEY, value: VALUE, description: "Ligado via script (ADR-028) — onboarding Stripe Connect Express visível em staging.", updatedBy: "script:enable-stripe-connect-staging" },
      update: { value: VALUE, description: "Ligado via script (ADR-028) — onboarding Stripe Connect Express visível em staging.", updatedBy: "script:enable-stripe-connect-staging" },
    })

    console.log(`\n✓ Gravado: ${KEY} = "${updated.value}"`)
    console.log("  A app propaga a mudança sozinha em até 60s (cache em memória por instância).")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("\n✗ Erro fatal:", e instanceof Error ? e.stack : e)
  process.exit(1)
})
