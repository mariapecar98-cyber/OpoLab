/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        trazo: {
          purple: '#7554B8',
          lavender: '#D9C9F3',
          lilac: '#F5EEFC',
          pink: '#F6C9DC',
          mint: '#CDE9DF',
          cream: '#FFF9F1',
        },
      },
      fontFamily: {
        sans: ['"Nunito"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
