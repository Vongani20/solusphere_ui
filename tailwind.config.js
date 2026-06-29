/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: [
    "bg-surface",
    "bg-sidebar",
    "bg-heading",
    "bg-primary-light",
    "bg-banner-gradient",
    "text-heading",
    "text-label",
    "text-muted",
    "text-nav-idle",
    "text-primary-dark",
    "border-border-ui",
    "border-border-muted",
    "border-border-card",
    "border-border-input",
    "hover:bg-primary-dark",
    "hover:text-primary-dark",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0285A1",
          light: "#0b9cb8",
          dark: "#026d84",
        },
        heading: "#2d353c",
        label: "#7b858d",
        muted: "#9aa3ab",
        "nav-idle": "#646e77",
        surface: "#fafbfc",
        sidebar: "#f5f7f9",
        "border-card": "#c9ced3",
        "border-ui": "#e4e8eb",
        "border-input": "#d6dce0",
        "border-muted": "#cfd5da",
      },
      fontFamily: {
        sans: ["Montserrat", "system-ui", "sans-serif"],
        mono: ["'Space Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.07)",
      },
      backgroundImage: {
        "auth-gradient":
          "linear-gradient(135deg, #1f2937 0%, #0285A1 70%, #0b9cb8 100%)",
        "banner-gradient":
          "linear-gradient(135deg, #1f2937 0%, #0285A1 70%, #0b9cb8 100%)",
      },
    },
  },
  plugins: [],
};
