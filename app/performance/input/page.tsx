"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '../../../lib/supabaseClient'; 
import { ArrowLeft, Calculator, Loader2, Save, Download, Upload, FileText } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner'; // 1. IMPORT TOAST

// --- HELPER: SMART CSV PARSER (IMPORT) ---
const parseCSVLine = (text: string) => {
    const re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
    const re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    const a = []; 
    text.replace(re_value, function(m0, m1, m2, m3) {
        if      (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
        else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
        else if (m3 !== undefined) a.push(m3);
        return '';
    });
    if (/,\s*$/.test(text)) a.push('');
    return a;
};

// --- HELPER: SAFE CSV STRINGIFIER (EXPORT) ---
const safeCsv = (value: any) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`; 
    }
    return stringValue;
};

// --- KOMPONEN KONTEN UTAMA ---
function AdminInputContent() {
  const searchParams = useSearchParams();
  const editCycleId = searchParams.get('cid');
  const editEmpId = searchParams.get('eid');

  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [indicators, setIndicators] = useState<any[]>([]);

  const [selectedCycleId, setSelectedCycleId] = useState(editCycleId || '');
  const [selectedEmpId, setSelectedEmpId] = useState(editEmpId || '');
  
  const [scores, setScores] = useState<Record<string, any>>({});
  const [summaryStrength, setSummaryStrength] = useState('');
  const [summaryImprovement, setSummaryImprovement] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [isExporting, setIsExporting] = useState(false); 

  useEffect(() => {
    const init = async () => {
        const { data: cyc } = await supabase.from('performance_cycles').select('*').order('id', { ascending: false });
        const { data: emp } = await supabase.from('employees').select('id, full_name, job_position').order('full_name');
        const { data: ind } = await supabase.from('performance_indicators').select('*').order('id', { ascending: true });
        
        setCycles(cyc || []);
        setEmployees(emp || []);
        setIndicators(ind || []);
        setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
      const loadExistingReview = async () => {
          if(!selectedCycleId || !selectedEmpId) return;
          setSummaryStrength(''); setSummaryImprovement(''); setScores({});

          const { data: review } = await supabase.from('performance_reviews')
            .select('id, summary_strength, summary_areas_of_improvement')
            .eq('cycle_id', selectedCycleId).eq('employee_id', selectedEmpId).single();
          
          if(review) {
              setSummaryStrength(review.summary_strength || '');
              setSummaryImprovement(review.summary_areas_of_improvement || '');
              const { data: details } = await supabase.from('review_scores').select('*').eq('review_id', review.id);
              if(details) {
                  const mappedScores: any = {};
                  details.forEach((d: any) => {
                      if(!mappedScores[d.indicator_id]) mappedScores[d.indicator_id] = {};
                      mappedScores[d.indicator_id][d.reviewer_type.toLowerCase()] = d.score;
                  });
                  setScores(mappedScores);
              }
          }
      };
      loadExistingReview();
  }, [selectedCycleId, selectedEmpId]);

  // --- LOGIC 1: EXPORT CSV WITH DATA (UPDATED) ---
  const handleDownloadTemplate = async () => {
      if(!selectedCycleId) {
          toast.warning("Pilih Periode terlebih dahulu!");
          return;
      }
      setIsExporting(true);
      toast.info("Sedang mengekspor data...");

      try {
        const { data: reviews } = await supabase.from('performance_reviews')
            .select('id, employee_id, summary_strength, summary_areas_of_improvement')
            .eq('cycle_id', selectedCycleId);
        
        const reviewMap: Record<string, any> = {};
        const reviewIds: number[] = [];
        
        if (reviews) {
            reviews.forEach(r => {
                reviewMap[r.employee_id] = r;
                reviewIds.push(r.id);
            });
        }

        const scoreMap: Record<string, any> = {}; 
        
        if (reviewIds.length > 0) {
            const { data: scores } = await supabase.from('review_scores')
                .select('review_id, indicator_id, reviewer_type, score')
                .in('review_id', reviewIds);
            
            if (scores) {
                scores.forEach(s => {
                    const key = `${s.review_id}_${s.indicator_id}`;
                    if (!scoreMap[key]) scoreMap[key] = {};
                    scoreMap[key][s.reviewer_type.toLowerCase()] = s.score;
                });
            }
        }

        const rows = [['Employee_Name', 'Indicator_Code', 'Indicator_Name', 'Self_Score', 'Peer_Score', 'Supervisor_Score', 'Subordinate_Score', 'Strength_Narrative', 'Improvement_Narrative']];
        
        employees.forEach(emp => {
            const review = reviewMap[emp.id];
            const strStrength = review ? review.summary_strength : '';
            const strImprove = review ? review.summary_areas_of_improvement : '';

            indicators.forEach((ind, index) => {
                let self = '', peer = '', superv = '', subord = '';

                if (review) {
                    const key = `${review.id}_${ind.id}`;
                    const s = scoreMap[key];
                    if (s) {
                        self = s.self || '';
                        peer = s.peer || '';
                        superv = s.supervisor || '';
                        subord = s.subordinate || '';
                    }
                }

                const cellStrength = index === 0 ? strStrength : '';
                const cellImprove = index === 0 ? strImprove : '';

                rows.push([
                    safeCsv(emp.full_name),
                    safeCsv(ind.code),
                    safeCsv(ind.indicator_name),
                    safeCsv(self),
                    safeCsv(peer),
                    safeCsv(superv),
                    safeCsv(subord),
                    safeCsv(cellStrength),
                    safeCsv(cellImprove)
                ]);
            });
        });

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Data_Penilaian_HRIS.csv`);
        document.body.appendChild(link);
        link.click();
        
        toast.success("Download berhasil!");

      } catch (err: any) {
          toast.error("Gagal Export: " + err.message);
      }
      setIsExporting(false);
  };

  // --- LOGIC 2: UPLOAD CSV ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedCycleId) {
          toast.warning("Pilih File & Periode dulu!");
          return;
      }

      const reader = new FileReader();
      reader.onload = async (evt) => {
          const text = evt.target?.result as string;
          if(!text) return;

          setIsProcessingCsv(true);

          const uploadPromise = new Promise(async (resolve, reject) => {
              try {
                  const lines = text.split('\n');
                  const bulkData: Record<string, any> = {};

                  for (let i = 1; i < lines.length; i++) {
                      const lineText = lines[i].trim();
                      if (!lineText) continue;
                      
                      const row = parseCSVLine(lineText);
                      if (row.length < 2) continue; 
                      
                      const empName = row[0].trim();
                      const indCode = row[1].trim();
                      
                      const self = parseFloat(row[3]) || 0;
                      const peer = parseFloat(row[4]) || 0;
                      const superv = parseFloat(row[5]) || 0;
                      const subord = parseFloat(row[6]) || 0;
                      
                      const strStrength = row[7] ? row[7].trim() : '';
                      const strImprove = row[8] ? row[8].trim() : '';

                      const empObj = employees.find(e => e.full_name.trim().toLowerCase() === empName.toLowerCase());
                      const indObj = indicators.find(ind => ind.code.trim().toLowerCase() === indCode.toLowerCase());

                      if (empObj && indObj) {
                          if (!bulkData[empObj.id]) {
                              bulkData[empObj.id] = { scores: {}, strength: '', improvement: '' };
                          }
                          bulkData[empObj.id].scores[indObj.id] = { self, peer, supervisor: superv, subordinate: subord };
                          if (strStrength) bulkData[empObj.id].strength = strStrength;
                          if (strImprove) bulkData[empObj.id].improvement = strImprove;
                      }
                  }

                  const empIds = Object.keys(bulkData);
                  if (empIds.length === 0) throw new Error("Tidak ada data valid dalam CSV.");

                  const savePromises = empIds.map(empId => {
                      const data = bulkData[empId];
                      return calculateAndSave(empId, data.scores, data.strength, data.improvement, true);
                  });

                  await Promise.all(savePromises);
                  
                  resolve(`${empIds.length} karyawan`);
                  setTimeout(() => window.location.reload(), 2000);

              } catch (err: any) {
                  reject(err.message);
              }
          });

          toast.promise(uploadPromise, {
              loading: 'Mengimpor data CSV...',
              success: (msg) => `Sukses! Data ${msg} berhasil diupdate.`,
              error: (err) => `Gagal Import: ${err}`
          });
          
          setIsProcessingCsv(false);
          e.target.value = '';
      };
      reader.readAsText(file);
  };

  // --- LOGIC 3: CALCULATE & SAVE ---
  const calculateAndSave = async (employeeId: string, inputScores: any, strStrength: string, strImprove: string, silentMode = false) => {
      if(!selectedCycleId || !employeeId) return;
      
      let totalWeightedSum = 0;
      let indicatorCount = 0;
      const scoreInserts = [];

      for (const ind of indicators) {
          const s = inputScores[ind.id] || {};
          const valSelf = parseFloat(s.self) || 0;
          const valPeer = parseFloat(s.peer) || 0;
          const valSuper = parseFloat(s.supervisor) || 0;
          const valSub = parseFloat(s.subordinate) || 0;

          let indicatorFinalScore = 0;
          if (valSub === 0) {
              indicatorFinalScore = (valPeer * 0.30) + (valSuper * 0.70);
          } else {
              indicatorFinalScore = (valPeer * 0.30) + (valSuper * 0.60) + (valSub * 0.10);
          }

          if (valSuper > 0 || valPeer > 0) {
              totalWeightedSum += indicatorFinalScore;
              indicatorCount++;
          }

          scoreInserts.push({ review_id: null, indicator_id: ind.id, reviewer_type: 'Self', score: valSelf });
          scoreInserts.push({ review_id: null, indicator_id: ind.id, reviewer_type: 'Peer', score: valPeer });
          scoreInserts.push({ review_id: null, indicator_id: ind.id, reviewer_type: 'Supervisor', score: valSuper });
          scoreInserts.push({ review_id: null, indicator_id: ind.id, reviewer_type: 'Subordinate', score: valSub });
      }

      const finalScoreTotal = indicatorCount > 0 ? (totalWeightedSum / indicatorCount) : 0;
      const normalizedScore = finalScoreTotal * 20;

      let currentStrength = strStrength;
      let currentImprove = strImprove;

      if(silentMode && !strStrength && !strImprove) { 
           const { data: existingReview } = await supabase.from('performance_reviews')
                .select('summary_strength, summary_areas_of_improvement')
                .eq('cycle_id', selectedCycleId)
                .eq('employee_id', employeeId)
                .single();
           if(existingReview) {
               currentStrength = existingReview.summary_strength || '';
               currentImprove = existingReview.summary_areas_of_improvement || '';
           }
      }

      const { data: existing } = await supabase.from('performance_reviews').select('id').eq('cycle_id', selectedCycleId).eq('employee_id', employeeId).single();
      let reviewId = existing?.id;

      const headerData = { 
          cycle_id: selectedCycleId, 
          employee_id: employeeId, 
          final_score_total: finalScoreTotal, 
          normalized_score: normalizedScore,
          summary_strength: currentStrength,
          summary_areas_of_improvement: currentImprove
      };

      if (reviewId) {
          await supabase.from('performance_reviews').update(headerData).eq('id', reviewId);
          await supabase.from('review_scores').delete().eq('review_id', reviewId);
      } else {
          const { data: newReview } = await supabase.from('performance_reviews').insert([headerData]).select().single();
          reviewId = newReview.id;
      }

      const finalInserts = scoreInserts.map(item => ({ ...item, review_id: reviewId }));
      await supabase.from('review_scores').insert(finalInserts);
  };

  const handleManualSave = () => {
      setSaving(true);
      
      const savePromise = calculateAndSave(selectedEmpId, scores, summaryStrength, summaryImprovement, false);
      
      toast.promise(savePromise, {
          loading: 'Menyimpan penilaian...',
          success: () => {
              setSaving(false);
              return 'Data berhasil disimpan!';
          },
          error: (err) => {
              setSaving(false);
              return `Gagal simpan: ${err}`;
          }
      });
  };

  const handleScoreChange = (indicatorId: number, type: string, value: string) => {
      setScores(prev => ({ ...prev, [indicatorId]: { ...prev[indicatorId], [type]: value } }));
  };

  const groupedInd = indicators.reduce((acc: any, curr) => {
    (acc[curr.category] = acc[curr.category] || []).push(curr);
    return acc;
  }, {});

  return (
    <div className="min-h-screen pb-20 animate-enter space-y-6">
        <div className="flex items-center gap-4">
            <Link href="/performance" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"><ArrowLeft size={20}/></Link>
            <div><h1 className="text-2xl font-bold text-slate-900">Input Penilaian (Admin)</h1><p className="text-slate-500 text-sm">Pilih periode untuk mulai.</p></div>
        </div>

        {/* SELECTOR */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
                <label className="text-xs font-bold text-slate-500 mb-1">1. Pilih Periode Aktif</label>
                <select className="w-full p-2.5 border rounded-lg text-sm bg-slate-50 font-bold text-indigo-900" value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)}>
                    <option value="">-- Pilih Cycle --</option>
                    {cycles.filter(c => c.status !== 'Closed').map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
            </div>
            <hr className="border-slate-100"/>
            <div className="space-y-3">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><Upload size={18}/> Opsi A: Import Skor & Narasi (CSV)</h3>
                <p className="text-xs text-slate-500">
                    Tombol download sekarang akan <strong>mengekspor data terbaru</strong> dari sistem. Silakan edit di Excel lalu upload kembali.
                </p>
                <div className="flex gap-2">
                    <button onClick={handleDownloadTemplate} disabled={!selectedCycleId} className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-2">
                        {isExporting ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>} {isExporting ? 'Exporting...' : 'Export Data / Template'}
                    </button>
                    <label className={`px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-2 cursor-pointer ${!selectedCycleId ? 'opacity-50 pointer-events-none' : ''}`}>
                        {isProcessingCsv ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>} Upload CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isProcessingCsv}/>
                    </label>
                </div>
            </div>
            <hr className="border-slate-100"/>
            <div className="space-y-3">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2"><Calculator size={18}/> Opsi B: Input Manual / Edit Narasi</h3>
                 <select className="w-full p-2 border rounded-lg text-sm" value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} disabled={!selectedCycleId}>
                    <option value="">-- Pilih Karyawan Manual --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
            </div>
        </div>

        {/* FORM MANUAL */}
        {selectedCycleId && selectedEmpId && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-enter">
                <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                    <h3 className="font-bold text-indigo-900">Form: {employees.find(e=>e.id==selectedEmpId)?.full_name}</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                    <div className="lg:col-span-2 p-6">
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Calculator size={16}/> Input Skor Kuantitatif</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 border-b">
                                    <tr><th className="px-4 py-2 w-1/3">Indikator</th><th className="px-1 py-2 text-center text-[10px]">Self</th><th className="px-1 py-2 text-center text-[10px]">Peer</th><th className="px-1 py-2 text-center text-[10px]">Superv</th><th className="px-1 py-2 text-center text-[10px]">Subord</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.keys(groupedInd).map(cat => (
                                        <React.Fragment key={cat}>
                                            <tr className="bg-slate-50/50"><td colSpan={5} className="px-4 py-1.5 font-bold text-[10px] text-slate-400 uppercase">{cat}</td></tr>
                                            {groupedInd[cat].map((ind: any) => (
                                                <tr key={ind.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2 font-medium text-slate-700 text-xs">{ind.indicator_name}</td>
                                                    {['self', 'peer', 'supervisor', 'subordinate'].map(type => (
                                                        <td key={type} className="px-1 py-1"><input type="number" step="0.1" min="0" max="5" className="w-full p-1 border rounded text-center text-xs outline-none focus:border-indigo-500" value={scores[ind.id]?.[type] || ''} onChange={(e) => handleScoreChange(ind.id, type, e.target.value)} /></td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="lg:col-span-1 p-6 bg-slate-50/30">
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><FileText size={16}/> Input Narasi (Summary)</h4>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-emerald-700 mb-1">Strengths (Kekuatan)</label><textarea className="w-full p-3 border border-emerald-200 rounded-lg text-sm h-32 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Paste hasil AI di sini..." value={summaryStrength} onChange={e => setSummaryStrength(e.target.value)} /></div>
                            <div><label className="block text-xs font-bold text-amber-700 mb-1">Areas of Improvement</label><textarea className="w-full p-3 border border-amber-200 rounded-lg text-sm h-32 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Paste hasil AI di sini..." value={summaryImprovement} onChange={e => setSummaryImprovement(e.target.value)} /></div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t bg-slate-50 flex justify-end">
                    <button onClick={handleManualSave} disabled={saving} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2">{saving ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>} Simpan Semua Data</button>
                </div>
            </div>
        )}
    </div>
  );
}

export default function AdminInputPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading Input Form...</div>}>
            <AdminInputContent />
        </Suspense>
    );
}