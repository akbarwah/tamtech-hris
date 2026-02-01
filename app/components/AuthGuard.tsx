"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      // 1. Cek sesi saat ini
      const { data: { session } } = await supabase.auth.getSession();

      // 2. Logic Redirect
      if (!session) {
        // Jika tidak ada sesi DAN bukan di halaman login, tendang ke login
        if (pathname !== '/login') {
          router.replace('/login');
        } else {
          setLoading(false); // Biarkan render halaman login
        }
      } else {
        setAuthenticated(true);
        // Jika sudah login TAPI coba akses halaman login, lempar ke dashboard
        if (pathname === '/login') {
        router.replace('/'); // Ubah ke root (Dashboard)
        } else {
          setLoading(false);
        }
      }
    };

    checkSession();

    // Listener jika user logout/login di tab lain
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-sm font-bold text-slate-400 animate-pulse">Verifying Access...</p>
        </div>
      </div>
    );
  }

  // Jika di halaman login, render apa adanya. Jika authenticated, render konten.
  if (pathname === '/login' || authenticated) {
    return <>{children}</>;
  }

  return null; 
}