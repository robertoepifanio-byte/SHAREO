/**
 * Varredura de `route.ts` para os testes de cobertura de guard.
 *
 * Existe porque a mesma recursão estava escrita QUATRO vezes — em
 * cron-guard-cobertura, admin-guard-cobertura, connect-callback-cobertura e
 * mais uma no teste que varre a app/api inteira. O incômodo não é o tamanho:
 * cada cópia normalizava o separador de caminho à sua maneira (`replace(/\\/g)`
 * numas, `split(path.sep)` noutra), e os testes comparam esses nomes entre si.
 *
 * Mora FORA de `__tests__/` de propósito: o `testMatch` padrão do next/jest
 * coleta qualquer `.ts` sob `__tests__/` como suíte, e um arquivo de helper sem
 * `describe` quebraria com "Your test suite must contain at least one test".
 */
import fs   from "node:fs"
import path from "node:path"

export type RotaLida = { nome: string; fonte: string }

/**
 * Lê recursivamente todos os `route.ts` sob `dir`, com `nome` relativo a ele e
 * sempre com `/` como separador — os testes comparam esses nomes entre si, e no
 * Windows o separador nativo faria a comparação falhar por motivo errado.
 */
export function lerRotas(dir: string): RotaLida[] {
  const achadas: RotaLida[] = []

  const andar = (atual: string) => {
    for (const e of fs.readdirSync(atual, { withFileTypes: true })) {
      const cheio = path.join(atual, e.name)
      if (e.isDirectory()) andar(cheio)
      else if (e.name === "route.ts") {
        achadas.push({
          nome:  path.relative(dir, cheio).split(path.sep).join("/"),
          fonte: fs.readFileSync(cheio, "utf8"),
        })
      }
    }
  }

  andar(dir)
  return achadas
}

/** Caminho de um diretório da app, a partir da raiz do projeto. */
export function dirDaApp(...partes: string[]): string {
  return path.join(process.cwd(), ...partes)
}
