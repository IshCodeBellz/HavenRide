/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FEF9FA",
          100: "#E0D5DB",
          200: "#EED3D7",
          300: "#DAAAB2",
          400: "#DAAAB2",
          500: "#5C7E9B",
          600: "#5C7E9B",
          700: "#5C7E9B",
        },
        neutral: {
          100: "#E0D5DB",
          200: "#EED3D7",
          600: "#757575",
          700: "#616161",
          900: "#263238",
        },
      },
    },
  },
  plugins: [],
};
