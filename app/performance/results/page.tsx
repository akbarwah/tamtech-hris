"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient'; 
import { ArrowLeft, Search, FileBarChart, Pencil, ArrowUpDown } from 'lucide-react'; 
import Link from 'next/link';

export default function PerformanceResultsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');
  
  // State Sorting (Default: Created Date Desc)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ 
      key: 'date', 
      direction: 'desc' 
  });

  // 1. LOAD PREFERENCE FROM LOCAL STORAGE (SAAT PAGE LOAD)
  useEffect(() => {
      const savedSort = localStorage.getItem('performance_sort_config');
      if (savedSort) {
          try {
              setSortConfig(JSON.parse(savedSort));
          } catch (e) {
              console.error("Gagal baca sort config", e);
          }
      }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('performance_reviews')
      .select(`
        id, 
        cycle_id, 
        employee_id,
        final_score_total, 
        normalized_score,
        created_at,
        employee:employees!employee_id(full_name, job_position, department),
        cycle:performance_cycles!cycle_id(title, status)
      `)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    setReviews(data || []);
    setLoading(false);
  };

  const getCategoryLabel = (score: number) => {
      if (score >= 91) return { label: 'Outstanding', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      if (score >= 76) return { label: 'Exceed Expectation', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      if (score >= 60) return { label: 'Meet Expectation', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      if (score >= 41) return { label: 'Under Expectation', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      return { label: 'Need Improvement', color: 'bg-red-50 text-red-700 border-red-200' };
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-100';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  // 2. HANDLE SORT & SAVE TO LOCAL STORAGE
  const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      // Jika klik kolom yang sama, toggle arahnya
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      
      const newConfig = { key, direction };
      setSortConfig(newConfig);
      
      // SIMPAN KE BROWSER
      localStorage.setItem('performance_sort_config', JSON.stringify(newConfig));
  };

  // 3. APPLY SORTING
  const filteredAndSorted = [...reviews]
    .filter(r => 
        r.employee?.full_name.toLowerCase().includes(term.toLowerCase()) ||
        r.cycle?.title.toLowerCase().includes(term.toLowerCase())
    )
    .sort((a, b) => {
        if (sortConfig.key === 'name') {
            const nameA = a.employee.full_name.toLowerCase();
            const nameB = b.employee.full_name.toLowerCase();
            return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        }
        if (sortConfig.key === 'score') {
            return sortConfig.direction === 'asc' 
                ? a.normalized_score - b.normalized_score 
                : b.normalized_score - a.normalized_score;
        }
        // Default: Date Created
        return sortConfig.direction === 'asc' 
            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="min-h-screen pb-20 animate-enter space-y-6">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/performance" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"><ArrowLeft size={20}/></Link>
            <div><h1 className="text-2xl font-bold text-slate-900">Rekapitulasi Hasil</h1><p className="text-slate-500 text-sm">Daftar peringkat dan kategori kinerja karyawan.</p></div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search size={20} className="text-slate-400"/>
        <input type="text" placeholder="Cari nama karyawan atau periode..." className="flex-1 outline-none text-sm" value={term} onChange={e => setTerm(e.target.value)} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                    {/* Header Nama */}
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-indigo-600 transition-colors select-none" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-2">
                            Karyawan 
                            <ArrowUpDown size={14} className={sortConfig.key === 'name' ? 'text-indigo-600' : 'text-slate-300'}/>
                        </div>
                    </th>
                    
                    <th className="px-6 py-4">Periode</th>
                    
                    {/* Header Score */}
                    <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 hover:text-indigo-600 transition-colors select-none" onClick={() => handleSort('score')}>
                        <div className="flex items-center justify-center gap-2">
                            Final Score 
                            <ArrowUpDown size={14} className={sortConfig.key === 'score' ? 'text-indigo-600' : 'text-slate-300'}/>
                        </div>
                    </th>

                    <th className="px-6 py-4 text-center">Category</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading data...</td></tr>
                ) : filteredAndSorted.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Belum ada data penilaian.</td></tr>
                ) : (
                    filteredAndSorted.map((r) => {
                        const cat = getCategoryLabel(r.normalized_score);
                        return (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900">{r.employee?.full_name}</div>
                                    <div className="text-xs text-slate-500">{r.employee?.job_position}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600 border border-slate-200">{r.cycle?.title}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(r.normalized_score)}`}>{r.normalized_score}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${cat.color}`}>{cat.label}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link 
                                            href={`/performance/input?cid=${r.cycle_id}&eid=${r.employee_id}`} 
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                            title="Edit Penilaian"
                                        >
                                            <Pencil size={16}/>
                                        </Link>
                                        <Link 
                                            href={`/performance/report/${r.id}`} 
                                            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            <FileBarChart size={16}/> Rapor
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}