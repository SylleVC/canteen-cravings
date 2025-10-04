/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        '18': '4.5rem', // for consistent top spacing on mobile
        '22': '5.5rem', // additional spacing if needed
      },
      zIndex: {
        '50': '50', // ensures admin login stays on top
        '60': '60',
      },
      colors: {
        dark-bg: '#1e1e2f',
        mid-gray: '#2a2a3d',
        light-yellow: '#facc15', // matches your text-yellow-400
      },
      screens: {
        'xs': '400px', // optional extra small breakpoint
      },
    },
  },
  plugins: [],
}
