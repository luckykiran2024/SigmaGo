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
          950: "#0C1C2D",
          900: "#17324D", // Primary Navy Brand Anchor
          800: "#224564",
          700: "#315878",
          DEFAULT: "#17324D",
        },
        "sigma-teal": {
          700: "#096A72",
          600: "#0B7780", // Primary Teal Brand Accent
          500: "#108C94",
          100: "#D7ECEA",
          50:  "#ECF6F5",
          DEFAULT: "#0B7780",
        },
        "sigma-blue": {
          300: "#8BA6B7",
          100: "#D1E1E6",
          DEFAULT: "#8BA6B7",
        },
        // Surfaces & Neutrals
        "page-background": "#F6F8F9",
        "surface-primary": "#FFFFFF",
        "surface-secondary": "#EEF2F4",
        "surface-tertiary": "#E7EDF0",
        "text-primary": "#182B3D",
        "text-secondary": "#526679",
        "text-muted": "#637587",
        "border-default": "#DCE5EA",
        "border-subtle": "#EAF0F2",

        // Compatibility & Migration Bridges to Official System
        bg: "#F6F8F9",
        surface: "#FFFFFF",
        card: "#FFFFFF",
        border: "#DCE5EA",
        ink: "#182B3D",
        ink2: "#526679",
        muted: "#667085",
        muted2: "#637587",
        brand: {
          DEFAULT: "#17324D",
          deep: "#0C1C2D",
          light: "#315878",
        },
        "brand-deep": "#0C1C2D",
        seal: "#C9A227",
        ok: "#0F7548",
        warn: "#B54708",
        err: "#B42318",
        "section-alt": "#EEF2F4",

        canvas: "#FFFFFF",
        paper: "#FFFFFF",
        panel: "#FFFFFF",
        hair: "#DCE5EA",
        accent: {
          DEFAULT: "#0B7780",
          deep: "#17324D",
          light: "#D7ECEA",
        },
        "accent-deep": "#17324D",
        teal: {
          DEFAULT: "#0B7780",
          deep: "#096A72",
          light: "#D7ECEA",
        },
        "seal-gold": "#C9A227",
        forest: "#182B3D",
        "forest-deep": "#0C1C2D",
        info: "#17324D",
        body: "#182B3D",
        "go-mist": "#ECF6F5",
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
        'sigma-gradient': 'linear-gradient(135deg, #17324D 0%, #224564 35%, #0B7780 72%, #108C94 100%)',
        'sigma-gradient-subtle': 'linear-gradient(135deg, rgba(1, 47, 107, 0.04) 0%, rgba(5, 157, 176, 0.04) 100%)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
