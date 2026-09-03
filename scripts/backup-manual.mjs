/**
 * Backup manual do ShareO — os arquivos do Storage, que o Supabase NÃO cobre.
 *
 *   node scripts/backup-manual.mjs prod
 *   node scripts/backup-manual.mjs staging
 *   node scripts/backup-manual.mjs prod --com-banco    (exige Docker; ver abaixo)
 *
 * Pré-requisito, uma vez por máquina:  npx supabase login
 *
 * 🪤 Por que existe: o Supabase mantém 7 dias de backup diário DO BANCO, mas
 * NÃO faz backup do Storage e não oferece alternativa nativa — o banco guarda
 * só o caminho do arquivo. `booking-photos` são as fotos de check-in e
 * check-out, ou seja a base de prova das disputas. Sem isto, não existe cópia
 * nenhuma delas.
 *
 * 🪤 Por isso o banco NÃO entra por padrão: ele já tem backup automático, e o
 * `supabase db dump` roda o pg_dump dentro de um container DOCKER — numa
 * máquina sem Docker Desktop ligado, ele falha e levava o script junto. Se
 * quiser mesmo o dump, use --com-banco com o Docker rodando.
 *
 * 🪤 Por que Node e não shell: no Windows, `bash` resolve para o WSL
 * (C:/Windows/system32/bash.exe), que nesta máquina não tem distribuição
 * instalada. Node roda igual no PowerShell e no Git Bash.
 */
import { spawnSync } from "node:child_process"
import fs   from "node:fs"
import path from "node:path"

// Os dois refs se parecem e já houve confusão entre ambientes nesta base — por
// isso o script exige que você diga qual, em vez de assumir um default.
const PROJETOS = {
  staging: "zythygwvmrwrqmnrdufq",
  prod:    "jdxdndrhjxtkaifbpagr",
}

const BUCKETS = ["booking-photos", "id-docs", "item-images"]

const ambiente  = process.argv[2]
const comBanco  = process.argv.includes("--com-banco")
const ref       = PROJETOS[ambiente]

if (!ref) {
  console.error("uso: node scripts/backup-manual.mjs <staging|prod> [--com-banco]\n")
  console.error("Dizer o ambiente é obrigatório de propósito: os dois refs se")
  console.error("parecem (staging=zythy… prod=jdxd…) e já houve confusão.")
  process.exit(1)
}

const carimbo = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")
// Caminho RELATIVO e com "/": a CLI recusa caminho absoluto do Windows —
// interpreta o "C:" como esquema de URI e responde "Unsupported operation".
const destino = `backups/${ambiente}_${carimbo}`

console.log(`Ambiente: ${ambiente}  (ref ${ref})`)
console.log(`Destino:  ${destino}\n`)

// 🪤 A pasta `storage` precisa EXISTIR antes do cp. Se o destino não existe, a
// CLI trata o caminho como a própria pasta do bucket e despeja o conteúdo solto
// nela — os três buckets se misturam e a separação por bucket se perde. Com a
// pasta criada antes, ela aninha `storage/<bucket>/…` como esperado.
fs.mkdirSync(`${destino}/storage`, { recursive: true })

function supabase(args, rotulo) {
  console.log(rotulo)
  // shell: true porque no Windows o npx é um .cmd, não um executável.
  const r = spawnSync("npx", ["supabase", ...args], {
    stdio: ["inherit", "pipe", "pipe"], shell: true, encoding: "utf8",
  })
  const saida = `${r.stdout ?? ""}${r.stderr ?? ""}`
  if (r.status !== 0) {
    console.error(saida.split("\n").filter((l) => !l.startsWith("npm warn")).join("\n"))
    return { ok: false, saida }
  }
  return { ok: true, saida }
}

// ─── Storage — a razão de este script existir ────────────────────────────────
console.log("Storage — a parte que o backup automático NÃO cobre\n")
let totalArquivos = 0

for (const bucket of BUCKETS) {
  // `--experimental` é exigido pelos comandos de storage da CLI.
  // O destino é a pasta `storage`: a própria CLI cria a subpasta do bucket.
  const r = supabase(
    ["storage", "cp", "-r", "-j", "4", "--experimental",
     "--project-ref", ref, `ss:///${bucket}`, `${destino}/storage`],
    `  → ${bucket}`,
  )
  if (!r.ok) console.error(`     ⚠️  falhou em ${bucket} — os demais continuam`)
}

// ─── Banco (opcional) ────────────────────────────────────────────────────────
if (comBanco) {
  console.log("\nBanco (--com-banco)")
  const r = supabase(
    ["db", "dump", "--project-ref", ref, "-f", `${destino}/schema.sql`],
    "  → schema",
  )
  if (!r.ok && /docker/i.test(r.saida)) {
    console.error("\n  ⚠️  O `db dump` roda o pg_dump dentro de um container Docker.")
    console.error("      Ligue o Docker Desktop e rode de novo, OU deixe pra lá: o")
    console.error("      banco já tem 7 dias de backup automático no Supabase —")
    console.error("      quem não tem backup nenhum é o Storage, e esse já foi feito.")
  } else if (r.ok) {
    supabase(
      ["db", "dump", "--project-ref", ref, "--data-only", "--use-copy",
       "-f", `${destino}/dados.sql`],
      "  → dados",
    )
  }
}

// ─── Resumo ──────────────────────────────────────────────────────────────────
function contarArquivos(dir) {
  if (!fs.existsSync(dir)) return 0
  return fs.readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile()).length
}

console.log("\n─────────────────────────────────────────────")
for (const bucket of BUCKETS) {
  const n = contarArquivos(path.join(destino, "storage", bucket))
  totalArquivos += n
  console.log(`  ${bucket.padEnd(16)} ${n} arquivo(s)`)
}

if (totalArquivos === 0) {
  console.error("\n❌ Nenhum arquivo baixado. Se a mensagem acima fala em access")
  console.error("   token, rode `npx supabase login` e tente de novo.")
  process.exit(1)
}

console.log(`\n✅ Backup em ${destino}`)
console.log("\n⚠️  Esta pasta contém DADOS PESSOAIS: documentos de identidade")
console.log("    (id-docs) e fotos de reservas de usuários reais.")
console.log("    Não deixe em nuvem pessoal; apague quando não precisar mais.")
console.log("\n⚠️  É uma cópia só, num equipamento só. Se ele morrer, o backup")
console.log("    morre junto — vale duplicar em outro lugar.")
