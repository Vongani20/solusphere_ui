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
          DEFAULT: '#4163CE',
          light: '#5A62C3',
          dark: '#3940AB',
        },
        secondary: {
          DEFAULT: '#7FC2D0',
          light: '#9ED5DF',
          dark: '#6AB0BE',
        },
        accent: {
          purple: '#9655C9',
          blue: '#5059C9',
          indigo: '#7B83EB',
          violet: '#4C54BC',
          deep: '#4D55BD',
        },
        neutral: {
          light: '#EAECEF',
          gray: '#AFB2B5',
        },
        dark: '#000000',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
