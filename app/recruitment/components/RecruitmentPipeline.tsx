"use client";

import React from 'react';
import { supabase } from '../../../lib/supabaseClient';

interface PipelineProps {
  candidates: any[];
  stages: any[];
  onEditCandidate: (candidate: any) => void;
  refreshData: () => void;
}

export default function RecruitmentPipeline({ candidates, stages, onEditCandidate, refreshData }: PipelineProps) {
  
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("candidateId", id.toString());
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };
  
  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    const candidateId = e.dataTransfer.getData("candidateId");
    
    // Update status ke Supabase
    const { error } = await supabase.from('candidates').update({ status: newStatus }).eq('id', candidateId);
    
    if (error) {
        alert("Failed to move candidate");
    } else {
        refreshData(); // Refresh data agar sinkron
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-220px)] px-2">
      {stages.map((stage) => {
        // Filter kandidat sesuai stage ini
        const stageCandidates = candidates.filter(c => c.status === stage.id);
        
        return (
          <div 
            key={stage.id} // <-- INI YANG SUDAH DIPERBAIKI (Pakai .id)
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
                    <div className="text-center py-10 opacity-30 text-xs font-bold text-slate-400">EMPTY</div>
                )}
                {stageCandidates.map((candidate) => (
                    <div 
                        key={candidate.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, candidate.id)} 
                        onClick={() => onEditCandidate(candidate)} 
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group relative transition-all hover:border-indigo-300"
                    >
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{candidate.full_name}</h4>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mb-2 truncate">{candidate.position}</p>
                        
                        <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                             <span className="text-[10px] font-semibold text-slate-400">
                                {new Date(candidate.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                             </span>
                             {candidate.resume_link && <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-1 rounded">CV</span>}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}