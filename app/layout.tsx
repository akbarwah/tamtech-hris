import "./globals.css";
import { Inter } from "next/font/google"; 
import Sidebar from "./components/Sidebar";
import LayoutWrapper from "./components/LayoutWrapper"; 

// 1. IMPORT SONNER (Wajib ada)
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "HRIS System",
  description: "Internal HR Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        
        {/* 2. KOMPONEN TOASTER */}
        {/* - position="top-center": Muncul di tengah atas (sangat terlihat).
            - richColors: Otomatis warna hijau (sukses) dan merah (gagal).
            - closeButton: User bisa menutup notifikasi manual jika mau.
        */}
        <Toaster position="top-center" richColors closeButton />

        {/* Sidebar sudah pintar, dia akan hide sendiri kalau di /login */}
        <Sidebar />

        {/* Wrapper ini yang mengatur Margin Kiri (ml-72 vs ml-0) */}
        <LayoutWrapper>
           {children}
        </LayoutWrapper>

      </body>
    </html>
  );
}