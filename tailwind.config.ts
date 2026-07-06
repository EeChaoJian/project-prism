import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Prism fintech palette
        ink: "#0a0e17",
        panel: "#111827",
        surface: "#1a2234",
        edge: "#26324a",
        brand: "#6366f1",
        accent: "#22d3ee",
        good: "#34d399",
        warn: "#f59e0b",
        bad: "#f87171",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
