/**
 * Gera a imagem de compartilhamento (Open Graph / Twitter Card) do ShareO.
 *
 * Fonte: public/logos/og-source.png — composição de marca (itens em destaque +
 *        seta circular verde da economia circular + logo "SHAREO / YOU RENT").
 *        O asset tem fundo BRANCO; por isso a imagem final é montada sobre fundo
 *        branco (fit: contain) — as bordas laterais se fundem sem emenda.
 *
 * Saída:
 *   public/logos/og-image-v5.webp  1200×630 (proporção 1.91:1 exigida pelo OG)
 *
 * Quando re-exportar o asset (ex.: fundo transparente / sem logo embutido),
 * basta substituir public/logos/og-source.png e rodar este script de novo.
 *
 * Execução: node scripts/generate-og-image.mjs
 */

import sharp from "sharp"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { statSync } from "fs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, "..")
const SOURCE    = join(ROOT, "public", "logos", "og-source.png")
const OUT       = join(ROOT, "public", "logos", "og-image-v5.webp")

// Dimensões canônicas de OG/Twitter "summary_large_image".
const W = 1200
const H = 630

// Fundo branco — igual ao do asset, para a emenda das bordas ser invisível.
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

await sharp(SOURCE)
  .resize(W, H, { fit: "contain", background: WHITE })
  .flatten({ background: WHITE }) // garante opacidade total (sem canal alfa)
  .webp({ quality: 82 })
  .toFile(OUT)

const kb = (statSync(OUT).size / 1024).toFixed(0)
console.log(`✅  logos/og-image-v5.webp  (${W}×${H}, ${kb} KB)`)
