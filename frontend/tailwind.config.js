/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef9ff",
          100: "#d9f1ff",
          200: "#bce7ff",
          300: "#8ed8ff",
          400: "#59c0ff",
          500: "#33a1ff",
          600: "#1a7ff5",
          700: "#1468e1",
          800: "#1754b6",
          900: "#19498f",
          950: "#142d57",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f4f7fb",
          dark: "#0c1222",
          sidebar: "#0f1729",
        },
        accent: {
          DEFAULT: "#10b981",
          light: "#d1fae5",
        },
      },
      boxShadow: {
        soft: "0 2px 16px -4px rgba(15, 23, 42, 0.08)",
        card: "0 4px 24px -6px rgba(15, 23, 42, 0.1)",
        glow: "0 0 40px -8px rgba(26, 127, 245, 0.35)",
        sidebar: "4px 0 24px -4px rgba(0, 0, 0, 0.15)",
      },
      backgroundImage: {
        "mesh": "radial-gradient(at 40% 20%, rgba(26,127,245,0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(16,185,129,0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(26,127,245,0.05) 0px, transparent 50%)",
        "hero": "linear-gradient(135deg, #0c1222 0%, #142d57 40%, #0f1729 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.45s ease-out",
        "pulse-soft": "pulseSoft 2.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pulseSoft: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.7" } },
      },
    },
  },
  plugins: [],
};
