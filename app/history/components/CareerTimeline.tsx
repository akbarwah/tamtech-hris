"use client";

import React, { useState, useMemo } from 'react';
import { Calendar, ChevronRight, FileText, Pencil, Trash2, Search, Filter, ArrowUpDown, Briefcase, TrendingUp } from 'lucide-react';

// --- HELPER: FORMAT DATE ---
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

// --- HELPER: FORMAT RUPIAH ---
const formatRupiah = (amount: number | string | null) => {
  if (!amount) return '';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

interface CareerTimelineProps {
  careers: any[];
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
}

export default function CareerTimeline({ careers = [], onEdit, onDelete }: CareerTimelineProps) {
  // --- STATE FOR FILTER & SORT ---
  const [searchTerm, setSearchTerm] = useState('');
  const [moveTypeFilter, setMoveTypeFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // --- LOGIC FILTERING ---
  const filteredData = useMemo(() => {
    let data = [...careers];

    // 1. Filter Search
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        data = data.filter(c => 
            c.employees?.full_name?.toLowerCase().includes(lower) ||
            c.new_position?.toLowerCase().includes(lower) ||
            c.new_dept?.toLowerCase().includes(lower)
        );
    }

    // 2. Filter Tipe
    if (moveTypeFilter !== 'All') {
        data = data.filter(c => c.movement_type === moveTypeFilter);
    }

    // 3. Sort (By Effective Date)
    data.sort((a, b) => {
        const dateA = new Date(a.effective_date).getTime();
        const dateB = new Date(b.effective_date).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return data;
  }, [careers, searchTerm, moveTypeFilter, sortOrder]);

  return (
    <div className="space-y-4 animate-enter">
      
      {/* --- TOOLBAR --- */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
              <input 
                type="text" 
                placeholder="Cari karyawan, posisi..." 
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
              {/* Sort Date */}
              <button 
                onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium hover:bg-slate-100 transition-colors"
              >
                 <ArrowUpDown size={14}/> {sortOrder === 'newest' ? 'Terbaru' : 'Terlama'}
              </button>

              {/* Filter Type */}
              <div className="relative">
                  <select 
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer font-medium hover:bg-slate-100 transition-colors"
                    value={moveTypeFilter}
                    onChange={(e) => setMoveTypeFilter(e.target.value)}
                  >
                      <option value="All">Semua Tipe</option>
                      <option value="Promotion">Promotion</option>
                      <option value="Demotion">Demotion</option>
                      <option value="Transfer">Transfer</option>
                      <option value="Adjustment">Adjustment</option>
                      <option value="New Hire">New Hire</option>
                  </select>
                  <Filter size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none"/>
              </div>
          </div>
      </div>

      {/* --- TIMELINE LIST --- */}
      <div className="space-y-4">
        {filteredData.length > 0 ? filteredData.map((car) => (
            <div key={car.id} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col md:flex-row gap-6 relative overflow-hidden group hover:border-indigo-300 transition-all hover:shadow-md">
            
            {/* Color Indicator Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                car.movement_type === 'Promotion' ? 'bg-emerald-500' : 
                car.movement_type === 'Demotion' ? 'bg-red-500' : 
                car.movement_type === 'New Hire' ? 'bg-violet-500' :
                'bg-blue-500'
            }`}></div>
            
            {/* Main Content */}
            <div className="flex-1 pl-2">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider border ${
                        car.movement_type === 'Promotion' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 
                        car.movement_type === 'Demotion' ? 'text-red-700 bg-red-50 border-red-100' : 
                        car.movement_type === 'New Hire' ? 'text-violet-700 bg-violet-50 border-violet-100' :
                        'text-blue-700 bg-blue-50 border-blue-100'
                    }`}>
                        {car.movement_type}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Calendar size={12}/> Efektif: {formatDate(car.effective_date)}
                    </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    {car.employees?.full_name}
                </h3>
                
                {/* Movement Details Grid */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                    
                    {/* Previous State */}
                    <div className="text-slate-500 flex flex-col items-start min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Dari</span>
                        <div className="font-medium text-sm truncate w-full" title={car.prev_position}>{car.prev_position || '-'}</div>
                        <div className="text-xs truncate w-full" title={car.prev_dept}>{car.prev_dept}</div>
                        {Number(car.prev_salary) > 0 && (
                             <span className="text-xs font-mono text-slate-400 mt-1 line-through decoration-slate-300">
                                 {formatRupiah(car.prev_salary)}
                             </span>
                        )}
                    </div>

                    {/* Arrow Icon */}
                    <div className="flex justify-center">
                        <div className="p-1.5 bg-white rounded-full border border-slate-200 shadow-sm text-slate-400">
                            <ChevronRight size={16}/>
                        </div>
                    </div>

                    {/* New State */}
                    <div className="text-indigo-700 flex flex-col items-start min-w-0 text-right sm:text-left">
                        <span className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-indigo-400">Menjadi</span>
                        <div className="font-bold text-sm truncate w-full" title={car.new_position}>{car.new_position}</div>
                        <div className="text-xs truncate w-full" title={car.new_dept}>{car.new_dept}</div>
                        {Number(car.new_salary) > 0 && (
                             <span className="text-xs font-mono text-emerald-600 mt-1 font-bold flex items-center gap-1">
                                 {Number(car.new_salary) > Number(car.prev_salary) && <TrendingUp size={10}/>}
                                 {formatRupiah(car.new_salary)}
                             </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions & Docs */}
            <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 mt-2 md:mt-0">
                <div className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded">
                    SK: {car.sk_number || 'N/A'}
                </div>
                
                <div className="flex items-center gap-2">
                    {car.doc_url ? (
                        <a href={car.doc_url} target="_blank" rel="noreferrer" className="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-100" title="Lihat SK">
                           <FileText size={16}/>
                        </a>
                    ) : (
                        <span className="p-2 text-slate-300 cursor-not-allowed" title="No Document"><FileText size={16}/></span>
                    )}
                    
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>

                    <button onClick={() => onEdit(car)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors" title="Edit Data">
                        <Pencil size={16}/>
                    </button>
                    <button onClick={() => onDelete(car.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus Data">
                        <Trash2 size={16}/>
                    </button>
                </div>
            </div>

            </div>
        )) : (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-xl">
                <div className="bg-slate-50 p-4 rounded-full mb-3">
                    <Briefcase size={32} className="text-slate-300"/>
                </div>
                <p className="text-slate-500 font-medium">Tidak ada riwayat karir ditemukan.</p>
                <p className="text-xs text-slate-400">Coba ubah filter atau kata kunci pencarian.</p>
            </div>
        )}
      </div>
    </div>
  );
}