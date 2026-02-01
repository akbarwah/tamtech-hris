"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Archive, Wrench, Building2 } from 'lucide-react';

// Import Sub-Components
import AssetStats from './components/AssetStats';
import AssetInventory from './components/AssetInventory';
import AssetMaintenance from './components/AssetMaintenance';
import FacilityManagement from './components/FacilityManagement'; 

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'maintenance' | 'facility'>('inventory');
  
  const [assets, setAssets] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    
    // 1. Get Assets (Sorted by Newest)
    const { data: assetData } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
    if (assetData) setAssets(assetData);

    // 2. Get Facilities (Sorted by Maintenance Date)
    const { data: facData } = await supabase.from('facilities').select('*').order('next_maintenance', { ascending: true });
    if (facData) setFacilities(facData);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6 animate-enter pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset & Facility</h1>
          <p className="text-slate-500 text-sm">Manage inventory, assignments, and building facilities.</p>
        </div>
      </div>

      {/* STATS (Hanya muncul di tab Inventory & Maintenance) */}
      {activeTab !== 'facility' && (
        <div className="animate-enter">
            <AssetStats assets={assets} />
        </div>
      )}

      {/* TABS */}
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
        <div key={activeTab} className="animate-enter">
            {activeTab === 'inventory' && (
                <AssetInventory 
                    assets={assets} 
                    onRefresh={fetchData} 
                />
            )}
            {activeTab === 'maintenance' && (
                <AssetMaintenance 
                    assets={assets} 
                    onRefresh={fetchData} 
                />
            )}
            {activeTab === 'facility' && (
                <FacilityManagement 
                    facilities={facilities} 
                    refreshData={fetchData} 
                />
            )}
        </div>
      )}
    </div>
  );
}