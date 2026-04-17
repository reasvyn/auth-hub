/** @type {import('tailwindcss').Config} */
module.exports = {
  // Add this to your project's tailwind.config.js content array:
  // content: ['./node_modules/@reasvyn/auth-react/dist/**/*.{js,mjs}']
  //
  // Or if using source directly:
  // content: ['./node_modules/@reasvyn/auth-react/src/**/*.{ts,tsx}']
  darkMode: 'class', // Toggle dark mode by adding 'dark' class to <html>
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
