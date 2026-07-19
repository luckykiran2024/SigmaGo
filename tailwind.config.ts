import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17200F",
        accent: { DEFAULT: "#D4A017", light: "#E3B02A", deep: "#A67C1A" },
        // Legacy usage: mirrors accent
        teal:   { DEFAULT: "#D4A017", light: "#E3B02A", deep: "#A67C1A" },
        "go-mist": "#FBF6E6",
        paper: "#FFFFFF",
        panel: "#F1EEE4",
        canvas: "#FAF8F2",      // app background
        forest: "#1E2B1C",      // sidebar / dark surfaces
        "forest-deep": "#141D13",
        body: "#4B5347",
        muted: "#5E6657",
        hair: "rgba(30,43,28,.12)",
        "seal-gold": "#D4A017",
        ok: "#2E7D5B",
        warn: "#C08A2E",
        err: "#B4453C",
        info: "#3B6B8F",
      },
      fontFamily: {
        display: ["var(--font-archivo)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
        ibmserif: ["var(--font-ibm-serif)", "serif"],
        ibmsans: ["var(--font-ibm-sans)", "sans-serif"],
        ibmmono: ["var(--font-ibm-mono)", "monospace"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        }
      },
      animation: {
        "fade-up": "fade-up 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
