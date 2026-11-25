/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          teal: '#0D9488',         // Healthcare Teal (BHU Portal primary accent)
          tealHover: '#0F766E',
          tealLight: '#F0FDFA',
          primary: '#164E78',      // Healthcare Blue (Cross-portal secondary)
          primaryHover: '#113E60',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        surface: {
          main: '#FFFFFF',
          subtle: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          borderLight: '#F1F5F9',
        },
        typography: {
          primary: '#0F172A',
          secondary: '#64748B',
          muted: '#94A3B8',
        },
        status: {
          accepted: '#16A34A',
          available: '#16A34A',
          pending: '#D97706',
          declined: '#DC2626',
          critical: '#DC2626',
          info: '#2563EB',
          unavailable: '#64748B',
          outdated: '#64748B',
        },
        emergency: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#DC2626',
          700: '#b91c1c',
          800: '#991b1b',
        }
      },
      borderRadius: {
        'card': '12px',
        'btn': '8px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        'modal': '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
      }
    },
  },
  plugins: [],
}

