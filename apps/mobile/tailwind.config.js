/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Design system ShareO
        primary:    "#0D1B2A",
        brand:      "#007B3C",
        accent:     "#F97316",
        success:    "#22C55E",
        background: "#F8FAFC",
        surface:    "#FFFFFF",
        foreground: "#0D1B2A",
        muted:      "#64748B",
        border:     "#E2E8F0",
      },
      fontFamily: {
        sans: ["Inter", "System"],
      },
    },
  },
  plugins: [],
}
