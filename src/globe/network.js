// =====================================================================
// Data jaringan cloud global untuk globe 3D (terpisah dari kode render).
// Semua titik adalah ILUSTRASI KONSEPTUAL: kota dipilih agar tersebar di tiap benua,
// bukan lokasi server Vercel, Supabase, atau penyedia mana pun yang sebenarnya.
// =====================================================================

export const HUB_ID = 'jakarta';

export const NODES = [
  {
    id: 'jakarta', hub: true, lat: -6.2088, lon: 106.8456,
    name: 'JAKARTA, INDONESIA', place: 'Jakarta, Indonesia',
    category: 'Hub utama', role: 'Titik asal pengembangan',
    description: 'Basis tempat website ini dibangun. Semua layanan di peta terhubung dari sini.',
  },
  {
    id: 'sanfrancisco', lat: 37.7749, lon: -122.4194,
    name: 'VERCEL EDGE NETWORK', place: 'San Francisco, Amerika Serikat',
    category: 'Edge / CDN', role: 'Pengiriman aplikasi',
    description: 'Pengiriman aplikasi global dan infrastruktur edge.',
  },
  {
    id: 'newyork', lat: 40.7128, lon: -74.006,
    name: 'OBJECT STORAGE', place: 'New York, Amerika Serikat',
    category: 'Storage', role: 'Aset & media',
    description: 'Penyimpanan file, gambar, dan aset statis untuk aplikasi.',
  },
  {
    id: 'saopaulo', lat: -23.5505, lon: -46.6333,
    name: 'AUTH SERVICE', place: 'São Paulo, Brasil',
    category: 'Autentikasi', role: 'Identitas pengguna',
    description: 'Autentikasi, sesi login, dan kontrol akses pengguna.',
  },
  {
    id: 'london', lat: 51.5074, lon: -0.1278,
    name: 'API GATEWAY', place: 'London, Inggris',
    category: 'API', role: 'Routing permintaan',
    description: 'Gerbang API untuk meneruskan dan membatasi permintaan ke backend.',
  },
  {
    id: 'frankfurt', lat: 50.1109, lon: 8.6821,
    name: 'SUPABASE DATABASE', place: 'Frankfurt, Jerman',
    category: 'Database', role: 'Penyimpanan data',
    description: 'Database PostgreSQL dan layanan data backend.',
  },
  {
    id: 'johannesburg', lat: -26.2041, lon: 28.0473,
    name: 'MONITORING', place: 'Johannesburg, Afrika Selatan',
    category: 'Observability', role: 'Log & metrik',
    description: 'Pemantauan log, metrik, dan kesehatan layanan.',
  },
  {
    id: 'mumbai', lat: 19.076, lon: 72.8777,
    name: 'CI/CD PIPELINE', place: 'Mumbai, India',
    category: 'DevOps', role: 'Build & deploy',
    description: 'Build, pengujian, dan deploy otomatis setiap ada perubahan kode.',
  },
  {
    id: 'singapore', lat: 1.3521, lon: 103.8198,
    name: 'EDGE FUNCTIONS', place: 'Singapura',
    category: 'Serverless', role: 'Logika di edge',
    description: 'Fungsi serverless yang dijalankan dekat dengan pengguna.',
  },
  {
    id: 'tokyo', lat: 35.6762, lon: 139.6503,
    name: 'REALTIME WEBSOCKETS', place: 'Tokyo, Jepang',
    category: 'Realtime', role: 'Event dua arah',
    description: 'Komunikasi dua arah dan event aplikasi secara real-time.',
  },
  {
    id: 'sydney', lat: -33.8688, lon: 151.2093,
    name: 'BACKUP REPLICA', place: 'Sydney, Australia',
    category: 'Replikasi', role: 'Cadangan data',
    description: 'Replika cadangan untuk menjaga ketahanan data.',
  },
];

// flow = ada partikel data yang berjalan di jalur ini
// occasional = jalur muncul sesekali (digambar, bertahan, lalu memudar)
export const CONNECTIONS = [
  { from: 'jakarta', to: 'singapore', flow: true },
  { from: 'jakarta', to: 'tokyo', flow: true, occasional: true },
  { from: 'jakarta', to: 'sydney', flow: true, occasional: true },
  { from: 'jakarta', to: 'frankfurt', flow: true, occasional: true },
  { from: 'jakarta', to: 'sanfrancisco', flow: true, occasional: true },
  { from: 'jakarta', to: 'mumbai', flow: true, occasional: true },
  { from: 'sanfrancisco', to: 'newyork', flow: true },
  { from: 'newyork', to: 'london', flow: true },
  { from: 'london', to: 'frankfurt' },
  { from: 'frankfurt', to: 'johannesburg', flow: true },
  { from: 'saopaulo', to: 'newyork' },
  { from: 'tokyo', to: 'sanfrancisco', flow: true },
];
