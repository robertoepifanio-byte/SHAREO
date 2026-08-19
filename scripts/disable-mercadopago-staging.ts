/**
 * disable-mercadopago-staging.ts — desliga a flag PlatformConfig.mercadoPagoEnabled
 * no STAGING (ADR-028: reversão para Stripe Connect, Mercado Pago Modelo B fica
 * DORMENTE, não removido).
 *
 * Contexto: a flag foi inserida como linha em `platform_configs` em 30/06/2026
 * para validar o fluxo ponta a ponta do Mercado Pago em staging. O default do
 * código (`DEFAULT_MERCADO_PAGO` em lib/platform-config.ts) já é `enabled: false`,
 * mas essa linha no banco de staging sobrepõe o default e mantém o MP "quente"
 * lá. Este script só grava `value = "false"` — não apaga a linha (mantém o
 * histórico de quando/por que foi ligada) e não mexe em nenhum código.
 *
 * Idempotente: rodar de novo com a flag já em "false" não faz nada além de
 * confirmar o estado atual (upsert com o mesmo valor).
 *
 * Comportamento:
 *   SEM --confirm  → dry-run: mostra o valor atual e o que seria escrito. NÃO grava.
 *   COM --confirm  → grava value="false" via upsert.
 *
 * Uso:
 *   pnpm tsx scripts/disable-mercadopago-staging.ts             # dry-run
 *   pnpm tsx scripts/disable-mercadopago-staging.ts --confirm   # grava
 *
 * Após rodar com --confirm: a app em produção/staging lê PlatformConfig com um
 * cache em memória de até 60s (CONFIG_TTL_MS em lib/platform-config.ts) por
 * instância serverless — a mudança propaga sozinha dentro desse prazo, sem
 * precisar de redeploy. Não há endpoint de invalidação manual de cache exposto
 * fora do processo da app (clearPlatformConfigCache() só roda dentro do route
 * handler de PATCH /api/admin/platform-config).
 */
import { loadEnvFile, makePrisma } from "./lib/sim-shared"

const KEY   = "mercadoPagoEnabled"
const VALUE = "false"

if (!loadEnvFile(".env.staging-migrate")) {
  console.error("✗ .env.staging-migrate não encontrado. Necessário para apontar para o staging.")
  process.exit(1)
}

const confirm = process.argv.includes("--confirm")

async function main() {
  console.log("\nShareO — Desligar Mercado Pago em staging (ADR-028)")
  console.log("─".repeat(60))
  console.log(`Modo: ${confirm ? "⚠  GRAVANDO (--confirm)" : "DRY-RUN (somente leitura)"}`)
  console.log("─".repeat(60))

  const prisma = makePrisma()

  try {
    const current = await prisma.platformConfig.findUnique({ where: { key: KEY } })

    if (!current) {
      console.log(`\nNenhuma linha "${KEY}" encontrada em platform_configs.`)
      console.log("Já dormente: sem a linha, getMercadoPagoConfig() cai no default do código (enabled: false).")
      if (!confirm) {
        console.log("\nNada a fazer — não há flag ligada para desligar. Encerrando sem gravar.")
        return
      }
      console.log("\n--confirm passado mas não há nada para atualizar. Encerrando sem gravar.")
      return
    }

    console.log(`\nEstado atual: ${KEY} = "${current.value}" (atualizado em ${current.updatedAt.toISOString()}, por ${current.updatedBy ?? "desconhecido"})`)

    if (current.value === VALUE) {
      console.log(`\nJá está em "${VALUE}" — nada a fazer.`)
      return
    }

    console.log(`\nSeria gravado: ${KEY} = "${VALUE}"`)

    if (!confirm) {
      console.log("\nDRY-RUN concluído — nenhum dado foi alterado.")
      console.log("Para gravar, rode com --confirm.")
      return
    }

    const updated = await prisma.platformConfig.upsert({
      where:  { key: KEY },
      create: { key: KEY, value: VALUE, description: "Desligado via script (ADR-028) — MP volta a ficar dormente em staging.", updatedBy: "script:disable-mercadopago-staging" },
      update: { value: VALUE, description: "Desligado via script (ADR-028) — MP volta a ficar dormente em staging.", updatedBy: "script:disable-mercadopago-staging" },
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
