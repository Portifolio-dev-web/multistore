import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "var(--brand)", contrast: "var(--brand-contrast)" },
        accent: "var(--accent)",
        paper: "#f7f5f0",
        ink: "#16140f",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { rise: "rise .5s cubic-bezier(.2,.7,.2,1) both" },
    },
  },
  plugins: [],
};

export default config;
