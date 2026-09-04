/**
 * Restaura arquivos do Storage a partir de uma pasta gerada por
 * `scripts/backup-manual.mjs`.
 *
 * Existe porque o backup sozinho não é backup: até 04/09/2026 havia como copiar
 * os arquivos para fora e nenhum caminho de volta, e o runbook dizia
 * literalmente "não há restauração" para o Storage.
 *
 * uso:
 *   node scripts/restore-storage.mjs <pasta-do-backup> <staging|prod> [--bucket X] [--prefixo Y]
 *
 *   --bucket   restaura só um bucket (default: os três)
 *   --prefixo  grava sob uma subpasta em vez da raiz do bucket. É como se
 *              ensaia a restauração sem escrever por cima do que está lá.
 *
 * 🪤 Node e não shell: no Windows `bash` resolve para o WSL, que nesta máquina
 * não tem distribuição. Mesmo motivo do script de backup.
 */
import { spawnSync } from "node:child_process"
import fs   from "node:fs"
import path from "node:path"

process.noDeprecation = true // mesmo DEP0190 auditado no backup

const PROJETOS = {
  staging: "zythygwvmrwrqmnrdufq",
  prod:    "jdxdndrhjxtkaifbpagr",
}

const BUCKETS = ["booking-photos", "id-docs", "item-images"]

const pasta    = process.argv[2]
const ambiente = process.argv[3]
const ref      = PROJETOS[ambiente]

const arg = (nome) => {
  const i = process.argv.indexOf(nome)
  return i > -1 ? process.argv[i + 1] : undefined
}
const soBucket = arg("--bucket")
const prefixo  = arg("--prefixo")

if (!pasta || !ref) {
  console.error("uso: node scripts/restore-storage.mjs <pasta-do-backup> <staging|prod> [--bucket X] [--prefixo Y]\n")
  console.error("Dizer o ambiente é obrigatório de propósito: os dois refs se")
  console.error("parecem (staging=zythy… prod=jdxd…) e já houve confusão.")
  process.exit(1)
}

const raiz = path.join(pasta, "storage")
if (!fs.existsSync(raiz)) {
  console.error(`Não achei ${raiz.replace(/\\/g, "/")} — a pasta veio do backup-manual?`)
  process.exit(1)
}

// Escrever na raiz de um bucket de PRODUÇÃO sobrescreve arquivo de usuário real.
// Exigir confirmação explícita é barato; desfazer não é.
if (ambiente === "prod" && !prefixo && !process.argv.includes("--sim-eu-quero")) {
  console.error("Restaurar na RAIZ de um bucket de produção sobrescreve arquivos existentes.")
  console.error("Se é isso mesmo, repita com --sim-eu-quero. Para ensaiar, use --prefixo.")
  process.exit(1)
}

const alvos = soBucket ? [soBucket] : BUCKETS
console.log(`Projeto:  ${ambiente} (${ref})`)
console.log(`Origem:   ${pasta}`)
console.log(`Destino:  ss://<bucket>${prefixo ? "/" + prefixo : ""}\n`)

let enviados = 0
for (const bucket of alvos) {
  const local = path.join(raiz, bucket)
  if (!fs.existsSync(local)) {
    console.log(`  ${bucket.padEnd(16)} (ausente no backup — pulado)`)
    continue
  }
  const destino = `ss://${bucket}${prefixo ? "/" + prefixo : ""}`
  // Caminho RELATIVO e com "/": a CLI recusa caminho absoluto do Windows.
  const origem  = `${pasta}/storage/${bucket}`.replace(/\\/g, "/")

  const r = spawnSync(
    `npx supabase storage cp -r "${origem}" "${destino}" --experimental --project-ref ${ref}`,
    { shell: true, stdio: "inherit" },
  )
  if (r.status !== 0) {
    console.error(`\n❌ Falhou em ${bucket}. Nada foi desfeito nos buckets já enviados.`)
    process.exit(1)
  }
  const n = fs.readdirSync(local, { recursive: true }).filter((f) =>
    fs.statSync(path.join(local, f)).isFile()).length
  console.log(`  ${bucket.padEnd(16)} ${n} arquivo(s)`)
  enviados += n
}

console.log(`\n✅ ${enviados} arquivo(s) restaurado(s).`)
if (prefixo) {
  console.log(`\nFoi um ensaio: os arquivos estão sob "${prefixo}/", não na raiz.`)
  // 🪤 `cp` usa DUAS barras (ss://bucket), `rm` e `ls` usam TRÊS (ss:///bucket).
  // Errar a forma devolve LegacyStorageInvalidUrlError; pior, `ls` no caminho
  // errado responde lista vazia — que parece "já apagou" e não é.
  console.log(`Apagar depois de conferir (repare nas TRÊS barras):`)
  console.log(`  npx supabase storage rm -r "ss:///${alvos[0]}/${prefixo}" --experimental --project-ref ${ref}`)
  console.log(`Conferir que sumiu — a barra no fim é obrigatória para listar conteúdo:`)
  console.log(`  npx supabase storage ls "ss:///${alvos[0]}/${prefixo}/" --experimental --project-ref ${ref}`)
}
