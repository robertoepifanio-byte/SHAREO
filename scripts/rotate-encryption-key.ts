/**
 * Recifra do banco as colunas cifradas com a ENCRYPTION_KEY, da chave antiga para a nova.
 *
 * IMPLEMENTADO E TESTADO COM FAKE. NUNCA EXECUTADO CONTRA BANCO REAL.
 * Procedimento completo (ordem das etapas, janela, HMAC_KEY, troca das env vars,
 * o que fazer se falhar): docs/runbook-rotacao-encryption-key.md — o script
 * sozinho não basta.
 *
 * Dry-run por padrão; `--apply` grava. Nunca imprime claro, ciphertext nem chave.
 * Exit code: 0 = ok; 1 = falhas, conflitos ou a rodada parou; 2 = recusou rodar.
 */
/* eslint-disable no-console -- script de linha de comando: o relatório É a saída */
import { PrismaClient } from "@prisma/client"
import { createPrismaStore, runRotation, safeErrorLabel } from "../lib/crypto-rotation"
import {
  checkDatabaseConfirmation,
  connectionFailureHint,
  describeDatabase,
  fingerprintKey,
  formatReport,
  parseRotationArgs,
  resolveRotationKeys,
} from "./lib/rotation-cli"

const USAGE = [
  "Chaves e DATABASE_URL vêm de um env-file dedicado (ENCRYPTION_KEY_OLD, ENCRYPTION_KEY_NEW, DATABASE_URL), nunca da linha de comando.",
  "  DRY-RUN (padrão): node --env-file=<arquivo> --import tsx scripts/rotate-encryption-key.ts",
  "  GRAVAR:           node --env-file=<arquivo> --import tsx scripts/rotate-encryption-key.ts --apply --confirmar-banco=<ref> --hmac-fixada",
  "--confirmar-banco = ref do projeto Supabase da DATABASE_URL. --hmac-fixada = HMAC_KEY definida na aplicação (ver o runbook).",
].join("\n")

async function main(): Promise<number> {
  const parsed = parseRotationArgs(process.argv.slice(2))
  if (!parsed.ok) {
    console.error(`Recusado: ${parsed.error}`)
    console.error(USAGE)
    return 2
  }
  const { args } = parsed

  const keys = resolveRotationKeys(process.env)
  if (!keys.ok) {
    for (const e of keys.errors) console.error(`Recusado: ${e}`)
    return 2
  }

  const db = describeDatabase(process.env.DATABASE_URL)
  if (!db) {
    console.error("Recusado: DATABASE_URL ausente ou ilegível.")
    return 2
  }
  console.log(`Banco: ${db.host} (ref: ${db.ref ?? "não identificado"})`)
  console.log(`Chave antiga: impressão ${fingerprintKey(keys.oldKey)} | chave nova: impressão ${fingerprintKey(keys.newKey)}`)

  if (args.apply) {
    if (!checkDatabaseConfirmation(db, args.confirmarBanco)) {
      console.error(`Recusado: --apply exige --confirmar-banco=${db.ref ?? db.host} (o banco em que este comando vai gravar).`)
      return 2
    }
    if (!args.hmacFixada) {
      console.error("Recusado: --apply exige --hmac-fixada. Sem HMAC_KEY definida na aplicação, trocar ENCRYPTION_KEY muda a chave dos hashes de CPF/CNPJ (ver o runbook).")
      return 2
    }
  } else {
    console.log("DRY-RUN: nada será gravado. Para gravar, --apply --confirmar-banco=<ref> --hmac-fixada.")
  }

  const prisma = new PrismaClient()
  try {
    const report = await runRotation(createPrismaStore(prisma), {
      oldKey: keys.oldKey,
      newKey: keys.newKey,
      apply: args.apply,
      log: console.log,
    })
    for (const line of formatReport(report)) console.log(line)
    return report.ok ? 0 : 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    // Só o nome do erro: a mensagem do Prisma pode trazer os valores da consulta.
    console.error(`Falha inesperada: ${safeErrorLabel(e)}`)
    const dica = connectionFailureHint(e)
    if (dica) console.error(`Motivo: ${dica}`)
    process.exit(1)
  })
