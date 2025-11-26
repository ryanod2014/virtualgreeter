import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  // Use a custom prefix to avoid conflicts with host page styles
  prefix: "gg-",
  theme: {
    extend: {
      colors: {
        widget: {
          bg: "var(--gg-bg, #0f0f14)",
          surface: "var(--gg-surface, #1a1a24)",
          border: "var(--gg-border, #2a2a3a)",
          text: "var(--gg-text, #e4e4eb)",
          muted: "var(--gg-muted, #8888a0)",
          primary: "var(--gg-primary, #6366f1)",
          success: "var(--gg-success, #22c55e)",
        },
      },
      animation: {
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.3s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

