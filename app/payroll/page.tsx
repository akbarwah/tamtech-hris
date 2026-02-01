"use client";

import React from 'react';
import Link from 'next/link';
import { Banknote, ArrowLeft, Construction, Lock } from 'lucide-react';

export default function PayrollPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center animate-enter p-6">
      
      {/* Icon Container with Pulse Effect */}
      <div className="relative mb-8 group">
        <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
        <div className="relative bg-white p-8 rounded-full shadow-xl border border-slate-100">
            <div className="bg-indigo-50 p-6 rounded-full">
                <Banknote size={64} className="text-indigo-600" />
            </div>
            {/* Badge Status */}
            <div className="absolute -bottom-2 -right-2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 flex items-center gap-1 shadow-sm">
                <Construction size={12} />
                Coming Soon
            </div>
        </div>
      </div>

      {/* Main Text */}
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
        Payroll Module
      </h1>
      
      <p className="text-slate-500 text-lg max-w-lg mx-auto leading-relaxed mb-8">
        Modul penggajian saat ini sedang dalam proses sinkronisasi data dengan 
        <span className="font-bold text-slate-700"> Departemen Finance</span>. Fitur ini akan segera tersedia untuk manajemen gaji otomatis.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link 
            href="/" 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
            <ArrowLeft size={18} />
            Back to Dashboard
        </Link>
        
        <button 
            disabled 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed border border-slate-200"
        >
            <Lock size={18} />
            Access Locked
        </button>
      </div>

    </div>
  );
}