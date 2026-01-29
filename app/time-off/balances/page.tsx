"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom'; // IMPORT PENTING UNTUK PORTAL
import { supabase } from '@/lib/supabaseClient';
import { 
  CheckCircle2, Clock, XCircle, Search, Filter, X, History, ArrowUpDown, Loader2 
} from 'lucide-react';
import Link from 'next/link';

// --- KOMPONEN PORTAL (SOLUSI POSISI MODAL) ---
const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Matikan scroll pada body saat modal muncul
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!mounted) return null;

  // "Teleportasi" content ke tag <body>
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {children}
    </div>,
    document.body
  );
};

export default function LeaveBalancesPage() {
  const [balances, setBalances] = useState<any[]>([]);
  const [filteredBalances, setFilteredBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchName, setSearchName] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortKey, setSortKey] = useState('remaining'); 

  // History Modal States
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  // --- FETCH & CALCULATE ---
  const fetchData = async () => {
    setLoading(true);
    // 1. Get Employees
    const { data: empData } = await supabase
      .from('employees')
      .select('id, full_name, join_date, job_position, department')
      .eq('is_active', true)
      .order('full_name');

    // 2. Get All Requests
    const { data: reqData } = await supabase
      .from('time_off')
      .select('*');

    if (empData && reqData) {
        const calc = empData.map(emp => {
            // Eligibility Logic
            let status = 'Not Eligible';
            let quota = 0;
            if (emp.join_date) {
                const joinDate = new Date(emp.join_date);
                const today = new Date();
                const diffMonths = Math.ceil(Math.abs(today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                
                if (diffMonths >= 12) {
                    const eligDate = new Date(joinDate);
                    eligDate.setFullYear(eligDate.getFullYear() + 1);
                    if (eligDate.getFullYear() === today.getFullYear()) {
                        status = 'Pro-rata';
                        quota = Math.max(0, 12 - eligDate.getMonth());
                    } else {
                        status = 'Eligible';
                        quota = 12;
                    }
                }
            }

            // Usage Logic
            const used = reqData
                .filter(r => r.employee_id === emp.id && r.type === 'Annual Leave' && r.status === 'Approved')
                .reduce((acc, curr) => acc + (curr.days_taken || 0), 0);
            
            const pending = reqData
                .filter(r => r.employee_id === emp.id && r.type === 'Annual Leave' && r.status === 'Pending')
                .reduce((acc, curr) => acc + (curr.days_taken || 0), 0);

            return { ...emp, status, quota, used, pending, remaining: quota - used - pending };
        });
        setBalances(calc);
        setFilteredBalances(calc);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- FILTER EFFECT ---
  useEffect(() => {
      let temp = [...balances];

      if (searchName) {
          temp = temp.filter(e => e.full_name.toLowerCase().includes(searchName.toLowerCase()));
      }
      if (filterStatus !== 'All') {
          temp = temp.filter(e => e.status === filterStatus);
      }
      temp.sort((a, b) => {
          if (sortKey === 'name') return a.full_name.localeCompare(b.full_name);
          if (sortKey === 'quota') return b.quota - a.quota;
          return a.remaining - b.remaining; 
      });

      setFilteredBalances(temp);
  }, [searchName, filterStatus, sortKey, balances]);


  // --- VIEW HISTORY ---
  const openHistory = async (emp: any) => {
      setSelectedEmp(emp);
      setIsHistoryOpen(true); // Buka modal dulu biar responsif
      
      // Fetch fresh history
      const { data } = await supabase
        .from('time_off')
        .select('*')
        .eq('employee_id', emp.id)
        .order('created_at', { ascending: false });
      
      setHistoryLogs(data || []);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Approved') return <span className="text-emerald-600 font-bold text-xs">Approved</span>;
    if (status === 'Rejected') return <span className="text-red-600 font-bold text-xs">Rejected</span>;
    return <span className="text-amber-600 font-bold text-xs">Pending</span>;
  };

  return (
    <div className="space-y-6 animate-enter pb-20 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Balances</h1>
          <p className="text-slate-500 text-sm">Employee eligibility and annual leave quota.</p>
        </div>
        <Link href="/time-off/requests" className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
            Go to Requests Queue
        </Link>
      </div>

      {/* FILTERS BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 w-full">
              <Search size={18} className="text-slate-400"/>
              <input 
                placeholder="Search employee name..." 
                className="bg-transparent outline-none text-sm w-full"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
              />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  <Filter size={16} className="text-slate-400"/>
                  <select 
                    className="bg-transparent outline-none text-sm font-medium text-slate-600 cursor-pointer"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                  >
                      <option value="All">All Status</option>
                      <option value="Eligible">Eligible</option>
                      <option value="Pro-rata">Pro-rata</option>
                      <option value="Not Eligible">Not Eligible</option>
                  </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  <ArrowUpDown size={16} className="text-slate-400"/>
                  <select 
                    className="bg-transparent outline-none text-sm font-medium text-slate-600 cursor-pointer"
                    value={sortKey}
                    onChange={e => setSortKey(e.target.value)}
                  >
                      <option value="remaining">Sort by Remaining</option>
                      <option value="quota">Sort by Quota</option>
                      <option value="name">Sort by Name</option>
                  </select>
              </div>
          </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-300"/></div>
        ) : (
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th className="px-6 py-4 font-semibold text-slate-700">Employee</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Join Date</th>
                    <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                    <th className="px-6 py-4 font-semibold text-center text-slate-700">Quota</th>
                    <th className="px-6 py-4 font-semibold text-center text-slate-700">Used</th>
                    <th className="px-6 py-4 font-semibold text-center text-slate-700">Remaining</th>
                    <th className="px-6 py-4 text-right">History</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {filteredBalances.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => openHistory(emp)}>
                    <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{emp.full_name}</div>
                        <div className="text-xs text-slate-500">{emp.job_position}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                        {emp.join_date ? new Date(emp.join_date).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${emp.status === 'Not Eligible' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                            {emp.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">{emp.quota}</td>
                    <td className="px-6 py-4 text-center font-bold text-amber-600">{emp.used}</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${emp.remaining > 3 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                            {emp.remaining}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-colors">
                            <History size={18}/>
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
        )}
      </div>

      {/* --- HISTORY MODAL VIA PORTAL (SOLUSI SCROLLING) --- */}
      {isHistoryOpen && selectedEmp && (
          <ModalPortal>
             {/* Backdrop (Inside Portal) */}
             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsHistoryOpen(false)} />
             
             {/* Content (Inside Portal) */}
             <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 animate-enter flex flex-col max-h-[85vh]">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div>
                        <h3 className="font-bold text-xl text-slate-900">{selectedEmp.full_name}</h3>
                        <p className="text-slate-500 text-sm">Riwayat Pengajuan Cuti</p>
                    </div>
                    <button onClick={() => setIsHistoryOpen(false)}><X size={24} className="text-slate-400 hover:text-red-500" /></button>
                </div>
                
                {/* Stats Header */}
                <div className="p-6 grid grid-cols-3 gap-4 border-b border-slate-100 bg-white">
                    <div className="bg-slate-50 p-3 rounded-xl text-center">
                        <p className="text-xs font-bold text-slate-500 uppercase">Quota</p>
                        <p className="text-2xl font-bold text-slate-800">{selectedEmp.quota}</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl text-center">
                        <p className="text-xs font-bold text-amber-600 uppercase">Used</p>
                        <p className="text-2xl font-bold text-amber-700">{selectedEmp.used}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl text-center">
                        <p className="text-xs font-bold text-blue-600 uppercase">Remaining</p>
                        <p className="text-2xl font-bold text-blue-700">{selectedEmp.remaining}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white sticky top-0 z-10 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase">Date</th>
                                <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase">Type</th>
                                <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase">Days</th>
                                <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase">Status</th>
                            </tr>
                        </thead>
<tbody className="divide-y divide-slate-50">
    {historyLogs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">Tidak ada history.</td></tr>}
    {historyLogs.map(log => (
        <tr key={log.id} className="hover:bg-slate-50">
            {/* UPDATE DI SINI: Menampilkan Range Tanggal */}
            <td className="px-6 py-3 text-slate-600 text-xs">
                <div className="font-medium text-slate-700">
                    {new Date(log.start_date).toLocaleDateString('id-ID')}
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5">
                    s/d {new Date(log.end_date).toLocaleDateString('id-ID')}
                </div>
            </td>
            
            <td className="px-6 py-3 text-slate-900 font-medium">{log.type}</td>
            <td className="px-6 py-3 text-slate-600 font-bold">{log.days_taken} Hari</td>
            <td className="px-6 py-3">{getStatusBadge(log.status)}</td>
        </tr>
    ))}
</tbody>
                    </table>
                </div>
             </div>
          </ModalPortal>
      )}
    </div>
  );
}