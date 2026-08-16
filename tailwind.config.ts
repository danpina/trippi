import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Alpenglow system — the warm light that hits a ridgeline at first tracks or last hole.
        ink: "#0E1A16", // deep pine-black: dark grounds, primary text
        mist: "#F4F7F1", // pale alpine-meadow white: page ground
        paper: "#FFFFFF", // card surface
        slate: "#5B6B63", // muted text, cool green-grey (not neutral grey)
        line: "#E1E8DE", // hairline borders
        ember: "#FF5A36", // primary accent: vivid coral / alpenglow light
        "ember-soft": "#FFE4DA",
        "ember-deep": "#C23B22",
        glacier: "#0EBFAE", // secondary accent: glacier teal
        "glacier-soft": "#D8F5F1",
        "glacier-deep": "#0A6E64",
        gold: "#F2B705", // sparing highlight: sunrise gold
        "gold-soft": "#FCEEC0",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,26,22,0.04), 0 8px 24px -8px rgba(14,26,22,0.12)",
        "card-hover": "0 4px 10px rgba(14,26,22,0.06), 0 20px 40px -12px rgba(14,26,22,0.20)",
        glow: "0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px -10px rgba(255,90,54,0.35)",
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(3%, -4%) scale(1.05)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        drift: "drift 18s ease-in-out infinite",
        "drift-slow": "drift 26s ease-in-out infinite reverse",
        "fade-up": "fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
