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
        ink: "#1A1A1A",
        accent: {
          DEFAULT: "#FF5A3C",
          light: "#FFA08F",
          deep: "#D43F25",
        },
        teal: {
          DEFAULT: "#FF5A3C",
          light: "#FFA08F",
          deep: "#D43F25",
        },
        "go-mist": "#FFF0ED",
        paper: "#FFFFFF",
        panel: "#F5F5F4",
        "seal-gold": "#C8862A",
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
