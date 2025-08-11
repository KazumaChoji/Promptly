import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--surface-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Neumorphic Shadow Colors
        shadow: {
          light: "hsl(var(--shadow-light))",
          dark: "hsl(var(--shadow-dark))",
        },
        // Extended Color Palette for Rich Design
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        blue: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        indigo: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        purple: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7c3aed",
          800: "#6b21a8",
          900: "#581c87",
          950: "#3b0764",
        },
        green: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        amber: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
        red: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Neumorphic specific radius
        neuro: "var(--radius)",
        "neuro-sm": "calc(var(--radius) * 0.75)",
        "neuro-lg": "calc(var(--radius) * 1.25)",
        "neuro-xl": "calc(var(--radius) * 1.5)",
      },
      boxShadow: {
        // Neumorphic shadows
        "neuro-sm": "var(--neuro-shadow-sm)",
        "neuro": "var(--neuro-shadow)",
        "neuro-lg": "var(--neuro-shadow-lg)",
        "neuro-xl": "var(--neuro-shadow-xl)",
        "neuro-inset-sm": "var(--neuro-inset-sm)",
        "neuro-inset": "var(--neuro-inset)",
        "neuro-inset-lg": "var(--neuro-inset-lg)",
        // Soft glows
        "glow-primary": "0 0 20px hsl(var(--primary) / 0.3)",
        "glow-secondary": "0 0 20px hsl(var(--secondary) / 0.3)",
        "glow-accent": "0 0 20px hsl(var(--accent) / 0.3)",
      },
      backgroundImage: {
        "neuro-gradient": "var(--neuro-gradient)",
        "neuro-gradient-reverse": "var(--neuro-gradient-reverse)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.75rem" }],
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
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
        // Neumorphic animations
        "neuro-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "neuro-pulse-soft": {
          "0%, 100%": { boxShadow: "var(--neuro-shadow)" },
          "50%": { boxShadow: "var(--neuro-shadow-lg)" },
        },
        "neuro-glow": {
          "0%": { 
            boxShadow: "var(--neuro-shadow), 0 0 20px hsl(var(--primary) / 0.3)" 
          },
          "100%": { 
            boxShadow: "var(--neuro-shadow-lg), 0 0 30px hsl(var(--primary) / 0.5)" 
          },
        },
        "neuro-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Enhanced UI animations
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-left": {
          "0%": { transform: "translateX(10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-right": {
          "0%": { transform: "translateX(-10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },

      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Neumorphic animations
        "neuro-float": "neuro-float 3s ease-in-out infinite",
        "neuro-pulse-soft": "neuro-pulse-soft 2s ease-in-out infinite",
        "neuro-glow": "neuro-glow 2s ease-in-out infinite alternate",
        "neuro-shimmer": "neuro-shimmer 1.5s ease-in-out infinite",
        // Enhanced UI animations
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "slide-left": "slide-left 0.3s ease-out",
        "slide-right": "slide-right 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",

      },
      transitionTimingFunction: {
        "bounce-soft": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "ease-spring": "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Custom plugin for neumorphic utilities
    function({ addUtilities, theme }: any) {
      const neuroUtilities = {
        '.neuro-pressed': {
          boxShadow: 'var(--neuro-inset-sm)',
          transform: 'scale(0.98)',
        },
        '.neuro-elevated': {
          boxShadow: 'var(--neuro-shadow-lg)',
          transform: 'translateY(-2px)',
        },
        '.neuro-floating': {
          boxShadow: 'var(--neuro-shadow-xl)',
          transform: 'translateY(-4px)',
        },
      };
      
      addUtilities(neuroUtilities);
    },
  ],
} satisfies Config;

export default config;
