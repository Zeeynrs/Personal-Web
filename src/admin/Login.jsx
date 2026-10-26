import React, { useState } from 'react';
import { supabase, isAdminUser } from '../lib/supabase';

const inputCls = 'w-full bg-black-200 text-white-100 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-white/5';

const Login = ({ session }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message === 'Invalid login credentials' ? 'Email atau password salah' : authError.message);
    } else if (!isAdminUser(data.user)) {
      // Login berhasil tapi bukan admin: keluarkan lagi
      await supabase.auth.signOut();
      setError('Akun ini bukan admin');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-tertiary p-10 rounded-2xl shadow-card border border-white/10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Admin Login</h1>
          <p className="text-secondary mt-2">Masuk untuk mengelola konten</p>
        </div>

        {(error || (session && !isAdminUser(session.user))) && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
            {error || 'Akun ini bukan admin'}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-secondary mb-2 text-sm">Email</label>
            <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="Masukkan email" required />
          </div>
          <div>
            <label htmlFor="password" className="block text-secondary mb-2 text-sm">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" required />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? 'Masuk…' : 'Masuk'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a href="/" className="text-secondary hover:text-white-100 text-sm transition-all">← Kembali ke Website</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
