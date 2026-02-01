"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; 
import { supabase } from '@/lib/supabaseClient';
import { 
  AlertTriangle, Wrench, Clock, CheckCircle2, XCircle, ShieldAlert, ArrowRight, 
  X, Loader2, Save, Tag, Hash, DollarSign, User, Laptop, Monitor, Smartphone, Box,
  ChevronDown 
} from 'lucide-react';
import { toast } from 'sonner'; // 1. IMPORT SONNER

interface MaintenanceProps {
  assets: any[];
  onEdit?: (asset: any) => void; 
  onRefresh?: () => void; 
}

export default function AssetMaintenance({ assets, onEdit, onRefresh }: MaintenanceProps) {
  
  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // 1. Barang yang sedang bermasalah (Repair / Broken)
  const problematicAssets = useMemo(() => {
    return assets.filter(a => a.status === 'Repair' || a.status === 'Broken');
  }, [assets]);

  // 2. Barang yang garansinya mau habis (<= 60 hari)
  const warrantyAlerts = useMemo(() => {
    return assets.filter(a => {
      if (!a.warranty_expiry) return false;
      const expiry = new Date(a.warranty_expiry);
      const today = new Date();
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 60; 
    }).sort((a, b) => new Date(a.warranty_expiry).getTime() - new Date(b.warranty_expiry).getTime());
  }, [assets]);

  // Helper: Format Rupiah
  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  // Helper: Hitung sisa hari
  const getDaysRemaining = (dateString: string) => {
    const today = new Date();
    const expiry = new Date(dateString);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Handler Edit Click
  const handleEditClick = (asset: any) => {
      setSelectedAsset(asset);
      setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-enter">
      
      {/* SECTION 1: WARRANTY ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Summary Card */}
         <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-6 rounded-2xl flex flex-col justify-center shadow-sm">
             <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><ShieldAlert size={24}/></div>
                 <h3 className="font-bold text-amber-900">Warranty Overview</h3>
             </div>
             <p className="text-sm text-amber-700/80 mb-4">Items needing warranty extension or replacement soon.</p>
             <div className="text-3xl font-bold text-amber-800">{warrantyAlerts.length} <span className="text-base font-normal text-amber-600">Items</span></div>
         </div>

         {/* Alert List */}
         <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock size={18} className="text-slate-400"/> Warranty Expirations (Next 60 Days)</h3>
             <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {warrantyAlerts.length === 0 && <p className="text-slate-400 text-sm italic py-4 text-center">No warranties expiring soon. Good job!</p>}
                
                {warrantyAlerts.map(item => {
                    const days = getDaysRemaining(item.warranty_expiry);
                    const isExpired = days < 0;
                    return (
                        <div key={item.id} onClick={() => handleEditClick(item)} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer group transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-10 rounded-full ${isExpired ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                <div>
                                    <div className="font-bold text-slate-700 text-sm">{item.name}</div>
                                    <div className="text-xs text-slate-400">{item.serial_number} • ID: {item.id}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-xs font-bold px-2 py-1 rounded ${isExpired ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {isExpired ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">{new Date(item.warranty_expiry).toLocaleDateString()}</div>
                            </div>
                        </div>
                    )
                })}
             </div>
         </div>
      </div>

      {/* SECTION 2: REPAIR & BROKEN QUEUE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div>
                 <h3 className="font-bold text-slate-800 flex items-center gap-2"><Wrench size={18} className="text-slate-400"/> Maintenance Queue</h3>
                 <p className="text-xs text-slate-500 mt-1">List of assets currently in 'Repair' or 'Broken' status.</p>
             </div>
             {problematicAssets.length > 0 && (
                 <span className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs font-bold">{problematicAssets.length} Issues</span>
             )}
         </div>

         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500">
                     <tr>
                         <th className="px-6 py-4">Asset Detail</th>
                         <th className="px-6 py-4">Current Holder</th>
                         <th className="px-6 py-4">Purchase Date</th>
                         <th className="px-6 py-4">Asset Value</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4 text-right">Action</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {problematicAssets.length === 0 ? (
                         <tr>
                             <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                 <div className="flex flex-col items-center gap-2">
                                     <CheckCircle2 size={32} className="text-emerald-200"/>
                                     <p>All assets are in good condition.</p>
                                 </div>
                             </td>
                         </tr>
                     ) : (
                         problematicAssets.map(item => (
                             <tr key={item.id} onClick={() => handleEditClick(item)} className="hover:bg-slate-50 cursor-pointer group">
                                 <td className="px-6 py-4">
                                     <div className="font-bold text-slate-800">{item.name}</div>
                                     <div className="text-xs text-slate-400 font-mono">{item.serial_number}</div>
                                 </td>
                                 <td className="px-6 py-4">
                                     {item.holder ? (
                                         <span className="flex items-center gap-2 text-slate-700"><span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{item.holder.substring(0,2).toUpperCase()}</span> {item.holder}</span>
                                     ) : <span className="text-slate-400 italic">No Holder</span>}
                                 </td>
                                 <td className="px-6 py-4 text-slate-500">{item.purchase_date || '-'}</td>
                                 <td className="px-6 py-4 font-mono text-slate-600">{item.price ? formatIDR(item.price) : '-'}</td>
                                 <td className="px-6 py-4">
                                     <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold w-fit ${
                                         item.status === 'Broken' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                     }`}>
                                         {item.status === 'Broken' ? <XCircle size={12}/> : <Wrench size={12}/>}
                                         {item.status}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <button className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center gap-1 ml-auto group-hover:underline">
                                         Update Status <ArrowRight size={12}/>
                                     </button>
                                 </td>
                             </tr>
                         ))
                     )}
                 </tbody>
             </table>
         </div>
      </div>

      {/* --- MODAL FORM --- */}
      <AssetFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={selectedAsset}
        onSuccess={() => { if(onRefresh) onRefresh(); }}
      />
    </div>
  );
}

// --- MODAL FORM COMPONENT (WIDE & AUTOCOMPLETE - REUSED) ---
// Note: Kode Modal ini sama persis dengan yang ada di AssetInventory.tsx
// Idealnya dipisah ke file components/AssetFormModal.tsx agar DRY (Don't Repeat Yourself).
// Tapi sesuai request "per file", saya sertakan lagi di sini agar mandiri.

function AssetFormModal({ isOpen, onClose, initialData, onSuccess }: any) {
    const [mounted, setMounted] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Autocomplete States
    const [employeeList, setEmployeeList] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Initial State
    const [formData, setFormData] = useState<any>({
        name: '', category: 'Laptop', brand: '', model: '', serial_number: '',
        holder: '', status: 'Good', purchase_date: '', price: 0
    });

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

    // Fetch Employees & Freeze Scroll
    useEffect(() => {
        if (isOpen) {
            const fetchEmployees = async () => {
                const { data } = await supabase
                    .from('employees')
                    .select('id, full_name')
                    .eq('is_active', true)
                    .order('full_name', { ascending: true });
                if(data) setEmployeeList(data);
            };
            fetchEmployees();
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Click Outside Logic
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // LOAD DATA
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                category: initialData.category || 'Laptop',
                brand: initialData.brand || '',
                model: initialData.model || '',
                serial_number: initialData.serial_number || '',
                holder: initialData.holder || '',
                status: initialData.status || 'Good',
                purchase_date: initialData.purchase_date || '',
                price: initialData.price || 0
            });
        } else {
            setFormData({ name: '', category: 'Laptop', brand: '', model: '', serial_number: '', holder: '', status: 'Good', purchase_date: '', price: 0 });
        }
    }, [initialData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let val: string | number = value;

        if (type === 'number') {
            val = value === '' ? 0 : parseFloat(value);
        }

        setFormData({ ...formData, [name]: val });
    };

    const handleHolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, holder: e.target.value });
        setShowSuggestions(true);
    };

    const selectEmployee = (name: string) => {
        setFormData({ ...formData, holder: name });
        setShowSuggestions(false);
    };

    const filteredEmployees = employeeList.filter(emp => 
        emp.full_name.toLowerCase().includes((formData.holder || '').toLowerCase())
    );

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        
        const promise = new Promise(async (resolve, reject) => {
            let error;
            if (initialData?.id) {
                const { error: err } = await supabase.from('assets').update(formData).eq('id', initialData.id);
                error = err;
            } else {
                const { error: err } = await supabase.from('assets').insert([formData]);
                error = err;
            }

            if (error) reject(error.message);
            else {
                onSuccess();
                onClose();
                resolve("Data aset disimpan");
            }
        });

        toast.promise(promise, {
            loading: 'Menyimpan...',
            success: (msg) => `${msg}`,
            error: (err) => `Gagal: ${err}`
        });
        setSaving(false);
    };

    const handleDelete = async () => {
        if(!confirm("Hapus aset ini secara permanen?")) return;
        
        const promise = new Promise(async (resolve, reject) => {
            const { error } = await supabase.from('assets').delete().eq('id', initialData.id);
            if (error) reject(error.message);
            else {
                onSuccess();
                onClose();
                resolve("Aset dihapus");
            }
        });

        toast.promise(promise, {
            loading: 'Menghapus...',
            success: (msg) => `${msg}`,
            error: (err) => `Gagal hapus: ${err}`
        });
    };

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            {/* UPDATE: MAX-W-5XL (Horizontal Wide) */}
            <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-enter">
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 rounded-t-3xl">
                    <div>
                        <h3 className="font-bold text-xl text-slate-900">{initialData ? 'Edit Asset Details' : 'Register New Asset'}</h3>
                        <p className="text-slate-500 text-sm">Inventory Management</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors"><X size={24}/></button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSave}>
                        {/* GRID 3 KOLOM */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* Column 1: Basic Info */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2"><Tag size={14}/> Identification</h4>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Asset Name</label>
                                    <input required name="name" value={formData.name} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="e.g. MacBook Pro M3"/>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Brand</label><input name="brand" value={formData.brand} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" placeholder="Apple"/></div>
                                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Model</label><input name="model" value={formData.model} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" placeholder="A2338"/></div>
                                </div>
                            </div>

                            {/* Column 2: Specs & Status */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2"><Hash size={14}/> Technical & Status</h4>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                                    <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white">
                                        <option value="Laptop">Laptop</option><option value="Monitor">Monitor</option><option value="Phone">Phone</option><option value="Accessories">Accessories</option><option value="Furniture">Furniture</option>
                                    </select>
                                </div>
                                <div><label className="block text-xs font-bold text-slate-700 mb-1">Serial Number</label><input name="serial_number" value={formData.serial_number} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono text-slate-600" placeholder="SN12345678"/></div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                                    <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white">
                                        <option value="Good">Good</option><option value="Repair">Repair</option><option value="Broken">Broken</option><option value="Missing">Missing</option>
                                    </select>
                                </div>
                            </div>

                            {/* Column 3: Assignment & Finance */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2"><DollarSign size={14}/> Finance & User</h4>
                                
                                {/* AUTOCOMPLETE WRAPPER */}
                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 relative" ref={wrapperRef}>
                                    <label className="block text-xs font-bold text-indigo-800 mb-1 flex items-center gap-1"><User size={12}/> Assigned To</label>
                                    <div className="relative">
                                        <input 
                                            name="holder" 
                                            value={formData.holder} 
                                            onChange={handleHolderChange} 
                                            onFocus={() => setShowSuggestions(true)}
                                            className="w-full p-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                                            placeholder="Type employee name..."
                                            autoComplete="off"
                                        />
                                        <ChevronDown size={16} className="absolute right-3 top-2.5 text-indigo-300 pointer-events-none"/>
                                    </div>
                                    
                                    {/* DROPDOWN LIST */}
                                    {showSuggestions && (
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                            {filteredEmployees.length > 0 ? (
                                                filteredEmployees.map((emp) => (
                                                    <div 
                                                        key={emp.id} 
                                                        onClick={() => selectEmployee(emp.full_name)}
                                                        className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex items-center gap-2 text-sm text-slate-700 border-b border-slate-50 last:border-0"
                                                    >
                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                                            {emp.full_name.charAt(0)}
                                                        </div>
                                                        {emp.full_name}
                                                    </div>
                                                ))
                                            ) : (
                                                formData.holder.length > 0 && <div className="px-4 py-3 text-xs text-slate-400 italic text-center">Name not found. Using as free text.</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Price (IDR)</label><input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"/></div>
                                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Purchase Date</label><input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"/></div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-6 border-t border-slate-100 flex justify-between items-center mt-4">
                            {initialData && (
                                <button type="button" onClick={handleDelete} className="px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors">Delete Asset</button>
                            )}
                            <div className="flex gap-3 ml-auto">
                                <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                                <button disabled={saving} type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95">
                                    {saving ? <Loader2 size={16} className="animate-spin"/> : 'Save Asset'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}