"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; 
import { X, Loader2, Save, User, CheckCircle2, FileText, Briefcase, Link as LinkIcon, Calendar, Banknote } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'add_contract' | 'add_career';
  employees: any[];
  initialData?: any; 
  onSave: (data: any) => void;
  isSaving: boolean;
}

export default function HistoryModal({ isOpen, onClose, type, employees, initialData, onSave, isSaving }: HistoryModalProps) {
  const [formData, setFormData] = useState<any>({});
  
  // Autocomplete State
  const [empSearch, setEmpSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  // Inisialisasi Form
  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setFormData(initialData);
            setEmpSearch(initialData.employee_name || initialData.employees?.full_name || '');
        } else {
            setEmpSearch('');
            if (type === 'add_contract') {
                setFormData({ 
                  contract_type: 'PKWT (Baru)', 
                  status: 'Active',
                  base_salary: '',      // Inisialisasi kosong
                  fixed_allowance: ''   // Inisialisasi kosong
                });
            } else {
                setFormData({ movement_type: 'Promotion' });
            }
        }
    }
  }, [initialData, type, isOpen]);

  // Click Outside Listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handlers
  const handleEmpSelect = (emp: any) => {
    setEmpSearch(emp.full_name);
    setShowSuggestions(false);
    
    if (type === 'add_contract') {
      setFormData({ ...formData, employee_id: emp.id, employee_name: emp.full_name });
    } else {
      setFormData({ 
        ...formData, 
        employee_id: emp.id, 
        employee_name: emp.full_name,
        prev_position: emp.job_position || '',
        prev_dept: emp.department || ''
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const filteredEmployees = employees.filter(e => e.full_name.toLowerCase().includes(empSearch.toLowerCase()));

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      
      {/* Overlay Background */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm transition-opacity" onClick={onClose}/>
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-enter">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              {type === 'add_contract' ? <FileText className="text-indigo-600"/> : <Briefcase className="text-indigo-600"/>}
              {initialData ? 'Edit Data' : (type === 'add_contract' ? 'Renew / Add Contract' : 'Record Career Movement')}
          </h3>
          <button onClick={onClose}><X size={20} className="text-slate-300 hover:text-red-500 transition-colors"/></button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* --- AUTOCOMPLETE EMPLOYEE --- */}
            <div className="relative" ref={searchRef}>
              <label className="text-xs font-bold text-slate-500 uppercase">Employee Name</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                <input 
                  type="text" 
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="Search employee..."
                  value={empSearch}
                  onChange={(e) => { setEmpSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  disabled={!!initialData} 
                />
                {showSuggestions && !initialData && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                    {filteredEmployees.length > 0 ? filteredEmployees.map(e => (
                      <div key={e.id} onClick={() => handleEmpSelect(e)} className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0">
                        {e.full_name}
                      </div>
                    )) : (
                      <div className="px-4 py-2 text-xs text-slate-400 italic">No employee found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* --- FORM CONTRACT --- */}
            {type === 'add_contract' && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Contract Number</label>
                            <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.contract_number || ''} onChange={e => setFormData({...formData, contract_number: e.target.value})} placeholder="e.g. 001/PKWT/2026"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Contract Type</label>
                            <select className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.contract_type || 'PKWT (Perpanjangan)'} onChange={e => setFormData({...formData, contract_type: e.target.value})}>
                                <option value="PKWT (Baru)">PKWT (Baru)</option>
                                <option value="PKWT (Perpanjangan)">PKWT (Perpanjangan)</option>
                                <option value="Probation">Probation</option>
                                <option value="Permanent">Permanent</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Start Date</label>
                            <input required type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">End Date</label>
                            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})}/>
                            <p className="text-[10px] text-slate-400 mt-1">*Leave empty if Permanent</p>
                        </div>
                    </div>

                    {/* --- [NEW] INFORMASI GAJI & TUNJANGAN --- */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Banknote size={16} className="text-indigo-600"/>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Compensation Details</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Gaji Pokok */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Gaji Pokok (Base Salary)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">Rp</span>
                            <input 
                              type="number" 
                              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-mono"
                              placeholder="0"
                              value={formData.base_salary || ''}
                              onChange={(e) => setFormData({...formData, base_salary: e.target.value})}
                            />
                          </div>
                        </div>

                        {/* Tunjangan */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Tunjangan Tetap</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">Rp</span>
                            <input 
                              type="number" 
                              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-mono"
                              placeholder="0"
                              value={formData.fixed_allowance || ''}
                              onChange={(e) => setFormData({...formData, fixed_allowance: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* --- END NEW --- */}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Status</label>
                        <select className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.status || 'Active'} onChange={e => setFormData({...formData, status: e.target.value})}>
                            <option value="Active">Active</option>
                            <option value="Completed">Completed</option>
                            <option value="Terminated">Terminated</option>
                        </select>
                    </div>
                </>
            )}

            {/* --- FORM CAREER --- */}
            {type === 'add_career' && (
                <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Movement Type</label>
                            <select className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.movement_type || 'Promotion'} onChange={e => setFormData({...formData, movement_type: e.target.value})}>
                                <option value="Promotion">Promotion</option>
                                <option value="Demotion">Demotion</option>
                                <option value="Transfer">Transfer</option>
                                <option value="Adjustment">Adjustment</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Effective Date</label>
                            <input required type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.effective_date || ''} onChange={e => setFormData({...formData, effective_date: e.target.value})}/>
                        </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">New Assignment</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="text" placeholder="New Position" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={formData.new_position || ''} onChange={e => setFormData({...formData, new_position: e.target.value})}/>
                            <input type="text" placeholder="New Dept" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={formData.new_dept || ''} onChange={e => setFormData({...formData, new_dept: e.target.value})}/>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">SK Number (No. Surat)</label>
                             <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.sk_number || ''} onChange={e => setFormData({...formData, sk_number: e.target.value})} placeholder="e.g. 001/SK-HR/2026"/>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex items-center gap-1"><LinkIcon size={12}/> Link SK (GDrive)</label>
                            <input type="url" className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono text-indigo-600" value={formData.doc_url || ''} onChange={e => setFormData({...formData, doc_url: e.target.value})} placeholder="https://..."/>
                        </div>
                    </div>
                </>
            )}

            {/* COMMON FIELDS (CONTRACT LINK) */}
            {type === 'add_contract' && (
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex items-center gap-1"><LinkIcon size={12}/> Link Document (GDrive)</label>
                    <input type="url" className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono text-indigo-600" value={formData.doc_url || ''} onChange={e => setFormData({...formData, doc_url: e.target.value})} placeholder="https://..."/>
                </div>
            )}

            {/* SYNC INFO */}
            {type === 'add_contract' && (
                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 border border-blue-100 flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0"/>
                    <span>Simpan kontrak ini akan otomatis memperbarui <strong>Status</strong> dan <strong>Tanggal Berakhir</strong> di profil karyawan utama.</span>
                </div>
            )}
            {type === 'add_career' && (
                <div className="bg-emerald-50 p-3 rounded-lg text-xs text-emerald-700 border border-emerald-100 flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0"/>
                    <span>Simpan data ini akan otomatis memperbarui <strong>Jabatan</strong> & <strong>Departemen</strong> karyawan saat ini.</span>
                </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200">
                    {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                    {initialData ? 'Save Changes' : 'Submit Record'}
                </button>
            </div>

          </form>
        </div>
      </div>
    </div>,
    document.body 
  );
}