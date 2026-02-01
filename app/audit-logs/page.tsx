"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom"; // <--- WAJIB: Import Portal
import { supabase } from "@/lib/supabaseClient";
import { 
  Loader2, History, ArrowRight, Eye, 
  Trash2, Edit, PlusCircle, Search, RefreshCw, X 
} from "lucide-react";
import { toast } from 'sonner';

// Tipe data untuk Log
type AuditLog = {
  id: string;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  record_id: string;
  old_data: any;
  new_data: any;
  changed_by: string;
  changed_at: string;
};

// --- KOMPONEN UTAMA PAGE ---
export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // --- FETCH DATA ---
  useEffect(() => {
    fetchLogs(false); 
  }, []);

  const fetchLogs = async (showToast = true) => {
    setLoading(true);
    const promise = new Promise(async (resolve, reject) => {
        try {
            const { data, error } = await supabase
                .from("audit_logs")
                .select("*")
                .order("changed_at", { ascending: false }) 
                .limit(50); 

            if (error) throw error;
            setLogs(data || []);
            resolve("Data log diperbarui");
        } catch (err: any) {
            console.error("Gagal mengambil log:", err);
            reject(err.message);
        } finally {
            setLoading(false);
        }
    });

    if (showToast) {
        toast.promise(promise, {
            loading: 'Memuat rekaman CCTV...',
            success: (msg) => `${msg}`,
            error: (err) => `Gagal: ${err}`
        });
    }
  };

  // --- FORMATTER HELPERS ---
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const getBadgeColor = (op: string) => {
    switch (op) {
      case "INSERT": return "bg-green-100 text-green-700 border-green-200";
      case "UPDATE": return "bg-blue-50 text-blue-700 border-blue-200";
      case "DELETE": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getIcon = (op: string) => {
    switch (op) {
      case "INSERT": return <PlusCircle size={14} />;
      case "UPDATE": return <Edit size={14} />;
      case "DELETE": return <Trash2 size={14} />;
      default: return <History size={14} />;
    }
  };
  
  return (
    <div className="p-8 space-y-6 animate-enter min-h-screen pb-20"> 
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Audit Logs</h1>
          <p className="text-slate-500 text-sm mt-1">Activity records and sensitive data changes (CCTV).</p>
        </div>
        <button 
          onClick={() => fetchLogs(true)} 
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm active:scale-95"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh Data
        </button>
      </div>

      {/* --- TABEL LOGS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={32} className="animate-spin mb-3 text-indigo-500" />
            <p className="text-sm font-medium">Memuat rekaman...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 text-center text-slate-400">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p>Belum ada aktivitas yang terekam.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target Table</th>
                  <th className="px-6 py-4">Actor (User ID)</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-3 whitespace-nowrap font-mono text-xs text-slate-500">
                      {formatDate(log.changed_at)}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${getBadgeColor(log.operation)}`}>
                        {getIcon(log.operation)}
                        {log.operation}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-bold capitalize text-slate-700">
                      {log.table_name.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-3">
                      <code className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-500 font-mono border border-slate-200">
                        {log.changed_by ? log.changed_by.substring(0, 8) + "..." : "System"}
                      </code>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center justify-end gap-1 ml-auto cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye size={14} /> View Changes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- RENDER MODAL VIA PORTAL --- */}
      {selectedLog && (
        <LogDetailModal 
          log={selectedLog} 
          onClose={() => setSelectedLog(null)} 
        />
      )}
    </div>
  );
}

// --- SUB-COMPONENT: MODAL DETAIL (DENGAN PORTAL + FREEZE SCROLL) ---
function LogDetailModal({ log, onClose }: { log: AuditLog, onClose: () => void }) {
    // 1. Freeze Body Scroll saat Modal Muncul
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Helper Styles
    const getBadgeColor = (op: string) => {
        switch (op) {
          case "INSERT": return "bg-green-100 text-green-700 border-green-200";
          case "UPDATE": return "bg-blue-50 text-blue-700 border-blue-200";
          case "DELETE": return "bg-red-50 text-red-700 border-red-200";
          default: return "bg-slate-100 text-slate-700";
        }
    };

    // 2. Render ke Portal (document.body)
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-enter border border-slate-200">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Audit Log Details
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase ${getBadgeColor(log.operation)}`}>
                                {log.operation}
                            </span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">Log ID: {log.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="p-6 overflow-y-auto bg-slate-50/50 custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        
                        {/* KOLOM KIRI: DATA LAMA */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                Previous State (Old)
                            </h3>
                            {log.old_data ? (
                                <pre className="bg-white border border-red-100 rounded-xl p-4 text-xs font-mono text-slate-600 overflow-x-auto shadow-sm min-h-[300px]">
                                    {JSON.stringify(log.old_data, null, 2)}
                                </pre>
                            ) : (
                                <div className="h-[300px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-sm bg-white/50">
                                    <PlusCircle size={32} className="mb-2 opacity-50"/>
                                    No previous data (New Entry)
                                </div>
                            )}
                        </div>

                        {/* ARROW ICON (Desktop Only) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg border border-slate-100 hidden md:flex items-center justify-center z-10">
                            <ArrowRight className="text-slate-400" size={24} />
                        </div>

                        {/* KOLOM KANAN: DATA BARU */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                Current State (New)
                            </h3>
                            {log.new_data ? (
                                <pre className="bg-white border border-green-100 rounded-xl p-4 text-xs font-mono text-slate-600 overflow-x-auto shadow-sm min-h-[300px]">
                                    {JSON.stringify(log.new_data, null, 2)}
                                </pre>
                            ) : (
                                <div className="h-[300px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-sm bg-white/50">
                                    <Trash2 size={32} className="mb-2 opacity-50"/>
                                    Data has been deleted
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}