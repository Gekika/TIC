import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "tic-navy": "#0A1628",
        "tic-green": "#1F6B4E",
        "tic-teal": "#1F4E5F",
        "tic-gold": "#C47F00",
        "tic-red": "#B33C3C",
        "tic-muted": "#64748B",
        "tic-surface": "#F7F8FA",
        // Landing page palette (same brand colours, landing-page names)
        "primary-dark": "#0A1628",
        "primary-green": "#1F6B4E",
        "accent-teal": "#1F4E5F",
        "text-light": "#FFFFFF",
        "text-muted": "#A0AEC0",
        "card-bg": "#F7F8FA",
        divider: "#E2E8F0"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        "soft-card": "0 18px 45px rgba(10, 22, 40, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
