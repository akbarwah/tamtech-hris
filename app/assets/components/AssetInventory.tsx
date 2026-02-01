"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; 
import { supabase } from '@/lib/supabaseClient';
import { 
  Search, LayoutGrid, List, Laptop, Monitor, Box, Smartphone, 
  MoreHorizontal, User, Plus, X, Loader2, Save, Tag, Hash, DollarSign, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner'; // 1. IMPORT SONNER

interface InventoryProps {
  assets: any[];
  onEdit?: (asset: any) => void; 
  onRefresh?: () => void; 
}

export default function AssetInventory({ assets, onEdit, onRefresh }: InventoryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null); 

  // Helper: Format Price
  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  // Helper: Get Icon
  const getIcon = (cat: string) => {
    switch(cat) {
      case 'Laptop': return <Laptop size={20}/>;
      case 'Monitor': return <Monitor size={20}/>;
      case 'Phone': return <Smartphone size={20}/>;
      default: return <Box size={20}/>;
    }
  };

  // Filter Logic
  const filteredAssets = useMemo(() => {
    return assets.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.holder?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === 'All' || item.category === categoryFilter;
      const matchStatus = statusFilter === 'All' || item.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [assets, searchTerm, categoryFilter, statusFilter]);

  // Handlers
  const handleEditClick = (asset: any) => {
      setSelectedAsset(asset);
      setIsModalOpen(true);
  };

  const handleAddClick = () => {
      setSelectedAsset(null);
      setIsModalOpen(true);
  };

  return (
    <div className="space-y-4 animate-enter">
      {/* Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex-1">
           <Search size={16} className="text-slate-400" />
           <input type="text" placeholder="Search asset name, SN, or holder..." className="bg-transparent focus:outline-none text-sm w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
           <select className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 focus:outline-none cursor-pointer" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="All">All Categories</option>
              <option value="Laptop">Laptop</option>
              <option value="Monitor">Monitor</option>
              <option value="Phone">Phone</option>
              <option value="Accessories">Accessories</option>
           </select>
           <select className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 focus:outline-none cursor-pointer" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Good">Good</option>
              <option value="Repair">Repair</option>
              <option value="Broken">Broken</option>
              <option value="Missing">Missing</option>
           </select>
           <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
               <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><LayoutGrid size={16}/></button>
               <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><List size={16}/></button>
           </div>
           
           <button onClick={handleAddClick} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 ml-2">
               <Plus size={16} /> <span className="hidden sm:inline">Add Asset</span>
           </button>
        </div>
      </div>

      {/* CONTENT */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((item) => (
             <div key={item.id} onClick={() => handleEditClick(item)} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.status === 'Good' ? 'bg-emerald-500' : item.status === 'Repair' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                
                <div className="flex justify-between items-start mb-3 pl-2">
                   <div className="p-2 bg-slate-50 rounded-lg text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">{getIcon(item.category)}</div>
                   <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{item.id}</span>
                </div>
                
                <div className="pl-2">
                   <h3 className="font-bold text-slate-800 text-sm truncate">{item.name}</h3>
                   <p className="text-xs text-slate-500 mb-3 truncate">{item.brand} {item.model}</p>
                   
                   <div className="flex items-center gap-2 mb-3 bg-slate-50 p-2 rounded-lg">
                      <User size={14} className="text-slate-400"/>
                      <span className="text-xs font-semibold text-slate-700 truncate">{item.holder || 'Available in Stock'}</span>
                   </div>

                   <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.status === 'Good' ? 'bg-emerald-50 text-emerald-600' : item.status === 'Repair' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{item.status}</span>
                      <span className="text-xs font-bold text-slate-400">{item.price ? formatIDR(item.price) : '-'}</span>
                   </div>
                </div>
             </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
           <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500">
                 <tr>
                    <th className="px-6 py-3">Asset Name</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Assigned To</th>
                    <th className="px-6 py-3">Purchase Date</th>
                    <th className="px-6 py-3">Price</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {filteredAssets.map(item => (
                    <tr key={item.id} onClick={() => handleEditClick(item)} className="hover:bg-slate-50 cursor-pointer group">
                       <td className="px-6 py-3 font-medium text-slate-900">
                          {item.name}
                          <div className="text-xs text-slate-400 font-mono">{item.serial_number}</div>
                       </td>
                       <td className="px-6 py-3">{item.category}</td>
                       <td className="px-6 py-3"><span className={`text-xs px-2 py-1 rounded font-bold ${item.holder ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{item.holder || 'Stock'}</span></td>
                       <td className="px-6 py-3 text-slate-500">{item.purchase_date || '-'}</td>
                       <td className="px-6 py-3 font-mono text-slate-600">{item.price ? formatIDR(item.price) : '-'}</td>
                       <td className="px-6 py-3">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded ${item.status === 'Good' ? 'bg-emerald-50 text-emerald-600' : item.status === 'Repair' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{item.status}</span>
                       </td>
                       <td className="px-6 py-3 text-right">
                          <MoreHorizontal size={16} className="text-slate-300 group-hover:text-indigo-600 ml-auto"/>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {/* --- MODAL PORTAL --- */}
      <AssetFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={selectedAsset}
        onSuccess={() => { if (onRefresh) onRefresh(); }}
      />
    </div>
  );
}

// --- MODAL FORM: WIDE & AUTOCOMPLETE ---
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

    // Fetch Employees for Autocomplete
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

    // Click Outside logic for dropdown
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
            // FIX: Jika kosong, set jadi 0 agar tidak NaN. 
            // parseFloat("") akan return NaN, dan itu yang bikin error.
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
        
        const savePromise = new Promise(async (resolve, reject) => {
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

        toast.promise(savePromise, {
            loading: 'Menyimpan...',
            success: (msg) => `${msg}`,
            error: (err) => `Gagal: ${err}`
        });
        
        setSaving(false);
    };

    const handleDelete = async () => {
        if(!confirm("Hapus aset ini secara permanen?")) return;
        
        const deletePromise = new Promise(async (resolve, reject) => {
            const { error } = await supabase.from('assets').delete().eq('id', initialData.id);
            if (error) reject(error.message);
            else {
                onSuccess(); 
                onClose();
                resolve("Deleted");
            }
        });

        toast.promise(deletePromise, {
            loading: 'Menghapus...',
            success: 'Aset dihapus',
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