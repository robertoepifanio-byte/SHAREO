// Fonte: app/globals.css (:root) + docs/design/mobile-app-handoff.md §2
// Transcrição dos tokens do site para NativeWind.

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ── Identidade Shareo — transcritos de globals.css :root ──────────
        primary:     "#003366",   // --primary / navy
        brand:       "#007B3C",   // --brand / verde ação
        accent:      "#59C686",   // --accent / verde claro (NUNCA com texto branco)
        "blue-mid":  "#144D81",   // --blue-medium

        // ── Superfícies ──────────────────────────────────────────────────
        background:  "#F8FAFC",   // --surface-muted (fundo de tela no app)
        surface:     "#FFFFFF",   // --surface (cards, headers)

        // ── Texto ────────────────────────────────────────────────────────
        foreground:  "#0F172A",   // --foreground
        muted:       "#64748B",   // --muted-foreground

        // ── Bordas ───────────────────────────────────────────────────────
        border:      "#E2E8F0",   // --border

        // ── Semânticos ───────────────────────────────────────────────────
        success:     "#007B3C",   // --success
        destructive: "#C0392B",   // --destructive WCAG AA (5.44:1)
        warning:     "#F59E0B",   // --booking-pending / amber

        // ── Orange ───────────────────────────────────────────────────────
        orange: {
          DEFAULT: "#F97316",     // --orange decorativo
          cta:     "#C05800",     // --orange-cta WCAG AA
          link:    "#9A4700",     // --orange-link WCAG AA
        },

        // ── Disabled ─────────────────────────────────────────────────────
        "disabled-bg":     "#E2E8F0",  // --disabled-bg
        "disabled-text":   "#94A3B8",  // --disabled-text
        "disabled-border": "#CBD5E1",  // --disabled-border
      },
      fontFamily: {
        // Inter para corpo de texto
        sans:    ["Inter_400Regular", "Inter", "System"],
        // Montserrat para headings (via @expo-google-fonts/montserrat)
        heading: ["Montserrat_700Bold", "Montserrat_800ExtraBold", "System"],
        display: ["Montserrat_700Bold", "System"],
      },
      borderRadius: {
        sm:   6,
        md:   8,
        lg:   12,
        xl:   16,
        "2xl": 20,
      },
      minHeight: {
        // Tap targets mínimos — mesma regra do site (min-h-11 = 44px)
        11: 44,   // 44px — tap target padrão
        13: 52,   // 52px — botão lg e FAB
      },
    },
  },
  plugins: [],
}
