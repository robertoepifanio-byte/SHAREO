/**
 * avisar-termos-stripe.ts — avisa por e-mail os proprietários com conta de
 * recebimento Stripe sobre a atualização do Contrato de Serviços da Stripe.
 *
 * A Stripe exige que a plataforma avise as contas conectadas sem Dashboard
 * completo (as nossas são Express) até 07/11/2026; os termos novos valem a
 * partir de 06/01/2027. Fonte e raciocínio: lib/email.ts, `sendStripeTermsUpdateEmail`.
 *
 * Quem recebe: OwnerPaymentAccount com `stripeAccountId`, usuário ativo, fora
 * os domínios de teste e as contas `REJECTED` (a Stripe já encerrou; o aviso
 * só confundiria). É e-mail transacional: ignora `engagementEmailsOptOut`.
 *
 * Comportamento:
 *   SEM --confirm  → dry-run: mostra o banco, a contagem e NÃO envia.
 *   COM --confirm  → envia. Exige --registro.
 *
 * `--registro <arquivo>` guarda os userIds já avisados (gravado a cada envio) e
 * pula esses numa nova rodada. Serve a dois casos: retomar uma rodada que caiu
 * no meio sem duplicar, e fazer a rodada de reforço de janeiro só para quem
 * entrou depois. Sem o registro, `createdAt` da OwnerPaymentAccount não serve
 * de filtro: a linha pode ter nascido com PIX e recebido o `stripeAccountId`
 * meses depois.
 *
 * 🪤 O banco vem de --env e é impresso (ref do Supabase) antes de qualquer
 * coisa: `zythy…` = staging, `jdxd…` = produção. A chave da Resend é lida do
 * `.env.local` SÓ se não vier do ambiente; não se carrega o arquivo inteiro
 * porque ele aponta o banco para o staging.
 *
 * Uso (nunca passar credencial na linha de comando):
 *   npx tsx scripts/avisar-termos-stripe.ts --env .env.staging-migrate
 *   npx tsx scripts/avisar-termos-stripe.ts --env .env.prod-run --registro avisos-termos-stripe.json --confirm
 *   npx tsx scripts/avisar-termos-stripe.ts --teste-para voce@exemplo.com   (1 e-mail de amostra, sem banco)
 */
import fs from "node:fs"
import path from "node:path"
import { StripeConnectStatus } from "@prisma/client"
import { loadEnvFile, makePrisma } from "./lib/sim-shared"
import { describeDatabase } from "./lib/rotation-cli"
import { REFS_CONHECIDOS } from "./lib/storage-orfaos-core"

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const confirm   = process.argv.includes("--confirm")
const testePara = arg("--teste-para")
const envFile   = arg("--env")
const registro  = arg("--registro")

const PAUSA_MS = 600 // a Resend limita a taxa de envio

