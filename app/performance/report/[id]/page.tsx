"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useReactToPrint } from 'react-to-print'; 
import { ArrowLeft, Printer, Briefcase, Award, BookOpen, User, Users, Shield, UserCheck } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';

export default function PerformanceReportPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [scoreDetails, setScoreDetails] = useState<any[]>([]);
  const [indicatorsInfo, setIndicatorsInfo] = useState<any[]>([]); 

  const componentRef = useRef<HTMLDivElement>(null);

  // --- CONFIG PRINT (A4) ---
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Performance_Report_${id}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-container {
            width: 100%;
            margin: 0;
            box-shadow: none;
            border: none;
        }
        .force-break {
            page-break-before: always;
            margin-top: 2rem; 
        }
        .avoid-break-inside {
            page-break-inside: avoid;
        }
        /* Hide scrollbars & shadows in print */
        ::-webkit-scrollbar { display: none; }
        * { box-shadow: none !important; }
      }
    `
  });

  useEffect(() => {
    if(id) fetchReportData();
  }, [id]);

  const fetchReportData = async () => {
    try {
        setLoading(true);
        
        const { data: reviewData, error } = await supabase.from('performance_reviews')
            .select(`*, employee:employees!employee_id(full_name, job_position, department, id), cycle:performance_cycles!cycle_id(title)`)
            .eq('id', id).single();
        
        if (error || !reviewData) { 
            toast.error("Laporan tidak ditemukan."); 
            setLoading(false); 
            return; 
        }
        setReview(reviewData);

        const { data: scores } = await supabase.from('review_scores')
            .select(`score, reviewer_type, indicator:performance_indicators(id, indicator_name, code, category, description)`)
            .eq('review_id', id);

        const { data: allIndicators } = await supabase.from('performance_indicators')
            .select('*')
            .order('id', { ascending: true }); 
            
        setIndicatorsInfo(allIndicators || []);

        if (scores) processChartData(scores);
    } catch (err) {
        console.error(err);
        toast.error("Gagal memuat data laporan.");
    } finally {
        setLoading(false);
    }
  };

  const processChartData = (scores: any[]) => {
      const grouped: Record<string, any> = {};
      const details: any[] = [];

      scores.forEach((item: any) => {
          const indId = item.indicator.id;
          const typeKey = item.reviewer_type.toLowerCase(); 
          
          // Grouping for Radar Chart
          if (!grouped[indId]) {
              grouped[indId] = { 
                  subject: item.indicator.code || item.indicator.indicator_name.substring(0,4), 
                  fullMark: 5 
              };
          }
          grouped[indId][typeKey] = Number(item.score);

          // Grouping for Table Detail
          const existingDetail = details.find(d => d.id === indId);
          if(existingDetail) {
              existingDetail[typeKey] = item.score;
          } else {
              details.push({
                  id: indId,
                  category: item.indicator.category,
                  name: item.indicator.indicator_name,
                  code: item.indicator.code,
                  [typeKey]: item.score
              });
          }
      });

      setChartData(Object.values(grouped));
      details.sort((a,b) => a.id - b.id);
      setScoreDetails(details);
  };

  const getCategoryLabel = (score: number) => {
      if (score >= 91) return 'Outstanding Performance';
      if (score >= 76) return 'Exceed Expectation';
      if (score >= 60) return 'Meet Expectation';
      if (score >= 41) return 'Under Expectation';
      return 'Need Significant Improvement';
  };

  // --- HELPER: COLOR CODING BY CATEGORY ---
  const getBadgeStyle = (category: string) => {
      const key = category?.toLowerCase().trim() || '';
      if (key.includes('role') || key.includes('expertise') || key.includes('hard')) return 'bg-blue-50 text-blue-700 border-blue-200';
      if (key.includes('personal') || key.includes('behavior') || key.includes('soft')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      if (key.includes('leader') || key.includes('management')) return 'bg-amber-50 text-amber-700 border-amber-200';
      if (key.includes('business') || key.includes('result')) return 'bg-violet-50 text-violet-700 border-violet-200';
      return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  // --- LOGIC: SPLIT DATA MENJADI 2 KOLOM ---
  const midIndex = Math.ceil(indicatorsInfo.length / 2);
  const leftColumnIndicators = indicatorsInfo.slice(0, midIndex);
  const rightColumnIndicators = indicatorsInfo.slice(midIndex);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Report...</div>;

  return (
    <div className="min-h-screen pb-20 bg-slate-50/50">
        
        {/* TOP BAR (NON-PRINT) */}
        <div className="flex items-center justify-between mb-6 p-6 max-w-5xl mx-auto print:hidden">
            <div className="flex items-center gap-4">
                <Link href="/performance/results" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"><ArrowLeft size={20}/></Link>
                <h1 className="text-2xl font-bold text-slate-900">Performance Report</h1>
            </div>
            <button onClick={() => handlePrint()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-sm transition-colors">
                <Printer size={18}/> Print / PDF
            </button>
        </div>

        {/* === AREA PRINT === */}
        <div className="flex justify-center p-4 print:p-0">
            <div 
                ref={componentRef} 
                className="print-container bg-white w-full max-w-5xl mx-auto shadow-lg border border-slate-200 rounded-2xl overflow-hidden print:rounded-none"
            >
                
                {/* --- HALAMAN 1 --- */}

                {/* 1. HEADER */}
                <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-blue-600 text-white print:bg-indigo-600 print:py-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-1">{review.employee?.full_name}</h1>
                            <p className="opacity-90 text-lg flex items-center gap-2"><Briefcase size={18}/> {review.employee?.job_position}</p>
                            <div className="mt-4 flex gap-4 text-sm opacity-80">
                                <span className="bg-white/20 px-3 py-1 rounded-full border border-white/10">{review.employee?.department}</span>
                                <span className="bg-white/20 px-3 py-1 rounded-full border border-white/10">{review.cycle?.title}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm opacity-80 mb-1">Final Performance Score</div>
                            <div className="text-6xl font-extrabold tracking-tight">{review.normalized_score}</div>
                            <div className="mt-2 font-extrabold text-yellow-300 text-lg uppercase tracking-wide">
                                {getCategoryLabel(review.normalized_score)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 print:grid-cols-3">
                    
                    {/* 2. CHART */}
                    <div className="lg:col-span-1 p-6 border-r border-slate-100 flex flex-col items-center justify-center bg-slate-50/30 print:col-span-1 print:p-4">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Award size={18}/> 360° Visual Profile</h3>
                        <div className="w-full h-[350px] text-xs print:h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                    <Radar name="Self" dataKey="self" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                                    <Radar name="Supervisor" dataKey="supervisor" stroke="#eab308" fill="#eab308" fillOpacity={0.1} />
                                    <Radar name="Peer" dataKey="peer" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} />
                                    <Radar name="Subordinate" dataKey="subordinate" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} iconSize={8}/>
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. TABLE COMPACT */}
                    <div className="lg:col-span-2 p-6 print:col-span-2 print:p-6">
                        <h3 className="font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">Score Breakdown</h3>
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full text-sm text-left print:text-xs">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 w-[50%] print:py-2">Aspect / Indicator</th> 
                                        <th className="px-1 py-3 text-center w-[12%] print:py-2 flex items-center justify-center gap-1 text-blue-600"><User size={12}/> Self</th>
                                        <th className="px-1 py-3 text-center w-[12%] print:py-2 text-rose-500"><Users size={12} className="inline"/> Peer</th>
                                        <th className="px-1 py-3 text-center w-[12%] print:py-2 text-amber-500"><Shield size={12} className="inline"/> Supv</th>
                                        <th className="px-1 py-3 text-center w-[14%] print:py-2 text-emerald-600"><UserCheck size={12} className="inline"/> Sub</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {scoreDetails.map((item, idx) => {
                                        const prevCat = idx > 0 ? scoreDetails[idx-1].category : null;
                                        const isNewCat = item.category !== prevCat;
                                        return (
                                            <React.Fragment key={item.id}>
                                                {isNewCat && <tr className="bg-slate-100"><td colSpan={5} className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider print:py-1">{item.category}</td></tr>}
                                                <tr className="hover:bg-slate-50 avoid-break-inside">
                                                    <td className="px-4 py-2.5 font-medium text-slate-700 print:py-1.5">
                                                        <div>{item.name}</div>
                                                        <div className="text-[9px] text-slate-400 font-mono mt-0.5 print:block">{item.code}</div>
                                                    </td>
                                                    <td className="px-1 py-2.5 text-center font-mono text-slate-600 print:py-1.5">{item.self || '-'}</td>
                                                    <td className="px-1 py-2.5 text-center font-mono text-slate-600 print:py-1.5">{item.peer || '-'}</td>
                                                    <td className="px-1 py-2.5 text-center font-mono font-bold text-slate-800 print:py-1.5">{item.supervisor || '-'}</td>
                                                    <td className="px-1 py-2.5 text-center font-mono text-slate-600 print:py-1.5">{item.subordinate || '-'}</td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* --- HALAMAN 2 (Force Break) --- */}

                {/* 4. SUMMARY */}
                <div className="p-8 border-t border-slate-100 bg-slate-50 force-break print:p-8 print:border-t-0">
                    <h3 className="font-bold text-slate-800 mb-4 print:text-lg">Summary & Feedback</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-6">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm avoid-break-inside">
                            <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2">Strengths (Kekuatan)</h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed text-justify print:text-xs">{review.summary_strength || "Belum ada narasi kekuatan yang diinput."}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm avoid-break-inside">
                            <h4 className="text-xs font-bold text-amber-600 uppercase mb-2">Area of Improvement (Perbaikan)</h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed text-justify print:text-xs">{review.summary_areas_of_improvement || "Belum ada narasi perbaikan yang diinput."}</p>
                        </div>
                    </div>
                </div>

                {/* 5. GLOSSARY (Split Column Layout) */}
                <div className="p-8 border-t border-slate-200 print:p-8 print:pt-4">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 print:text-lg"><BookOpen size={18}/> Appendix: Competency Dictionary</h3>
                    
                    {/* CONTAINER UTAMA: 2 KOLOM KIRI & KANAN */}
                    <div className="flex flex-col md:flex-row gap-8 print:gap-8">
                        
                        {/* KOLOM KIRI (Indikator 1-5) */}
                        <div className="flex-1 space-y-4 print:space-y-3">
                            {leftColumnIndicators.map((ind) => (
                                <div key={ind.id} className="avoid-break-inside">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-700 print:text-xs">{ind.indicator_name}</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border print:border-slate-300 ${getBadgeStyle(ind.category)}`}>
                                            {ind.code}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 leading-snug text-justify print:text-[10px] print:leading-tight">
                                        {ind.description || "Definisi belum tersedia."}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* KOLOM KANAN (Indikator 6-10) */}
                        <div className="flex-1 space-y-4 print:space-y-3">
                            {rightColumnIndicators.map((ind) => (
                                <div key={ind.id} className="avoid-break-inside">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-700 print:text-xs">{ind.indicator_name}</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border print:border-slate-300 ${getBadgeStyle(ind.category)}`}>
                                            {ind.code}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 leading-snug text-justify print:text-[10px] print:leading-tight">
                                        {ind.description || "Definisi belum tersedia."}
                                    </p>
                                </div>
                            ))}
                        </div>

                    </div>
                    
                    <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between text-xs text-slate-400 print:text-[9px]">
                        <div>Generated by Tamtech HRIS</div>
                        <div>{new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
}