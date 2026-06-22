/**
 * Gera a imagem do hero da home a partir do asset de marca dos fundadores.
 *
 * Fonte: public/logos/hero-source.png — composição de itens em destaque
 *        (furadeira, câmera, caixa de som, bike, escada, projetor) com a seta
 *        circular verde da economia circular. Fundo TRANSPARENTE e SEM o logo
 *        embutido → o logo/título vêm do próprio hero, e a imagem compõe sobre
 *        o gradiente navy tanto no tema claro quanto no escuro.
 *
 * Saída:
 *   public/logos/hero-items.webp  (largura 1100px, alfa preservado p/ retina)
 *
 * Execução: node scripts/generate-hero-image.mjs
 */

import sharp from "sharp"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { statSync } from "fs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, "..")
const SOURCE    = join(ROOT, "public", "logos", "hero-source.png")
const OUT       = join(ROOT, "public", "logos", "hero-items.webp")

// 2x da largura exibida no hero (~550px no desktop) — nitidez em telas retina.
const WIDTH = 1100

const info = await sharp(SOURCE)
  .resize(WIDTH) // só largura → mantém proporção e o canal alfa
  .webp({ quality: 74, alphaQuality: 90 })
  .toFile(OUT)

const kb = (statSync(OUT).size / 1024).toFixed(0)
console.log(`✅  logos/hero-items.webp  (${info.width}×${info.height}, ${kb} KB)`)
