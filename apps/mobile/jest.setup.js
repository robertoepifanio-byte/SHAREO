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

// Token público Mapbox de teste — ItemsMapNative lê EXPO_PUBLIC_MAPBOX_TOKEN no
// load do módulo; sem valor, cai sempre no fallback. Valor fake só p/ os testes
// exercitarem o caminho do mapa renderizado (o SDK está mockado, não faz rede).
process.env.EXPO_PUBLIC_MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "pk.test-jest"

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
// react-native/index.js acessa via `require(...).default` (getter Linking) —
// sem o `default` aqui, `import { Linking } from "react-native"` resolve
// undefined e qualquer chamada a Linking.openURL quebra em runtime de teste.
jest.mock("react-native/Libraries/Linking/Linking", () => {
  const mock = {
    canOpenURL: jest.fn(async () => true),
    openURL:    jest.fn(async () => undefined),
  }
  return { ...mock, default: mock }
})

// Mock de @react-native-async-storage/async-storage — usado pelo ThemeProvider.
jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map()
  return {
    getItem:    jest.fn(async (key) => store.get(key) ?? null),
    setItem:    jest.fn(async (key, value) => { store.set(key, value) }),
    removeItem: jest.fn(async (key) => { store.delete(key) }),
    clear:      jest.fn(async () => { store.clear() }),
  }
})

// Mock de react-native-svg — substitui SVGs nativos por componentes React vazios.
jest.mock("react-native-svg", () => {
  const React = require("react")
  const { View } = require("react-native")
  const MockSvg = ({ children, ...props }) =>
    React.createElement(View, { testID: props.testID }, children)
  const mockEl = (name) => ({ children }) =>
    React.createElement(React.Fragment, null, children ?? null)
  return {
    __esModule: true,
    default:    MockSvg,
    Svg:        MockSvg,
    Circle:     mockEl("Circle"),
    Ellipse:    mockEl("Ellipse"),
    Rect:       mockEl("Rect"),
    Path:       mockEl("Path"),
    Line:       mockEl("Line"),
    Polyline:   mockEl("Polyline"),
    Polygon:    mockEl("Polygon"),
    G:          mockEl("G"),
    Text:       mockEl("Text"),
    TSpan:      mockEl("TSpan"),
    Defs:       mockEl("Defs"),
    Stop:       mockEl("Stop"),
    LinearGradient: mockEl("LinearGradient"),
  }
})

// Mock de expo-font e @expo-google-fonts/montserrat
jest.mock("expo-font", () => ({
  useFonts:  jest.fn(() => [true, null]),
  loadAsync: jest.fn(async () => undefined),
  isLoaded:  jest.fn(() => true),
}))
jest.mock("@expo-google-fonts/montserrat", () => ({
  Montserrat_700Bold:      "Montserrat_700Bold",
  Montserrat_800ExtraBold: "Montserrat_800ExtraBold",
}))

// Mock de react-native-safe-area-context — evita "No safe area value available"
// e componente nativo RNCSafeAreaProvider que renderiza vazio no Jest.
jest.mock("react-native-safe-area-context", () => {
  const React = require("react")
  const { View } = require("react-native")
  return {
    SafeAreaProvider: ({ children }) => React.createElement(View, null, children),
    SafeAreaView:     ({ children }) => React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame:  () => ({ x: 0, y: 0, width: 375, height: 812 }),
  }
})

// Mock de expo-image — componente nativo ausente no ambiente Jest.
jest.mock("expo-image", () => {
  const React = require("react")
  const { View } = require("react-native")
  return {
    Image: ({ accessibilityLabel, style }) =>
      React.createElement(View, { accessibilityLabel, style }),
  }
})

// Mock de @rnmapbox/maps — SDK nativo indisponível no Jest. Sem este mock,
// qualquer teste que importe o mapa nativo (ItemsMapNative/mapa.tsx) quebra
// ao resolver o módulo. Componentes viram Views vazias; setAccessToken é no-op.
jest.mock("@rnmapbox/maps", () => {
  const React = require("react")
  const { View } = require("react-native")
  const Passthrough = ({ children, ...props }) =>
    React.createElement(View, { accessibilityLabel: props.accessibilityLabel }, children)
  const Ref = React.forwardRef(({ children }, _ref) =>
    React.createElement(View, null, children))
  return {
    __esModule:  true,
    default:     { setAccessToken: jest.fn(), StyleURL: { Dark: "dark", Street: "street" } },
    MapView:     Passthrough,
    Camera:      Ref,
    ShapeSource: Ref,
    SymbolLayer: Passthrough,
    CircleLayer: Passthrough,
    Images:      Passthrough,
  }
})

// Mock de expo-location — GPS indisponível no Jest. Default: permissão negada
// (cai no fallback numérico do mapa, sem tentar geolocalizar).
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied" }),
  getCurrentPositionAsync:           jest.fn(),
  Accuracy: { Balanced: 3 },
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
