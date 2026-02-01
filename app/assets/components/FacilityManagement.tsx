"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { Wrench, MapPin, Plus, CheckCircle, X, Loader2, Pencil, Trash2, Calendar, DollarSign, Building } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner'; // 1. IMPORT SONNER

export default function FacilityManagement({ facilities, refreshData }: { facilities: any[], refreshData: () => void }) {
  
  // --- STATE MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // --- HANDLERS ---
  const handleEdit = (item: any) => {
      setEditingItem(item);
      setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
      if(!confirm("Yakin ingin menghapus jadwal ini?")) return;
      
      const deletePromise = new Promise(async (resolve, reject) => {
          const { error } = await supabase.from('facilities').delete().eq('id', id);
          if(error) reject(error.message);
          else {
              refreshData();
              resolve("Jadwal dihapus");
          }
      });

      toast.promise(deletePromise, {
          loading: 'Menghapus...',
          success: (msg) => `${msg}`,
          error: (err) => `Gagal: ${err}`
      });
  };

  const markAsDone = async (id: number) => {
      if(!confirm("Tandai maintenance ini selesai? Tanggal maintenance berikutnya akan otomatis diperbarui (+3 bulan).")) return;
      
      const actionPromise = new Promise(async (resolve, reject) => {
          const today = new Date();
          const nextDate = new Date(today);
          nextDate.setMonth(nextDate.getMonth() + 3); 

          const { error } = await supabase.from('facilities').update({
              last_maintenance: today.toISOString(),
              next_maintenance: nextDate.toISOString(),
              status: 'Scheduled'
          }).eq('id', id);

          if(error) reject(error.message);
          else {
              refreshData();
              resolve("Maintenance selesai");
          }
      });

      toast.promise(actionPromise, {
          loading: 'Mengupdate status...',
          success: (msg) => `${msg}`,
          error: (err) => `Gagal: ${err}`
      });
  };

  return (
    <div className="animate-enter">
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-700">General Affairs & Facility Log</h2>
            <button 
                onClick={() => { setEditingItem(null); setIsModalOpen(true); }} 
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors"
            >
                <Plus size={16}/> New Schedule
            </button>
        </div>

        {/* List Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.length === 0 && <div className="col-span-3 text-center text-slate-400 py-10 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">Belum ada jadwal maintenance facility.</div>}
            
            {facilities.map(item => {
                const daysLeft = Math.ceil((new Date(item.next_maintenance).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                const isUrgent = daysLeft <= 7;

                return (
                    <div key={item.id} className={`bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden transition-all hover:shadow-md ${isUrgent ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'}`}>
                        {isUrgent && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg shadow-sm">URGENT</div>}
                        
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${item.category === 'AC' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                    <Wrench size={20}/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 line-clamp-1">{item.name}</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={10}/> {item.location}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                                    <Pencil size={14}/>
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 my-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 text-xs font-semibold uppercase">Vendor</span>
                                <span className="font-bold text-slate-700 text-xs">{item.vendor_name || '-'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 text-xs font-semibold uppercase">Next Service</span>
                                <span className={`font-bold text-xs ${isUrgent ? 'text-red-600' : 'text-slate-700'}`}>
                                    {new Date(item.next_maintenance).toLocaleDateString()} 
                                    <span className="ml-1 font-normal opacity-70">({daysLeft} days)</span>
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={() => markAsDone(item.id)} 
                            className="w-full py-2.5 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 group"
                        >
                            <CheckCircle size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors"/> Mark as Done
                        </button>
                    </div>
                )
            })}
        </div>

        {/* --- MODAL PORTAL --- */}
        <FacilityFormModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            initialData={editingItem}
            onSuccess={refreshData}
        />
    </div>
  );
}

// --- KOMPONEN MODAL TERPISAH (GOLD STANDARD) ---
function FacilityFormModal({ isOpen, onClose, initialData, onSuccess }: any) {
    const [mounted, setMounted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Initial State
    const [formData, setFormData] = useState({
        name: '', category: 'AC', location: '', vendor_name: '', last_maintenance: '', next_maintenance: '', cost: ''
    });

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

    // FREEZE SCROLL
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // LOAD DATA
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                category: initialData.category || 'AC',
                location: initialData.location || '',
                vendor_name: initialData.vendor_name || '',
                last_maintenance: initialData.last_maintenance || '',
                next_maintenance: initialData.next_maintenance || '',
                cost: initialData.cost ? initialData.cost.toString() : ''
            });
        } else {
            setFormData({ name: '', category: 'AC', location: '', vendor_name: '', last_maintenance: '', next_maintenance: '', cost: '' });
        }
    }, [initialData, isOpen]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        const promise = new Promise(async (resolve, reject) => {
            const payload = {
                ...formData,
                status: 'Scheduled',
                cost: formData.cost ? parseInt(formData.cost.replace(/\D/g, '')) : 0
            };
            
            let error;
            if (initialData?.id) {
                const { error: err } = await supabase.from('facilities').update(payload).eq('id', initialData.id);
                error = err;
            } else {
                const { error: err } = await supabase.from('facilities').insert([payload]);
                error = err;
            }

            if(error) reject(error.message);
            else {
                onSuccess();
                onClose();
                resolve("Jadwal tersimpan");
            }
        });

        toast.promise(promise, {
            loading: 'Menyimpan...',
            success: (msg) => `${msg}`,
            error: (err) => `Gagal: ${err}`
        });
        setIsSaving(false);
    };

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            
            {/* 1. Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* 2. Content */}
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-enter">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">{initialData ? 'Edit Schedule' : 'Add Schedule'}</h3>
                        <p className="text-slate-500 text-sm">Facility Maintenance</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors"><X size={20} /></button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Wrench size={12}/> Facility Name</label>
                            <input required placeholder="e.g. AC Server Room" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})}/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><MapPin size={12}/> Location</label>
                            <input required placeholder="e.g. 2nd Floor" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})}/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Building size={12}/> Vendor Name</label>
                            <input required placeholder="e.g. PT Service AC" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" value={formData.vendor_name} onChange={e=>setFormData({...formData, vendor_name: e.target.value})}/>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Last Service</label>
                                <input type="date" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" value={formData.last_maintenance} onChange={e=>setFormData({...formData, last_maintenance: e.target.value})}/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Next Service</label>
                                <input type="date" required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" value={formData.next_maintenance} onChange={e=>setFormData({...formData, next_maintenance: e.target.value})}/>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><DollarSign size={12}/> Est. Cost (IDR)</label>
                            <input placeholder="e.g. 500000" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" value={formData.cost} onChange={e=>setFormData({...formData, cost: e.target.value})}/>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
                            <button type="button" onClick={onClose} className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-sm transition-colors">Cancel</button>
                            <button disabled={isSaving} type="submit" className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95">
                                {isSaving ? <Loader2 size={16} className="animate-spin"/> : (initialData ? 'Update Schedule' : 'Save Schedule')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}