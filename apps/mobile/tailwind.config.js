/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Design system ShareO — DID v1.0 (sincronizado com tailwind.config.ts)
        primary:     "#003366",   // navy DID v1.0
        brand:       "#007B3C",   // verde escuro — ação principal
        accent:      "#59C686",   // verde claro decorativo (nunca com texto branco)
        success:     "#007B3C",   // verde escuro WCAG-safe
        destructive: "#E74C3C",   // vermelho DID v1.0
        background:  "#F8FAFC",
        surface:     "#FFFFFF",
        foreground:  "#0F172A",   // texto principal
        muted:       "#64748B",   // texto secundário
        border:      "#E2E8F0",
        orange: {
          DEFAULT: "#F97316",
          cta:     "#C05800",     // botões com texto branco WCAG AA
          link:    "#9A4700",     // texto sobre fundo branco WCAG AA
        },
      },
      fontFamily: {
        sans:    ["Inter", "System"],
        display: ["Montserrat", "System"],
      },
    },
  },
  plugins: [],
}
