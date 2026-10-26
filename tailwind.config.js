/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './admin/index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#050816',
        secondary: '#aaa6c3',
        tertiary: '#151030',
        'black-100': '#100d25',
        'black-200': '#090325',
        'white-100': '#f3f3f3',
        // Tema monokrom gelap (halaman publik); token di atas tetap dipakai panel admin
        ink: '#f5f5f5',
        muted: '#a3a3a3',
        card: '#111111',
      },
      boxShadow: { card: '0px 35px 120px -15px #211e35' },
      screens: { xs: '450px' },
      fontFamily: { poppins: ['Poppins', 'sans-serif'] },
    },
  },
  plugins: [],
}
