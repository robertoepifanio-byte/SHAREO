/**
 * Gera as versões web das artes da landing da campanha.
 *
 * Lê PNGs de assets-fonte/ (fora de public/, não vão para o deploy) e escreve
 * .webp em public/campanha/, em duas larguras por arte (1× e retina).
 *
 * Quando uma arte tem duas orientações, elas são composições DIFERENTES (art
 * direction) e não a mesma imagem reescalada — por isso cada orientação tem seu
 * próprio conjunto de larguras, servida por <picture> + <source media> nos
 * componentes de components/landing/ em vez de um srcset único.
 *
 * Execução (de dentro de apps/campanha):
 *   node scripts/generate-campaign-banners.mjs
 * (como os demais scripts de imagem do projeto, é invocado à mão — não está no
 *  package.json nem no build.)
 */

import sharp from "sharp"
import { existsSync, mkdirSync, statSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, "..")
// Fontes e saída passaram a viver dentro de apps/campanha (12/08/2026, quando o
// gate saiu do produto). Antes ficavam na raiz do repo, junto com o marketplace.
const FONTES    = join(ROOT, "assets-fonte")
const SAIDA     = join(ROOT, "public", "campanha")

// Mesma qualidade usada no hero do site (scripts/generate-hero-image.mjs).
// Alvo: ~150–300 KB por arquivo, vindo de fontes de 1,6–1,9 MB.
const QUALITY = 74

mkdirSync(SAIDA, { recursive: true })

const kb = (p) => (statSync(p).size / 1024).toFixed(0)

async function gerar(fonte, larguras, prefixo) {
  const origem = join(FONTES, fonte)

  // As artes do redesenho (hero, fotos dos dois lados, cidade) são entregues
  // pelo fundador e chegam em momentos diferentes. Pular o que ainda não existe
  // deixa o script utilizável desde já, em vez de exigir que todas cheguem
  // juntas para poder rodar qualquer uma.
  if (!existsSync(origem)) {
    console.log(`\n${fonte}  — ⏭️  ainda não entregue, pulando`)
    return 0
  }

  const meta = await sharp(origem).metadata()
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

/*
 * ── Artes da landing (redesenho de 09/2026) ──────────────────────────────────
 *
 * Saíram daqui, na mesma leva: o banner da campanha (`banner-*`) e os dois
 * banners de programa (`fundadores-*`, `embaixadores-*`). Os três traziam todo o
 * texto DENTRO da imagem e foram substituídos por seções em HTML, que escalam
 * com a fonte do sistema e são traduzíveis e indexáveis. Os PNGs de origem
 * seguem em assets-fonte/ caso a arte volte a ser usada em outro canal.
 *
 * As quatro artes abaixo foram entregues em 14/09/2026. `gerar()` pula o que não
 * existir, então o script continua rodando se alguma for removida. Para trocar
 * ou acrescentar uma arte:
 *
 *   1. colocar o PNG em assets-fonte/ com exatamente o nome usado abaixo;
 *   2. conferir se a maior largura pedida aqui NÃO passa da largura nativa da
 *      arte (`withoutEnlargement` não faz upscale, então pedir mais só geraria
 *      um arquivo idêntico com nome mentiroso — ajuste o número se preciso);
 *   3. rodar este script de dentro de apps/campanha;
 *   4. ajustar a constante `ASPECTO` do componente correspondente para a
 *      proporção real informada no log — ANTES de virar a flag;
 *   5. virar a flag da arte em `ARTE`, em lib/landing-content.ts.
 */
// Larguras SEMPRE ≤ a nativa da arte (`withoutEnlargement` não faz upscale;
// pedir mais só geraria um arquivo idêntico com nome mentiroso):
//   hero 1888×833 · lados ~1704×920 · cidade 2172×182.
//
// ⚠️ A cidade em assets-fonte/ JÁ ESTÁ RECORTADA. O PNG entregue tinha 2172×724
// com a foto ocupando só y=271..452 — o resto era branco, que sobre o navy da
// seção viraria uma faixa lavada. Se a arte for reentregue, conferir as bordas
// antes de substituir.
// O hero tem uma orientação só — não há art direction a fazer, então o
// componente usa <img srcSet> em vez de <picture>.
const he = await gerar("hero-campanha.png",     [944, 1888], "hero")
const lp = await gerar("lado-proprietario.png", [640, 1280], "lado-proprietario")
const ll = await gerar("lado-locatario.png",    [640, 1280], "lado-locatario")
const cd = await gerar("cidade-fechamento.png", [1280, 2172], "cidade")

const totalNovo = he + lp + ll + cd
console.log(
  totalNovo > 0
    ? `\n🎉 Artes do redesenho geradas. Total: ${totalNovo} KB`
    : `\n⏳ Nenhuma arte do redesenho encontrada em assets-fonte/ — ver instruções acima.`,
)
