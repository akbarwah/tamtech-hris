"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Users, AlertTriangle, TrendingDown, 
  Briefcase, Calendar, ShieldAlert, ArrowRight, Clock
} from 'lucide-react';
import Link from 'next/link';

// --- HELPER FORMAT TANGGAL (dd-MMM-yyyy) ---
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-GB', options);
};

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalActive: 0,
    totalResigned: 0,
    turnoverRate: 0,
    expiringContracts: [] as any[], 
    activeVacancies: 0,
    statusDist: { permanent: 0, contract: 0 }
  });
  const [loading, setLoading] = useState(true);

  // LOGIC: Maintenance Reminder (Hardcoded)
  const lastAcCleaning = new Date('2025-10-01'); 
  const nextAcCleaning = new Date(lastAcCleaning);
  nextAcCleaning.setMonth(nextAcCleaning.getMonth() + 4);
  const daysToCleaning = Math.ceil((nextAcCleaning.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  const isCleaningUrgent = daysToCleaning <= 7;

  useEffect(() => {
    async function fetchStrategicData() {
      setLoading(true);
      
      // 1. Fetch Employees
      const { data: empData } = await supabase
        .from('employees')
        .select('*');

      // 2. Fetch Active Vacancies
      const { count: vacancyCount } = await supabase
        .from('candidates') 
        .select('*', { count: 'exact', head: true })
        .neq('status', 'Hired')
        .neq('status', 'Rejected');

      if (empData) {
        const activeEmps = empData.filter(e => e.is_active === true);
        const resignedEmps = empData.filter(e => e.is_active === false);
        
        // Status Distribution
        let permanent = 0; 
        let contract = 0;
        activeEmps.forEach(e => {
          if (e.employment_status === 'Permanent') permanent++;
          else contract++;
        });

        // Turnover Rate
        const totalHeadcount = activeEmps.length + resignedEmps.length;
        const turnover = totalHeadcount > 0 ? ((resignedEmps.length / totalHeadcount) * 100).toFixed(1) : 0;

        // --- LOGIC ALERT KONTRAK (UPDATED) ---
        const today = new Date();
        // Reset jam ke 00:00 agar perbandingan tanggal akurat
        today.setHours(0,0,0,0); 

        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(today.getDate() + 30);

        const expiring = activeEmps.filter(e => {
          if (!e.contract_end_date) return false; // Karyawan Permanent / Tanpa Tanggal skip
          const endDate = new Date(e.contract_end_date);
          
          // Logic Baru: Tangkap yang <= H+30 (Termasuk yang SUDAH LEWAT/Expired)
          return endDate <= thirtyDaysLater;
        });

        // Sort: Yang paling parah (Expired lama) ditaruh paling atas
        expiring.sort((a, b) => new Date(a.contract_end_date).getTime() - new Date(b.contract_end_date).getTime());

        setStats({
          totalActive: activeEmps.length,
          totalResigned: resignedEmps.length,
          turnoverRate: Number(turnover),
          expiringContracts: expiring,
          activeVacancies: vacancyCount || 0,
          statusDist: { permanent, contract }
        });
      }
      
      setLoading(false);
    }

    fetchStrategicData();
  }, []);

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-enter pb-10">
      
      {/* 1. HEADER STRATEGIS */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Executive Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Key Performance Indicators & Operational Alerts.</p>
        </div>
      </div>

      {/* 2. ALERT CENTER (High Priority) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card A: Contract Alerts (Overdue & Expiring) */}
        <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
             <h3 className="font-bold text-orange-800 flex items-center gap-2">
               <AlertTriangle size={18}/> Contract Alerts
             </h3>
             <span className="bg-white text-orange-700 text-xs font-bold px-2 py-1 rounded-full border border-orange-200">
               {stats.expiringContracts.length} Action Needed
             </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[300px]">
            {stats.expiringContracts.length > 0 ? (
              <div className="divide-y divide-orange-50">
                {stats.expiringContracts.map((emp, idx) => {
                  const endDate = new Date(emp.contract_end_date);
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const isExpired = endDate < today;

                  return (
                    <div key={idx} className={`px-6 py-3 flex justify-between items-center transition-colors ${isExpired ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-orange-50'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800 text-sm">{emp.full_name}</p>
                            {isExpired && <span className="text-[10px] font-bold bg-red-200 text-red-700 px-1.5 rounded">EXPIRED</span>}
                        </div>
                        <p className={`text-xs flex items-center gap-1 ${isExpired ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                           <Clock size={12}/> {formatDate(emp.contract_end_date)}
                        </p>
                      </div>
                      <Link href={`/employees/${emp.id}`} className={`text-xs font-bold hover:underline ${isExpired ? 'text-red-600' : 'text-orange-600'}`}>
                        Review
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-sm italic h-full flex items-center justify-center">
                Semua kontrak aman. Tidak ada yang berakhir dalam 30 hari.
              </div>
            )}
          </div>
        </div>

        {/* Card B: Facility Maintenance */}
        <div className={`rounded-xl border shadow-sm overflow-hidden flex flex-col h-full ${isCleaningUrgent ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200'}`}>
           <div className={`px-6 py-4 border-b flex justify-between items-center ${isCleaningUrgent ? 'bg-red-100 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
             <h3 className={`font-bold flex items-center gap-2 ${isCleaningUrgent ? 'text-red-800' : 'text-slate-800'}`}>
               <ShieldAlert size={18}/> Facility Maintenance
             </h3>
           </div>
           <div className="p-6 flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Jadwal Cuci AC Kantor</span>
                <span className={`text-sm font-bold ${daysToCleaning < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                   {daysToCleaning < 0 ? 'OVERDUE' : `${daysToCleaning} Hari Lagi`}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1">
                <div 
                  className={`h-2.5 rounded-full ${daysToCleaning < 7 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${Math.max(0, Math.min(100, 100 - (daysToCleaning/120 * 100)))}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Next Schedule: {formatDate(nextAcCleaning.toISOString())}
              </p>
           </div>
        </div>

      </div>

      {/* 3. STRATEGIC METRICS (Turnover & Efficiency) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Turnover Rate */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingDown size={60} className="text-rose-500"/>
           </div>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Turnover Rate</p>
           <div className="flex items-end gap-2">
             <h2 className={`text-3xl font-bold ${stats.turnoverRate > 10 ? 'text-rose-600' : 'text-emerald-600'}`}>
               {stats.turnoverRate}%
             </h2>
             <span className="text-xs text-slate-400 mb-1">Year to Date</span>
           </div>
           <p className="text-xs text-slate-500 mt-3 leading-relaxed">
             {stats.turnoverRate > 10 
               ? "High turnover warning. Review retention strategy." 
               : "Healthy retention rate."}
           </p>
        </div>

        {/* Team Efficiency Proxy */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users size={60} className="text-blue-500"/>
           </div>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Active Headcount</p>
           <div className="flex items-end gap-2">
             <h2 className="text-3xl font-bold text-slate-900">{stats.totalActive}</h2>
             <span className="text-xs text-slate-400 mb-1">Employees</span>
           </div>
           <div className="mt-4 flex gap-2">
             <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded border border-emerald-100">
               {stats.statusDist.permanent} Permanent
             </span>
             <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-100">
               {stats.statusDist.contract} Contract
             </span>
           </div>
        </div>

         {/* Hiring Demand */}
         <div className="bg-indigo-900 p-6 rounded-xl border border-indigo-800 shadow-lg text-white flex flex-col justify-between">
           <div>
             <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">Hiring Demand</p>
             <h2 className="text-3xl font-bold">{stats.activeVacancies}</h2>
             <p className="text-indigo-200 text-sm">Candidates in Pipeline</p>
           </div>
           <Link href="/recruitment" className="flex items-center justify-between mt-4 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
              <span className="text-sm font-bold">Recruitment Board</span>
              <ArrowRight size={16}/>
           </Link>
        </div>

      </div>
    </div>
  );
}