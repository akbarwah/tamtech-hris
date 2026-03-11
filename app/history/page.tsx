"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FileText, History, AlertTriangle, Clock, Plus, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner'; // 1. IMPORT SONNER

// Import Components
import ContractTable from './components/ContractTable';
import CareerTimeline from './components/CareerTimeline';
import HistoryModal from './components/HistoryModal';
import CsvTools from './components/CsvTools'; 

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<'contracts' | 'career'>('contracts');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [contracts, setContracts] = useState<any[]>([]);
  const [careers, setCareers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalActive: 0, expiring30: 0, expiring60: 0 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCsvOpen, setIsCsvOpen] = useState(false); 
  const [modalType, setModalType] = useState<'add_contract' | 'add_career'>('add_contract');
  const [editData, setEditData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);

    // 1. Get Contracts (Active Employees Only)
    const { data: contractData } = await supabase
      .from('employment_contracts')
      .select('*, employees!inner(full_name, is_active)') 
      .eq('employees.is_active', true) 
      .order('end_date', { ascending: true }); 

    // 2. Get Careers
    const { data: careerData } = await supabase
      .from('career_history')
      .select('*, employees(full_name)')
      .order('effective_date', { ascending: false });

    // 3. Get Employees (Active Only for Dropdown)
    const { data: empData } = await supabase
      .from('employees')
      .select('id, full_name, job_position, department')
      .eq('is_active', true)
      .order('full_name');

    if (contractData) {
        setContracts(contractData as any);
        calculateStats(contractData); 
    }
    if (careerData) setCareers(careerData as any);
    if (empData) setEmployees(empData);
    
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- EWS LOGIC ---
  const calculateStats = (data: any[]) => {
      const now = new Date();
      const next30 = new Date(); next30.setDate(now.getDate() + 30);
      const next60 = new Date(); next60.setDate(now.getDate() + 60);

      let active = 0, exp30 = 0, exp60 = 0;
      data.forEach(c => {
          if (c.status === 'Active') {
              active++;
              if (c.end_date) {
                  const end = new Date(c.end_date);
                  if (end <= next30 && end >= now) exp30++;
                  else if (end <= next60 && end > next30) exp60++;
              }
          }
      });
      setStats({ totalActive: active, expiring30: exp30, expiring60: exp60 });
  };

