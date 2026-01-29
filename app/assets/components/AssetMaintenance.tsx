"use client";

import React, { useMemo } from 'react';
import { AlertTriangle, Wrench, Clock, CheckCircle2, XCircle, ShieldAlert, ArrowRight } from 'lucide-react';

interface MaintenanceProps {
  assets: any[];
  onEdit: (asset: any) => void;
}

export default function AssetMaintenance({ assets, onEdit }: MaintenanceProps) {

  // --- LOGIC: FILTER DATA ---
  
  // 1. Barang yang sedang bermasalah (Repair / Broken)
  const problematicAssets = useMemo(() => {
    return assets.filter(a => a.status === 'Repair' || a.status === 'Broken');
  }, [assets]);

  // 2. Barang yang garansinya mau habis (<= 60 hari) atau sudah habis
  const warrantyAlerts = useMemo(() => {
    return assets.filter(a => {
      if (!a.warranty_expiry) return false;
      const expiry = new Date(a.warranty_expiry);
      const today = new Date();
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Tampilkan jika expired atau akan expired dalam 60 hari
      return diffDays <= 60; 
    }).sort((a, b) => new Date(a.warranty_expiry).getTime() - new Date(b.warranty_expiry).getTime());
  }, [assets]);

  // Helper: Format Rupiah
  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  // Helper: Hitung sisa hari
  const getDaysRemaining = (dateString: string) => {
    const today = new Date();
    const expiry = new Date(dateString);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: WARRANTY ALERTS (Prioritas Tinggi) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Summary Card */}
         <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-6 rounded-2xl flex flex-col justify-center">
             <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><ShieldAlert size={24}/></div>
                 <h3 className="font-bold text-amber-900">Warranty Overview</h3>
             </div>
             <p className="text-sm text-amber-700/80 mb-4">Items needing warranty extension or replacement soon.</p>
             <div className="text-3xl font-bold text-amber-800">{warrantyAlerts.length} <span className="text-base font-normal text-amber-600">Items</span></div>
         </div>

         {/* Alert List */}
         <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock size={18} className="text-slate-400"/> Warranty Expirations (Next 60 Days)</h3>
             <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {warrantyAlerts.length === 0 && <p className="text-slate-400 text-sm italic">No warranties expiring soon. Good job!</p>}
                
                {warrantyAlerts.map(item => {
                    const days = getDaysRemaining(item.warranty_expiry);
                    const isExpired = days < 0;
                    return (
                        <div key={item.id} onClick={() => onEdit(item)} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer group transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-10 rounded-full ${isExpired ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                <div>
                                    <div className="font-bold text-slate-700 text-sm">{item.name}</div>
                                    <div className="text-xs text-slate-400">{item.serial_number} • ID: {item.id}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-xs font-bold px-2 py-1 rounded ${isExpired ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {isExpired ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">{new Date(item.warranty_expiry).toLocaleDateString()}</div>
                            </div>
                        </div>
                    )
                })}
             </div>
         </div>
      </div>

      {/* SECTION 2: REPAIR & BROKEN QUEUE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div>
                 <h3 className="font-bold text-slate-800 flex items-center gap-2"><Wrench size={18} className="text-slate-400"/> Maintenance Queue</h3>
                 <p className="text-xs text-slate-500 mt-1">List of assets currently in 'Repair' or 'Broken' status.</p>
             </div>
             {problematicAssets.length > 0 && (
                 <span className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs font-bold">{problematicAssets.length} Issues</span>
             )}
         </div>

         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500">
                     <tr>
                         <th className="px-6 py-4">Asset Detail</th>
                         <th className="px-6 py-4">Current Holder</th>
                         <th className="px-6 py-4">Purchase Date</th>
                         <th className="px-6 py-4">Asset Value</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4 text-right">Action</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {problematicAssets.length === 0 ? (
                         <tr>
                             <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                 <div className="flex flex-col items-center gap-2">
                                     <CheckCircle2 size={32} className="text-emerald-200"/>
                                     <p>All assets are in good condition.</p>
                                 </div>
                             </td>
                         </tr>
                     ) : (
                         problematicAssets.map(item => (
                             <tr key={item.id} onClick={() => onEdit(item)} className="hover:bg-slate-50 cursor-pointer group">
                                 <td className="px-6 py-4">
                                     <div className="font-bold text-slate-800">{item.name}</div>
                                     <div className="text-xs text-slate-400 font-mono">{item.serial_number}</div>
                                 </td>
                                 <td className="px-6 py-4">
                                     {item.holder ? (
                                         <span className="flex items-center gap-2 text-slate-700"><span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{item.holder.substring(0,2).toUpperCase()}</span> {item.holder}</span>
                                     ) : <span className="text-slate-400 italic">No Holder</span>}
                                 </td>
                                 <td className="px-6 py-4 text-slate-500">{item.purchase_date || '-'}</td>
                                 <td className="px-6 py-4 font-mono text-slate-600">{item.price ? formatIDR(item.price) : '-'}</td>
                                 <td className="px-6 py-4">
                                     <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold w-fit ${
                                         item.status === 'Broken' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                     }`}>
                                         {item.status === 'Broken' ? <XCircle size={12}/> : <Wrench size={12}/>}
                                         {item.status}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <button className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center gap-1 ml-auto group-hover:underline">
                                         Update Status <ArrowRight size={12}/>
                                     </button>
                                 </td>
                             </tr>
                         ))
                     )}
                 </tbody>
             </table>
         </div>
      </div>
    </div>
  );
}