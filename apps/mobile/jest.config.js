/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",

  // Extensões que o Jest vai considerar (inclui .tsx/.ts/.js)
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Resolver de módulos: alias @/* → raiz do app mobile
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
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
