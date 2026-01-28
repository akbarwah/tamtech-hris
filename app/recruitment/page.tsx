"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Briefcase, Search, Plus, MoreHorizontal, Mail, Phone,
  X, Loader2, CheckCircle2, LayoutGrid, List, Filter,      
  ExternalLink, MapPin, Banknote, TrendingUp, Clock,        
  Building2, FileBadge, ArrowUpDown, Copy, Check, MessageCircle, Send,
  Trash2, Target, Users, Pencil, Calendar, AlertCircle, Ban
} from 'lucide-react';

// --- CONFIG ---
const PIPELINE_STAGES = [
  { id: 'Applied', label: 'Applied', color: 'bg-slate-100 border-slate-200 text-slate-600' },
  { id: 'HR Interview', label: 'HR Interview', color: 'bg-blue-50 border-blue-200 text-blue-600' },
  { id: 'Test & User Interview', label: 'Test & User Interview', color: 'bg-purple-50 border-purple-200 text-purple-600' },
  { id: 'Offering', label: 'Offering', color: 'bg-amber-50 border-amber-200 text-amber-600' },
  { id: 'Hired', label: 'Hired', color: 'bg-emerald-50 border-emerald-200 text-emerald-600' },
  { id: 'Rejected', label: 'Rejected', color: 'bg-red-50 border-red-200 text-red-600' }
];

const WA_TEMPLATES = [
  { label: "Undangan HR Interview", text: "Selamat Pagi Sdr {name},\n\nTerima kasih banyak atas kesediaannya menunggu feedback rekrutmen untuk posisi {position}. Setelah meninjau CV dan pengisian form Anda, kami dengan senang hati mengundang Anda ke sesi HR Interview dengan detail sebagai berikut:\n\n\uD83D\uDCC5 [HARI, TANGGAL]\n\u23F0 [JAM] WIB\n\uD83D\uDCCD Google Meet (link akan kami kirim menyusul)\n\nMohon konfirmasi kesediaan Anda untuk sesi tersebut.\n\nSalam hangat,\nTamtech HR Team" },
  { label: "Undangan User Interview & Test", text: "Halo Sdr {name},\n\nSelamat! Anda lolos ke tahap selanjutnya untuk posisi {position}. Kami ingin mengundang Anda untuk sesi User Interview & Technical Test pada:\n\n\uD83D\uDCC5 [HARI, TANGGAL]\n\u23F0 [JAM] WIB\n\uD83D\uDCCD [LOKASI/ONLINE]\n\nMohon persiapkan diri Anda.\n\nTerima kasih,\nTamtech HR Team" },
  { label: "Offering Letter Sent", text: "Selamat Siang Sdr {name},\n\nKabar baik! Kami telah mengirimkan Offering Letter untuk posisi {position} ke email Anda ({email}).\n\nMohon dicek dan kami tunggu konfirmasinya.\n\nSelamat bergabung!\nTamtech HR Team" },
  { label: "Rejection (Sopan)", text: "Halo Sdr {name},\n\nTerima kasih telah meluangkan waktu mengikuti proses seleksi di Tamtech. Setelah mempertimbangkan dengan seksama, saat ini kami memutuskan untuk melanjutkna dengan kandidat lain yang kualifikasinya lebih mendekati kebutuhan kami saat ini.\n\nCV Anda akan kami simpan untuk peluang di masa depan.\n\nSukses selalu,\nTamtech HR Team" }
];

