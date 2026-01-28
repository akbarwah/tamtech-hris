"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Laptop, Monitor, Search, PlusCircle, AlertTriangle, Loader2, X, Box } from 'lucide-react';

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Data State
  const [formData, setFormData] = useState({
    id: '', 
    name: '',
    category: '',
    serial_number: '',
    holder: '', 
    status: 'Good'
  });

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error:', error);
    else setAssets(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { error } = await supabase.from('assets').insert([formData]);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ id: '', name: '', category: '', serial_number: '', holder: '', status: 'Good' });
      fetchAssets(); 
    }
    setIsSaving(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-6 animate-enter">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Management</h1>
          <p className="text-slate-500 text-sm">Track company inventory and assignments.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 shadow-sm shadow-indigo-200"
        >
          <PlusCircle size={16} /> New Asset
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
         <Search size={18} className="text-slate-400" />
         <input type="text" placeholder="Search assets..." className="flex-1 bg-transparent focus:outline-none text-sm" />
      </div>

      {/* GRID KARTU ASET */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.length === 0 && <p className="text-slate-500 col-span-3 text-center py-10">No assets found.</p>}
          {assets.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group cursor-default">
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2 ${
                item.status === 'Good' ? 'bg-emerald-500' : item.status === 'Missing' ? 'bg-red-500' : 'bg-amber-500'
              }`}></div>
              <div className="flex justify-between items-start mb-4 pl-3">
                <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  {item.category === 'Laptop' ? <Laptop size={20} /> : item.category === 'Monitor' ? <Monitor size={20} /> : <Box size={20} />}
                </div>
                <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">{item.id}</span>
              </div>
              <div className="pl-3">
                <h3 className="font-bold text-slate-800 group-hover:text-indigo-900 transition-colors truncate">{item.name}</h3>
                <p className="text-xs text-slate-500 mb-4 font-mono truncate">SN: {item.serial_number}</p>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-400">Assigned to</p>
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{item.holder || '-'}</p>
                  </div>
                  {item.status !== 'Good' && (
                    <div className="text-xs font-bold text-red-500 flex items-center gap-1 bg-red-50 px-2 py-1 rounded">
                      <AlertTriangle size={12} /> {item.status}
                    </div>
                  )}
                  {item.status === 'Good' && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Good</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL FORM: SPACIOUS / WIDE LAYOUT (ANTI-SCROLL) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          
          {/* 1. Backdrop Glassy Penuh */}
          <div 
            className="absolute inset-0 bg-white/80 backdrop-blur-md transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* 2. Content Box: LEBAR & LUAS (w-full max-w-4xl) */}
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-enter">
            
            {/* Header: Simple & Clean */}
            <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Register Asset</h2>
                <p className="text-slate-500 mt-1">Add a new device or furniture to the company inventory.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form: Grid 3 Kolom yang Sangat Rapi */}
            <form onSubmit={handleSave} className="px-10 py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Kolom 1 */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Asset ID</label>
                    <input required name="id" value={formData.id} onChange={handleChange} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="AST-001" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none">
                      <option value="">Select...</option>
                      <option value="Laptop">Laptop</option>
                      <option value="Monitor">Monitor</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                </div>

                {/* Kolom 2 */}
                <div className="space-y-6">
                   <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Item Name</label>
                    <input required name="name" value={formData.name} onChange={handleChange} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="MacBook Pro M3" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Serial Number</label>
                    <input name="serial_number" value={formData.serial_number} onChange={handleChange} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="S/N 12345" />
                  </div>
                </div>

                {/* Kolom 3 */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Holder Name</label>
                    <input name="holder" value={formData.holder} onChange={handleChange} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="e.g. Budi" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Condition</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none">
                      <option value="Good">Good</option>
                      <option value="Repair">Repair</option>
                      <option value="Missing">Missing</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Footer Buttons (Besar & Jelas) */}
              <div className="mt-10 pt-6 border-t border-slate-50 flex justify-end gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold transition-colors">
                  Cancel
                </button>
                <button disabled={isSaving} type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                  {isSaving ? <Loader2 size={20} className="animate-spin"/> : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}