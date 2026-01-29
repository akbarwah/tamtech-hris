"use client";

import React from 'react';
import { Users, CheckCircle2, Clock, Pencil, Trash2, Plus } from 'lucide-react';

interface JobOpeningsProps {
  jobs: any[];
  onEditJob: (job: any) => void;
  onDeleteJob: (id: number, name: string) => void;
  onAddJob: () => void;
}

export default function JobOpenings({ jobs, onEditJob, onDeleteJob, onAddJob }: JobOpeningsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
      {jobs.map(job => {
        const diffDays = Math.ceil((new Date(job.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = diffDays < 0 && job.status === 'Open';
        const progress = Math.min((job.filled_headcount / job.target_headcount) * 100, 100);

        return (
          <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group relative">
            
            {/* Action Buttons (Hover) */}
            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEditJob(job)} className="p-1.5 bg-slate-100 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600"><Pencil size={14}/></button>
                <button onClick={() => onDeleteJob(job.id, job.position_name)} className="p-1.5 bg-slate-100 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
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
                <span>Target: <span className="font-bold">{job.filled_headcount}</span> / {job.target_headcount} Hired</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Progress</span>
                <span className="font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )
      })}
      
      {/* ADD NEW JOB CARD */}
      <button onClick={onAddJob} className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all min-h-[250px] group">
        <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
          <Plus size={24} />
        </div>
        <span className="font-bold text-sm">Create New MPP Request</span>
      </button>
    </div>
  );
}