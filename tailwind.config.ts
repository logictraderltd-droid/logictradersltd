import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/sections/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        gold: {
          50: "#fdf9e7",
          100: "#f9f0c4",
          200: "#f3e295",
          300: "#ecd05a",
          400: "#e6c234",
          500: "#d4a017",
          600: "#b8860b",
          700: "#966f0d",
          800: "#7d5c14",
          900: "#684c16",
          950: "#3d280a",
        },
        dark: {
          50: "#f6f6f7",
          100: "#e2e2e5",
          200: "#c5c5ca",
          300: "#9fa0a9",
          400: "#787a86",
          500: "#5c5e6b",
          600: "#484a55",
          700: "#3c3d46",
          800: "#32333a",
          900: "#1a1a1e",
          950: "#0f0f11",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(212, 160, 23, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(212, 160, 23, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
