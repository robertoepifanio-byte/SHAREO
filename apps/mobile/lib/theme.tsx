// Fonte: app/globals.css (:root e .dark) + docs/design/mobile-app-handoff.md §4
// Transcrição literal dos canais RGB de globals.css para objetos TypeScript.

import { Appearance, useColorScheme } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

export type ThemePreference = "light" | "system" | "dark"

/** Resolve a preferência para o modo efetivo de renderização */
export function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "light") return "light"
  if (pref === "dark")  return "dark"
  return Appearance.getColorScheme() === "dark" ? "dark" : "light"
}

// ── Tokens light — transcritos de globals.css :root ─────────────────────────
// Superfícies: bg (#F8FAFC) é o fundo de tela (--surface-muted do site),
// surface (#FFFFFF) é fundo de cards/headers, conforme handoff §4.1.
export const LIGHT_TOKENS = {
  bg:        "#F8FAFC",   // --surface-muted
  surface:   "#FFFFFF",   // --surface
  text:      "#0F172A",   // --foreground
  muted:     "#64748B",   // --muted-foreground
  border:    "#E2E8F0",   // --border
  navy:      "#003366",   // --primary / --shareo-navy
  green:     "#007B3C",   // --brand / --shareo-green-dark
  error:     "#C0392B",   // --destructive (WCAG AA 5.44:1 sobre branco)
  warning:   "#F59E0B",   // --booking-pending
  success:   "#007B3C",   // --success
  accent:    "#59C686",   // --accent (verde claro): texto SOBRE fundo navy/primary — não sobre branco (2.07:1)
  bookingPending:   "#F59E0B",
  bookingActive:    "#007B3C",
  bookingCompleted: "#64748B",
  bookingCancelled: "#E74C3C",
  bookingDisputed:  "#C05800",
  disabledBg:     "#E2E8F0",
  disabledText:   "#94A3B8",
  disabledBorder: "#CBD5E1",
} as const

// ── Tokens dark — transcritos de globals.css .dark ──────────────────────────
// MOB-BL3 resolvido: toggle tri-state ativo em MobileMenu, telas consomem
// tokens dinâmicos via useTheme(). Staging apenas — produção segue gated D4
// como o resto do app.
export const DARK_TOKENS = {
  bg:        "#0B1524",   // --background dark
  surface:   "#15233B",   // --surface dark
  text:      "#E8EEF6",   // --foreground dark
  muted:     "#94A3B8",   // --muted-foreground dark
  border:    "#26395A",   // --border dark
  navy:      "#1E4D80",   // --primary dark #1E4D80 (chips/badges + texto primary). Antes #003366 fixo (não flipava) → navy-as-text sumia no dark (~1.24:1). Achado revisão s41.
  green:     "#007B3C",   // fill preservado (--brand dark; branco 5.39:1)
  error:     "#D14438",   // --destructive dark
  warning:   "#FBBF77",   // --booking-pending dark
  success:   "#5BD08B",   // --success dark
  accent:    "#59C686",   // --accent (mesmo valor; ok como texto no dark sobre navy)
  bookingPending:   "#FBBF77",
  bookingActive:    "#5BD08B",
  bookingCompleted: "#94A3B8",
  bookingCancelled: "#F08C84",
  bookingDisputed:  "#F0A35E",
  disabledBg:     "#26395A",
  disabledText:   "#4A5E7A",
  disabledBorder: "#26395A",
} as const

// Tokens é tipo estrutural (string, não literal) para aceitar LIGHT_TOKENS e DARK_TOKENS
// sem TS2322 ("literal incompatível com outro literal").
export type Tokens = {
  bg:               string
  surface:          string
  text:             string
  muted:            string
  border:           string
  navy:             string
  green:            string
  error:            string
  warning:          string
  success:          string
  accent:           string
  bookingPending:   string
  bookingActive:    string
  bookingCompleted: string
  bookingCancelled: string
  bookingDisputed:  string
  disabledBg:       string
  disabledText:     string
  disabledBorder:   string
}

// ── Persistência ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "theme-preference"

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark" || stored === "system") return stored
  } catch { /* AsyncStorage indisponível — usa padrão */ }
  return "system"
}

export async function saveThemePreference(pref: ThemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, pref)
  } catch { /* falha silenciosa */ }
}

// ── Context ───────────────────────────────────────────────────────────────────
interface ThemeContextValue {
  preference:    ThemePreference
  mode:          "light" | "dark"
  tokens:        Tokens
  setPreference: (pref: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  preference:    "system",
  mode:          "light",
  tokens:        LIGHT_TOKENS,
  setPreference: () => undefined,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>("system")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadThemePreference().then((pref) => {
      setPreferenceState(pref)
      setReady(true)
    })
  }, [])

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref)
    saveThemePreference(pref)
  }, [])

  const mode: "light" | "dark" =
    preference === "system"
      ? systemScheme === "dark" ? "dark" : "light"
      : preference

  const tokens = mode === "dark" ? DARK_TOKENS : LIGHT_TOKENS

  // Aguarda AsyncStorage para evitar flash de tema errado.
  // Em testes (__DEV__ pode ser true mas process.env.NODE_ENV === "test" é confiável),
  // renderiza imediatamente com o padrão para não bloquear os testes.
  if (!ready && process.env.NODE_ENV !== "test") return null

  return (
    <ThemeContext.Provider value={{ preference, mode, tokens, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
