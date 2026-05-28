import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // ─── Breakpoints ──────────────────────────────────────
    // 375px (mobile), 768px (tablet), 1280px (desktop)
    screens: {
      xs: "375px",   // mobile crítico
      sm: "640px",   // mobile largo
      md: "768px",   // tablet
      lg: "1024px",  // desktop compacto
      xl: "1280px",  // desktop
      "2xl": "1536px",
    },

    // ─── Container ────────────────────────────────────────
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",  // 16px — mobile
        md: "2rem",       // 32px — tablet
        xl: "4rem",       // 64px — desktop
      },
      screens: {
        xl: "1280px",     // largura máxima do container
      },
    },

    extend: {
      // ─── Cores ──────────────────────────────────────────
      colors: {
        // Identidade Shareo (v1.0 — Maio 2026)
        shareo: {
          navy:          "#003366",   // Azul Marinho oficial
          "green-dark":  "#007B3C",   // Verde Escuro — botões, ação
          "green-light": "#59C686",   // Verde Claro de Apoio — decorativo
          "blue-medium": "#144D81",   // Azul Médio — seções intermediárias
          "off-white":   "#FFFFFF",
        },

        // Aliases semânticos — usar nos componentes
        brand: {
          DEFAULT:    "#007B3C",   // verde escuro — ação principal (WCAG 5.1:1 sobre branco)
          hover:      "#005F2E",   // verde escurecido ~20%
          light:      "#D4EDE1",   // verde claro (backgrounds sutis)
          foreground: "#FFFFFF",
          cta:        "#007B3C",   // verde WCAG AA sobre branco (5.1:1)
          ctaHover:   "#005F2E",   // hover do CTA
          link:       "#005F2E",   // verde para texto/link sobre fundo branco
        },
        primary: {
          DEFAULT:    "#003366",   // azul marinho oficial
          hover:      "#003D7A",   // azul marinho claro
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT:    "#007B3C",   // verde escuro WCAG-safe (5.1:1) — textos e ícones
          hover:      "#005F2E",
          light:      "#D4EDE1",   // fundo sutil para badges
          foreground: "#FFFFFF",
        },
        // Verde claro decorativo — apenas fundos/ícones, NÃO texto em fundo branco (2.1:1)
        // Em fundo escuro (#003366): ratio 7.4:1 ✅
        accent: {
          DEFAULT:    "#59C686",
          foreground: "#003366",   // texto SOBRE fundo accent
        },
        // Azul médio — seções intermediárias, bordas de ícones
        "blue-medium": {
          DEFAULT:    "#144D81",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT:    "#E74C3C",   // vermelho suave
          hover:      "#C0392B",
          light:      "#FDEDEC",
          foreground: "#FFFFFF",
        },

        // Superfícies e fundos
        background: "#FFFFFF",  // branco puro (identidade visual v1.0)
        surface:    "#FFFFFF",  // branco — cards, modais

        // Texto
        foreground: "#0F172A",           // slate-900 — texto principal
        "muted-foreground": "#64748B",   // slate-500 — texto secundário

        // Bordas
        border: "#E2E8F0",               // slate-200
        input:  "#E2E8F0",
        ring:   "#007B3C",               // verde para focus ring

        // Status de booking
        booking: {
          pending: "#F59E0B",     // amber — aguardando
          confirmed: "#3B82F6",   // blue — confirmado
          active: "#22C55E",      // green — em andamento
          returned: "#8B5CF6",    // violet — devolvido
          completed: "#64748B",   // slate — concluído
          cancelled: "#EF4444",   // red — cancelado
          disputed: "#F97316",    // orange — em disputa
        },

        // Status de item
        item: {
          available: "#007B3C",
          rented: "#F59E0B",
          inactive: "#94A3B8",
        },

        // Estado desabilitado
        disabled: {
          bg: "#E2E8F0",
          text: "#94A3B8",
          border: "#CBD5E1",
        },
      },

      // ─── Tipografia ─────────────────────────────────────
      fontFamily: {
        sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Escala completa alinhada ao Design System
        "2xs": ["0.75rem", { lineHeight: "1rem" }],          // 12px — label/caption
        xs:   ["0.75rem", { lineHeight: "1rem" }],            // 12px
        sm:   ["0.875rem", { lineHeight: "1.25rem" }],        // 14px — body small / botão
        base: ["1rem",     { lineHeight: "1.5rem" }],         // 16px — body
        lg:   ["1.125rem", { lineHeight: "1.75rem" }],        // 18px — subtítulo/card header
        xl:   ["1.25rem",  { lineHeight: "1.75rem" }],        // 20px
        "2xl":["1.5rem",   { lineHeight: "2rem" }],           // 24px
        "3xl":["1.875rem", { lineHeight: "2.25rem" }],        // 30px
        "4xl":["2rem",     { lineHeight: "2.5rem" }],         // 32px — título de página
        "5xl":["2.5rem",   { lineHeight: "1.1" }],            // 40px — hero
        "6xl":["3rem",     { lineHeight: "1.1" }],            // 48px — hero grande
      },
      fontWeight: {
        normal:    "400",
        medium:    "500",
        semibold:  "600",
        bold:      "700",
        extrabold: "800",
      },

      // ─── Espaçamento (grid de 4px) ───────────────────────
      // Os tokens de 4px nativo do Tailwind já são múltiplos de 4px.
      // Aliases semânticos para consistência nos componentes:
      spacing: {
        "px":  "1px",
        "0":   "0",
        "1":   "4px",    // 4px
        "2":   "8px",    // 8px
        "3":   "12px",   // 12px
        "4":   "16px",   // 16px
        "6":   "24px",   // 24px
        "8":   "32px",   // 32px
        "12":  "48px",   // 48px
        "16":  "64px",   // 64px
        // Mantém escala completa do Tailwind para valores intermediários
        "0.5": "2px",
        "1.5": "6px",
        "2.5": "10px",
        "3.5": "14px",
        "5":   "20px",
        "7":   "28px",
        "9":   "36px",
        "10":  "40px",
        "11":  "44px",   // tap target mínimo (WCAG)
        "14":  "56px",
        "20":  "80px",
        "24":  "96px",
        "32":  "128px",
        "40":  "160px",
        "48":  "192px",
        "56":  "224px",
        "64":  "256px",
        "72":  "288px",
        "80":  "320px",
        "96":  "384px",
      },

      // ─── Border Radius ───────────────────────────────────
      borderRadius: {
        none:    "0",
        sm:      "4px",
        DEFAULT: "6px",   // inputs
        md:      "6px",   // inputs
        lg:      "8px",   // cards
        xl:      "12px",
        "2xl":   "16px",
        "3xl":   "24px",
        full:    "9999px", // avatares, badges
      },

      // ─── Sombras ─────────────────────────────────────────
      boxShadow: {
        sm:    "0 1px 2px 0 rgb(0 51 102 / 0.05)",
        DEFAULT:"0 1px 3px 0 rgb(0 51 102 / 0.10), 0 1px 2px -1px rgb(0 51 102 / 0.10)",
        md:    "0 4px 6px -1px rgb(0 51 102 / 0.10), 0 2px 4px -2px rgb(0 51 102 / 0.10)",
        lg:    "0 10px 15px -3px rgb(0 51 102 / 0.10), 0 4px 6px -4px rgb(0 51 102 / 0.10)",
        xl:    "0 20px 25px -5px rgb(0 51 102 / 0.10), 0 8px 10px -6px rgb(0 51 102 / 0.10)",
        card:  "0 2px 8px 0 rgb(0 51 102 / 0.08)",      // sombra padrão de cards
        modal: "0 25px 50px -12px rgb(0 51 102 / 0.25)",
        none:  "none",
      },

      // ─── Ring (focus) ────────────────────────────────────
      ringColor: {
        DEFAULT: "#007B3C",
        brand:   "#007B3C",
        primary: "#003366",
      },
      ringOffsetColor: {
        background: "#FFFFFF",
      },
      ringWidth: {
        DEFAULT: "2px",
      },
      ringOffsetWidth: {
        DEFAULT: "2px",
      },

      // ─── Aspect Ratios ───────────────────────────────────
      aspectRatio: {
        "4/3":  "4 / 3",   // fotos de item (padrão)
        "1/1":  "1 / 1",   // thumbnails quadrados
        "16/9": "16 / 9",
        "3/4":  "3 / 4",   // mobile card tall
      },

      // ─── Z-index ─────────────────────────────────────────
      zIndex: {
        "0":          "0",
        "10":         "10",
        "20":         "20",
        "30":         "30",
        "40":         "40",
        "50":         "50",
        dropdown:     "100",
        sticky:       "200",
        overlay:      "300",
        modal:        "400",
        toast:        "500",
        tooltip:      "600",
      },

      // ─── Animações ───────────────────────────────────────
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "skeleton-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "fade-in":       "fade-in 150ms ease-out",
        "fade-up":       "fade-up 200ms ease-out",
        "slide-up":      "slide-up 250ms ease-out",   // bottom sheet
        "skeleton":      "skeleton-pulse 1.5s ease-in-out infinite",
      },

      // ─── Transições ──────────────────────────────────────
      transitionDuration: {
        DEFAULT: "150ms",
        fast:    "100ms",
        normal:  "150ms",
        slow:    "300ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      // ─── Altura mínima de tap target (WCAG) ──────────────
      minHeight: {
        tap: "44px",   // tap target mínimo recomendado
      },
      minWidth: {
        tap: "44px",
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/forms'),
  ],
}

export default config
