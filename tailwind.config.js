/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Central place for per-landing-page rebranding. Override these when you
      // clone the template for a new page.
      colors: {
        brand: {
          DEFAULT: "#2155cd",
          dark: "#16367f",
          light: "#eaf0ff",
        },
      },
    },
  },
  plugins: [],
};
