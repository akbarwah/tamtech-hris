"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Sesuaikan path import ini
import { 
  Calendar, CheckCircle2, Clock, XCircle, Plus, Loader2, X, 
  Pencil, Trash2, Filter, AlertCircle, Save 
} from 'lucide-react';
import Link from 'next/link';

export default function TimeOffRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); // Untuk Mode Edit

  // Form Data
  const [formData, setFormData] = useState({
    employee_id: '',
    type: 'Annual Leave',
    start_date: '',
    end_date: '',
    reason: '',
    status: 'Pending'
  });
  const [calculatedDays, setCalculatedDays] = useState(0);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    // Get Requests
    const { data: reqData } = await supabase
      .from('time_off')
      .select('*, employees:employee_id(full_name, join_date)')
      .order('created_at', { ascending: false });

    // Get Employees (Dropdown)
    const { data: empData } = await supabase
      .from('employees')
      .select('id, full_name, join_date')
      .eq('is_active', true);

    setRequests(reqData || []);
    setEmployees(empData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- LOGIC HELPER ---
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

  // --- CRUD HANDLERS ---

  // 1. CREATE / UPDATE
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const selectedEmp = employees.find(e => e.id.toString() === formData.employee_id);
    const payload = {
        employee_id: formData.employee_id,
        employee_name: selectedEmp?.full_name,
        type: formData.type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        days_taken: calculatedDays,
        status: editingId ? formData.status : 'Pending' // Jika edit, pertahankan status lama atau update via tombol approve
    };

    let error;
    if (editingId) {
        // Update
        const { error: err } = await supabase.from('time_off').update(payload).eq('id', editingId);
        error = err;
    } else {
        // Create
        const { error: err } = await supabase.from('time_off').insert([payload]);
        error = err;
    }

    if (error) alert('Error: ' + error.message);
    else {
        setIsModalOpen(false);
        resetForm();
        fetchData();
    }
    setIsSaving(false);
  };

  // 2. DELETE
  const handleDelete = async (id: number) => {
      if(!confirm("Yakin hapus request ini?")) return;
      const { error } = await supabase.from('time_off').delete().eq('id', id);
      if (!error) fetchData();
  };

  // 3. EDIT (PRE-FILL FORM)
  const handleEdit = (req: any) => {
      setEditingId(req.id);
      setFormData({
          employee_id: req.employee_id,
          type: req.type,
          start_date: req.start_date,
          end_date: req.end_date,
          reason: req.reason,
          status: req.status
      });
      setIsModalOpen(true);
  };

  // 4. UPDATE STATUS (APPROVE/REJECT)
  const updateStatus = async (id: number, newStatus: string) => {
      if(!confirm(`Yakin ingin mengubah status menjadi ${newStatus}?`)) return;
      const { error } = await supabase.from('time_off').update({ status: newStatus }).eq('id', id);
      if (!error) fetchData();
  };

  const resetForm = () => {
      setEditingId(null);
      setFormData({ employee_id: '', type: 'Annual Leave', start_date: '', end_date: '', reason: '', status: 'Pending' });
      setCalculatedDays(0);
  };

  // Helper Badge
  const getStatusBadge = (status: string) => {
    if (status === 'Approved') return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 size={12}/> Approved</span>;
    if (status === 'Rejected') return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100"><XCircle size={12}/> Rejected</span>;
    return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100"><Clock size={12}/> Pending</span>;
  };

  return (
    <div className="space-y-6 animate-enter pb-20 min-h-screen">
      
      {/* HEADER WITH NAV */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Requests Queue</h1>
          <p className="text-slate-500 text-sm">Manage incoming leave requests.</p>
        </div>
        <div className="flex gap-3">
             {/* Navigation Buttons */}
             <Link href="/time-off/balances" className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
                View Balances
             </Link>
             <button 
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-200"
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
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">Employee</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Detail Cuti</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Duration</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-900">{req.employees?.full_name || req.employee_name}</td>
                  <td className="px-6 py-4">
                      <p className="font-bold text-slate-700">{req.type}</p>
                      <p className="text-xs text-slate-500">{new Date(req.start_date).toLocaleDateString('id-ID')} - {new Date(req.end_date).toLocaleDateString('id-ID')}</p>
                      <p className="text-xs text-slate-400 italic mt-1">"{req.reason}"</p>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-600">{req.days_taken} Days</td>
                  <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                  <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                          {/* CRUD Buttons */}
                          <button onClick={() => handleEdit(req)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                              <Pencil size={16}/>
                          </button>
                          
                          {/* Approve/Reject only if Pending */}
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

      {/* --- MODAL (FIXED POSITIONING) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 animate-enter flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Edit Request' : 'New Request'}</h3>
                    <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-red-500" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Employee</label>
                            <select 
                                required 
                                name="employee_id" 
                                value={formData.employee_id} 
                                onChange={(e) => setFormData({...formData, employee_id: e.target.value})} 
                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"
                                disabled={!!editingId} // Disable change employee on edit
                            >
                                <option value="">Select Employee...</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                            </select>
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
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold text-sm">Cancel</button>
                            <button disabled={isSaving} type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm flex justify-center items-center gap-2">
                                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <><Save size={16}/> Save Request</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}