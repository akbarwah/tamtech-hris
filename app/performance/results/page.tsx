"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import { ArrowLeft, Search, FileBarChart, Pencil, ArrowUpDown, Loader2, Trash2, Eye } from 'lucide-react'; 
import Link from 'next/link';
import { toast } from 'sonner'; 

export default function PerformanceResultsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ 
      key: 'date', 
      direction: 'desc' 
  });

  useEffect(() => {
      const savedSort = localStorage.getItem('performance_sort_config');
      if (savedSort) {
          try { setSortConfig(JSON.parse(savedSort)); } catch (e) { console.error(e); }
      }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
        // --- PERBAIKAN UTAMA DI SINI ---
        // Menghapus tanda seru (!) pada relasi employees dan cycle.
        // Mengubah dari INNER JOIN menjadi LEFT JOIN.
        // Artinya: Tampilkan Review walau data Employee tidak terbaca.
        const { data, error } = await supabase
          .from('performance_reviews')
          .select(`
            id, 
            cycle_id, 
            employee_id,
            final_score_total, 
            normalized_score,
            created_at,
            employee:employees(full_name, job_position, department), 
            cycle:performance_cycles(title, status)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        console.log("Data loaded:", data?.length); // Cek console apakah 66?
        setReviews(data || []);
    } catch (error: any) {
        console.error("Fetch Error:", error);
        toast.error("Gagal memuat data rekapitulasi.");
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
      if(!confirm("Yakin ingin menghapus penilaian ini secara permanen?")) return;

      const deletePromise = new Promise(async (resolve, reject) => {
          const { error } = await supabase.from('performance_reviews').delete().eq('id', id);
          if (error) reject(error.message);
          else {
              fetchReviews(); 
              resolve("Penilaian dihapus");
          }
      });

      toast.promise(deletePromise, {
          loading: 'Menghapus data...',
          success: (msg) => `${msg}`,
          error: (err) => `Gagal hapus: ${err}`
      });
  };

  const getCategoryLabel = (score: number) => {
      if (score >= 91) return { label: 'Outstanding', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      if (score >= 76) return { label: 'Exceed Expectation', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      if (score >= 60) return { label: 'Meet Expectation', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      if (score >= 41) return { label: 'Under Expectation', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      return { label: 'Need Improvement', color: 'bg-red-50 text-red-700 border-red-200' };
  };

  const getScoreColor = (score: number) => {
    if (score >= 91) return 'text-purple-700 bg-purple-50 border-purple-200'; 
    if (score >= 76) return 'text-emerald-700 bg-emerald-50 border-emerald-200'; 
    if (score >= 60) return 'text-blue-700 bg-blue-50 border-blue-200'; 
    if (score >= 41) return 'text-amber-700 bg-amber-50 border-amber-200'; 
    return 'text-red-700 bg-red-50 border-red-200'; 
  };

  const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
      const newConfig = { key, direction };
      setSortConfig(newConfig);
      localStorage.setItem('performance_sort_config', JSON.stringify(newConfig));
  };

  const filteredAndSorted = [...reviews]
    .filter(r => 
        (r.employee?.full_name || 'Unknown Employee').toLowerCase().includes(term.toLowerCase()) ||
        (r.cycle?.title || '').toLowerCase().includes(term.toLowerCase())
    )
    .sort((a, b) => {
        if (sortConfig.key === 'name') {
            const nameA = a.employee?.full_name?.toLowerCase() || '';
            const nameB = b.employee?.full_name?.toLowerCase() || '';
            return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        }
        if (sortConfig.key === 'score') {
            return sortConfig.direction === 'asc' 
                ? a.normalized_score - b.normalized_score 
                : b.normalized_score - a.normalized_score;
        }
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
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('name')}>
                            <div className="flex items-center gap-2">Karyawan <ArrowUpDown size={14} className={sortConfig.key === 'name' ? 'text-indigo-600' : 'text-slate-300'}/></div>
                        </th>
                        <th className="px-6 py-4">Periode</th>
                        <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('score')}>
                            <div className="flex items-center justify-center gap-2">Final Score <ArrowUpDown size={14} className={sortConfig.key === 'score' ? 'text-indigo-600' : 'text-slate-300'}/></div>
                        </th>
                        <th className="px-6 py-4 text-center">Category</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={5} className="p-12 text-center text-slate-400 flex flex-col items-center gap-2"><Loader2 className="animate-spin"/> Loading data...</td></tr>
                    ) : filteredAndSorted.length === 0 ? (
                        <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Belum ada data penilaian yang ditemukan.</td></tr>
                    ) : (
                        filteredAndSorted.map((r) => {
                            const cat = getCategoryLabel(r.normalized_score);
                            // Fallback jika employee data null karena RLS
                            const empName = r.employee?.full_name || 'Unknown (Check RLS)';
                            const empJob = r.employee?.job_position || '-';

                            return (
                                <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{empName}</div>
                                        <div className="text-xs text-slate-500">{empJob}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600 border border-slate-200">{r.cycle?.title || 'Unknown Cycle'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(r.normalized_score)}`}>
                                            {r.normalized_score}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${cat.color}`}>
                                            {cat.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link 
                                                href={`/performance/report/${r.id}`} 
                                                className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                title="Lihat Rapor"
                                            >
                                                <Eye size={16}/>
                                            </Link>
                                            <Link 
                                                href={`/performance/input?cid=${r.cycle_id}&eid=${r.employee_id}`} 
                                                className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                                                title="Edit Nilai"
                                            >
                                                <Pencil size={16}/>
                                            </Link>
                                            <button 
                                                onClick={() => handleDelete(r.id)}
                                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                title="Hapus Permanen"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
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
    </div>
  );
}