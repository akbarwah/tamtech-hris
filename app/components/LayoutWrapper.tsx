"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <main
      className={`transition-all duration-300 ease-in-out min-h-screen
        ${isLoginPage ? "ml-0" : "ml-72"} 
      `}
    >
      {/* TAMBAHKAN DIV PEMBUNGKUS INI 
         p-8 = Padding 32px di semua sisi (atas, kanan, bawah, kiri)
         Ini yang memberi "napas" agar judul tidak nempel sidebar.
      */}
      <div className={isLoginPage ? "" : "p-8"}>
        {children}
      </div>
    </main>
  );
}