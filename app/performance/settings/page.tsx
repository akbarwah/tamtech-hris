"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient'; 
import { 
  ArrowLeft, Plus, Trash2, Save, Calendar, 
  Target, Loader2, Users, UserPlus, Lock, Unlock 
} from 'lucide-react';
import Link from 'next/link';

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
    const { data: cyc } = await supabase.from('performance_cycles').select('*').order('id', { ascending: false });
    const { data: ind } = await supabase.from('performance_indicators').select('*').order('id', { ascending: true });
    const { data: emp } = await supabase.from('employees').select('id, full_name, job_position').order('full_name');

    setCycles(cyc || []);
    setIndicators(ind || []);
    setEmployees(emp || []);
    setLoading(false);
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
    if (!newInd.indicator_name || !newInd.code) return alert("Nama dan Kode wajib diisi!");
    setIsAddingInd(true);
    const { error } = await supabase.from('performance_indicators').insert([newInd]);
    if (error) alert("Error: " + error.message);
    else { setNewInd({ ...newInd, indicator_name: '', code: '' }); fetchData(); }
    setIsAddingInd(false);
  };
  const handleDeleteIndicator = async (id: number) => {
    if(confirm("Hapus indikator ini?")) { await supabase.from('performance_indicators').delete().eq('id', id); fetchData(); }
  };

  // --- HANDLERS CYCLES (CLOSE & DELETE) ---
  const handleAddCycle = async () => {
    if (!newCycle.title) return alert("Judul wajib diisi!");
    setIsAddingCycle(true);
    const payload = { title: newCycle.title, start_date: newCycle.start_date || null, end_date: newCycle.end_date || null, status: 'Draft' };
    const { error } = await supabase.from('performance_cycles').insert([payload]);
    if (error) alert("Gagal: " + error.message);
    else { alert("Periode berhasil dibuat!"); setNewCycle({ title: '', start_date: '', end_date: '' }); fetchData(); }
    setIsAddingCycle(false);
  };
  
  // Fitur Close Cycle (Arsip)
  const handleToggleStatus = async (id: number, currentStatus: string) => {
      const newStatus = currentStatus === 'Active' ? 'Closed' : 'Active';
      await supabase.from('performance_cycles').update({ status: newStatus }).eq('id', id);
      fetchData();
  };

  // Fitur Delete Cycle (Hapus Permanen)
  const handleDeleteCycle = async (id: number) => { 
      if(confirm("PERINGATAN KERAS:\nMenghapus periode akan MENGHAPUS SEMUA NILAI RAPOR di dalamnya secara permanen.\n\nDisarankan gunakan fitur 'Close' untuk mengarsipkan.\n\nTetap hapus?")) { 
          await supabase.from('performance_cycles').delete().eq('id', id); 
          fetchData(); 
      } 
  };

  // --- HANDLERS ASSIGNMENTS (DELETE ADDED) ---
  const handleCreateAssignment = async () => {
      if(!selectedCycleId || !targetEmployeeId) return alert("Pilih Periode & Karyawan!");
      setIsSavingAssign(true);
      const inserts = [
          { cycle_id: selectedCycleId, employee_id: targetEmployeeId, reviewer_id: targetEmployeeId, relationship: 'Self' },
          ...(supervisorId ? [{ cycle_id: selectedCycleId, employee_id: targetEmployeeId, reviewer_id: supervisorId, relationship: 'Supervisor' }] : []),
          ...peerIds.map(pid => ({ cycle_id: selectedCycleId, employee_id: targetEmployeeId, reviewer_id: pid, relationship: 'Peer' })),
          ...subordinateIds.map(sid => ({ cycle_id: selectedCycleId, employee_id: targetEmployeeId, reviewer_id: sid, relationship: 'Subordinate' }))
      ];
      const { error } = await supabase.from('review_assignments').insert(inserts);
      if(error) alert(error.message); else { alert("Assignment Berhasil!"); setTargetEmployeeId(''); setSupervisorId(''); setPeerIds([]); setSubordinateIds([]); fetchAssignments(); }
      setIsSavingAssign(false);
  };

  // Fitur Delete Assignment
  const handleDeleteAssignment = async (id: number) => {
      if(confirm("Hapus assignment ini?")) {
          await supabase.from('review_assignments').delete().eq('id', id);
          fetchAssignments();
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

        <div className="bg-white rounded-xl border border-slate-200 p-1 inline-flex">
            <button onClick={() => setActiveTab('cycles')} className={`px-4 py-2 text-sm font-bold rounded-lg ${activeTab === 'cycles' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}><Calendar size={16}/> Cycles</button>
            <button onClick={() => setActiveTab('indicators')} className={`px-4 py-2 text-sm font-bold rounded-lg ${activeTab === 'indicators' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}><Target size={16}/> Indicators</button>
            <button onClick={() => setActiveTab('assignments')} className={`px-4 py-2 text-sm font-bold rounded-lg ${activeTab === 'assignments' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}><Users size={16}/> Assignments</button>
        </div>

        {/* --- TAB CYCLES --- */}
        {activeTab === 'cycles' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 h-fit">
                    <h3 className="font-bold mb-4">Buat Periode</h3>
                    <div className="space-y-4">
                        <input type="text" placeholder="Nama Periode" className="w-full p-2 border rounded-lg text-sm" value={newCycle.title} onChange={e => setNewCycle({...newCycle, title: e.target.value})}/>
                        <div className="grid grid-cols-2 gap-2"><input type="date" className="w-full p-2 border rounded-lg text-sm" value={newCycle.start_date} onChange={e => setNewCycle({...newCycle, start_date: e.target.value})}/><input type="date" className="w-full p-2 border rounded-lg text-sm" value={newCycle.end_date} onChange={e => setNewCycle({...newCycle, end_date: e.target.value})}/></div>
                        <button onClick={handleAddCycle} disabled={isAddingCycle} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm">{isAddingCycle ? 'Saving...' : 'Simpan Periode'}</button>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-3">
                    {cycles.map((c) => (
                        <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                            <div>
                                <div className="font-bold flex items-center gap-2">
                                    {c.title} 
                                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : c.status === 'Closed' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>{c.status}</span>
                                </div>
                                <div className="text-xs text-slate-500">{c.start_date || '-'} s/d {c.end_date || '-'}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Tombol Toggle Status */}
                                {c.status !== 'Closed' && (
                                    <button onClick={() => handleToggleStatus(c.id, c.status)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${c.status === 'Active' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                                        {c.status === 'Active' ? <><Lock size={12}/> Close Review</> : <><Unlock size={12}/> Activate</>}
                                    </button>
                                )}
                                {/* Tombol Delete */}
                                <button onClick={() => handleDeleteCycle(c.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- TAB INDICATORS (Sama seperti sebelumnya) --- */}
        {activeTab === 'indicators' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 h-fit sticky top-6">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><Plus size={18}/> Tambah Indikator</h3>
                    <div className="space-y-4">
                        <div><label className="text-xs font-bold text-slate-500">Kategori</label><select className="w-full p-2 border rounded-lg text-sm bg-slate-50" value={newInd.category} onChange={e => setNewInd({...newInd, category: e.target.value})}><option value="Role Expertise">Role Expertise</option><option value="Work Behavior & Execution">Work Behavior & Execution</option><option value="Responsibility & Growth Orientation">Responsibility & Growth Orientation</option><option value="Other">Other</option></select></div>
                        <div><label className="text-xs font-bold text-slate-500">Nama Indikator</label><input type="text" className="w-full p-2 border rounded-lg text-sm" value={newInd.indicator_name} onChange={e => setNewInd({...newInd, indicator_name: e.target.value})}/></div>
                        <div><label className="text-xs font-bold text-slate-500">Kode (4 Huruf)</label><input type="text" className="w-full p-2 border rounded-lg text-sm" value={newInd.code} onChange={e => setNewInd({...newInd, code: e.target.value})}/></div>
                        <button onClick={handleAddIndicator} disabled={isAddingInd} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm">{isAddingInd ? 'Saving...' : 'Simpan'}</button>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    {Object.keys(groupedIndicators).map((cat) => (
                        <div key={cat} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-4 py-3 border-b font-bold text-slate-700 text-sm">{cat}</div>
                            <div className="divide-y divide-slate-100">{groupedIndicators[cat].map((item: any) => (
                                <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                    <div><div className="font-bold text-sm text-slate-800">{item.indicator_name}</div><div className="text-xs bg-slate-100 px-1 rounded inline-block text-slate-500 mt-1">{item.code}</div></div>
                                    <button onClick={() => handleDeleteIndicator(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            ))}</div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- TAB ASSIGNMENTS (DENGAN TOMBOL DELETE) --- */}
        {activeTab === 'assignments' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                        <label className="text-xs font-bold text-slate-500">1. Pilih Periode</label>
                        <select className="w-full p-2 border rounded-lg text-sm bg-slate-50" value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)}><option value="">-- Pilih --</option>{cycles.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
                    </div>
                    {selectedCycleId && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                            <div><label className="text-xs font-bold text-slate-500">2. Reviewee</label><select className="w-full p-2 border rounded-lg text-sm" value={targetEmployeeId} onChange={e => setTargetEmployeeId(e.target.value)}><option value="">-- Pilih --</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                            <div><label className="text-xs font-bold text-slate-500">3. Supervisor</label><select className="w-full p-2 border rounded-lg text-sm" value={supervisorId} onChange={e => setSupervisorId(e.target.value)}><option value="">-- Pilih --</option>{employees.filter(e => e.id != targetEmployeeId).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                            <div><label className="text-xs font-bold text-slate-500">4. Peers</label><select className="w-full p-2 border rounded-lg text-sm" onChange={handleSelectPeer}><option value="">-- Tambah --</option>{employees.filter(e => e.id != targetEmployeeId).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select><div className="flex flex-wrap gap-1 mt-2">{peerIds.map(pid => <span key={pid} className="text-xs bg-indigo-50 px-2 py-1 rounded">{employees.find(e=>e.id==pid)?.full_name}</span>)}</div></div>
                            <div><label className="text-xs font-bold text-slate-500">5. Subordinates</label><select className="w-full p-2 border rounded-lg text-sm" onChange={handleSelectSubordinate}><option value="">-- Tambah --</option>{employees.filter(e => e.id != targetEmployeeId).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select><div className="flex flex-wrap gap-1 mt-2">{subordinateIds.map(sid => <span key={sid} className="text-xs bg-indigo-50 px-2 py-1 rounded">{employees.find(e=>e.id==sid)?.full_name}</span>)}</div></div>
                            <button onClick={handleCreateAssignment} disabled={isSavingAssign} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm mt-2">{isSavingAssign ? '...' : 'Generate Assignment'}</button>
                        </div>
                    )}
                </div>
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="font-bold mb-4">List Assignment</h3>
                    {assignments.length === 0 ? <p className="text-slate-400 text-sm">Belum ada data.</p> : 
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">Reviewee</th><th className="p-2">Reviewer</th><th className="p-2">Role</th><th className="p-2 text-right">Aksi</th></tr></thead>
                        <tbody>{assignments.map(a => (
                            <tr key={a.id} className="border-b">
                                <td className="p-2 font-bold">{a.employee?.full_name}</td>
                                <td className="p-2">{a.reviewer?.full_name}</td>
                                <td className="p-2"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{a.relationship}</span></td>
                                <td className="p-2 text-right"><button onClick={() => handleDeleteAssignment(a.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></td>
                            </tr>
                        ))}</tbody>
                    </table>}
                </div>
            </div>
        )}
    </div>
  );
}