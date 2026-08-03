/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f6',
          100: '#ffe4ee',
          200: '#ffc9dd',
          300: '#ff9dc0',
          400: '#ff5f9c',
          500: '#f6337a',
          600: '#e11463',
          700: '#bd0b51',
          800: '#9c0d48',
          900: '#821042',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
