"use client";

import React from 'react';
import { Box, DollarSign, Laptop, AlertTriangle } from 'lucide-react';

export default function AssetStats({ assets }: { assets: any[] }) {
  // 1. Calculate Totals
  const totalAssets = assets.length;
  
  // 2. Calculate Value
  const totalValue = assets.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  
  // 3. FIX LOGIC: Hitung berdasarkan kolom 'holder' yang terisi, bukan cuma status
  // Ini menangani kasus jika user mengisi nama holder tapi lupa ubah status jadi 'Assigned'
  const assignedCount = assets.filter(a => a.holder && a.holder.trim() !== '').length;
  
  // 4. Calculate Issues
  const maintenanceCount = assets.filter(a => ['Maintenance', 'Repair', 'Broken'].includes(a.status)).length;

  // Format Currency (IDR)
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* Total Assets - Clean White Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Assets</p>
          <div className="text-2xl font-bold text-slate-800">{totalAssets}</div>
        </div>
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Box size={20}/>
        </div>
      </div>

      {/* Total Value - Clean White Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Value</p>
          <div className="text-2xl font-bold text-emerald-600">{formatIDR(totalValue)}</div>
        </div>
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <DollarSign size={20}/>
        </div>
      </div>

      {/* Assigned Assets - Clean White Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Use / Assigned</p>
          <div className="text-2xl font-bold text-blue-600">
            {assignedCount} <span className="text-xs text-slate-400 font-normal">/ {totalAssets}</span>
          </div>
        </div>
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Laptop size={20}/>
        </div>
      </div>

      {/* Maintenance - Clean White Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Needs Repair</p>
          <div className="text-2xl font-bold text-amber-600">{maintenanceCount}</div>
        </div>
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <AlertTriangle size={20}/>
        </div>
      </div>

    </div>
  );
}