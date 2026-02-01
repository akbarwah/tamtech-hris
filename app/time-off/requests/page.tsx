"use client";

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom'; 
import { supabase } from '@/lib/supabaseClient'; 
import { 
  Calendar, CheckCircle2, Clock, XCircle, Plus, Loader2, X, 
  Pencil, Trash2, ChevronDown, User, Save 
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function TimeOffRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    const { data: reqData, error } = await supabase
      .from('time_off')
      .select('*, employees:employee_id(full_name, join_date)')
      .order('created_at', { ascending: false });

    if (error) console.error("Fetch Error:", error.message);

    const { data: empData } = await supabase
      .from('employees')
      .select('id, full_name, join_date')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    setRequests(reqData || []);
    setEmployees(empData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- HANDLER DELETE (OPTIMISTIC & VALIDATED) ---
  const handleDelete = async (id: number) => {
      if(!confirm("Yakin hapus request ini permanen?")) return;
      
      const deletePromise = new Promise(async (resolve, reject) => {
          // 1. Coba Hapus
          const { error, count } = await supabase
            .from('time_off')
            .delete({ count: 'exact' }) // Request jumlah baris yang dihapus
            .eq('id', id);

          if (error) {
              reject(error.message);
              return;
          }

          // 2. Cek apakah ada yang terhapus?
          if (count === 0) {
              reject("Gagal menghapus. Izin ditolak atau data tidak ditemukan.");
              return;
          }

          // 3. Update State Lokal Langsung (Biar UI cepat)
          setRequests((prev) => prev.filter((item) => item.id !== id));
          resolve("Request dihapus");
      });

      toast.promise(deletePromise, {
          loading: 'Menghapus request...',
          success: (msg) => `${msg}`,
          error: (err) => `Gagal hapus: ${err}`
      });
  };

  // --- HANDLER UPDATE STATUS (OPTIMISTIC & VALIDATED) ---
  const updateStatus = async (id: number, newStatus: string) => {
      const updatePromise = new Promise(async (resolve, reject) => {
          // 1. Coba Update & Minta Data Balikan (.select)
          const { data, error } = await supabase
              .from('time_off')
              .update({ status: newStatus })
              .eq('id', id)
              .select(); // Penting: Agar kita tahu ada data yang berubah

          if (error) {
              reject(error.message);
              return;
          }

          // 2. Cek apakah ada data yang dikembalikan?
          if (!data || data.length === 0) {
              reject("Gagal update. Izin ditolak (RLS) atau data hilang.");
              return;
          }

          // 3. Update State Lokal Langsung
          setRequests((prev) => 
            prev.map((item) => item.id === id ? { ...item, status: newStatus } : item)
          );
          
          resolve(`Status diubah menjadi ${newStatus}`);
      });

      toast.promise(updatePromise, {
          loading: 'Mengupdate status...',
          success: (msg) => `${msg}`,
          error: (err) => `Gagal: ${err}`
      });
  };

  const handleEdit = (req: any) => {
      setEditingRequest(req);
      setIsModalOpen(true);
  };

  const handleCreate = () => {
      setEditingRequest(null);
      setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Approved') return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 size={12}/> Approved</span>;
    if (status === 'Rejected') return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100"><XCircle size={12}/> Rejected</span>;
    return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100"><Clock size={12}/> Pending</span>;
  };

  return (
    <div className="space-y-6 animate-enter pb-20 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Requests Queue</h1>
          <p className="text-slate-500 text-sm">Manage incoming leave requests.</p>
        </div>
        <div className="flex gap-3">
             <Link href="/time-off/balances" className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
                View Balances
             </Link>
             <button 
                onClick={handleCreate}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors"
             >
                <Plus size={16} /> New Request
             </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-bold">Employee</th>
                <th className="px-6 py-4 font-bold">Detail Cuti</th>
                <th className="px-6 py-4 font-bold">Duration</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No requests found.</td></tr>
              )}
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-900">
                      {req.employees?.full_name || req.employee_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4">
                      <p className="font-bold text-slate-700">{req.type}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {new Date(req.start_date).toLocaleDateString('id-ID')} — {new Date(req.end_date).toLocaleDateString('id-ID')}
                      </p>
                      <p className="text-xs text-slate-400 italic mt-1 line-clamp-1">"{req.reason}"</p>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-600">{req.days_taken} Days</td>
                  <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                  <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(req)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                              <Pencil size={16}/>
                          </button>
                          
                          {req.status === 'Pending' && (
                              <>
                                <button onClick={() => updateStatus(req.id, 'Approved')} className="p-2 text-emerald-600 hover:bg-emerald-100 bg-emerald-50 rounded-lg transition-colors" title="Approve">
                                    <CheckCircle2 size={16}/>
                                </button>
                                <button onClick={() => updateStatus(req.id, 'Rejected')} className="p-2 text-red-600 hover:bg-red-100 bg-red-50 rounded-lg transition-colors" title="Reject">
                                    <XCircle size={16}/>
                                </button>
                              </>
                          )}
                          
                          <button onClick={() => handleDelete(req.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                              <Trash2 size={16}/>
                          </button>
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- MODAL PORTAL --- */}
      <RequestTimeOffModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={editingRequest}
        employeeList={employees}
        onSuccess={fetchData}
      />

    </div>
  );
}

// --- KOMPONEN MODAL FORM ---
function RequestTimeOffModal({ isOpen, onClose, initialData, employeeList, onSuccess }: any) {
    const [mounted, setMounted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Autocomplete State
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);

    // Form Data
    const [formData, setFormData] = useState({
        employee_id: '',
        employee_name: '',
        type: 'Annual Leave',
        start_date: '',
        end_date: '',
        reason: '',
        status: 'Pending'
    });
    const [calculatedDays, setCalculatedDays] = useState(0);

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

    // FREEZE SCROLL
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // LOAD DATA / RESET
    useEffect(() => {
        if (initialData) {
            setFormData({
                employee_id: initialData.employee_id || '',
                employee_name: initialData.employees?.full_name || initialData.employee_name || '',
                type: initialData.type,
                start_date: initialData.start_date,
                end_date: initialData.end_date,
                reason: initialData.reason,
                status: initialData.status
            });
            setEmployeeSearch(initialData.employees?.full_name || initialData.employee_name || '');
        } else {
            // Reset for New
            setFormData({ employee_id: '', employee_name: '', type: 'Annual Leave', start_date: '', end_date: '', reason: '', status: 'Pending' });
            setEmployeeSearch('');
        }
    }, [initialData, isOpen]);

    // Click Outside for Autocomplete
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Working Days Logic
    const countWorkingDays = (startStr: string, endStr: string) => {
        if (!startStr || !endStr) return 0;
        const start = new Date(startStr);
        const end = new Date(endStr);
        if (end < start) return 0;
        let count = 0;
        let curDate = new Date(start);
        while (curDate <= end) {
            const day = curDate.getDay();
            if (day !== 0 && day !== 6) count++;
            curDate.setDate(curDate.getDate() + 1);
        }
        return count;
    };

    useEffect(() => {
        setCalculatedDays(countWorkingDays(formData.start_date, formData.end_date));
    }, [formData.start_date, formData.end_date]);

    // --- HANDLERS ---
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setEmployeeSearch(val);
        setFormData(prev => ({ ...prev, employee_id: '' })); 
        setShowSuggestions(true);
    };

    const selectEmployee = (emp: any) => {
        setEmployeeSearch(emp.full_name);
        setFormData(prev => ({ 
            ...prev, 
            employee_id: emp.id.toString(),
            employee_name: emp.full_name 
        }));
        setShowSuggestions(false);
    };

    const filteredEmployees = employeeList.filter((emp: any) => 
        emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase())
    );

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        const savePromise = new Promise(async (resolve, reject) => {
            const selectedEmp = employeeList.find((e: any) => e.id.toString() === formData.employee_id);
            
            const payload = {
                employee_id: formData.employee_id || null, 
                employee_name: selectedEmp ? selectedEmp.full_name : employeeSearch, 
                type: formData.type,
                start_date: formData.start_date,
                end_date: formData.end_date,
                reason: formData.reason,
                days_taken: calculatedDays,
                status: initialData ? formData.status : 'Pending'
            };

            let error;
            if (initialData?.id) {
                const { error: err } = await supabase.from('time_off').update(payload).eq('id', initialData.id);
                error = err;
            } else {
                const { error: err } = await supabase.from('time_off').insert([payload]);
                error = err;
            }

            if (error) reject(error.message);
            else {
                onClose();
                onSuccess();
                resolve("Request disimpan");
            }
        });

        toast.promise(savePromise, {
            loading: 'Menyimpan request...',
            success: (msg) => `${msg}`,
            error: (err) => `Gagal simpan: ${err}`
        });
        
        setIsSaving(false);
    };

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 animate-enter flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <h3 className="font-bold text-lg text-slate-800">{initialData ? 'Edit Request' : 'New Request'}</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-red-500" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="relative" ref={searchWrapperRef}>
                            <label className="text-xs font-bold text-slate-500 uppercase">Employee</label>
                            <div className="relative mt-1">
                                <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="text"
                                    value={employeeSearch}
                                    onChange={handleSearchChange}
                                    onFocus={() => setShowSuggestions(true)}
                                    placeholder="Search name or type manually..."
                                    className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                                    disabled={!!initialData}
                                />
                                {employeeSearch === '' && <ChevronDown className="absolute right-3 top-2.5 text-slate-400" size={16} />}
                            </div>
                            {showSuggestions && !initialData && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                    {filteredEmployees.length > 0 ? (
                                        filteredEmployees.map((emp: any) => (
                                            <div key={emp.id} onClick={() => selectEmployee(emp)} className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-slate-700 flex items-center gap-2 border-b border-slate-50 last:border-0">
                                                <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">{emp.full_name.charAt(0)}</div>
                                                {emp.full_name}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-2 text-xs text-slate-400 italic">No match found. Using free text "{employeeSearch}".</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold text-slate-500 uppercase">Start</label><input required type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"/></div>
                             <div><label className="text-xs font-bold text-slate-500 uppercase">End</label><input required type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"/></div>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-lg flex justify-between items-center text-sm text-indigo-700 font-bold border border-indigo-100">
                            <span>Duration (Working Days)</span>
                            <span>{calculatedDays} Days</span>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                            <select name="type" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg">
                                <option>Annual Leave</option><option>Sick Leave</option><option>Unpaid Leave</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Reason</label>
                            <input required value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"/>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold text-sm">Cancel</button>
                            <button disabled={isSaving} type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm flex justify-center items-center gap-2">
                                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <><Save size={16}/> Save Request</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}