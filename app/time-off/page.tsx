"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient'; 
import { Calendar, CheckCircle2, Clock, XCircle, Plus, Loader2, X, FileText } from 'lucide-react';

export default function TimeOffPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    employee_name: '',
    type: 'Annual Leave',
    start_date: '',
    end_date: '',
    reason: '',
    status: 'Pending'
  });

  // --- 1. Fetch Data ---
  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('time_off')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error:', error);
    else setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // --- Helper: Format Tanggal dd/mm/yyyy ---
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    // dateString biasanya yyyy-mm-dd dari database
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // --- 2. Submit Data ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { error } = await supabase.from('time_off').insert([formData]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ employee_name: '', type: 'Annual Leave', start_date: '', end_date: '', reason: '', status: 'Pending' });
      fetchRequests(); 
    }
    setIsSaving(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Helper warna status
  const getStatusBadge = (status: string) => {
    if (status === 'Approved') return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 size={12}/> Approved</span>;
    if (status === 'Rejected') return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100"><XCircle size={12}/> Rejected</span>;
    return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100"><Clock size={12}/> Pending</span>;
  };

  return (
    <div className="space-y-6 animate-enter">
      
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Time Off Requests</h1>
          <p className="text-slate-500 text-sm">Manage employee leave and absence.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 shadow-sm shadow-indigo-200"
        >
          <Plus size={16} /> Request Time Off
        </button>
      </div>

      {/* STATS SIMPLE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><Clock size={20}/></div>
            <div><p className="text-slate-500 text-xs font-medium uppercase">Pending</p><p className="text-xl font-bold text-slate-900">4</p></div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Calendar size={20}/></div>
            <div><p className="text-slate-500 text-xs font-medium uppercase">On Leave Today</p><p className="text-xl font-bold text-slate-900">2</p></div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FileText size={20}/></div>
            <div><p className="text-slate-500 text-xs font-medium uppercase">Total This Month</p><p className="text-xl font-bold text-slate-900">12</p></div>
         </div>
      </div>

      {/* TABEL LIST */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">Employee</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Type</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Date Range</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Reason</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-500">No requests found.</td></tr>}
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{req.employee_name}</td>
                  <td className="px-6 py-4 text-slate-600">{req.type}</td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex flex-col text-xs font-mono">
                         {/* --- PERBAIKAN: Gunakan formatDate di sini --- */}
                        <span>From: {formatDate(req.start_date)}</span>
                        <span>To: &nbsp;&nbsp;&nbsp;&nbsp;{formatDate(req.end_date)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 truncate max-w-50">{req.reason}</td>
                  <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- MODAL FORM (FIXED: Glassy Background + Safe Center) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-100 overflow-y-auto">
            
            {/* 1. LAYER BACKGROUND GLASSY (Putih Transparan) */}
            <div 
              className="fixed inset-0 bg-white/80 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsModalOpen(false)}
            />

            {/* 2. WRAPPER POSISI: min-h-full items-center -> Menjamin Center tapi bisa scroll jika layar kecil */}
            <div className="flex min-h-full items-center justify-center p-4">
                
                {/* 3. MODAL BOX */}
                <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 animate-enter overflow-hidden transform transition-all">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-lg text-slate-800">New Leave Request</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSave} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Employee Name</label>
                            <input required name="employee_name" value={formData.employee_name} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. Budi Santoso" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white">
                                <option>Annual Leave</option>
                                <option>Sick Leave</option>
                                <option>Unpaid Leave</option>
                                <option>Remote Work</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                <input required type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                <input required type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                            <input required name="reason" value={formData.reason} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. Family vacation" />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                            <button disabled={isSaving} type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex justify-center items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-200">
                                {isSaving ? <Loader2 size={18} className="animate-spin"/> : 'Submit Request'}
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