/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: {
          dark: '#2D2D2D',
          mid: '#3A3A3A',
          light: '#5A5A5A',
          highlight: '#6B6B6B',
        },
        lcd: {
          bg: '#1A2B1A',
          text: '#7FCC7F',
          amber: '#CCAA44',
          dim: '#2A3B2A',
        },
        led: {
          green: '#22C55E',
          amber: '#F59E0B',
          red: '#EF4444',
          off: '#4A4A4A',
        },
        silk: '#B0B0B0',
      },
      fontFamily: {
        lcd: ['"Courier New"', 'monospace'],
        silk: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'button-up': 'inset 0 -2px 4px rgba(0,0,0,0.4), inset 0 2px 2px rgba(255,255,255,0.1)',
        'button-down': 'inset 0 2px 4px rgba(0,0,0,0.6)',
        'led-green': '0 0 6px #22C55E, 0 0 12px rgba(34,197,94,0.27)',
        'led-amber': '0 0 6px #F59E0B, 0 0 12px rgba(245,158,11,0.27)',
        'led-red': '0 0 6px #EF4444, 0 0 12px rgba(239,68,68,0.27)',
      }
    }
  },
  plugins: []
}
