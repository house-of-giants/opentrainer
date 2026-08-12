/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      // Theme tokens are ported from apps/web/src/app/globals.css in Phase 3.
      colors: {},
    },
  },
  plugins: [],
};
