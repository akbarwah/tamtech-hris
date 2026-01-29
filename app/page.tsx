"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, AlertTriangle, TrendingDown, 
  Briefcase, ArrowRight, Clock,
  Wallet, Wrench, Building2, BarChart3, Activity, Filter
} from 'lucide-react';
import Link from 'next/link';

// --- HELPER FORMATTING ---
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};
const formatIDR = (num: number) => {
  if (num >= 1000000000) return `Rp ${(num / 1000000000).toFixed(1)} M`;
  if (num >= 1000000) return `Rp ${(num / 1000000).toFixed(0)} Jt`;
  return `Rp ${num.toLocaleString('id-ID')}`;
};

export default function DashboardPage() {
  // --- STATE 1: RAW DATA (Database Mirror) ---
  const [rawData, setRawData] = useState({
    employees: [] as any[],
    jobs: [] as any[], // UBAH: Dari number jadi array, agar bisa difilter
    assets: [] as any[],
    facilities: [] as any[],
    reviews: [] as any[],
    activeCycleName: ''
  });

  // --- STATE 2: CALCULATED STATS (Display) ---
  const [stats, setStats] = useState({
    totalActive: 0,
    turnoverRate: 0,
    expiringContracts: [] as any[], 
    openPositions: 0,
    statusDist: { permanent: 0, contract: 0 },
    assetStats: { totalValue: 0, maintenanceCount: 0 },
    bellCurve: [] as any[], 
    facilities: [] as any[] 
  });

  // --- STATE 3: UI CONTROLS ---
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('All');
  const [departments, setDepartments] = useState<string[]>([]); 

  // --- FETCH DATA (RUN ONCE) ---
  useEffect(() => {
    async function initData() {
      setLoading(true);
      
      // 1. Fetch Employees
      const { data: empData } = await supabase.from('employees').select('*');

      // 2. Fetch Job Openings (Data Lengkap, bukan cuma count)
      // Kita butuh kolom 'department' untuk filtering nanti
      const { data: jobData } = await supabase.from('job_openings').select('department, status').eq('status', 'Open');
      
      // 3. Fetch Assets
      const { data: assetData } = await supabase.from('assets').select('price, status, holder'); 
      
      // 4. Fetch Facilities
      const { data: facData } = await supabase.from('facilities').select('*');

      // 5. FETCH PERFORMANCE
      let reviewsData = [] as any[];
      let cycleTitle = '';

      const { data: cycle } = await supabase.from('performance_cycles').select('*').eq('status', 'Active').single();
      if (cycle) {
          cycleTitle = cycle.title;
          const { data: reviews } = await supabase.from('performance_reviews')
            .select('normalized_score, employees:employee_id(department)')
            .eq('cycle_id', cycle.id);
          if (reviews) reviewsData = reviews;
      }

      // 6. Set RAW Data & Extract Departments
      if (empData) {
          // Ambil list unik departemen dari data employee
          const uniqueDepts = Array.from(new Set(empData.map(e => e.department).filter(Boolean))) as string[];
          setDepartments(['All', ...uniqueDepts.sort()]);

          setRawData({
              employees: empData,
              jobs: jobData || [], // Simpan array jobs
              assets: assetData || [],
              facilities: facData || [],
              reviews: reviewsData,
              activeCycleName: cycleTitle
          });
      }
      setLoading(false);
    }

    initData();
  }, []);

  // --- RE-CALCULATE STATS (RUN WHEN FILTER CHANGES) ---
  useEffect(() => {
    if (rawData.employees.length === 0 && !loading) return; // Guard clause

    // 1. FILTER EMPLOYEES
    const filteredEmps = selectedDept === 'All' 
        ? rawData.employees 
        : rawData.employees.filter(e => e.department === selectedDept);

    const activeEmps = filteredEmps.filter(e => e.is_active === true);
    const resignedEmps = filteredEmps.filter(e => e.is_active === false);

    // 2. Filter JOBS (MPP) - INI YANG BARU
    const filteredJobs = selectedDept === 'All'
        ? rawData.jobs
        : rawData.jobs.filter(j => j.department === selectedDept);

    // 3. Turnover Logic
    const totalHeadcount = activeEmps.length + resignedEmps.length;
    const turnover = totalHeadcount > 0 ? ((resignedEmps.length / totalHeadcount) * 100).toFixed(1) : 0;

    // 4. Status Distribution
    let permanent = 0; let contract = 0;
    activeEmps.forEach(e => { if (e.employment_status === 'Permanent') permanent++; else contract++; });

    // 5. Contracts Logic
    const today = new Date(); today.setHours(0,0,0,0); 
    const thirtyDaysLater = new Date(today); thirtyDaysLater.setDate(today.getDate() + 30);
    const expiring = activeEmps.filter(e => {
        if (!e.contract_end_date) return false;
        const endDate = new Date(e.contract_end_date);
        return endDate <= thirtyDaysLater;
    }).sort((a, b) => new Date(a.contract_end_date).getTime() - new Date(b.contract_end_date).getTime());

    // 6. Assets Logic (Filter by Holder Name ~ Employee Name)
    let filteredAssets = rawData.assets;
    if (selectedDept !== 'All') {
        const empNamesInDept = activeEmps.map(e => e.full_name?.toLowerCase());
        filteredAssets = rawData.assets.filter(a => 
            a.holder && empNamesInDept.includes(a.holder.toLowerCase())
        );
    }
    
    const totalAssetValue = filteredAssets.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const repairCount = filteredAssets.filter(a => a.status === 'Repair' || a.status === 'Broken').length;

    // 7. Performance Logic (Filter by Dept)
    const validReviews = rawData.reviews.filter(r => {
        const scoreValid = r.normalized_score > 0;
        const deptValid = selectedDept === 'All' || r.employees?.department === selectedDept;
        return scoreValid && deptValid;
    });

    const counts: Record<string, number> = { 'Outstanding': 0, 'Exceed': 0, 'Meet': 0, 'Under': 0, 'Poor': 0 };
    validReviews.forEach(r => {
        const s = r.normalized_score;
        if (s >= 91) counts['Outstanding']++;
        else if (s >= 76) counts['Exceed']++;
        else if (s >= 60) counts['Meet']++;
        else if (s >= 41) counts['Under']++;
        else counts['Poor']++;
    });

    const distArray = [
        { label: 'Outstanding', count: counts['Outstanding'], color: 'bg-violet-600', text: 'text-violet-700', min: 91 },
        { label: 'Exceed', count: counts['Exceed'], color: 'bg-emerald-500', text: 'text-emerald-600', min: 76 },
        { label: 'Meet', count: counts['Meet'], color: 'bg-blue-500', text: 'text-blue-600', min: 60 },
        { label: 'Under', count: counts['Under'], color: 'bg-amber-500', text: 'text-amber-600', min: 41 },
        { label: 'Poor', count: counts['Poor'], color: 'bg-red-500', text: 'text-red-600', min: 0 }
    ];

    // 8. Update Stats Display
    setStats({
        totalActive: activeEmps.length,
        turnoverRate: Number(turnover),
        expiringContracts: expiring,
        openPositions: filteredJobs.length, // SUDAH DIFILTER
        statusDist: { permanent, contract },
        assetStats: { totalValue: totalAssetValue, maintenanceCount: repairCount },
        bellCurve: distArray,
        facilities: rawData.facilities 
    });

  }, [selectedDept, rawData, loading]);


  // Logic Facility Urgent (Global)
  const lastAcCleaning = new Date('2025-10-01'); 
  const nextAcCleaning = new Date(lastAcCleaning);
  nextAcCleaning.setMonth(nextAcCleaning.getMonth() + 4);
  const daysToCleaning = Math.ceil((nextAcCleaning.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  const isCleaningUrgent = daysToCleaning <= 7;

  const urgentFacility = stats.facilities
    .filter(f => {
        const diff = new Date(f.next_maintenance).getTime() - new Date().getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        return days <= 7;
    })
    .sort((a, b) => new Date(a.next_maintenance).getTime() - new Date(b.next_maintenance).getTime())[0];

  if (loading) return (<div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>);

  return (
    <div className="space-y-8 animate-enter pb-20">
      
      {/* HEADER & FILTER BAR */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Executive Overview</h1>
           <p className="text-slate-500 text-sm mt-1">Strategic insights and operational alerts.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex items-center gap-2 px-3 border-r border-slate-200">
              <Filter size={16} className="text-slate-400"/>
              <span className="text-xs font-bold text-slate-500 uppercase">Department</span>
           </div>
           <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-sm font-bold text-indigo-600 focus:outline-none cursor-pointer pr-2"
           >
              {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
              ))}
           </select>
        </div>
      </div>

      {/* --- ROW 1: STRATEGIC METRICS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Headcount */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={80} /></div>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Headcount</p>
           <h2 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalActive}</h2>
           <div className="flex gap-2 mt-4">
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-100">{stats.statusDist.permanent} Perm</span>
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-100">{stats.statusDist.contract} Cont</span>
           </div>
        </div>

        {/* Turnover Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingDown size={80} className="text-rose-500"/></div>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Turnover Rate (YTD)</p>
           <h2 className={`text-3xl font-bold mt-1 ${Number(stats.turnoverRate) > 10 ? 'text-rose-600' : 'text-emerald-600'}`}>{stats.turnoverRate}%</h2>
           <p className="text-[10px] text-slate-400 mt-4 leading-tight">
             {selectedDept === 'All' ? "Global Rate" : `Rate for ${selectedDept}`}
           </p>
        </div>

        {/* Hiring Demand (FILTERED) */}
        <div className="bg-indigo-900 p-5 rounded-xl border border-indigo-800 shadow-lg text-white relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Briefcase size={80} /></div>
           <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider">Open Positions (MPP)</p>
           <h2 className="text-3xl font-bold mt-1">{stats.openPositions}</h2>
           <Link href="/recruitment" className="absolute bottom-5 right-5 flex items-center gap-2 text-xs font-bold text-indigo-200 hover:text-white transition-colors">Manage <ArrowRight size={14}/></Link>
        </div>

        {/* Asset Value (Filtered) */}
        <div className="bg-emerald-900 p-5 rounded-xl border border-emerald-800 shadow-lg text-white relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={80} /></div>
           <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Asset Value {selectedDept !== 'All' && '(Est)'}</p>
           <h2 className="text-2xl font-bold mt-1 truncate">{formatIDR(stats.assetStats.totalValue)}</h2>
           <Link href="/assets" className="absolute bottom-5 right-5 flex items-center gap-2 text-xs font-bold text-emerald-200 hover:text-white transition-colors">Audit <ArrowRight size={14}/></Link>
        </div>
      </div>

      {/* --- ROW 2: ALERTS & OPERATIONAL --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COL 1: ALERTS */}
        <div className="space-y-6">
             {/* Contract Alert (Filtered) */}
             <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden flex flex-col h-[280px]">
                <div className="bg-orange-50/80 px-4 py-3 border-b border-orange-100 flex justify-between items-center">
                    <h3 className="font-bold text-orange-800 text-sm flex items-center gap-2"><AlertTriangle size={16}/> Contracts Expiring</h3>
                    {stats.expiringContracts.length > 0 && <span className="bg-white text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200">{stats.expiringContracts.length}</span>}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {stats.expiringContracts.length > 0 ? (
                        <div className="divide-y divide-orange-50">
                            {stats.expiringContracts.map((emp, idx) => {
                                const isExpired = new Date(emp.contract_end_date) < new Date();
                                return (
                                    <div key={idx} className="px-4 py-3 hover:bg-orange-50/50 transition-colors">
                                        <div className="flex justify-between">
                                            <p className="font-bold text-slate-800 text-sm">{emp.full_name}</p>
                                            {isExpired && <span className="text-[10px] font-bold text-red-600 animate-pulse">EXPIRED</span>}
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10}/> {formatDate(emp.contract_end_date)}</p>
                                            <Link href="/employees" className="text-[10px] font-bold text-orange-600 hover:underline">Renew</Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : <div className="flex h-full items-center justify-center text-slate-400 text-xs italic">No alerts for {selectedDept}.</div>}
                </div>
             </div>

             {/* Facility Alert (Global) */}
             <div className={`rounded-xl border shadow-sm p-4 ${urgentFacility ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-bold text-sm flex items-center gap-2 ${urgentFacility ? 'text-red-800' : 'text-slate-800'}`}>
                        <Building2 size={16}/> Next Maintenance
                    </h3>
                    <Link href="/assets" className="text-[10px] underline opacity-70">Log</Link>
                </div>
                {urgentFacility ? (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-red-900">{urgentFacility.name}</span>
                            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">Urgent</span>
                        </div>
                        <p className="text-xs text-red-700/80">Scheduled: {formatDate(urgentFacility.next_maintenance)}</p>
                    </div>
                ) : (
                    <div className="text-center py-2">
                        <p className="text-sm font-medium text-slate-600">All facilities good.</p>
                        <p className="text-xs text-slate-400">Next check &gt; 7 days.</p>
                    </div>
                )}
             </div>
        </div>

        {/* COL 2 & 3: REAL PERFORMANCE (BELL CURVE - FILTERED) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 size={18} className="text-indigo-600"/> 
                        Performance Distribution
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 ml-6">
                        {selectedDept === 'All' ? `Global Cycle: ${rawData.activeCycleName || '-'}` : `Cycle: ${rawData.activeCycleName || '-'} (${selectedDept})`}
                    </p>
                </div>
                <Link href="/performance" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                    Details <ArrowRight size={12}/>
                </Link>
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-center gap-5">
                {stats.bellCurve.length > 0 ? (
                    stats.bellCurve.map((item) => {
                        // Hitung total data untuk persentase
                        const total = stats.bellCurve.reduce((acc, curr) => acc + curr.count, 0);
                        const percentage = total > 0 ? (item.count / total) * 100 : 0;

                        return (
                            <div key={item.label}>
                                <div className="flex justify-between items-end mb-1.5">
                                    <div>
                                        <span className={`text-sm font-bold mr-2 ${item.text}`}>{item.label}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">({'>'} {item.min})</span>
                                    </div>
                                    <span className="font-bold text-slate-700 text-sm">{item.count} <span className="text-[10px] font-normal text-slate-400">Emp</span></span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div 
                                        className={`h-3 rounded-full transition-all duration-1000 ${item.color}`} 
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Activity size={40} className="opacity-20 mb-2"/>
                        <p className="text-sm italic">Belum ada penilaian valid untuk {selectedDept}.</p>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}