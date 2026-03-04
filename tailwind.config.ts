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
          DEFAULT: "#1B2E5E",
          light: "#243d7a",
          dark: "#121f40",
        },
        teal: {
          DEFAULT: "#0D7E6A",
          light: "#10a085",
          dark: "#0a6254",
        },
        gold: {
          DEFAULT: "#C4962A",
          light: "#d4a83a",
          dark: "#a07820",
        },
        // Lab surfaces
        bench: "#0A0E1A",
        deep: "#050810",
        panel: "#0D1220",
        border: {
          DEFAULT: "#1A2540",
          light: "#253560",
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
        orbitron: ["Orbitron", "sans-serif"],
        rajdhani: ["Rajdhani", "sans-serif"],
        sinhala: ["Noto Sans Sinhala", "sans-serif"],
        tamil: ["Noto Sans Tamil", "sans-serif"],
      },
      backgroundImage: {
        "lab-gradient":
          "radial-gradient(ellipse at center, #0a0e1a 0%, #050810 100%)",
        "panel-gradient":
          "linear-gradient(135deg, #0d1220 0%, #0a0e1a 100%)",
        "hero-gradient":
          "linear-gradient(135deg, #050810 0%, #0a0e1a 50%, #1B2E5E 100%)",
        "teal-glow":
          "radial-gradient(circle at center, rgba(13,126,106,0.2) 0%, transparent 70%)",
      },
      boxShadow: {
        "teal-glow": "0 0 20px rgba(13, 126, 106, 0.4)",
        "navy-glow": "0 0 20px rgba(27, 46, 94, 0.6)",
        "gold-glow": "0 0 20px rgba(196, 150, 42, 0.4)",
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
          "0%, 100%": { boxShadow: "0 0 10px rgba(13, 126, 106, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(13, 126, 106, 0.7)" },
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
