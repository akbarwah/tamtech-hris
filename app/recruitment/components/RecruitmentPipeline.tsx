"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { supabase } from '@/lib/supabaseClient';
import { 
  X, Loader2, Save, Trash2, MessageCircle, Send, CheckCircle2, 
  FileBadge, ExternalLink, Building2, MapPin, Banknote, TrendingUp, Clock, 
  Mail, Phone, Briefcase, Calendar, FileText
} from 'lucide-react';
import { toast } from 'sonner';

// --- CONFIG ---
const WA_TEMPLATES = [
  { label: "Undangan HR Interview", text: "Selamat Pagi Sdr {name},\n\nTerima kasih atas lamaran Anda. Kami mengundang Anda untuk sesi Interview HR..." },
  { label: "Undangan User Interview", text: "Halo Sdr {name},\n\nSelamat! Anda lolos ke tahap selanjutnya yaitu Interview User..." },
  { label: "Offering Letter", text: "Selamat Siang Sdr {name},\n\nKabar baik! Kami ingin memberikan penawaran kerja..." },
  { label: "Rejection", text: "Halo Sdr {name},\n\nTerima kasih telah meluangkan waktu. Namun saat ini..." }
];

interface PipelineProps {
  candidates: any[];
  stages: any[];
  onEditCandidate: (candidate: any) => void; 
  refreshData: () => void;
}