export default function RecruitmentPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board'); 
  
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); 
  const [editingId, setEditingId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false); 

  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [newJob, setNewJob] = useState({ position: '', dept: '', count: 1, date: '', priority: 'Medium' });

  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', position: '', status: 'Applied', notes: '',
    resume_link: '', current_salary: '', expected_salary: '', notice_period: '', 
    domicile: '', willingness_onsite: '', test_result: ''        
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: candData } = await supabase.from('candidates').select('*').order('created_at', { ascending: false });
    const { data: jobData } = await supabase.from('job_openings').select('*').order('status', { ascending: false }).order('target_date', { ascending: true });

    if (candData) setCandidates(candData);
    
    if (jobData && candData) {
        const syncedJobs = jobData.map(job => {
            const hiredCount = candData.filter(c => 
                c.position?.toLowerCase().trim() === job.position_name?.toLowerCase().trim() && 
                c.status === 'Hired'
            ).length;
            return { ...job, filled_headcount: hiredCount };
        });
        setJobs(syncedJobs);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const processedCandidates = useMemo(() => {
    let result = candidates.filter(c => {
      const matchesSearch = c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || c.position.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === 'All' || c.position === positionFilter;
      return matchesSearch && matchesPosition;
    });
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [candidates, searchTerm, positionFilter, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const funnelStats = {
    total: candidates.length,
    hr_interview: candidates.filter(c => c.status === 'HR Interview').length,
    user_test: candidates.filter(c => c.status === 'Test & User Interview').length,
    hired: candidates.filter(c => c.status === 'Hired').length
  };

  const handleDragStart = (e: React.DragEvent, id: number) => e.dataTransfer.setData("candidateId", id.toString());
  const handleDragOver = (e: React.DragEvent) => e.preventDefault(); 
  
  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    const candidateId = e.dataTransfer.getData("candidateId");
    const previousState = [...candidates];
    setCandidates(prev => prev.map(c => c.id.toString() === candidateId ? { ...c, status: newStatus } : c));
    const { error } = await supabase.from('candidates').update({ status: newStatus }).eq('id', candidateId);
    if (error) {
        alert("Gagal memindahkan kartu. Mengembalikan posisi...");
        setCandidates(previousState);
    } else {
        if(newStatus === 'Hired') fetchData();
    }
  };

  const deleteCandidateDirect = async (e: React.MouseEvent, id: number, name: string) => {
      e.stopPropagation(); 
      if (!confirm(`Yakin hapus kandidat ${name}? Data tidak bisa dikembalikan.`)) return;
      setCandidates(prev => prev.filter(c => c.id !== id));
      const { error } = await supabase.from('candidates').delete().eq('id', id);
      if (error) { alert("Gagal menghapus: " + error.message); fetchData(); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    let result;
    if (editingId) result = await supabase.from('candidates').update(formData).eq('id', editingId);
    else result = await supabase.from('candidates').insert([formData]);
    if (!result.error) { setIsModalOpen(false); resetForm(); fetchData(); }
    setIsSaving(false);
  };

  const handleDeleteFromModal = async () => {
    if (!editingId || !confirm(`Hapus kandidat ${formData.full_name}?`)) return;
    setIsDeleting(true);
    const { error } = await supabase.from('candidates').delete().eq('id', editingId);
    if (!error) { setIsModalOpen(false); resetForm(); fetchData(); }
    setIsDeleting(false);
  };

  const resetForm = () => {
    setFormData({ full_name: '', email: '', phone: '', position: '', status: 'Applied', notes: '', resume_link: '', current_salary: '', expected_salary: '', notice_period: '', domicile: '', willingness_onsite: '', test_result: '' });
    setEditingId(null);
  }

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setFormData({ 
        full_name: c.full_name, email: c.email || '', phone: c.phone || '', position: c.position, status: c.status, notes: c.notes || '', 
        resume_link: c.resume_link || '', current_salary: c.current_salary || '', expected_salary: c.expected_salary || '', 
        notice_period: c.notice_period || '', domicile: c.domicile || '', willingness_onsite: c.willingness_onsite || '', test_result: c.test_result || '' 
    });
    setIsModalOpen(true);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const copyToClipboard = () => { 
      if (formData.test_result) { 
          navigator.clipboard.writeText(formData.test_result); 
          setCopied(true); setTimeout(() => setCopied(false), 2000); 
      } 
  };
  
  const sendWhatsApp = (txt: string) => { let p = formData.phone.replace(/\D/g, ''); if (p.startsWith('0')) p='62'+p.substring(1); if(!p) return alert("No HP Invalid"); window.open(`https://api.whatsapp.com/send?phone=${p}&text=${encodeURIComponent(txt.replace('{name}',formData.full_name).replace('{position}',formData.position).replace('{email}',formData.email))}`, '_blank'); };

  const handleSaveJob = async () => {
    if (!newJob.position || !newJob.date) return alert("Posisi dan Target Date wajib diisi!");
    let error;
    if (editingJobId) {
        const { error: err } = await supabase.from('job_openings').update({ position_name: newJob.position, department: newJob.dept, target_headcount: newJob.count, target_date: newJob.date, priority: newJob.priority }).eq('id', editingJobId);
        error = err;
    } else {
        const { error: err } = await supabase.from('job_openings').insert({ position_name: newJob.position, department: newJob.dept, target_headcount: newJob.count, target_date: newJob.date, priority: newJob.priority, status: 'Open', filled_headcount: 0 });
        error = err;
    }
    if (!error) { setIsJobModalOpen(false); fetchData(); setEditingJobId(null); setNewJob({ position: '', dept: '', count: 1, date: '', priority: 'Medium' }); } 
    else { alert("Error: " + error.message); }
  };

  const handleEditJob = (job: any) => { setEditingJobId(job.id); setNewJob({ position: job.position_name, dept: job.department, count: job.target_headcount, date: job.target_date, priority: job.priority }); setIsJobModalOpen(true); };
  const handleDeleteJob = async (id: number, posName: string) => { if(!confirm(`Hapus request manpower "${posName}"?`)) return; const { error } = await supabase.from('job_openings').delete().eq('id', id); if(!error) fetchData(); else alert("Gagal hapus: " + error.message); };

  return (
    <div className="space-y-8 animate-enter min-h-screen pb-20">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Talent Acquisition</h1>
        <p className="text-slate-500">Manage recruitment pipeline and manpower planning.</p>
      </div>

      {/* --- HERO BANNER --- */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 lg:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                  <span className="bg-white/20 text-xs font-bold px-2 py-1 rounded border border-white/10 flex items-center gap-1 animate-pulse">
                      <Target size={12}/> RECRUITMENT OVERVIEW
                  </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Hiring Pipeline</h2>
              <div className="flex gap-4 mt-4">
                  <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                      <div className="text-xs opacity-70 uppercase font-bold">Total Candidates</div>
                      <div className="text-2xl font-bold">{funnelStats.total}</div>
                  </div>
                  <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                      <div className="text-xs opacity-70 uppercase font-bold">Open Roles</div>
                      <div className="text-2xl font-bold">{jobs.filter(j => j.status === 'Open').length}</div>
                  </div>
              </div>
          </div>
          
          <div className="flex flex-col gap-3 min-w-[200px]">
              <button onClick={() => { setEditingJobId(null); setNewJob({ position: '', dept: '', count: 1, date: '', priority: 'Medium' }); setIsJobModalOpen(true); }} className="bg-white text-indigo-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 shadow-lg transition-transform active:scale-95">
                  <Target size={18} /> Manpower Request (MPP)
              </button>
              <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-indigo-800/50 backdrop-blur-md text-white border border-indigo-400/30 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-800 transition-colors">
                  <Plus size={18} /> Add New Candidate
              </button>
          </div>
      </div>

      {/* --- MAIN GRID LAYOUT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: MANPOWER & METRICS (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="HR Interview" count={funnelStats.hr_interview} color="text-blue-600" bg="bg-white" icon={<Briefcase size={16}/>}/>
                  <MetricCard label="User Test" count={funnelStats.user_test} color="text-purple-600" bg="bg-white" icon={<FileBadge size={16}/>}/>
                  <MetricCard label="Successful Hire" count={funnelStats.hired} color="text-emerald-600" bg="bg-white" icon={<CheckCircle2 size={16}/>}/>
              </div>

              {/* Manpower List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col max-h-[500px]">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Target size={16} className="text-indigo-600"/> Open Positions</h3>
                      <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold">{jobs.length}</span>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 space-y-2">
                      {jobs.map((job) => {
                           const diffDays = Math.ceil((new Date(job.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                           const isOverdue = diffDays < 0 && job.status === 'Open';
                           const progress = Math.min((job.filled_headcount / job.target_headcount) * 100, 100);
                           return (
                               <div key={job.id} className="group p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition-all relative">
                                   <div className="flex justify-between items-start mb-2">
                                       <div>
                                           <div className="font-bold text-slate-800 text-sm">{job.position_name}</div>
                                           <div className="text-xs text-slate-400">{job.department}</div>
                                       </div>
                                       <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${job.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{job.priority}</span>
                                   </div>
                                   <div className="flex items-center gap-2 mb-2">
                                       <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div></div>
                                       <span className="text-[10px] font-bold text-slate-600">{job.filled_headcount}/{job.target_headcount}</span>
                                   </div>
                                   <div className="flex justify-between items-center mt-2">
                                       <div className={`text-[10px] font-medium flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}><Clock size={10}/> {isOverdue ? `Overdue ${Math.abs(diffDays)}d` : `Due in ${diffDays}d`}</div>
                                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditJob(job)} className="p-1 hover:bg-white rounded text-slate-400 hover:text-indigo-600"><Pencil size={12}/></button>
                                            <button onClick={() => handleDeleteJob(job.id, job.position_name)} className="p-1 hover:bg-white rounded text-slate-400 hover:text-red-600"><Trash2 size={12}/></button>
                                       </div>
                                   </div>
                               </div>
                           )
                      })}
                      {jobs.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">No active requests.</div>}
                  </div>
              </div>
          </div>

          {/* RIGHT: ATS BOARD (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col h-[600px]">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 w-full flex-1 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100"><Search size={16} className="text-slate-400" /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search candidate..." className="flex-1 bg-transparent focus:outline-none text-sm" /></div>
                  <div className="flex gap-2">
                      <select className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 focus:outline-none" value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}><option value="All">All Roles</option>{[...new Set(jobs.map(j => j.position_name))].map(pos => <option key={pos} value={pos}>{pos}</option>)}</select>
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button onClick={() => setViewMode('board')} className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><LayoutGrid size={16}/></button>
                          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><List size={16}/></button>
                      </div>
                  </div>
              </div>

              <div className="flex-1 overflow-hidden relative border border-slate-200 rounded-xl bg-slate-50">
                {loading ? ( <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div> ) : viewMode === 'board' ? (
                    <div className="flex gap-4 h-full overflow-x-auto p-4">
                        {PIPELINE_STAGES.map((stage) => {
                            const stageCandidates = processedCandidates.filter(c => c.status === stage.id);
                            return (
                            <div key={stage.id} className="flex-1 flex flex-col min-w-[220px] max-w-[260px] h-full" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage.id)}>
                                <div className={`px-3 py-2 rounded-t-lg border-b-2 flex justify-between items-center bg-white ${stage.color.replace('text', 'border')}`}>
                                    <span className={`font-bold text-xs uppercase tracking-wide ${stage.color.split(' ')[2]}`}>{stage.label}</span>
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600">{stageCandidates.length}</span>
                                </div>
                                <div className="bg-slate-100/50 flex-1 rounded-b-lg p-2 space-y-2 overflow-y-auto">
                                    {stageCandidates.map((candidate) => (
                                        <div key={candidate.id} draggable onDragStart={(e) => handleDragStart(e, candidate.id)} onClick={() => handleEdit(candidate)} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group relative">
                                            {/* --- CLEAN CARD CONTENT (COMPACT) --- */}
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className="font-bold text-slate-900 text-sm line-clamp-1 leading-tight">{candidate.full_name}</h4>
                                                
                                                {/* QUICK DELETE BUTTON (Hidden by default, show on hover) */}
                                                <button 
                                                    onClick={(e) => deleteCandidateDirect(e, candidate.id, candidate.full_name)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 -mt-1 -mr-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                    title="Quick Delete"
                                                >
                                                    <Trash2 size={12}/>
                                                </button>
                                            </div>
                                            <p className="text-[10px] font-medium text-slate-500 truncate mb-2">{candidate.position}</p>
                                            
                                            {/* Footer: Date Only */}
                                            <div className="text-[10px] font-bold text-slate-900 border-t border-slate-100 pt-2 flex items-center justify-between">
                                                <span>Applied: {new Date(candidate.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )})}
                    </div>
                ) : (
                    <div className="bg-white h-full overflow-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <tr><th className="px-6 py-3 font-semibold text-slate-700 text-xs uppercase">Name</th><th className="px-6 py-3 font-semibold text-slate-700 text-xs uppercase">Role</th><th className="px-6 py-3 font-semibold text-slate-700 text-xs uppercase">Status</th><th className="px-6 py-3 text-right font-semibold text-slate-700 text-xs uppercase">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {processedCandidates.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => handleEdit(c)}>
                                        <td className="px-6 py-3 font-medium text-slate-900">{c.full_name}</td>
                                        <td className="px-6 py-3 text-slate-600">{c.position}</td>
                                        <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${PIPELINE_STAGES.find(s => s.id === c.status)?.color.replace('bg-', 'bg-opacity-10 bg-').replace('border-', 'border-opacity-30 border-')}`}>{c.status}</span></td>
                                        <td className="px-6 py-3 text-right">
                                            <button 
                                                onClick={(e) => deleteCandidateDirect(e, c.id, c.full_name)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete Candidate"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
              </div>
          </div>
      </div>

      {/* --- MODAL CANDIDATE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-enter flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-start shrink-0">
              <div><h2 className="text-xl font-bold text-slate-900">{editingId ? 'Candidate Details' : 'Add New Candidate'}</h2><p className="text-slate-500 text-sm">Review applicant information and manage status.</p></div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <div className="overflow-y-auto p-8">
              <form onSubmit={handleSave} className="space-y-6">
                
                {/* 1. BASIC INFO */}
                <div className="grid grid-cols-2 gap-6">
                   <div><label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label><input required name="full_name" value={formData.full_name} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" placeholder="Applicant Name" /></div>
                   <div><label className="block text-sm font-semibold text-slate-700 mb-2">Position Applied</label><input required name="position" value={formData.position} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" placeholder="e.g. UX Writer" /></div>
                   <div><label className="block text-sm font-semibold text-slate-700 mb-2">Email</label><input name="email" value={formData.email} onChange={handleChange} type="email" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" /></div>
                   <div><label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label><input name="phone" value={formData.phone} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" /></div>
                </div>
                
                {/* 2. WHATSAPP QUICK ACTIONS */}
                <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 space-y-3">
                    <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2"><MessageCircle size={14}/> Quick Actions: WhatsApp</h3>
                    <div className="grid grid-cols-2 gap-3">
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Big Five Code (Test Result)</label>
                            <div className="relative flex items-center">
                                <FileBadge size={14} className="absolute left-3 text-indigo-500"/>
                                <input name="test_result" value={formData.test_result} onChange={handleChange} className="w-full pl-9 pr-10 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-mono text-slate-600 truncate focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="e.g. 8d7s9..." />
                                {formData.test_result ? (
                                    <a href={`https://bigfive-test.com/result/${formData.test_result}`} target="_blank" rel="noreferrer" className="absolute right-2 p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="Open Result in New Tab">
                                        <ExternalLink size={14}/>
                                    </a>
                                ) : null}
                            </div>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Willingness Onsite</label>
                            <div className="relative"><Building2 size={14} className="absolute left-3 top-2.5 text-slate-400"/><input name="willingness_onsite" value={formData.willingness_onsite} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="e.g. Ya, Bersedia" /></div>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Domicile</label>
                            <div className="relative"><MapPin size={14} className="absolute left-3 top-2.5 text-red-500"/><input name="domicile" value={formData.domicile} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="e.g. Sleman, DIY" /></div>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Resume / CV Link</label>
                            <div className="relative">
                                <input name="resume_link" value={formData.resume_link} onChange={handleChange} type="text" placeholder="https://drive.google..." className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-blue-600" />
                                {formData.resume_link && <a href={formData.resume_link} target="_blank" rel="noreferrer" className="absolute right-2 top-1.5 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1">Open <ExternalLink size={10} /></a>}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* 4. SALARY & NOTICE */}
                <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                      <div><label className="block text-xs font-semibold text-slate-500 mb-1">Current Salary</label><div className="relative"><Banknote size={14} className="absolute left-3 top-2.5 text-slate-400"/><input name="current_salary" value={formData.current_salary} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" /></div></div>
                      <div><label className="block text-xs font-semibold text-slate-500 mb-1">Exp. Salary</label><div className="relative"><TrendingUp size={14} className="absolute left-3 top-2.5 text-emerald-500"/><input name="expected_salary" value={formData.expected_salary} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700" /></div></div>
                      <div><label className="block text-xs font-semibold text-slate-500 mb-1">Notice Period</label><div className="relative"><Clock size={14} className="absolute left-3 top-2.5 text-amber-500"/><input name="notice_period" value={formData.notice_period} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" /></div></div>
                </div>

                {/* 5. PIPELINE */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Pipeline Stage</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                       {PIPELINE_STAGES.map(stage => (
                           <button key={stage.id} type="button" onClick={() => setFormData({...formData, status: stage.id})} className={`px-2 py-2 text-xs font-bold rounded-lg border transition-all ${formData.status === stage.id ? `${stage.color.split(' ')[0]} ${stage.color.split(' ')[2]} border-transparent ring-2 ring-indigo-500/30` : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200'}`}>{stage.label}</button>
                       ))}
                    </div>
                </div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label><textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm h-24 resize-none" placeholder="Interviewer notes..." /></div>
                
                {/* FOOTER BUTTONS */}
                <div className="pt-6 border-t border-slate-50 flex justify-between items-center mt-8">
                  {editingId && (<button type="button" onClick={handleDeleteFromModal} className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-semibold text-sm flex items-center gap-2 transition-colors">{isDeleting ? <Loader2 size={16} className="animate-spin"/> : <><Trash2 size={16}/> Delete</>}</button>)}
                  <div className="flex gap-3 ml-auto"><button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold text-sm transition-colors">Cancel</button><button disabled={isSaving} type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold text-sm disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95">{isSaving ? <Loader2 size={16} className="animate-spin"/> : 'Save Changes'}</button></div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL JOB OPENING (MPP) --- */}
       {isJobModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-enter flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-start shrink-0">
              <div><h2 className="text-xl font-bold text-slate-900">{editingId ? 'Candidate Details' : 'Add New Candidate'}</h2><p className="text-slate-500 text-sm">Manpower Request</p></div>
              <button onClick={() => setIsJobModalOpen(false)} className="p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <div className="overflow-y-auto p-8">
               <div className="p-6 space-y-4">
                    <div><label className="text-xs font-bold text-slate-500">Position</label><input className="w-full p-2 border rounded-lg text-sm mt-1" value={newJob.position} onChange={e => setNewJob({...newJob, position: e.target.value})}/></div>
                    <div><label className="text-xs font-bold text-slate-500">Department</label><input className="w-full p-2 border rounded-lg text-sm mt-1" value={newJob.dept} onChange={e => setNewJob({...newJob, dept: e.target.value})}/></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold text-slate-500">Count</label><input type="number" className="w-full p-2 border rounded-lg text-sm mt-1" value={newJob.count} onChange={e => setNewJob({...newJob, count: parseInt(e.target.value)})}/></div>
                        <div><label className="text-xs font-bold text-slate-500">Date</label><input type="date" className="w-full p-2 border rounded-lg text-sm mt-1" value={newJob.date} onChange={e => setNewJob({...newJob, date: e.target.value})}/></div>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 flex justify-end gap-2">
                    <button onClick={() => setIsJobModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
                    <button onClick={handleSaveJob} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">Save Request</button>
                </div>
            </div>
          </div>
        </div>
      )}
      {/* {isJobModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-enter border border-slate-200">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">Manpower Request</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div><label className="text-xs font-bold text-slate-500">Position</label><input className="w-full p-2 border rounded-lg text-sm mt-1" value={newJob.position} onChange={e => setNewJob({...newJob, position: e.target.value})}/></div>
                    <div><label className="text-xs font-bold text-slate-500">Department</label><input className="w-full p-2 border rounded-lg text-sm mt-1" value={newJob.dept} onChange={e => setNewJob({...newJob, dept: e.target.value})}/></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold text-slate-500">Count</label><input type="number" className="w-full p-2 border rounded-lg text-sm mt-1" value={newJob.count} onChange={e => setNewJob({...newJob, count: parseInt(e.target.value)})}/></div>
                        <div><label className="text-xs font-bold text-slate-500">Date</label><input type="date" className="w-full p-2 border rounded-lg text-sm mt-1" value={newJob.date} onChange={e => setNewJob({...newJob, date: e.target.value})}/></div>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 flex justify-end gap-2">
                    <button onClick={() => setIsJobModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
                    <button onClick={handleSaveJob} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">Save Request</button>
                </div>
            </div>
        </div>
      )} */}

    </div>
  );
}

// Simple Metric Card Component
function MetricCard({ label, count, color, bg, icon }: any) {
    return ( <div className={`p-4 rounded-xl border border-slate-200 shadow-sm ${bg} flex items-center justify-between`}><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p><div className={`text-xl font-bold mt-1 ${color}`}>{count}</div></div><div className={`p-2 rounded-lg bg-slate-50 ${color}`}>{icon}</div></div> )
}