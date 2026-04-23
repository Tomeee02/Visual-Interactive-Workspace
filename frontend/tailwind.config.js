/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        'note-yellow': '#FEF3C7',
        'note-blue': '#DBEAFE',
        'note-green': '#D1FAE5',
        'note-red': '#FED7D7',
        'note-purple': '#E9D5FF'
      }
    },
  },
  plugins: [],
}