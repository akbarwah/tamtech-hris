"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient'; 
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, 
  User, CreditCard, FileText, Briefcase, Heart,
  ExternalLink, Loader2, Edit, Save, X, Pencil, ShieldAlert, Link as LinkIcon, Trash2, Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function EmployeeDetailPage() {
  const params = useParams();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'emergency' | 'documents'>('personal');
  
  // --- STATE UNTUK EDIT MODE ---
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployeeDetail();
  }, [params.id]);

  const fetchEmployeeDetail = async () => {
    if (!params.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) console.error('Error fetching employee:', error);
    else {
        setEmployee(data);
        setFormData(data); 
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('employees').update({
            // Basic & Photo
            full_name: formData.full_name, nik: formData.nik, email: formData.email, phone: formData.phone,
            photo_url: formData.photo_url, 
            
            // Operational
            job_position: formData.job_position, department: formData.department, employment_status: formData.employment_status,
            join_date: formData.join_date, contract_end_date: formData.contract_end_date, 
            
            // Personal
            ktp_address: formData.ktp_address, domicile_address: formData.domicile_address,
            birth_place: formData.birth_place, birth_date: formData.birth_date, marital_status: formData.marital_status, npwp_number: formData.npwp_number,
            
            // Emergency
            emergency_contact_name: formData.emergency_contact_name, emergency_contact_relation: formData.emergency_contact_relation, emergency_contact_phone: formData.emergency_contact_phone,
            
            // Documents
            ktp_url: formData.ktp_url, npwp_url: formData.npwp_url, ijazah_url: formData.ijazah_url, bank_account_url: formData.bank_account_url
        }).eq('id', params.id);

    if (error) { alert("Gagal update: " + error.message); } 
    else { setEmployee(formData); setIsEditing(false); }
    setSaving(false);
  };

  const handleRemovePhoto = () => {
      setFormData({ ...formData, photo_url: null });
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;
  if (!employee) return <div className="h-screen flex items-center justify-center text-slate-500">Employee not found.</div>;

  return (
    <div className="animate-enter max-w-5xl mx-auto pb-10 space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/employees" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"><ArrowLeft size={20}/></Link>
            <div><h1 className="text-2xl font-bold text-slate-900">Employee Profile</h1><p className="text-slate-500 text-sm">View and manage personnel information.</p></div>
        </div>
        <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold shadow-sm shadow-indigo-200"><Pencil size={16}/> Edit Profile</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full bg-slate-100 mb-4 overflow-hidden border-4 border-white shadow-lg relative group">
                    {employee.photo_url ? <img src={employee.photo_url} alt={employee.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer"/> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-300">{employee.full_name.charAt(0)}</div>}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{employee.full_name}</h2>
                <p className="text-sm text-slate-500 mb-4">{employee.job_position || 'Posisi Belum Diisi'} • {employee.department || 'General'}</p>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${employee.employment_status === 'Permanent' ? 'bg-emerald-100 text-emerald-700' : employee.employment_status === 'Contract' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{employee.employment_status}</span>
                <div className="w-full border-t border-slate-100 my-6"></div>
                <div className="w-full space-y-3 text-sm text-left">
                    <div className="flex items-center gap-3 text-slate-600"><Mail size={16} className="text-slate-400 shrink-0"/> <span className="truncate">{employee.email}</span></div>
                    <div className="flex items-center gap-3 text-slate-600"><Phone size={16} className="text-slate-400 shrink-0"/> <span>{employee.phone || '-'}</span></div>
                    <div className="flex items-center gap-3 text-slate-600"><Calendar size={16} className="text-slate-400 shrink-0"/> <span>EOC: <span className="font-bold text-slate-900">{employee.contract_end_date || '-'}</span></span></div>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[500px]">
                <div className="flex border-b border-slate-200 overflow-x-auto">
                    <button onClick={() => setActiveTab('personal')} className={`flex-1 py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'personal' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Personal Info</button>
                    <button onClick={() => setActiveTab('emergency')} className={`flex-1 py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'emergency' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Emergency</button>
                    <button onClick={() => setActiveTab('documents')} className={`flex-1 py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'documents' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Documents</button>
                </div>
                <div className="p-6 md:p-8">
                    {activeTab === 'personal' && (
                        <div className="space-y-6 animate-enter">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InfoItem label="NIK" value={employee.nik} icon={<Briefcase size={16}/>} />
                                <InfoItem label="Status Pernikahan" value={employee.marital_status} icon={<Heart size={16}/>} />
                                <InfoItem label="TTL" value={`${employee.birth_place || ''}, ${employee.birth_date || ''}`} icon={<User size={16}/>} />
                                <InfoItem label="NPWP" value={employee.npwp_number} icon={<CreditCard size={16}/>} />
                            </div>
                            <div className="pt-6 border-t border-slate-100 space-y-4">
                                <InfoItem label="Alamat KTP" value={employee.ktp_address} icon={<MapPin size={16}/>} fullWidth />
                                <InfoItem label="Alamat Domisili" value={employee.domicile_address} icon={<MapPin size={16}/>} fullWidth />
                            </div>
                        </div>
                    )}
                    {activeTab === 'emergency' && (
                        <div className="space-y-6 animate-enter">
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-4">
                                <div className="p-2 bg-white rounded-full text-red-500 shadow-sm"><Phone size={20}/></div>
                                <div><h4 className="font-bold text-red-800">Kontak Darurat Utama</h4><p className="text-red-600 text-sm mt-1">Harap hubungi nomor ini hanya dalam keadaan mendesak.</p></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <InfoItem label="Nama Kontak" value={employee.emergency_contact_name} />
                                <InfoItem label="Hubungan" value={employee.emergency_contact_relation} />
                                <InfoItem label="Nomor Telepon" value={employee.emergency_contact_phone} fullWidth highlight />
                            </div>
                        </div>
                    )}
                    {activeTab === 'documents' && (
                        <div className="space-y-4 animate-enter">
                            <DocItem label="KTP" url={employee.ktp_url} />
                            <DocItem label="NPWP" url={employee.npwp_url} />
                            <DocItem label="Ijazah" url={employee.ijazah_url} />
                            <DocItem label="Buku Tabungan" url={employee.bank_account_url} />
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* --- MODAL EDIT PROFILE (DIPERBAIKI: INDIGO TINT + BLUR) --- */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* OVERLAY BARU: 
               - bg-indigo-900/10 : Tint Indigo (Biru Gelap) sangat transparan (10%). Tidak hitam kotor.
               - backdrop-blur-sm : Efek blur secukupnya.
            */}
            <div className="absolute inset-0 bg-indigo-900/10 backdrop-blur-sm transition-all" onClick={() => setIsEditing(false)}></div>
            
            {/* MODAL BOX */}
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative z-10 border border-slate-200 animate-enter">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-bold text-slate-900">Edit Data Karyawan</h3>
                    <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* SECTION 1: OPERATIONAL */}
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-4">
                        <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2"><Briefcase size={16}/> Data Operasional HR</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-slate-700 mb-1">Jabatan / Posisi</label><input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.job_position || ''} onChange={e => setFormData({...formData, job_position: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-slate-700 mb-1">Departemen</label><input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-slate-700 mb-1">Status Karyawan</label><select className="w-full p-2 border rounded-lg text-sm bg-white" value={formData.employment_status || 'Contract'} onChange={e => setFormData({...formData, employment_status: e.target.value})}><option value="Contract">Contract</option><option value="Permanent">Permanent</option><option value="Probation">Probation</option></select></div>
                            <div><label className="block text-xs font-bold text-slate-700 mb-1">EOC (End of Contract)</label><input type="date" className="w-full p-2 border rounded-lg text-sm" value={formData.contract_end_date || ''} onChange={e => setFormData({...formData, contract_end_date: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold text-slate-700 mb-1">Join Date</label><input type="date" className="w-full p-2 border rounded-lg text-sm bg-slate-100" value={formData.join_date || ''} onChange={e => setFormData({...formData, join_date: e.target.value})} /></div>
                        </div>
                    </div>
                    <hr className="border-slate-100"/>
                    
                    {/* SECTION 2: BASIC INFO & PHOTO */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Informasi Dasar & Foto</h4>
                        
                        {/* FITUR FOTO */}
                        <div className="flex gap-4 items-start bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden border">
                                {formData.photo_url ? <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={20}/></div>}
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Link Foto Profil (URL)</label>
                                <div className="flex gap-2">
                                    <input type="text" className="w-full p-2 border rounded text-xs" value={formData.photo_url || ''} onChange={e => setFormData({...formData, photo_url: e.target.value})} placeholder="https://..." />
                                    {formData.photo_url && (
                                        <button onClick={handleRemovePhoto} className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs font-bold hover:bg-red-200 flex items-center gap-1" title="Hapus Foto"><Trash2 size={12}/> Hapus</button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label><input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.full_name || ''} onChange={e => setFormData({...formData, full_name: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-slate-700 mb-1">NIK</label><input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.nik || ''} onChange={e => setFormData({...formData, nik: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-slate-700 mb-1">Nomor HP / WA</label><input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                             <div className="col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Email</label><input type="email" className="w-full p-2 border rounded-lg text-sm" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold text-slate-700 mb-1">Tempat Lahir</label><input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.birth_place || ''} onChange={e => setFormData({...formData, birth_place: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Lahir</label><input type="date" className="w-full p-2 border rounded-lg text-sm" value={formData.birth_date || ''} onChange={e => setFormData({...formData, birth_date: e.target.value})} /></div>
                        </div>
                    </div>
                    <hr className="border-slate-100"/>

                    {/* SECTION 3: EMERGENCY & DOCS */}
                    <div className="space-y-4">
                         <h4 className="text-sm font-bold text-red-500 uppercase tracking-wider flex items-center gap-2"><ShieldAlert size={16}/> Kontak Darurat & Dokumen</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div><label className="block text-xs font-bold text-slate-700 mb-1">Nama Kontak Darurat</label><input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.emergency_contact_name || ''} onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})} /></div>
                             <div><label className="block text-xs font-bold text-slate-700 mb-1">Hubungan</label><input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.emergency_contact_relation || ''} onChange={e => setFormData({...formData, emergency_contact_relation: e.target.value})} /></div>
                             <div className="col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">No HP Darurat</label><input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.emergency_contact_phone || ''} onChange={e => setFormData({...formData, emergency_contact_phone: e.target.value})} /></div>
                         </div>
                         <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 grid grid-cols-1 gap-3 mt-2">
                             <div><label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><LinkIcon size={10}/> Link Dokumen KTP</label><input type="text" className="w-full p-2 border rounded text-xs" value={formData.ktp_url || ''} onChange={e => setFormData({...formData, ktp_url: e.target.value})} placeholder="https://..." /></div>
                             <div><label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><LinkIcon size={10}/> Link Dokumen NPWP</label><input type="text" className="w-full p-2 border rounded text-xs" value={formData.npwp_url || ''} onChange={e => setFormData({...formData, npwp_url: e.target.value})} placeholder="https://..." /></div>
                             <div><label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><LinkIcon size={10}/> Link Ijazah</label><input type="text" className="w-full p-2 border rounded text-xs" value={formData.ijazah_url || ''} onChange={e => setFormData({...formData, ijazah_url: e.target.value})} placeholder="https://..." /></div>
                             <div><label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><LinkIcon size={10}/> Link Buku Tabungan</label><input type="text" className="w-full p-2 border rounded text-xs" value={formData.bank_account_url || ''} onChange={e => setFormData({...formData, bank_account_url: e.target.value})} placeholder="https://..." /></div>
                         </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg">Batal</button>
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200">{saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan Perubahan</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

function InfoItem({ label, value, icon, fullWidth, highlight }: any) {
    return ( <div className={`${fullWidth ? 'col-span-full' : ''}`}><label className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{icon} {label}</label><div className={`text-sm font-medium ${highlight ? 'text-lg text-indigo-600 font-bold' : 'text-slate-800'}`}>{value || '-'}</div></div> )
}
function DocItem({ label, url }: any) {
    return ( <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"><div className="flex items-center gap-3"><div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm"><FileText size={20}/></div><span className="font-medium text-slate-700 text-sm">{label}</span></div>{url ? (<a href={url} target="_blank" className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">Open <ExternalLink size={12}/></a>) : <span className="text-xs text-slate-400 italic">Not uploaded</span>}</div> )
}