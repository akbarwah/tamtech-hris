"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  FileText, 
  Search, 
  Plus, 
  Loader2, 
  X, 
  AlertCircle, 
  CheckCircle2,
  Edit2 // Icon untuk tombol edit
} from 'lucide-react';

export default function HistoryPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); // State untuk melacak ID yang sedang diedit

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employee_name: '',
    contract_type: 'PKWT',
    start_date: '',
    end_date: '',
    status: 'Active',
    notes: ''
  });

  const fetchContracts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error:', error);
    else setContracts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return '∞';
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const [year, month, day] = dateString.split('-');
    const monthIndex = parseInt(month) - 1; 
    return `${day} ${months[monthIndex]} ${year}`;
  };

  // Fungsi untuk memicu mode Edit
  const handleEdit = (contract: any) => {
    setEditingId(contract.id);
    setFormData({
      employee_name: contract.employee_name,
      contract_type: contract.contract_type,
      start_date: contract.start_date,
      end_date: contract.end_date || '',
      status: contract.status,
      notes: contract.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.contract_type !== 'PKWTT' && !formData.end_date) {
      setErrorMessage(`⚠️ Missing End Date! Contracts of type "${formData.contract_type}" require an End Date.`);
      return; 
    }

    setIsSaving(true);
    setErrorMessage(null); 

    const payload = {
      ...formData,
      end_date: formData.end_date === '' ? null : formData.end_date
    };

    let result;
    if (editingId) {
      // UPDATE jika ada editingId
      result = await supabase.from('contracts').update(payload).eq('id', editingId);
    } else {
      // INSERT jika baru
      result = await supabase.from('contracts').insert([payload]);
    }

    if (result.error) {
      setErrorMessage(result.error.message);
    } else {
      toggleModal(false);
      fetchContracts(); 
    }
    setIsSaving(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (errorMessage) setErrorMessage(null);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleModal = (state: boolean) => {
    setIsModalOpen(state);
    if (!state) {
      // Reset form saat tutup modal
      setEditingId(null);
      setFormData({ 
        employee_name: '', 
        contract_type: 'PKWT', 
        start_date: '', 
        end_date: '', 
        status: 'Active', 
        notes: '' 
      });
      setErrorMessage(null);
    }
  }

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contracts History</h1>
          <p className="text-slate-500 text-sm">Manage employee agreements and legal documents.</p>
        </div>
        <button 
          onClick={() => toggleModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 shadow-sm shadow-indigo-200"
        >
          <Plus size={16} /> New Contract
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
         <Search size={18} className="text-slate-400" />
         <input type="text" placeholder="Search contracts..." className="flex-1 bg-transparent focus:outline-none text-sm" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">Employee</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Type</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Duration</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-right pr-12">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-500">No contracts found.</td></tr>}
              {contracts.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded text-slate-500"><FileText size={14}/></div>
                    {item.employee_name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                        item.contract_type === 'PKWTT' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                        {item.contract_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                     <div className="text-xs font-mono">
                        <span className="text-slate-400 font-sans">Start:</span> {formatDate(item.start_date)} <br/>
                        <span className="text-slate-400 font-sans">End:</span> &nbsp;{formatDate(item.end_date)}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'Active' && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100"><CheckCircle2 size={12}/> Active</span>}
                    {item.status === 'Expired' && <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100"><AlertCircle size={12}/> Expired</span>}
                    {item.status === 'Terminated' && <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200"><X size={12}/> Terminated</span>}
                  </td>
                  <td className="px-6 py-4 text-right pr-8">
                    <button 
                      onClick={() => handleEdit(item)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-90"
                      title="Edit Contract"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-md transition-opacity" onClick={() => toggleModal(false)} />

          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-enter">
            <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{editingId ? 'Edit Contract' : 'Register New Contract'}</h2>
                <p className="text-slate-500 mt-1">{editingId ? 'Update employee agreement details.' : 'Create a new employment agreement.'}</p>
              </div>
              <button onClick={() => toggleModal(false)} className="p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-10 py-8">
              {errorMessage && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-enter text-red-700">
                  <div className="p-2 bg-red-100 rounded-full"><AlertCircle size={20} /></div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">Validation Error</p>
                    <p className="text-sm">{errorMessage}</p>
                  </div>
                  <button type="button" onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-700"><X size={18} /></button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Employee Name</label>
                    <input required name="employee_name" value={formData.employee_name} onChange={handleChange} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="e.g. Andi Saputra" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Contract Type</label>
                    <select name="contract_type" value={formData.contract_type} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none">
                      <option value="PKWT">PKWT (Kontrak)</option>
                      <option value="PKWTT">PKWTT (Tetap)</option>
                      <option value="Probation">Probation</option>
                      <option value="Freelance">Freelance</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                   <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</label>
                    <input required type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-600 transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">End Date</label>
                    <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className={`w-full px-4 py-3 border rounded-xl focus:bg-white focus:ring-2 focus:border-indigo-500 transition-all outline-none ${errorMessage ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-slate-200 bg-slate-50 focus:ring-indigo-500/20'}`} />
                    <p className={`text-[10px] mt-1.5 font-medium ${formData.contract_type === 'PKWTT' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {formData.contract_type === 'PKWTT' ? 'Optional for PKWTT (Permanent)' : '* Required for this type'}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none">
                      <option value="Active">Active</option>
                      <option value="Expired">Expired</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>
                   <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Internal Notes</label>
                    <input name="notes" value={formData.notes} onChange={handleChange} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="e.g. Reviewed by HR" />
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-50 flex justify-end gap-4">
                <button type="button" onClick={() => toggleModal(false)} className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold transition-colors">
                  Cancel
                </button>
                <button disabled={isSaving} type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                  {isSaving ? <Loader2 size={20} className="animate-spin"/> : editingId ? 'Update Contract' : 'Save Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}