/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // W2W teal/cyan brand palette (sampled from the logo)
        brand: {
          50: '#eef9fb',
          100: '#d2eff3',
          200: '#a9dfe7',
          300: '#73c7d4',
          400: '#3bb6c9',
          500: '#129cb1',
          600: '#0e8ba1', // primary
          700: '#0d6f83',
          800: '#0f5b6c',
          900: '#114c5b',
          950: '#06303b',
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
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out both',
        'pop-in': 'pop-in 0.25s ease-out both',
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
