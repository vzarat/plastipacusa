import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  // Scan only app source — unused utilities are purged from production CSS.
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/emails/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/actions/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/types/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        /** Ultrawide / 2K+ workspace layouts */
        "3xl": "1800px",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        teko: ["var(--font-teko)", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#1e40af",
          600: "#1d4ed8",
          700: "#1e3a8a",
          800: "#172554",
          900: "#0f172a",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          amber: "#f59e0b",
          orange: "#ea580c",
          cyan: "#0284c7",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        industrial: {
          dark: "#0b1120",
          navy: "#0f1f3d",
          steel: "#334155",
          highlight: "#ff6b00",
          silver: "#94a3b8",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
        creditShimmer: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(300%)" },
        },
        creditModalBackdrop: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        creditModalPanel: {
          "0%": { opacity: "0", transform: "translateY(28px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        creditModalPanelDesktop: {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.94)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        marquee: "marquee 35s linear infinite",
        creditShimmer: "creditShimmer 1.8s linear infinite",
        creditModalBackdrop: "creditModalBackdrop 0.28s ease-out forwards",
        creditModalPanel:
          "creditModalPanel 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        creditModalPanelDesktop:
          "creditModalPanelDesktop 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
