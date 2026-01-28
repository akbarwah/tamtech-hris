"use client";

import React, { useState } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, LayoutDashboard } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Login berhasil, arahkan ke dashboard
        router.push('/'); // Atau ke halaman utama yang Anda mau
        router.refresh();
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Gagal login. Cek email dan password.');
    } finally {
      setLoading(false);
    }
  };

return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-enter">
        
        {/* Header Logo */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-center">
          
          {/* --- BAGIAN YANG DIUBAH (Ganti Icon jadi Image) --- */}
          <div className="w-full h-20 flex items-center justify-center mb-2">
             <img 
               src="/favicon.ico"  // Menggunakan logo yang sama dengan Sidebar
               // Jika tetap ingin pakai favicon, ubah jadi: src="/favicon.ico"
               alt="Company Logo" 
               className="h-full object-contain drop-shadow-md" 
               // Note: 'brightness-0 invert' membuat logo jadi putih total (cocok untuk background biru).
               // Jika logo anda berwarna dan ingin warna aslinya, hapus class 'brightness-0 invert'
             />
          </div>
          {/* -------------------------------------------------- */}

          <h1 className="text-2xl font-bold text-white">Tamtech HRIS</h1>
          <p className="text-indigo-100 text-sm mt-1">Please sign in to continue</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium text-center">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm transition-all text-slate-800"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm transition-all text-slate-800"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Forgot password? Contact IT Administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}