/**
 * Gera as versões web dos banners da campanha nacional de pré-lançamento.
 *
 * Fontes (fora de public/, não vão para o deploy):
 *   assets-fonte/imagens/banner-campanha-horizontal.png   1983×793   (2,50:1)
 *   assets-fonte/imagens/banner-campanha-vertical.png     1024×1536  (2:3)
 *
 * Saídas em public/campanha/ — duas larguras por orientação (1× e retina):
 *   banner-h-1280.webp / banner-h-1983.webp   → desktop (≥768px)
 *   banner-v-768.webp  / banner-v-1024.webp   → mobile
 *
 * As duas orientações são artes DIFERENTES (art direction), servidas por
 * <picture> + <source media> em components/home/CampaignBanner.tsx — por isso
 * cada uma tem seu próprio conjunto de larguras em vez de um srcset único.
 *
 * ⚠️ Os arquivos ficam em public/campanha/, que precisa estar na ALLOW_PREFIX de
 * lib/prelaunch.ts: o matcher do middleware não isenta public/, então um asset
 * fora da allowlist levaria 307 e a imagem apareceria quebrada com o gate ligado.
 *
 * Execução: node scripts/generate-campaign-banners.mjs
 * (como os demais scripts de imagem do projeto, é invocado à mão — não está no
 *  package.json nem no build.)
 */

import sharp from "sharp"
import { mkdirSync, statSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, "..")
const FONTES    = join(ROOT, "assets-fonte", "imagens")
const SAIDA     = join(ROOT, "public", "campanha")

// Mesma qualidade usada no hero do site (scripts/generate-hero-image.mjs).
// Alvo: ~150–300 KB por arquivo, vindo de fontes de 1,6–1,9 MB.
const QUALITY = 74

mkdirSync(SAIDA, { recursive: true })

const kb = (p) => (statSync(p).size / 1024).toFixed(0)

async function gerar(fonte, larguras, prefixo) {
  const origem = join(FONTES, fonte)
  const meta   = await sharp(origem).metadata()
  console.log(`\n${fonte}  (${meta.width}×${meta.height}, ${kb(origem)} KB)`)

  let total = 0
  for (const w of larguras) {
    const nome   = `${prefixo}-${w}.webp`
    const destino = join(SAIDA, nome)
    await sharp(origem)
      .resize(w, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(destino)
    const peso = Number(kb(destino))
    total += peso
    const alerta = peso > 300 ? "  ⚠️ acima do alvo de 300 KB" : ""
    console.log(`   ✅ campanha/${nome}  ${w}px  ${peso} KB${alerta}`)
  }
  return total
}

const h = await gerar("banner-campanha-horizontal.png", [1280, 1983], "banner-h")
const v = await gerar("banner-campanha-vertical.png",   [768, 1024],  "banner-v")

console.log(`\n🎉 Banners gerados. Total: ${h + v} KB`)
console.log(`   Um visitante baixa só uma orientação (<picture>):`)
console.log(`   desktop ≈ ${h} KB no pior caso · mobile ≈ ${v} KB no pior caso`)
