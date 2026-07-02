/**
 * jest.setup.js — setup global para a suíte de testes do app mobile (Expo)
 *
 * Este arquivo é executado APÓS o framework Jest ser inicializado
 * (setupFilesAfterEnv), então podemos usar expect, beforeEach etc.
 */

// Mock de react-native-reanimated: substitui a implementação nativa por
// uma versão JavaScript pura compatível com o ambiente Jest/jsdom.
// Deve vir antes de qualquer import do módulo nos testes.
require("react-native-reanimated/mock")

// Mock de expo-secure-store: no ambiente de testes não existe keychain/keystore.
// Simulamos um armazenamento em memória simples.
jest.mock("expo-secure-store", () => {
  const store = new Map()
  return {
    getItemAsync:    jest.fn(async (key) => store.get(key) ?? null),
    setItemAsync:    jest.fn(async (key, value) => { store.set(key, value) }),
    deleteItemAsync: jest.fn(async (key) => { store.delete(key) }),
  }
})

// Mock de expo-router: evita que o expo-router tente montar o sistema de
// navegação nativo (FileSystem, Linking, etc.) em ambiente Jest.
jest.mock("expo-router", () => ({
  router: {
    push:    jest.fn(),
    replace: jest.fn(),
    back:    jest.fn(),
  },
  Link:        ({ children }) => children,
  Redirect:    () => null,
  useRouter:   () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/",
  useSegments: () => [],
}))

// Mock de expo-constants (usado por alguns pacotes Expo internamente)
jest.mock("expo-constants", () => ({
  default: { expoConfig: { name: "ShareO", slug: "shareo" } },
}))

// Mock de @react-native-community/datetimepicker — componente nativo que
// não existe no ambiente Jest. Renderiza null sem erros.
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: () => React.createElement(React.Fragment, null),
  }
})

// Mock de react-native Linking para testes que envolvem abertura de URLs.
jest.mock("react-native/Libraries/Linking/Linking", () => ({
  canOpenURL: jest.fn(async () => true),
  openURL:    jest.fn(async () => undefined),
}))

// Silenciar warnings de console durante os testes para manter a saída limpa.
// Remova ou comente se precisar depurar avisos de um pacote específico.
const originalWarn = console.warn
beforeEach(() => {
  console.warn = (...args) => {
    // Suprimir warnings conhecidos de libs de terceiros que poluem a saída
    const msg = args[0]?.toString() ?? ""
    if (
      msg.includes("ReactNative.NativeModules") ||
      msg.includes("Animated:") ||
      msg.includes("VirtualizedLists should never be nested")
    ) {
      return
    }
    originalWarn(...args)
  }
})

afterEach(() => {
  console.warn = originalWarn
})
