"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient'; 
import { 
  ArrowLeft, Plus, Trash2, Save, Calendar, 
  Target, Loader2, Users, Lock, Unlock 
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner'; // 1. IMPORT TOAST

export default function PerformanceSettingsPage() {
  const [activeTab, setActiveTab] = useState<'indicators' | 'cycles' | 'assignments'>('cycles');
  const [loading, setLoading] = useState(true);

  // Data States
  const [indicators, setIndicators] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Form States
  const [newInd, setNewInd] = useState({ category: 'Role Expertise', indicator_name: '', code: '' });
  const [newCycle, setNewCycle] = useState({ title: '', start_date: '', end_date: '' });
  
  // Assignment States
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>('');
  const [supervisorId, setSupervisorId] = useState<string>('');
  const [peerIds, setPeerIds] = useState<string[]>([]);
  const [subordinateIds, setSubordinateIds] = useState<string[]>([]);
  
  // Loading States
  const [isAddingInd, setIsAddingInd] = useState(false);
  const [isAddingCycle, setIsAddingCycle] = useState(false);
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: cyc } = await supabase.from('performance_cycles').select('*').order('id', { ascending: false });
        const { data: ind } = await supabase.from('performance_indicators').select('*').order('id', { ascending: true });
        const { data: emp } = await supabase.from('employees').select('id, full_name, job_position').order('full_name');

        setCycles(cyc || []);
        setIndicators(ind || []);
        setEmployees(emp || []);
    } catch (err) {
        toast.error("Gagal memuat data pengaturan.");
    } finally {
        setLoading(false);
    }
  };

  const fetchAssignments = async () => {
      if(!selectedCycleId) return;
      const { data } = await supabase
        .from('review_assignments')
        .select(`*, employee:employees!employee_id(full_name), reviewer:employees!reviewer_id(full_name)`)
        .eq('cycle_id', selectedCycleId);
      setAssignments(data || []);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchAssignments(); }, [selectedCycleId]);

  // --- HANDLERS INDICATORS ---
  const handleAddIndicator = async () => {
    if (!newInd.indicator_name || !newInd.code) return toast.warning("Nama dan Kode wajib diisi!");
    setIsAddingInd(true);
    
    const promise = new Promise(async (resolve, reject) => {
        const { error } = await supabase.from('performance_indicators').insert([newInd]);
        if (error) reject(error.message);
        else {
            setNewInd({ ...newInd, indicator_name: '', code: '' });
            fetchData();
            resolve("Indikator ditambahkan");
        }
    });

    toast.promise(promise, {
        loading: 'Menambah indikator...',
        success: (msg) => `${msg}`,
        error: (err) => `Gagal: ${err}`
    });
    setIsAddingInd(false);
  };

  const handleDeleteIndicator = async (id: number) => {
    if(confirm("Hapus indikator ini?")) { 
        await supabase.from('performance_indicators').delete().eq('id', id); 
        fetchData(); 
        toast.success("Indikator dihapus");
    }
  };

  // --- HANDLERS CYCLES (CLOSE & DELETE) ---
  const handleAddCycle = async () => {
    if (!newCycle.title) return toast.warning("Judul wajib diisi!");
    setIsAddingCycle(true);
    
    const promise = new Promise(async (resolve, reject) => {
        const payload = { title: newCycle.title, start_date: newCycle.start_date || null, end_date: newCycle.end_date || null, status: 'Draft' };
        const { error } = await supabase.from('performance_cycles').insert([payload]);
        if (error) reject(error.message);
        else {
            setNewCycle({ title: '', start_date: '', end_date: '' });
            fetchData();
            resolve("Periode berhasil dibuat!");
        }
    });

    toast.promise(promise, {
        loading: 'Menyimpan periode...',
        success: (msg) => `${msg}`,
        error: (err) => `Gagal: ${err}`
    });
    setIsAddingCycle(false);
  };
  
  const handleToggleStatus = async (id: number, currentStatus: string) => {
      const newStatus = currentStatus === 'Active' ? 'Closed' : 'Active';
      await supabase.from('performance_cycles').update({ status: newStatus }).eq('id', id);
      fetchData();
      toast.success(`Status periode diubah menjadi: ${newStatus}`);
  };

  const handleDeleteCycle = async (id: number) => { 
      if(confirm("PERINGATAN KERAS:\nMenghapus periode akan MENGHAPUS SEMUA NILAI RAPOR di dalamnya secara permanen.\n\nDisarankan gunakan fitur 'Close' untuk mengarsipkan.\n\nTetap hapus?")) { 
          const { error } = await supabase.from('performance_cycles').delete().eq('id', id); 
          if (!error) {
              fetchData(); 
              toast.success("Periode dihapus permanen.");
          } else {
              toast.error("Gagal menghapus periode.");
          }
      } 
  };

  // --- HANDLERS ASSIGNMENTS ---
  const handleCreateAssignment = async () => {
      if(!selectedCycleId || !targetEmployeeId) return toast.warning("Pilih Periode & Karyawan!");
      setIsSavingAssign(true);
      
      const promise = new Promise(async (resolve, reject) => {
          const inserts = [
              { cycle_id: selectedCycleId, employee_id: targetEmployeeId, reviewer_id: targetEmployeeId, relationship: 'Self' },
              ...(supervisorId ? [{ cycle_id: selectedCycleId, employee_id: targetEmployeeId, reviewer_id: supervisorId, relationship: 'Supervisor' }] : []),
              ...peerIds.map(pid => ({ cycle_id: selectedCycleId, employee_id: targetEmployeeId, reviewer_id: pid, relationship: 'Peer' })),
              ...subordinateIds.map(sid => ({ cycle_id: selectedCycleId, employee_id: targetEmployeeId, reviewer_id: sid, relationship: 'Subordinate' }))
          ];
          const { error } = await supabase.from('review_assignments').insert(inserts);
          if(error) reject(error.message); 
          else {
              setTargetEmployeeId(''); setSupervisorId(''); setPeerIds([]); setSubordinateIds([]); 
              fetchAssignments();
              resolve("Assignment Berhasil!");
          }
      });

      toast.promise(promise, {
          loading: 'Membuat assignment...',
          success: (msg) => `${msg}`,
          error: (err) => `Gagal: ${err}`
      });
      setIsSavingAssign(false);
  };

  const handleDeleteAssignment = async (id: number) => {
      if(confirm("Hapus assignment ini?")) {
          await supabase.from('review_assignments').delete().eq('id', id);
          fetchAssignments();
          toast.success("Assignment dihapus");
      }
  };

  const handleSelectPeer = (e: any) => { if (e.target.value && !peerIds.includes(e.target.value)) setPeerIds([...peerIds, e.target.value]); };
  const handleSelectSubordinate = (e: any) => { if (e.target.value && !subordinateIds.includes(e.target.value)) setSubordinateIds([...subordinateIds, e.target.value]); };

  const groupedIndicators = indicators.reduce((acc: any, curr) => {
    (acc[curr.category] = acc[curr.category] || []).push(curr);
    return acc;
  }, {});

  return (
    <div className="min-h-screen pb-20 animate-enter space-y-6">
        <div className="flex items-center gap-4">
            <Link href="/performance" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"><ArrowLeft size={20}/></Link>
            <div><h1 className="text-2xl font-bold text-slate-900">Performance Settings</h1></div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-1 inline-flex shadow-sm">
            <button onClick={() => setActiveTab('cycles')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'cycles' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><Calendar size={16} className="inline mr-2"/> Cycles</button>
            <button onClick={() => setActiveTab('indicators')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'indicators' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><Target size={16} className="inline mr-2"/> Indicators</button>
            <button onClick={() => setActiveTab('assignments')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'assignments' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><Users size={16} className="inline mr-2"/> Assignments</button>
        </div>

        {/* --- TAB CYCLES --- */}
        {activeTab === 'cycles' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 h-fit shadow-sm">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800"><Plus size={18}/> Buat Periode</h3>
                    <div className="space-y-4">
                        <input type="text" placeholder="Nama Periode (e.g. Q1 2026)" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={newCycle.title} onChange={e => setNewCycle({...newCycle, title: e.target.value})}/>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={newCycle.start_date} onChange={e => setNewCycle({...newCycle, start_date: e.target.value})}/>
                            <input type="date" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={newCycle.end_date} onChange={e => setNewCycle({...newCycle, end_date: e.target.value})}/>
                        </div>
                        <button onClick={handleAddCycle} disabled={isAddingCycle} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2">
                            {isAddingCycle ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan Periode
                        </button>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-3">
                    {cycles.map((c) => (
                        <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm hover:border-indigo-200 transition-colors">
                            <div>
                                <div className="font-bold flex items-center gap-2 text-slate-800">
                                    {c.title} 
                                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wide ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : c.status === 'Closed' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>{c.status}</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Calendar size={12}/> {c.start_date || '-'} s/d {c.end_date || '-'}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                {c.status !== 'Closed' && (
                                    <button onClick={() => handleToggleStatus(c.id, c.status)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${c.status === 'Active' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200' : 'bg-emerald-600 text-white hover:bg-emerald-700 border border-transparent'}`}>
                                        {c.status === 'Active' ? <><Lock size={12}/> Close</> : <><Unlock size={12}/> Activate</>}
                                    </button>
                                )}
                                <button onClick={() => handleDeleteCycle(c.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Hapus Permanen"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- TAB INDICATORS --- */}
        {activeTab === 'indicators' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 h-fit sticky top-6 shadow-sm">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800"><Plus size={18}/> Tambah Indikator</h3>
                    <div className="space-y-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Kategori</label><select className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={newInd.category} onChange={e => setNewInd({...newInd, category: e.target.value})}><option value="Role Expertise">Role Expertise</option><option value="Work Behavior & Execution">Work Behavior & Execution</option><option value="Responsibility & Growth Orientation">Responsibility & Growth Orientation</option><option value="Other">Other</option></select></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Nama Indikator</label><input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={newInd.indicator_name} onChange={e => setNewInd({...newInd, indicator_name: e.target.value})}/></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Kode (4 Huruf)</label><input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono uppercase" placeholder="EX: ROLE" value={newInd.code} onChange={e => setNewInd({...newInd, code: e.target.value})}/></div>
                        <button onClick={handleAddIndicator} disabled={isAddingInd} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2">
                            {isAddingInd ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan
                        </button>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    {Object.keys(groupedIndicators).map((cat) => (
                        <div key={cat} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-4 py-3 border-b font-bold text-slate-700 text-sm uppercase tracking-wider">{cat}</div>
                            <div className="divide-y divide-slate-100">{groupedIndicators[cat].map((item: any) => (
                                <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <div>
                                        <div className="font-bold text-sm text-slate-800">{item.indicator_name}</div>
                                        <div className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded inline-block text-slate-500 mt-1 font-mono border border-slate-200">{item.code}</div>
                                    </div>
                                    <button onClick={() => handleDeleteIndicator(item.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            ))}</div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- TAB ASSIGNMENTS --- */}
        {activeTab === 'assignments' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <label className="text-xs font-bold text-slate-500 uppercase">1. Pilih Periode</label>
                        <select className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 mt-1 font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)}><option value="">-- Pilih --</option>{cycles.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
                    </div>
                    {selectedCycleId && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase">2. Reviewee (Dinilai)</label><select className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={targetEmployeeId} onChange={e => setTargetEmployeeId(e.target.value)}><option value="">-- Pilih --</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">3. Supervisor (Atasan)</label><select className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" value={supervisorId} onChange={e => setSupervisorId(e.target.value)}><option value="">-- Pilih --</option>{employees.filter(e => e.id != targetEmployeeId).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">4. Peers (Rekan)</label>
                                <select className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" onChange={handleSelectPeer}><option value="">-- Tambah --</option>{employees.filter(e => e.id != targetEmployeeId).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select>
                                <div className="flex flex-wrap gap-1 mt-2">{peerIds.map(pid => <span key={pid} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-full">{employees.find(e=>e.id==pid)?.full_name}</span>)}</div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">5. Subordinates (Bawahan)</label>
                                <select className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" onChange={handleSelectSubordinate}><option value="">-- Tambah --</option>{employees.filter(e => e.id != targetEmployeeId).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select>
                                <div className="flex flex-wrap gap-1 mt-2">{subordinateIds.map(sid => <span key={sid} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-full">{employees.find(e=>e.id==sid)?.full_name}</span>)}</div>
                            </div>
                            <button onClick={handleCreateAssignment} disabled={isSavingAssign} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md mt-2 flex justify-center items-center gap-2">
                                {isSavingAssign ? <Loader2 size={16} className="animate-spin"/> : <Users size={16}/>} Generate Assignment
                            </button>
                        </div>
                    )}
                </div>
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm min-h-[400px]">
                    <h3 className="font-bold mb-4 text-slate-800 border-b pb-2">List Assignment</h3>
                    {assignments.length === 0 ? <p className="text-slate-400 text-sm text-center py-10">Belum ada assignment untuk periode ini.</p> : 
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="p-3 rounded-l-lg">Reviewee</th><th className="p-3">Reviewer</th><th className="p-3">Role</th><th className="p-3 text-right rounded-r-lg">Aksi</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {assignments.map(a => (
                                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-bold text-slate-800">{a.employee?.full_name}</td>
                                    <td className="p-3 text-slate-600">{a.reviewer?.full_name}</td>
                                    <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${a.relationship === 'Self' ? 'bg-blue-50 text-blue-700 border-blue-100' : a.relationship === 'Supervisor' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>{a.relationship}</span></td>
                                    <td className="p-3 text-right"><button onClick={() => handleDeleteAssignment(a.id)} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors"><Trash2 size={14}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>}                </div>
            </div>
        )}
    </div>
  );
}