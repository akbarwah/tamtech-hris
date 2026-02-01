"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <--- PORTAL
import { 
  Search, ArrowUpDown, Filter, Plus, X, Loader2, Save, 
  MessageCircle, Send, CheckCircle2, FileBadge, ExternalLink, 
  Building2, MapPin, Banknote, TrendingUp, Clock, Trash2 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// --- CONFIG DARI KODE LAMA ANDA ---
const PIPELINE_STAGES = [
  { id: 'Applied', label: 'Applied', color: 'bg-slate-100 border-slate-200 text-slate-600' },
  { id: 'HR Interview', label: 'HR Interview', color: 'bg-blue-50 border-blue-200 text-blue-600' },
  { id: 'Test & User Interview', label: 'Test & User Interview', color: 'bg-purple-50 border-purple-200 text-purple-600' },
  { id: 'Offering', label: 'Offering', color: 'bg-amber-50 border-amber-200 text-amber-600' },
  { id: 'Hired', label: 'Hired', color: 'bg-emerald-50 border-emerald-200 text-emerald-600' },
  { id: 'Rejected', label: 'Rejected', color: 'bg-red-50 border-red-200 text-red-600' }
];

const WA_TEMPLATES = [
  { label: "Undangan HR Interview", text: "Selamat Pagi Sdr {name},\n\nTerima kasih... (template anda)" }, // Dipersingkat agar rapi, logika tetap jalan
  { label: "Undangan User Interview", text: "Halo Sdr {name},\n\nSelamat! Anda lolos... (template anda)" },
  { label: "Offering Letter", text: "Selamat Siang Sdr {name},\n\nKabar baik!..." },
  { label: "Rejection", text: "Halo Sdr {name},\n\nTerima kasih telah meluangkan waktu..." }
];

interface DatabaseProps {
  candidates: any[];
  stages: any[];
  onEditCandidate: (c: any) => void; // Opsional jika parent butuh
  onRefresh?: () => void;
}

export default function CandidateDatabase({ candidates, stages, onEditCandidate, onRefresh }: DatabaseProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null); // Jika null = Add New, Jika isi = Edit

  // --- LOGIC FILTER ---
  const uniqueRoles = useMemo(() => ["All Roles", ...Array.from(new Set(candidates.map(c => c.position)))], [candidates]);
  
  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      const matchesSearch = candidate.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || (candidate.email && candidate.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = roleFilter === "All Roles" || candidate.position === roleFilter;
      const matchesStatus = statusFilter === "All Status" || candidate.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [candidates, searchTerm, roleFilter, statusFilter]);

  const sortedCandidates = useMemo(() => {
    let items = [...filteredCandidates];
    if (sortConfig) {
      items.sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [filteredCandidates, sortConfig]);

  const handleOpenAdd = () => {
      setEditingCandidate(null);
      setIsModalOpen(true);
  };

  const handleOpenEdit = (candidate: any) => {
      setEditingCandidate(candidate);
      setIsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mx-2 animate-enter">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"/>
        </div>
        <div className="flex gap-2">
            <button onClick={handleOpenAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                <Plus size={16} /> Add Talent
            </button>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none">{uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none"><option value="All Status">All Status</option>{stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
              <th className="px-6 py-4 cursor-pointer" onClick={() => setSortConfig({key:'full_name', direction:'asc'})}>Candidate Name <ArrowUpDown size={12} className="inline ml-1"/></th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Applied Date</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedCandidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-slate-50 cursor-pointer group" onClick={() => handleOpenEdit(candidate)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{candidate.full_name?.substring(0,2).toUpperCase()}</div>
                      <div><p className="font-semibold text-slate-900 text-sm">{candidate.full_name}</p><p className="text-xs text-slate-400">{candidate.email}</p></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{candidate.position}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold border ${stages.find(s => s.id === candidate.status)?.color.replace('bg-', 'bg-opacity-10 bg-').replace('border-', 'border-opacity-30 border-')}`}>{candidate.status}</span></td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(candidate.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right"><button onClick={(e) => {e.stopPropagation(); handleOpenEdit(candidate)}} className="text-indigo-600 hover:underline text-xs font-bold">View</button></td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL UTAMA (ADD/EDIT) --- */}
      <CandidateFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={editingCandidate}
        onSuccess={() => { if(onRefresh) onRefresh(); }}
      />
    </div>
  );
}

// --- KOMPONEN MODAL FORM (WIDE VERSION + TALLER NOTES) ---
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
        } else {
             // Reset Form for New Entry
             setFormData({
                full_name: '', email: '', phone: '', position: '', status: 'Applied', notes: '',
                resume_link: '', current_salary: '', expected_salary: '', notice_period: '', 
                domicile: '', willingness_onsite: '', test_result: '' 
            });
        }
    }, [initialData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        let error;
        if (initialData?.id) {
            const { error: err } = await supabase.from('candidates').update(formData).eq('id', initialData.id);
            error = err;
        } else {
            const { error: err } = await supabase.from('candidates').insert([formData]);
            error = err;
        }

        if (!error) { onSuccess(); onClose(); } 
        else { alert("Error: " + error.message); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!confirm("Hapus kandidat ini?")) return;
        setIsDeleting(true);
        const { error } = await supabase.from('candidates').delete().eq('id', initialData.id);
        if (!error) { onSuccess(); onClose(); }
        setIsDeleting(false);
    };

    const sendWhatsApp = (txt: string) => { 
        let p = formData.phone.replace(/\D/g, ''); 
        if (p.startsWith('0')) p='62'+p.substring(1); 
        if(!p) return alert("No HP Invalid"); 
        window.open(`https://api.whatsapp.com/send?phone=${p}&text=${encodeURIComponent(txt.replace('{name}',formData.full_name).replace('{position}',formData.position).replace('{email}',formData.email))}`, '_blank'); 
    };

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            {/* PERUBAHAN 1: Ukuran Modal diperbesar jadi max-w-4xl (sebelumnya 2xl) */}
            <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-enter">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-start shrink-0 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{initialData ? 'Candidate Details' : 'Add New Candidate'}</h2>
                        <p className="text-slate-500 text-sm">Review applicant information and manage status.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors"><X size={24} /></button>
                </div>

                {/* Body Form */}
                <div className="overflow-y-auto p-8 custom-scrollbar">
                    <form onSubmit={handleSave} className="space-y-8"> {/* Space antar section diperbesar jadi space-y-8 */}
                        
                        {/* 1. BASIC INFO */}
                        <div className="grid grid-cols-2 gap-6">
                            <div><label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label><input required name="full_name" value={formData.full_name} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" placeholder="Applicant Name" /></div>
                            <div><label className="block text-sm font-semibold text-slate-700 mb-2">Position Applied</label><input required name="position" value={formData.position} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" placeholder="e.g. UX Writer" /></div>
                            <div><label className="block text-sm font-semibold text-slate-700 mb-2">Email</label><input name="email" value={formData.email} onChange={handleChange} type="email" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" /></div>
                            <div><label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label><input name="phone" value={formData.phone} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" /></div>
                        </div>

                        {/* 2. WHATSAPP QUICK ACTIONS */}
                        {initialData && (
                            <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 space-y-3">
                                <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2"><MessageCircle size={14}/> Quick Actions: WhatsApp</h3>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"> {/* Grid diubah jadi 4 kolom karena modal lebar */}
                                    {WA_TEMPLATES.map((template, idx) => (
                                        <button key={idx} type="button" onClick={() => sendWhatsApp(template.text)} className="flex items-center justify-between px-4 py-2.5 bg-white border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 text-emerald-800 rounded-lg text-xs font-medium transition-all shadow-sm group">
                                            {template.label} <Send size={12} className="text-emerald-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-transform"/>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. ASSESSMENT & LOGISTICS */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><CheckCircle2 size={14}/> Assessment & Logistics</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"> {/* Grid diubah jadi 4 kolom */}
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

{/* ... Bagian Salary & Notice di atasnya tetap sama ... */}

                        {/* 5. PIPELINE & NOTES (REVISI LAYOUT HORIZONTAL) */}
                        <div className="space-y-6"> {/* Container vertikal dengan jarak */}
                            
                            {/* Baris 1: Stage Selector (Horizontal Row) */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">Pipeline Stage</label>
                                <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100"> 
                                    {/* Gunakan flex-wrap agar responsif, bg-slate-50 sebagai container visual */}
                                    {/* Pastikan menggunakan variable stage list yang benar sesuai file: PIPELINE_STAGES atau PIPELINE_STAGES_LIST */}
                                    {(typeof PIPELINE_STAGES !== 'undefined' ? PIPELINE_STAGES : PIPELINE_STAGES).map(stage => (
                                        <button 
                                            key={stage.id} 
                                            type="button" 
                                            onClick={() => setFormData({...formData, status: stage.id})} 
                                            className={`
                                                flex-1 px-3 py-2.5 text-xs font-bold rounded-lg border transition-all text-center whitespace-nowrap
                                                ${formData.status === stage.id 
                                                    ? `${stage.color.split(' ')[0]} ${stage.color.split(' ')[2]} border-transparent ring-2 ring-indigo-500/30 shadow-sm` 
                                                    : 'bg-white border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                                                }
                                            `}
                                        >
                                            {stage.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Baris 2: Notes (Full Width & Luas) */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Interviewer Notes</label>
                                <textarea 
                                    name="notes" 
                                    value={formData.notes} 
                                    onChange={handleChange} 
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm h-48 resize-none leading-relaxed shadow-inner" 
                                    placeholder="Tulis catatan lengkap hasil interview, poin plus/minus, dan rekomendasi di sini..." 
                                />
                            </div>
                        </div>

                        {/* Footer Buttons tetap sama... */}

                        {/* FOOTER BUTTONS */}
                        <div className="pt-6 border-t border-slate-50 flex justify-between items-center mt-8">
                            {initialData && (<button type="button" onClick={handleDelete} className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-semibold text-sm flex items-center gap-2 transition-colors">{isDeleting ? <Loader2 size={16} className="animate-spin"/> : <><Trash2 size={16}/> Delete</>}</button>)}
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