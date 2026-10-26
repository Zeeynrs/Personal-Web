import './admin.css';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { supabase, isAdminUser } from '../lib/supabase';
import Login from './Login';
import Dashboard from './Dashboard';

const NotConfigured = () => (
  <div className="min-h-screen flex items-center justify-center px-6">
    <div className="max-w-md bg-tertiary p-8 rounded-2xl border border-white/10 text-center">
      <h1 className="text-2xl font-bold mb-3">Supabase belum dikonfigurasi</h1>
      <p className="text-secondary text-sm leading-relaxed">
        Isi <code className="text-indigo-300">VITE_SUPABASE_URL</code> dan{' '}
        <code className="text-indigo-300">VITE_SUPABASE_ANON_KEY</code> di file <code>.env</code>, lalu jalankan ulang server.
        Langkah lengkapnya ada di README.
      </p>
    </div>
  </div>
);

const AdminApp = () => {
  // undefined = masih memeriksa sesi
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!supabase) return <NotConfigured />;
  if (session === undefined) return null;
  return isAdminUser(session?.user) ? <Dashboard /> : <Login session={session} />;
};

ReactDOM.createRoot(document.getElementById('admin-root')).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
