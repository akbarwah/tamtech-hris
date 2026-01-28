import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MainLayout from "./components/MainLayout"; // Pastikan import MainLayout, BUKAN Sidebar

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tamtech International HRIS",
  description: "Internal HR Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        {/* PENTING: 
           Jangan taruh <Sidebar /> di sini.
           Gunakan <MainLayout> yang akan mengatur kapan Sidebar muncul/hilang.
        */}
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  );
}