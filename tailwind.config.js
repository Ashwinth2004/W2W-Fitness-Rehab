/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // W2W teal/cyan brand palette (sampled from the logo gradient)
        brand: {
          50: '#ecfdff',
          100: '#cef7fd',
          200: '#a2edfa',
          300: '#62ddf2',
          400: '#22c4e3',
          500: '#08a6c7',
          600: '#0986a8', // primary
          700: '#0d6c89',
          800: '#135870',
          900: '#14495e',
          950: '#062f3f',
        },
        // Warm accent used sparingly for energy/highlights
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(14, 139, 161, 0.25)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'pop-in': { '0%': { opacity: 0, transform: 'scale(0.96)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        // Right-to-left ticker. Track holds two copies of the content, so a
        // -50% shift loops seamlessly.
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out both',
        'pop-in': 'pop-in 0.25s ease-out both',
        float: 'float 3s ease-in-out infinite',
        marquee: 'marquee 22s linear infinite',
      },
    },
  },
  plugins: [],
}
