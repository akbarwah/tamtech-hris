"use client";

import React, { useState, useEffect } from "react"; // Tambah useEffect
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; 
import { 
  LayoutDashboard, 
  Users, 
  History, 
  MonitorSmartphone, 
  CalendarDays, 
  LogOut,
  Briefcase, 
  Banknote,  
  BarChart2,
  Loader2 
} from "lucide-react";

// Konfigurasi Menu
const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Briefcase, label: "Recruitment", href: "/recruitment" }, 
  { icon: Users, label: "Employees", href: "/employees" },
  { icon: CalendarDays, label: "Time Off", href: "/time-off" },
  { icon: BarChart2, label: "Performance", href: "/performance" }, 
  { icon: Banknote, label: "Payroll", href: "/payroll" },
  { icon: MonitorSmartphone, label: "Assets", href: "/assets" },
  { icon: History, label: "History & Contracts", href: "/history" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // State untuk Loading Logout
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // State untuk Data User (Default sementara sebelum loading selesai)
  const [userInfo, setUserInfo] = useState({
    email: "Loading...",
    name: "HR Admin",
    initial: "HR"
  });

  // --- FETCH USER DATA SAAT SIDEBAR MUNCUL ---
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.email) {
        // Ambil nama dari bagian depan email (misal: 'budi' dari 'budi@gmail.com')
        // Atau ambil dari user_metadata jika Anda nanti sudah setting fitur 'Full Name'
        const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
        
        // Ambil 2 huruf pertama untuk avatar (misal: 'BU')
        const initialName = displayName.substring(0, 2).toUpperCase();

        setUserInfo({
          email: user.email,
          name: displayName, // Akan menampilkan email bagian depan jika nama kosong
          initial: initialName
        });
      }
    };

    fetchUser();
  }, []);

// --- LOGIC LOGOUT (OPTIMIZED) ---
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true); // Mulai loading UI

      // 1. Hapus session Supabase
      // Kita pakai await agar session di server benar-benar mati
      await supabase.auth.signOut();
      
      // 2. Bersihkan penyimpanan lokal browser (PENTING)
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        // Hapus cookie Supabase secara manual (opsional, untuk memastikan bersih total)
        document.cookie.split(";").forEach((c) => { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
      }

      // 3. HARD RELOAD ke halaman Login
      // Ini jauh lebih cepat daripada router.replace() + router.refresh()
      window.location.href = '/login'; 
      
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback jika error, tetap paksa keluar
      window.location.href = '/login';
    }
  };

  return (
    <aside className="w-72 bg-white border-r border-slate-200 fixed h-full flex flex-col justify-between z-50 print:hidden">      
      
      {/* --- BAGIAN LOGO --- */}
      <div className="pt-6 pb-2 px-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-40 h-20 flex items-center justify-center mb-0">
            <img 
              src="/logo.png" 
              alt="Tamtech Logo" 
              className="w-full h-full object-contain scale-110" 
            />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-xl leading-tight tracking-tight whitespace-nowrap">
              Tamtech International
            </h1>
            <p className="text-xs text-slate-500 font-bold tracking-[0.2em] uppercase mt-1">
              Internal HRIS System
            </p>
          </div>
        </div>
      </div>

      {/* --- BAGIAN MENU NAVIGASI --- */}
      <nav className="flex-1 px-4 space-y-2 mt-2 overflow-y-auto">
        <div className="border-t border-slate-100 mx-4 mb-4"></div>

        <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Main Menu</p>
        
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-200" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={20} className={isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* --- BAGIAN PROFILE USER DINAMIS (FOOTER) --- */}
      <div className="p-4 m-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          
          {/* Avatar Inisial Dinamis */}
          <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-600 font-bold text-xs">
            {userInfo.initial}
          </div>
          
          {/* Nama & Email Real-time */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate capitalize">
              {userInfo.name}
            </p>
            <p className="text-xs text-slate-500 truncate" title={userInfo.email}>
              {userInfo.email}
            </p>
          </div>
        </div>
        
        {/* TOMBOL LOGOUT */}
        <button 
          onClick={handleLogout}
          disabled={isLoggingOut} 
          className={`w-full flex items-center justify-center gap-2 text-xs font-medium transition-colors py-2 rounded-lg border border-transparent 
            ${isLoggingOut 
              ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
              : "text-slate-500 hover:text-red-600 cursor-pointer hover:bg-white hover:border-slate-200"
            }`}
        >
          {isLoggingOut ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Signing out...
            </>
          ) : (
            <>
              <LogOut size={14} /> Sign Out
            </>
          )}
        </button>
      </div>
      
    </aside>
  );
}