"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
// 1. Tambahkan Import Image dari Next.js
import Image from 'next/image'; 
import { Loader2, Lock, Mail } from 'lucide-react'; // Hapus ShieldCheck karena sudah tidak dipakai

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success("Welcome back!");
      router.push('/'); 
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-enter">
        
        {/* Header Visual */}
        <div className="bg-indigo-600 px-8 py-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-20 transform -skew-y-12 scale-150"></div>
            <div className="relative z-10 flex flex-col items-center">
                
                {/* 2. AREA LOGO PERUSAHAAN */}
                <div className="bg-white p-3 rounded-2xl mb-4 shadow-lg">
                    {/* Mengambil file dari public/favicon.ico */}
                    <Image 
                        src="/favicon.ico" 
                        alt="Company Logo" 
                        width={48} 
                        height={48} 
                        className="w-12 h-12 object-contain"
                    />
                </div>

                <h1 className="text-2xl font-bold text-white tracking-tight">Tamtech HRIS Portal</h1>
                <p className="text-indigo-200 text-sm mt-1">Employee Management System</p>
            </div>
        </div>

        {/* Login Form */}
        <div className="p-8 pt-10">
            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email Address</label>
                    <div className="relative">
                        <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-400"/>
                        <input 
                            type="email" 
                            required
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            placeholder="admin@company.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                    <div className="relative">
                        <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-400"/>
                        <input 
                            type="password" 
                            required
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button 
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-4"
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-xs text-slate-400">
                    Lupa password? Hubungi <span className="text-indigo-600 font-bold cursor-pointer hover:underline">IT Support</span>.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
} 