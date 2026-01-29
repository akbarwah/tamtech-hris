"use client";

import React, { useState } from 'react';
import { Wrench, MapPin, Plus, CheckCircle, X, Loader2, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

export default function FacilityManagement({ facilities, refreshData }: { facilities: any[], refreshData: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State untuk melacak ID yang sedang diedit (null artinya mode Add New)
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
     name: '', category: 'AC', location: '', vendor_name: '', last_maintenance: '', next_maintenance: '', cost: ''
  });

  // --- HANDLER: OPEN EDIT MODAL ---
  const handleEdit = (item: any) => {
      setEditingId(item.id); // Set ID
      setFormData({
          name: item.name,
          category: item.category || 'AC',
          location: item.location || '',
          vendor_name: item.vendor_name || '',
          last_maintenance: item.last_maintenance || '',
          next_maintenance: item.next_maintenance || '',
          cost: item.cost ? item.cost.toString() : '' // Convert number ke string untuk input form
      });
      setIsModalOpen(true);
  };

  // --- HANDLER: DELETE ---
  const handleDelete = async (id: number) => {
      if(!confirm("Yakin ingin menghapus jadwal ini?")) return;
      
      const { error } = await supabase.from('facilities').delete().eq('id', id);
      if(!error) {
          refreshData();
      } else {
          alert("Gagal menghapus: " + error.message);
      }
  };

  // --- HANDLER: SAVE (INSERT / UPDATE) ---
  const handleSave = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsSaving(true);
     
     const payload = {
         ...formData,
         status: 'Scheduled',
         cost: formData.cost ? parseInt(formData.cost.replace(/\D/g, '')) : 0
     };
     
     let error;

     if (editingId) {
         // MODE UPDATE
         const { error: err } = await supabase
            .from('facilities')
            .update(payload)
            .eq('id', editingId);
         error = err;
     } else {
         // MODE INSERT (NEW)
         const { error: err } = await supabase
            .from('facilities')
            .insert([payload]);
         error = err;
     }

     if (!error) {
         setIsModalOpen(false);
         refreshData();
         resetForm();
     } else {
         alert(error.message);
     }
     setIsSaving(false);
  };

  const resetForm = () => {
      setEditingId(null);
      setFormData({ name: '', category: 'AC', location: '', vendor_name: '', last_maintenance: '', next_maintenance: '', cost: '' });
  };

  const markAsDone = async (id: number) => {
      if(!confirm("Tandai maintenance ini selesai? Tanggal maintenance berikutnya akan otomatis diperbarui (+3 bulan).")) return;
      
      const today = new Date();
      const nextDate = new Date(today);
      nextDate.setMonth(nextDate.getMonth() + 3); 

      await supabase.from('facilities').update({
          last_maintenance: today.toISOString(),
          next_maintenance: nextDate.toISOString(),
          status: 'Scheduled'
      }).eq('id', id);
      refreshData();
  };

  return (
    <div>
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-700">General Affairs & Facility Log</h2>
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-200">
                <Plus size={16}/> New Schedule
            </button>
        </div>

        {/* List Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.length === 0 && <p className="col-span-3 text-center text-slate-400 py-10 italic">Belum ada jadwal facility.</p>}
            {facilities.map(item => {
                const daysLeft = Math.ceil((new Date(item.next_maintenance).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                const isUrgent = daysLeft <= 7;

                return (
                    <div key={item.id} className={`bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden transition-all hover:shadow-md ${isUrgent ? 'border-red-200' : 'border-slate-200'}`}>
                        {isUrgent && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">URGENT</div>}
                        
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${item.category === 'AC' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                    <Wrench size={20}/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{item.name}</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10}/> {item.location}</p>
                                </div>
                            </div>
                            
                            {/* ACTION BUTTONS (EDIT & DELETE) */}
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => handleEdit(item)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <Pencil size={14}/>
                                </button>
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 my-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 text-xs">Vendor</span>
                                <span className="font-medium text-slate-700 text-xs">{item.vendor_name || '-'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 text-xs">Next Service</span>
                                <span className={`font-bold text-xs ${isUrgent ? 'text-red-600' : 'text-slate-700'}`}>
                                    {new Date(item.next_maintenance).toLocaleDateString()} ({daysLeft} days)
                                </span>
                            </div>
                        </div>

                        <button onClick={() => markAsDone(item.id)} className="w-full py-2 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                            <CheckCircle size={14}/> Mark as Done
                        </button>
                    </div>
                )
            })}
        </div>

        {/* --- FIXED MODAL (GLASSY & SPACIOUS) --- */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-white/80 backdrop-blur-md transition-opacity" 
                    onClick={() => setIsModalOpen(false)}
                />

                {/* Content Box */}
                <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-enter flex flex-col">
                    
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                {editingId ? 'Edit Schedule' : 'Add Facility Schedule'}
                            </h2>
                            <p className="text-slate-500 text-sm">Maintenance planning.</p>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Form */}
                    <div className="p-8">
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500">Facility Name</label>
                                <input required placeholder="e.g. AC Server Room" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1 focus:bg-white focus:ring-2 focus:ring-indigo-500/20" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})}/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Location</label>
                                <input required placeholder="e.g. 2nd Floor" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1 focus:bg-white focus:ring-2 focus:ring-indigo-500/20" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})}/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Vendor Name</label>
                                <input required placeholder="e.g. PT Service AC" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1 focus:bg-white focus:ring-2 focus:ring-indigo-500/20" value={formData.vendor_name} onChange={e=>setFormData({...formData, vendor_name: e.target.value})}/>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Last Service</label>
                                    <input type="date" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1" value={formData.last_maintenance} onChange={e=>setFormData({...formData, last_maintenance: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Next Service</label>
                                    <input type="date" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1" value={formData.next_maintenance} onChange={e=>setFormData({...formData, next_maintenance: e.target.value})}/>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500">Est. Cost (IDR)</label>
                                <input placeholder="e.g. 500000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1" value={formData.cost} onChange={e=>setFormData({...formData, cost: e.target.value})}/>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={()=>setIsModalOpen(false)} className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-sm">Cancel</button>
                                <button disabled={isSaving} type="submit" className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm shadow-lg shadow-indigo-200 flex items-center gap-2">
                                    {isSaving ? <Loader2 size={16} className="animate-spin"/> : (editingId ? 'Update Schedule' : 'Save Schedule')}
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