/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Semantic tokens resolve through CSS variables set per-theme by
      // ThemeProvider (src/theme/tokens.ts). Mirrors apps/web globals.css.
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: "var(--destructive)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
      },
      // Web --radius: 0.625rem (10px); shadcn derives sm..4xl from it.
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
        "3xl": "22px",
        "4xl": "26px",
      },
    },
  },
  plugins: [],
};
