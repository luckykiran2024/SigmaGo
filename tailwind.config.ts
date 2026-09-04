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
        card: "#FFFFFF",
        border: "#E4E7EC",
        ink: "#182230",
        ink2: "#475467",
        muted: "#667085",
        muted2: "#98A2B3",
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
        forest: "#182230",
        "forest-deep": "#182230",
        info: "#274C77",
        body: "#182230",
        "go-mist": "#F9FAFB",
      },
      fontSize: {
        'micro': ['11px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'badge': ['12px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'label': ['12px', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'body': ['14px', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'subhead': ['14px', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'card-title': ['14px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'topbar': ['18px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'doc-title': ['24px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'section-title': ['26px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'hero-title': ['36px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        ibmsans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        ibmmono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        body: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        ibmserif: ["var(--font-inter)", "Inter", "sans-serif"],
        fraunces: ["var(--font-inter)", "Inter", "sans-serif"],
        inter: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        badge: "4px",
        btn: "6px",
        input: "6px",
        card: "8px",
        container: "8px",
        modal: "10px",
        drawer: "10px",
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
