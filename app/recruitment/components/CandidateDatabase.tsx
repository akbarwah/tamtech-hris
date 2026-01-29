"use client";

import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Filter } from 'lucide-react';

interface DatabaseProps {
  candidates: any[];
  stages: any[];
  onEditCandidate: (c: any) => void;
}

export default function CandidateDatabase({ candidates, stages, onEditCandidate }: DatabaseProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const uniqueRoles = useMemo(() => {
    return ["All Roles", ...Array.from(new Set(candidates.map(c => c.position)))];
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      const matchesSearch = candidate.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (candidate.email && candidate.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = roleFilter === "All Roles" || candidate.position === roleFilter;
      const matchesStatus = statusFilter === "All Status" || candidate.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [candidates, searchTerm, roleFilter, statusFilter]);

  const sortedCandidates = useMemo(() => {
    let sortableItems = [...filteredCandidates];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredCandidates, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mx-2">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap bg-slate-50/50">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-indigo-500 appearance-none hover:bg-slate-50 cursor-pointer"
              >
                {uniqueRoles.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
          </div>

          <div className="relative">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-indigo-500 appearance-none hover:bg-slate-50 cursor-pointer"
              >
                <option value="All Status">All Status</option>
                {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
              </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 group" onClick={() => requestSort('full_name')}>
                <div className="flex items-center gap-1">Candidate Name <ArrowUpDown size={12} className={`text-slate-300 group-hover:text-indigo-500 ${sortConfig?.key === 'full_name' ? 'text-indigo-600' : ''}`} /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 group" onClick={() => requestSort('position')}>
                <div className="flex items-center gap-1">Role <ArrowUpDown size={12} className={`text-slate-300 group-hover:text-indigo-500 ${sortConfig?.key === 'position' ? 'text-indigo-600' : ''}`} /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 group" onClick={() => requestSort('status')}>
                <div className="flex items-center gap-1">Status <ArrowUpDown size={12} className={`text-slate-300 group-hover:text-indigo-500 ${sortConfig?.key === 'status' ? 'text-indigo-600' : ''}`} /></div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 group" onClick={() => requestSort('created_at')}>
                <div className="flex items-center gap-1">Applied Date <ArrowUpDown size={12} className={`text-slate-300 group-hover:text-indigo-500 ${sortConfig?.key === 'created_at' ? 'text-indigo-600' : ''}`} /></div>
              </th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedCandidates.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">No candidates found.</td></tr>
            ) : (
              sortedCandidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onEditCandidate(candidate)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                        {candidate.full_name.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{candidate.full_name}</p>
                        <p className="text-xs text-slate-400">{candidate.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm text-slate-600">{candidate.position}</span></td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-1 rounded text-[10px] font-bold border ${stages.find(s => s.id === candidate.status)?.color.replace('bg-', 'bg-opacity-10 bg-').replace('border-', 'border-opacity-30 border-') || 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                        {candidate.status}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(candidate.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={(e) => { e.stopPropagation(); onEditCandidate(candidate); }} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold hover:underline">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}