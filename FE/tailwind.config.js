import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fcf3f0',
          100: '#fae3da',
          200: '#f2c7b8',
          300: '#e8a18c',
          400: '#d97459',
          500: '#c74e31',
          600: '#b03110', // Main brand color
          700: '#91260a',
          800: '#78220c',
          900: '#631f0e',
        },
      },
    },
  },
  plugins: [forms],
}