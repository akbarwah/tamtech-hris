"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient'; 
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, Briefcase, Award, BookOpen } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function PerformanceReportPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [scoreDetails, setScoreDetails] = useState<any[]>([]);
  const [indicatorsInfo, setIndicatorsInfo] = useState<any[]>([]); 

  useEffect(() => {
    if(id) fetchReportData();
  }, [id]);

  const fetchReportData = async () => {
    setLoading(true);
    
    // 1. Fetch Review Data
    const { data: reviewData } = await supabase.from('performance_reviews')
        .select(`*, employee:employees!employee_id(full_name, job_position, department, id), cycle:performance_cycles!cycle_id(title)`)
        .eq('id', id).single();
    
    if (!reviewData) { alert("Data tidak ditemukan."); setLoading(false); return; }
    setReview(reviewData);

    // 2. Fetch Scores
    const { data: scores } = await supabase.from('review_scores')
        .select(`score, reviewer_type, indicator:performance_indicators(id, indicator_name, code, category, description)`)
        .eq('review_id', id);

    // 3. Fetch Master Indicators (FIX: URUT BERDASARKAN ID AGAR SAMA DENGAN TABEL)
    const { data: allIndicators } = await supabase.from('performance_indicators')
        .select('*')
        .order('id', { ascending: true }); // <--- INI KUNCI URUTAN APPENDIX
        
    setIndicatorsInfo(allIndicators || []);

    if (scores) processChartData(scores);
    setLoading(false);
  };

  const processChartData = (scores: any[]) => {
      const grouped: Record<string, any> = {};
      const details: any[] = [];

      scores.forEach((item: any) => {
          const indId = item.indicator.id;
          const typeKey = item.reviewer_type.toLowerCase(); 
          
          if (!grouped[indId]) {
              grouped[indId] = { subject: item.indicator.code || item.indicator.indicator_name.substring(0,4), fullMark: 5 };
          }
          grouped[indId][typeKey] = Number(item.score);

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

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Report...</div>;

  return (
    <div className="min-h-screen pb-20 bg-slate-50/50">
        
        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-6 print:hidden p-6">
            <div className="flex items-center gap-4">
                <Link href="/performance/results" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"><ArrowLeft size={20}/></Link>
                <h1 className="text-2xl font-bold text-slate-900">Performance Report</h1>
            </div>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-sm"><Printer size={18}/> Print / PDF</button>
        </div>

        {/* REPORT PAPER */}
        <div className="bg-white max-w-5xl mx-auto shadow-lg border border-slate-200 rounded-none md:rounded-2xl overflow-hidden print:shadow-none print:border-none print:w-full print:max-w-none">
            
            {/* 1. HEADER (REVISI: HANYA TAMPILKAN SKOR 0-100) */}
            <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-blue-600 text-white print:bg-none print:text-black print:border-b-2 print:border-black">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">{review.employee?.full_name}</h1>
                        <p className="opacity-90 text-lg flex items-center gap-2"><Briefcase size={18}/> {review.employee?.job_position}</p>
                        <div className="mt-4 flex gap-4 text-sm opacity-80"><span className="bg-white/20 px-3 py-1 rounded-full">{review.employee?.department}</span><span className="bg-white/20 px-3 py-1 rounded-full">{review.cycle?.title}</span></div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm opacity-80 mb-1">Final Performance Score</div>
                        {/* HANYA MUNCULKAN ANGKA KONVERSI (0-100) */}
                        <div className="text-6xl font-extrabold tracking-tight">{review.normalized_score}</div>
                        
                        {/* KATEGORI */}
                        <div className="mt-2 font-extrabold text-yellow-300 text-lg uppercase tracking-wide print:text-black print:border print:border-black print:px-2 print:text-sm">
                            {getCategoryLabel(review.normalized_score)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3">
                {/* 2. CHART */}
                <div className="lg:col-span-1 p-6 border-r border-slate-100 flex flex-col items-center justify-center bg-slate-50/30">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Award size={18}/> 360° Visual Profile</h3>
                    <div className="w-full h-[350px] text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                <Radar name="Self" dataKey="self" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                                <Radar name="Supervisor" dataKey="supervisor" stroke="#eab308" fill="#eab308" fillOpacity={0.1} />
                                <Radar name="Peer" dataKey="peer" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} />
                                <Radar name="Subordinate" dataKey="subordinate" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}/>
                                <Tooltip/>
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. TABLE COMPACT */}
                <div className="lg:col-span-2 p-6">
                    <h3 className="font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">Score Breakdown</h3>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 w-[50%]">Aspect / Indicator</th> 
                                    <th className="px-1 py-3 text-center text-xs text-blue-600 w-[12%]">Self</th>
                                    <th className="px-1 py-3 text-center text-xs text-rose-500 w-[12%]">Peer</th>
                                    <th className="px-1 py-3 text-center text-xs text-amber-500 w-[12%]">Supv</th>
                                    <th className="px-1 py-3 text-center text-xs text-emerald-600 w-[14%]">Subord</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {scoreDetails.map((item, idx) => {
                                    const prevCat = idx > 0 ? scoreDetails[idx-1].category : null;
                                    const isNewCat = item.category !== prevCat;
                                    return (
                                        <React.Fragment key={item.id}>
                                            {isNewCat && <tr className="bg-slate-100"><td colSpan={5} className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.category}</td></tr>}
                                            <tr className="hover:bg-slate-50">
                                                <td className="px-4 py-2 font-medium text-slate-700">
                                                    <div>{item.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Code: {item.code}</div>
                                                </td>
                                                <td className="px-1 py-2 text-center font-mono text-slate-600">{item.self || '-'}</td>
                                                <td className="px-1 py-2 text-center font-mono text-slate-600">{item.peer || '-'}</td>
                                                <td className="px-1 py-2 text-center font-mono font-bold text-slate-800">{item.supervisor || '-'}</td>
                                                <td className="px-1 py-2 text-center font-mono text-slate-600">{item.subordinate || '-'}</td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 4. SUMMARY */}
            <div className="p-8 border-t border-slate-100 bg-slate-50 break-inside-avoid">
                <h3 className="font-bold text-slate-800 mb-4">Summary & Feedback</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2">Strengths (Kekuatan)</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{review.summary_strength || "Belum ada narasi kekuatan yang diinput."}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-bold text-amber-600 uppercase mb-2">Area of Improvement (Perbaikan)</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{review.summary_areas_of_improvement || "Belum ada narasi perbaikan yang diinput."}</p>
                    </div>
                </div>
            </div>

            {/* 5. GLOSSARY (APPENDIX) - NOW SORTED BY ID */}
            <div className="p-8 border-t border-slate-200 break-before-page">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BookOpen size={18}/> Appendix: Competency Dictionary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {indicatorsInfo.map((ind) => (
                        <div key={ind.id} className="mb-2 break-inside-avoid">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-700">{ind.indicator_name}</span>
                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">{ind.code}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 leading-snug">
                                {ind.description || "Definisi belum tersedia di database."}
                            </p>
                        </div>
                    ))}
                </div>
                
                <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between text-xs text-slate-400">
                    <div>Generated by Tamtech HRIS</div>
                    <div>{new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</div>
                </div>
            </div>

        </div>
    </div>
  );
}