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
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
      fadeIn: {
        '0%': { opacity: 0, transform: 'translateY(-10px)' },
        '100%': { opacity: 1, transform: 'translateY(0)' },
      },
      slideUp: {
        '0%': { opacity: 0, transform: 'translate(-50%, 20px)' },
        '100%': { opacity: 1, transform: 'translate(-50%, 0)' },
      },
      slideUpMobile: {
        '0%': { transform: 'translateY(100%)' },
        '100%': { transform: 'translateY(0)' },
      },
      },
      animation: {
      fadeIn: 'fadeIn 0.15s ease-out',
      slideUp: 'slideUp 0.2s ease-out',
      slideUpMobile: 'slideUpMobile 0.3s ease-out',
    }
    },
  },
  plugins: [],
}