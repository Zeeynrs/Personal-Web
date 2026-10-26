# Personal-Web

Website portofolio 3D interaktif: Vite + React + Three.js + GSAP + Tailwind, dengan backend Supabase
(database, login admin, penyimpanan gambar).

Fitur: intro animasi ("Hello World" → "Welcome to" → nama terbang ke judul), latar bintang WebGL,
navbar pil yang bersembunyi saat scroll, teks peran yang berganti, About dengan teks muncul per kata
dan statistik, marquee Tech Stack, model tata surya 3D interaktif (klik planet untuk detail) dengan jam WIB,
grid sertifikat + lightbox, carousel proyek, formulir kontak, footer, dan panel admin di `/admin`.

## Menjalankan

```bash
npm install
cp .env.example .env   # isi nilainya (lihat "Menyiapkan Supabase")
npm run dev            # website: http://localhost:5173 · admin: http://localhost:5173/admin/
npm run build          # hasil di dist/
```

Tanpa `.env`, website tetap jalan memakai isi dari `src/data/site.js` (panel admin tidak aktif).

## Menyiapkan Supabase

1. Buat project di [supabase.com](https://supabase.com).
2. **SQL Editor** → tempel seluruh isi `supabase/migrations/0001_schema.sql` → **Run**.
   Ini membuat tabel, aturan keamanan (RLS), bucket gambar `portfolio`, dan data awal.
3. **Project Settings → API**: salin *Project URL* dan *anon / publishable key* ke `.env`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Buat akun admin: **Authentication → Users → Add user** (isi email + password, centang *Auto Confirm*).
5. Jadikan akun itu admin: buka `supabase/make_admin.sql`, ganti emailnya, jalankan di **SQL Editor**.
6. Disarankan: **Authentication → Sign In / Providers → Email** → matikan *Allow new users to sign up*,
   supaya orang lain tidak bisa mendaftar akun (meski mendaftar pun mereka tetap bukan admin).
7. Buka `/admin/`, login, dan kelola isi website.

### Apa yang dikelola di mana

| Lewat panel `/admin` (tabel Supabase) | Lewat `src/data/site.js` |
|---|---|
| Tentang Saya (deskripsi + foto), Tech Stack, Sertifikat, Proyek, daftar CV, Pesan masuk dari form kontak | Nama/brand, judul hero, badge, daftar peran, email/telepon/WhatsApp, link sosial media, teks footer |

### Keamanan

- Pengunjung hanya bisa **membaca** konten dan **mengirim** pesan; tidak bisa membaca pesan orang lain.
- Hanya user dengan `app_metadata.role = "admin"` yang bisa menambah/mengubah/menghapus data dan mengunggah gambar.
  `app_metadata` tidak bisa diubah oleh user sendiri, hanya lewat SQL/dashboard Supabase.
- Kunci yang dipakai frontend adalah anon key (memang publik). Jangan menaruh `service_role` key di `.env` frontend.

## Gambar

Gambar yang diunggah lewat admin disimpan di Storage bucket `portfolio`. Gambar statis bisa juga ditaruh di
`public/` (mis. `public/images/profile.jpg` → `/images/profile.jpg`); gambar di `public/images/` saat ini
hanyalah placeholder. Logo/favicon: `public/logo.svg`.

## Deploy (Vercel)

Preset **Vite** (build `npm run build`, output `dist`). Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
di *Settings → Environment Variables*. `vercel.json` sudah mengarahkan `/admin` ke panel admin.

## Lisensi

GPL-3.0 (lihat `LICENSE`). Sebagian kode berasal dari proyek berlisensi MIT, lihat `THIRD_PARTY_NOTICES.md`.
