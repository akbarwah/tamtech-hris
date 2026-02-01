"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';   // Import default
import AuthGuard from './AuthGuard'; // Import default

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Cek apakah sedang di halaman login
  const isLoginPage = pathname === '/login';

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50">
        
        {/* Sidebar hanya muncul jika BUKAN halaman login */}
        {!isLoginPage && <Sidebar />}

        {/* Main Content */}
        {/* Jika Login Page: Full Width (w-full). Jika Dashboard: Ada Margin Kiri (ml-72) */}
        <main className={`flex-1 min-h-screen animate-enter ${isLoginPage ? 'w-full p-0' : 'ml-72 p-8'}`}>
          <div className={isLoginPage ? '' : 'max-w-7xl mx-auto'}>
            {children}
          </div>
        </main>
        
      </div>
    </AuthGuard>
  );
}