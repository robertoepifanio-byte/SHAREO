import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({ dir: "./" })

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    // MSW v2 and @mswjs/* use package.json exports that Jest can't resolve via pnpm's
    // virtual store. Map them explicitly to their CJS builds.
    "^msw/node$": "<rootDir>/node_modules/msw/lib/node/index.js",
    "^@mswjs/interceptors/ClientRequest$":
      "<rootDir>/node_modules/.pnpm/@mswjs+interceptors@0.41.9/node_modules/@mswjs/interceptors/lib/node/interceptors/ClientRequest/index.cjs",
    "^@mswjs/interceptors/XMLHttpRequest$":
      "<rootDir>/node_modules/.pnpm/@mswjs+interceptors@0.41.9/node_modules/@mswjs/interceptors/lib/node/interceptors/XMLHttpRequest/index.cjs",
    "^@mswjs/interceptors/fetch$":
      "<rootDir>/node_modules/.pnpm/@mswjs+interceptors@0.41.9/node_modules/@mswjs/interceptors/lib/node/interceptors/fetch/index.cjs",
    "^@mswjs/interceptors/presets/node$":
      "<rootDir>/node_modules/.pnpm/@mswjs+interceptors@0.41.9/node_modules/@mswjs/interceptors/lib/node/presets/node.cjs",
    "^@mswjs/interceptors(.*)$":
      "<rootDir>/node_modules/.pnpm/@mswjs+interceptors@0.41.9/node_modules/@mswjs/interceptors/lib/node$1/index.cjs",
  },
  // Pacotes ESM-only que o Jest precisa transpilar (não são CJS).
  // @upstash/*: Redis/Ratelimit — ESM-only
  // next-auth@5: exports ESM por padrão
  transformIgnorePatterns: [
    "/node_modules/(?!(@upstash|next-auth|@auth)/)",
  ],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/e2e/",
  ],
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "utils/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "app/api/**/*.{ts,tsx}",
    "middleware.ts",
    "!**/*.d.ts",
    "!**/index.ts",
  ],
  // Threshold global: mínimo real atingível com a suíte P0 atual.
  // Valores medidos com `jest --coverage` completo (todos os 5 test suites):
  //   statements 1.12% | branches 23.52% | functions 11.26% | lines 1.12%
  // Aumentar gradualmente conforme novos módulos forem cobertos — meta H1: 70% global.
  // Os três módulos de domínio cobertos pelos testes P0 têm threshold individual de 70%.
  coverageThreshold: {
    global: { lines: 1, functions: 11, branches: 23, statements: 1 },
    "./lib/pricing.ts":              { lines: 70, functions: 70, branches: 70, statements: 70 },
    "./lib/crypto.ts":               { lines: 70, functions: 70, branches: 70, statements: 70 },
    "./lib/validations/bookings.ts": { lines: 70, functions: 70, branches: 70, statements: 70 },
  },
}

export default createJestConfig(config)
