/**
 * Gera os ícones PWA do ShareO a partir do logo-fonte circular "SO".
 * Fonte: public/logos/pwa-icon-source.png (círculo navy #001B53, "S" branco,
 *        "O" como setas circulares verdes — economia circular).
 *
 * Saídas:
 *   public/logos/pwa-icon-192.png           192×192  (purpose "any", fundo transparente)
 *   public/logos/pwa-icon-512.png           512×512  (purpose "any", fundo transparente)
 *   public/logos/pwa-icon-maskable-512.png  512×512  (purpose "maskable", fundo navy, logo na safe zone 80%)
 *   public/icons/shareo-logo.png            180×180  (apple-touch-icon iOS, fundo navy full-bleed)
 *
 * Execução: node scripts/generate-pwa-icons.mjs
 */

import sharp from "sharp"
import { mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, "..")
const SOURCE    = join(ROOT, "public", "logos", "pwa-icon-source.png")
const LOGOS     = join(ROOT, "public", "logos")
const ICONS     = join(ROOT, "public", "icons")

// Navy do círculo do logo — usado como fundo nas variantes opacas para o
// anel do círculo se fundir ao fundo sem mostrar borda.
const NAVY = { r: 0, g: 27, b: 83, alpha: 1 }

mkdirSync(LOGOS, { recursive: true })
mkdirSync(ICONS, { recursive: true })

/** Ícone "any" — logo redimensionado, fundo transparente preservado. */
async function any(size, file) {
  await sharp(SOURCE)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(join(LOGOS, file))
  console.log(`✅  logos/${file}  (${size}×${size}, any)`)
}

/**
 * Ícone "maskable" — logo a 80% (safe zone) centralizado sobre fundo navy
 * opaco, de modo que máscaras circulares/squircle dos launchers nunca cortem
 * conteúdo nem exibam cantos transparentes.
 */
async function maskable(size, file, bg = NAVY) {
  const inner = Math.round(size * 0.8)
  const logo  = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: "center" }])
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(join(LOGOS, file))
  console.log(`✅  logos/${file}  (${size}×${size}, maskable, safe-zone 80%)`)
}

/** apple-touch-icon — full-bleed sobre navy (iOS não suporta transparência). */
async function apple(size, dir, file, bg = NAVY) {
  const logo = await sharp(SOURCE)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: "center" }])
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(join(dir, file))
  console.log(`✅  icons/${file}  (${size}×${size}, apple-touch)`)
}

await any(192, "pwa-icon-192.png")
await any(512, "pwa-icon-512.png")
await maskable(512, "pwa-icon-maskable-512.png")
await apple(180, ICONS, "shareo-logo.png")

console.log("🎉 Ícones PWA gerados a partir do novo logo!")
