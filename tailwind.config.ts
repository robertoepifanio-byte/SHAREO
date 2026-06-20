import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: 'class',

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
          navy:          "rgb(var(--shareo-navy) / <alpha-value>)",
          "green-dark":  "rgb(var(--shareo-green-dark) / <alpha-value>)",
          "green-light": "rgb(var(--shareo-green-light) / <alpha-value>)",
          "blue-medium": "rgb(var(--shareo-blue-medium) / <alpha-value>)",
          "off-white":   "rgb(var(--shareo-off-white) / <alpha-value>)",
        },

        // Aliases semânticos — usar nos componentes
        brand: {
          DEFAULT:    "rgb(var(--brand) / <alpha-value>)",
          hover:      "rgb(var(--brand-hover) / <alpha-value>)",
          light:      "rgb(var(--brand-light) / <alpha-value>)",
          foreground: "rgb(var(--brand-foreground) / <alpha-value>)",
          cta:        "rgb(var(--brand-cta) / <alpha-value>)",
          ctaHover:   "rgb(var(--brand-cta-hover) / <alpha-value>)",
          link:       "rgb(var(--brand-link) / <alpha-value>)",
        },
        primary: {
          DEFAULT:    "rgb(var(--primary) / <alpha-value>)",
          hover:      "rgb(var(--primary-hover) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT:    "rgb(var(--success) / <alpha-value>)",
          hover:      "rgb(var(--success-hover) / <alpha-value>)",
          light:      "rgb(var(--success-light) / <alpha-value>)",
          foreground: "rgb(var(--success-foreground) / <alpha-value>)",
        },
        // Verde claro decorativo — apenas fundos/ícones, NÃO texto em fundo branco (2.1:1)
        // Em fundo escuro (#003366): ratio 8.4:1 ✅ | no dark pode ser texto ✅
        accent: {
          DEFAULT:    "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        // Laranja — identidade Shareo
        orange: {
          DEFAULT:  "rgb(var(--orange) / <alpha-value>)",
          cta:      "rgb(var(--orange-cta) / <alpha-value>)",
          link:     "rgb(var(--orange-link) / <alpha-value>)",
          hover:    "rgb(var(--orange-hover) / <alpha-value>)",
          light:    "rgb(var(--orange-light) / <alpha-value>)",
        },
        // Azul médio — seções intermediárias, bordas de ícones
        "blue-medium": {
          DEFAULT:    "rgb(var(--blue-medium) / <alpha-value>)",
          foreground: "rgb(var(--blue-medium-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT:    "rgb(var(--destructive) / <alpha-value>)",
          hover:      "rgb(var(--destructive-hover) / <alpha-value>)",
          light:      "rgb(var(--destructive-light) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },

        // Superfícies e fundos
        background:     "rgb(var(--background) / <alpha-value>)",
        surface:        "rgb(var(--surface) / <alpha-value>)",

        // Texto
        foreground:           "rgb(var(--foreground) / <alpha-value>)",
        "muted-foreground":   "rgb(var(--muted-foreground) / <alpha-value>)",
        // Token `muted` como objeto para suportar bg-muted / text-muted-foreground via objeto
        muted: {
          DEFAULT:    "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },

        // Bordas
        border: "rgb(var(--border) / <alpha-value>)",
        input:  "rgb(var(--input) / <alpha-value>)",
        ring:   "rgb(var(--ring) / <alpha-value>)",

        // Status de booking
        booking: {
          pending:   "rgb(var(--booking-pending) / <alpha-value>)",
          confirmed: "rgb(var(--booking-confirmed) / <alpha-value>)",
          active:    "rgb(var(--booking-active) / <alpha-value>)",
          returned:  "rgb(var(--booking-returned) / <alpha-value>)",
          completed: "rgb(var(--booking-completed) / <alpha-value>)",
          cancelled: "rgb(var(--booking-cancelled) / <alpha-value>)",
          disputed:  "rgb(var(--booking-disputed) / <alpha-value>)",
        },

        // Status de item
        item: {
          available: "rgb(var(--item-available) / <alpha-value>)",
          rented:    "rgb(var(--item-rented) / <alpha-value>)",
          inactive:  "rgb(var(--item-inactive) / <alpha-value>)",
        },

        // Estado desabilitado
        disabled: {
          bg:     "rgb(var(--disabled-bg) / <alpha-value>)",
          text:   "rgb(var(--disabled-text) / <alpha-value>)",
          border: "rgb(var(--disabled-border) / <alpha-value>)",
        },

        // Hero badge dourado
        gold: "rgb(var(--gold) / <alpha-value>)",

        // VIP section deep navy (gradiente)
        "navy-deep": "rgb(var(--navy-deep) / <alpha-value>)",

        // Simulador output border
        "sim-border": "rgb(var(--sim-border) / <alpha-value>)",

        // Background sutil de seções alternadas
        "surface-muted": "rgb(var(--surface-muted) / <alpha-value>)",
      },

      // ─── Tipografia ─────────────────────────────────────
      fontFamily: {
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-montserrat)", "Montserrat", "system-ui", "sans-serif"],
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
      // Fase 1: navy hardcoded mantido — elevação dark é Fase 4
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
        DEFAULT: "rgb(var(--ring) / <alpha-value>)",
        brand:   "rgb(var(--ring) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        orange:  "rgb(var(--orange-link) / <alpha-value>)",
      },
      ringOffsetColor: {
        background: "rgb(var(--ring-offset-background) / <alpha-value>)",
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
    // Fase 2: strategy 'class' após auditoria completa de inputs (todos os controles crus
    // receberam classes de bg/cor/borda explícitas — ver relatório Fase 2 no dark-mode-plan.md)
    require('@tailwindcss/forms')({ strategy: 'class' }),
  ],
}

export default config
