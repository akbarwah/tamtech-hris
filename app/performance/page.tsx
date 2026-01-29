"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabaseClient";
import Link from 'next/link';
import { 
  Settings, UserCheck, FileText, ArrowRight, 
  Target, Users, Trophy, Activity, Calendar, AlertCircle 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

export default function PerformanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    reviewedCount: 0,
    avgScore: 0
  });
  const [distributionData, setDistributionData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    // 1. Get Active Cycle
    const { data: cycle } = await supabase.from('performance_cycles').select('*').eq('status', 'Active').single(); 
    setActiveCycle(cycle);

    // 2. Get Total Employees (Headcount Real)
    const { count: totalEmp } = await supabase.from('employees').select('*', { count: 'exact', head: true });

    if (cycle) {
      // 3. Get Reviews
      const { data: reviews } = await supabase.from('performance_reviews').select('normalized_score').eq('cycle_id', cycle.id);
      
      // Exclude nilai 0
      const validReviews = reviews?.filter(r => r.normalized_score > 0) || [];
      
      const count = validReviews.length;
      
      // Hitung Rata-rata
      const totalScore = validReviews.reduce((acc, curr) => acc + curr.normalized_score, 0);
      const avg = count > 0 ? (totalScore / count).toFixed(1) : 0;

      setStats({ 
          totalEmployees: totalEmp || 0, 
          reviewedCount: count,
          avgScore: Number(avg) 
      });

      processDistribution(validReviews);
    } else {
        setStats({ totalEmployees: totalEmp || 0, reviewedCount: 0, avgScore: 0 });
    }
    setLoading(false);
  };

  const getCategory = (score: number) => {
      if (score >= 91) return 'Outstanding';
      if (score >= 76) return 'Exceed';
      if (score >= 60) return 'Meet';
      if (score >= 41) return 'Under';
      return 'Poor';
  };

  const processDistribution = (reviews: any[]) => {
      const counts: Record<string, number> = { 'Outstanding': 0, 'Exceed': 0, 'Meet': 0, 'Under': 0, 'Poor': 0 };
      
      reviews.forEach(r => {
          const cat = getCategory(r.normalized_score);
          if (counts[cat] !== undefined) counts[cat]++;
      });

      const data = [
          { name: 'Outstanding', count: counts['Outstanding'], color: '#7c3aed' }, // Purple
          { name: 'Exceed', count: counts['Exceed'], color: '#10b981' },      // Emerald
          { name: 'Meet', count: counts['Meet'], color: '#3b82f6' },        // Blue
          { name: 'Under', count: counts['Under'], color: '#f59e0b' },      // Amber
          { name: 'Poor', count: counts['Poor'], color: '#ef4444' }           // Red
      ];
      setDistributionData(data);
  };

  return (
    <div className="min-h-screen animate-enter space-y-8 pb-20">
      
      {/* HEADER JUDUL */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Performance Dashboard</h1>
        <p className="text-slate-500">Overview kinerja perusahaan dan progres penilaian.</p>
      </div>

      {/* --- HERO BANNER --- */}
      {activeCycle ? (
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 lg:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                      <span className="bg-white/20 text-xs font-bold px-2 py-1 rounded border border-white/10 flex items-center gap-1 animate-pulse">
                          <Activity size={12}/> ACTIVE PERIOD
                      </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-2">{activeCycle.title}</h2>
                  <p className="opacity-90 text-sm flex items-center gap-2">
                      <Calendar size={18}/> {activeCycle.start_date || '?'} s/d {activeCycle.end_date || '?'}
                  </p>
              </div>
              
              <div className="bg-white/10 p-5 rounded-xl border border-white/10 min-w-[280px] backdrop-blur-sm">
                  <div className="text-xs opacity-80 font-bold uppercase tracking-wider mb-2">Progress Input</div>
                  <div className="text-4xl font-bold mb-2">
                      {stats.reviewedCount} <span className="text-xl opacity-60 font-normal">/ {stats.totalEmployees}</span>
                  </div>
                  <div className="w-full bg-black/20 h-3 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
                           style={{ width: `${stats.totalEmployees > 0 ? (stats.reviewedCount / stats.totalEmployees) * 100 : 0}%` }}>
                      </div>
                  </div>
                  <div className="text-[10px] mt-2 opacity-60">*Hanya menghitung karyawan yang sudah dinilai</div>
              </div>
          </div>
      ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6 text-amber-800">
              <AlertCircle size={32}/>
              <div className="flex-1">
                  <h3 className="font-bold text-lg">Tidak ada Periode Aktif</h3>
                  <p className="text-sm opacity-80">Sistem penilaian sedang tidak berjalan. Silakan aktifkan periode baru di menu konfigurasi.</p>
              </div>
              <Link href="/performance/settings" className="px-6 py-3 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold transition-colors">
                  Buat Periode
              </Link>
          </div>
      )}

      {/* --- MIDDLE SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: STATS (4 Kolom) */}
          <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Trophy size={28}/>
                  </div>
                  <div>
                      <div className="text-slate-500 text-xs font-bold uppercase tracking-wide">Company Avg Score</div>
                      <div className="text-3xl font-bold text-slate-800">{stats.avgScore} <span className="text-sm text-slate-400 font-normal">/ 100</span></div>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center">
                      <Users size={28}/>
                  </div>
                  <div>
                      <div className="text-slate-500 text-xs font-bold uppercase tracking-wide">Total Karyawan</div>
                      <div className="text-3xl font-bold text-slate-800">{stats.totalEmployees} <span className="text-sm text-slate-400 font-normal">Orang</span></div>
                  </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4">Quick Actions</h4>
                  <div className="space-y-2">
                      <Link href="/performance/input" className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl group transition-colors border border-transparent hover:border-slate-100">
                          <span className="text-sm font-medium text-slate-600 group-hover:text-indigo-600 flex items-center gap-3">
                              <FileText size={18}/> Input Penilaian
                          </span>
                          <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-600"/>
                      </Link>
                      <Link href="/performance/results" className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl group transition-colors border border-transparent hover:border-slate-100">
                          <span className="text-sm font-medium text-slate-600 group-hover:text-emerald-600 flex items-center gap-3">
                              <UserCheck size={18}/> Lihat Laporan
                          </span>
                          <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-600"/>
                      </Link>
                      <Link href="/performance/settings" className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl group transition-colors border border-transparent hover:border-slate-100">
                          <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 flex items-center gap-3">
                              <Settings size={18}/> Konfigurasi
                          </span>
                          <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-900"/>
                      </Link>
                  </div>
              </div>
          </div>

          {/* RIGHT: CHART (8 Kolom) */}
          <div className="lg:col-span-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[450px]">
              <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Target size={20}/> Distribusi Kinerja (Bell Curve)</h3>
                  <p className="text-sm text-slate-500">Sebaran kategori penilaian karyawan pada periode aktif (Exclude nilai 0).</p>
              </div>
              
              <div className="flex-1 w-full">
                  {loading ? (
                      <div className="h-full flex items-center justify-center text-slate-400">Loading Data...</div>
                  ) : activeCycle && distributionData.length > 0 && stats.reviewedCount > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          {/* FIX LAYOUT: Tambah bottom margin agar text tidak kepotong */}
                          <BarChart data={distributionData} margin={{ top: 20, right: 0, left: -20, bottom: 25 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                              <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} 
                                dy={10} // Jarak text ke batang
                                interval={0} // Pastikan semua label muncul
                              />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}}/>
                              <Tooltip 
                                  cursor={{fill: '#f8fafc'}}
                                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                              />
                              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={60}>
                                  {distributionData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                              </Bar>
                          </BarChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-100">
                          <Activity size={48} className="mb-4 opacity-20"/>
                          <p className="text-sm font-medium">Belum ada data penilaian valid.</p>
                          <p className="text-xs mt-1">Lakukan input penilaian untuk melihat grafik.</p>
                      </div>
                  )}
              </div>
          </div>

      </div>

    </div>
  );
}