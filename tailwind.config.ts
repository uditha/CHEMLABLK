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
        // Core lab theme
        navy: {
          DEFAULT: "#1C3260",
          light: "#253F7E",
          dark: "#142342",
        },
        teal: {
          DEFAULT: "#0F917A",
          light: "#13B899",
          dark: "#0B6E5C",
        },
        gold: {
          DEFAULT: "#C9921E",
          light: "#D9A832",
          dark: "#A07018",
        },
        // Lab surfaces
        bench: "#091219",
        deep: "#060D16",
        panel: "#0D1B2A",
        border: {
          DEFAULT: "#1D3248",
          light: "#273F5C",
        },
        // Status colours
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#3b82f6",
        // Metal flame colours
        flame: {
          sodium: "#FFA500",
          potassium: "#9966CC",
          lithium: "#FF1744",
          calcium: "#FF8F00",
          strontium: "#E53935",
          barium: "#66BB6A",
          copper: "#00BCD4",
        },
      },
      fontFamily: {
        orbitron: ["Space Grotesk", "sans-serif"],
        rajdhani: ["DM Sans", "sans-serif"],
        sinhala: ["Noto Sans Sinhala", "sans-serif"],
        tamil: ["Noto Sans Tamil", "sans-serif"],
      },
      backgroundImage: {
        "lab-gradient":
          "radial-gradient(ellipse at center, #091219 0%, #060D16 100%)",
        "panel-gradient":
          "linear-gradient(135deg, #0D1B2A 0%, #091219 100%)",
        "hero-gradient":
          "linear-gradient(135deg, #060D16 0%, #091219 50%, #1C3260 100%)",
        "teal-glow":
          "radial-gradient(circle at center, rgba(15,145,122,0.2) 0%, transparent 70%)",
      },
      boxShadow: {
        "teal-glow": "0 0 20px rgba(15, 145, 122, 0.4)",
        "navy-glow": "0 0 20px rgba(28, 50, 96, 0.6)",
        "gold-glow": "0 0 20px rgba(201, 146, 30, 0.4)",
        "flame-glow": "0 0 40px rgba(255, 165, 0, 0.6)",
        panel: "0 4px 24px rgba(0, 0, 0, 0.6)",
        card: "0 2px 12px rgba(0, 0, 0, 0.4)",
      },
      animation: {
        "flame-flicker": "flame-flicker 0.1s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "spin-slow": "spin 3s linear infinite",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        "flame-flicker": {
          "0%, 100%": { opacity: "1", transform: "scaleY(1)" },
          "50%": { opacity: "0.8", transform: "scaleY(0.95)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(15, 145, 122, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(15, 145, 122, 0.7)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      borderRadius: {
        lab: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
