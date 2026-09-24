/**
 * Conta, SÓ LEITURA, quantas linhas do banco dependem da ENCRYPTION_KEY e da HMAC_KEY.
 * Responde, antes de rotacionar as chaves: "há dado a recifrar ou hash a recalcular?"
 * (docs/runbook-rotacao-encryption-key.md, seção 0).
 *
 * Só imprime o banco alvo (host e ref, nunca a senha) e contagens. Nenhum valor de
 * coluna, nenhum e-mail. `DATABASE_URL` vem de um env-file, nunca da linha de comando:
 *   node --env-file=<arquivo> --import tsx scripts/contar-dados-cifrados.ts
 *
 * Coluna que o banco alvo ainda não tem (migração não aplicada) sai como "ausente".
 * Exit code: 0 = contou tudo; 1 = alguma contagem falhou; 2 = recusou rodar.
 */
/* eslint-disable no-console -- script de linha de comando: o relatório É a saída */
import { type Prisma, PrismaClient } from "@prisma/client"
import { ENCRYPTED_COLUMNS, safeErrorLabel } from "../lib/crypto-rotation"
import { connectionFailureHint, connectionSummary, describeDatabase } from "./lib/rotation-cli"

const databaseUrl = process.env.DATABASE_URL
const db = describeDatabase(databaseUrl)
if (!databaseUrl || !db) {
  console.error("DATABASE_URL ausente ou ilegível no env-file.")
  process.exit(2)
}

const prisma = new PrismaClient()

const HASHES = ["cpfHash", "cnpjHash"] as const
let houveErro = false

/** Linhas de User com a coluna preenchida; "ausente" se o banco não a tem. */
async function preenchidas(coluna: string): Promise<number | string> {
  try {
    return await prisma.user.count({ where: { [coluna]: { not: null } } as Prisma.UserWhereInput })
  } catch (e) {
    if (safeErrorLabel(e) === "PrismaClientKnownRequestError:P2022") return "ausente"
    houveErro = true
    return `erro (${safeErrorLabel(e)})`
  }
}

async function main() {
  console.log(`Banco: ${db!.ref ?? db!.host} (${db!.host})`)
  console.log(`Conexão: ${connectionSummary(databaseUrl!) ?? "(URL ilegível)"}`)
  console.log(`Usuários: ${await prisma.user.count()}`)
  console.log(`Administradores: ${await prisma.user.count({ where: { role: "ADMIN" } })}`)
  console.log("Cifradas com a ENCRYPTION_KEY (linhas preenchidas):")
  for (const c of ENCRYPTED_COLUMNS) console.log(`  ${c}: ${await preenchidas(c)}`)
  console.log(`  2FA já confirmado (totpEnabledAt): ${await preenchidas("totpEnabledAt")}`)
  console.log("Hashes de busca (mudam se a HMAC_KEY mudar):")
  for (const c of HASHES) console.log(`  ${c}: ${await preenchidas(c)}`)
}

main()
  .catch((e) => {
    console.error(`Falhou: ${safeErrorLabel(e)}`)
    const dica = connectionFailureHint(e)
    if (dica) console.error(`Motivo: ${dica}`)
    houveErro = true
  })
  .finally(async () => {
    await prisma.$disconnect()
    process.exitCode = houveErro ? 1 : 0
  })
