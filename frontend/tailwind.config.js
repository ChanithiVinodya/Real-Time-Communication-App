export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'blue-dust': {
          light: '#a9c1d0',
          DEFAULT: '#93AEBF',
          dark: '#7b98a9',
        },
        'prussian-blue': {
          light: '#2a4269',
          DEFAULT: '#1C2F4D',
          dark: '#0f1c30',
          darker: '#0a1220',
        },
        'pistachio': {
          light: '#f7dfca',
          DEFAULT: '#F2CEAE',
          dark: '#e0b894',
        },
        'matte-red': {
          light: '#e0a3a7',
          DEFAULT: '#D48D91',
          dark: '#c4787c',
        },
        'bean': {
          light: '#5e1909',
          DEFAULT: '#400D01',
          dark: '#2c0800',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
    },
  },
  plugins: [],
};

