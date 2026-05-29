/**
 * Gera os ícones PWA do ShareO em 192×192 e 512×512 PNG.
 * Design: fundo branco, "SHARE" em navy #003366, ponto laranja #E8704A,
 *         "O" substituído por setas circulares verdes #3DAB2E.
 * Execução: node scripts/generate-pwa-icons.mjs
 */

import sharp from "sharp"
import { writeFileSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, "..")
const OUT       = join(ROOT, "public", "logos")

mkdirSync(OUT, { recursive: true })

/** Gera o SVG do ícone em tamanho `size` */
function buildSvg(size) {
  const pad   = size * 0.12          // margem interna
  const inner = size - pad * 2       // área útil
  const cx    = size / 2             // centro X
  const cy    = size / 2             // centro Y

  // Tamanhos de fonte escalados
  const fontSize   = inner * 0.28
  const dotR       = fontSize * 0.09
  const oR         = fontSize * 0.38   // raio do círculo do "O"
  const arrowStroke = oR * 0.28

  // X de início do texto "SHARE" (centralizado com o "O")
  // Texto total: "SHARE" + dot + "O"
  // Aproximamos as medidas: "SHARE" ≈ 4.8 chars wide, dot ≈ 0.4, gap ≈ 0.15, O-circle
  const charW  = fontSize * 0.62       // largura média de cada char
  const shareW = 5 * charW            // "SHARE"
  const dotGap = fontSize * 0.18
  const oWidth = oR * 2
  const totalW = shareW + dotGap + dotR * 2 + dotGap + oWidth
  const startX = cx - totalW / 2

  const shareEndX = startX + shareW
  const dotCX     = shareEndX + dotGap + dotR
  const oCX       = dotCX + dotR + dotGap + oR

  // Setas do círculo "O" — dois arcos com pontas
  const oAr = oR - arrowStroke / 2
  const sweep = (angleDeg) => {
    const a = (angleDeg * Math.PI) / 180
    return { x: oCX + oAr * Math.cos(a), y: cy + oAr * Math.sin(a) }
  }

  // Arco superior (do 220° ao 40°, sentido horário)
  const A1s = sweep(220); const A1e = sweep(40)
  // Arco inferior (do 40° ao 220°, sentido horário)
  const A2s = sweep(40);  const A2e = sweep(220)

  // Pontas de seta (triângulos pequenos)
  const arrowLen = arrowStroke * 1.4
  function arrowHead(cx2, cy2, angleDeg) {
    const a  = (angleDeg * Math.PI) / 180
    const px = cx2 + oAr * Math.cos(a)
    const py = cy2 + oAr * Math.sin(a)
    // ponta perpendicular
    const perp = a + Math.PI / 2
    const half  = arrowLen * 0.55
    const tip   = { x: px + arrowLen * Math.cos(a), y: py + arrowLen * Math.sin(a) }
    const left  = { x: px + half * Math.cos(perp),  y: py + half * Math.sin(perp) }
    const right = { x: px - half * Math.cos(perp),  y: py - half * Math.sin(perp) }
    return `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Fundo branco -->
  <rect width="${size}" height="${size}" fill="#FFFFFF"/>

  <!-- "SHARE" em navy -->
  <text
    x="${startX}"
    y="${cy + fontSize * 0.35}"
    font-family="Arial Black, Arial, Helvetica, sans-serif"
    font-size="${fontSize}"
    font-weight="900"
    letter-spacing="${fontSize * 0.02}"
    fill="#003366"
    dominant-baseline="auto"
  >SHARE</text>

  <!-- Ponto laranja -->
  <circle cx="${dotCX}" cy="${cy + fontSize * 0.08}" r="${dotR}" fill="#E8704A"/>

  <!-- Círculo "O" verde — arco superior -->
  <path
    d="M ${A1s.x} ${A1s.y} A ${oAr} ${oAr} 0 1 1 ${A1e.x} ${A1e.y}"
    fill="none"
    stroke="#3DAB2E"
    stroke-width="${arrowStroke}"
    stroke-linecap="round"
  />
  <!-- Ponta de seta superior (na direção 40°) -->
  <polygon points="${arrowHead(oCX, cy, 40 - 90)}" fill="#3DAB2E"/>

  <!-- Arco inferior -->
  <path
    d="M ${A2s.x} ${A2s.y} A ${oAr} ${oAr} 0 1 1 ${A2e.x} ${A2e.y}"
    fill="none"
    stroke="#3DAB2E"
    stroke-width="${arrowStroke}"
    stroke-linecap="round"
  />
  <!-- Ponta de seta inferior (na direção 220°) -->
  <polygon points="${arrowHead(oCX, cy, 220 - 90)}" fill="#3DAB2E"/>
</svg>`
}

async function generate(size, filename) {
  const svg = buildSvg(size)
  const buf = Buffer.from(svg)
  const out = join(OUT, filename)
  await sharp(buf, { density: 300 })
    .resize(size, size)
    .png({ quality: 100 })
    .toFile(out)
  console.log(`✅  ${out}  (${size}×${size})`)
}

await generate(192, "pwa-icon-192.png")
await generate(512, "pwa-icon-512.png")
console.log("🎉 Ícones PWA gerados com sucesso!")
