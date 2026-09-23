import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        crimson: {
          50: "#FDF2F1",
          100: "#FBE3E1",
          200: "#F6C4C0",
          300: "#EEA29B",
          400: "#DE6F68",
          500: "#C6303E",
          600: "#A82438",
          700: "#8A1C2E",
          800: "#6E1725",
          900: "#55121D",
        },
        cream: {
          50: "#FDFBFA",
          100: "#FAF7F5",
          200: "#F3EDEA",
          300: "#E9E0DB",
          400: "#D9CCC5",
        },
        ink: {
          900: "#1C1A19",
          700: "#4A4442",
          500: "#746C69",
          300: "#A79F9C",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto-jp)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28, 26, 25, 0.04), 0 4px 16px rgba(28, 26, 25, 0.06)",
        "card-hover":
          "0 2px 4px rgba(28, 26, 25, 0.06), 0 12px 28px rgba(28, 26, 25, 0.10)",
      },
      spacing: {
        18: "4.5rem",
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
  plugins: [],
};
export default config;
