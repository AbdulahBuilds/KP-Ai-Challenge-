/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System Main Colors
        brand: {
          50: '#F0F6FA',
          100: '#E1EDF5',
          200: '#C2DCEB',
          300: '#94C3DC',
          400: '#5BA2C7',
          500: '#2A7FA8',
          primary: '#164E78',      // Healthcare Blue (Hospital Portal accent & platform primary)
          primaryHover: '#113E60',
          700: '#113E60',
          800: '#0C2D47',
          900: '#071F32',
          teal: '#0D9488',         // Healthcare Teal (BHU Portal accent & platform secondary)
          tealHover: '#0F766E',
          tealLight: '#F0FDFA',
          accent: '#164E78',       // Hospital Portal Accent
        },
        surface: {
          main: '#F8FAFC',         // Main Background (Slate 50)
          subtle: '#EAF4FA',       // Secondary Background
          card: '#FFFFFF',         // Card Background
          border: '#E2E8F0',       // Subtle Borders (Slate 200)
          borderLight: '#F1F5F9',  // Lighter separator
        },
        typography: {
          primary: '#0F172A',      // High-contrast Dark Slate (Slate 900)
          secondary: '#64748B',    // Slate Gray (Slate 500)
          muted: '#94A3B8',        // Slate 400
        },
        // Design System Standard Status Colors
        status: {
          accepted: '#16A34A',     // Green
          available: '#16A34A',
          pending: '#D97706',      // Amber
          declined: '#DC2626',     // Red
          critical: '#DC2626',
          info: '#2563EB',         // Blue
          unavailable: '#64748B',  // Slate Gray
          outdated: '#64748B',
        },
        // Emergency Portal Accent (Rescue 1122)
        emergency: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#DC2626',          // Emergency Red
          700: '#b91c1c',
          800: '#991b1b',
        }
      },
      borderRadius: {
        'card': '12px',
        'btn': '8px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
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