export default function RecruitmentPipeline({ candidates, stages, onEditCandidate, refreshData }: PipelineProps) {
  
  // State untuk Modal Edit
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null); 

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("candidateId", id.toString());
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };
  
  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    const candidateId = e.dataTransfer.getData("candidateId");
    
    const promise = new Promise(async (resolve, reject) => {
        const { error } = await supabase.from('candidates').update({ status: newStatus }).eq('id', candidateId);
        if (error) reject(error.message);
        else {
            refreshData(); 
            resolve(`Moved to ${newStatus}`);
        }
    });

    toast.promise(promise, {
        loading: 'Memindahkan kandidat...',
        success: (msg) => `${msg}`,
        error: (err) => `Gagal pindah: ${err}`
    });
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-220px)] px-2 animate-enter">
        {stages.map((stage) => {
          const stageCandidates = candidates.filter(c => c.status === stage.id);
          
          return (
            <div 
              key={stage.id} 
              className="flex-1 flex flex-col min-w-[280px] max-w-[320px] h-full" 
              onDragOver={handleDragOver} 
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Stage Header */}
              <div className={`px-4 py-3 rounded-t-xl border-b-2 flex justify-between items-center bg-white ${stage.color.replace('text', 'border')}`}>
                  <span className={`font-bold text-xs uppercase tracking-wide ${stage.color.split(' ')[2]}`}>{stage.label}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600">{stageCandidates.length}</span>
              </div>

              {/* Stage Content */}
              <div className="bg-slate-50/50 flex-1 rounded-b-xl border-x border-b border-slate-200 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                  {stageCandidates.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 opacity-30 text-xs font-bold text-slate-400 border-2 border-dashed border-slate-200 rounded-lg m-2">
                          <Briefcase size={24} className="mb-1"/>
                          EMPTY
                      </div>
                  )}
                  {stageCandidates.map((candidate) => (
                      <div 
                          key={candidate.id} 
                          draggable 
                          onDragStart={(e) => handleDragStart(e, candidate.id)} 
                          onClick={() => setSelectedCandidate(candidate)} // <--- KLIK DISINI MEMBUKA MODAL
                          className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group relative transition-all hover:border-indigo-300"
                      >
                          <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{candidate.full_name}</h4>
                          </div>
                          <p className="text-xs font-medium text-slate-500 mb-2 truncate flex items-center gap-1">
                              <Briefcase size={10}/> {candidate.position}
                          </p>
                          
                          <div className="flex items-center justify-between border-t border-slate-50 pt-2 mt-2">
                               <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                  <Calendar size={10}/> {new Date(candidate.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                               </span>
                               {candidate.resume_link && (
                                   <a href={candidate.resume_link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 hover:bg-blue-100 flex items-center gap-1">
                                       <FileText size={10}/> CV
                                   </a>
                               )}
                          </div>
                      </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- MODAL FORM (Sekarang sudah disertakan di sini) --- */}
      <CandidateFormModal 
        isOpen={!!selectedCandidate} 
        onClose={() => setSelectedCandidate(null)} 
        initialData={selectedCandidate}
        onSuccess={() => {
            setSelectedCandidate(null);
            refreshData();
        }}
      />
    </>
  );
}

// --- KOMPONEN MODAL FORM (DUPLICATED FROM DATABASE TO MAKE IT WORK) ---
function CandidateFormModal({ isOpen, onClose, initialData, onSuccess }: any) {
    const [mounted, setMounted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Initial State
    const [formData, setFormData] = useState({
        full_name: '', email: '', phone: '', position: '', status: 'Applied', notes: '',
        resume_link: '', current_salary: '', expected_salary: '', notice_period: '', 
        domicile: '', willingness_onsite: '', test_result: ''        
    });

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
    
    // Freeze Scroll
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Load Data
    useEffect(() => {
        if (initialData) {
            setFormData({
                full_name: initialData.full_name || '', 
                email: initialData.email || '', 
                phone: initialData.phone || '', 
                position: initialData.position || '', 
                status: initialData.status || 'Applied', 
                notes: initialData.notes || '',
                resume_link: initialData.resume_link || '', 
                current_salary: initialData.current_salary || '', 
                expected_salary: initialData.expected_salary || '', 
                notice_period: initialData.notice_period || '', 
                domicile: initialData.domicile || '', 
                willingness_onsite: initialData.willingness_onsite || '', 
                test_result: initialData.test_result || ''
            });
        }
    }, [initialData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        
        const savePromise = new Promise(async (resolve, reject) => {
            const { error: err } = await supabase.from('candidates').update(formData).eq('id', initialData.id);
            if (err) reject(err.message);
            else {
                onSuccess(); 
                resolve("Perubahan disimpan");
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
        if (!confirm("Hapus kandidat ini?")) return;
        setIsDeleting(true);
        
        const deletePromise = new Promise(async (resolve, reject) => {
            const { error } = await supabase.from('candidates').delete().eq('id', initialData.id);
            if (error) reject(error.message);
            else {
                onSuccess(); 
                resolve("Deleted");
            }
        });

        toast.promise(deletePromise, {
            loading: 'Menghapus...',
            success: 'Kandidat dihapus',
            error: (err) => `Gagal hapus: ${err}`
        });
        
        setIsDeleting(false);
    };

    const sendWhatsApp = (txt: string) => { 
        let p = formData.phone.replace(/\D/g, ''); 
        if (p.startsWith('0')) p='62'+p.substring(1); 
        if(!p) { toast.error("Nomor HP tidak valid"); return; }
        window.open(`https://api.whatsapp.com/send?phone=${p}&text=${encodeURIComponent(txt.replace('{name}',formData.full_name).replace('{position}',formData.position).replace('{email}',formData.email))}`, '_blank'); 
    };

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            {/* Modal Container */}
            <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-enter">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-start shrink-0 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Candidate Details</h2>
                        <p className="text-slate-500 text-sm">Review applicant information and manage status.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors"><X size={24} /></button>
                </div>

                {/* Body Form */}
                <div className="overflow-y-auto p-8 custom-scrollbar">
                    <form onSubmit={handleSave} className="space-y-8">
                        
                        {/* 1. BASIC INFO */}
                        <div className="grid grid-cols-2 gap-6">
                            <div><label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label><input required name="full_name" value={formData.full_name} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" /></div>
                            <div><label className="block text-sm font-semibold text-slate-700 mb-2">Position Applied</label><input required name="position" value={formData.position} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" /></div>
                            <div><label className="block text-sm font-semibold text-slate-700 mb-2">Email</label><input name="email" value={formData.email} onChange={handleChange} type="email" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" /></div>
                            <div><label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label><input name="phone" value={formData.phone} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" /></div>
                        </div>

                        {/* 2. WHATSAPP QUICK ACTIONS */}
                        <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 space-y-3">
                            <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2"><MessageCircle size={14}/> Quick Actions: WhatsApp</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {WA_TEMPLATES.map((template, idx) => (
                                    <button key={idx} type="button" onClick={() => sendWhatsApp(template.text)} className="flex items-center justify-between px-4 py-2.5 bg-white border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 text-emerald-800 rounded-lg text-xs font-medium transition-all shadow-sm group">
                                        {template.label} <Send size={12} className="text-emerald-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-transform"/>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. ASSESSMENT & LOGISTICS */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><CheckCircle2 size={14}/> Assessment & Logistics</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Big Five Code</label>
                                    <div className="relative flex items-center">
                                        <FileBadge size={14} className="absolute left-3 text-indigo-500"/>
                                        <input name="test_result" value={formData.test_result} onChange={handleChange} className="w-full pl-9 pr-8 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-mono text-slate-600 truncate focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Code..." />
                                        {formData.test_result && (<a href={`https://bigfive-test.com/result/${formData.test_result}`} target="_blank" rel="noreferrer" className="absolute right-2 p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="Open Result"><ExternalLink size={14}/></a>)}
                                    </div>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Willingness Onsite</label>
                                    <div className="relative"><Building2 size={14} className="absolute left-3 top-2.5 text-slate-400"/><input name="willingness_onsite" value={formData.willingness_onsite} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="Yes/No" /></div>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Current Domicile</label>
                                    <div className="relative"><MapPin size={14} className="absolute left-3 top-2.5 text-red-500"/><input name="domicile" value={formData.domicile} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="City" /></div>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Resume / CV Link</label>
                                    <div className="relative">
                                        <input name="resume_link" value={formData.resume_link} onChange={handleChange} type="text" placeholder="https://..." className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-blue-600" />
                                        {formData.resume_link && <a href={formData.resume_link} target="_blank" rel="noreferrer" className="absolute right-2 top-1.5 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1"><ExternalLink size={12} /></a>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. SALARY & NOTICE */}
                        <div className="grid grid-cols-3 gap-6 border-t border-slate-100 pt-6">
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Current Salary</label><div className="relative"><Banknote size={14} className="absolute left-3 top-2.5 text-slate-400"/><input name="current_salary" value={formData.current_salary} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" /></div></div>
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Exp. Salary</label><div className="relative"><TrendingUp size={14} className="absolute left-3 top-2.5 text-emerald-500"/><input name="expected_salary" value={formData.expected_salary} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700" /></div></div>
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Notice Period</label><div className="relative"><Clock size={14} className="absolute left-3 top-2.5 text-amber-500"/><input name="notice_period" value={formData.notice_period} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" /></div></div>
                        </div>

                        {/* 5. NOTES */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Interviewer Notes</label>
                            <textarea 
                                name="notes" 
                                value={formData.notes} 
                                onChange={handleChange} 
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm h-48 resize-none leading-relaxed shadow-inner" 
                                placeholder="Tulis catatan lengkap hasil interview..." 
                            />
                        </div>

                        {/* FOOTER BUTTONS */}
                        <div className="pt-6 border-t border-slate-50 flex justify-between items-center mt-8">
                            <button type="button" onClick={handleDelete} className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-semibold text-sm flex items-center gap-2 transition-colors">{isDeleting ? <Loader2 size={16} className="animate-spin"/> : <><Trash2 size={16}/> Delete</>}</button>
                            <div className="flex gap-3 ml-auto">
                                <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold text-sm transition-colors">Cancel</button>
                                <button disabled={saving} type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold text-sm disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                                    {saving ? <Loader2 size={16} className="animate-spin"/> : 'Save Changes'}
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