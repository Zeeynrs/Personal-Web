-- =====================================================================
-- Skema backend portofolio. Jalankan SEKALI di project Supabase yang masih kosong:
-- Supabase Dashboard → SQL Editor → tempel seluruh file ini → Run.
-- =====================================================================

-- ---------- Tabel konten (dibaca publik, ditulis admin) ----------
create table public.profiles (
  id int primary key default 1 check (id = 1),           -- hanya satu baris
  description text,
  image_path text,
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  image_path text,
  position integer,
  created_at timestamptz not null default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  image_path text,
  position integer,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  image_path text,
  tags text,
  link text check (link is null or (char_length(link) <= 500 and link ~* '^https?://[^\s]+$')),
  position integer,
  created_at timestamptz not null default now()
);

create table public.cvs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  url text not null check (char_length(url) <= 500 and url ~* '^https?://[^\s]+$'),
  position integer,
  created_at timestamptz not null default now()
);

-- ---------- Pesan dari form kontak (pengunjung hanya bisa mengirim) ----------
create table public.contacts (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  email text not null check (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- ---------- Fungsi ----------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Admin = user dengan app_metadata.role = 'admin'. app_metadata hanya bisa diubah
-- dari sisi server (SQL / service role), jadi user biasa tidak bisa menjadikan dirinya admin.
create function public.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

-- ---------- Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['profiles', 'skills', 'certificates', 'projects', 'cvs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);
    execute format('create policy "admin insert" on public.%I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "admin update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "admin delete" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

alter table public.contacts enable row level security;
create policy "visitor insert" on public.contacts for insert to anon, authenticated with check (true);
create policy "admin read" on public.contacts for select to authenticated using (public.is_admin());
create policy "admin delete" on public.contacts for delete to authenticated using (public.is_admin());

-- ---------- Storage: satu bucket publik untuk semua gambar ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('portfolio', 'portfolio', true, 5242880,
   array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);

create policy "admin write portfolio" on storage.objects for all to authenticated
  using (bucket_id = 'portfolio' and public.is_admin())
  with check (bucket_id = 'portfolio' and public.is_admin());

-- ---------- Data awal (sama dengan src/data/site.js; ubah/hapus lewat /admin) ----------
insert into public.profiles (id, description, image_path) values
  (1, 'Halo! Saya seorang web developer yang suka membangun pengalaman web interaktif dan modern. Saya senang bereksperimen dengan grafis 3D di browser, merancang antarmuka yang rapi, dan terus belajar teknologi baru. Saat ini saya fokus pada React, Three.js, dan animasi web.', '/images/profile.svg');
insert into public.skills (name, image_path, position) values
  ('HTML', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/html5/html5-original.svg', 0),
  ('CSS', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/css3/css3-original.svg', 1),
  ('JavaScript', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/javascript/javascript-original.svg', 2),
  ('TypeScript', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/typescript/typescript-original.svg', 3),
  ('React', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/react/react-original.svg', 4),
  ('Tailwind CSS', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/tailwindcss/tailwindcss-original.svg', 5),
  ('Three.js', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/threejs/threejs-original.svg', 6),
  ('Vite', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/vitejs/vitejs-original.svg', 7),
  ('Node.js', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/nodejs/nodejs-original.svg', 8),
  ('PHP', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/php/php-original.svg', 9),
  ('Laravel', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/laravel/laravel-original.svg', 10),
  ('MySQL', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/mysql/mysql-original.svg', 11),
  ('Git', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/git/git-original.svg', 12),
  ('Figma', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/figma/figma-original.svg', 13),
  ('Arduino', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/arduino/arduino-original.svg', 14),
  ('Flutter', 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/flutter/flutter-original.svg', 15);
insert into public.certificates (title, image_path, position) values
  ('Sertifikat Web Development', '/images/certificates/cert-1.svg', 0),
  ('Sertifikat JavaScript Dasar', '/images/certificates/cert-2.svg', 1),
  ('Sertifikat UI/UX Design', '/images/certificates/cert-3.svg', 2),
  ('Sertifikat React Developer', '/images/certificates/cert-4.svg', 3),
  ('Sertifikat Lomba Coding', '/images/certificates/cert-5.svg', 4),
  ('Sertifikat IoT Workshop', '/images/certificates/cert-6.svg', 5),
  ('Sertifikat Git & GitHub', '/images/certificates/cert-7.svg', 6);
insert into public.projects (title, description, image_path, tags, link, position) values
  ('Portofolio 3D', 'Website portofolio interaktif dengan latar WebGL, model tata surya 3D, dan animasi scroll berbasis GSAP.', '/images/projects/project-1.svg', 'React, Three.js, GSAP', 'https://github.com/', 0),
  ('Aplikasi Kasir', 'Sistem kasir berbasis web untuk UMKM: manajemen stok, transaksi, dan laporan penjualan harian.', '/images/projects/project-2.svg', 'Laravel, MySQL, Tailwind', null, 1),
  ('Smart Home IoT', 'Kontrol lampu dan sensor suhu rumah dari browser memakai mikrokontroler ESP32 dan dashboard realtime.', '/images/projects/project-3.svg', 'Arduino, IoT, JavaScript', null, 2),
  ('Landing Page Produk', 'Landing page responsif dengan animasi halus, performa tinggi, dan skor Lighthouse di atas 95.', '/images/projects/project-4.svg', 'HTML, CSS, JavaScript', 'https://example.com/', 3),
  ('Aplikasi Catatan', 'Aplikasi mobile untuk mencatat tugas harian dengan pengingat dan sinkronisasi cloud.', '/images/projects/project-5.svg', 'Flutter, Firebase', null, 4);
insert into public.cvs (title, url, position) values
  ('CV Bahasa Indonesia', 'https://example.com/cv-id.pdf', 0),
  ('CV English', 'https://example.com/cv-en.pdf', 1);

notify pgrst, 'reload schema';
