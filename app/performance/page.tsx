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
import { toast } from 'sonner';

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
    try {
        setLoading(true);
        
        // 1. Get Active Cycle
        const { data: cycle } = await supabase.from('performance_cycles').select('*').eq('status', 'Active').single(); 
        setActiveCycle(cycle);

        // 2. Get Total Employees
        const { count: totalEmp } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true);
        
        if (cycle) {
            // 3. Get Reviews
            const { data: reviews } = await supabase
                .from('performance_reviews')
                .select('normalized_score') 
                .eq('cycle_id', cycle.id);
            
            const allReviews = reviews || [];
            
            // --- FIX: Hanya hitung sebagai "Submitted" jika skornya > 0 ---
            const scoredReviews = allReviews.filter(r => r.normalized_score > 0);
            const submittedCount = scoredReviews.length; 
            
            // Calculate Average
            const totalScore = scoredReviews.reduce((acc, curr) => acc + curr.normalized_score, 0);
            const avg = submittedCount > 0 ? (totalScore / submittedCount).toFixed(1) : 0;

            setStats({ 
                totalEmployees: totalEmp || 0, 
                reviewedCount: submittedCount, // Sekarang menampilkan 40 (bukan 66)
                avgScore: Number(avg) 
            });

            processDistribution(scoredReviews);
        } else {
            setStats({ totalEmployees: totalEmp || 0, reviewedCount: 0, avgScore: 0 });
        }
    } catch (error: any) {
        console.error("Dashboard Error:", error);
    } finally {
        setLoading(false);
    }
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
          { name: 'Outstanding', count: counts['Outstanding'], color: '#7c3aed' },
          { name: 'Exceed', count: counts['Exceed'], color: '#10b981' }, 
          { name: 'Meet', count: counts['Meet'], color: '#3b82f6' }, 
          { name: 'Under', count: counts['Under'], color: '#f59e0b' },
          { name: 'Poor', count: counts['Poor'], color: '#ef4444' } 
      ];
      setDistributionData(data);
  };

  return (
    <div className="min-h-screen animate-enter space-y-6 pb-20"> 
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Performance Dashboard</h1>
        <p className="text-slate-500 text-sm">Overview of company performance and appraisal progress.</p>
      </div>

      {activeCycle ? (
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                      <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 flex items-center gap-1 animate-pulse uppercase tracking-wider">
                          <Activity size={10}/> ACTIVE PERIOD
                      </span>
                  </div>
                  <h2 className="text-2xl font-bold mb-1">{activeCycle.title}</h2>
                  <p className="opacity-90 text-xs flex items-center gap-2 font-medium">
                      <Calendar size={14}/> {activeCycle.start_date || '?'} to {activeCycle.end_date || '?'}
                  </p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl border border-white/10 min-w-[240px] backdrop-blur-sm">
                  <div className="flex justify-between items-end mb-1">
                      <div className="text-[10px] opacity-80 font-bold uppercase tracking-wider">Submission Progress</div>
                      <div className="text-xl font-bold">
                          {stats.reviewedCount} <span className="text-xs opacity-60 font-normal">/ {stats.totalEmployees}</span>
                      </div>
                  </div>
                  <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden mb-1">
                      <div className="bg-emerald-400 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
                           style={{ width: `${stats.totalEmployees > 0 ? (stats.reviewedCount / stats.totalEmployees) * 100 : 0}%` }}>
                      </div>
                  </div>
                  <div className="text-[10px] opacity-60 text-right">*Based on completed reviews</div>
              </div>
          </div>
      ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 text-amber-800">
              <AlertCircle size={32}/>
              <div><h3 className="font-bold text-lg">No Active Period</h3><p className="text-sm opacity-80">Please create a new cycle.</p></div>
              <Link href="/performance/settings" className="px-6 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold text-sm">Create Cycle</Link>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4"> 
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Trophy size={24}/></div>
                  <div><div className="text-slate-500 text-[10px] font-bold uppercase">Avg Score</div><div className="text-2xl font-bold text-slate-800">{stats.avgScore} <span className="text-xs text-slate-400 font-normal">/ 100</span></div></div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center"><Users size={24}/></div>
                  <div><div className="text-slate-500 text-[10px] font-bold uppercase">Headcount</div><div className="text-2xl font-bold text-slate-800">{stats.totalEmployees}</div></div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-3 text-sm">Quick Actions</h4>
                  <div className="space-y-1">
                      <Link href="/performance/input" className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg group"><span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 flex items-center gap-3"><FileText size={16}/> Input Review</span><ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-600"/></Link>
                      <Link href="/performance/results" className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg group"><span className="text-xs font-bold text-slate-600 group-hover:text-emerald-600 flex items-center gap-3"><UserCheck size={16}/> View Report</span><ArrowRight size={14} className="text-slate-300 group-hover:text-emerald-600"/></Link>
                      <Link href="/performance/settings" className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg group"><span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 flex items-center gap-3"><Settings size={16}/> Configuration</span><ArrowRight size={14} className="text-slate-300 group-hover:text-slate-900"/></Link>
                  </div>
              </div>
          </div>
          <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
              <div className="mb-6"><h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><Target size={18}/> Performance Distribution</h3><p className="text-xs text-slate-500">Distribution of completed reviews.</p></div>
              <div className="flex-1 w-full">
                  {loading ? <div className="h-full flex items-center justify-center text-slate-400 text-sm">Loading...</div> : stats.reviewedCount > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={distributionData} margin={{ top: 20, right: 0, left: -20, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} dy={10} interval={0} /><YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}}/><Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', fontSize: '12px'}}/><Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={50}>{distributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Bar>
                          </BarChart>
                      </ResponsiveContainer>
                  ) : <div className="h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-100"><Activity size={40} className="mb-3 opacity-20"/><p className="text-sm font-medium text-slate-400">No data yet.</p></div>}
              </div>
          </div>
      </div>
    </div>
  );
}