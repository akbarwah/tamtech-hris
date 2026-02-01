"use client";

import React, { useState, useMemo } from 'react';
import { 
  ExternalLink, Pencil, Trash2, CheckCircle2, XCircle, Clock, 
  Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, 
  Eye, EyeOff // <--- Icon Privacy
} from 'lucide-react';

// Helper Format Date
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

// Helper Format Rupiah
const formatRupiah = (amount: number | null) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

interface ContractTableProps {
  contracts: any[];
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
}

export default function ContractTable({ contracts = [], onEdit, onDelete }: ContractTableProps) {
  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showSalary, setShowSalary] = useState(false); // Default sembunyikan gaji
  
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // --- LOGIC SORTING & FILTERING ---
  const filteredData = useMemo(() => {
    let data = [...contracts];

    // 1. Filtering
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(item => 
        item.employees?.full_name?.toLowerCase().includes(lower) ||
        item.contract_number?.toLowerCase().includes(lower)
      );
    }
    if (statusFilter !== 'All') {
      data = data.filter(item => item.status === statusFilter);
    }
    if (typeFilter !== 'All') {
      data = data.filter(item => item.contract_type === typeFilter);
    }

    // 2. Sorting
    if (sortConfig) {
      data.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle Nested Object (Employee Name)
        if (sortConfig.key === 'employee_name') {
            aValue = a.employees?.full_name || '';
            bValue = b.employees?.full_name || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [contracts, searchTerm, statusFilter, typeFilter, sortConfig]);

  // --- HANDLER SORT ---
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Helper Icon Sort
  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="text-slate-300 ml-1" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-indigo-600 ml-1" /> 
      : <ArrowDown size={14} className="text-indigo-600 ml-1" />;
  };

  // Extract Unique Types for Dropdown
  const uniqueTypes = Array.from(new Set(contracts.map(c => c.contract_type))).filter(Boolean);

  return (
    <div className="space-y-4 animate-enter">
      
      {/* --- TOOLBAR (SEARCH & FILTER) --- */}
      <div className="flex flex-col xl:flex-row gap-3 justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative w-full xl:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
              <input 
                type="text" 
                placeholder="Cari nama atau no. kontrak..." 
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          
          <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
              {/* Filter Type */}
              <div className="relative">
                  <select 
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer font-medium hover:bg-slate-100 transition-colors"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                      <option value="All">Semua Tipe</option>
                      {uniqueTypes.map((t: any) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Filter size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none"/>
              </div>

              {/* Filter Status */}
              <div className="relative">
                  <select 
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer font-medium hover:bg-slate-100 transition-colors"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                      <option value="All">Semua Status</option>
                      <option value="Active">Aktif</option>
                      <option value="Completed">Selesai</option>
                      <option value="Terminated">Diberhentikan</option>
                  </select>
                  <Filter size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none"/>
              </div>

              {/* Privacy Toggle Button */}
              <button 
                onClick={() => setShowSalary(!showSalary)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    showSalary 
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
                title={showSalary ? "Sembunyikan Nilai" : "Tampilkan Nilai"}
              >
                  {showSalary ? <EyeOff size={16}/> : <Eye size={16}/>}
                  <span className="hidden sm:inline">{showSalary ? "Hide Values" : "Show Values"}</span>
              </button>
          </div>
      </div>

      {/* --- TABLE --- */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th 
                  className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('employee_name')}
                >
                  <div className="flex items-center">Karyawan {getSortIcon('employee_name')}</div>
                </th>
                <th 
                  className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('contract_type')}
                >
                  <div className="flex items-center">Tipe {getSortIcon('contract_type')}</div>
                </th>
                <th 
                  className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('start_date')}
                >
                  <div className="flex items-center">Periode {getSortIcon('start_date')}</div>
                </th>

                {/* KOLOM GAJI BARU */}
                <th 
                  className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('base_salary')}
                >
                  <div className="flex items-center">Gaji Pokok {getSortIcon('base_salary')}</div>
                </th>
                <th 
                  className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('fixed_allowance')}
                >
                  <div className="flex items-center">Tunjangan {getSortIcon('fixed_allowance')}</div>
                </th>

                <th 
                  className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">Status {getSortIcon('status')}</div>
                </th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((c) => {
                // Logic EWS per baris
                const isExpiring = c.end_date && c.status === 'Active' && new Date(c.end_date) <= new Date(new Date().setDate(new Date().getDate() + 30));
                
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{c.employees?.full_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{c.contract_number || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{c.contract_type}</td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600 font-mono text-xs">{formatDate(c.start_date)}</div>
                      {c.end_date && (
                        <div className={`text-xs font-mono mt-0.5 ${isExpiring ? 'text-red-600 font-bold flex items-center gap-1' : 'text-slate-400'}`}>
                          {isExpiring && <Clock size={10}/>} Until: {formatDate(c.end_date)}
                        </div>
                      )}
                    </td>

                    {/* DATA GAJI & TUNJANGAN */}
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {showSalary ? (
                            <span className="text-emerald-700 font-medium">{formatRupiah(c.base_salary)}</span>
                        ) : (
                            <span className="text-slate-300 select-none">Rp •••••••</span>
                        )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {showSalary ? (
                            <span className="text-indigo-700 font-medium">{formatRupiah(c.fixed_allowance)}</span>
                        ) : (
                            <span className="text-slate-300 select-none">Rp •••••••</span>
                        )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                        c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                        c.status === 'Terminated' ? 'bg-red-50 text-red-700 border border-red-100' :
                        'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {c.status === 'Active' && <CheckCircle2 size={10} />}
                        {c.status === 'Completed' && <Clock size={10} />}
                        {c.status === 'Terminated' && <XCircle size={10} />}
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {c.doc_url && (
                          <a href={c.doc_url} target="_blank" rel="noreferrer" className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100" title="Lihat Dokumen">
                            <ExternalLink size={16}/>
                          </a>
                        )}
                        <button onClick={() => onEdit(c)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors" title="Edit">
                          <Pencil size={16}/>
                        </button>
                        <button onClick={() => onDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400 italic bg-white">
                    Tidak ada data kontrak yang cocok dengan filter Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}