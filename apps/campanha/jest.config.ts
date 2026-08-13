import type { Config } from "jest"
import nextJest from "next/jest.js"

/**
 * Jest para apps/campanha — app Next.js independente do marketplace.
 *
 * Usa a mesma base nextJest do repo raiz, mas com `dir` apontando para
 * este pacote (resolve next.config.ts e tsconfig.json daqui).
 *
 * Os testes de integração de rede ficam em __tests__/integration/ e são
 * excluídos do run padrão — precisam de servidor no ar e de
 * INTEGRATION_TEST_URL no ambiente. Execute-os separadamente:
 *
 *   jest --testPathPattern integration
 */
const createJestConfig = nextJest({ dir: "./" })

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    // Testes de integração de rede — excluídos do gate de CI porque precisam
    // de servidor no ar (staging ou dev local). Veja __tests__/integration/README.md.
    "<rootDir>/__tests__/integration/",
  ],
  moduleNameMapper: {
    // O tsconfig.json deste pacote já tem "@/*": ["./*"] mas nextJest lê o
    // tsconfig e converte; manter aqui como fallback explícito.
    "^@/(.*)$": "<rootDir>/$1",

    // Forçar uma única cópia de React em toda a suíte.
    //
    // O pnpm instalou react@19.1.0 em apps/campanha/node_modules e
    // react@19.2.6 na raiz (onde @testing-library/react e react-dom estão).
    // Com duas cópias, useState() do componente vem de 19.1.0 enquanto o
    // renderer é 19.2.6 → "Invalid hook call". Fixamos na 19.2.6 da raiz
    // que é a mesma que react-dom e @testing-library/react usam.
    "^react$": "<rootDir>/../../node_modules/react",
    "^react/(.*)$": "<rootDir>/../../node_modules/react/$1",
    "^react-dom$": "<rootDir>/../../node_modules/react-dom",
    "^react-dom/(.*)$": "<rootDir>/../../node_modules/react-dom/$1",
  },
}

export default createJestConfig(config)
