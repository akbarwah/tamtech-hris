"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { supabase } from '@/lib/supabaseClient';
import { Download, Upload, FileSpreadsheet, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner'; // 1. IMPORT TOAST

interface CsvToolsProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; 
}

export default function CsvTools({ isOpen, onClose, onSuccess }: CsvToolsProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [dataType, setDataType] = useState<'contract' | 'career'>('contract');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Portal State
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // --- FREEZE SCROLL ---
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // --- HELPER 1: HEADER MAPPER ---
  const normalizeKey = (header: string, type: 'contract' | 'career') => {
    const h = header.toLowerCase().replace(/[^a-z0-9]/g, ''); 
    
    if (h.includes('email')) return 'email';
    if (h.includes('link') || h.includes('doc')) return 'doc_url';
    if (h.includes('status')) return 'status';

    if (type === 'contract') {
        if (h.includes('number') || h.includes('no') || h.includes('nomor')) return 'contract_number';
        if (h.includes('type') || h.includes('tipe')) return 'contract_type';
        if (h.includes('start') || h.includes('mulai')) return 'start_date';
        if (h.includes('end') || h.includes('akhir') || h.includes('selesai')) return 'end_date';
        // SALARY MAPPING
        if (h.includes('salary') || h.includes('gaji') || h.includes('base')) return 'base_salary';
        if (h.includes('allowance') || h.includes('tunjangan')) return 'fixed_allowance';
    } else {
        if (h.includes('move') || h.includes('type') || h.includes('gerak')) return 'movement_type';
        if (h.includes('effective') || h.includes('efektif')) return 'effective_date';
        if (h.includes('sk') || h.includes('surat')) return 'sk_number';
        if (h.includes('position') || h.includes('posisi') || h.includes('jabatan')) return 'new_position';
        if (h.includes('dept') || h.includes('departemen')) return 'new_dept';
    }
    return h;
  };

  // --- HELPER 2: DATE FIXER ---
  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) return cleanStr;
    const parts = cleanStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (parts) {
        const day = parts[1].padStart(2, '0');
        const month = parts[2].padStart(2, '0');
        const year = parts[3];
        return `${year}-${month}-${day}`;
    }
    return null; 
  };

  // --- 1. EXPORT LOGIC ---
  const handleExport = async () => {
    setIsProcessing(true);
    toast.info("Menyiapkan data untuk export..."); // Feedback awal

    try {
      const table = dataType === 'contract' ? 'employment_contracts' : 'career_history';
      const { data, error } = await supabase.from(table).select(`*, employees(full_name, email)`);

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.warning("Tidak ada data untuk diexport.");
        setIsProcessing(false); return;
      }

      let csvContent = "data:text/csv;charset=utf-8,";
      if (dataType === 'contract') {
        csvContent += "Employee Name,Email,Contract No,Type,Start Date,End Date,Status,Base Salary,Fixed Allowance,Link Doc\n";
        data.forEach((row: any) => {
          const salary = row.base_salary || 0;
          const allowance = row.fixed_allowance || 0;
          csvContent += `"${row.employees?.full_name}","${row.employees?.email}","${row.contract_number}","${row.contract_type}","${row.start_date}","${row.end_date || ''}","${row.status}","${salary}","${allowance}","${row.doc_url || ''}"\n`;
        });
      } else {
        csvContent += "Employee Name,Email,Move Type,New Position,New Dept,Effective Date,SK Number,Link Doc\n";
        data.forEach((row: any) => {
          csvContent += `"${row.employees?.full_name}","${row.employees?.email}","${row.movement_type}","${row.new_position}","${row.new_dept}","${row.effective_date}","${row.sk_number || ''}","${row.doc_url || ''}"\n`;
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${dataType}_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Export berhasil!");

    } catch (err: any) { 
        toast.error("Export Gagal: " + err.message); 
    } 
    finally { setIsProcessing(false); }
  };

  // --- 2. TEMPLATE DOWNLOAD ---
  const downloadTemplate = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (dataType === 'contract') {
      csvContent += "Email,Contract No,Type,Start Date,End Date,Base Salary,Fixed Allowance,Link Doc,Status\n";
      csvContent += "user@company.com,001/PKWT/2026,PKWT (Baru),01/01/2026,31/12/2026,5000000,500000,https://drive.google.com/...,Active";
    } else {
      csvContent += "Email,Move Type,Effective Date,New Position,New Dept,SK Number,Link Doc\n";
      csvContent += "user@company.com,Promotion,01/01/2026,Senior Staff,Marketing,001/SK/2026,https://drive.google.com/...";
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TEMPLATE_${dataType.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    toast.success("Template berhasil didownload");
  };

  // --- 3. IMPORT LOGIC ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      parseCSV(e.target.files[0]);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = async ({ target }) => {
      if (!target?.result) return;
      let csv = target.result as string;
      
      csv = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = csv.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) { 
          setLogs(['Error: File empty or no header.']); 
          toast.error("File CSV kosong atau format salah");
          return; 
      }

      // Auto-Detect Separator
      const headerLine = lines[0];
      const separator = (headerLine.match(/;/g) || []).length > (headerLine.match(/,/g) || []).length ? ';' : ',';
      
      const rawHeaders = headerLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
      const mappedHeaders = rawHeaders.map(h => normalizeKey(h, dataType));

      const parsedRows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = {};
        let hasData = false;
        
        mappedHeaders.forEach((key, index) => {
            if (values[index]) { row[key] = values[index]; hasData = true; }
        });

        if (hasData && row.email) {
            if (row.start_date) row.start_date = normalizeDate(row.start_date);
            if (row.end_date) row.end_date = normalizeDate(row.end_date);
            if (row.effective_date) row.effective_date = normalizeDate(row.effective_date);
            
            if (row.base_salary) row.base_salary = parseInt(row.base_salary.replace(/[^0-9]/g, '')) || 0;
            if (row.fixed_allowance) row.fixed_allowance = parseInt(row.fixed_allowance.replace(/[^0-9]/g, '')) || 0;

            parsedRows.push(row);
        }
      }
      setPreviewData(parsedRows);
      setLogs([`File loaded. ${parsedRows.length} rows found.`]);
      toast.info(`${parsedRows.length} baris data ditemukan.`);
    };
    reader.readAsText(file);
  };

  // --- 4. PROCESS IMPORT ---
  const processImport = async () => {
    setIsProcessing(true);
    const newLogs: string[] = [];
    let successCount = 0; let failCount = 0;

    const importPromise = new Promise(async (resolve, reject) => {
        try {
            const { data: employees } = await supabase.from('employees').select('id, email').eq('is_active', true);
            const empMap = new Map(employees?.map(e => [e.email.trim().toLowerCase(), e.id]));

            for (const row of previewData) {
                const empId = empMap.get(row.email?.trim().toLowerCase());
                if (!empId) {
                    newLogs.push(`❌ Skipped: Email '${row.email}' not found.`);
                    failCount++; continue;
                }

                const dateCheck = dataType === 'contract' ? row.start_date : row.effective_date;
                if (!dateCheck) {
                    newLogs.push(`⚠️ Skipped: ${row.email} missing valid date.`);
                    failCount++; continue;
                }

                if (dataType === 'contract') {
                    const payload = {
                        employee_id: empId,
                        contract_number: row.contract_number || `IMP-${Date.now()}`,
                        contract_type: row.contract_type || 'PKWT (Perpanjangan)',
                        start_date: row.start_date,
                        end_date: row.end_date || null,
                        base_salary: row.base_salary || 0,
                        fixed_allowance: row.fixed_allowance || 0,
                        doc_url: row.doc_url,
                        status: row.status || 'Active'
                    };
                    await supabase.from('employment_contracts').insert([payload]);
                    
                    // Update Employee Status
                    await supabase.from('employees').update({
                        employment_status: row.contract_type === 'Permanent' ? 'Permanent' : 'Contract',
                        contract_end_date: row.end_date || null
                    }).eq('id', empId);
                } else {
                    const payload = {
                        employee_id: empId,
                        movement_type: row.movement_type || 'Adjustment',
                        sk_number: row.sk_number,
                        effective_date: row.effective_date,
                        new_position: row.new_position || 'Updated via CSV',
                        new_dept: row.new_dept || 'Updated via CSV',
                        prev_position: '-', prev_dept: '-',
                        doc_url: row.doc_url
                    };
                    await supabase.from('career_history').insert([payload]);
                    if(row.new_position && row.new_dept) {
                        await supabase.from('employees').update({
                            job_position: row.new_position,
                            department: row.new_dept
                        }).eq('id', empId);
                    }
                }
                successCount++;
            }
            
            setLogs(newLogs);
            resolve(`Sukses: ${successCount}, Gagal: ${failCount}`);

        } catch (err: any) {
            reject(err.message);
        }
    });

    toast.promise(importPromise, {
        loading: 'Memproses import data...',
        success: (msg) => {
            if (successCount > 0) setTimeout(() => { onSuccess(); onClose(); }, 2000);
            return `${msg}`;
        },
        error: (err) => `Import Gagal: ${err}`
    });

    setIsProcessing(false);
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 h-screen w-screen">
      
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-enter">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600"/> Import / Export Data
          </h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-red-500"/></button>
        </div>

        <div className="flex border-b border-slate-100">
            <button onClick={() => setActiveTab('import')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'import' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}>Import CSV</button>
            <button onClick={() => setActiveTab('export')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'export' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}>Export CSV</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
            
            <div className="flex gap-4 items-center justify-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Target Module:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={dataType === 'contract'} onChange={() => setDataType('contract')} className="accent-indigo-600"/>
                    <span className="text-sm font-medium">Contract History</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={dataType === 'career'} onChange={() => setDataType('career')} className="accent-indigo-600"/>
                    <span className="text-sm font-medium">Career History</span>
                </label>
            </div>

            {/* TAB IMPORT */}
            {activeTab === 'import' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                            <strong>Step 1:</strong> Download template.
                        </div>
                        <button onClick={downloadTemplate} className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-2">
                            <Download size={14}/> Download Template
                        </button>
                    </div>

                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
                        <Upload size={32} className="mx-auto text-slate-400 mb-2"/>
                        <p className="text-sm font-medium text-slate-600">Click to upload CSV file</p>
                        <p className="text-xs text-slate-400 mt-1">Format: .csv (Comma Separated)</p>
                        <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer"/>
                    </div>

                    {file && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                                <FileSpreadsheet size={16} className="text-emerald-600"/>
                                <span className="text-sm font-bold">{file.name}</span>
                            </div>
                            
                            <div className="bg-black text-green-400 p-3 rounded text-xs font-mono h-32 overflow-y-auto mb-3">
                                {logs.length === 0 ? "> Waiting for process..." : logs.map((l, i) => <div key={i}>{l}</div>)}
                            </div>

                            <button 
                                onClick={processImport} 
                                disabled={isProcessing || previewData.length === 0}
                                className="w-full py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} 
                                {isProcessing ? 'Processing...' : 'Process Import to Database'}
                            </button>
                            <p className="text-[10px] text-center mt-2 text-slate-400">
                                Note: Valid rows will be appended. Invalid rows (email not found) will be skipped.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* TAB EXPORT */}
            {activeTab === 'export' && (
                <div className="text-center py-8 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-4">
                        <Download size={32}/>
                    </div>
                    <h4 className="font-bold text-slate-800">Export Data to CSV</h4>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto">
                        Download all {dataType === 'contract' ? 'Contract' : 'Career'} history records (including Salary Data) for reporting or backup purposes.
                    </p>
                    <button 
                        onClick={handleExport}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 mx-auto disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
                        Download {dataType === 'contract' ? 'Contracts' : 'Careers'}.csv
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>,
    document.body 
  );
}