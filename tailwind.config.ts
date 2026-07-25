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
        bg: "#FFFFFF",
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
        "section-alt": "#F9FAFB",

        // Compatibility migration bridges
        canvas: "#FFFFFF",
        paper: "#FFFFFF",
        panel: "#FFFFFF",
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
        "go-mist": "#F9FAFB",
      },
      fontSize: {
        'micro': ['12px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'badge': ['13px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'label': ['14px', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'body': ['15px', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
        'subhead': ['16px', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
        'card-title': ['18px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'topbar': ['20px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'doc-title': ['24px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'section-title': ['34px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'hero-title': ['52px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      fontFamily: {
        sans: ["var(--font-ibm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-mono)", "monospace"],
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
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
