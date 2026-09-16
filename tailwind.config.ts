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
        // Official SigmaGo Enterprise Palette
        "sigma-navy": {
          950: "#07182F",
          900: "#012F6B", // Primary Navy Brand Anchor
          800: "#033E79",
          700: "#07508B",
          DEFAULT: "#012F6B",
        },
        "sigma-teal": {
          700: "#078899",
          600: "#059DB0", // Primary Teal Brand Accent
          500: "#05B2C0",
          100: "#DDF5F7",
          50:  "#F1FBFC",
          DEFAULT: "#059DB0",
        },
        "sigma-blue": {
          300: "#70A4BD",
          100: "#B8D6E1",
          DEFAULT: "#70A4BD",
        },
        // Surfaces & Neutrals
        "page-background": "#F7FAFC",
        "surface-primary": "#FFFFFF",
        "surface-secondary": "#F3F6F8",
        "surface-tertiary": "#EDF2F6",
        "text-primary": "#132238",
        "text-secondary": "#526377",
        "text-muted": "#8190A0",
        "border-default": "#DDE5EC",
        "border-subtle": "#EAF0F4",

        // Compatibility & Migration Bridges to Official System
        bg: "#F7FAFC",
        surface: "#FFFFFF",
        card: "#FFFFFF",
        border: "#DDE5EC",
        ink: "#132238",
        ink2: "#526377",
        muted: "#667085",
        muted2: "#8190A0",
        brand: {
          DEFAULT: "#012F6B",
          deep: "#07182F",
          light: "#07508B",
        },
        "brand-deep": "#07182F",
        seal: "#C9A227",
        ok: "#0F7548",
        warn: "#B54708",
        err: "#B42318",
        "section-alt": "#F3F6F8",

        canvas: "#FFFFFF",
        paper: "#FFFFFF",
        panel: "#FFFFFF",
        hair: "#DDE5EC",
        accent: {
          DEFAULT: "#059DB0",
          deep: "#012F6B",
          light: "#DDF5F7",
        },
        "accent-deep": "#012F6B",
        teal: {
          DEFAULT: "#059DB0",
          deep: "#078899",
          light: "#DDF5F7",
        },
        "seal-gold": "#C9A227",
        forest: "#132238",
        "forest-deep": "#07182F",
        info: "#012F6B",
        body: "#132238",
        "go-mist": "#F1FBFC",
      },
      fontSize: {
        'micro': ['11px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'badge': ['12px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'label': ['12px', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'body': ['14px', { lineHeight: '1.55', letterSpacing: '-0.01em' }],
        'subhead': ['14px', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'card-title': ['15px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'topbar': ['16px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'component-title': ['18px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'section-title': ['20px', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'doc-title': ['24px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'page-title': ['28px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'hero-title': ['32px', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'kpi-value': ['32px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        ibmsans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        ibmmono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        body: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        inter: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        badge: "4px",
        btn: "6px",
        input: "6px",
        card: "10px",
        container: "10px",
        modal: "12px",
        drawer: "12px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(19, 34, 56, 0.04)",
        sm: "0 1px 3px 0 rgba(19, 34, 56, 0.06), 0 1px 2px -1px rgba(19, 34, 56, 0.04)",
        card: "0 1px 3px 0 rgba(19, 34, 56, 0.04), 0 1px 2px 0 rgba(19, 34, 56, 0.02)",
        dropdown: "0 10px 25px -3px rgba(19, 34, 56, 0.08), 0 4px 6px -4px rgba(19, 34, 56, 0.04)",
        modal: "0 20px 30px -10px rgba(19, 34, 56, 0.12), 0 8px 10px -6px rgba(19, 34, 56, 0.06)",
      },
      backgroundImage: {
        'sigma-gradient': 'linear-gradient(135deg, #012F6B 0%, #033E79 35%, #059DB0 72%, #05B2C0 100%)',
        'sigma-gradient-subtle': 'linear-gradient(135deg, rgba(1, 47, 107, 0.04) 0%, rgba(5, 157, 176, 0.04) 100%)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
