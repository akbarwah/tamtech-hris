"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; 
import { 
  LayoutDashboard, Users, History, MonitorSmartphone, CalendarDays, 
  LogOut, Briefcase, Banknote, BarChart2, Loader2, ShieldAlert 
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Briefcase, label: "Recruitment", href: "/recruitment" }, 
  { icon: Users, label: "Employees", href: "/employees" },
  { icon: CalendarDays, label: "Time Off", href: "/time-off" },
  { icon: BarChart2, label: "Performance", href: "/performance" }, 
  { icon: Banknote, label: "Payroll", href: "/payroll" },
  { icon: MonitorSmartphone, label: "Assets", href: "/assets" },
  { icon: History, label: "History & Contracts", href: "/history" },
  { icon: ShieldAlert, label: "Audit Logs", href: "/audit-logs" },
];

const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 Jam

export default function Sidebar() {
  // 1. HOOKS WAJIB DI ATAS (JANGAN DI-RETURN DULU)
  const pathname = usePathname();
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userInfo, setUserInfo] = useState({
    email: "Loading...",
    name: "HR Admin",
    initial: "HR"
  });

  // --- LOGIC LOGOUT (HARD RESET) ---
  const handleLogout = useCallback(async (isTimeout = false) => {
    if (isLoggingOut) return; // Prevent double click
    
    try {
      setIsLoggingOut(true); 
      
      // 1. Hapus sesi di server Supabase
      await supabase.auth.signOut();
      
      // 2. Bersihkan penyimpanan lokal browser
      if (typeof window !== 'undefined') {
        localStorage.clear(); 
        sessionStorage.clear();
        
        // Hapus paksa semua cookie agar bersih
        document.cookie.split(";").forEach((c) => { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
      }

      // 3. Redirect menggunakan Hard Refresh (Window Location)
      // Ini lebih aman daripada router.push karena membersihkan state memory React
      const targetUrl = isTimeout ? '/login?reason=timeout' : '/login';
      window.location.href = targetUrl;
      
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback jika error, tetap lempar ke login
      window.location.href = '/login';
    }
  }, [isLoggingOut]); 

  // --- LOGIC AUTO LOGOUT (INACTIVITY) ---
  useEffect(() => {
    // Fungsi update waktu terakhir aktif
    const updateActivity = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('hris_last_activity', Date.now().toString());
        }
    };

    // Fungsi cek apakah sudah basi
    const checkInactivity = () => {
        const lastActivity = localStorage.getItem('hris_last_activity');
        
        if (lastActivity) {
            const now = Date.now();
            const diff = now - parseInt(lastActivity);
            if (diff > INACTIVITY_LIMIT) {
                console.warn("Session expired due to inactivity.");
                handleLogout(true); 
            }
        } else {
            updateActivity();
        }
    };

    // Listeners
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);

    // Cek setiap 1 menit
    const intervalId = setInterval(checkInactivity, 60 * 1000); 

    return () => {
        window.removeEventListener('mousemove', updateActivity);
        window.removeEventListener('keydown', updateActivity);
        window.removeEventListener('click', updateActivity);
        window.removeEventListener('scroll', updateActivity);
        clearInterval(intervalId);
    };
  }, [handleLogout]);

  // --- FETCH USER DATA ---
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
        const initialName = displayName.substring(0, 2).toUpperCase();
        setUserInfo({ email: user.email, name: displayName, initial: initialName });
      }
    };
    fetchUser();
  }, []);

  // 2. KONDISI RENDER (BARU BOLEH RETURN NULL DISINI)
  // Sembunyikan Sidebar jika di halaman Login
  if (pathname === "/login") {
    return null;
  }

  // --- RENDER COMPONENT ---
  return (
    <aside className="w-64 bg-white border-r border-slate-200 fixed h-full flex flex-col justify-between z-50 print:hidden transition-all duration-300">      
      
      {/* HEADER */}
      <div className="pt-5 pb-1 px-5">
        <div className="flex flex-col items-center text-center">
          <div className="w-48 h-24 flex items-center justify-center mb-0">
            {/* Pastikan file /logo.png ada di folder public */}
            <img src="/logo.png" alt="Company Logo" className="w-full h-full object-contain scale-100" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg leading-tight tracking-tight whitespace-nowrap">Tamtech International</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] mt-0.5">Internal HRIS System</p>
          </div>
        </div>
      </div>

      {/* MENU NAVIGATION */}
      <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
        <div className="border-t border-slate-100 mx-3 mb-3"></div>
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Main Menu</p>
        
        {menuItems.map((item) => {
          // Logic active state: Exact match untuk Home, StartsWith untuk sub-halaman
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm ${
                isActive 
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-200" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={18} className={isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER USER PROFILE & LOGOUT */}
      <div className="p-3 m-3 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-600 font-bold text-[10px]">
            {userInfo.initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate capitalize">{userInfo.name}</p>
            <p className="text-[10px] text-slate-500 truncate" title={userInfo.email}>{userInfo.email}</p>
          </div>
        </div>
        
        <button 
            onClick={() => handleLogout(false)} 
            disabled={isLoggingOut} 
            className={`w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wide transition-colors py-2 rounded-lg border ${
                isLoggingOut 
                ? "bg-slate-100 text-slate-400 border-transparent cursor-not-allowed" 
                : "bg-white border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 shadow-sm"
            }`}
        >
          {isLoggingOut ? (
            <>
                <Loader2 size={12} className="animate-spin" /> 
                Signing out...
            </>
          ) : (
            <>
                <LogOut size={12} /> 
                Sign Out
            </>
          )}
        </button>
      </div>
      
    </aside>
  );
}