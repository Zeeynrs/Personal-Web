-- Jadikan sebuah akun sebagai admin (jalankan di SQL Editor setelah membuat user di
-- Authentication → Users → Add user). Ganti email di bawah dengan email akun admin kamu.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email = 'emailkamu@contoh.com';
