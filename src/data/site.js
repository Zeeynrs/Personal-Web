// =====================================================================
// SEMUA ISI WEBSITE ADA DI SINI. Ganti nilai-nilai di bawah dengan
// data kamu sendiri; tidak perlu menyentuh file lain.
// Gambar lokal taruh di folder /public (contoh: /images/profile.jpg).
// =====================================================================

const DEVICON = 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons';

export const site = {
  // Nama singkat: muncul di logo navbar, intro "Welcome to", dan judul hero
  brand: 'Zeeynrs',
  // Judul hero; kata pertama sebaiknya sama dengan `brand` agar animasi intro "terbang" pas
  heroTitle: 'Zeeynrs Site',
  fullName: 'Nama Lengkap Kamu',
  badge: 'Tech Enthusiast',
  roles: ['Web Developer', '3D Enthusiast', 'UI Designer', 'Gamer', 'Mobile Developer'],
  logo: '/logo.svg',

  about: {
    image: '/images/profile.svg',
    description:
      'Halo! Saya seorang web developer yang suka membangun pengalaman web interaktif dan modern. ' +
      'Saya senang bereksperimen dengan grafis 3D di browser, merancang antarmuka yang rapi, ' +
      'dan terus belajar teknologi baru. Saat ini saya fokus pada React, Three.js, dan animasi web.',
  },

  // Daftar CV pada tombol "Lihat CV Saya" (url boleh link Google Drive / file di /public)
  cvs: [
    { title: 'CV Bahasa Indonesia', url: 'https://example.com/cv-id.pdf' },
    { title: 'CV English', url: 'https://example.com/cv-en.pdf' },
  ],

  // Ikon: link gambar apa saja; di sini memakai Devicon
  skills: [
    { name: 'HTML', image: `${DEVICON}/html5/html5-original.svg` },
    { name: 'CSS', image: `${DEVICON}/css3/css3-original.svg` },
    { name: 'JavaScript', image: `${DEVICON}/javascript/javascript-original.svg` },
    { name: 'TypeScript', image: `${DEVICON}/typescript/typescript-original.svg` },
    { name: 'React', image: `${DEVICON}/react/react-original.svg` },
    { name: 'Tailwind CSS', image: `${DEVICON}/tailwindcss/tailwindcss-original.svg` },
    { name: 'Three.js', image: `${DEVICON}/threejs/threejs-original.svg` },
    { name: 'Vite', image: `${DEVICON}/vitejs/vitejs-original.svg` },
    { name: 'Node.js', image: `${DEVICON}/nodejs/nodejs-original.svg` },
    { name: 'PHP', image: `${DEVICON}/php/php-original.svg` },
    { name: 'Laravel', image: `${DEVICON}/laravel/laravel-original.svg` },
    { name: 'MySQL', image: `${DEVICON}/mysql/mysql-original.svg` },
    { name: 'Git', image: `${DEVICON}/git/git-original.svg` },
    { name: 'Figma', image: `${DEVICON}/figma/figma-original.svg` },
    { name: 'Arduino', image: `${DEVICON}/arduino/arduino-original.svg` },
    { name: 'Flutter', image: `${DEVICON}/flutter/flutter-original.svg` },
  ],

  certificates: [
    { title: 'Sertifikat Web Development', image: '/images/certificates/cert-1.svg' },
    { title: 'Sertifikat JavaScript Dasar', image: '/images/certificates/cert-2.svg' },
    { title: 'Sertifikat UI/UX Design', image: '/images/certificates/cert-3.svg' },
    { title: 'Sertifikat React Developer', image: '/images/certificates/cert-4.svg' },
    { title: 'Sertifikat Lomba Coding', image: '/images/certificates/cert-5.svg' },
    { title: 'Sertifikat IoT Workshop', image: '/images/certificates/cert-6.svg' },
    { title: 'Sertifikat Git & GitHub', image: '/images/certificates/cert-7.svg' },
  ],

  // description boleh berisi HTML sederhana (<b>, <i>, <br/>); tags dipisah koma
  projects: [
    {
      title: 'Portofolio 3D',
      description: 'Website portofolio interaktif dengan latar WebGL, model tata surya 3D, dan animasi scroll berbasis GSAP.',
      image: '/images/projects/project-1.svg',
      link: 'https://github.com/',
      tags: 'React, Three.js, GSAP',
    },
    {
      title: 'Aplikasi Kasir',
      description: 'Sistem kasir berbasis web untuk UMKM: manajemen stok, transaksi, dan laporan penjualan harian.',
      image: '/images/projects/project-2.svg',
      link: '',
      tags: 'Laravel, MySQL, Tailwind',
    },
    {
      title: 'Smart Home IoT',
      description: 'Kontrol lampu dan sensor suhu rumah dari browser memakai mikrokontroler ESP32 dan dashboard realtime.',
      image: '/images/projects/project-3.svg',
      link: '',
      tags: 'Arduino, IoT, JavaScript',
    },
    {
      title: 'Landing Page Produk',
      description: 'Landing page responsif dengan animasi halus, performa tinggi, dan skor Lighthouse di atas 95.',
      image: '/images/projects/project-4.svg',
      link: 'https://example.com/',
      tags: 'HTML, CSS, JavaScript',
    },
    {
      title: 'Aplikasi Catatan',
      description: 'Aplikasi mobile untuk mencatat tugas harian dengan pengingat dan sinkronisasi cloud.',
      image: '/images/projects/project-5.svg',
      link: '',
      tags: 'Flutter, Firebase',
    },
  ],

  contact: {
    lead: 'Punya proyek, ide kolaborasi, atau sekadar ingin menyapa? Temukan saya di sosial media, atau kirim pesan langsung lewat formulir ini.',
    email: 'emailkamu@contoh.com',
    phone: '+62 812 0000 0000',
    whatsapp: '6281200000000', // format wa.me: kode negara tanpa "+"
    location: 'Indonesia (WIB, UTC+7)',
    // Kosongkan string untuk menyembunyikan ikon
    socials: {
      instagram: 'https://www.instagram.com/',
      github: 'https://github.com/Zeeynrs',
      linkedin: 'https://www.linkedin.com/',
      youtube: 'https://www.youtube.com/',
    },
  },

  footer: {
    blurb: 'Web developer dengan minat pada pengembangan 3D interaktif, desain antarmuka, dan IoT.',
    techStack: ['HTML', 'CSS', 'JS', 'Three', 'React', 'Tailwind', 'WebGL'],
  },
};
