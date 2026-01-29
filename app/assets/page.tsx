"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { PlusCircle, Loader2, X, Archive, Wrench, Building2, Trash2 } from 'lucide-react';

// Import Sub-Components
import AssetStats from './components/AssetStats';
import AssetInventory from './components/AssetInventory';
import AssetMaintenance from './components/AssetMaintenance';
import FacilityManagement from './components/FacilityManagement'; // Pastikan file ini ada

export default function AssetsPage() {
  // Tambahkan 'facility' ke state tab
  const [activeTab, setActiveTab] = useState<'inventory' | 'maintenance' | 'facility'>('inventory');
  
  const [assets, setAssets] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]); // State untuk data AC/GA
  const [loading, setLoading] = useState(true);
  
  // Modal States Asset
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State Asset
  const [formData, setFormData] = useState({
    id: '', name: '', category: '', serial_number: '', holder: '', status: 'Good',
    brand: '', model: '', price: '', purchase_date: '', warranty_expiry: ''
  });

  // --- FETCH DATA (ASSETS & FACILITIES) ---
  const fetchData = async () => {
    setLoading(true);
    
    // 1. Get Assets
    const { data: assetData } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
    if (assetData) setAssets(assetData);

    // 2. Get Facilities (AC, Security, etc)
    const { data: facData } = await supabase.from('facilities').select('*').order('next_maintenance', { ascending: true });
    if (facData) setFacilities(facData);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- HANDLERS ASSET ---
  const handleEdit = (asset: any) => {
    setEditingId(asset.id); 
    setFormData({
        id: asset.id, 
        name: asset.name, category: asset.category, serial_number: asset.serial_number, holder: asset.holder || '', status: asset.status,
        brand: asset.brand || '', model: asset.model || '', price: asset.price || '', 
        purchase_date: asset.purchase_date || '', warranty_expiry: asset.warranty_expiry || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const rawPrice = formData.price ? formData.price.toString().replace(/\D/g, '') : '';
    const payload = { 
        id: formData.id, name: formData.name, category: formData.category, serial_number: formData.serial_number, holder: formData.holder, status: formData.status, brand: formData.brand, model: formData.model,
        price: rawPrice === '' ? 0 : parseInt(rawPrice), 
        purchase_date: formData.purchase_date === '' ? null : formData.purchase_date,
        warranty_expiry: formData.warranty_expiry === '' ? null : formData.warranty_expiry
    };

    let error;
    if (editingId) {
       const { error: err } = await supabase.from('assets').update(payload).eq('id', editingId);
       error = err;
    } else {
       const { error: err } = await supabase.from('assets').insert([payload]);
       error = err;
    }

    if (error) alert('Gagal menyimpan: ' + error.message);
    else { setIsModalOpen(false); resetForm(); fetchData(); }
    setIsSaving(false);
  };

  const handleDeleteAsset = async () => {
    if(!confirm("Are you sure you want to delete this asset?")) return;
    setIsDeleting(true);
    const { error } = await supabase.from('assets').delete().eq('id', editingId);
    if (!error) { setIsModalOpen(false); resetForm(); fetchData(); }
    setIsDeleting(false);
  };

  const resetForm = () => {
    setFormData({ id: '', name: '', category: '', serial_number: '', holder: '', status: 'Good', brand: '', model: '', price: '', purchase_date: '', warranty_expiry: '' });
    setEditingId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-6 animate-enter pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset & Facility</h1>
          <p className="text-slate-500 text-sm">Manage inventory, assignments, and building facilities.</p>
        </div>
        {/* Tombol Register Asset hanya muncul di tab Inventory/Maintenance */}
        {activeTab !== 'facility' && (
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">
            <PlusCircle size={18} /> Register Asset
            </button>
        )}
      </div>

      {/* STATS DASHBOARD (Hanya relevan untuk Asset IT) */}
      {activeTab !== 'facility' && <AssetStats assets={assets} />}

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-6 border-b border-slate-200 mb-6 px-2 sticky top-0 bg-slate-50/80 backdrop-blur-sm z-10">
        <button onClick={() => setActiveTab('inventory')} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'inventory' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Archive size={18}/> IT Inventory
        </button>
        <button onClick={() => setActiveTab('maintenance')} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'maintenance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Wrench size={18}/> IT Maintenance
        </button>
        <button onClick={() => setActiveTab('facility')} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'facility' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Building2 size={18}/> Facility (GA)
        </button>
      </div>

      {/* CONTENT AREA */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-300" size={32}/></div>
      ) : (
        <>
            {activeTab === 'inventory' && <AssetInventory assets={assets} onEdit={handleEdit} />}
            {activeTab === 'maintenance' && <AssetMaintenance assets={assets} onEdit={handleEdit} />}
            
            {/* INI YANG BARU DITAMBAHKAN */}
            {activeTab === 'facility' && <FacilityManagement facilities={facilities} refreshData={fetchData} />}
        </>
      )}

      {/* --- MODAL ASSET FORM --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-enter flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-start">
              <div><h2 className="text-xl font-bold text-slate-900">{editingId ? 'Edit Asset' : 'Register New Asset'}</h2><p className="text-slate-500 text-sm">Inventory details.</p></div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <div className="overflow-y-auto p-8">
                <form onSubmit={handleSaveAsset}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Column 1: Identity */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Identification</h3>
                            <div><label className="text-xs font-bold text-slate-500">Asset Tag ID</label><input required name="id" value={formData.id} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1 focus:bg-white focus:ring-2 focus:ring-indigo-500/20" placeholder="AST-001" disabled={!!editingId} /></div>
                            <div><label className="text-xs font-bold text-slate-500">Item Name</label><input required name="name" value={formData.name} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1" placeholder="MacBook Pro" /></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-xs font-bold text-slate-500">Brand</label><input name="brand" value={formData.brand} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1" placeholder="Apple" /></div>
                                <div><label className="text-xs font-bold text-slate-500">Model</label><input name="model" value={formData.model} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1" placeholder="M3 Pro" /></div>
                            </div>
                        </div>
                        {/* Column 2: Specs & Status */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Details</h3>
                            <div><label className="text-xs font-bold text-slate-500">Category</label><select name="category" value={formData.category} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1"><option value="">Select...</option><option value="Laptop">Laptop</option><option value="Monitor">Monitor</option><option value="Phone">Phone</option><option value="Accessories">Accessories</option><option value="Furniture">Furniture</option></select></div>
                            <div><label className="text-xs font-bold text-slate-500">Serial Number</label><input name="serial_number" value={formData.serial_number} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1" placeholder="S/N 123..." /></div>
                            <div><label className="text-xs font-bold text-slate-500">Condition</label><select name="status" value={formData.status} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1"><option value="Good">Good</option><option value="Repair">Repair</option><option value="Broken">Broken</option><option value="Missing">Missing</option></select></div>
                        </div>
                        {/* Column 3: Assignment & Finance */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Assignment & Finance</h3>
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                <label className="text-xs font-bold text-indigo-800">Assigned To (Holder)</label>
                                <div className="flex items-center gap-2 mt-1"><input name="holder" value={formData.holder} onChange={handleChange} className="w-full bg-transparent border-b border-indigo-200 text-sm py-1 focus:outline-none focus:border-indigo-500" placeholder="Employee Name" /></div>
                            </div>
                            <div><label className="text-xs font-bold text-slate-500">Purchase Price (IDR)</label><input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1" placeholder="15000000" /></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-xs font-bold text-slate-500">Purchase Date</label><input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1" /></div>
                                <div><label className="text-xs font-bold text-slate-500">Warranty Ends</label><input type="date" name="warranty_expiry" value={formData.warranty_expiry} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1" /></div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                        {editingId ? (<button type="button" onClick={handleDeleteAsset} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">{isDeleting ? <Loader2 className="animate-spin"/> : <Trash2 size={16}/>} Delete Asset</button>) : <div></div>}
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-sm">Cancel</button>
                            <button disabled={isSaving} type="submit" className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm shadow-lg shadow-indigo-200 flex items-center gap-2">{isSaving ? <Loader2 size={16} className="animate-spin"/> : 'Save Asset'}</button>
                        </div>
                    </div>
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}