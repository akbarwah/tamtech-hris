"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { supabase } from '@/lib/supabaseClient';
import { Users, CheckCircle2, Clock, Pencil, Trash2, Plus, X, Save, Loader2, Briefcase, Calendar } from 'lucide-react';
import { toast } from 'sonner'; // 1. IMPORT SONNER

interface JobOpeningsProps {
  jobs: any[];
  onEditJob: (job: any) => void;
  onDeleteJob: (id: number, name: string) => void;
  onAddJob: () => void;
}

export default function JobOpenings({ jobs, onEditJob, onDeleteJob, onAddJob }: JobOpeningsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2 animate-enter">
        {jobs.map(job => {
          const diffDays = Math.ceil((new Date(job.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          const isOverdue = diffDays < 0 && job.status === 'Open';
          
          const target = job.target_headcount || 1;
          const filled = job.filled_headcount || 0;
          const progress = Math.min((filled / target) * 100, 100);

          return (
            <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group relative">
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEditJob(job)} className="p-1.5 bg-slate-100 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Pencil size={14}/></button>
                <button onClick={() => onDeleteJob(job.id, job.position_name)} className="p-1.5 bg-slate-100 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
              </div>

              <div className="flex justify-between items-start mb-4 pr-16">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{job.position_name}</h3>
                  <p className="text-slate-500 text-sm">{job.department}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-4">
                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${job.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{job.priority}</span>
                 <span className={`text-[10px] font-medium flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}><Clock size={10}/> {isOverdue ? `Overdue ${Math.abs(diffDays)}d` : `Due in ${diffDays}d`}</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 size={16} className="text-slate-400" />
                  <span>Target: <span className="font-bold">{filled}</span> / {target} Hired</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Progress</span>
                  <span className="font-bold">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            </div>
          )
        })}
        
        <button 
            onClick={() => setIsModalOpen(true)} 
            className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all min-h-[250px] group cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
            <Plus size={24} />
          </div>
          <span className="font-bold text-sm">Create New MPP Request</span>
        </button>
      </div>

      <AddJobModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={onAddJob} 
      />
    </>
  );
}

// --- SUB-COMPONENT: MODAL ADD JOB (DYNAMIC DEPARTMENT) ---
function AddJobModal({ isOpen, onClose, onSuccess }: any) {
    const [mounted, setMounted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [departments, setDepartments] = useState<string[]>([]); // State untuk Dept List
    
    const [formData, setFormData] = useState<any>({ 
        position_name: '', 
        department: '', 
        priority: 'Medium', 
        target_headcount: 1, 
        filled_headcount: 0,
        status: 'Open',
        target_date: ''
    });

    useEffect(() => {
        setMounted(true);
        fetchDepartments(); // Ambil list department saat mount
        return () => setMounted(false);
    }, []);

    // --- FETCH UNIQUE DEPARTMENTS ---
    const fetchDepartments = async () => {
        const { data } = await supabase
            .from('employees')
            .select('department');
        
        if (data) {
            // Filter unik & non-null/empty, lalu sort alfabetis
            const uniqueDepts = Array.from(new Set(data.map((item: any) => item.department).filter(Boolean))).sort();
            setDepartments(uniqueDepts as string[]);
        }
    };

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        
        const promise = new Promise(async (resolve, reject) => {
            const { error } = await supabase.from('job_openings').insert([formData]);
            if (error) reject(error.message);
            else {
                onSuccess();
                onClose();
                setFormData({ position_name: '', department: '', priority: 'Medium', target_headcount: 1, filled_headcount: 0, status: 'Open', target_date: '' });
                resolve("MPP Request Created!");
            }
        });

        toast.promise(promise, {
            loading: 'Menyimpan data...',
            success: (msg) => `${msg}`,
            error: (err) => `Gagal simpan: ${err}`
        });
        
        setSaving(false);
    };

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-enter">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <h3 className="font-bold text-lg text-slate-800">New MPP Request</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"/></button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Position Name</label>
                            <div className="relative">
                                <Briefcase size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                                <input required type="text" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. Senior Frontend Engineer" value={formData.position_name} onChange={e => setFormData({...formData, position_name: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Department</label>
                                {/* DYNAMIC DROPDOWN */}
                                <select 
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white" 
                                    value={formData.department}
                                    onChange={e => setFormData({...formData, department: e.target.value})}
                                >
                                    <option value="">Select...</option>
                                    {departments.length > 0 ? (
                                        departments.map((dept, idx) => (
                                            <option key={idx} value={dept}>{dept}</option>
                                        ))
                                    ) : (
                                        <option disabled>No departments found</option>
                                    )}
                                    {/* Opsi Tambahan jika ingin manual */}
                                    <option disabled>──────────</option>
                                    <option value="Other">Other (New)</option>
                                </select>
                                {/* Input Text Muncul Jika User Pilih 'Other' */}
                                {formData.department === 'Other' && (
                                    <input 
                                        type="text" 
                                        className="w-full p-2 mt-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                        placeholder="Type new department..."
                                        onBlur={(e) => setFormData({...formData, department: e.target.value})} 
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Priority</label>
                                <select className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Target Headcount</label>
                                <input type="number" min="1" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none" placeholder="1" value={formData.target_headcount} onChange={e => setFormData({...formData, target_headcount: parseInt(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Target Date</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                                    <input type="date" required className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" value={formData.target_date} onChange={e => setFormData({...formData, target_date: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                            <button type="submit" disabled={saving} className="px-6 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200 transition-colors">
                                {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Submit Request
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body 
    );
}