function fail(msg: string): never {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

/** Lê só a chave da Resend do .env.local — ver "🪤" no cabeçalho. */
function carregarChaveResend() {
  if (process.env.RESEND_API_KEY?.trim()) return
  const full = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(full)) return
  const m = fs.readFileSync(full, "utf8").match(/^RESEND_API_KEY\s*=\s*(.*)$/m)
  const v = m?.[1].trim().replace(/^["']|["']$/g, "")
  if (v) process.env.RESEND_API_KEY = v
}

/** Mesma ordem do `makePrisma` (DIRECT_URL antes), para o ref impresso ser o do banco consultado. */
function rotuloDoBanco(): string {
  const ref = describeDatabase(process.env.DIRECT_URL || process.env.DATABASE_URL)?.ref ?? "desconhecido"
  const nome = ref === REFS_CONHECIDOS.staging ? "STAGING"
             : ref === REFS_CONHECIDOS.prod    ? "PRODUÇÃO"
             : "BANCO DESCONHECIDO"
  return `${nome} (ref ${ref})`
}

function lerRegistro(): Set<string> {
  if (!registro || !fs.existsSync(registro)) return new Set()
  const ids: unknown = JSON.parse(fs.readFileSync(registro, "utf8"))
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) fail(`${registro} não é uma lista de userIds.`)
  return new Set(ids as string[])
}

async function main() {
  console.log("\nShareO — Aviso dos termos da Stripe (Contrato de Serviços, vigência 06/01/2027)")
  console.log("─".repeat(78))

  if (testePara) {
    carregarChaveResend()
    if (!process.env.RESEND_API_KEY?.trim()) fail("RESEND_API_KEY ausente (nem no ambiente, nem no .env.local).")
    const { sendStripeTermsUpdateEmail } = await import("../lib/email")
    const { error } = await sendStripeTermsUpdateEmail(testePara, "Amostra")
    if (error) fail(`envio de amostra falhou: ${error.message}`)
    console.log("✓ E-mail de amostra enviado. Nenhum proprietário foi avisado.")
    return
  }

  if (!envFile) fail("informe --env <arquivo> (ex.: .env.staging-migrate ou .env.prod-run).")
  if (!loadEnvFile(envFile)) fail(`${envFile} não encontrado.`)
  if (!(process.env.DIRECT_URL || process.env.DATABASE_URL)) fail(`${envFile} não tem DATABASE_URL nem DIRECT_URL preenchidos.`)
  if (confirm && !registro) fail("--confirm exige --registro <arquivo.json> (evita duplicar numa nova rodada).")

  console.log(`Banco: ${rotuloDoBanco()}`)
  console.log(`Modo:  ${confirm ? "⚠  ENVIANDO (--confirm)" : "DRY-RUN (nada é enviado)"}`)
  console.log("─".repeat(78))

  // A chave da Resend vem do --env ou do ambiente; se faltar, cai no .env.local (mesmo
  // fallback do --teste-para). Depois do loadEnvFile, para uma chave no --env ter preferência.
  carregarChaveResend()
  if (!process.env.RESEND_API_KEY?.trim()) fail("RESEND_API_KEY ausente (nem no --env, nem no ambiente, nem no .env.local).")

  // Import dinâmico: lib/email lê variáveis de ambiente ao carregar, e o env só existe depois do loadEnvFile.
  const { testAccountEmailFilter, sendStripeTermsUpdateEmail } = await import("../lib/email")
  const prisma = makePrisma()

  try {
    const contas = await prisma.ownerPaymentAccount.findMany({
      where: {
        stripeAccountId:     { not: null },
        stripeConnectStatus: { not: StripeConnectStatus.REJECTED },
        user: { isActive: true, NOT: testAccountEmailFilter() },
      },
      select: {
        stripeConnectStatus: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    const jaAvisados = lerRegistro()
    const pendentes  = contas.filter((c) => !jaAvisados.has(c.user.id))

    const porStatus = new Map<string, number>()
    for (const c of pendentes) porStatus.set(c.stripeConnectStatus, (porStatus.get(c.stripeConnectStatus) ?? 0) + 1)

    console.log(`Contas elegíveis:    ${contas.length}`)
    console.log(`Já avisadas (registro): ${contas.length - pendentes.length}`)
    console.log(`A avisar:            ${pendentes.length}`)
    for (const [status, n] of porStatus) console.log(`  · ${status}: ${n}`)

    if (!confirm) {
      console.log("\nDry-run: nada enviado. Rode com --confirm para enviar.")
      return
    }

    let enviados = 0
    let falhas   = 0
    for (const { user } of pendentes) {
      const { error } = await sendStripeTermsUpdateEmail(user.email, user.name)
      if (error) {
        falhas++
        console.error(`  ✗ userId=${user.id}: ${error.message}`) // sem e-mail nem nome — PII
      } else {
        enviados++
        jaAvisados.add(user.id)
        // A cada envio, para retomar sem duplicar; .tmp + rename para uma queda no meio não truncar o JSON.
        fs.writeFileSync(`${registro}.tmp`, JSON.stringify([...jaAvisados], null, 2))
        fs.renameSync(`${registro}.tmp`, registro!)
      }
      await new Promise((r) => setTimeout(r, PAUSA_MS))
    }

    console.log(`\nEnviados: ${enviados} · Falhas: ${falhas}`)
    if (falhas > 0) {
      console.log("Rode de novo com o mesmo --registro para repetir só as falhas.")
      process.exitCode = 1
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("✗", e instanceof Error ? e.message : e)
  process.exit(1)
})
