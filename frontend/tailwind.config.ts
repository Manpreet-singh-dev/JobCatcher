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
        primary: {
          DEFAULT: "#6C63FF",
          light: "#8B85FF",
          dark: "#4B44CC",
        },
        accent: {
          DEFAULT: "#00D4AA",
          warm: "#FF6B6B",
          yellow: "#FFD93D",
        },
        bg: {
          primary: "#0F0F1A",
          secondary: "#1A1A2E",
          tertiary: "#252540",
        },
        border: {
          DEFAULT: "#2E2E4A",
        },
        text: {
          primary: "#F0F0FF",
          secondary: "#8888AA",
          muted: "#55557A",
        },
        score: {
          excellent: "#00D4AA",
          good: "#6C63FF",
          fair: "#FFD93D",
          low: "#FF6B6B",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "score-fill": "scoreFill 1s ease-out forwards",
        "count-up": "countUp 1s ease-out forwards",
        "slide-in": "slideIn 200ms ease-out",
        "fade-in": "fadeIn 200ms ease-out",
        skeleton: "skeleton 1.5s ease-in-out infinite",
      },
      keyframes: {
        scoreFill: {
          "0%": { strokeDashoffset: "283" },
          "100%": { strokeDashoffset: "var(--score-offset)" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        skeleton: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};

export default config;
