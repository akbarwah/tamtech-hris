"use client";

import React, { useState, useMemo } from 'react';
import { Search, LayoutGrid, List, Laptop, Monitor, Box, Smartphone, MoreHorizontal, User, AlertTriangle, Calendar } from 'lucide-react';

interface InventoryProps {
  assets: any[];
  onEdit: (asset: any) => void;
}

export default function AssetInventory({ assets, onEdit }: InventoryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex-1">
           <Search size={16} className="text-slate-400" />
           <input type="text" placeholder="Search asset name, SN, or holder..." className="bg-transparent focus:outline-none text-sm w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
           <select className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 focus:outline-none" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="All">All Categories</option>
              <option value="Laptop">Laptop</option>
              <option value="Monitor">Monitor</option>
              <option value="Phone">Phone</option>
              <option value="Accessories">Accessories</option>
           </select>
           <select className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 focus:outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Good">Good</option>
              <option value="Repair">Repair</option>
              <option value="Broken">Broken</option>
              <option value="Missing">Missing</option>
           </select>
           <div className="flex bg-slate-100 p-1 rounded-lg">
               <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><LayoutGrid size={16}/></button>
               <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><List size={16}/></button>
           </div>
        </div>
      </div>

      {/* CONTENT */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((item) => (
             <div key={item.id} onClick={() => onEdit(item)} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden">
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
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.status === 'Good' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{item.status}</span>
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
                    <tr key={item.id} onClick={() => onEdit(item)} className="hover:bg-slate-50 cursor-pointer group">
                       <td className="px-6 py-3 font-medium text-slate-900">
                          {item.name}
                          <div className="text-xs text-slate-400 font-mono">{item.serial_number}</div>
                       </td>
                       <td className="px-6 py-3">{item.category}</td>
                       <td className="px-6 py-3"><span className={`text-xs px-2 py-1 rounded font-bold ${item.holder ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{item.holder || 'Stock'}</span></td>
                       <td className="px-6 py-3 text-slate-500">{item.purchase_date || '-'}</td>
                       <td className="px-6 py-3 font-mono text-slate-600">{item.price ? formatIDR(item.price) : '-'}</td>
                       <td className="px-6 py-3">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded ${item.status === 'Good' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{item.status}</span>
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
    </div>
  );
}