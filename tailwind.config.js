/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        gray900: "#1e1e2f",
        gray800: "#2a2a3d",
        gray700: "#374151",
        gray500: "#6b7280",
        yellow400: "#facc15",
        green600: "#16a34a",
        red600: "#dc2626",
        blue600: "#2563eb",
      },
    },
  },
  plugins: [],
};
