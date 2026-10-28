// =====================================================================
// SEMUA ISI WEBSITE ADA DI SINI. Ganti nilai-nilai di bawah dengan
// data kamu sendiri; tidak perlu menyentuh file lain.
// Gambar lokal taruh di folder /public (contoh: /images/profile.jpg).
// =====================================================================

const DEVICON = 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons';

export const site = {
  // Nama singkat: muncul di logo navbar, intro "Welcome to", dan judul hero
  brand: 'Tamsy',
  // Judul hero; kata pertama sebaiknya sama dengan `brand` agar animasi intro "terbang" pas
  heroTitle: 'Tamsy Site',
  fullName: 'Daffa Aditya Pratama Jati',
  badge: 'Tech Enthusiast',
  roles: ['Web Developer', '3D Enthusiast', 'AI & ML Explorer', 'AR/VR Developer', 'Cybersecurity Enthusiast'],
  logo: '/logo.svg',

  about: {
    image: '/images/profile.svg',
    description:
      'Saya seorang pengembang web yang memadukan rekayasa perangkat lunak modern dengan teknologi mutakhir: grafis 3D interaktif serta augmented & virtual reality (AR/VR). ' +
      'Berdedikasi untuk menciptakan aplikasi yang tidak hanya berkinerja tinggi dan terstruktur rapi, tetapi juga menghadirkan interaksi visual imersif yang mendalam. ' +
      'Saat ini, saya sedang memfokuskan eksplorasi pada ranah Artificial Intelligence (GenAI & Machine Learning) serta Cybersecurity untuk membangun solusi digital yang cerdas, adaptif, dan aman dari fondasi.',
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
    email: 'adityadaffa522@gmail.com',
    phone: '+62 858-1427-3138',
    whatsapp: '6285814273138', // format wa.me: kode negara tanpa "+"
    location: 'Indonesia (WIB, UTC+7)',
    // Kosongkan string untuk menyembunyikan ikon
    socials: {
      instagram: 'https://www.instagram.com/dawa.thoumeaux?mdxt=MTM2MXdraTNtOG1pMg%3D%3D&utm_source=qr',
      github: 'https://github.com/Zeeynrs',
      linkedin: 'https://www.linkedin.com/in/daffa-aditya-pratama-jati-018515360/',
      youtube: '',
      discord: 'https://discord.com/users/858855851586486293',
    },
  },

  footer: {
    blurb: 'Web developer dengan fokus pada grafis 3D interaktif, AI/ML, teknologi AR/VR, dan cybersecurity.',
    techStack: ['HTML', 'CSS', 'JS', 'Three', 'React', 'Tailwind', 'WebGL'],
  },
};
