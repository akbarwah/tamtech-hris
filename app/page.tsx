"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, AlertTriangle, TrendingDown, 
  Briefcase, ArrowRight, Clock,
  Wallet, Building2, BarChart3, Activity, Filter,
  FileWarning, UserPlus, Calendar, ChevronRight, Plane,
  CheckCircle2 // <--- Tambahkan ini
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
    jobs: [] as any[], 
    assets: [] as any[],
    facilities: [] as any[],
    reviews: [] as any[],
    timeOffs: [] as any[], // [NEW] Data Cuti
    activeCycleName: ''
  });

  // --- STATE 2: CALCULATED STATS (Display) ---
  const [stats, setStats] = useState({
    totalActive: 0,
    turnoverRate: 0,
    expiringContracts: [] as any[], 
    expiredContracts: [] as any[], 
    newHiresList: [] as any[], 
    openPositions: 0,
    statusDist: { permanent: 0, contract: 0 },
    assetStats: { totalValue: 0, maintenanceCount: 0 },
    bellCurve: [] as any[], 
    facilities: [] as any[],
    whoIsOffToday: [] as any[] // [NEW] List orang cuti hari ini
  });

  // --- STATE 3: UI CONTROLS ---
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('All');
  const [departments, setDepartments] = useState<string[]>([]); 
  const [greeting, setGreeting] = useState(''); 

  // --- FETCH DATA (RUN ONCE) ---
  useEffect(() => {
    async function initData() {
      setLoading(true);
      
      // 1. Fetch Employees
      const { data: empData } = await supabase.from('employees').select('*').order('join_date', { ascending: false });

      // 2. Fetch Job Openings
      const { data: jobData } = await supabase.from('job_openings').select('department, status').eq('status', 'Open');
      
      // 3. Fetch Assets
      const { data: assetData } = await supabase.from('assets').select('price, status, holder'); 
      
      // 4. Fetch Facilities
      const { data: facData } = await supabase.from('facilities').select('*');

      // 5. Fetch Time Off (Approved Only)
      // Ambil yang status Approved, tanggalnya beririsan dengan hari ini, atau future leave.
      // Untuk dashboard "Who is off today", kita filter di JS nanti.
      const { data: leaveData } = await supabase.from('time_off')
        .select('*, employees:employee_id(full_name, department, photo_url)')
        .eq('status', 'Approved');

      // 6. FETCH PERFORMANCE
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

      // 7. Set RAW Data & Extract Departments
      if (empData) {
          const uniqueDepts = Array.from(new Set(empData.map(e => e.department).filter(Boolean))) as string[];
          setDepartments(['All', ...uniqueDepts.sort()]);

          setRawData({
              employees: empData,
              jobs: jobData || [], 
              assets: assetData || [],
              facilities: facData || [],
              reviews: reviewsData,
              timeOffs: leaveData || [], // Simpan data cuti
              activeCycleName: cycleTitle
          });
      }
      setLoading(false);
    }

    initData();
    determineGreeting(); 
  }, []);

  const determineGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) setGreeting("Selamat Pagi");
    else if (hour < 15) setGreeting("Selamat Siang");
    else if (hour < 18) setGreeting("Selamat Sore");
    else setGreeting("Selamat Malam");
  };

  // --- RE-CALCULATE STATS ---
  useEffect(() => {
    if (rawData.employees.length === 0 && !loading) return; 

    // 1. FILTER EMPLOYEES
    const filteredEmps = selectedDept === 'All' 
        ? rawData.employees 
        : rawData.employees.filter(e => e.department === selectedDept);

    const activeEmps = filteredEmps.filter(e => e.is_active === true || e.is_active === 'true');
    
    // 1b. FILTER NEW HIRES 
    const recentHires = activeEmps.slice(0, 5);

    // 2. Filter JOBS (MPP)
    const filteredJobs = selectedDept === 'All'
        ? rawData.jobs
        : rawData.jobs.filter(j => j.department === selectedDept);

    // 3. Turnover Logic
    const resignedEmps = filteredEmps.filter(e => !e.is_active);
    const totalHeadcount = activeEmps.length + resignedEmps.length;
    const turnover = totalHeadcount > 0 ? ((resignedEmps.length / totalHeadcount) * 100).toFixed(1) : 0;

    // 4. Status Distribution
    let permanent = 0; let contract = 0;
    activeEmps.forEach(e => { if (e.employment_status === 'Permanent') permanent++; else contract++; });

    // 5. Contracts Logic
    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    
    const next30Days = new Date(now); 
    next30Days.setDate(now.getDate() + 30);
    next30Days.setHours(23, 59, 59, 999); 

    const allContracts = activeEmps.filter(e => e.contract_end_date); 

    const expiredList = allContracts.filter(e => {
        const end = new Date(e.contract_end_date);
        end.setHours(0,0,0,0); 
        return end < now;
    }).sort((a, b) => new Date(a.contract_end_date).getTime() - new Date(b.contract_end_date).getTime());

    const expiringList = allContracts.filter(e => {
        const end = new Date(e.contract_end_date);
        end.setHours(0,0,0,0); 
        return end >= now && end <= next30Days;
    }).sort((a, b) => new Date(a.contract_end_date).getTime() - new Date(b.contract_end_date).getTime());

    // 6. Assets Logic
    let filteredAssets = rawData.assets;
    if (selectedDept !== 'All') {
        const empNamesInDept = activeEmps.map(e => e.full_name?.toLowerCase());
        filteredAssets = rawData.assets.filter(a => 
            a.holder && empNamesInDept.includes(a.holder.toLowerCase())
        );
    }
    
    const totalAssetValue = filteredAssets.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const repairCount = filteredAssets.filter(a => a.status === 'Repair' || a.status === 'Broken').length;

    // 7. Performance Logic
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

    // 8. [NEW] WHO IS OFF TODAY LOGIC
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const whoIsOff = rawData.timeOffs.filter(l => {
        const start = l.start_date;
        const end = l.end_date;
        const isToday = todayStr >= start && todayStr <= end;
        const deptMatch = selectedDept === 'All' || l.employees?.department === selectedDept;
        return isToday && deptMatch;
    });

    setStats({
        totalActive: activeEmps.length,
        turnoverRate: Number(turnover),
        expiringContracts: expiringList, 
        expiredContracts: expiredList, 
        newHiresList: recentHires, 
        openPositions: filteredJobs.length, 
        statusDist: { permanent, contract },
        assetStats: { totalValue: totalAssetValue, maintenanceCount: repairCount },
        bellCurve: distArray,
        facilities: rawData.facilities,
        whoIsOffToday: whoIsOff // Set list cuti
    });

  }, [selectedDept, rawData, loading]);


  // Logic Facility Urgent (Global)
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
        
        <div className="flex items-center gap-3">
            {/* [NEW] INFO TODAY */}
            <div className="hidden lg:flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm mr-2">
                <div className="text-right">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{greeting}, HR</p>
                    <p className="text-xs font-bold text-slate-700">
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="h-8 w-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                    <Clock size={16} />
                </div>
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
      </div>

      {/* --- ROW 1: STRATEGIC METRICS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Headcount */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={80} /></div>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Headcount</p>
           <h2 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalActive}</h2>
           <div className="flex gap-2 mt-4">
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-100">{stats.statusDist.permanent} Perm</span>
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-100">{stats.statusDist.contract} Cont</span>
           </div>
        </div>

        {/* Turnover Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingDown size={80} className="text-rose-500"/></div>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Turnover Rate (YTD)</p>
           <h2 className={`text-3xl font-bold mt-1 ${Number(stats.turnoverRate) > 10 ? 'text-rose-600' : 'text-emerald-600'}`}>{stats.turnoverRate}%</h2>
           <p className="text-[10px] text-slate-400 mt-4 leading-tight">
             {selectedDept === 'All' ? "Global Rate" : `Rate for ${selectedDept}`}
           </p>
        </div>

        {/* Hiring Demand */}
        <div className="bg-indigo-900 p-5 rounded-xl border border-indigo-800 shadow-lg text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Briefcase size={80} /></div>
           <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider">Open Positions (MPP)</p>
           <h2 className="text-3xl font-bold mt-1">{stats.openPositions}</h2>
           <Link href="/recruitment" className="absolute bottom-5 right-5 flex items-center gap-2 text-xs font-bold text-indigo-200 hover:text-white transition-colors">Manage <ArrowRight size={14}/></Link>
        </div>

        {/* Asset Value */}
        <div className="bg-emerald-900 p-5 rounded-xl border border-emerald-800 shadow-lg text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={80} /></div>
           <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Asset Value {selectedDept !== 'All' && '(Est)'}</p>
           <h2 className="text-2xl font-bold mt-1 truncate">{formatIDR(stats.assetStats.totalValue)}</h2>
           <Link href="/assets" className="absolute bottom-5 right-5 flex items-center gap-2 text-xs font-bold text-emerald-200 hover:text-white transition-colors">Audit <ArrowRight size={14}/></Link>
        </div>
      </div>

      {/* --- ROW 2: DETAILS GRID (3 COLUMNS) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        
        {/* COL 1: ALERTS & OPERATIONAL (Contract + Facility + [NEW] Who's Off) */}
        <div className="space-y-6 flex flex-col h-full">
            
             {/* [NEW] WIDGET: WHO IS OFF TODAY */}
             <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden flex flex-col max-h-[220px]">
                 <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2"><Plane size={16} className="text-blue-500"/> Who's Off Today?</h3>
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.whoIsOffToday.length}</span>
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                     {stats.whoIsOffToday.length > 0 ? (
                         stats.whoIsOffToday.map((leave, idx) => (
                             <div key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                 <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                     {leave.employees?.photo_url ? <img src={leave.employees.photo_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">{leave.employees?.full_name[0]}</div>}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <p className="text-xs font-bold text-slate-800 truncate">{leave.employees?.full_name}</p>
                                     <p className="text-[10px] text-slate-500 truncate">{leave.type} • Returns {formatDate(leave.end_date)}</p>
                                 </div>
                             </div>
                         ))
                     ) : (
                         <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs italic py-4">
                             <CheckCircle2 size={24} className="opacity-20 mb-1"/>
                             Everyone is working today.
                         </div>
                     )}
                 </div>
             </div>

             {/* Contract Alert */}
             <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden flex flex-col h-[280px]">
                <div className="bg-orange-50/80 px-4 py-3 border-b border-orange-100 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-orange-800 text-sm flex items-center gap-2"><AlertTriangle size={16}/> Contract Alerts</h3>
                    <div className="flex gap-2">
                        {stats.expiredContracts.length > 0 && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{stats.expiredContracts.length} Expired</span>}
                        {stats.expiringContracts.length > 0 && <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200">{stats.expiringContracts.length} Soon</span>}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {stats.expiredContracts.length > 0 || stats.expiringContracts.length > 0 ? (
                        <div className="divide-y divide-orange-50">
                            {/* EXPIRED FIRST (RED ALERT) */}
                            {stats.expiredContracts.map((emp, idx) => (
                                <div key={`exp-${idx}`} className="px-4 py-3 bg-red-50/50 hover:bg-red-50 transition-colors border-l-4 border-red-500">
                                    <div className="flex justify-between">
                                        <p className="font-bold text-slate-800 text-sm">{emp.full_name}</p>
                                        <span className="text-[10px] font-bold text-red-600">EXPIRED</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-xs text-slate-500 flex items-center gap-1"><FileWarning size={10} className="text-red-400"/> {formatDate(emp.contract_end_date)}</p>
                                        <Link href="/history" className="text-[10px] font-bold text-red-600 hover:underline">Action Needed</Link>
                                    </div>
                                </div>
                            ))}

                            {/* EXPIRING SOON (ORANGE ALERT) */}
                            {stats.expiringContracts.map((emp, idx) => (
                                <div key={`soon-${idx}`} className="px-4 py-3 hover:bg-orange-50/50 transition-colors">
                                    <div className="flex justify-between">
                                        <p className="font-bold text-slate-800 text-sm">{emp.full_name}</p>
                                        <span className="text-[10px] font-bold text-orange-600">{Math.ceil((new Date(emp.contract_end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} Days left</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10}/> {formatDate(emp.contract_end_date)}</p>
                                        <Link href="/history" className="text-[10px] font-bold text-orange-600 hover:underline">Renew</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <div className="flex h-full items-center justify-center text-slate-400 text-xs italic">All contracts are healthy.</div>}
                </div>
             </div>

             {/* Facility Alert (Compact) */}
             <div className={`rounded-xl border shadow-sm p-4 ${urgentFacility ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-bold text-sm flex items-center gap-2 ${urgentFacility ? 'text-red-800' : 'text-slate-800'}`}>
                        <Building2 size={16}/> Next Facility Maint.
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

        {/* COL 2: NEW HIRES */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus size={18} className="text-emerald-600"/> Newest Employees
                </h3>
                <Link href="/employees" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                    View All <ChevronRight size={12}/>
                </Link>
            </div>
            
            <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
                {stats.newHiresList.length > 0 ? stats.newHiresList.map((emp, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                             {emp.photo_url ? <img src={emp.photo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-xs">{emp.full_name[0]}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{emp.full_name}</h4>
                            <p className="text-xs text-slate-500 truncate">{emp.job_position}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="block text-[10px] font-bold text-slate-400">JOINED</span>
                            <span className="text-xs font-medium text-emerald-600">{new Date(emp.join_date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})}</span>
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400 text-sm italic">
                        <UserPlus size={24} className="opacity-20 mb-2"/>
                        Belum ada karyawan baru.
                    </div>
                )}
            </div>
        </div>

        {/* COL 3: PERFORMANCE DISTRIBUTION */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 size={18} className="text-indigo-600"/> 
                        Performance
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 ml-6">
                        {selectedDept === 'All' ? `Global Cycle: ${rawData.activeCycleName || '-'}` : `Cycle: ${rawData.activeCycleName || '-'} (${selectedDept})`}
                    </p>
                </div>
                <Link href="/performance" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                    Details <ArrowRight size={12}/>
                </Link>
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-center gap-4">
                {stats.bellCurve.length > 0 ? (
                    stats.bellCurve.map((item) => {
                        const total = stats.bellCurve.reduce((acc, curr) => acc + curr.count, 0);
                        const percentage = total > 0 ? (item.count / total) * 100 : 0;

                        return (
                            <div key={item.label}>
                                <div className="flex justify-between items-end mb-1">
                                    <div>
                                        <span className={`text-xs font-bold mr-2 ${item.text}`}>{item.label}</span>
                                        <span className="text-[9px] text-slate-400 font-medium">({'>'} {item.min})</span>
                                    </div>
                                    <span className="font-bold text-slate-700 text-xs">{item.count}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                    <div 
                                        className={`h-2.5 rounded-full transition-all duration-1000 ${item.color}`} 
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Activity size={40} className="opacity-20 mb-2"/>
                        <p className="text-sm italic">Belum ada penilaian valid.</p>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}