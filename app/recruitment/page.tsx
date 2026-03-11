"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  LayoutGrid, List, Briefcase, 
  MessageCircle, FileBadge, CheckCircle2, Loader2, Target, Plus
} from 'lucide-react';
import { toast } from 'sonner'; // 1. IMPORT TOAST

// Import Components
import RecruitmentPipeline from './components/RecruitmentPipeline';
import CandidateDatabase from './components/CandidateDatabase';
import JobOpenings from './components/JobOpenings';

// --- CONFIG STAGES ---
const PIPELINE_STAGES = [
  { id: 'Applied', label: 'Applied', color: 'bg-slate-100 border-slate-200 text-slate-600' },
  { id: 'HR Interview', label: 'HR Interview', color: 'bg-blue-50 border-blue-200 text-blue-600' },
  { id: 'Test & User Interview', label: 'Test & User Interview', color: 'bg-purple-50 border-purple-200 text-purple-600' },
  { id: 'Offering', label: 'Offering', color: 'bg-amber-50 border-amber-200 text-amber-600' },
  { id: 'Hired', label: 'Hired', color: 'bg-emerald-50 border-emerald-200 text-emerald-600' },
  { id: 'Rejected', label: 'Rejected', color: 'bg-red-50 border-red-200 text-red-600' }
];

export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'database' | 'jobs'>('pipeline');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

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

// --- HANDLER DELETE JOB (OPTIMIZED WITH TOAST) ---
  const handleDeleteJob = async (id: number) => {
      if(!confirm(`Hapus lowongan kerja ini?`)) return; 
      
      // 1. OPTIMISTIC UPDATE: Langsung hapus dari layar seketika biar user nggak nunggu loading
      setJobs(prevJobs => prevJobs.filter(job => job.id !== id));

      const deletePromise = new Promise(async (resolve, reject) => {
          const { error } = await supabase.from('job_openings').delete().eq('id', id);
          if (error) {
              // 2. Kalau database ternyata gagal/error, KEMBALIKAN datanya ke layar
              fetchData(); 
              reject(error.message);
          } else {
              resolve("Deleted");
          }
      });

      toast.promise(deletePromise, {
          loading: 'Menghapus data...',
          success: 'Lowongan berhasil dihapus',
          error: (err) => `Gagal hapus: ${err}`
      });
  };

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
                    onEditCandidate={() => {}} 
                    refreshData={fetchData}
                  />
                )}
                
                {activeTab === 'database' && (
                  <CandidateDatabase 
                    candidates={candidates} 
                    stages={PIPELINE_STAGES} 
                    onEditCandidate={() => {}} 
                    onRefresh={fetchData}
                  />
                )}
                
                {activeTab === 'jobs' && (
                  <JobOpenings 
                    jobs={jobs} 
                    onEditJob={() => {}} 
                    onDeleteJob={handleDeleteJob}
                    onAddJob={fetchData}
                  />
                )}
            </>
        )}
      </div>

    </div>
  );
}

// Simple Metric Card
function MetricCard({ label, count, color, bg, icon }: any) {
    return ( <div className={`p-4 rounded-2xl border border-slate-200 shadow-sm ${bg} flex items-center justify-between`}><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p><div className={`text-xl font-bold mt-1 ${color}`}>{count}</div></div><div className={`p-2.5 rounded-xl bg-white border border-slate-100 ${color}`}>{icon}</div></div> )
}