"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  LayoutGrid, 
  List, 
  Briefcase, 
  Plus, 
  Target, 
  Loader2,
  CheckCircle2,
  FileBadge,
  MessageCircle,
  X,
  Trash2,
  ExternalLink,
  MapPin,
  Banknote,
  TrendingUp,
  Clock,
  Building2,
  Send
} from 'lucide-react';

// Import Components (We will create these next)
import RecruitmentPipeline from './components/RecruitmentPipeline';
import CandidateDatabase from './components/CandidateDatabase';
import JobOpenings from './components/JobOpenings';

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
  const [activeTab, setActiveTab] = useState<'pipeline' | 'database' | 'jobs'>('pipeline');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // --- MODAL STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);

  // --- FORM STATES ---
  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', position: '', status: 'Applied', notes: '',
    resume_link: '', current_salary: '', expected_salary: '', notice_period: '', 
    domicile: '', willingness_onsite: '', test_result: ''        
  });

  const [newJob, setNewJob] = useState({ position: '', dept: '', count: 1, date: '', priority: 'Medium' });

  // --- FETCH DATA ---
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

  // --- HANDLERS CANDIDATE ---
  const handleEditCandidate = (c: any) => {
    setEditingId(c.id);
    setFormData({ 
        full_name: c.full_name, email: c.email || '', phone: c.phone || '', position: c.position, status: c.status, notes: c.notes || '', 
        resume_link: c.resume_link || '', current_salary: c.current_salary || '', expected_salary: c.expected_salary || '', 
        notice_period: c.notice_period || '', domicile: c.domicile || '', willingness_onsite: c.willingness_onsite || '', test_result: c.test_result || '' 
    });
    setIsModalOpen(true);
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    let result;
    if (editingId) result = await supabase.from('candidates').update(formData).eq('id', editingId);
    else result = await supabase.from('candidates').insert([formData]);
    
    if (!result.error) { setIsModalOpen(false); resetForm(); fetchData(); }
    else { alert("Error saving candidate: " + result.error.message); }
    setIsSaving(false);
  };

  const handleDeleteCandidate = async () => {
    if (!editingId || !confirm(`Hapus kandidat ${formData.full_name}?`)) return;
    setIsDeleting(true);
    const { error } = await supabase.from('candidates').delete().eq('id', editingId);
    if (!error) { setIsModalOpen(false); resetForm(); fetchData(); }
    setIsDeleting(false);
  };

  const resetForm = () => {
    setFormData({ full_name: '', email: '', phone: '', position: '', status: 'Applied', notes: '', resume_link: '', current_salary: '', expected_salary: '', notice_period: '', domicile: '', willingness_onsite: '', test_result: '' });
    setEditingId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const sendWhatsApp = (txt: string) => { let p = formData.phone.replace(/\D/g, ''); if (p.startsWith('0')) p='62'+p.substring(1); if(!p) return alert("No HP Invalid"); window.open(`https://api.whatsapp.com/send?phone=${p}&text=${encodeURIComponent(txt.replace('{name}',formData.full_name).replace('{position}',formData.position).replace('{email}',formData.email))}`, '_blank'); };


  // --- HANDLERS JOB ---
  const handleEditJob = (job: any) => { setEditingJobId(job.id); setNewJob({ position: job.position_name, dept: job.department, count: job.target_headcount, date: job.target_date, priority: job.priority }); setIsJobModalOpen(true); };
  
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

  const handleDeleteJob = async (id: number, posName: string) => { if(!confirm(`Hapus request manpower "${posName}"?`)) return; const { error } = await supabase.from('job_openings').delete().eq('id', id); if(!error) fetchData(); else alert("Gagal hapus: " + error.message); };


  // --- METRICS ---
  const funnelStats = {
    total: candidates.length,
    hr_interview: candidates.filter(c => c.status === 'HR Interview').length,
    user_test: candidates.filter(c => c.status === 'Test & User Interview').length,
    hired: candidates.filter(c => c.status === 'Hired').length
  };

  return (
    <div className="animate-enter max-w-full pb-20">
      
      {/* HEADER & HERO BANNER */}
      <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Talent Acquisition</h1>
              <p className="text-slate-500 text-sm">Manage recruitment pipeline and manpower planning.</p>
            </div>
            {/* Quick Actions Global */}
            <div className="flex gap-2">
                 <button onClick={() => { setEditingJobId(null); setNewJob({ position: '', dept: '', count: 1, date: '', priority: 'Medium' }); setIsJobModalOpen(true); }} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                    <Target size={16} /> MPP Request
                 </button>
                 <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">
                    <Plus size={16} /> Add Candidate
                 </button>
            </div>
          </div>

          {/* METRIC CARDS ROW */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard label="Total Candidates" count={funnelStats.total} color="text-slate-700" bg="bg-white" icon={<Briefcase size={16}/>}/>
              <MetricCard label="HR Interview" count={funnelStats.hr_interview} color="text-blue-600" bg="bg-blue-50/50" icon={<MessageCircle size={16}/>}/>
              <MetricCard label="User Test" count={funnelStats.user_test} color="text-purple-600" bg="bg-purple-50/50" icon={<FileBadge size={16}/>}/>
              <MetricCard label="Successful Hire" count={funnelStats.hired} color="text-emerald-600" bg="bg-emerald-50/50" icon={<CheckCircle2 size={16}/>}/>
          </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-6 border-b border-slate-200 mb-6 bg-white px-2 sticky top-0 z-20">
        {[
          { id: 'pipeline', label: 'Pipeline Board', icon: LayoutGrid },
          { id: 'database', label: 'Candidate Database', icon: List },
          { id: 'jobs', label: 'Job Openings (MPP)', icon: Briefcase }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Icon size={18} /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB CONTENT */}
      <div className="min-h-[500px]">
        {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-slate-300" size={32}/></div>
        ) : (
            <>
                {activeTab === 'pipeline' && (
                  <RecruitmentPipeline 
                    candidates={candidates} 
                    stages={PIPELINE_STAGES} 
                    onEditCandidate={handleEditCandidate}
                    refreshData={fetchData}
                  />
                )}
                
                {activeTab === 'database' && (
                  <CandidateDatabase 
                    candidates={candidates} 
                    stages={PIPELINE_STAGES} 
                    onEditCandidate={handleEditCandidate}
                  />
                )}
                
                {activeTab === 'jobs' && (
                  <JobOpenings 
                    jobs={jobs} 
                    onEditJob={handleEditJob}
                    onDeleteJob={handleDeleteJob}
                    onAddJob={() => { setEditingJobId(null); setNewJob({ position: '', dept: '', count: 1, date: '', priority: 'Medium' }); setIsJobModalOpen(true); }}
                  />
                )}
            </>
        )}
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
              <form onSubmit={handleSaveCandidate} className="space-y-6">
                
                {/* 1. BASIC INFO */}
                <div className="grid grid-cols-2 gap-6">
                   <div><label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label><input required name="full_name" value={formData.full_name} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" placeholder="Applicant Name" /></div>
                   <div><label className="block text-sm font-semibold text-slate-700 mb-2">Position Applied</label><input required name="position" value={formData.position} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" placeholder="e.g. UX Writer" /></div>
                   <div><label className="block text-sm font-semibold text-slate-700 mb-2">Email</label><input name="email" value={formData.email} onChange={handleChange} type="email" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" /></div>
                   <div><label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label><input name="phone" value={formData.phone} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" /></div>
                </div>
                
                {/* 2. WHATSAPP QUICK ACTIONS */}
                {editingId && (
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
                )}

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
                  {editingId && (<button type="button" onClick={handleDeleteCandidate} className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-semibold text-sm flex items-center gap-2 transition-colors">{isDeleting ? <Loader2 size={16} className="animate-spin"/> : <><Trash2 size={16}/> Delete</>}</button>)}
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
          <div className="absolute inset-0 bg-white/80 backdrop-blur-md transition-opacity" onClick={() => setIsJobModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-enter flex flex-col">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-start shrink-0">
              <div><h2 className="text-xl font-bold text-slate-900">{editingJobId ? 'Edit MPP Request' : 'New MPP Request'}</h2><p className="text-slate-500 text-sm">Manpower Planning</p></div>
              <button onClick={() => setIsJobModalOpen(false)} className="p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-4">
                <div><label className="text-xs font-bold text-slate-500">Position</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1 focus:bg-white focus:ring-2 focus:ring-indigo-500/20" value={newJob.position} onChange={e => setNewJob({...newJob, position: e.target.value})} placeholder="e.g. Backend Engineer"/></div>
                <div><label className="text-xs font-bold text-slate-500">Department</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1 focus:bg-white focus:ring-2 focus:ring-indigo-500/20" value={newJob.dept} onChange={e => setNewJob({...newJob, dept: e.target.value})} placeholder="e.g. IT Engineering"/></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-500">Count</label><input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1 focus:bg-white focus:ring-2 focus:ring-indigo-500/20" value={newJob.count} onChange={e => setNewJob({...newJob, count: parseInt(e.target.value)})}/></div>
                    <div><label className="text-xs font-bold text-slate-500">Date Needed</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1 focus:bg-white focus:ring-2 focus:ring-indigo-500/20" value={newJob.date} onChange={e => setNewJob({...newJob, date: e.target.value})}/></div>
                </div>
                <div>
                     <label className="text-xs font-bold text-slate-500">Priority</label>
                     <div className="flex gap-2 mt-1">
                        {['Low', 'Medium', 'High'].map(p => (
                            <button key={p} onClick={() => setNewJob({...newJob, priority: p})} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${newJob.priority === p ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}>{p}</button>
                        ))}
                     </div>
                </div>
                <div className="pt-4 flex justify-end gap-2">
                    <button onClick={() => setIsJobModalOpen(false)} className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
                    <button onClick={handleSaveJob} className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200">Save Request</button>
                </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Simple Metric Card
function MetricCard({ label, count, color, bg, icon }: any) {
    return ( <div className={`p-4 rounded-2xl border border-slate-200 shadow-sm ${bg} flex items-center justify-between`}><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p><div className={`text-xl font-bold mt-1 ${color}`}>{count}</div></div><div className={`p-2.5 rounded-xl bg-white border border-slate-100 ${color}`}>{icon}</div></div> )
}