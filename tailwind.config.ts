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
        bg: "#F7F8FA",
        surface: "#FFFFFF",
        border: "#E4E7EC",
        ink: "#101828",
        muted: "#667085",
        brand: {
          DEFAULT: "#274C77",
          deep: "#1B3757",
        },
        "brand-deep": "#1B3757",
        seal: "#C9A227",
        ok: "#0F7548",
        warn: "#B54708",
        err: "#B42318",

        // Compatibility migration mappings (Phase 1 bridge)
        canvas: "#F7F8FA",
        paper: "#FFFFFF",
        panel: "#F7F8FA",
        hair: "#E4E7EC",
        accent: {
          DEFAULT: "#274C77",
          deep: "#1B3757",
          light: "#3A6394",
        },
        "accent-deep": "#1B3757",
        teal: {
          DEFAULT: "#274C77",
          deep: "#1B3757",
        },
        "seal-gold": "#C9A227",
        forest: "#101828",
        "forest-deep": "#101828",
        info: "#274C77",
        body: "#101828",
        "go-mist": "#F7F8FA",
      },
      fontFamily: {
        sans: ["var(--font-ibm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-mono)", "monospace"],
        // Compatibility font mappings mapped to IBM Plex
        ibmsans: ["var(--font-ibm-sans)", "system-ui", "sans-serif"],
        ibmmono: ["var(--font-ibm-mono)", "monospace"],
        display: ["var(--font-ibm-sans)", "system-ui", "sans-serif"],
        body: ["var(--font-ibm-sans)", "system-ui", "sans-serif"],
        ibmserif: ["var(--font-ibm-sans)", "system-ui", "sans-serif"],
        fraunces: ["var(--font-ibm-sans)", "system-ui", "sans-serif"],
        inter: ["var(--font-ibm-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        badge: "5px",
        btn: "6px",
        card: "8px",
        container: "8px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        }
      },
      animation: {
        "fade-up": "fade-up 300ms ease-out forwards",
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