// --- CRUD HANDLERS (REFINED & BULLETPROOF) ---
  const handleSave = async (data: any) => {
      setIsSaving(true);

      const savePromise = new Promise(async (resolve, reject) => {
          try {
              // Helper: Sanitizer (DIPERBAIKI UNTUK ANGKA & NULL)
              const sanitizePayload = (source: any) => {
                  const payload = { ...source };
                  delete payload.employees;      
                  delete payload.employee_name;  
                  delete payload.created_at;     
                  
                  // Cegah error: invalid input syntax for type numeric ""
                  if (payload.base_salary === "") payload.base_salary = null;
                  else if (payload.base_salary) payload.base_salary = Number(payload.base_salary);

                  if (payload.fixed_allowance === "") payload.fixed_allowance = null;
                  else if (payload.fixed_allowance) payload.fixed_allowance = Number(payload.fixed_allowance);

                  return payload;
              };

              if (modalType === 'add_contract') {
                  const payload = sanitizePayload(data);
                  
                  if (payload.id) { 
                     // UPDATE CONTRACT
                     const idToUpdate = payload.id;
                     delete payload.id; 
                     const { error } = await supabase.from('employment_contracts').update(payload).eq('id', idToUpdate);
                     if (error) throw error;
                  } else { 
                     // NEW CONTRACT
                     delete payload.id; 
                     const { error } = await supabase.from('employment_contracts').insert([payload]);
                     if (error) throw error;
                  }

// SYNC TO EMPLOYEE PROFILE (DIPERBAIKI LAGI)
                  // PENTING: Hanya update profil kalau kontraknya "Active"
                  if (payload.status === 'Active') {
                      const { error: syncError } = await supabase.from('employees').update({
                          employment_status: payload.contract_type === 'Permanent' ? 'Permanent' : 'Contract',
                          contract_end_date: payload.end_date || null,
                      }).eq('id', payload.employee_id);

                      // Kalau sinkronisasi profil gagal, lemparkan error agar muncul di notif merah
                      if (syncError) throw new Error("Kontrak tersimpan, tapi gagal sinkron ke profil: " + syncError.message);
                  }
              } else {
                  // CAREER HISTORY
                  const payload = sanitizePayload(data);

                  if (payload.id) {
                     // UPDATE CAREER
                     const idToUpdate = payload.id;
                     delete payload.id;
                     const { error } = await supabase.from('career_history').update(payload).eq('id', idToUpdate);
                     if (error) throw error;
                  } else {
                     // NEW CAREER
                     delete payload.id;
                     const { error } = await supabase.from('career_history').insert([payload]);
                     if (error) throw error;
                  }

                  // SYNC TO EMPLOYEE PROFILE (DIPERBAIKI)
                  const { error: syncError } = await supabase.from('employees').update({
                      job_position: payload.new_position,
                      department: payload.new_dept
                  }).eq('id', payload.employee_id);
                  
                  if (syncError) throw new Error("Karir tersimpan, tapi gagal sinkron profil: " + syncError.message);
              }

              resolve("Success");

          } catch (error: any) {
              reject(error.message || "Terjadi kesalahan saat menyimpan");
          }
      });

      // EKSEKUSI TOAST
      toast.promise(savePromise, {
          loading: 'Menyimpan & Menyinkronkan data...',
          success: () => {
              setIsModalOpen(false);
              fetchData();
              setIsSaving(false);
              return 'Data & Profil berhasil diupdate!';
          },
          error: (err) => {
              setIsSaving(false);
              return `Gagal: ${err}`;
          }
      });
  };

  const handleDelete = async (id: number) => {
      if(!confirm("Anda yakin ingin menghapus data ini?")) return;
      
      const table = activeTab === 'contracts' ? 'employment_contracts' : 'career_history';
      
      const deletePromise = new Promise(async (resolve, reject) => {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) reject(error.message);
          else resolve("Deleted");
      });

      toast.promise(deletePromise, {
          loading: 'Menghapus data...',
          success: () => {
              fetchData();
              return 'Data berhasil dihapus';
          },
          error: (err) => `Gagal hapus: ${err}`
      });
  };

  const openModal = (type: 'add_contract' | 'add_career', data: any = null) => {
      setModalType(type);
      setEditData(data);
      setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen animate-enter space-y-6 pb-20">
      
      {/* HEADER & EWS STATS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-bold text-slate-900">History & Contracts</h1>
              <p className="text-slate-500 text-sm">Manage employment legality and career progression.</p>
          </div>
          <div className="flex gap-2">
               <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg border border-red-100 text-xs font-bold">
                   <AlertTriangle size={14}/> Expiring (30d): {stats.expiring30}
               </div>
               <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 text-xs font-bold">
                   <Clock size={14}/> Expiring (60d): {stats.expiring60}
               </div>
          </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200">
          <div className="flex gap-8">
              <button onClick={() => setActiveTab('contracts')} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'contracts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                  <FileText size={16}/> Contract Management
              </button>
              <button onClick={() => setActiveTab('career')} className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'career' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                  <History size={16}/> Career Timeline
              </button>
          </div>
      </div>

      {/* ACTION BAR */}
      <div className="flex justify-end gap-3">
          <button 
              onClick={() => setIsCsvOpen(true)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50 shadow-sm"
          >
              <FileSpreadsheet size={16}/> Import / Export
          </button>

          <button 
              onClick={() => openModal(activeTab === 'contracts' ? 'add_contract' : 'add_career')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-all active:scale-95"
          >
              <Plus size={16}/> {activeTab === 'contracts' ? 'Renew / Add Contract' : 'Record Promotion'}
          </button>
      </div>

      {/* CONTENT AREA */}
      <div key={activeTab}>
        {loading ? (
             <div className="p-12 flex justify-center text-slate-300">Loading data...</div>
        ) : activeTab === 'contracts' ? (
            <ContractTable 
                contracts={contracts} 
                onEdit={(item) => openModal('add_contract', item)} 
                onDelete={handleDelete}
            />
        ) : (
            <CareerTimeline 
                careers={careers} 
                onEdit={(item) => openModal('add_career', item)} 
                onDelete={handleDelete}
            />
        )}
      </div>

      {/* FORM MODAL */}
      <HistoryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        type={modalType}
        employees={employees}
        initialData={editData}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* CSV TOOLS MODAL */}
      <CsvTools 
        isOpen={isCsvOpen} 
        onClose={() => setIsCsvOpen(false)}
        onSuccess={fetchData} 
      />

    </div>
  );
}