/**
 * Backup manual do ShareO — banco + Storage, numa pasta datada.
 *
 *   node scripts/backup-manual.mjs prod
 *   node scripts/backup-manual.mjs staging
 *
 * Pré-requisito, uma vez por máquina:  npx supabase login
 *
 * 🪤 Por que existe: o Supabase faz 7 dias de backup diário DO BANCO, mas NÃO
 * faz backup do Storage e não oferece alternativa nativa (o banco guarda só o
 * caminho do arquivo). `booking-photos` são as fotos de check-in e check-out —
 * a base de prova das disputas. Sem isto, não existe cópia nenhuma delas.
 *
 * 🪤 Por que Node e não shell: no Windows, `bash` resolve para o WSL
 * (C:\Windows\system32\bash.exe), que nesta máquina não tem distribuição
 * instalada — o script shell falhava com uma mensagem sobre a Microsoft Store,
 * que não ajuda ninguém. Node roda igual no PowerShell e no Git Bash.
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

const ambiente = process.argv[2]
const ref = PROJETOS[ambiente]

if (!ref) {
  console.error("uso: node scripts/backup-manual.mjs <staging|prod>\n")
  console.error("Dizer o ambiente é obrigatório de propósito: os dois refs se")
  console.error("parecem (staging=zythy… prod=jdxd…) e já houve confusão.")
  process.exit(1)
}

const carimbo = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")
const destino = path.join("backups", `${ambiente}_${carimbo}`)

console.log(`Ambiente: ${ambiente}  (ref ${ref})`)
console.log(`Destino:  ${destino}\n`)

fs.mkdirSync(destino, { recursive: true })

/** `shell: true` porque no Windows o npx é um .cmd e não é executável direto. */
function supabase(args, rotulo) {
  console.log(rotulo)
  const r = spawnSync("npx", ["supabase", ...args], { stdio: "inherit", shell: true })
  if (r.status !== 0) {
    console.error(`  ⚠️  falhou (código ${r.status})`)
    return false
  }
  return true
}

// ─── Banco ───────────────────────────────────────────────────────────────────
// Schema e dados separados: restaurar o schema num banco vazio é o caminho
// normal, e ter os dados à parte permite conferir sem reler um arquivo enorme.
const okSchema = supabase(
  ["db", "dump", "--project-ref", ref, "-f", path.join(destino, "schema.sql")],
  "[1/3] Schema do banco…",
)

// Sem credencial, TUDO falha igual — avisar uma vez e parar vale mais do que
// repetir o mesmo erro cinco vezes.
if (!okSchema) {
  // Sai sem deixar pasta vazia para trás — lixo de tentativa falha confunde
  // quem depois procura "o backup de ontem".
  fs.rmSync(destino, { recursive: true, force: true })
  console.error("\n❌ O primeiro passo falhou. Se a mensagem fala em access token,")
  console.error("   rode `npx supabase login` e tente de novo.")
  process.exit(1)
}

supabase(
  ["db", "dump", "--project-ref", ref, "--data-only", "--use-copy",
   "-f", path.join(destino, "dados.sql")],
  "[2/3] Dados do banco…",
)

// ─── Storage ─────────────────────────────────────────────────────────────────
// É a parte que o backup automático NÃO cobre — a razão de este script existir.
console.log("[3/3] Storage (os 3 buckets)…")
for (const bucket of BUCKETS) {
  const pasta = path.join(destino, "storage", bucket)
  fs.mkdirSync(pasta, { recursive: true })
  // -j 4: paralelismo modesto; subir muito arrisca 429 do Storage API.
  supabase(
    ["storage", "cp", "-r", "-j", "4", "--project-ref", ref, `ss:///${bucket}`, pasta],
    `  → ${bucket}`,
  )
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
  console.log(`  ${bucket.padEnd(16)} ${n} arquivo(s)`)
}
console.log(`\n✅ Backup em ${destino}`)
console.log("\n⚠️  Ainda na mesma máquina do original. Copie para fora (disco")
console.log("    externo ou nuvem) — senão protege contra engano, não contra desastre.")
