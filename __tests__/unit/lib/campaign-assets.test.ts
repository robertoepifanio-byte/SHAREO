/**
 * Os banners da campanha são referenciados por string montada em
 * components/home/ProgramBanner.tsx (`/campanha/${slug}-h-${largura}.webp`).
 * Um slug ou largura errada não quebra build, não quebra tipo e não gera erro
 * no console do servidor — o visitante só vê um retângulo vazio.
 *
 * Este teste amarra os nomes ao que existe em disco.
 */
import { existsSync, statSync } from "fs"
import { join } from "path"

const DIR = join(process.cwd(), "public", "campanha")

// Mesmo alvo do gerador (scripts/generate-campaign-banners.mjs).
const LIMITE_KB = 300

const ARQUIVOS = [
  "banner-h-1280.webp",
  "banner-h-1983.webp",
  "banner-v-768.webp",
  "banner-v-1024.webp",
  "fundadores-h-1280.webp",
  "fundadores-h-1536.webp",
  "fundadores-v-768.webp",
  "fundadores-v-1024.webp",
  "embaixadores-h-1280.webp",
  "embaixadores-h-1492.webp",
  "embaixadores-v-768.webp",
  "embaixadores-v-1024.webp",
]

describe("assets da campanha de pré-lançamento", () => {
  it.each(ARQUIVOS)("%s existe em public/campanha", (nome) => {
    expect(existsSync(join(DIR, nome))).toBe(true)
  })

  it.each(ARQUIVOS)("%s está dentro do orçamento de peso", (nome) => {
    const kb = statSync(join(DIR, nome)).size / 1024
    expect(kb).toBeLessThanOrEqual(LIMITE_KB)
  })
})
