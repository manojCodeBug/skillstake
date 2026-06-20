/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        accentFg: "rgb(var(--accent-fg) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(0, 0, 0, 0.18)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
        mono: ["Geist", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
