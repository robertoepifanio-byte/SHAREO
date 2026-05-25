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
    "!**/*.d.ts",
    "!**/index.ts",
  ],
  // TODO: aumentar para 70 quando cobertura dos módulos auth/items/bookings/users atingir a meta
  coverageThreshold: {
    global: { lines: 0, functions: 0, branches: 0, statements: 0 },
  },
}

export default createJestConfig(config)
