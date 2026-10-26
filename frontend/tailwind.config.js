/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        railway: {
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#c3daec',
          300: '#94c0df',
          400: '#5da0cd',
          500: '#3582b8',
          600: '#26689a',
          700: '#20537c',
          800: '#1e4667',
          900: '#1c3c56',
          950: '#0f2436',
        },
        track: '#f97316', // orange
        electrical: '#eab308', // amber/yellow
        signal: '#06b6d4', // cyan
        operations: '#8b5cf6', // purple
      },
    },
  },
  plugins: [],
}
