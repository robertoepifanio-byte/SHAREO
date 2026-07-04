const path = require("path")
const fs   = require("fs")

/**
 * Localiza o diretório raiz do workspace pnpm caminhando para cima a partir de
 * __dirname até encontrar um node_modules com subpasta .pnpm. Necessário para
 * resolver o React correto em monorepos onde o pnpm hoísta react@19.2.6 (da
 * dependência do site Next.js) sobre o react@19.1.0 do app mobile.
 *
 * Sem este mapeamento, o react-test-renderer@19.1.0 e o react importado pelos
 * componentes são instâncias diferentes, causando "Cannot read properties of
 * null (reading 'useEffect')" em TODOS os testes de tela — issue pré-existente
 * antes desta PR.
 */
function findPnpmRoot(startDir) {
  let dir = startDir
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "node_modules", ".pnpm"))) return dir
    dir = path.dirname(dir)
  }
  return null
}

const pnpmRoot    = findPnpmRoot(__dirname)
const react191Dir = pnpmRoot
  ? path.join(pnpmRoot, "node_modules/.pnpm/react@19.1.0/node_modules/react")
  : null
const hasReact191 = react191Dir && fs.existsSync(path.join(react191Dir, "package.json"))

/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",

  // Extensões que o Jest vai considerar (inclui .tsx/.ts/.js)
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Resolver de módulos: alias @/* → raiz do app mobile.
  // Inclui mapeamento de react → react@19.1.0 para garantir uma única instância
  // React em testes (corrige mismatch com react-test-renderer@19.1.0).
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    ...(hasReact191 ? {
      "^react$":     react191Dir,
      "^react/(.*)$": `${react191Dir}/$1`,
    } : {}),
  },

  // NÃO sobrescrever transformIgnorePatterns: o preset jest-expo já traz a lista
  // correta (react-native, @react-native/*, expo, etc.). Um override incompleto
  // quebra o setup do RN ("Cannot use import statement outside a module").

  // Setup executado após inicializar o ambiente de testes
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // Coletar cobertura só dos arquivos de lib (funções puras)
  collectCoverageFrom: ["lib/**/*.{ts,tsx}", "!**/*.d.ts"],

  // Ambiente padrão react-native (herdado do preset jest-expo)
  // Sem testEnvironment explícito — jest-expo escolhe por plataforma
}
