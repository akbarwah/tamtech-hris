"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Papa from 'papaparse'; // Pastikan sudah npm install papaparse @types/papaparse
import { 
  Search, Mail, Phone, MapPin, Calendar, ChevronRight,
  Trash2, Loader2, Download, Upload, Info, LayoutGrid, List, Filter, ArrowUpDown, Briefcase, Plus, X
} from 'lucide-react';
import Link from 'next/link'; 

export default function EmployeePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- STATE VIEW & FILTER ---
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');       
  const [deptFilter, setDeptFilter] = useState('All');       
  const [statusFilter, setStatusFilter] = useState('All');   
  const [showFilters, setShowFilters] = useState(false);     
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });

  // State Actions
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // STATE IMPORT (LANGSUNG DI SINI)
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<{added: number, updated: number, skipped: number} | null>(null);
  const [allowUpdate, setAllowUpdate] = useState(true); // Default true agar data terupdate
  
  // State Add Manual
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ full_name: '', email: '', nik: '' });
  const [isAdding, setIsAdding] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Data
  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error:', error);
    else setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // --- FILTER & SORT LOGIC ---
  const processedEmployees = useMemo(() => {
    let result = employees.filter(emp => {
      const matchSearch = 
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.nik && emp.nik.includes(searchTerm)) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchRole = roleFilter === 'All' || (emp.job_position || 'Unassigned') === roleFilter;
      const matchDept = deptFilter === 'All' || (emp.department || 'Unassigned') === deptFilter;
      const matchStatus = statusFilter === 'All' || emp.employment_status === statusFilter;

      return matchSearch && matchRole && matchDept && matchStatus;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [employees, searchTerm, roleFilter, deptFilter, statusFilter, sortConfig]);

  const uniqueRoles = ['All', ...Array.from(new Set(employees.map(e => e.job_position || 'Unassigned')))];
  const uniqueDepts = ['All', ...Array.from(new Set(employees.map(e => e.department || 'Unassigned')))];

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // --- HANDLERS ---
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus ${name}? Data di GForm tetap aman.`)) return;
    setDeletingId(id);
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (!error) setEmployees(prev => prev.filter(emp => emp.id !== id));
    else alert("Gagal hapus (Mungkin data masih terhubung ke tabel lain). Cek Console.");
    setDeletingId(null);
  };

  const handleAddManual = async () => {
      if(!newEmployee.full_name || !newEmployee.email) return alert("Nama dan Email wajib diisi");
      setIsAdding(true);
      const { error } = await supabase.from('employees').insert([{
          full_name: newEmployee.full_name,
          email: newEmployee.email,
          nik: newEmployee.nik || null,
          is_active: true,
          employment_status: 'Contract',
          join_date: new Date().toISOString().split('T')[0]
      }]);
      
      if(!error) {
          setIsAddModalOpen(false);
          setNewEmployee({ full_name: '', email: '', nik: '' });
          fetchEmployees();
      } else {
          alert("Gagal tambah: " + error.message);
      }
      setIsAdding(false);
  };

  // --- EXPORT CSV ---
  const handleExport = () => {
    const headers = [
        "Full Name", "Email", "Phone", "NIK", 
        "Join Date", "Contract End Date", "Status", "Job Position", "Department",
        "Birth Place", "Birth Date", "Marital Status", "KTP Address", "Domicile Address", "NPWP Number",
        "Emergency Name", "Emergency Relation", "Emergency Phone",
        "Photo URL", "KTP Link", "NPWP Link", "Ijazah Link", "Bank Acc Link"
    ];

    const csvContent = [
      headers.join(","),
      ...employees.map(e => [
        `"${e.full_name}"`, e.email, `"${e.phone || ''}"`, `"${e.nik || ''}"`, 
        e.join_date, e.contract_end_date, e.employment_status, 
        `"${e.job_position || ''}"`, `"${e.department || ''}"`,
        `"${e.birth_place || ''}"`, e.birth_date, `"${e.marital_status || ''}"`,
        `"${e.ktp_address || ''}"`, `"${e.domicile_address || ''}"`, `"${e.npwp_number || ''}"`,
        `"${e.emergency_contact_name || ''}"`, `"${e.emergency_contact_relation || ''}"`, `"${e.emergency_contact_phone || ''}"`,
        e.photo_url || '', e.ktp_url || '', e.npwp_url || '', e.ijazah_url || '', e.bank_account_url || ''
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `employees_full_data_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // --- SMART IMPORT CSV (INTEGRATED) ---
  const handleImportClick = () => { fileInputRef.current?.click(); };

  // Helper untuk membersihkan BOM dan spasi
  const cleanKey = (key: string) => key ? key.trim().replace(/^\ufeff/, '') : '';

  // Helper Smart Mapping
  const getValue = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row);
    for (const searchKey of keys) {
      const foundKey = rowKeys.find(k => cleanKey(k).toLowerCase() === searchKey.toLowerCase());
      if (foundKey && row[foundKey]) {
        return String(row[foundKey]).trim();
      }
    }
    return null;
  };

  const processImport = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    // DEBUG: Alert ini HARUS muncul jika tombol diklik
    alert(`File dipilih: ${file.name}. Memulai proses...`);
    console.log("📂 File terpilih:", file);

    setIsImporting(true); 
    setImportStats(null);

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
            console.log("📊 Hasil Parse:", results);
            try {
                const rawData = results.data;
                if (!rawData || rawData.length === 0) throw new Error("File CSV kosong.");

                const formattedData = rawData.map((row: any, index: number) => {
                    const fullName = getValue(row, ['Full Name', 'full_name', 'fullName', 'Nama Lengkap']);
                    const email = getValue(row, ['Email', 'email', 'Alamat Email']);
                    
                    if (!fullName || !email) {
                        console.warn(`Row ${index + 1} skipped: Missing Name/Email`);
                        return null; 
                    }

                    return {
                        full_name: fullName,
                        email: email,
                        nik: getValue(row, ['NIK', 'nik']),
                        phone: getValue(row, ['Phone', 'phone', 'No HP']),
                        join_date: getValue(row, ['Join Date', 'join_date']) || new Date().toISOString().split('T')[0],
                        contract_end_date: getValue(row, ['Contract End Date', 'contract_end_date']),
                        employment_status: getValue(row, ['Employment Status', 'employment_status']) || 'Contract',
                        job_position: getValue(row, ['Job Position', 'job_position']),
                        department: getValue(row, ['Department', 'department']),
                        birth_place: getValue(row, ['Birth Place', 'birth_place']),
                        birth_date: getValue(row, ['Birth Date', 'birth_date']),
                        marital_status: getValue(row, ['Marital Status', 'marital_status']),
                        ktp_address: getValue(row, ['KTP Address', 'ktp_address']),
                        domicile_address: getValue(row, ['Domicile Address', 'domicile_address']),
                        npwp_number: getValue(row, ['NPWP Number', 'npwp_number']),
                        is_active: true,
                    };
                }).filter((item: any) => item !== null);

                console.log("🚀 Data siap kirim:", formattedData);

                if (formattedData.length === 0) throw new Error("Tidak ada data valid.");

                // UPSERT ke Supabase (Jika email sama, update data)
                const { data, error } = await supabase
                    .from('employees')
                    .upsert(formattedData, { onConflict: 'email', ignoreDuplicates: !allowUpdate })
                    .select();

                if (error) throw error;

                // Hitung Statistik Sederhana
                // (Supabase upsert tidak return detail inserted vs updated secara default, jadi kita asumsi success)
                setImportStats({ 
                    added: formattedData.length, 
                    updated: 0, 
                    skipped: rawData.length - formattedData.length 
                });
                
                alert(`Sukses! ${formattedData.length} karyawan diproses.`);
                fetchEmployees();

            } catch (err: any) {
                console.error("Import Error:", err);
                alert("Gagal Import: " + err.message);
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = ''; 
            }
        },
        error: (err: any) => {
            alert("Gagal Parsing CSV: " + err.message);
            setIsImporting(false);
        }
    });
  };

  return (
    <div className="space-y-6 animate-enter min-h-screen pb-20">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Database</h1>
          <p className="text-slate-500 text-sm">Direktori dan manajemen data karyawan.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
           {/* VIEW TOGGLE */}
           <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200">
                <button onClick={() => setViewMode('card')} className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'card' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <LayoutGrid size={16} /> Grid
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <List size={16} /> List
                </button>
           </div>

           <div className="h-6 w-px bg-slate-300 hidden sm:block"></div>

           {/* ADD BUTTON */}
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm w-full sm:w-auto justify-center"
           >
             <Plus size={16}/> Add Employee
           </button>

           <div className="h-6 w-px bg-slate-300 hidden sm:block"></div>

           {/* BULK ACTIONS */}
           <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
              <input type="checkbox" checked={allowUpdate} onChange={(e) => setAllowUpdate(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"/>
              <span className="text-xs font-bold text-slate-600">Overwrite?</span>
           </label>

           {/* HIDDEN INPUT UTAMA UNTUK IMPORT */}
           <input type="file" ref={fileInputRef} onChange={processImport} className="hidden" accept=".csv"/>
           
           <button onClick={handleImportClick} disabled={isImporting} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center">
             {isImporting ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>} Import
           </button>
           
           <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm w-full sm:w-auto justify-center">
             <Download size={16}/> Export
           </button>
        </div>
      </div>

      {/* NOTIFIKASI IMPORT */}
      {importStats && (
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4 animate-enter">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Info size={20}/></div>
            <div className="flex-1">
                <h4 className="font-bold text-slate-800 text-sm">Proses Import Selesai</h4>
                <p className="text-xs text-slate-500 mt-1">
                    <span className="font-bold text-emerald-600">{importStats.added} Data Diproses</span> • 
                    <span className="font-bold text-slate-400 ml-1">{importStats.skipped} Dilewati (Error/Kosong)</span>
                </p>
            </div>
            <button onClick={() => setImportStats(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Tutup</button>
        </div>
      )}

      {/* SEARCH & ADVANCED FILTER */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3 transition-all">
         <div className="flex items-center gap-2 w-full md:w-auto flex-1">
            <Search size={18} className="text-slate-400" />
            <input 
                type="text" 
                placeholder="Cari Nama, NIK, atau Email..." 
                className="flex-1 bg-transparent focus:outline-none text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         
         <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {/* Toggle Filters Button */}
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Filter size={16}/> Filters
            </button>

            {/* Filter Dropdowns */}
            {showFilters && (
                <div className="flex gap-2 animate-enter">
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 cursor-pointer">
                        {uniqueRoles.map(role => <option key={role} value={role}>{role === 'All' ? 'Semua Posisi' : role}</option>)}
                    </select>
                    <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 cursor-pointer">
                        {uniqueDepts.map(dept => <option key={dept} value={dept}>{dept === 'All' ? 'Semua Dept' : dept}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 cursor-pointer">
                        <option value="All">Semua Status</option>
                        <option value="Permanent">Permanent</option>
                        <option value="Contract">Contract</option>
                        <option value="Probation">Probation</option>
                    </select>
                </div>
            )}
         </div>
      </div>

      {/* CONTENT AREA */}
      {loading ? (
          <div className="flex justify-center items-center h-64 text-slate-400 gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
              Loading...
          </div>
      ) : viewMode === 'card' ? (
          
          // --- VIEW: GRID / CARD ---
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {processedEmployees.map((emp) => (
                <div key={emp.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 group relative">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xl overflow-hidden border-2 border-white shadow-sm">
                                {emp.photo_url ? <img src={emp.photo_url} alt={emp.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer"/> : emp.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{emp.full_name}</h3>
                                <p className="text-xs text-slate-500">{emp.job_position || 'No Position'}</p>
                            </div>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider ${
                            emp.employment_status === 'Permanent' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            emp.employment_status === 'Contract' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>{emp.employment_status}</span>
                    </div>
                    <hr className="border-slate-50 my-4"/>
                    <div className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-center gap-3"><div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md"><Mail size={14}/></div><span className="truncate text-slate-700 font-medium">{emp.email}</span></div>
                        <div className="flex items-center gap-3"><div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md"><Phone size={14}/></div><span className="text-slate-700 font-medium">{emp.phone || '-'}</span></div>
                        <div className="flex items-center gap-3"><div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md"><Calendar size={14}/></div><span className="text-slate-500 text-xs">Join: <span className="font-bold text-slate-900">{emp.join_date || '-'}</span></span></div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                        <button onClick={() => handleDelete(emp.id, emp.full_name)} disabled={deletingId === emp.id} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all">
                            {deletingId === emp.id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                        </button>
                        <Link href={`/employees/${emp.id}`} className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:gap-2 transition-all">
                            View Profile <ChevronRight size={16}/>
                        </Link>
                    </div>
                </div>
            ))}
          </div>

      ) : (

          // --- VIEW: LIST / TABLE ---
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-4 font-semibold text-slate-500 w-12 text-center">No</th>
                          <th className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('full_name')}>
                              <div className="flex items-center gap-1">Employee {sortConfig.key === 'full_name' && <ArrowUpDown size={14} className="text-indigo-500"/>}</div>
                          </th>
                          <th className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('job_position')}>
                              <div className="flex items-center gap-1">Role / Dept {sortConfig.key === 'job_position' && <ArrowUpDown size={14} className="text-indigo-500"/>}</div>
                          </th>
                          <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                          <th className="px-6 py-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('created_at')}>
                              <div className="flex items-center gap-1">Input Date {sortConfig.key === 'created_at' && <ArrowUpDown size={14} className="text-indigo-500"/>}</div>
                          </th>
                          <th className="px-6 py-4 font-semibold text-slate-700">Contact</th>
                          <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {processedEmployees.map((emp, index) => (
                          <tr key={emp.id} className="group hover:bg-indigo-50/30 transition-colors">
                             <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs">{index + 1}</td>
                             <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                     <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm overflow-hidden">
                                         {emp.photo_url ? <img src={emp.photo_url} alt="" className="w-full h-full object-cover"/> : emp.full_name.charAt(0)}
                                     </div>
                                     <div>
                                         <div className="font-bold text-slate-900">{emp.full_name}</div>
                                         <div className="text-xs text-slate-500 font-mono">{emp.nik || 'No NIK'}</div>
                                     </div>
                                 </div>
                             </td>
                             <td className="px-6 py-4">
                                 <div className="font-medium text-slate-700">{emp.job_position || '-'}</div>
                                 <div className="text-xs text-slate-500">{emp.department || '-'}</div>
                             </td>
                             <td className="px-6 py-4">
                                 <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                     emp.employment_status === 'Permanent' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                     emp.employment_status === 'Contract' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                     'bg-slate-50 text-slate-600 border-slate-200'
                                 }`}>{emp.employment_status}</span>
                             </td>
                             <td className="px-6 py-4 text-slate-600 text-xs font-mono">
                                 {new Date(emp.created_at).toLocaleDateString()}
                             </td>
                             <td className="px-6 py-4 text-xs text-slate-500 space-y-1">
                                 <div className="flex items-center gap-1.5"><Mail size={12}/> {emp.email}</div>
                                 <div className="flex items-center gap-1.5"><Phone size={12}/> {emp.phone || '-'}</div>
                             </td>
                             <td className="px-6 py-4 text-right">
                                 <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Link href={`/employees/${emp.id}`} className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100" title="View Profile">
                                         <ChevronRight size={16}/>
                                     </Link>
                                     <button onClick={() => handleDelete(emp.id, emp.full_name)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Delete">
                                         <Trash2 size={16}/>
                                     </button>
                                 </div>
                             </td>
                          </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
      )}

      {/* --- MODAL ADD MANUAL --- */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-enter">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-slate-900">Add New Employee</h3>
                      <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                          <input type="text" className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" value={newEmployee.full_name} onChange={e => setNewEmployee({...newEmployee, full_name: e.target.value})}/>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                          <input type="email" className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})}/>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">NIK (Optional)</label>
                          <input type="text" className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" value={newEmployee.nik} onChange={e => setNewEmployee({...newEmployee, nik: e.target.value})}/>
                      </div>
                  </div>
                  <div className="mt-6 flex gap-2 justify-end">
                      <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-lg">Cancel</button>
                      <button onClick={handleAddManual} disabled={isAdding} className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                          {isAdding ? <Loader2 size={16} className="animate-spin"/> : <><Plus size={16}/> Create Employee</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}