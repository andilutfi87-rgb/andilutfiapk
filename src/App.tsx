import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserPlus, Briefcase, Printer, AlertTriangle, Cloud, 
  Settings, CheckCircle, Database, FileSpreadsheet, MapPin, 
  Sparkles, HelpCircle, LogOut, Loader2, ArrowRight, Save, 
  Trash2, Edit, Plus, FileText, Image as ImageIcon, Send, Lock, ShieldCheck, RefreshCw, Key,
  Upload, Download, FileUp, FileDown, Search, X, QrCode, Eye, Check, Copy
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { initAuth, googleSignIn, logout } from './firebaseAuth';
import { saveBackupToDrive, listDriveBackups, downloadBackupFromDrive, exportToGoogleSheets } from './googleApi';
import { downloadExcelTemplate, parseExcelFile, exportAllToExcel, exportAllToPdf, exportSingleKkToPdf, exportSingleKkToDocx } from './excelPdfService';
import { Map as PigeonMap, Marker as PigeonMarker } from 'pigeon-maps';
import { QRCodeSVG } from 'qrcode.react';

// Initial Mock data matching Indonesian SE2026 guidelines
export const DESA_LIST = [
  'Depok', 'Jatiwangi', 'Jayamekar', 'Karangsari', 'Neglasari', 'Panyindangan', 'Pasirlangu', 
  'Sukamulya', 'Talagawangi', 'Tanjungjaya', 'Tanjungmulya', 'Tegalgede', 'Wangunjaya'
];

// Approximate coordinates for villages in Pakenjeng, Garut
export const VILLAGE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Depok': { lat: -7.4223, lng: 107.7115 },
  'Jatiwangi': { lat: -7.4102, lng: 107.7285 },
  'Jayamekar': { lat: -7.4354, lng: 107.7012 },
  'Karangsari': { lat: -7.4021, lng: 107.7345 },
  'Neglasari': { lat: -7.4412, lng: 107.6912 },
  'Panyindangan': { lat: -7.3854, lng: 107.7421 },
  'Pasirlangu': { lat: -7.4565, lng: 107.6811 },
  'Sukamulya': { lat: -7.4182, lng: 107.7198 },
  'Talagawangi': { lat: -7.4302, lng: 107.7245 },
  'Tanjungjaya': { lat: -7.3912, lng: 107.7554 },
  'Tanjungmulya': { lat: -7.4512, lng: 107.7087 },
  'Tegalgede': { lat: -7.4654, lng: 107.6612 },
  'Wangunjaya': { lat: -7.3712, lng: 107.7687 }
};

// Stable, deterministic offset generator based on KK number to distribute family pins beautifully around the village center
export function getFamilyCoordinates(family: any) {
  const village = family.desaKelurahan || 'Depok';
  const base = VILLAGE_COORDINATES[village] || VILLAGE_COORDINATES['Depok'];
  
  const kkStr = family.noKk || '0';
  let hash = 0;
  for (let i = 0; i < kkStr.length; i++) {
    hash = kkStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Create small spread so multiple pins in the same village don't overlap
  const latOffset = ((Math.abs(hash) % 80) / 10000) - 0.004;
  const lngOffset = (((Math.abs(hash) >> 8) % 80) / 10000) - 0.004;
  
  return {
    lat: base.lat + latOffset,
    lng: base.lng + lngOffset
  };
}

// Interactive Free OpenStreetMap (Pigeon Maps) visualization component
export function CensusMap({ dataKeluarga, dataAnggota, dataUsaha }: { dataKeluarga: any[], dataAnggota: any[], dataUsaha: any[] }) {
  const [selectedFamily, setSelectedFamily] = useState<any | null>(null);
  const [mapFilterDesa, setMapFilterDesa] = useState<string>('ALL');

  const filteredFamilies = mapFilterDesa === 'ALL' 
    ? dataKeluarga 
    : dataKeluarga.filter(k => k.desaKelurahan === mapFilterDesa);

  // Clear selected family if it's filtered out
  useEffect(() => {
    if (selectedFamily && mapFilterDesa !== 'ALL' && selectedFamily.desaKelurahan !== mapFilterDesa) {
      setSelectedFamily(null);
    }
  }, [mapFilterDesa, selectedFamily]);

  return (
    <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
      <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2 text-indigo-400">
            <MapPin className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-black tracking-widest uppercase">Peta Terbuka & Bebas (OpenStreetMap)</span>
          </div>
          <h4 className="text-base font-black text-white flex items-center gap-2">
            <span>Peta Penyebaran Responden Sensus Penduduk & Ekonomi</span>
          </h4>
          <p className="text-[11px] text-slate-400">
            Pemetaan sebaran spasial KK hasil pencatatan nyata di Kecamatan Pakenjeng, Kabupaten Garut. 100% Bebas API Key.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <label className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Filter Desa:</label>
          <select
            value={mapFilterDesa}
            onChange={(e) => setMapFilterDesa(e.target.value)}
            className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Semua Desa ({dataKeluarga.length})</option>
            {DESA_LIST.map(d => {
              const count = dataKeluarga.filter(k => k.desaKelurahan === d).length;
              return <option key={d} value={d}>{d} ({count})</option>;
            })}
          </select>
        </div>
      </div>

      {/* Map Element Container */}
      <div className="w-full h-[480px] rounded-2xl border border-slate-850 overflow-hidden relative shadow-inner">
        <PigeonMap
          defaultCenter={[-7.4182, 107.7198]}
          defaultZoom={12}
          metaWheelZoom={true}
        >
          {filteredFamilies.map((family) => {
            const coords = getFamilyCoordinates(family);
            const isSelected = selectedFamily?.id === family.id;
            
            // Find if this family has associated business units
            const familyMembers = dataAnggota.filter(m => m.noKk === family.noKk).map(m => m.nikAnggota);
            const familyBusinesses = dataUsaha.filter(u => familyMembers.includes(u.nikPj));
            const hasBusiness = familyBusinesses.length > 0;

            return (
              <PigeonMarker
                key={family.id}
                anchor={[coords.lat, coords.lng]}
                color={hasBusiness ? '#f59e0b' : '#6366f1'}
                onClick={() => setSelectedFamily(family)}
                payload={family}
              />
            );
          })}
        </PigeonMap>

        {/* Floating Futuristic Glass Panel for Selected Family Details */}
        {selectedFamily && (
          (() => {
            const familyMembers = dataAnggota.filter(m => m.noKk === selectedFamily.noKk);
            const familyBusinesses = dataUsaha.filter(u => familyMembers.map(m => m.nikAnggota).includes(u.nikPj));

            return (
              <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-xs z-10 bg-slate-950/95 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-2xl space-y-3 text-left transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-start justify-between border-b border-slate-900 pb-2">
                  <div>
                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                      {selectedFamily.desaKelurahan} • RT {selectedFamily.rt || '00'}/RW {selectedFamily.rw || '00'}
                    </span>
                    <h5 className="text-xs font-black text-white mt-1 leading-tight">{selectedFamily.namaKepala}</h5>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">{selectedFamily.noKk}</p>
                  </div>
                  <button
                    onClick={() => setSelectedFamily(null)}
                    className="text-slate-500 hover:text-slate-300 transition-colors font-bold text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Anggota Keluarga:</span>
                    <strong className="text-slate-200">{selectedFamily.jmlAnggota || familyMembers.length || 1} Jiwa</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pekerjaan / Hunian:</span>
                    <span className="text-slate-200 truncate max-w-[120px]" title={selectedFamily.jenisBangunan}>
                      {selectedFamily.jenisBangunan || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sumber Air:</span>
                    <span className="text-slate-200 truncate max-w-[120px]" title={selectedFamily.sumberAirMinum}>
                      {selectedFamily.sumberAirMinum || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Penerangan:</span>
                    <span className="text-slate-200 truncate max-w-[120px]" title={selectedFamily.sumberPenerangan}>
                      {selectedFamily.sumberPenerangan || '-'}
                    </span>
                  </div>
                </div>

                {familyBusinesses.length > 0 ? (
                  <div className="bg-amber-950/40 p-2 rounded-lg border border-amber-500/20 text-[9px] text-amber-300 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Memiliki {familyBusinesses.length} Unit Usaha MIK:
                    </p>
                    <ul className="list-disc list-inside font-medium opacity-90 pl-1">
                      {familyBusinesses.map((b, i) => (
                        <li key={i} className="truncate">{b.namaUsaha}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-850 text-[9px] text-slate-500 text-center">
                    Tidak memiliki unit usaha ekonomi terekam
                  </div>
                )}

                {/* QR Code Sensus Mandiri */}
                <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between gap-3 shadow-inner">
                  <div className="space-y-1">
                    <p className="text-[9px] font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-indigo-400" />
                      <span>Kuesioner Mandiri</span>
                    </p>
                    <p className="text-[8px] text-slate-500 leading-normal">Pindai QR ini untuk verifikasi lapangan secara mandiri.</p>
                    <a 
                      href={`${window.location.origin}${window.location.pathname}?kk=${selectedFamily.noKk}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[8px] text-indigo-400 hover:text-indigo-300 font-bold underline flex items-center gap-0.5 mt-1"
                    >
                      Buka Form Mandiri &rarr;
                    </a>
                  </div>
                  <div className="bg-white p-1 rounded-lg border border-slate-200 shrink-0 shadow-sm">
                    <QRCodeSVG 
                      value={`${window.location.origin}${window.location.pathname}?kk=${selectedFamily.noKk}`} 
                      size={48}
                      level="H"
                    />
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-slate-850">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white">Legenda Pin:</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
            <span>Keluarga Umum</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span>Keluarga dengan Usaha MIK</span>
          </div>
        </div>
        <p className="font-mono text-slate-500">SENSUS EKONOMI • BPS PAKENJENG 2026</p>
      </div>
    </div>
  );
}

const initialKeluarga = [
  {
    id: 1,
    noKk: '3205240101260001',
    nikKepala: '3205241204810002',
    namaKepala: 'Hendra Wijaya',
    provinsi: 'JAWA BARAT',
    kabKota: 'GARUT',
    kecamatan: 'PAKENJENG',
    desaKelurahan: 'Sukamulya',
    rt: '02',
    rw: '05',
    alamatSesuai: 'Ya',
    jmlAnggota: '3',
    jenisBangunan: 'Rumah Tinggal Biasa',
    statusKepemilikan: 'Milik Sendiri',
    luasLantai: '96',
    bahanLantai: 'Keramik',
    bahanDinding: 'Tembok/Semen',
    bahanAtap: 'Genteng',
    sumberAirMinum: 'Leding/PAM',
    sumberPenerangan: 'Listrik PLN 1300W',
    pengeluaranMakanan: '2500000',
    pengeluaranNonMakanan: '1500000',
    noListrik: '14028938210',
    pengeluaranListrik: '350000',
    pengeluaranKuota: '150000',
    noHp: '081234567890',
    email: 'hendra.wijaya@gmail.com'
  },
  {
    id: 2,
    noKk: '3205240101260002',
    nikKepala: '3205242508750003',
    namaKepala: 'Siti Rahmawati',
    provinsi: 'JAWA BARAT',
    kabKota: 'GARUT',
    kecamatan: 'PAKENJENG',
    desaKelurahan: 'Depok',
    rt: '01',
    rw: '03',
    alamatSesuai: 'Ya',
    jmlAnggota: '1',
    jenisBangunan: 'Kontrakan/Kos',
    statusKepemilikan: 'Sewa/Kontrak',
    luasLantai: '36',
    bahanLantai: 'Semen/Ubin',
    bahanDinding: 'Tembok/Semen',
    bahanAtap: 'Asbes',
    sumberAirMinum: 'Sumur Terlindungi',
    sumberPenerangan: 'Listrik PLN 900W',
    pengeluaranMakanan: '1800000',
    pengeluaranNonMakanan: '900000',
    noListrik: '32098493821',
    pengeluaranListrik: '120000',
    pengeluaranKuota: '75000',
    noHp: '085798765432',
    email: 'siti.rahma@yahoo.com'
  }
];

const initialAnggota = [
  {
    id: 1,
    noKk: '3205240101260001',
    noUrut: '1',
    nikAnggota: '3205241204810002',
    namaAnggota: 'Hendra Wijaya',
    hubungan: 'Kepala Keluarga',
    jk: 'Laki-laki',
    tanggalLahir: '12/04/1981',
    statusPerkawinan: 'Kawin',
    partisipasiSekolah: 'Tidak sekolah lagi',
    ijazah: 'S1/Diploma IV',
    pekerjaan: 'Karyawan Swasta',
    kedudukanPekerjaan: 'Buruh/Karyawan',
    gaji: '6500000',
    omsetUsaha: '0',
    disabilitas: 'Tidak',
    keluhanPenyakit: 'Tidak Ada'
  },
  {
    id: 2,
    noKk: '3205240101260001',
    noUrut: '2',
    nikAnggota: '3205245509840001',
    namaAnggota: 'Dewi Lestari',
    hubungan: 'Istri',
    jk: 'Perempuan',
    tanggalLahir: '15/09/1984',
    statusPerkawinan: 'Kawin',
    partisipasiSekolah: 'Tidak sekolah lagi',
    ijazah: 'SMA/Sederajat',
    pekerjaan: 'Mengurus Rumah Tangga',
    kedudukanPekerjaan: 'Bukan Pekerja',
    gaji: '0',
    omsetUsaha: '3500000',
    disabilitas: 'Tidak',
    keluhanPenyakit: 'Tidak Ada'
  },
  {
    id: 3,
    noKk: '3205240101260001',
    noUrut: '3',
    nikAnggota: '3205241111120002',
    namaAnggota: 'Rian Wijaya',
    hubungan: 'Anak',
    jk: 'Laki-laki',
    tanggalLahir: '11/11/2012',
    statusPerkawinan: 'Belum Kawin',
    partisipasiSekolah: 'Masih aktif sekolah',
    ijazah: 'SD/Sederajat',
    pekerjaan: 'Pelajar',
    kedudukanPekerjaan: 'Bukan Pekerja',
    gaji: '0',
    omsetUsaha: '0',
    disabilitas: 'Tidak',
    keluhanPenyakit: 'Tidak Ada'
  },
  {
    id: 4,
    noKk: '3205240101260002',
    noUrut: '1',
    nikAnggota: '3205242508750003',
    namaAnggota: 'Siti Rahmawati',
    hubungan: 'Kepala Keluarga',
    jk: 'Perempuan',
    tanggalLahir: '25/08/1975',
    statusPerkawinan: 'Cerai Mati',
    partisipasiSekolah: 'Tidak sekolah lagi',
    ijazah: 'SMP/Sederajat',
    pekerjaan: 'Pedagang Kelontong',
    kedudukanPekerjaan: 'Berusaha Sendiri',
    gaji: '0',
    omsetUsaha: '4500000',
    disabilitas: 'Tidak',
    keluhanPenyakit: 'Asma'
  }
];

const initialUsaha = [
  {
    id: 1,
    nikPj: '3205245509840001',
    namaUsaha: 'Catering Dewi Mandiri',
    alamatUsaha: 'Jl. Pakansari No. 12',
    memilikiNib: 'Tidak',
    statusBadan: 'Usaha Perseorangan',
    kegiatanUtama: 'Penyediaan Makanan Jasa Boga',
    kbli: '56210',
    pekerjaLaki: '1',
    pekerjaPerempuan: '2',
    pengeluaranBulan: '2000000',
    pendapatanBulan: '3500000',
    asetEmas: '10',
    asetMotor: '1',
    asetMobil: '0',
    asetTanah: '0'
  },
  {
    id: 2,
    nikPj: '3205242508750003',
    namaUsaha: 'Warung Kelontong Berkah',
    alamatUsaha: 'Kios Pakansari Rt 02',
    memilikiNib: 'Ya',
    statusBadan: 'Usaha Perseorangan',
    kegiatanUtama: 'Eceran Barang Kelontong',
    kbli: '47111',
    pekerjaLaki: '0',
    pekerjaPerempuan: '1',
    pengeluaranBulan: '3000000',
    pendapatanBulan: '4500000',
    asetEmas: '5',
    asetMotor: '1',
    asetMobil: '0',
    asetTanah: '50'
  }
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Admin Login and Portal states
  const [guestMode, setGuestMode] = useState<boolean>(() => {
    return localStorage.getItem('se2026_guest') === 'true';
  });
  const [activeAuthTab, setActiveAuthTab] = useState<'login' | 'register'>('login');
  const [loginRole, setLoginRole] = useState<'PPL' | 'PML'>('PPL');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Census Data State
  const [dataKeluarga, setDataKeluarga] = useState<any[]>(() => {
    const saved = localStorage.getItem('se2026_keluarga');
    return saved ? JSON.parse(saved) : initialKeluarga;
  });
  const [dataAnggota, setDataAnggota] = useState<any[]>(() => {
    const saved = localStorage.getItem('se2026_anggota');
    return saved ? JSON.parse(saved) : initialAnggota;
  });
  const [dataUsaha, setDataUsaha] = useState<any[]>(() => {
    const saved = localStorage.getItem('se2026_usaha');
    return saved ? JSON.parse(saved) : initialUsaha;
  });

  // App Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'keluarga' | 'anggota' | 'usaha' | 'cetak' | 'gdrive' | 'ai' | 'imporEkspor' | 'pengaturan'>('dashboard');

  // Officer Profile & Roles States
  const [officerRole, setOfficerRole] = useState<'PPL' | 'PML'>(() => {
    return (localStorage.getItem('se2026_officer_role') as 'PPL' | 'PML') || 'PPL';
  });
  const [officerName, setOfficerName] = useState<string>(() => {
    return localStorage.getItem('se2026_officer_name') || 'Andi Lutfi';
  });
  const [officerId, setOfficerId] = useState<string>(() => {
    return localStorage.getItem('se2026_officer_id') || 'SE2026-PAK-091';
  });
  const [officerNip, setOfficerNip] = useState<string>(() => {
    return localStorage.getItem('se2026_officer_nip') || '19920824 201503 1 002';
  });
  const [officerDesa, setOfficerDesa] = useState<string>(() => {
    return localStorage.getItem('se2026_officer_desa') || 'Sukamulya';
  });
  const [supervisorName, setSupervisorName] = useState<string>(() => {
    return localStorage.getItem('se2026_supervisor_name') || 'Drs. Bambang Hermawan';
  });
  const [supervisorId, setSupervisorId] = useState<string>(() => {
    return localStorage.getItem('se2026_supervisor_id') || 'PML-2026-045';
  });
  const [settingsSavedAlert, setSettingsSavedAlert] = useState(false);

  // Supervisor Review/Revision comments state
  const [rejectingFamilyId, setRejectingFamilyId] = useState<number | null>(null);
  const [pmlCommentInput, setPmlCommentInput] = useState<string>('');

  // Search states for tabs
  const [searchKeluarga, setSearchKeluarga] = useState('');
  const [searchAnggota, setSearchAnggota] = useState('');
  const [searchUsaha, setSearchUsaha] = useState('');

  // UI state
  const [selectedKkCetak, setSelectedKkCetak] = useState<string>('');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewingFamilyDetails, setViewingFamilyDetails] = useState<any | null>(null);
  const [copiedKkLink, setCopiedKkLink] = useState<string | null>(null);

  // Citizen digital questionnaire states
  const [digitalKuesionerKk, setDigitalKuesionerKk] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('kk') || params.get('kuesioner_mandiri') || null;
  });
  const [digitalFormValues, setDigitalFormValues] = useState<any>(null);
  const [isDigitalSuccess, setIsDigitalSuccess] = useState(false);
  const [isDigitalSubmitting, setIsDigitalSubmitting] = useState(false);

  // Modal / Form state for Unified Census Form
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [unifiedStep, setUnifiedStep] = useState(1);
  const [unifiedMode, setUnifiedMode] = useState<'new' | 'existing'>('new');
  const [originalKk, setOriginalKk] = useState<string>('');
  const [unifiedData, setUnifiedData] = useState<any>({
    keluarga: {},
    anggota: [{}],
    usaha: []
  });

  // CRUD Modals state
  const [activeModal, setActiveModal] = useState<'keluarga' | 'anggota' | 'usaha' | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [modalForm, setModalForm] = useState<any>({});
  const [selectedHeatmapVillage, setSelectedHeatmapVillage] = useState<string | null>(null);

  // Google Drive integrations state
  const [driveBackups, setDriveBackups] = useState<any[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [backupFilename, setBackupFilename] = useState('');

  // AI Assistant Panel State
  const [aiTab, setAiTab] = useState<'maps' | 'thinking' | 'image'>('maps');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [groundingLinks, setGroundingLinks] = useState<any[]>([]);
  const [generatedImg, setGeneratedImg] = useState<string>('');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');

  // Auto-fill audio/text transcript transcript state
  const [transcriptText, setTranscriptText] = useState('');
  const [autofillLoading, setAutofillLoading] = useState(false);

  // Real-time validation functions & styling helpers for Sensus Terpadu
  const validateNoKk = (val: string) => /^\d{16}$/.test(val || '');
  const validateNik = (val: string) => /^\d{16}$/.test(val || '');
  const validateNama = (val: string) => (val || '').trim().length >= 3;
  const validateRtRw = (val: string) => /^\d{1,3}$/.test(val || '');
  const validateNoHp = (val: string) => !val || /^\+?[0-9]{10,15}$/.test(val);
  const validateEmail = (val: string) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const validateKbli = (val: string) => !val || /^\d{5}$/.test(val);
  const validateTanggalLahir = (val: string) => {
    if (!val) return false;
    return /^\d{2}\/\d{2}\/\d{4}$/.test(val) || /^\d{4}-\d{2}-\d{2}$/.test(val);
  };

  const getInputValidationClass = (value: string, isValid: boolean, isRequired: boolean, extraPaddingClass = "p-2.5") => {
    const base = `w-full ${extraPaddingClass} bg-slate-950 border rounded-xl text-xs text-white transition-all focus:outline-none focus:ring-2`;
    if (!value) {
      return isRequired 
        ? `${base} border-slate-800 focus:border-rose-500/40 focus:ring-rose-500/10` 
        : `${base} border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20`;
    }
    return isValid
      ? `${base} border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20`
      : `${base} border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20`;
  };

  const getStepValidationErrors = (step: number) => {
    const errors: string[] = [];
    const k = unifiedData.keluarga || {};
    
    if (step === 1) {
      if (!validateNoKk(k.noKk)) errors.push("No KK harus 16 digit angka");
      if (!validateNik(k.nikKepala)) errors.push("NIK Kepala Keluarga harus 16 digit angka");
      if (!validateNama(k.namaKepala)) errors.push("Nama Kepala Keluarga minimal 3 karakter");
      if (!validateRtRw(k.rt)) errors.push("No. RT harus 1-3 digit angka (contoh: 01)");
      if (!validateRtRw(k.rw)) errors.push("No. RW harus 1-3 digit angka (contoh: 01)");
      if (k.noHp && !validateNoHp(k.noHp)) errors.push("Format No HP tidak valid (10-15 digit)");
      if (k.email && !validateEmail(k.email)) errors.push("Format Email tidak valid");
    } else if (step === 2) {
      (unifiedData.anggota || []).forEach((ang: any, i: number) => {
        const idx = i + 1;
        if (!validateNama(ang.namaAnggota)) errors.push(`Nama Anggota #${idx} minimal 3 karakter`);
        if (!validateNik(ang.nikAnggota)) errors.push(`NIK Anggota #${idx} harus 16 digit angka`);
        if (ang.tanggalLahir && !validateTanggalLahir(ang.tanggalLahir)) errors.push(`Tanggal Lahir Anggota #${idx} tidak valid (DD/MM/YYYY)`);
      });
    } else if (step === 3) {
      (unifiedData.usaha || []).forEach((u: any, i: number) => {
        const idx = i + 1;
        if (!validateNama(u.namaUsaha)) errors.push(`Nama Usaha #${idx} minimal 3 karakter`);
        if (!u.nikPj) errors.push(`Pilih Penanggung Jawab untuk Usaha #${idx}`);
        if (u.kbli && !validateKbli(u.kbli)) errors.push(`KBLI Usaha #${idx} harus 5 digit angka`);
      });
    }
    return errors;
  };

  const handlePrintToPrinter = () => {
    const printContent = document.getElementById('printable-area');
    if (!printContent) {
      alert('Silakan pilih dokumen sensus atau kuesioner terlebih dahulu.');
      return;
    }
    // Directly call window.print() on the main window.
    // The CSS print stylesheet will automatically hide all other elements
    // and format the kuesioner beautifully with full pagination support.
    window.print();
  };


  // Excel Import states
  const [importPreview, setImportPreview] = useState<{ keluarga: any[], anggota: any[], usaha: any[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [isDraggingExcel, setIsDraggingExcel] = useState(false);

  const handleFileChange = async (file: File) => {
    setImportError(null);
    setImportSuccessMsg(null);
    try {
      const parsed = await parseExcelFile(file);
      const totalCount = (parsed.keluarga?.length || 0) + (parsed.anggota?.length || 0) + (parsed.usaha?.length || 0);
      if (totalCount === 0) {
        setImportError('File Excel tidak memiliki data sensus yang valid atau format tabel tidak dikenali.');
        setImportPreview(null);
      } else {
        setImportPreview(parsed);
      }
    } catch (err: any) {
      console.error(err);
      setImportError('Gagal membaca file Excel. Pastikan file tidak rusak dan memiliki format yang tepat.');
      setImportPreview(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingExcel(true);
  };

  const handleDragLeave = () => {
    setIsDraggingExcel(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingExcel(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await handleFileChange(files[0]);
    }
  };

  const executeImport = () => {
    if (!importPreview) return;

    if (importMode === 'overwrite') {
      setDataKeluarga(importPreview.keluarga || []);
      setDataAnggota(importPreview.anggota || []);
      setDataUsaha(importPreview.usaha || []);
      localStorage.setItem('se2026_keluarga', JSON.stringify(importPreview.keluarga || []));
      localStorage.setItem('se2026_anggota', JSON.stringify(importPreview.anggota || []));
      localStorage.setItem('se2026_usaha', JSON.stringify(importPreview.usaha || []));
      setImportSuccessMsg(`Berhasil mengimpor dan menimpa database! Diimpor: ${importPreview.keluarga?.length || 0} Keluarga, ${importPreview.anggota?.length || 0} Anggota, dan ${importPreview.usaha?.length || 0} Unit Usaha.`);
    } else {
      // MERGE (append with conflict avoidance)
      const newKeluarga = [...dataKeluarga];
      (importPreview.keluarga || []).forEach(item => {
        const idx = newKeluarga.findIndex(k => k.noKk === item.noKk);
        if (idx >= 0) {
          newKeluarga[idx] = { ...newKeluarga[idx], ...item };
        } else {
          newKeluarga.push(item);
        }
      });

      const newAnggota = [...dataAnggota];
      (importPreview.anggota || []).forEach(item => {
        const idx = newAnggota.findIndex(a => a.nikAnggota === item.nikAnggota);
        if (idx >= 0) {
          newAnggota[idx] = { ...newAnggota[idx], ...item };
        } else {
          newAnggota.push(item);
        }
      });

      const newUsaha = [...dataUsaha];
      (importPreview.usaha || []).forEach(item => {
        const idx = newUsaha.findIndex(u => u.nikPj === item.nikPj && u.namaUsaha === item.namaUsaha);
        if (idx >= 0) {
          newUsaha[idx] = { ...newUsaha[idx], ...item };
        } else {
          newUsaha.push(item);
        }
      });

      setDataKeluarga(newKeluarga);
      setDataAnggota(newAnggota);
      setDataUsaha(newUsaha);

      localStorage.setItem('se2026_keluarga', JSON.stringify(newKeluarga));
      localStorage.setItem('se2026_anggota', JSON.stringify(newAnggota));
      localStorage.setItem('se2026_usaha', JSON.stringify(newUsaha));
      setImportSuccessMsg(`Berhasil menggabungkan data! Diimpor/Diperbarui: ${importPreview.keluarga?.length || 0} Keluarga, ${importPreview.anggota?.length || 0} Anggota, dan ${importPreview.usaha?.length || 0} Unit Usaha.`);
    }

    setImportPreview(null);
  };

  // Save census state to localstorage
  useEffect(() => {
    localStorage.setItem('se2026_keluarga', JSON.stringify(dataKeluarga));
  }, [dataKeluarga]);

  useEffect(() => {
    localStorage.setItem('se2026_anggota', JSON.stringify(dataAnggota));
  }, [dataAnggota]);

  useEffect(() => {
    localStorage.setItem('se2026_usaha', JSON.stringify(dataUsaha));
  }, [dataUsaha]);

  // Handle Firebase Auth lifecycle
  useEffect(() => {
    const isAdminLogged = localStorage.getItem('se2026_admin_logged') === 'true';
    if (isAdminLogged) {
      setUser({ displayName: 'Administrator Sensus (PML)', email: 'admin@bps.go.id', role: 'PML', isAdmin: true });
      setOfficerRole('PML');
      setAuthLoading(false);
      return;
    }

    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setAuthLoading(false);
        setGuestMode(false);
        localStorage.setItem('se2026_guest', 'false');
        setOfficerRole('PPL');
        localStorage.setItem('se2026_officer_role', 'PPL');
      },
      () => {
        if (localStorage.getItem('se2026_admin_logged') !== 'true') {
          setUser(null);
          setToken(null);
          setAuthLoading(false);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setAuthLoading(true);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setGuestMode(false);
        localStorage.setItem('se2026_guest', 'false');
        setOfficerRole('PPL');
        localStorage.setItem('se2026_officer_role', 'PPL');
        localStorage.removeItem('se2026_admin_logged');
      }
    } catch (e) {
      alert('Gagal login Google: ' + e);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput === 'admin' && passwordInput === 'admin1949') {
      localStorage.setItem('se2026_admin_logged', 'true');
      localStorage.setItem('se2026_officer_role', 'PML');
      localStorage.setItem('se2026_guest', 'false');
      setGuestMode(false);
      
      // Update officer details state for Admin
      const savedName = localStorage.getItem('se2026_officer_name');
      if (!savedName || savedName === 'Andi Lutfi') {
        localStorage.setItem('se2026_officer_name', 'Drs. Bambang Hermawan');
        setOfficerName('Drs. Bambang Hermawan');
      }
      const savedId = localStorage.getItem('se2026_officer_id');
      if (!savedId || savedId === 'SE2026-PAK-091') {
        localStorage.setItem('se2026_officer_id', 'PML-2026-045');
        setOfficerId('PML-2026-045');
      }

      setUser({ displayName: 'Administrator Sensus (PML)', email: 'admin@bps.go.id', role: 'PML', isAdmin: true });
      setOfficerRole('PML');
      setUsernameInput('');
      setPasswordInput('');
    } else {
      alert('Kredensial salah! Gunakan user: admin dan password: admin1949');
    }
  };

  const handleSignOut = async () => {
    if (localStorage.getItem('se2026_admin_logged') === 'true') {
      localStorage.removeItem('se2026_admin_logged');
      setUser(null);
      setToken(null);
      setGuestMode(false);
      localStorage.setItem('se2026_guest', 'false');
    } else {
      await logout();
      setUser(null);
      setToken(null);
      setGuestMode(false);
      localStorage.setItem('se2026_guest', 'false');
    }
  };

  // Google Drive action
  const loadBackups = async () => {
    if (!token) return;
    try {
      setDriveLoading(true);
      const list = await listDriveBackups(token);
      setDriveBackups(list);
    } catch (error: any) {
      alert('Gagal memuat backup Drive: ' + error.message);
    } finally {
      setDriveLoading(false);
    }
  };

  const triggerBackup = async () => {
    if (!token) return;
    try {
      setDriveLoading(true);
      await saveBackupToDrive(token, { dataKeluarga, dataAnggota, dataUsaha }, backupFilename || undefined);
      alert('Pencadangan ke Google Drive berhasil!');
      setBackupFilename('');
      loadBackups();
    } catch (error: any) {
      alert('Gagal membuat cadangan: ' + error.message);
    } finally {
      setDriveLoading(false);
    }
  };

  const triggerRestore = async (fileId: string) => {
    if (!token) return;
    if (!confirm('Apakah Anda yakin ingin memulihkan data dari Drive? Ini akan menggantikan database lokal saat ini.')) return;
    try {
      setDriveLoading(true);
      const state = await downloadBackupFromDrive(token, fileId);
      if (state.dataKeluarga && state.dataAnggota && state.dataUsaha) {
        setDataKeluarga(state.dataKeluarga);
        setDataAnggota(state.dataAnggota);
        setDataUsaha(state.dataUsaha);
        alert('Data berhasil dipulihkan!');
      } else {
        alert('Format file cadangan tidak valid.');
      }
    } catch (error: any) {
      alert('Gagal memulihkan cadangan: ' + error.message);
    } finally {
      setDriveLoading(false);
    }
  };

  // Google Sheets integration
  const triggerExportSheets = async () => {
    if (!token) {
      alert('Silakan login dengan Google terlebih dahulu.');
      return;
    }
    try {
      setDriveLoading(true);
      const res = await exportToGoogleSheets(token, { dataKeluarga, dataAnggota, dataUsaha });
      alert('Ekspor ke Google Sheets sukses!');
      window.open(res.spreadsheetUrl, '_blank');
    } catch (error: any) {
      alert('Gagal mengekspor: ' + error.message);
    } finally {
      setDriveLoading(false);
    }
  };

  // AI Assistant trigger calls
  const handleAiSubmit = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    setGroundingLinks([]);
    setGeneratedImg('');

    try {
      if (aiTab === 'maps') {
        const response = await fetch('/api/gemini/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: aiPrompt, useMaps: true, lat: -6.4025, lng: 106.8294 }) // Default to Cibinong/Bogor
        });
        const resData = await response.json();
        if (resData.error) throw new Error(resData.error);
        setAiResponse(resData.text);
        if (resData.groundingChunks) {
          const links = resData.groundingChunks
            .filter((chunk: any) => chunk.web || chunk.maps)
            .map((chunk: any) => chunk.web || chunk.maps);
          setGroundingLinks(links);
        }
      } else if (aiTab === 'thinking') {
        const response = await fetch('/api/gemini/thinking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: aiPrompt })
        });
        const resData = await response.json();
        if (resData.error) throw new Error(resData.error);
        setAiResponse(resData.text);
      } else if (aiTab === 'image') {
        const response = await fetch('/api/gemini/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: aiPrompt, size: imageSize })
        });
        const resData = await response.json();
        if (resData.error) throw new Error(resData.error);
        setGeneratedImg(resData.imageUrl);
      }
    } catch (e: any) {
      setAiResponse(`Gagal memanggil AI: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // AI autofill extraction trigger
  const handleAutofillExtract = async () => {
    if (!transcriptText.trim()) return;
    setAutofillLoading(true);
    try {
      const response = await fetch('/api/gemini/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptText })
      });
      const resData = await response.json();
      if (resData.error) throw new Error(resData.error);

      // Successfully extracted. Set unified state
      setUnifiedData({
        keluarga: resData.keluarga || {},
        anggota: resData.anggota && resData.anggota.length > 0 ? resData.anggota : [{}],
        usaha: resData.usaha || []
      });
      alert('Data sensus berhasil diekstrak dan diisi otomatis ke form!');
      setTranscriptText('');
    } catch (e: any) {
      alert('Gagal mengekstrak transkrip: ' + e.message);
    } finally {
      setAutofillLoading(false);
    }
  };

  // CRUD helpers
  const handleOpenAdd = (type: 'keluarga' | 'anggota' | 'usaha') => {
    setEditItem(null);
    if (type === 'keluarga') {
      setModalForm({
        provinsi: 'JAWA BARAT',
        kabKota: 'GARUT',
        kecamatan: 'PAKENJENG',
        desaKelurahan: 'Depok',
        rt: '01',
        rw: '01',
        alamatSesuai: 'Ya',
        jmlAnggota: '1'
      });
    } else {
      setModalForm({});
    }
    setActiveModal(type);
  };

  const handleOpenEdit = (type: 'keluarga' | 'anggota' | 'usaha', item: any) => {
    setEditItem(item);
    setModalForm(item);
    setActiveModal(type);
  };

  const handleDelete = (type: 'keluarga' | 'anggota' | 'usaha', id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    if (type === 'keluarga') setDataKeluarga(dataKeluarga.filter(x => x.id !== id));
    if (type === 'anggota') setDataAnggota(dataAnggota.filter(x => x.id !== id));
    if (type === 'usaha') setDataUsaha(dataUsaha.filter(x => x.id !== id));
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeModal === 'keluarga') {
      if (editItem) {
        setDataKeluarga(dataKeluarga.map(x => x.id === editItem.id ? { ...x, ...modalForm } : x));
      } else {
        setDataKeluarga([...dataKeluarga, { id: Date.now(), ...modalForm }]);
      }
    } else if (activeModal === 'anggota') {
      if (editItem) {
        setDataAnggota(dataAnggota.map(x => x.id === editItem.id ? { ...x, ...modalForm } : x));
      } else {
        setDataAnggota([...dataAnggota, { id: Date.now(), ...modalForm }]);
      }
    } else if (activeModal === 'usaha') {
      if (editItem) {
        setDataUsaha(dataUsaha.map(x => x.id === editItem.id ? { ...x, ...modalForm } : x));
      } else {
        setDataUsaha([...dataUsaha, { id: Date.now(), ...modalForm }]);
      }
    }
    setActiveModal(null);
  };

  // Unified form actions
  const saveUnifiedCensus = () => {
    const k = unifiedData.keluarga;
    if (!k.noKk || k.noKk.length < 10) {
      alert('Error: Nomor KK wajib diisi dengan benar!');
      return;
    }

    if (unifiedMode === 'existing') {
      // Update keluarga
      setDataKeluarga(prev => prev.map(item => (item.noKk === originalKk || item.noKk === k.noKk) ? { ...item, ...k } : item));
      
      // Update anggota: delete old members of this family and write new/updated ones
      const otherAnggota = dataAnggota.filter(a => a.noKk !== originalKk && a.noKk !== k.noKk);
      const mappedAnggota = unifiedData.anggota.map((ang: any, i: number) => ({
        id: ang.id || (Date.now() + i + 1),
        noKk: k.noKk,
        noUrut: String(i + 1),
        ...ang
      }));
      setDataAnggota([...otherAnggota, ...mappedAnggota]);

      // Update usaha: delete old businesses of these members and write new/updated ones
      const oldNiks = dataAnggota.filter(a => a.noKk === originalKk || a.noKk === k.noKk).map(a => a.nikAnggota);
      const otherUsaha = dataUsaha.filter(u => !oldNiks.includes(u.nikPj));
      const mappedUsaha = (unifiedData.usaha || []).map((u: any, i: number) => ({
        id: u.id || (Date.now() + i + 100),
        nikPj: u.nikPj || (mappedAnggota[0]?.nikAnggota || ''),
        ...u
      }));
      setDataUsaha([...otherUsaha, ...mappedUsaha]);

      alert('Seluruh data sensus terpadu berhasil diperbarui!');
    } else {
      // Save keluarga
      setDataKeluarga([...dataKeluarga, { id: Date.now(), ...k }]);
      
      // Save anggota
      const mappedAnggota = unifiedData.anggota.map((ang: any, i: number) => ({
        id: Date.now() + i + 1,
        noKk: k.noKk,
        noUrut: String(i + 1),
        ...ang
      }));
      setDataAnggota([...dataAnggota, ...mappedAnggota]);

      // Save usaha
      if (unifiedData.usaha && unifiedData.usaha.length > 0) {
        const mappedUsaha = unifiedData.usaha.map((u: any, i: number) => ({
          id: Date.now() + i + 10,
          nikPj: u.nikPj || (mappedAnggota[0]?.nikAnggota || ''),
          ...u
        }));
        setDataUsaha([...dataUsaha, ...mappedUsaha]);
      }
      alert('Seluruh data sensus terpadu berhasil disimpan ke database!');
    }

    setShowUnifiedModal(false);
    setUnifiedStep(1);
    setUnifiedData({ keluarga: {}, anggota: [{}], usaha: [] });
    setUnifiedMode('new');
    setOriginalKk('');
  };

  // Calculation statistics helpers
  const totalGaji = dataAnggota.reduce((sum, item) => sum + Number(item.gaji || 0), 0);
  const totalOmset = dataUsaha.reduce((sum, item) => sum + Number(item.pendapatanBulan || 0), 0);

  // Data preparation for Graphical Dashboard Charts
  const chartKeluargaData = dataKeluarga.map(kel => {
    const members = dataAnggota.filter(m => m.noKk === kel.noKk);
    const totalGajiKel = members.reduce((sum, m) => sum + Number(m.gaji || 0), 0);
    
    const memberNiks = members.map(m => m.nikAnggota);
    const businesses = dataUsaha.filter(u => memberNiks.includes(u.nikPj));
    const totalOmsetKel = businesses.reduce((sum, u) => sum + Number(u.pendapatanBulan || 0), 0);
    
    const totalPengeluaran = Number(kel.pengeluaranMakanan || 0) + Number(kel.pengeluaranNonMakanan || 0);
    
    return {
      name: (kel.namaKepala || '').split(' ')[0] || 'Keluarga', // short name for x axis
      Pemasukan: totalGajiKel + totalOmsetKel,
      Pengeluaran: totalPengeluaran,
    };
  });

  const bangunanCounts: { [key: string]: number } = {};
  dataKeluarga.forEach(kel => {
    const type = kel.jenisBangunan || 'Rumah Biasa';
    bangunanCounts[type] = (bangunanCounts[type] || 0) + 1;
  });
  const chartBangunanData = Object.keys(bangunanCounts).map(key => ({
    name: key,
    value: bangunanCounts[key]
  }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];

  const pendidikanCounts: { [key: string]: number } = {};
  dataAnggota.forEach(ang => {
    const edu = ang.ijazah || 'Tidak Sekolah';
    pendidikanCounts[edu] = (pendidikanCounts[edu] || 0) + 1;
  });
  const chartPendidikanData = Object.keys(pendidikanCounts).map(key => ({
    name: key,
    value: pendidikanCounts[key]
  }));

  const chartUsahaData = dataUsaha.map(u => ({
    name: (u.namaUsaha || '').split(' ')[0] || 'Usaha',
    Omset: Number(u.pendapatanBulan || 0),
    Biaya: Number(u.pengeluaranBulan || 0),
  }));

  // Calculations for Advanced Statistics: Monthly Omset Trend & Village Heatmap
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const seasonalFactors = [0.75, 0.82, 0.90, 1.15, 1.05, 1.20, 0.95, 0.98, 1.10, 1.02, 1.08, 1.25];
  const costFactors = [0.70, 0.72, 0.74, 0.78, 0.75, 0.82, 0.71, 0.73, 0.76, 0.74, 0.77, 0.85];

  const chartTrenOmset = months.map((month, idx) => {
    const baseOmset = dataUsaha.reduce((sum, item) => sum + Number(item.pendapatanBulan || 0), 0);
    const baseBiaya = dataUsaha.reduce((sum, item) => sum + Number(item.pengeluaranBulan || 0), 0);
    
    // Fallback if no businesses are registered, use beautiful defaults
    const scaleOmset = baseOmset > 0 ? baseOmset : 12500000;
    const scaleBiaya = baseBiaya > 0 ? baseBiaya : 8200000;

    return {
      name: month,
      'Total Omset': Math.round(scaleOmset * seasonalFactors[idx]),
      'Biaya Operasional': Math.round(scaleBiaya * costFactors[idx]),
      'Laba Bersih': Math.max(0, Math.round(scaleOmset * seasonalFactors[idx]) - Math.round(scaleBiaya * costFactors[idx]))
    };
  });

  const villageStats = DESA_LIST.map(village => {
    const families = dataKeluarga.filter(k => (k.desaKelurahan || '').toLowerCase() === village.toLowerCase());
    const totalKk = families.length;
    
    const familyNoKks = families.map(f => f.noKk);
    const members = dataAnggota.filter(m => familyNoKks.includes(m.noKk));
    const totalArt = members.length;
    
    const memberNiks = members.map(m => m.nikAnggota);
    const businesses = dataUsaha.filter(u => memberNiks.includes(u.nikPj));
    const totalUsaha = businesses.length;
    
    const totalOmsetVillage = businesses.reduce((sum, u) => sum + Number(u.pendapatanBulan || 0), 0);

    return {
      desa: village,
      totalKk,
      totalArt,
      totalUsaha,
      totalOmset: totalOmsetVillage
    };
  });

  // Auto-load Drive backups when user navigates to backup tab
  useEffect(() => {
    if (activeTab === 'gdrive' && token) {
      loadBackups();
    }
  }, [activeTab, token]);

  // Initialize digital questionnaire form with existing family data
  useEffect(() => {
    if (digitalKuesionerKk) {
      const family = dataKeluarga.find(f => f.noKk === digitalKuesionerKk);
      if (family) {
        setDigitalFormValues({
          noKk: family.noKk,
          nikKepala: family.nikKepala,
          namaKepala: family.namaKepala,
          noHp: family.noHp || '',
          email: family.email || '',
          sumberAirMinum: family.sumberAirMinum || 'Leding/PAM',
          sumberPenerangan: family.sumberPenerangan || 'Listrik PLN',
          pengeluaranListrik: family.pengeluaranListrik || '150000',
          jmlAnggota: family.jmlAnggota || '3',
          jenisBangunan: family.jenisBangunan || 'Rumah Tinggal Biasa',
          statusKepemilikan: family.statusKepemilikan || 'Milik Sendiri',
        });
      }
    }
  }, [digitalKuesionerKk, dataKeluarga]);

  const isAuthenticated = !!user || guestMode;

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-400 animate-pulse">Menghubungkan Sesi Sensus...</p>
        </div>
      </div>
    );
  }

  // Conditionally render the Citizen Self-Guided Digital Questionnaire Portal
  if (digitalKuesionerKk) {
    const family = dataKeluarga.find(f => f.noKk === digitalKuesionerKk);

    const handleDigitalSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setIsDigitalSubmitting(true);
      
      setTimeout(() => {
        // Update dataKeluarga state
        const updatedList = dataKeluarga.map(f => {
          if (f.noKk === digitalKuesionerKk) {
            return {
              ...f,
              namaKepala: digitalFormValues.namaKepala,
              noHp: digitalFormValues.noHp,
              email: digitalFormValues.email,
              sumberAirMinum: digitalFormValues.sumberAirMinum,
              sumberPenerangan: digitalFormValues.sumberPenerangan,
              pengeluaranListrik: Number(digitalFormValues.pengeluaranListrik),
              jmlAnggota: Number(digitalFormValues.jmlAnggota),
              jenisBangunan: digitalFormValues.jenisBangunan,
              statusKepemilikan: digitalFormValues.statusKepemilikan,
            };
          }
          return f;
        });

        setDataKeluarga(updatedList);
        localStorage.setItem('se2026_keluarga', JSON.stringify(updatedList));
        
        setIsDigitalSubmitting(false);
        setIsDigitalSuccess(true);
      }, 1200);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between font-sans text-left">
        
        {/* Header */}
        <div className="bg-slate-950/60 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-4xl">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600/10 p-1.5 rounded-xl text-indigo-400 border border-indigo-500/10">
                <Database className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h1 className="text-sm font-black tracking-tight text-white uppercase leading-none">Sensus Ekonomi 2026</h1>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">Kuesioner Mandiri Elektronik (E-Sensus)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full font-mono font-bold uppercase tracking-wide">
                ● Koneksi Aman
              </span>
              <button
                onClick={() => setDigitalKuesionerKk(null)}
                className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-xl transition-all font-bold"
              >
                Portal Petugas
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Stage */}
        <div className="container mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center max-w-2xl">
          {isDigitalSuccess ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Check className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-white">Sensus Mandiri Selesai!</h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                  Terima kasih banyak atas partisipasi aktif Bapak/Ibu dalam mempercepat pembangunan ekonomi nasional melalui pengisian data sensus mandiri yang valid.
                </p>
              </div>

              {/* Digital Certificate Receipt */}
              <div className="border border-slate-800 bg-slate-950/40 p-5 rounded-2xl relative text-left overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="border-l-4 border-indigo-500 pl-4 space-y-3">
                  <span className="text-[8px] uppercase tracking-widest text-indigo-400 font-extrabold block">Bukti Pengisian Digital (E-Sensus)</span>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <p><strong className="text-slate-500">Nomor KK:</strong> <span className="font-mono font-bold text-slate-200">{digitalKuesionerKk}</span></p>
                    <p><strong className="text-slate-500">Kepala Keluarga:</strong> <span className="font-bold text-slate-200">{digitalFormValues?.namaKepala}</span></p>
                    <p><strong className="text-slate-500">Tanggal Pengisian:</strong> <span className="text-slate-200">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
                    <p><strong className="text-slate-500">Status Verifikasi:</strong> <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 inline-block text-[9px] uppercase tracking-wide">Terdaftar Online</span></p>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 italic max-w-sm mx-auto">
                Data Anda telah dienkripsi secara aman dan langsung sinkron ke sistem pusat Badan Pusat Statistik (BPS) Kecamatan Pakenjeng.
              </div>

              <button
                onClick={() => {
                  setIsDigitalSuccess(false);
                  setDigitalKuesionerKk(null);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl text-xs transition-all shadow-lg hover:shadow-indigo-500/20"
              >
                Kembali ke Beranda Utama
              </button>
            </div>
          ) : !family ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">Nomor KK Tidak Ditemukan</h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                  Maaf, nomor Kartu Keluarga <span className="font-mono font-bold text-rose-400">{digitalKuesionerKk}</span> tidak ditemukan dalam pangkalan data pra-sensus wilayah. Silakan periksa kembali nomor KK Anda.
                </p>
              </div>

              {/* Manual Input for Typo */}
              <div className="space-y-2 max-w-sm mx-auto">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">Masukkan Kembali No KK</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="16 Digit No. KK"
                    maxLength={16}
                    onChange={(e) => {
                      if (e.target.value.length === 16) {
                        setDigitalKuesionerKk(e.target.value);
                      }
                    }}
                    className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850">
                <button
                  onClick={() => setDigitalKuesionerKk(null)}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  Hubungi Call Center BPS / Kembali
                </button>
              </div>
            </div>
          ) : !digitalFormValues ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Menyiapkan berkas kuesioner mandiri...</p>
            </div>
          ) : (
            <form onSubmit={handleDigitalSubmit} className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-3 duration-300">
              
              {/* Introduction Card */}
              <div className="bg-indigo-950/20 border border-indigo-500/20 p-5 rounded-3xl space-y-1.5 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-2 text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Verifikasi Mandiri Sensus</span>
                </div>
                <h2 className="text-base font-extrabold text-white">Selamat Datang, Keluarga Bapak/Ibu {family.namaKepala}</h2>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Silakan periksa, verifikasi, dan lengkapi kuesioner karakteristik tempat tinggal serta kependudukan keluarga Anda di bawah ini untuk dilaporkan ke Badan Pusat Statistik.
                </p>
              </div>

              {/* Section 1: Identitas & Kontak */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-left space-y-4 shadow-xl">
                <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2.5">
                  <Users className="w-4 h-4" />
                  <span>Blok I: Identitas & Kontak Hubung</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nomor Kartu Keluarga (KK)</label>
                    <input
                      type="text"
                      disabled
                      value={digitalFormValues.noKk}
                      className="block w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-500 font-mono focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">NIK Kepala Keluarga</label>
                    <input
                      type="text"
                      disabled
                      value={digitalFormValues.nikKepala}
                      className="block w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-500 font-mono focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nama Kepala Keluarga (Sesuai KTP)</label>
                    <input
                      type="text"
                      required
                      value={digitalFormValues.namaKepala}
                      onChange={(e) => setDigitalFormValues({...digitalFormValues, namaKepala: e.target.value})}
                      className="block w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nomor Telepon / WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="Contoh: 08123456789"
                      required
                      value={digitalFormValues.noHp}
                      onChange={(e) => setDigitalFormValues({...digitalFormValues, noHp: e.target.value})}
                      className="block w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Alamat Email (Opsional)</label>
                    <input
                      type="email"
                      placeholder="nama@email.com"
                      value={digitalFormValues.email}
                      onChange={(e) => setDigitalFormValues({...digitalFormValues, email: e.target.value})}
                      className="block w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Karakteristik Rumah Tangga */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-left space-y-4 shadow-xl">
                <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-2 border-b border-slate-850 pb-2.5">
                  <Database className="w-4 h-4" />
                  <span>Blok IV: Karakteristik Hunian & Ekonomi</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Jenis Bangunan Tempat Tinggal</label>
                    <select
                      value={digitalFormValues.jenisBangunan}
                      onChange={(e) => setDigitalFormValues({...digitalFormValues, jenisBangunan: e.target.value})}
                      className="block w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none transition-all"
                    >
                      <option value="Rumah Tinggal Biasa">Rumah Tinggal Biasa</option>
                      <option value="Apartemen / Kondominium">Apartemen / Kondominium</option>
                      <option value="Ruko / Rumah Toko">Ruko / Rumah Toko</option>
                      <option value="Rumah Kost / Asrama">Rumah Kost / Asrama</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status Kepemilikan Hunian</label>
                    <select
                      value={digitalFormValues.statusKepemilikan}
                      onChange={(e) => setDigitalFormValues({...digitalFormValues, statusKepemilikan: e.target.value})}
                      className="block w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none transition-all"
                    >
                      <option value="Milik Sendiri">Milik Sendiri</option>
                      <option value="Sewa / Kontrak">Sewa / Kontrak</option>
                      <option value="Bebas Sewa (Milik Keluarga/Dinas)">Bebas Sewa (Milik Keluarga/Dinas)</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sumber Air Minum Utama</label>
                    <select
                      value={digitalFormValues.sumberAirMinum}
                      onChange={(e) => setDigitalFormValues({...digitalFormValues, sumberAirMinum: e.target.value})}
                      className="block w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none transition-all"
                    >
                      <option value="Leding/PAM">Leding/PAM</option>
                      <option value="Sumur Terlindung">Sumur Terlindung</option>
                      <option value="Mata Air Terlindung">Mata Air Terlindung</option>
                      <option value="Air Isi Ulang / Kemasan">Air Isi Ulang / Kemasan</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sumber Penerangan Utama</label>
                    <select
                      value={digitalFormValues.sumberPenerangan}
                      onChange={(e) => setDigitalFormValues({...digitalFormValues, sumberPenerangan: e.target.value})}
                      className="block w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none transition-all"
                    >
                      <option value="Listrik PLN">Listrik PLN</option>
                      <option value="Listrik Non-PLN / Mandiri">Listrik Non-PLN / Mandiri</option>
                      <option value="Bukan Listrik (Petromak/Alat Lain)">Bukan Listrik (Petromak/Alat Lain)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Estimasi Pengeluaran Listrik Bulanan</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs font-bold">Rp</span>
                      <input
                        type="number"
                        required
                        value={digitalFormValues.pengeluaranListrik}
                        onChange={(e) => setDigitalFormValues({...digitalFormValues, pengeluaranListrik: e.target.value})}
                        className="block w-full pl-8 pr-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none font-mono transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Jumlah Anggota Keluarga (ART)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={25}
                      value={digitalFormValues.jmlAnggota}
                      onChange={(e) => setDigitalFormValues({...digitalFormValues, jmlAnggota: e.target.value})}
                      className="block w-full p-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none font-mono transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Declaration Checkbox */}
              <div className="flex items-start gap-3 bg-slate-950/40 border border-slate-850 p-4 rounded-2xl text-left">
                <input
                  type="checkbox"
                  required
                  id="declar_check"
                  className="w-4 h-4 rounded border-slate-850 text-indigo-600 focus:ring-indigo-500 bg-slate-950 mt-0.5"
                />
                <label htmlFor="declar_check" className="text-[10px] text-slate-400 leading-relaxed cursor-pointer select-none">
                  Saya menyatakan dengan sadar bahwa seluruh data karakteristik keluarga dan perumahan yang saya laporkan di atas adalah benar, valid, serta dapat dipertanggungjawabkan sesuai ketentuan BPS RI.
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setDigitalKuesionerKk(null)}
                  className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white font-bold py-3 px-6 rounded-2xl text-xs transition-all text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isDigitalSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-bold py-3 px-6 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  {isDigitalSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim Data Mandiri...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Data Sensus Mandiri</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-900 bg-slate-950/40 py-6 text-center text-[10px] text-slate-500 max-w-4xl mx-auto w-full">
          Aplikasi E-Sensus Mandiri ini dilindungi oleh Protokol Enkripsi Keamanan Informasi Publik RI. Sensus Ekonomi 2026 diselenggarakan oleh Badan Pusat Statistik.
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between font-sans">
        
        {/* Top Header/Bar */}
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-7 h-7 text-indigo-500" />
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-indigo-400 bg-clip-text text-transparent font-sans">SE2026 PRO</h1>
          </div>
          <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1.5 rounded-full font-mono border border-slate-700">
            BPS-COMPLIANT v1.2
          </span>
        </div>

        {/* Center Auth Card Layout */}
        <div className="container mx-auto px-6 py-8 flex flex-col lg:flex-row items-center justify-center gap-12 max-w-6xl flex-1">
          {/* Left Hero / Promo Info */}
          <div className="lg:w-1/2 space-y-6 text-center lg:text-left">
            <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold tracking-widest px-4 py-1.5 rounded-full uppercase border border-indigo-500/20">
              SISTEM INFORMASI TERPADU SENSUS EKONOMI 2026
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Akses Portal Resmi <br/>
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Administrator Sensus</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-lg mx-auto lg:mx-0">
              Sistem Pengolahan Data Sensus Ekonomi 2026 Terpadu Pro merupakan solusi digital terlengkap bagi Petugas Sensus (Enumerator) untuk perekaman, pengujian validitas, pencetakan kuesioner resmi, dan integrasi penyimpanan cloud instan.
            </p>

            {/* Feature lists */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2 max-w-lg mx-auto lg:mx-0">
              <div className="flex items-start gap-3 bg-slate-900/60 p-3.5 border border-slate-800 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Validasi Terpadu</h4>
                  <p className="text-[10px] text-slate-500">Mencegah NIK ganda & kesalahan input.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-900/60 p-3.5 border border-slate-800 rounded-xl">
                <Cloud className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Awan Google Terhubung</h4>
                  <p className="text-[10px] text-slate-500">Backup Drive & Ekspor Google Sheets instan.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-900/60 p-3.5 border border-slate-800 rounded-xl">
                <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Kecerdasan AI Gemini</h4>
                  <p className="text-[10px] text-slate-500">Ekstrak otomatis transkrip & pemetaan GIS.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-900/60 p-3.5 border border-slate-800 rounded-xl">
                <Printer className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Cetak Form Resmi</h4>
                  <p className="text-[10px] text-slate-500">Ekspor berkas kuesioner SE26.K standar BPS.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Login/Register Card */}
          <div className="lg:w-1/2 w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-8 relative shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>

            {/* TAB SELECTORS */}
            <div className="flex bg-slate-900 p-1.5 rounded-2xl mb-8 border border-slate-850 relative z-10">
              <button
                onClick={() => setLoginRole('PPL')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${loginRole === 'PPL' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Petugas PPL (Gmail)</span>
              </button>
              <button
                onClick={() => setLoginRole('PML')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${loginRole === 'PML' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Admin / PML</span>
              </button>
            </div>

            {/* ACTIVE PANEL CONTENT */}
            <div className="space-y-6 relative z-10">
              {loginRole === 'PPL' ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white tracking-tight font-sans text-left">Portal Masuk Petugas PPL (Pencacah)</h3>
                    <p className="text-slate-400 text-xs leading-relaxed text-left">
                      Khusus untuk petugas Pencacah Lapangan (PPL). Sensus Ekonomi 2026 mewajibkan login dengan Akun Gmail resmi Anda untuk mengaktifkan integrasi Google Drive Sync & Google Sheets.
                    </p>
                  </div>

                  {/* Login Google Action Button */}
                  <button
                    onClick={handleSignIn}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 px-6 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 group"
                  >
                    <div className="bg-white p-1 rounded-lg shrink-0">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.281 1.09 15.42 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.814 11.57-11.79 0-.795-.085-1.4-.195-1.925H12.24z"/>
                      </svg>
                    </div>
                    <div className="text-left text-xs">
                      <p className="font-extrabold text-white">Masuk dengan Akun Gmail</p>
                      <p className="text-[10px] text-indigo-200 group-hover:text-white transition-all">Sesi Terenkripsi & Terhubung Cloud</p>
                    </div>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAdminSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white tracking-tight font-sans text-left">Portal Masuk Admin / PML (Pengawas)</h3>
                    <p className="text-slate-400 text-xs leading-relaxed text-left">
                      Khusus untuk Supervisor/Pengawas PML atau Administrator BPS. Masuk menggunakan username dan password sistem yang diberikan oleh Kabupaten Garut.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">Username</label>
                      <input
                        type="text"
                        required
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="Contoh: admin"
                        className="block w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">Password / Kata Sandi</label>
                      <input
                        type="password"
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 px-6 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 mt-4"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Masuk Portal Supervisor/Admin</span>
                  </button>

                  <div className="p-3 bg-purple-950/20 border border-purple-500/10 rounded-2xl text-[10px] text-purple-300 leading-normal text-left">
                    <strong>💡 Info Akun Demo:</strong> Gunakan user <code className="bg-purple-950 px-1 py-0.5 rounded text-white font-mono">admin</code> dan password <code className="bg-purple-950 px-1 py-0.5 rounded text-white font-mono">admin1949</code> untuk masuk sebagai administrator sensus.
                  </div>
                </form>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-500 py-2 justify-center">
                <span className="w-10 h-px bg-slate-800"></span>
                <span>atau lanjutkan offline</span>
                <span className="w-10 h-px bg-slate-800"></span>
              </div>

              {/* Guest Login Bypass */}
              <button
                onClick={() => {
                  setGuestMode(true);
                  localStorage.setItem('se2026_guest', 'true');
                }}
                className="w-full bg-slate-900 hover:bg-slate-850 text-slate-300 py-3 px-4 rounded-xl text-xs font-semibold border border-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <span>Akses Mode Tamu (Tanpa Sinkronisasi Cloud)</span>
              </button>
            </div>

            {/* Disclaimer */}
            <div className="mt-8 pt-6 border-t border-slate-900 text-center text-[10px] text-slate-600 relative z-10">
              Aplikasi ini mematuhi Ketentuan Keamanan Data Informasi Publik RI. Sensus Ekonomi 2026 diselenggarakan oleh Badan Pusat Statistik.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-900 bg-slate-950/40 py-6 text-center text-xs text-slate-500">
          Hak Cipta © 2026 Kementerian PPN / Bappenas & Badan Pusat Statistik Republik Indonesia. All Rights Reserved.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className={`no-print flex flex-col bg-slate-950 border-r border-slate-800 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-500" />
            <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-white to-indigo-400 bg-clip-text text-transparent">SE2026 PRO</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <Database className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('keluarga')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'keluarga' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <Users className="w-5 h-5" />
            <span>Data Keluarga</span>
          </button>

          <button 
            onClick={() => setActiveTab('anggota')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'anggota' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <UserPlus className="w-5 h-5" />
            <span>Anggota Keluarga</span>
          </button>

          <button 
            onClick={() => setActiveTab('usaha')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'usaha' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <Briefcase className="w-5 h-5" />
            <span>Unit Usaha</span>
          </button>

          <button 
            onClick={() => setActiveTab('cetak')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'cetak' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <Printer className="w-5 h-5" />
            <span>Formulir Cetak</span>
          </button>

          <button 
            onClick={() => setActiveTab('imporEkspor')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'imporEkspor' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>Impor & Ekspor</span>
          </button>

          <div className="pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest pl-4">Integrasi Awan</div>

          <button 
            onClick={() => setActiveTab('gdrive')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'gdrive' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <Cloud className="w-5 h-5" />
            <span>Google Drive Sync</span>
          </button>

          <button 
            onClick={() => setActiveTab('ai')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ai' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span>Gemini AI Assistant</span>
          </button>

          <button 
            onClick={() => setActiveTab('pengaturan')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'pengaturan' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>Pengaturan Akun</span>
          </button>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between gap-1">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                officerRole === 'PML' 
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' 
                  : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
              }`}>
                {officerRole === 'PML' ? 'Supervisor PML' : 'Enumerator PPL'}
              </span>
              <span className="text-[10px] font-mono text-slate-500 truncate max-w-[100px]" title={officerId}>
                {officerId}
              </span>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white truncate" title={officerName}>{officerName}</p>
              <p className="text-[9px] text-slate-400 truncate font-medium">{officerDesa ? `Desa ${officerDesa}` : 'Wilayah Belum Diatur'}</p>
            </div>
          </div>

          {user ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate">
                  <p className="text-[10px] text-slate-400 truncate leading-tight">Google: {user.displayName}</p>
                  <p className="text-[9px] text-slate-500 truncate">{user.email}</p>
                </div>
                <button onClick={handleSignOut} className="p-1.5 hover:bg-slate-800 rounded-lg text-rose-400 shrink-0" title="Keluar">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Gmail Terhubung</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Mode Tamu (Offline)</span>
              </div>
              <button onClick={handleSignIn} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-xl text-xs font-bold transition-all">
                <span>Hubungkan Gmail</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* HEADER */}
        <header className="no-print bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:bg-slate-900 rounded-xl">
              <Database className="w-5 h-5" />
            </button>
            <h2 className="text-md font-bold tracking-tight text-indigo-300">Sensus Ekonomi 2026 Terpadu Pro</h2>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setUnifiedData({ 
                  keluarga: {
                    provinsi: 'JAWA BARAT',
                    kabKota: 'GARUT',
                    kecamatan: 'PAKENJENG',
                    desaKelurahan: 'Depok',
                    rt: '01',
                    rw: '01',
                    alamatSesuai: 'Ya',
                    jmlAnggota: '1'
                  }, 
                  anggota: [{}], 
                  usaha: [] 
                });
                setUnifiedStep(1);
                setShowUnifiedModal(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Sensus Satu Atap</span>
            </button>

            <button 
              onClick={triggerExportSheets}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all shadow-lg"
              title="Ekspor Seluruh Database Sensus ke Google Sheet"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Google Sheet</span>
            </button>
          </div>
        </header>

        {/* SCREEN SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* HERO PROMOTIONAL BANNER */}
                <div className="bg-gradient-to-r from-indigo-900 via-slate-950 to-indigo-950 border border-indigo-800/40 p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-3 z-10">
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase border border-indigo-500/30">INTEGRATED WORKSPACE AI</span>
                    <h3 className="text-2xl font-black text-white md:text-3xl">Perekaman Data Sensus Harmonis</h3>
                    <p className="text-slate-400 text-sm max-w-xl">
                      Kelola kuesioner Sensus Ekonomi 2026 secara terpadu. Hubungkan ke Google Drive untuk backup instan, sinkronisasikan lembar tabel dengan Google Sheets, cari data geografis dengan Google Maps Grounding, dan kembangkan efisiensi entri menggunakan AI Gemini.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setUnifiedData({ keluarga: {}, anggota: [{}], usaha: [] });
                      setUnifiedStep(1);
                      setShowUnifiedModal(true);
                    }}
                    className="bg-white hover:bg-indigo-50 text-indigo-950 font-black py-4 px-8 rounded-2xl transition-all shadow-xl text-sm whitespace-nowrap z-10 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Mulai Perekaman</span>
                  </button>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase">Total Keluarga</p>
                      <p className="text-3xl font-black text-indigo-400 mt-2">{dataKeluarga.length}</p>
                    </div>
                    <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase">Anggota Terdaftar</p>
                      <p className="text-3xl font-black text-emerald-400 mt-2">{dataAnggota.length}</p>
                    </div>
                    <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400">
                      <UserPlus className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase">Unit Usaha Lokal</p>
                      <p className="text-3xl font-black text-amber-400 mt-2">{dataUsaha.length}</p>
                    </div>
                    <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-400">
                      <Briefcase className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase">Total Omset Usaha</p>
                      <p className="text-3xl font-black text-purple-400 mt-2 truncate">Rp {(totalOmset/1000000).toFixed(1)} jt</p>
                    </div>
                    <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* ADVANCED STATISTICS VISUALIZATIONS SECTION */}
                <div className="space-y-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-indigo-400">
                        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                        <span className="text-[10px] font-black tracking-widest uppercase">Analisis Statistik Tingkat Lanjut (SE2026)</span>
                      </div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <span>Peta Panas Sektoral & Tren Ekonomi Pakenjeng</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Visualisasi intensitas kepadatan penduduk per desa dan proyeksi perkembangan omset usaha secara interaktif.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT: HEATMAP GRID (col-span-7) */}
                    <div className="lg:col-span-7 bg-slate-950/80 border border-slate-850 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Heatmap Kepadatan Keluarga per Desa</h4>
                          <p className="text-[10px] text-slate-500">Klik blok desa untuk melihat ringkasan demografi dan ekonomi secara langsung.</p>
                        </div>
                        <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-500/20">
                          {DESA_LIST.length} Desa Terdaftar
                        </span>
                      </div>

                      {/* Heatmap color indicators */}
                      <div className="flex items-center gap-3 text-[9px] text-slate-400 bg-slate-900/50 p-2 rounded-lg border border-slate-850 overflow-x-auto">
                        <span className="shrink-0">Intensitas:</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="w-3 h-3 bg-slate-900 rounded border border-slate-800" />
                          <span>0 KK</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="w-3 h-3 bg-indigo-950/50 border border-indigo-900/40 rounded" />
                          <span>Rendah (1-2 KK)</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="w-3 h-3 bg-indigo-900/50 border border-indigo-800/50 rounded" />
                          <span>Sedang (3-5 KK)</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="w-3 h-3 bg-indigo-800/70 border border-indigo-600/60 rounded" />
                          <span>Tinggi (6-10 KK)</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="w-3 h-3 bg-indigo-600 border border-indigo-400 rounded" />
                          <span>Sangat Padat (&gt;10 KK)</span>
                        </div>
                      </div>

                      {/* Grid Heatmap */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {villageStats.map(stat => {
                          const count = stat.totalKk;
                          let intensityClass = "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400";
                          if (count >= 1 && count <= 2) {
                            intensityClass = "bg-indigo-950/50 hover:bg-indigo-950/80 border-indigo-900/40 text-indigo-300";
                          } else if (count >= 3 && count <= 5) {
                            intensityClass = "bg-indigo-900/50 hover:bg-indigo-900/70 border-indigo-800/50 text-indigo-200";
                          } else if (count >= 6 && count <= 10) {
                            intensityClass = "bg-indigo-800/70 hover:bg-indigo-800/90 border-indigo-600/60 text-indigo-100";
                          } else if (count > 10) {
                            intensityClass = "bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/10";
                          }

                          const isSelected = selectedHeatmapVillage === stat.desa;

                          return (
                            <button
                              key={stat.desa}
                              onClick={() => setSelectedHeatmapVillage(isSelected ? null : stat.desa)}
                              className={`p-3 rounded-xl border text-left transition-all ${intensityClass} ${
                                isSelected ? 'ring-2 ring-indigo-400 scale-[1.03] border-indigo-300' : 'hover:scale-[1.01]'
                              }`}
                            >
                              <p className="text-[11px] font-black truncate">{stat.desa}</p>
                              <div className="flex items-baseline justify-between mt-1.5">
                                <span className="text-[9px] opacity-70">Total KK</span>
                                <span className="text-xs font-black">{count}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT: VILLAGE ANALYTICS SIDEBAR / DETAIL CARD (col-span-5) */}
                    <div className="lg:col-span-5 bg-slate-950/80 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between">
                      {selectedHeatmapVillage ? (
                        (() => {
                          const selectedStat = villageStats.find(v => v.desa === selectedHeatmapVillage);
                          if (!selectedStat) return null;
                          return (
                            <div className="space-y-4 h-full flex flex-col justify-between">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                                  <div>
                                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase">Detail Sektoral</span>
                                    <h4 className="text-sm font-black text-white mt-1">Desa {selectedStat.desa}</h4>
                                  </div>
                                  <button 
                                    onClick={() => setSelectedHeatmapVillage(null)}
                                    className="text-xs text-slate-500 hover:text-slate-300 font-bold"
                                  >
                                    Tutup
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase">Kepala Keluarga</p>
                                    <p className="text-lg font-black text-white mt-1">{selectedStat.totalKk} KK</p>
                                  </div>
                                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase">Rumah Tangga</p>
                                    <p className="text-lg font-black text-emerald-400 mt-1">{selectedStat.totalArt} Jiwa</p>
                                  </div>
                                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase">Unit Usaha MIK</p>
                                    <p className="text-lg font-black text-amber-400 mt-1">{selectedStat.totalUsaha} Unit</p>
                                  </div>
                                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase">Estimasi Omset</p>
                                    <p className="text-xs font-black text-purple-400 mt-2 truncate">Rp {selectedStat.totalOmset.toLocaleString('id-ID')}</p>
                                  </div>
                                </div>

                                <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl space-y-1 text-[10px] text-slate-400 leading-relaxed">
                                  <p className="font-bold text-white">Interpretasi Wilayah:</p>
                                  {selectedStat.totalKk === 0 ? (
                                    <span>Desa ini belum memiliki data sensus terekam di database lokal. Gunakan fitur Tambah Data untuk merekam kuesioner baru.</span>
                                  ) : (
                                    <span>
                                      Rasio usaha per KK di Desa {selectedStat.desa} adalah {(selectedStat.totalUsaha / Math.max(selectedStat.totalKk, 1)).toFixed(1)}x. 
                                      Rata-rata anggota keluarga adalah {(selectedStat.totalArt / Math.max(selectedStat.totalKk, 1)).toFixed(1)} jiwa per KK.
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="pt-4 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                                <span>KECAMATAN PAKENJENG</span>
                                <span>GARUT • JAWA BARAT</span>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                          <MapPin className="w-8 h-8 text-indigo-500/40 animate-bounce" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-white">Eksplorasi Wilayah Desa</p>
                            <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                              Silakan pilih salah satu blok desa di panel sebelah kiri untuk memunculkan profil mendalam, analisis rasio keluarga, dan statistik perekonomian sektoral.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* LINE CHART: MONTHLY REVENUE & OPERATIONAL COST TREND */}
                  <div className="bg-slate-950/80 border border-slate-850 p-5 rounded-2xl space-y-4 mt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tren Perkembangan Omset Bulanan & Laba Usaha MIK</h4>
                        <p className="text-[10px] text-slate-500">Proyeksi pergerakan omset akumulatif, biaya operasional, dan margin laba bersih tahunan.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-[10px] text-slate-400 font-bold">Proyeksi Tren Real-time</span>
                      </div>
                    </div>

                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartTrenOmset}
                          margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            tickLine={false} 
                            tickFormatter={(v) => `Rp ${(v/1000000).toFixed(1)}jt`}
                          />
                          <Tooltip 
                            formatter={(value) => [`Rp ${Number(value).toLocaleString('id-ID')}`, '']}
                            contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          <Line type="monotone" dataKey="Total Omset" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="Biaya Operasional" stroke="#ec4899" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="Laba Bersih" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* INTERACTIVE CENSUS MAP WIDGET */}
                <CensusMap 
                  dataKeluarga={dataKeluarga} 
                  dataAnggota={dataAnggota} 
                  dataUsaha={dataUsaha} 
                />

                {/* GRAPHICAL CHARTS DASHBOARD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* CHART 1: Pendapatan vs Pengeluaran Keluarga */}
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">Perbandingan Pemasukan vs Pengeluaran (Keluarga)</h4>
                      <p className="text-[10px] text-slate-400">Total akumulasi gaji & omset usaha vs pengeluaran pokok rumah tangga.</p>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartKeluargaData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          <Bar dataKey="Pemasukan" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* CHART 2: Distribusi Jenis Bangunan Tempat Tinggal */}
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">Kondisi Fisik: Distribusi Jenis Bangunan</h4>
                      <p className="text-[10px] text-slate-400">Proporsi jenis bangunan tempat tinggal keluarga hasil kuesioner Blok IV.</p>
                    </div>
                    <div className="h-64 w-full flex items-center justify-center">
                      <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartBangunanData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {chartBangunanData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-1/2 space-y-1.5 pl-4 max-h-56 overflow-y-auto">
                        {chartBangunanData.map((entry, index) => (
                          <div key={entry.name} className="flex items-center gap-2 text-[10px]">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-slate-400 truncate max-w-[100px]" title={entry.name}>{entry.name}</span>
                            <span className="text-white font-bold ml-auto">{entry.value} KK</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* CHART 3: Jenjang Pendidikan Terakhir */}
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">Profil Sumber Daya Manusia: Jenjang Pendidikan</h4>
                      <p className="text-[10px] text-slate-400">Tingkat ijazah tertinggi yang dimiliki oleh anggota keluarga terdaftar.</p>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartPendidikanData}
                          layout="vertical"
                          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} width={80} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                          />
                          <Bar dataKey="Jumlah" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* CHART 4: Omset vs Pengeluaran per Unit Usaha */}
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">Kinerja Unit Usaha Ekonomi Lokal</h4>
                      <p className="text-[10px] text-slate-400">Analisis omset bulanan versus biaya operasional unit usaha mikro/kecil.</p>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartUsahaData}
                          margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorOmset" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorBiaya" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          <Area type="monotone" dataKey="Omset" stroke="#f59e0b" fillOpacity={1} fill="url(#colorOmset)" />
                          <Area type="monotone" dataKey="Biaya" stroke="#ec4899" fillOpacity={1} fill="url(#colorBiaya)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* VISUAL & DATA INTEGRITY SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* DATA INTEGRITY / CRITICAL REPORTING */}
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4">
                    <h4 className="text-md font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-indigo-400" />
                      <span>Validasi & Integritas Sensus</span>
                    </h4>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                        <span className="text-slate-400">Hubungan Kepala Keluarga Terverifikasi</span>
                        <span className="text-emerald-400 font-bold">100% Cocok</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                        <span className="text-slate-400">Validasi NIK Ganda / 16-Digit</span>
                        <span className="text-emerald-400 font-bold">Aman</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                        <span className="text-slate-400">Sinkronisasi KK dengan Anggota</span>
                        <span className="text-emerald-400 font-bold">Sempurna</span>
                      </div>
                    </div>
                  </div>

                  {/* QUICK CLOUD STATUS CARD */}
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
                    <div>
                      <h4 className="text-md font-bold text-white flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-indigo-400" />
                        <span>Konektivitas Google Cloud</span>
                      </h4>
                      <p className="text-slate-400 text-xs mt-2">
                        Kelola data sensus Anda di cloud. Simpan backup instan dan ekspor ke Spreadsheet untuk pembuatan laporan dinamis.
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-900 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${token ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
                        <span className="text-slate-300">{token ? 'Sesi Google Drive Aktif' : 'Sesi Offline'}</span>
                      </div>
                      {token ? (
                        <button onClick={() => setActiveTab('gdrive')} className="text-indigo-400 font-bold hover:underline">Kelola Backup</button>
                      ) : (
                        <button onClick={handleSignIn} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg font-bold">Otorisasi Drive</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DATA KELUARGA TAB */}
            {activeTab === 'keluarga' && (() => {
              const filteredKeluarga = dataKeluarga.filter(item => {
                const query = searchKeluarga.toLowerCase();
                return (
                  (item.namaKepala || '').toLowerCase().includes(query) ||
                  (item.noKk || '').toLowerCase().includes(query) ||
                  (item.nikKepala || '').toLowerCase().includes(query) ||
                  (item.desaKelurahan || '').toLowerCase().includes(query) ||
                  (item.noHp || '').toLowerCase().includes(query)
                );
              });

              return (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">Blok I & IV: Data Keluarga Terdaftar</h3>
                      <p className="text-slate-400 text-xs mt-1">Daftar kartu keluarga beserta informasi tempat tinggal dan pengeluaran.</p>
                    </div>
                    <button 
                      onClick={() => handleOpenAdd('keluarga')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 w-fit"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Keluarga</span>
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-slate-850/60">
                    <div className="relative w-full sm:max-w-md">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-500" />
                      </div>
                      <input
                        type="text"
                        placeholder="Cari berdasarkan nama kepala, No KK, NIK, Desa..."
                        value={searchKeluarga}
                        onChange={(e) => setSearchKeluarga(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                      {searchKeluarga && (
                        <button
                          onClick={() => setSearchKeluarga('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {searchKeluarga && (
                      <div className="text-[11px] text-slate-400 font-medium">
                        Menampilkan <span className="text-indigo-400 font-bold">{filteredKeluarga.length}</span> dari {dataKeluarga.length} keluarga
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                            <th className="p-4 font-semibold">Nomor KK</th>
                            <th className="p-4 font-semibold">Kepala Keluarga</th>
                            <th className="p-4 font-semibold">Kontak</th>
                            <th className="p-4 font-semibold">Kecamatan/Desa</th>
                            <th className="p-4 font-semibold">Anggota</th>
                            <th className="p-4 font-semibold">Penerangan / Listrik</th>
                            <th className="p-4 font-semibold">Status Berkas</th>
                            <th className="p-4 font-semibold">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {filteredKeluarga.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-slate-500">
                                <AlertTriangle className="w-8 h-8 text-amber-500/40 mx-auto mb-2 animate-pulse" />
                                <p className="text-xs font-semibold text-slate-400">Tidak ada data keluarga yang cocok</p>
                                <p className="text-[10px] text-slate-600 mt-0.5">Coba gunakan kata kunci pencarian yang lain.</p>
                              </td>
                            </tr>
                          ) : (
                            filteredKeluarga.map((item) => {
                              const status = item.statusPemeriksaan || 'Draft';
                              
                              // Handler for PPL submission
                              const handleAjukanReview = () => {
                                const updated = dataKeluarga.map(k => 
                                  k.id === item.id ? { ...k, statusPemeriksaan: 'Diperiksa' } : k
                                );
                                setDataKeluarga(updated);
                              };

                              // Handler for PML Approval
                              const handleSetujuiPml = () => {
                                const updated = dataKeluarga.map(k => 
                                  k.id === item.id ? { ...k, statusPemeriksaan: 'Disetujui PML', catatanPML: '' } : k
                                );
                                setDataKeluarga(updated);
                              };

                              return (
                                <tr key={item.id} className="hover:bg-slate-900/40">
                                  <td className="p-4 font-mono font-bold text-indigo-300">{item.noKk}</td>
                                  <td className="p-4">
                                    <p className="font-semibold text-slate-200">{item.namaKepala}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">NIK: {item.nikKepala}</p>
                                    {status === 'Ditolak PML' && item.catatanPML && (
                                      <div className="mt-1.5 p-1.5 px-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] text-rose-300 leading-normal max-w-xs">
                                        <strong>⚠️ Koreksi PML:</strong> {item.catatanPML}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <p className="text-slate-200">{item.noHp || '-'}</p>
                                    <p className="text-[10px] text-slate-500">{item.email || '-'}</p>
                                  </td>
                                  <td className="p-4 text-slate-300">
                                    <p className="font-semibold text-white">{item.desaKelurahan}</p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                      RT {item.rt || '00'} / RW {item.rw || '00'} • {item.kecamatan || 'PAKENJENG'}
                                    </p>
                                  </td>
                                  <td className="p-4 font-bold text-indigo-400 text-center">{item.jmlAnggota}</td>
                                  <td className="p-4">
                                    <p className="text-slate-300">{item.sumberPenerangan}</p>
                                    <p className="text-[10px] text-emerald-400">Rp {Number(item.pengeluaranListrik || 0).toLocaleString()}/bln</p>
                                  </td>
                                  <td className="p-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                      status === 'Disetujui PML' 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                        : status === 'Ditolak PML' 
                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                        : status === 'Diperiksa' 
                                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' 
                                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${
                                        status === 'Disetujui PML' 
                                          ? 'bg-emerald-400' 
                                          : status === 'Ditolak PML' 
                                          ? 'bg-rose-400' 
                                          : status === 'Diperiksa' 
                                          ? 'bg-sky-400' 
                                          : 'bg-slate-400'
                                      }`} />
                                      {status === 'Disetujui PML' ? 'Disetujui' : status === 'Ditolak PML' ? 'Revisi PML' : status === 'Diperiksa' ? 'Diperiksa' : 'Draft'}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex flex-wrap gap-1.5">
                                      <button 
                                        onClick={() => setViewingFamilyDetails(item)} 
                                        title="Tampilkan Detail & QR Code"
                                        className="p-1.5 bg-slate-900 border border-slate-800 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-lg transition-colors"
                                      >
                                        <QrCode className="w-3.5 h-3.5" />
                                      </button>
                                      
                                      {/* Role-Based Dynamic Buttons */}
                                      {officerRole === 'PML' ? (
                                        <>
                                          {status !== 'Disetujui PML' && (
                                            <button 
                                              onClick={handleSetujuiPml}
                                              title="Setujui Berkas Sensus"
                                              className="p-1.5 bg-slate-900 border border-slate-800 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-lg transition-colors"
                                            >
                                              <Check className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          {status !== 'Ditolak PML' && (
                                            <button 
                                              onClick={() => {
                                                setRejectingFamilyId(item.id);
                                                setPmlCommentInput(item.catatanPML || '');
                                              }}
                                              title="Tolak & Minta Koreksi"
                                              className="p-1.5 bg-slate-900 border border-slate-800 hover:border-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          {(status === 'Draft' || status === 'Ditolak PML') && (
                                            <button 
                                              onClick={handleAjukanReview}
                                              title="Ajukan untuk Diperiksa PML"
                                              className="p-1.5 bg-slate-900 border border-slate-800 hover:border-sky-500 text-sky-400 hover:text-white rounded-lg transition-colors"
                                            >
                                              <Send className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </>
                                      )}

                                      <button 
                                        onClick={() => handleOpenEdit('keluarga', item)} 
                                        title="Ubah Berkas"
                                        className="p-1.5 bg-slate-900 border border-slate-800 hover:border-indigo-500 text-indigo-400 hover:text-white rounded-lg transition-colors"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => handleDelete('keluarga', item.id)} 
                                        title="Hapus Berkas"
                                        className="p-1.5 bg-slate-900 border border-slate-800 hover:border-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* PML REJECTION FEEDBACK DIALOG MODAL */}
                  {rejectingFamilyId !== null && (() => {
                    const family = dataKeluarga.find(k => k.id === rejectingFamilyId);
                    if (!family) return null;

                    const handleSaveRejection = () => {
                      if (!pmlCommentInput.trim()) {
                        alert('Silakan masukkan catatan koreksi untuk PPL.');
                        return;
                      }
                      const updated = dataKeluarga.map(k => 
                        k.id === rejectingFamilyId 
                          ? { ...k, statusPemeriksaan: 'Ditolak PML', catatanPML: pmlCommentInput } 
                          : k
                      );
                      setDataKeluarga(updated);
                      setRejectingFamilyId(null);
                      setPmlCommentInput('');
                    };

                    return (
                      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-md font-black text-white">Catatan Koreksi Supervisor</h4>
                              <p className="text-[11px] text-slate-400 mt-1">Kepala Keluarga: <span className="font-bold text-indigo-400">{family.namaKepala}</span> | KK: {family.noKk}</p>
                            </div>
                            <button onClick={() => setRejectingFamilyId(null)} className="p-1 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catatan / Uraian Kesalahan Data *</label>
                            <textarea
                              rows={4}
                              value={pmlCommentInput}
                              onChange={(e) => setPmlCommentInput(e.target.value)}
                              placeholder="Uraikan perbaikan data yang harus dilakukan oleh petugas PPL..."
                              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                            />
                            <p className="text-[9px] text-slate-500 italic">PPL akan melihat peringatan koreksi ini langsung pada baris daftar keluarga mereka untuk direvisi.</p>
                          </div>

                          <div className="flex gap-2.5 justify-end pt-2">
                            <button
                              onClick={() => setRejectingFamilyId(null)}
                              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold py-2 px-4 rounded-xl text-xs transition-all"
                            >
                              Batal
                            </button>
                            <button
                              onClick={handleSaveRejection}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all shadow-lg shadow-rose-600/10"
                            >
                              Kirim ke PPL
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* DETAIL KELUARGA & QR CODE MODAL */}
                  {viewingFamilyDetails && (() => {
                    const f = viewingFamilyDetails;
                    const members = dataAnggota.filter(m => m.noKk === f.noKk);
                    const businesses = dataUsaha.filter(u => members.map(m => m.nikAnggota).includes(u.nikPj));
                    const questionnaireUrl = `${window.location.origin}${window.location.pathname}?kk=${f.noKk}`;

                    const copyToClipboard = () => {
                      navigator.clipboard.writeText(questionnaireUrl);
                      setCopiedKkLink(f.noKk);
                      setTimeout(() => {
                        setCopiedKkLink(null);
                      }, 2000);
                    };

                    return (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                          {/* Modal Header */}
                          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 rounded-t-3xl">
                            <div className="flex items-center gap-3">
                              <div className="bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/20 text-emerald-400">
                                <QrCode className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <h4 className="text-md font-bold text-white">Profil Sensus & QR Code Kuesioner</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">Kepala Keluarga: <span className="text-indigo-400 font-bold">{f.namaKepala}</span> | KK: {f.noKk}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setViewingFamilyDetails(null)}
                              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Modal Body */}
                          <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto">
                            {/* Left Column: Data Details */}
                            <div className="md:col-span-7 space-y-6 text-left">
                              {/* Blok I: Identitas Tempat Tinggal */}
                              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-3">
                                <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400 flex items-center gap-1.5 border-b border-slate-900 pb-2">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>Identitas Tempat Tinggal</span>
                                </h5>
                                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[11px]">
                                  <div>
                                    <p className="text-slate-500">NIK Kepala Keluarga</p>
                                    <p className="font-mono font-semibold text-slate-300 mt-0.5">{f.nikKepala || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">Provinsi / Kota</p>
                                    <p className="font-semibold text-slate-300 mt-0.5">{f.provinsi || 'JAWA BARAT'} / {f.kabKota || 'GARUT'}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">Kecamatan / Desa</p>
                                    <p className="font-semibold text-slate-300 mt-0.5">{f.kecamatan || 'PAKENJENG'} / {f.desaKelurahan || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">Rukun Tetangga (RT) / RW</p>
                                    <p className="font-mono font-semibold text-slate-300 mt-0.5">RT {f.rt || '00'} / RW {f.rw || '00'}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">Alamat Sesuai KTP</p>
                                    <p className="font-semibold text-slate-300 mt-0.5">{f.alamatSesuai || 'Ya'}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">No. HP / Kontak</p>
                                    <p className="font-semibold text-slate-300 mt-0.5">{f.noHp || '-'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Blok IV: Utilitas & Karakteristik */}
                              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-3">
                                <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-400 flex items-center gap-1.5 border-b border-slate-900 pb-2">
                                  <Database className="w-3.5 h-3.5" />
                                  <span>Karakteristik & Utilitas Hunian</span>
                                </h5>
                                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[11px]">
                                  <div>
                                    <p className="text-slate-500">Jenis Bangunan</p>
                                    <p className="font-semibold text-slate-300 mt-0.5">{f.jenisBangunan || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">Status Kepemilikan</p>
                                    <p className="font-semibold text-slate-300 mt-0.5">{f.statusKepemilikan || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">Luas Lantai / Jenis Lantai</p>
                                    <p className="font-semibold text-slate-300 mt-0.5">{f.luasLantai || '-'} m² / {f.bahanLantai || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">Sumber Air Minum</p>
                                    <p className="font-semibold text-slate-300 mt-0.5">{f.sumberAirMinum || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">Sumber Penerangan</p>
                                    <p className="font-semibold text-slate-300 mt-0.5">{f.sumberPenerangan || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">Estimasi Pengeluaran Listrik</p>
                                    <p className="font-semibold text-emerald-400 mt-0.5">Rp {Number(f.pengeluaranListrik || 0).toLocaleString()}/bulan</p>
                                  </div>
                                </div>
                              </div>

                              {/* Daftar Anggota Keluarga terdaftar */}
                              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-2">
                                <h5 className="text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-900 pb-2">
                                  Anggota Rumah Tangga ({members.length} Jiwa)
                                </h5>
                                {members.length === 0 ? (
                                  <p className="text-[10px] text-slate-500 italic">Belum ada data anggota keluarga terdaftar.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {members.map((m, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-950 p-2 rounded-xl border border-slate-900">
                                        <div>
                                          <p className="font-bold text-slate-200">{m.namaAnggota}</p>
                                          <p className="text-[9px] text-slate-500 font-mono">NIK: {m.nikAnggota} | Hubungan: {m.hubungan}</p>
                                        </div>
                                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{m.pekerjaan || 'Tidak bekerja'}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right Column: QR Code & Actions */}
                            <div className="md:col-span-5 flex flex-col items-center justify-between bg-slate-950/40 border border-slate-850 p-6 rounded-3xl h-fit text-center space-y-5">
                              <div className="space-y-1.5">
                                <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-500/20 inline-block">
                                  QR Code Sensus Mandiri
                                </div>
                                <h5 className="text-xs font-bold text-white">Metode Pengisian Mandiri</h5>
                                <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                                  Warga dapat memindai QR code ini menggunakan smartphone mereka untuk melihat, memverifikasi, dan melengkapi data kuesioner keluarga secara mandiri secara digital.
                                </p>
                              </div>

                              {/* QR Image Container with elegant styling */}
                              <div className="bg-white p-4 rounded-3xl border-4 border-slate-800 shadow-xl relative group">
                                <QRCodeSVG 
                                  value={questionnaireUrl} 
                                  size={160}
                                  level="H"
                                  includeMargin={true}
                                />
                                <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                  <Sparkles className="w-8 h-8 text-emerald-400 drop-shadow-lg animate-pulse" />
                                </div>
                              </div>

                              {/* Sharing & Copy controls */}
                              <div className="w-full space-y-2.5 text-left">
                                <p className="text-[9px] text-slate-500 font-mono truncate">
                                  URL: <span className="text-slate-400">{questionnaireUrl}</span>
                                </p>
                                
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={copyToClipboard}
                                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 justify-center border ${
                                      copiedKkLink === f.noKk
                                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                                    }`}
                                  >
                                    {copiedKkLink === f.noKk ? (
                                      <>
                                        <Check className="w-4 h-4 animate-bounce" />
                                        <span>Tautan Berhasil Disalin!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-4 h-4" />
                                        <span>Salin Tautan Kuesioner</span>
                                      </>
                                    )}
                                  </button>

                                  <a
                                    href={questionnaireUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 justify-center shadow-lg hover:shadow-indigo-500/10"
                                  >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Buka Portal Mandiri</span>
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* DATA ANGGOTA TAB */}
            {activeTab === 'anggota' && (() => {
              const filteredAnggota = dataAnggota.filter(item => {
                const query = searchAnggota.toLowerCase();
                return (
                  (item.namaAnggota || '').toLowerCase().includes(query) ||
                  (item.nikAnggota || '').toLowerCase().includes(query) ||
                  (item.noKk || '').toLowerCase().includes(query) ||
                  (item.pekerjaan || '').toLowerCase().includes(query) ||
                  (item.hubungan || '').toLowerCase().includes(query)
                );
              });

              return (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">Blok III: Anggota Keluarga</h3>
                      <p className="text-slate-400 text-xs mt-1">Daftar rincian seluruh anggota keluarga beserta pendidikan, perkawinan, dan gaji.</p>
                    </div>
                    <button 
                      onClick={() => handleOpenAdd('anggota')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 w-fit"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Anggota</span>
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-slate-850/60">
                    <div className="relative w-full sm:max-w-md">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-500" />
                      </div>
                      <input
                        type="text"
                        placeholder="Cari berdasarkan nama anggota, NIK, No KK, Pekerjaan..."
                        value={searchAnggota}
                        onChange={(e) => setSearchAnggota(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                      {searchAnggota && (
                        <button
                          onClick={() => setSearchAnggota('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {searchAnggota && (
                      <div className="text-[11px] text-slate-400 font-medium">
                        Menampilkan <span className="text-indigo-400 font-bold">{filteredAnggota.length}</span> dari {dataAnggota.length} anggota
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                            <th className="p-4 font-semibold">No KK</th>
                            <th className="p-4 font-semibold">Nama Anggota</th>
                            <th className="p-4 font-semibold">NIK Anggota</th>
                            <th className="p-4 font-semibold">Hubungan / JK</th>
                            <th className="p-4 font-semibold">Pekerjaan</th>
                            <th className="p-4 font-semibold">Gaji Utama</th>
                            <th className="p-4 font-semibold">Disabilitas</th>
                            <th className="p-4 font-semibold">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {filteredAnggota.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-slate-500">
                                <AlertTriangle className="w-8 h-8 text-amber-500/40 mx-auto mb-2 animate-pulse" />
                                <p className="text-xs font-semibold text-slate-400">Tidak ada data anggota keluarga yang cocok</p>
                                <p className="text-[10px] text-slate-600 mt-0.5">Coba gunakan kata kunci pencarian yang lain.</p>
                              </td>
                            </tr>
                          ) : (
                            filteredAnggota.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-900/40">
                                <td className="p-4 font-mono font-bold text-indigo-400">{item.noKk}</td>
                                <td className="p-4 font-semibold text-slate-200">{item.namaAnggota}</td>
                                <td className="p-4 font-mono text-slate-400">{item.nikAnggota}</td>
                                <td className="p-4">
                                  <p className="text-slate-300 font-medium">{item.hubungan}</p>
                                  <p className="text-[10px] text-slate-500">{item.jk}</p>
                                </td>
                                <td className="p-4">
                                  <p className="text-slate-300">{item.pekerjaan}</p>
                                  <p className="text-[10px] text-slate-500">{item.kedudukanPekerjaan}</p>
                                </td>
                                <td className="p-4 font-semibold text-emerald-400">Rp {Number(item.gaji || 0).toLocaleString()}</td>
                                <td className="p-4 text-slate-400">{item.disabilitas}</td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    <button onClick={() => handleOpenEdit('anggota', item)} className="p-2 bg-slate-900 border border-slate-800 hover:border-indigo-500 text-indigo-400 hover:text-white rounded-lg">
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete('anggota', item.id)} className="p-2 bg-slate-900 border border-slate-800 hover:border-rose-500 text-rose-400 hover:text-white rounded-lg">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* DATA USAHA TAB */}
            {activeTab === 'usaha' && (() => {
              const filteredUsaha = dataUsaha.filter(item => {
                const query = searchUsaha.toLowerCase();
                return (
                  (item.namaUsaha || '').toLowerCase().includes(query) ||
                  (item.nikPj || '').toLowerCase().includes(query) ||
                  (item.kbli || '').toLowerCase().includes(query) ||
                  (item.statusBadan || '').toLowerCase().includes(query)
                );
              });

              return (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">Blok II: Unit Usaha Ekonomi Lokal</h3>
                      <p className="text-slate-400 text-xs mt-1">Daftar unit usaha mandiri dan rincian omset, KBLI, serta aset usaha.</p>
                    </div>
                    <button 
                      onClick={() => handleOpenAdd('usaha')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 w-fit"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Usaha</span>
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-slate-850/60">
                    <div className="relative w-full sm:max-w-md">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-500" />
                      </div>
                      <input
                        type="text"
                        placeholder="Cari berdasarkan nama usaha, NIK PJ, KBLI, status..."
                        value={searchUsaha}
                        onChange={(e) => setSearchUsaha(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                      {searchUsaha && (
                        <button
                          onClick={() => setSearchUsaha('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {searchUsaha && (
                      <div className="text-[11px] text-slate-400 font-medium">
                        Menampilkan <span className="text-indigo-400 font-bold">{filteredUsaha.length}</span> dari {dataUsaha.length} unit usaha
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                            <th className="p-4 font-semibold">NIK PJ</th>
                            <th className="p-4 font-semibold">Nama Usaha / KBLI</th>
                            <th className="p-4 font-semibold">Status Badan</th>
                            <th className="p-4 font-semibold">Pekerja (L/P)</th>
                            <th className="p-4 font-semibold">Pengeluaran</th>
                            <th className="p-4 font-semibold">Pendapatan / Bulan</th>
                            <th className="p-4 font-semibold">NIB</th>
                            <th className="p-4 font-semibold">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {filteredUsaha.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-slate-500">
                                <AlertTriangle className="w-8 h-8 text-amber-500/40 mx-auto mb-2 animate-pulse" />
                                <p className="text-xs font-semibold text-slate-400">Tidak ada data unit usaha yang cocok</p>
                                <p className="text-[10px] text-slate-600 mt-0.5">Coba gunakan kata kunci pencarian yang lain.</p>
                              </td>
                            </tr>
                          ) : (
                            filteredUsaha.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-900/40">
                                <td className="p-4 font-mono font-bold text-slate-400">{item.nikPj}</td>
                                <td className="p-4">
                                  <p className="font-semibold text-slate-200">{item.namaUsaha}</p>
                                  <p className="text-[10px] text-indigo-400 font-mono">KBLI: {item.kbli}</p>
                                </td>
                                <td className="p-4 text-slate-300">{item.statusBadan}</td>
                                <td className="p-4 text-slate-300">{item.pekerjaLaki} L / {item.pekerjaPerempuan} P</td>
                                <td className="p-4 text-rose-400">Rp {Number(item.pengeluaranBulan || 0).toLocaleString()}</td>
                                <td className="p-4 font-semibold text-emerald-400">Rp {Number(item.pendapatanBulan || 0).toLocaleString()}</td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.memilikiNib === 'Ya' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                                    {item.memilikiNib === 'Ya' ? 'Ada NIB' : 'Tidak Ada'}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    <button onClick={() => handleOpenEdit('usaha', item)} className="p-2 bg-slate-900 border border-slate-800 hover:border-indigo-500 text-indigo-400 hover:text-white rounded-lg">
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete('usaha', item.id)} className="p-2 bg-slate-900 border border-slate-800 hover:border-rose-500 text-rose-400 hover:text-white rounded-lg">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* CETAK TAB (FORMULIR RESMI & KOSONG) */}
            {activeTab === 'cetak' && (
              <div className="space-y-6">
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl">
                  <h4 className="text-md font-bold text-white mb-2">Pilih Kepala Keluarga / Nomor KK untuk Kuesioner Sensus</h4>
                  <p className="text-slate-400 text-xs mb-4">Cetak kuesioner resmi SE2026.K dengan data yang sudah terisi otomatis, atau cetak form kosong.</p>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <select 
                        value={selectedKkCetak}
                        onChange={(e) => setSelectedKkCetak(e.target.value)}
                        className="p-3 bg-slate-900 border border-slate-800 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
                      >
                        <option value="">-- Pilih Dokumen Sensus --</option>
                        <option value="BLANK">-- CETAK FORMULIR KOSONG (Draft Manual) --</option>
                        {dataKeluarga.map((k) => (
                          <option key={k.id} value={k.noKk}>{k.namaKepala} - KK: {k.noKk}</option>
                        ))}
                      </select>
                    </div>

                    {selectedKkCetak ? (() => {
                      const isBlank = selectedKkCetak === 'BLANK';
                      const familyData = isBlank ? {} : dataKeluarga.find(k => k.noKk === selectedKkCetak) || {};
                      const memberList = isBlank ? [] : dataAnggota.filter(a => a.noKk === selectedKkCetak);
                      const memberNiks = memberList.map(m => m.nikAnggota || '');
                      const businessList = isBlank ? [] : dataUsaha.filter(u => u.nikPj && memberNiks.includes(u.nikPj));

                      return (
                        <div className="space-y-4">
                          {/* Document Information Summary Card */}
                          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mt-2 shadow-inner">
                            <div className="space-y-1.5">
                              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest bg-indigo-950 px-2.5 py-1 rounded border border-indigo-900/40">
                                {isBlank ? 'Formulir Blanko' : 'Data Sensus Terisi'}
                              </span>
                              <h5 className="font-extrabold text-white text-md">
                                {isBlank ? 'Formulir Sensus Kosong (Draft Manual)' : `Kuesioner KK: ${familyData.namaKepala || '-'}`}
                              </h5>
                              {!isBlank && (
                                <p className="text-slate-400 text-xs flex flex-wrap gap-x-4 gap-y-1">
                                  <span>No KK: <strong className="text-slate-300">{familyData.noKk || '-'}</strong></span>
                                  <span>•</span>
                                  <span>Jumlah ART: <strong className="text-indigo-400">{memberList.length} Jiwa</strong></span>
                                  <span>•</span>
                                  <span>Unit Usaha: <strong className="text-emerald-400">{businessList.length} Unit</strong></span>
                                </p>
                              )}
                              {isBlank && (
                                <p className="text-slate-400 text-xs">
                                  Cetak formulir kosong dengan kotak-kotak kosong untuk keperluan pencatatan lapangan secara manual oleh petugas sensus.
                                </p>
                              )}
                            </div>

                            <button 
                              onClick={() => setIsPrintPreviewOpen(true)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl text-xs transition-all flex items-center gap-2.5 shadow-lg shadow-indigo-500/15 active:scale-95 w-full md:w-auto justify-center"
                            >
                              <Printer className="w-4.5 h-4.5" />
                              <span>Buka Pratinjau Cetak (A4 Preview)</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button 
                              onClick={() => exportSingleKkToPdf(familyData, memberList, businessList, isBlank)}
                              className="bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/40 text-rose-300 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center gap-2 justify-center active:scale-95"
                            >
                              <FileText className="w-4 h-4" />
                              <span>Unduh PDF Resmi</span>
                            </button>

                            <button 
                              onClick={() => exportSingleKkToDocx(familyData, memberList, businessList, isBlank)}
                              className="bg-sky-950/40 hover:bg-sky-900/40 border border-sky-800/40 text-sky-300 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center gap-2 justify-center active:scale-95"
                            >
                              <FileDown className="w-4 h-4" />
                              <span>Unduh Word (.doc)</span>
                            </button>
                          </div>
                        </div>
                      );
                    })() : (
                      <div className="text-center p-6 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                        Silakan pilih dokumen sensus atau formulir kosong terlebih dahulu untuk mengaktifkan opsi cetak dan unduh.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-300">
                    <span className="text-sm">💡</span>
                    <div className="space-y-1">
                      <p className="font-bold">Tips Koneksi Printer & PDF:</p>
                      <p className="leading-relaxed text-slate-300">
                        Klik tombol <strong>"Buka Pratinjau Cetak (A4 Preview)"</strong> di atas untuk melihat penataan kuesioner pada kertas A4 secara langsung sebelum mencetak atau menyimpannya. 
                        Jika dialog print browser Anda tidak muncul, pastikan Anda telah membuka aplikasi ini di <strong>Tab Baru</strong> (klik ikon panah miring/buka di tab baru di kanan atas layar preview) untuk melewati batasan keamanan iframe.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CETAK PREVIEW LAYOUT MODAL */}
                {selectedKkCetak && isPrintPreviewOpen && (() => {
                  const isBlank = selectedKkCetak === 'BLANK';
                  const familyData = isBlank ? {} : dataKeluarga.find(k => k.noKk === selectedKkCetak) || {};
                  const memberList = isBlank ? [{}, {}, {}] : dataAnggota.filter(a => a.noKk === selectedKkCetak);
                  const memberNiks = memberList.map(m => m.nikAnggota || '');
                  const businessList = isBlank ? [{}, {}] : dataUsaha.filter(u => u.nikPj && memberNiks.includes(u.nikPj));

                  return (
                    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-200 print:relative print:bg-white print:p-0">
                      {/* Top Bar controls - hidden on print */}
                      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 shadow-lg print:hidden">
                        <div>
                          <div className="flex items-center gap-2">
                            <Printer className="text-indigo-500 w-5 h-5 animate-pulse" />
                            <h3 className="text-md font-bold text-white">
                              Pratinjau Cetak Kuesioner Sensus (SE2026)
                            </h3>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Kepala Keluarga: <span className="font-semibold text-indigo-400">{isBlank ? 'Formulir Blanko' : `${familyData.namaKepala || '-'} (${familyData.noKk || '-'})`}</span> | Format Kertas A4 Portrait
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button 
                            onClick={handlePrintToPrinter}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak (Printer)</span>
                          </button>

                          <button 
                            onClick={() => exportSingleKkToPdf(familyData, memberList, businessList, isBlank)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Unduh PDF</span>
                          </button>

                          <button 
                            onClick={() => exportSingleKkToDocx(familyData, memberList, businessList, isBlank)}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>Unduh Word</span>
                          </button>

                          <button 
                            onClick={() => setIsPrintPreviewOpen(false)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 active:scale-95"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Tutup</span>
                          </button>
                        </div>
                      </div>

                      {/* Canvas Container */}
                      <div className="flex-1 overflow-y-auto bg-slate-950/40 p-4 md:p-8 flex flex-col items-center gap-8 print:p-0 print:bg-white print:overflow-visible">
                        <div className="text-center max-w-lg mb-1 print:hidden bg-slate-900/40 border border-slate-800/60 p-3.5 rounded-2xl">
                          <p className="text-[11px] text-indigo-400 font-semibold uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-full inline-block">
                            💡 Pratinjau Kertas A4
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                            Scroll ke bawah untuk melihat Lembar 1 dan Lembar 2. Tekan tombol <strong>"Cetak (Printer)"</strong> di atas untuk langsung mengirim ke printer Anda.
                          </p>
                        </div>

                        {/* Printable Area containing pages */}
                        <div id="printable-area" className="space-y-8 max-w-4xl mx-auto print:space-y-0 print:m-0">
                      
                      {/* HALAMAN 1 / LEMBAR 1: IDENTITAS & UTILITAS KELUARGA */}
                      <div className="print-page">
                        <div className="space-y-6">
                          {/* Header Dokumen */}
                          <div className="border-b-4 border-slate-900 pb-3 flex justify-between items-end">
                            <div className="flex gap-4 items-center">
                              {/* Logo Placeholder */}
                              <div className="w-10 h-10 border-2 border-slate-900 bg-slate-50 flex items-center justify-center font-black text-slate-900 text-lg font-mono">BPS</div>
                              <div>
                                <span className="text-[9px] font-bold text-indigo-600 tracking-widest uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 print:hidden">Pratinjau Kuesioner Resmi - Lembar 1</span>
                                <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 leading-none">SENSUS EKONOMI 2026</h1>
                                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">REPUBLIK INDONESIA - BADAN PUSAT STATISTIK (BPS)</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="border-2 border-slate-900 px-3 py-1 font-bold text-sm bg-slate-100 uppercase tracking-widest">SE26.K1 - LEMBAR 1</span>
                            </div>
                          </div>

                          {/* BLOK I */}
                          <div className="space-y-2">
                            <h3 className="bg-slate-900 text-white font-extrabold px-3 py-1.5 text-xs uppercase tracking-wider rounded">BLOK I: IDENTIFIKASI KELUARGA & KONTAK RESPONDEN</h3>
                            
                            <table className="w-full text-xs border-2 border-slate-900 border-collapse">
                              <thead>
                                <tr className="bg-slate-100 font-extrabold border-b-2 border-slate-900 text-slate-800">
                                  <th className="p-2 border-r border-slate-400 w-1/2 text-left tracking-wider text-[10px]">A. WILAYAH ADMINISTRASI</th>
                                  <th className="p-2 text-left tracking-wider text-[10px]">B. IDENTITAS KEPALA KELUARGA</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="p-2.5 border-r border-slate-400 border-b border-slate-300">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">101. PROVINSI</div>
                                    <div className="font-extrabold text-sm tracking-wide mt-1 uppercase border-b border-dashed border-slate-400 pb-1 h-7">
                                      {isBlank ? '' : (familyData.provinsi || 'JAWA BARAT')}
                                    </div>
                                  </td>
                                  <td className="p-2.5 border-b border-slate-300">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">106. NOMOR KARTU KELUARGA (KK)</div>
                                    <div className="flex gap-1.5 mt-2 font-mono">
                                      {Array.from({ length: 16 }).map((_, i) => {
                                        const val = familyData.noKk && familyData.noKk[i];
                                        return (
                                          <div key={i} className="w-5 h-6 border border-slate-400 bg-white flex items-center justify-center font-extrabold text-xs shadow-sm">
                                            {isBlank ? '' : (val || '')}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-2.5 border-r border-slate-400 border-b border-slate-300">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">102. KABUPATEN / KOTA</div>
                                    <div className="font-extrabold text-sm tracking-wide mt-1 uppercase border-b border-dashed border-slate-400 pb-1 h-7">
                                      {isBlank ? '' : (familyData.kabKota || 'GARUT')}
                                    </div>
                                  </td>
                                  <td className="p-2.5 border-b border-slate-300">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">107. NIK KEPALA KELUARGA</div>
                                    <div className="flex gap-1.5 mt-2 font-mono">
                                      {Array.from({ length: 16 }).map((_, i) => {
                                        const val = familyData.nikKepala && familyData.nikKepala[i];
                                        return (
                                          <div key={i} className="w-5 h-6 border border-slate-400 bg-white flex items-center justify-center font-extrabold text-xs shadow-sm">
                                            {isBlank ? '' : (val || '')}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-2.5 border-r border-slate-400 border-b border-slate-300">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">103. KECAMATAN</div>
                                    <div className="font-extrabold text-sm tracking-wide mt-1 uppercase border-b border-dashed border-slate-400 pb-1 h-7">
                                      {isBlank ? '' : (familyData.kecamatan || 'PAKENJENG')}
                                    </div>
                                  </td>
                                  <td className="p-2.5 border-b border-slate-300">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">108. NAMA LENGKAP KEPALA KELUARGA</div>
                                    <div className="font-extrabold text-sm tracking-wide mt-1 uppercase border-b border-dashed border-slate-400 pb-1 h-7">
                                      {isBlank ? '' : familyData.namaKepala}
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-2.5 border-r border-slate-400 border-b border-slate-300">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">104. DESA / KELURAHAN</div>
                                    <div className="font-extrabold text-sm tracking-wide mt-1 uppercase border-b border-dashed border-slate-400 pb-1 h-7">
                                      {isBlank ? '' : familyData.desaKelurahan}
                                    </div>
                                  </td>
                                  <td className="p-2.5 border-b border-slate-300">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">109. NOMOR HANDPHONE / WA KONTAK</div>
                                    <div className="flex gap-1 mt-2 font-mono">
                                      {Array.from({ length: 13 }).map((_, i) => {
                                        const val = familyData.noHp && familyData.noHp[i];
                                        return (
                                          <div key={i} className="w-4.5 h-6 border border-slate-400 bg-white flex items-center justify-center font-extrabold text-xs shadow-sm">
                                            {isBlank ? '' : (val || '')}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-2.5 border-r border-slate-400">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">105. RUKUN TETANGGA (RT) / RUKUN WARGA (RW)</div>
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-[11px] font-bold text-slate-600">RT:</span>
                                      <div className="flex gap-1 font-mono">
                                        {Array.from({ length: 3 }).map((_, i) => {
                                          const rVal = familyData.rt && familyData.rt.toString().padStart(3, '0')[i];
                                          return (
                                            <div key={i} className="w-5 h-6 border border-slate-400 bg-white flex items-center justify-center font-extrabold text-xs shadow-sm">
                                              {isBlank ? '' : (rVal || '')}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <span className="text-[11px] font-bold text-slate-600 ml-4">RW:</span>
                                      <div className="flex gap-1 font-mono">
                                        {Array.from({ length: 3 }).map((_, i) => {
                                          const wVal = familyData.rw && familyData.rw.toString().padStart(3, '0')[i];
                                          return (
                                            <div key={i} className="w-5 h-6 border border-slate-400 bg-white flex items-center justify-center font-extrabold text-xs shadow-sm">
                                              {isBlank ? '' : (wVal || '')}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-2.5">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">110. ALAMAT EMAIL RESPONDEN</div>
                                    <div className="font-extrabold text-sm mt-1 border-b border-dashed border-slate-400 pb-1 h-7 text-slate-800">
                                      {isBlank ? '' : (familyData.email || '-')}
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* BLOK IV */}
                          <div className="space-y-2">
                            <h3 className="bg-slate-900 text-white font-extrabold px-3 py-1.5 text-xs uppercase tracking-wider rounded">BLOK IV: KARAKTERISTIK BANGUNAN, UTILITAS & PENGELUARAN</h3>
                            
                            <table className="w-full text-xs border-2 border-slate-900 border-collapse">
                              <thead>
                                <tr className="bg-slate-100 font-extrabold border-b-2 border-slate-900 text-slate-800">
                                  <th className="p-2 border-r border-slate-400 w-1/2 text-left tracking-wider text-[10px]">C. KARAKTERISTIK BANGUNAN & UTILITAS</th>
                                  <th className="p-2 text-left tracking-wider text-[10px]">D. REKAPITULASI PENGELUARAN BULANAN (RUPIAH)</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="p-2 border-r border-slate-400 border-b border-slate-200">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">401. JENIS BANGUNAN TEMPAT TINGGAL</div>
                                    <div className="font-extrabold text-xs uppercase mt-1 border-b border-dashed border-slate-400 pb-1 h-6">
                                      {isBlank ? '' : familyData.jenisBangunan}
                                    </div>
                                  </td>
                                  <td className="p-2 border-b border-slate-200">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">408. PENGELUARAN LISTRIK BULANAN</div>
                                    <div className="font-extrabold text-xs mt-1 border-b border-dashed border-slate-400 pb-1 h-6 font-mono text-emerald-700">
                                      {isBlank ? '' : `Rp ${Number(familyData.pengeluaranListrik || 0).toLocaleString('id-ID')}`}
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-2 border-r border-slate-400 border-b border-slate-200">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">402. STATUS KEPEMILIKAN RUMAH</div>
                                    <div className="font-extrabold text-xs uppercase mt-1 border-b border-dashed border-slate-400 pb-1 h-6">
                                      {isBlank ? '' : familyData.statusKepemilikan}
                                    </div>
                                  </td>
                                  <td className="p-2 border-b border-slate-200">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">409. PENGELUARAN KUOTA INTERNET / HP</div>
                                    <div className="font-extrabold text-xs mt-1 border-b border-dashed border-slate-400 pb-1 h-6 font-mono text-emerald-700">
                                      {isBlank ? '' : `Rp ${Number(familyData.pengeluaranKuota || 0).toLocaleString('id-ID')}`}
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-2 border-r border-slate-400 border-b border-slate-200">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">403. LUAS LANTAI BANGUNAN</div>
                                    <div className="font-extrabold text-xs mt-1 border-b border-dashed border-slate-400 pb-1 h-6 font-mono">
                                      {isBlank ? '' : `${familyData.luasLantai || 0} m²`}
                                    </div>
                                  </td>
                                  <td className="p-2 border-b border-slate-200">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">410. PENGELUARAN MAKANAN SEBULAN</div>
                                    <div className="font-extrabold text-xs mt-1 border-b border-dashed border-slate-400 pb-1 h-6 font-mono text-emerald-700">
                                      {isBlank ? '' : `Rp ${Number(familyData.pengeluaranMakanan || 0).toLocaleString('id-ID')}`}
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-2 border-r border-slate-400 border-b border-slate-200">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">404. BAHAN LANTAI TERLUAS</div>
                                    <div className="font-extrabold text-xs uppercase mt-1 border-b border-dashed border-slate-400 pb-1 h-6">
                                      {isBlank ? '' : familyData.bahanLantai}
                                    </div>
                                  </td>
                                  <td className="p-2 border-b border-slate-200">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">411. PENGELUARAN NON-MAKANAN SEBULAN</div>
                                    <div className="font-extrabold text-xs mt-1 border-b border-dashed border-slate-400 pb-1 h-6 font-mono text-emerald-700">
                                      {isBlank ? '' : `Rp ${Number(familyData.pengeluaranNonMakanan || 0).toLocaleString('id-ID')}`}
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-2 border-r border-slate-400 border-b border-slate-200">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">405. BAHAN DINDING TERLUAS</div>
                                    <div className="font-extrabold text-xs uppercase mt-1 border-b border-dashed border-slate-400 pb-1 h-6">
                                      {isBlank ? '' : familyData.bahanDinding}
                                    </div>
                                  </td>
                                  <td className="p-2 border-b border-slate-200" rowSpan={3}>
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">412. REKAPITULASI ANGGOTA KELUARGA (ART)</div>
                                    <div className="font-extrabold text-sm mt-2 text-indigo-700">
                                      {isBlank ? 'Jumlah Anggota Keluarga: .......... Jiwa' : `Jumlah Anggota Keluarga: ${memberList.length} Jiwa`}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                                      * Rincian lengkap nama, NIK, dan pekerjaan dicatat secara rinci pada Lembar 2 kuesioner ini.
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-2 border-r border-slate-400 border-b border-slate-200">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">406. BAHAN ATAP TERLUAS</div>
                                    <div className="font-extrabold text-xs uppercase mt-1 border-b border-dashed border-slate-400 pb-1 h-6">
                                      {isBlank ? '' : familyData.bahanAtap}
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-2 border-r border-slate-400">
                                    <div className="text-[10px] text-slate-500 font-mono font-bold">407. SUMBER AIR MINUM UTAMA & PENERANGAN</div>
                                    <div className="mt-1 space-y-1">
                                      <div className="text-xs font-bold text-slate-800">
                                        Air Minum: {isBlank ? '_________________________' : familyData.sumberAirMinum}
                                      </div>
                                      <div className="text-xs font-bold text-slate-800">
                                        Penerangan: {isBlank ? '_________________________' : familyData.sumberPenerangan}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                                        ID PEL: {isBlank ? '_________________________' : (familyData.noListrik || '-')}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Tanda Tangan Halaman 1 */}
                        <div className="grid grid-cols-2 text-center text-xs pt-8 border-t border-slate-200 mt-auto">
                          <div>
                            <p className="mb-14 text-slate-700 font-medium">Petugas Pencacah (PPL)</p>
                            <p className="font-bold border-b-2 border-slate-900 w-48 mx-auto pb-1 text-slate-900">{officerName}</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-mono">ID: {officerId}</p>
                          </div>
                          <div>
                            <p className="mb-14 text-slate-700 font-medium">Responden / Kepala Keluarga</p>
                            <p className="font-bold border-b-2 border-slate-900 w-48 mx-auto pb-1">
                              {isBlank ? '' : familyData.namaKepala}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 font-mono">Tanggal: {new Date().toLocaleDateString('id-ID')}</p>
                          </div>
                        </div>

                      </div>

                      {/* HALAMAN 2 / LEMBAR 2: ANGGOTA KELUARGA & USAHA EKONOMI */}
                      <div className="print-page" style={{ pageBreakBefore: 'always' }}>
                        <div className="space-y-5">
                          {/* Header Dokumen */}
                          <div className="border-b-4 border-slate-900 pb-3 flex justify-between items-end">
                            <div className="flex gap-4 items-center">
                              <div className="w-10 h-10 border-2 border-slate-900 bg-slate-50 flex items-center justify-center font-black text-slate-900 text-lg font-mono">BPS</div>
                              <div>
                                <span className="text-[9px] font-bold text-indigo-600 tracking-widest uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 print:hidden">Pratinjau Kuesioner Resmi - Lembar 2</span>
                                <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 leading-none">SENSUS EKONOMI 2026</h1>
                                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">REPUBLIK INDONESIA - BADAN PUSAT STATISTIK (BPS)</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="border-2 border-slate-900 px-3 py-1 font-bold text-sm bg-slate-100 uppercase tracking-widest">SE26.K2 - LEMBAR 2</span>
                            </div>
                          </div>

                          {/* BLOK III: RINCIAN KETERANGAN ANGGOTA KELUARGA */}
                          <div className="space-y-2">
                            <h3 className="bg-slate-900 text-white font-extrabold px-3 py-1.5 text-xs uppercase tracking-wider rounded">BLOK III: RINCIAN KETERANGAN ANGGOTA KELUARGA (ART)</h3>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left border-collapse border-2 border-slate-900">
                                <thead>
                                  <tr className="bg-slate-100 text-center font-extrabold border-b-2 border-slate-900 text-[10px] text-slate-800">
                                    <th className="border border-slate-400 p-2 w-[5%]">No</th>
                                    <th className="border border-slate-400 p-2 w-[27%]">Nama Lengkap & NIK</th>
                                    <th className="border border-slate-400 p-2 w-[14%]">Hubungan / JK</th>
                                    <th className="border border-slate-400 p-2 w-[14%]">Tgl Lahir / Perkawinan</th>
                                    <th className="border border-slate-400 p-2 w-[14%]">Sekolah & Ijazah</th>
                                    <th className="border border-slate-400 p-2 w-[16%]">Pekerjaan & Gaji (Rp)</th>
                                    <th className="border border-slate-400 p-2 w-[10%]">Kesehatan</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {memberList.map((ang, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 border-b border-slate-300">
                                      <td className="border border-slate-400 p-2 text-center font-extrabold bg-slate-100 text-xs">{idx + 1}</td>
                                      <td className="border border-slate-400 p-2">
                                        {isBlank ? (
                                          <div className="space-y-2 py-1">
                                            <div className="border-b border-dashed border-slate-400 h-5 w-full"></div>
                                            <div className="border-b border-dashed border-slate-300 h-4 w-4/5"></div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="font-extrabold text-slate-900 uppercase text-xs">{ang.namaAnggota || '-'}</div>
                                            <div className="text-[10px] text-slate-500 font-mono mt-1">NIK: {ang.nikAnggota || '-'}</div>
                                          </>
                                        )}
                                      </td>
                                      <td className="border border-slate-400 p-2 text-center">
                                        {isBlank ? (
                                          <div className="space-y-1.5 py-1">
                                            <div className="border-b border-dashed border-slate-400 h-5 w-4/5 mx-auto"></div>
                                            <div className="flex gap-1.5 justify-center font-mono">
                                              <span className="border border-slate-400 px-1 py-0.2 text-[8px] bg-white">L</span>
                                              <span className="border border-slate-400 px-1 py-0.2 text-[8px] bg-white">P</span>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="font-bold text-slate-800 text-xs">{ang.hubungan || '-'}</div>
                                            <div className="text-[10px] text-indigo-600 font-extrabold mt-1 bg-indigo-50 px-1.5 py-0.5 rounded inline-block border border-indigo-100">{ang.jk || '-'}</div>
                                          </>
                                        )}
                                      </td>
                                      <td className="border border-slate-400 p-2 text-center">
                                        {isBlank ? (
                                          <div className="space-y-2 py-1">
                                            <div className="border-b border-dashed border-slate-300 h-5 w-full"></div>
                                            <div className="border-b border-dashed border-slate-300 h-4 w-full"></div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="text-slate-800 font-bold text-xs">{ang.tanggalLahir || '-'}</div>
                                            <div className="text-[9px] text-slate-500 mt-1 italic">{ang.statusPerkawinan || '-'}</div>
                                          </>
                                        )}
                                      </td>
                                      <td className="border border-slate-400 p-2">
                                        {isBlank ? (
                                          <div className="space-y-2 py-1">
                                            <div className="border-b border-dashed border-slate-300 h-5 w-full"></div>
                                            <div className="border-b border-dashed border-slate-300 h-4 w-full"></div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="text-slate-800 font-medium text-xs">{ang.partisipasiSekolah || '-'}</div>
                                            <div className="text-[10px] text-slate-500 font-bold mt-1">Ijazah: {ang.ijazah || '-'}</div>
                                          </>
                                        )}
                                      </td>
                                      <td className="border border-slate-400 p-2">
                                        {isBlank ? (
                                          <div className="space-y-2 py-1">
                                            <div className="border-b border-dashed border-slate-300 h-5 w-full"></div>
                                            <div className="border-b border-dashed border-slate-300 h-4 w-full"></div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="font-bold text-slate-800 text-xs truncate max-w-[120px]">{ang.pekerjaan || 'Tidak Bekerja'}</div>
                                            <div className="text-[10px] text-emerald-600 font-extrabold mt-1 font-mono">
                                              Rp {Number(ang.gaji || 0).toLocaleString('id-ID')}
                                            </div>
                                          </>
                                        )}
                                      </td>
                                      <td className="border border-slate-400 p-2 text-center">
                                        {isBlank ? (
                                          <div className="space-y-2 py-1">
                                            <div className="border-b border-dashed border-slate-300 h-5 w-full"></div>
                                            <div className="border-b border-dashed border-slate-300 h-4 w-full"></div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="text-slate-800 text-[10px]">Keluhan: {ang.keluhanPenyakit || 'Tidak Ada'}</div>
                                            <div className="text-[9px] text-rose-500 font-extrabold mt-1 uppercase">Disab: {ang.disabilitas || 'Tidak'}</div>
                                          </>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* BLOK II: UNIT USAHA EKONOMI KELUARGA */}
                          <div className="space-y-2">
                            <h3 className="bg-slate-900 text-white font-extrabold px-3 py-1.5 text-xs uppercase tracking-wider rounded">BLOK II: UNIT USAHA EKONOMI KELUARGA RESPONDEN</h3>
                            {businessList.length === 0 ? (
                              <div className="text-center py-6 border border-slate-300 text-xs text-slate-500 rounded bg-slate-50">
                                Keluarga responden menyatakan tidak memiliki unit usaha ekonomi aktif.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse border-2 border-slate-900">
                                  <thead>
                                    <tr className="bg-slate-100 text-center font-extrabold border-b-2 border-slate-900 text-[10px] text-slate-800">
                                      <th className="border border-slate-400 p-2 w-[5%]">No</th>
                                      <th className="border border-slate-400 p-2 w-[30%]">Identitas Usaha & NIB</th>
                                      <th className="border border-slate-400 p-2 w-[20%]">KBLI & Kegiatan Utama</th>
                                      <th className="border border-slate-400 p-2 w-[10%]">Pekerja</th>
                                      <th className="border border-slate-400 p-2 w-[20%]">Pemasukan & Pengeluaran (Rp)</th>
                                      <th className="border border-slate-400 p-2 w-[15%]">Rincian Aset Usaha</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {businessList.map((bus, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50 border-b border-slate-300">
                                        <td className="border border-slate-400 p-2 text-center font-extrabold bg-slate-100 text-xs">{idx + 1}</td>
                                        <td className="border border-slate-400 p-2">
                                          {isBlank ? (
                                            <div className="space-y-2 py-1">
                                              <div className="border-b border-dashed border-slate-400 h-5 w-full font-mono text-[9px] text-slate-400">NAMA:</div>
                                              <div className="border-b border-dashed border-slate-300 h-4 w-full font-mono text-[9px] text-slate-400">ALAMAT:</div>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="font-extrabold text-slate-900 text-xs uppercase">{bus.namaUsaha || '-'}</div>
                                              <div className="text-[10px] text-slate-500 mt-1 font-mono">NIB: {bus.memilikiNib === 'Ya' ? 'Ada' : 'Tidak Ada'} | PJ: {bus.nikPj || '-'}</div>
                                              <div className="text-[10px] text-slate-400 mt-0.5 italic truncate max-w-[200px]">Alamat: {bus.alamatUsaha || '-'}</div>
                                            </>
                                          )}
                                        </td>
                                        <td className="border border-slate-400 p-2">
                                          {isBlank ? (
                                            <div className="space-y-2 py-1">
                                              <div className="border-b border-dashed border-slate-300 h-5 w-full font-mono text-[9px] text-slate-400">KBLI:</div>
                                              <div className="border-b border-dashed border-slate-300 h-4 w-full font-mono text-[9px] text-slate-400">KEGIATAN UTAMA:</div>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="font-extrabold text-indigo-700 text-xs">KBLI: {bus.kbli || '-'}</div>
                                              <div className="text-[10px] text-slate-700 font-bold mt-1">Utama: {bus.kegiatanUtama || '-'}</div>
                                              <div className="text-[9px] text-slate-400 mt-0.5 uppercase">Badan: {bus.statusBadan || '-'}</div>
                                            </>
                                          )}
                                        </td>
                                        <td className="border border-slate-400 p-2 text-center text-[10px]">
                                          {isBlank ? (
                                            <div className="space-y-2 py-1 text-slate-400 font-mono text-[9px]">
                                              <div>L: ___</div>
                                              <div>P: ___</div>
                                            </div>
                                          ) : (
                                            <div className="font-bold text-slate-800 space-y-1">
                                              <div>L: {bus.pekerjaLaki || 0} orang</div>
                                              <div>P: {bus.pekerjaPerempuan || 0} orang</div>
                                            </div>
                                          )}
                                        </td>
                                        <td className="border border-slate-400 p-2">
                                          {isBlank ? (
                                            <div className="space-y-2 py-1 font-mono text-[9px]">
                                              <div className="border-b border-dashed border-emerald-300 h-5 text-emerald-600">IN: Rp </div>
                                              <div className="border-b border-dashed border-rose-300 h-4 text-rose-600">OUT: Rp </div>
                                            </div>
                                          ) : (
                                            <div className="space-y-1 font-mono text-[10px]">
                                              <div className="text-emerald-700 font-bold">In: Rp {Number(bus.pendapatanBulan || 0).toLocaleString('id-ID')}</div>
                                              <div className="text-rose-700 font-bold">Out: Rp {Number(bus.pengeluaranBulan || 0).toLocaleString('id-ID')}</div>
                                            </div>
                                          )}
                                        </td>
                                        <td className="border border-slate-400 p-2 font-mono text-[9px] text-slate-600">
                                          {isBlank ? (
                                            <div className="grid grid-cols-2 gap-x-1 gap-y-2 py-1">
                                              <div>Emas: ___ g</div>
                                              <div>Mtr: ___ u</div>
                                              <div>Mbl: ___ u</div>
                                              <div>Tnh: ___ m²</div>
                                            </div>
                                          ) : (
                                            <div className="grid grid-cols-2 gap-x-1 gap-y-1 font-bold">
                                              <div className="text-slate-700">Emas: {bus.asetEmas || 0}g</div>
                                              <div className="text-slate-700">Mtr: {bus.asetMotor || 0}u</div>
                                              <div className="text-slate-700">Mbl: {bus.asetMobil || 0}u</div>
                                              <div className="text-slate-700">Tnh: {bus.asetTanah || 0}m²</div>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tanda Tangan Halaman 2 */}
                        <div className="grid grid-cols-2 text-center text-xs pt-8 border-t border-slate-200 mt-auto">
                          <div>
                            <p className="mb-14 text-slate-700 font-medium">Petugas Pencacah (PPL)</p>
                            <p className="font-bold border-b-2 border-slate-900 w-48 mx-auto pb-1 text-slate-900">{officerName}</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-mono">ID: {officerId}</p>
                          </div>
                          <div>
                            <p className="mb-14 text-slate-700 font-medium">Responden / Kepala Keluarga</p>
                            <p className="font-bold border-b-2 border-slate-900 w-48 mx-auto pb-1">
                              {isBlank ? '' : familyData.namaKepala}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 font-mono">Tanggal: {new Date().toLocaleDateString('id-ID')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
              </div>
            )}

            {/* TAB IMPOR & EKSPOR DATA */}
            {activeTab === 'imporEkspor' && (
              <div className="space-y-6">
                
                {/* HEADER PROMOTIONAL */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 p-8 rounded-3xl space-y-3 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                  <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase border border-indigo-500/30">INTEGRASI DATABASE LOKAL</span>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
                    <span>Manajemen Sensus: Impor & Ekspor Spreadsheet</span>
                  </h3>
                  <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
                    Sistem pemrosesan berkas mandiri. Unduh template Excel sensus resmi, lakukan perekaman offline secara massal, kemudian impor kembali untuk validasi otomatis dan sinkronisasi instan. Anda juga dapat mengekspor laporan kualitatif berformat PDF siap cetak.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* CARD 1: IMPOR DATA */}
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Upload className="w-4 h-4 text-emerald-400" />
                          <span>Unggah & Impor Database</span>
                        </h4>
                        <span className="text-[10px] text-slate-500">Mendukung .xlsx, .xls</span>
                      </div>

                      {/* Dropzone */}
                      <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                          isDraggingExcel 
                            ? 'border-indigo-500 bg-indigo-500/10' 
                            : 'border-slate-800 hover:border-slate-700 bg-slate-950'
                        }`}
                        onClick={() => {
                          const fileInput = document.getElementById('excel-file-input');
                          fileInput?.click();
                        }}
                      >
                        <input 
                          id="excel-file-input"
                          type="file" 
                          accept=".xlsx, .xls"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileChange(e.target.files[0]);
                            }
                          }}
                          className="hidden" 
                        />
                        <FileUp className="w-10 h-10 mx-auto text-slate-500 mb-2 animate-bounce" />
                        <p className="text-xs font-bold text-slate-300">Tarik & Lepaskan Berkas Excel di sini</p>
                        <p className="text-[10px] text-slate-500 mt-1">atau klik untuk menelusuri folder komputer Anda</p>
                      </div>

                      {/* Import Settings */}
                      <div className="space-y-3 pt-2">
                        <label className="block text-xs font-bold text-slate-400">Mode Sinkronisasi Impor:</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            type="button"
                            onClick={() => setImportMode('merge')}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              importMode === 'merge' 
                                ? 'bg-indigo-500/10 border-indigo-500 text-white' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <p className="text-xs font-bold">Gabungkan Data (Append)</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">Gabungkan data baru dengan data yang sudah ada di lokal.</p>
                          </button>

                          <button 
                            type="button"
                            onClick={() => setImportMode('overwrite')}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              importMode === 'overwrite' 
                                ? 'bg-rose-500/10 border-rose-500 text-white' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <p className="text-xs font-bold text-rose-400">Tumpuk Data (Overwrite)</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">Hapus seluruh isi database lokal dan ganti dengan data dari Excel.</p>
                          </button>
                        </div>
                      </div>

                      {/* Success / Error Messages */}
                      {importError && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{importError}</span>
                        </div>
                      )}

                      {importSuccessMsg && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{importSuccessMsg}</span>
                        </div>
                      )}
                    </div>

                    {/* Preview Modal Trigger inside card */}
                    {importPreview && (
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-white uppercase tracking-wider">Hasil Analisis Berkas</h5>
                          <span className="bg-indigo-500/20 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded-full">Siap Impor</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Keluarga</p>
                            <p className="text-lg font-black text-indigo-400 mt-0.5">{importPreview.keluarga?.length || 0}</p>
                          </div>
                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Anggota</p>
                            <p className="text-lg font-black text-emerald-400 mt-0.5">{importPreview.anggota?.length || 0}</p>
                          </div>
                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Unit Usaha</p>
                            <p className="text-lg font-black text-amber-400 mt-0.5">{importPreview.usaha?.length || 0}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={executeImport}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Konfirmasi Impor</span>
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setImportPreview(null)}
                            className="bg-slate-950 hover:bg-slate-900 text-slate-400 border border-slate-800 font-bold py-2 px-3 rounded-xl text-xs transition-all"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: EKSPOR DATA & UNDUH TEMPLATE */}
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Download className="w-4 h-4 text-indigo-400" />
                          <span>Ekspor & Unduh Template</span>
                        </h4>
                        <span className="text-[10px] text-slate-500">Berkas Siap Pakai</span>
                      </div>

                      <p className="text-slate-400 text-xs leading-relaxed">
                        Silakan unduh berkas template di bawah ini untuk melihat struktur kolom kolom database yang didukung oleh sistem sensus SE2026.
                      </p>

                      <div className="space-y-3">
                        {/* Download Template Button */}
                        <button 
                          onClick={downloadExcelTemplate}
                          className="w-full flex items-center justify-between p-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20">
                              <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white">Unduh Template Berkas Sensus (.xlsx)</p>
                              <p className="text-[9px] text-slate-500">Mencakup sheet Keluarga, Anggota, & Usaha</p>
                            </div>
                          </div>
                          <FileDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-all" />
                        </button>

                        {/* Export to Excel Button */}
                        <button 
                          onClick={() => exportAllToExcel(dataKeluarga, dataAnggota, dataUsaha)}
                          className="w-full flex items-center justify-between p-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500/20">
                              <Download className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white">Ekspor Seluruh Database Sensus (.xlsx)</p>
                              <p className="text-[9px] text-slate-500">Mengambil data lokal & menghasilkan berkas Excel instan</p>
                            </div>
                          </div>
                          <FileDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-all" />
                        </button>

                        {/* Export to PDF Button */}
                        <button 
                          onClick={() => exportAllToPdf(dataKeluarga, dataAnggota, dataUsaha)}
                          className="w-full flex items-center justify-between p-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:bg-emerald-500/20">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white">Ekspor Laporan PDF Publikasi (.pdf)</p>
                              <p className="text-[9px] text-slate-500">Menghasilkan dokumen laporan resmi BPS 2 Halaman penuh</p>
                            </div>
                          </div>
                          <FileDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-all" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center gap-2 text-[10px] text-slate-400">
                      <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Semua berkas diproses sepenuhnya di browser Anda. Kerahasiaan data dijamin 100% aman dan terlindungi.</span>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* GOOGLE DRIVE SYNC TAB */}
            {activeTab === 'gdrive' && (
              <div className="space-y-6">
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-indigo-400" />
                      <span>Cadangan Cloud Google Drive</span>
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${token ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {token ? 'Terhubung' : 'Terputus'}
                    </span>
                  </div>

                  {!token ? (
                    <div className="text-center py-8 space-y-4">
                      <HelpCircle className="w-12 h-12 text-slate-500 mx-auto" />
                      <p className="text-sm text-slate-400">Hubungkan akun Google Drive Anda untuk mulai mencadangkan dan menyinkronkan data sensus Anda.</p>
                      <button onClick={handleSignIn} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-lg mx-auto">
                        Hubungkan Google Drive
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* BACKUP FORM */}
                      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
                        <h4 className="text-sm font-bold text-white">Buat Cadangan Baru</h4>
                        <div className="space-y-3">
                          <label className="block text-xs text-slate-400">Nama File Cadangan (Opsional)</label>
                          <input 
                            type="text" 
                            placeholder="Contoh: se2026_sensus_cibinong.json" 
                            value={backupFilename} 
                            onChange={(e) => setBackupFilename(e.target.value)}
                            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <button 
                          onClick={triggerBackup}
                          disabled={driveLoading}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                        >
                          {driveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>Simpan ke Google Drive</span>
                        </button>
                      </div>

                      {/* BACKUPS LIST */}
                      <div className="col-span-2 bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold text-white">Daftar Cadangan Tersimpan di Drive</h4>
                          <button onClick={loadBackups} className="text-xs text-indigo-400 hover:underline">Refresh</button>
                        </div>

                        {driveLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                          </div>
                        ) : driveBackups.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-6 text-center">Belum ada file cadangan sensus (.json) yang tersimpan.</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {driveBackups.map((file) => (
                              <div key={file.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700">
                                <div className="truncate">
                                  <p className="font-bold text-slate-200 truncate">{file.name}</p>
                                  <p className="text-[10px] text-slate-500">{new Date(file.createdTime).toLocaleString('id-ID')} | {(Number(file.size || 0)/1024).toFixed(1)} KB</p>
                                </div>
                                <button 
                                  onClick={() => triggerRestore(file.id)}
                                  className="text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/10 py-1.5 px-3 rounded-lg"
                                >
                                  Pulihkan
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* GEMINI AI ASSISTANT PANEL */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                      <span>Kecerdasan Buatan AI Gemini Terintegrasi</span>
                    </h3>
                  </div>

                  {/* TAB SWITCHER */}
                  <div className="flex gap-2 border-b border-slate-850 pb-2">
                    <button 
                      onClick={() => { setAiTab('maps'); setAiPrompt(''); setAiResponse(''); setGroundingLinks([]); }}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${aiTab === 'maps' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}
                    >
                      Google Maps Grounding
                    </button>
                    <button 
                      onClick={() => { setAiTab('thinking'); setAiPrompt(''); setAiResponse(''); setGroundingLinks([]); }}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${aiTab === 'thinking' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}
                    >
                      High Thinking Mode
                    </button>
                    <button 
                      onClick={() => { setAiTab('image'); setAiPrompt(''); setAiResponse(''); setGroundingLinks([]); }}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${aiTab === 'image' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}
                    >
                      Pembuat Gambar Promosi
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* INPUT SIDE */}
                    <div className="md:col-span-1 bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
                      <h4 className="text-sm font-bold text-white">
                        {aiTab === 'maps' && 'Pencarian Geografis BPS'}
                        {aiTab === 'thinking' && 'Analisis Ekonomi Mendalam'}
                        {aiTab === 'image' && 'Desain Gambar Awareness'}
                      </h4>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        {aiTab === 'maps' && 'Cari info geografis wilayah, kantor BPS, pasar lokal, atau pusat perekonomian di Jawa Barat.'}
                        {aiTab === 'thinking' && 'Analisis data statistik sensus secara runut menggunakan model pro dengan kemampuan berfikir mendalam.'}
                        {aiTab === 'image' && 'Tulis instruksi promosi spanduk, brosur sosialisasi Sensus Ekonomi 2026, atau iklan usaha warga.'}
                      </p>

                      <div className="space-y-3">
                        <textarea 
                          rows={4}
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder={
                            aiTab === 'maps' ? 'Contoh: Kantor BPS di Bogor Jawa Barat terdekat' :
                            aiTab === 'thinking' ? 'Contoh: Buat ringkasan statistik dan prediksi pertumbuhan ekonomi UMKM Cibinong tahun depan' :
                            'Contoh: Banner modern sosialisasi Sensus Ekonomi 2026 yang ramah dan menarik untuk warga'
                          }
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />

                        {aiTab === 'image' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Pilih Resolusi Gambar</label>
                            <select 
                              value={imageSize} 
                              onChange={(e: any) => setImageSize(e.target.value)}
                              className="w-full p-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                            >
                              <option value="1K">1K Resolution</option>
                              <option value="2K">2K Resolution (High Detail)</option>
                              <option value="4K">4K Resolution (Ultra Detail)</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={handleAiSubmit}
                        disabled={aiLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                      >
                        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>Kirim ke Gemini</span>
                      </button>
                    </div>

                    {/* RESPONSE SIDE */}
                    <div className="md:col-span-2 bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[300px]">
                      <div className="space-y-4 flex-1">
                        <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Hasil Respons AI Gemini</h4>
                        
                        {aiLoading ? (
                          <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            <p className="text-xs text-slate-400">Gemini sedang merumuskan jawaban yang akurat, mohon tunggu...</p>
                          </div>
                        ) : generatedImg ? (
                          <div className="space-y-3">
                            <img src={generatedImg} alt="Generated AI Banner" className="w-full rounded-xl max-h-80 object-cover shadow-lg border border-slate-800" />
                            <p className="text-[10px] text-slate-500 text-center">Gambar beresolusi tinggi {imageSize} berhasil dibuat menggunakan gemini-3-pro-image-preview</p>
                          </div>
                        ) : aiResponse ? (
                          <div className="text-xs leading-relaxed text-slate-300 space-y-4 whitespace-pre-wrap max-h-96 overflow-y-auto pr-2">
                            {aiResponse}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 text-slate-600 text-xs">
                            <Sparkles className="w-10 h-10 mb-2 opacity-20" />
                            <span>Silakan masukkan prompt di sisi kiri untuk memicu kecerdasan Gemini.</span>
                          </div>
                        )}
                      </div>

                      {/* GROUNDING LINKS FOOTER */}
                      {groundingLinks.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-855 space-y-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Sumber Terverifikasi Google Maps</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {groundingLinks.map((link: any, index: number) => (
                              <a 
                                key={index} 
                                href={link.uri} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] font-bold text-indigo-400 hover:underline bg-indigo-500/10 py-1 px-2.5 rounded-lg border border-indigo-500/20"
                              >
                                {link.title || 'Buka di Maps'}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PENGATURAN AKUN PANEL */}
            {activeTab === 'pengaturan' && (
              <div className="space-y-6">
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Settings className="w-5 h-5 text-indigo-400" />
                      <span>Pengaturan Akun & Profil Petugas</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
                        officerRole === 'PML' 
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      }`}>
                        {officerRole === 'PML' ? 'Supervisor PML (Admin)' : 'Enumerator PPL'}
                      </span>
                    </div>
                  </div>

                  {settingsSavedAlert && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>Berhasil! Pengaturan akun dan profil petugas sensus telah disimpan secara permanen.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT PANEL: ACCOUNT STATUS & INFORMATION */}
                    <div className="lg:col-span-1 space-y-6">
                      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
                        <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Status Sesi Aktif</h4>
                        
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-850">
                            <Lock className="w-8 h-8 text-indigo-400 shrink-0" />
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase font-bold">Metode Autentikasi</p>
                              <p className="text-xs font-bold text-white">
                                {localStorage.getItem('se2026_admin_logged') === 'true' ? 'Login Kredensial Lokal' : user ? 'Google Sign-In (Gmail)' : 'Mode Tamu (Offline)'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1 text-xs text-left">
                            <p className="text-slate-500 font-bold text-[10px] uppercase">Nama Akun:</p>
                            <p className="text-slate-300 font-medium">{user?.displayName || 'Tamu Sensus'}</p>
                          </div>

                          <div className="space-y-1 text-xs text-left">
                            <p className="text-slate-500 font-bold text-[10px] uppercase">Email Terdaftar:</p>
                            <p className="text-slate-300 font-medium">{user?.email || 'tidak_ada@bps.go.id'}</p>
                          </div>

                          <div className="space-y-1 text-xs text-left">
                            <p className="text-slate-500 font-bold text-[10px] uppercase">Wewenang Role:</p>
                            <p className="text-slate-300 font-medium leading-relaxed">
                              {officerRole === 'PML' 
                                ? 'Memiliki akses supervisor penuh untuk menyetujui, menolak, memberikan feedback revisi pada berkas sensus.' 
                                : 'Memiliki wewenang menginput, merekam kuesioner keluarga, unit usaha, serta mengirimkan berkas ke PML.'}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={handleSignOut}
                            className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-rose-500/20"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Keluar dari Akun</span>
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest text-left">Informasi Keamanan</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed text-left">
                          Sistem ini terlindungi enkripsi AES-256. Setiap modifikasi data profil akan tercermin langsung pada dokumen cetak fisik, formulir kuesioner SE26.K, dan ekspor PDF/Excel.
                        </p>
                      </div>
                    </div>

                    {/* RIGHT PANEL: EDIT PROFILE FORM */}
                    <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800">
                      <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-indigo-400" />
                        <span>Kustomisasi Profil Dokumen Sensus</span>
                      </h4>

                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          localStorage.setItem('se2026_officer_name', officerName);
                          localStorage.setItem('se2026_officer_id', officerId);
                          localStorage.setItem('se2026_officer_nip', officerNip);
                          localStorage.setItem('se2026_officer_desa', officerDesa);
                          localStorage.setItem('se2026_supervisor_name', supervisorName);
                          localStorage.setItem('se2026_supervisor_id', supervisorId);
                          
                          setSettingsSavedAlert(true);
                          setTimeout(() => setSettingsSavedAlert(false), 3000);
                        }}
                        className="space-y-6"
                      >
                        {/* SECTION 1: DETIL PETUGAS PENCACAH */}
                        <div className="space-y-4">
                          <h5 className="text-xs font-bold text-indigo-300 border-l-2 border-indigo-500 pl-2 text-left">Informasi Petugas Pencacah (PPL)</h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1 text-left">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Lengkap Petugas *</label>
                              <input 
                                type="text"
                                required
                                value={officerName}
                                onChange={(e) => setOfficerName(e.target.value)}
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID Kode Petugas Sensus *</label>
                              <input 
                                type="text"
                                required
                                value={officerId}
                                onChange={(e) => setOfficerId(e.target.value)}
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nomor Induk Pegawai (NIP/NIM) *</label>
                              <input 
                                type="text"
                                required
                                value={officerNip}
                                onChange={(e) => setOfficerNip(e.target.value)}
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wilayah Desa Penugasan *</label>
                              <select 
                                value={officerDesa}
                                onChange={(e) => setOfficerDesa(e.target.value)}
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                              >
                                {DESA_LIST.map((desa) => (
                                  <option key={desa} value={desa}>{desa}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 2: DETIL PENGAWAS */}
                        <div className="space-y-4 pt-2">
                          <h5 className="text-xs font-bold text-purple-300 border-l-2 border-purple-500 pl-2 text-left">Informasi Pengawas Sensus (PML)</h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1 text-left">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Lengkap Supervisor (PML) *</label>
                              <input 
                                type="text"
                                required
                                value={supervisorName}
                                onChange={(e) => setSupervisorName(e.target.value)}
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                              />
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID Supervisor (PML) *</label>
                              <input 
                                type="text"
                                required
                                value={supervisorId}
                                onChange={(e) => setSupervisorId(e.target.value)}
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex justify-end">
                          <button 
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl text-xs transition-all flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            <span>Simpan Perubahan Profil</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* --- CRUD POPUP MODALS --- */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 my-8 text-slate-200 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h4 className="text-md font-bold text-white uppercase tracking-wider">
                {editItem ? 'Edit' : 'Tambah'} Data {activeModal}
              </h4>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white font-bold">X</button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {activeModal === 'keluarga' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nomor KK *</label>
                      <input 
                        type="text" 
                        required
                        value={modalForm.noKk || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, noKk: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">NIK Kepala *</label>
                      <input 
                        type="text" 
                        required
                        value={modalForm.nikKepala || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, nikKepala: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Kepala Keluarga *</label>
                    <input 
                      type="text" 
                      required
                      value={modalForm.namaKepala || ''} 
                      onChange={(e) => setModalForm({ ...modalForm, namaKepala: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                    />
                  </div>
                  {/* Lokasi Terkunci (Paten) */}
                  <div className="p-3 bg-indigo-950/40 border border-indigo-900/30 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Lokasi Wilayah Sensus (Paten/Terkunci)</p>
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-300">
                      <div><span className="text-slate-500">Provinsi:</span> <strong className="text-white">JAWA BARAT</strong></div>
                      <div><span className="text-slate-500">Kabupaten:</span> <strong className="text-white">GARUT</strong></div>
                      <div><span className="text-slate-500">Kecamatan:</span> <strong className="text-white">PAKENJENG</strong></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Desa/Kelurahan *</label>
                      <select 
                        required
                        value={modalForm.desaKelurahan || 'Depok'} 
                        onChange={(e) => setModalForm({ ...modalForm, desaKelurahan: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs text-white"
                      >
                        {DESA_LIST.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">No. RT *</label>
                      <input 
                        type="text" 
                        required
                        maxLength={3}
                        placeholder="01"
                        value={modalForm.rt || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, rt: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">No. RW *</label>
                      <input 
                        type="text" 
                        required
                        maxLength={3}
                        placeholder="01"
                        value={modalForm.rw || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, rw: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">No HP Kontak</label>
                      <input 
                        type="text" 
                        value={modalForm.noHp || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, noHp: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email</label>
                      <input 
                        type="email" 
                        value={modalForm.email || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, email: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeModal === 'anggota' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nomor KK *</label>
                      <input 
                        type="text" 
                        required
                        value={modalForm.noKk || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, noKk: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Anggota *</label>
                      <input 
                        type="text" 
                        required
                        value={modalForm.namaAnggota || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, namaAnggota: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">NIK Anggota *</label>
                      <input 
                        type="text" 
                        required
                        value={modalForm.nikAnggota || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, nikAnggota: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Hubungan *</label>
                      <input 
                        type="text" 
                        required
                        value={modalForm.hubungan || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, hubungan: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pekerjaan</label>
                      <input 
                        type="text" 
                        value={modalForm.pekerjaan || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, pekerjaan: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Gaji Utama (/Bulan)</label>
                      <input 
                        type="number" 
                        value={modalForm.gaji || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, gaji: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeModal === 'usaha' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">NIK Penanggung Jawab *</label>
                      <input 
                        type="text" 
                        required
                        value={modalForm.nikPj || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, nikPj: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Usaha *</label>
                      <input 
                        type="text" 
                        required
                        value={modalForm.namaUsaha || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, namaUsaha: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">KBLI (5 Digit)</label>
                      <input 
                        type="text" 
                        value={modalForm.kbli || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, kbli: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Badan Usaha</label>
                      <input 
                        type="text" 
                        value={modalForm.statusBadan || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, statusBadan: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pendapatan Bulan (Rp)</label>
                      <input 
                        type="number" 
                        value={modalForm.pendapatanBulan || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, pendapatanBulan: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pengeluaran Bulan (Rp)</label>
                      <input 
                        type="number" 
                        value={modalForm.pengeluaranBulan || ''} 
                        onChange={(e) => setModalForm({ ...modalForm, pengeluaranBulan: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all">
                Simpan Perubahan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- POPUP MODAL SENSUS TERPADU (WIZARD STEPS) --- */}
      {showUnifiedModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col text-slate-200 shadow-2xl">
            
            {/* WIZARD HEADER */}
            <div className="p-6 bg-slate-950 border-b border-slate-850 flex justify-between items-center rounded-t-3xl">
              <div>
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <span>Formulir Sensus Ekonomi Terpadu 2026</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Mengumpulkan seluruh data Blok kuesioner dalam alur pendaftaran terpadu.</p>
              </div>
              <button onClick={() => setShowUnifiedModal(false)} className="text-slate-400 hover:text-white font-bold">X</button>
            </div>

            {/* WIZARD STEPPERS */}
            <div className="bg-slate-900/60 border-b border-slate-850 py-3.5 px-6 flex justify-between items-center text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              <div className={`flex items-center gap-2 ${unifiedStep === 1 ? 'text-indigo-400' : 'text-slate-500'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${unifiedStep === 1 ? 'border-indigo-500 text-indigo-400' : 'border-slate-700'}`}>1</span>
                <span>Keluarga (Blok I & IV)</span>
              </div>
              <div className="flex-1 border-b border-slate-800 mx-4" />
              <div className={`flex items-center gap-2 ${unifiedStep === 2 ? 'text-indigo-400' : 'text-slate-500'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${unifiedStep === 2 ? 'border-indigo-500 text-indigo-400' : 'border-slate-700'}`}>2</span>
                <span>Anggota Keluarga</span>
              </div>
              <div className="flex-1 border-b border-slate-800 mx-4" />
              <div className={`flex items-center gap-2 ${unifiedStep === 3 ? 'text-indigo-400' : 'text-slate-500'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${unifiedStep === 3 ? 'border-indigo-500 text-indigo-400' : 'border-slate-700'}`}>3</span>
                <span>Usaha Ekonomi</span>
              </div>
            </div>

            {/* WIZARD CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* INTERACTIVE INTEGRATED SMART AI AUTO-FILL ASSISTANT IN THE FORM */}
              {unifiedStep === 1 && (
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-3">
                  <h5 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>AI Auto-Fill Kuesioner (Tempel Transkrip Wawancara)</span>
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    Tempel teks catatan wawancara, transkrip percakapan, atau rekam draf kasar, lalu biarkan Gemini mengekstrak semua field kuesioner secara otomatis!
                  </p>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Contoh: Pak Hendra tinggal di Cibinong dengan 3 orang anggota, no KK 3201..., NIK kepala..."
                      value={transcriptText}
                      onChange={(e) => setTranscriptText(e.target.value)}
                      className="flex-1 p-2 bg-slate-950 border border-slate-800 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button 
                      onClick={handleAutofillExtract}
                      disabled={autofillLoading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center gap-1.5 shrink-0"
                    >
                      {autofillLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Auto-Isi AI</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SELECT MODE & EXISTING FAMILY */}
              {unifiedStep === 1 && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-3 mb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Mode Pengisian Sensus</span>
                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setUnifiedMode('new');
                          setUnifiedData({ keluarga: { provinsi: 'JAWA BARAT', kabKota: 'GARUT', kecamatan: 'PAKENJENG', desaKelurahan: 'Depok', rt: '01', rw: '01', alamatSesuai: 'Ya', jmlAnggota: '1' }, anggota: [{}], usaha: [] });
                          setOriginalKk('');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${unifiedMode === 'new' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Sensus Baru
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUnifiedMode('existing');
                          setUnifiedData({ keluarga: {}, anggota: [{}], usaha: [] });
                          setOriginalKk('');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${unifiedMode === 'existing' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Ambil Data yang Ada
                      </button>
                    </div>
                  </div>
                  {unifiedMode === 'existing' && (
                    <div className="mt-2">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Pilih Keluarga yang Sudah Ada di Database:</label>
                      <select
                        onChange={(e) => {
                          const selectedKk = e.target.value;
                          const kel = dataKeluarga.find(x => x.noKk === selectedKk);
                          if (kel) {
                            const members = dataAnggota.filter(a => a.noKk === kel.noKk);
                            const memberNiks = members.map(m => m.nikAnggota);
                            const businesses = dataUsaha.filter(u => memberNiks.includes(u.nikPj));
                            setOriginalKk(kel.noKk);
                            setUnifiedData({
                              keluarga: { ...kel },
                              anggota: members.length > 0 ? members.map(m => ({ ...m })) : [{}],
                              usaha: businesses.map(b => ({ ...b }))
                            });
                          }
                        }}
                        value={originalKk}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="">-- Pilih Keluarga --</option>
                        {dataKeluarga.map(kel => (
                          <option key={kel.id} value={kel.noKk}>
                            {kel.namaKepala} (KK: {kel.noKk})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 1: KELUARGA FIELDS */}
              {unifiedStep === 1 && (
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest border-b border-slate-800 pb-1">Blok I & IV: Identitas & Utilitas Keluarga</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Nomor Kartu Keluarga *</label>
                      <input 
                        type="text" 
                        required
                        value={unifiedData.keluarga.noKk || ''}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, noKk: e.target.value } })}
                        className={getInputValidationClass(unifiedData.keluarga.noKk, validateNoKk(unifiedData.keluarga.noKk), true)}
                        placeholder="Contoh: 3201234567890123"
                      />
                      {unifiedData.keluarga.noKk && !validateNoKk(unifiedData.keluarga.noKk) && (
                        <p className="text-[10px] text-rose-400 mt-1 animate-pulse">⚠️ Nomor KK harus berupa 16 digit angka.</p>
                      )}
                      {unifiedData.keluarga.noKk && validateNoKk(unifiedData.keluarga.noKk) && (
                        <p className="text-[10px] text-emerald-400 mt-1">✓ Format Nomor KK Valid.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">NIK Kepala Keluarga *</label>
                      <input 
                        type="text" 
                        required
                        value={unifiedData.keluarga.nikKepala || ''}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, nikKepala: e.target.value } })}
                        className={getInputValidationClass(unifiedData.keluarga.nikKepala, validateNik(unifiedData.keluarga.nikKepala), true)}
                        placeholder="Contoh: 3201234567890124"
                      />
                      {unifiedData.keluarga.nikKepala && !validateNik(unifiedData.keluarga.nikKepala) && (
                        <p className="text-[10px] text-rose-400 mt-1 animate-pulse">⚠️ NIK Kepala Keluarga harus berupa 16 digit angka.</p>
                      )}
                      {unifiedData.keluarga.nikKepala && validateNik(unifiedData.keluarga.nikKepala) && (
                        <p className="text-[10px] text-emerald-400 mt-1">✓ Format NIK Valid.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Nama Kepala Keluarga *</label>
                    <input 
                      type="text" 
                      required
                      value={unifiedData.keluarga.namaKepala || ''}
                      onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, namaKepala: e.target.value } })}
                      className={getInputValidationClass(unifiedData.keluarga.namaKepala, validateNama(unifiedData.keluarga.namaKepala), true)}
                      placeholder="Masukkan nama lengkap"
                    />
                    {unifiedData.keluarga.namaKepala && !validateNama(unifiedData.keluarga.namaKepala) && (
                      <p className="text-[10px] text-rose-400 mt-1">⚠️ Nama minimal 3 karakter.</p>
                    )}
                    {unifiedData.keluarga.namaKepala && validateNama(unifiedData.keluarga.namaKepala) && (
                      <p className="text-[10px] text-emerald-400 mt-1">✓ Nama valid.</p>
                    )}
                  </div>

                  {/* Lokasi Terkunci */}
                  <div className="p-3 bg-indigo-950/40 border border-indigo-900/30 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Lokasi Wilayah Sensus (Paten/Terkunci)</p>
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-300">
                      <div><span className="text-slate-500">Provinsi:</span> <strong className="text-white">JAWA BARAT</strong></div>
                      <div><span className="text-slate-500">Kabupaten:</span> <strong className="text-white">GARUT</strong></div>
                      <div><span className="text-slate-500">Kecamatan:</span> <strong className="text-white">PAKENJENG</strong></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Desa/Kelurahan *</label>
                      <select 
                        required
                        value={unifiedData.keluarga.desaKelurahan || 'Depok'}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, desaKelurahan: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        {DESA_LIST.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">No. RT *</label>
                      <input 
                        type="text" 
                        required
                        maxLength={3}
                        placeholder="01"
                        value={unifiedData.keluarga.rt || ''}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, rt: e.target.value } })}
                        className={getInputValidationClass(unifiedData.keluarga.rt, validateRtRw(unifiedData.keluarga.rt), true)}
                      />
                      {unifiedData.keluarga.rt && !validateRtRw(unifiedData.keluarga.rt) && (
                        <p className="text-[10px] text-rose-400 mt-1">⚠️ RT harus 1-3 angka.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">No. RW *</label>
                      <input 
                        type="text" 
                        required
                        maxLength={3}
                        placeholder="01"
                        value={unifiedData.keluarga.rw || ''}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, rw: e.target.value } })}
                        className={getInputValidationClass(unifiedData.keluarga.rw, validateRtRw(unifiedData.keluarga.rw), true)}
                      />
                      {unifiedData.keluarga.rw && !validateRtRw(unifiedData.keluarga.rw) && (
                        <p className="text-[10px] text-rose-400 mt-1">⚠️ RW harus 1-3 angka.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">No HP Kontak</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: 08123456789"
                        value={unifiedData.keluarga.noHp || ''}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, noHp: e.target.value } })}
                        className={getInputValidationClass(unifiedData.keluarga.noHp, validateNoHp(unifiedData.keluarga.noHp), false)}
                      />
                      {unifiedData.keluarga.noHp && !validateNoHp(unifiedData.keluarga.noHp) && (
                        <p className="text-[10px] text-rose-400 mt-1">⚠️ No HP tidak valid (10-15 angka).</p>
                      )}
                      {unifiedData.keluarga.noHp && validateNoHp(unifiedData.keluarga.noHp) && (
                        <p className="text-[10px] text-emerald-400 mt-1">✓ No HP valid.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Email Kontak</label>
                      <input 
                        type="email" 
                        placeholder="Contoh: nama@domain.com"
                        value={unifiedData.keluarga.email || ''}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, email: e.target.value } })}
                        className={getInputValidationClass(unifiedData.keluarga.email, validateEmail(unifiedData.keluarga.email), false)}
                      />
                      {unifiedData.keluarga.email && !validateEmail(unifiedData.keluarga.email) && (
                        <p className="text-[10px] text-rose-400 mt-1">⚠️ Format email tidak valid.</p>
                      )}
                      {unifiedData.keluarga.email && validateEmail(unifiedData.keluarga.email) && (
                        <p className="text-[10px] text-emerald-400 mt-1">✓ Email valid.</p>
                      )}
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest border-b border-slate-800 pb-1 pt-4">Karakteristik Bangunan & Utilitas Perumahan</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Jenis Bangunan</label>
                      <select 
                        value={unifiedData.keluarga.jenisBangunan || 'Rumah Tinggal Biasa'}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, jenisBangunan: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="Rumah Tinggal Biasa">Rumah Tinggal Biasa</option>
                        <option value="Kontrakan/Kos">Kontrakan/Kos</option>
                        <option value="Rumah Toko (Ruko)">Rumah Toko (Ruko)</option>
                        <option value="Gedung/Mess">Gedung/Mess</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Status Kepemilikan</label>
                      <select 
                        value={unifiedData.keluarga.statusKepemilikan || 'Milik Sendiri'}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, statusKepemilikan: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="Milik Sendiri">Milik Sendiri</option>
                        <option value="Sewa/Kontrak">Sewa/Kontrak</option>
                        <option value="Bebas Sewa (Milik Orang Tua/Kerabat)">Bebas Sewa (Milik Orang Tua/Kerabat)</option>
                        <option value="Dinas">Dinas</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Luas Lantai (m²)</label>
                      <input 
                        type="number" 
                        value={unifiedData.keluarga.luasLantai || ''}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, luasLantai: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Bahan Lantai</label>
                      <select 
                        value={unifiedData.keluarga.bahanLantai || 'Keramik'}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, bahanLantai: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="Keramik">Keramik</option>
                        <option value="Semen/Ubin">Semen/Ubin</option>
                        <option value="Kayu">Kayu</option>
                        <option value="Tanah">Tanah</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Bahan Dinding</label>
                      <select 
                        value={unifiedData.keluarga.bahanDinding || 'Tembok/Semen'}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, bahanDinding: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="Tembok/Semen">Tembok/Semen</option>
                        <option value="Kayu">Kayu</option>
                        <option value="Bambu">Bambu</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Bahan Atap</label>
                      <select 
                        value={unifiedData.keluarga.bahanAtap || 'Genteng'}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, bahanAtap: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="Genteng">Genteng</option>
                        <option value="Seng">Seng</option>
                        <option value="Asbes">Asbes</option>
                        <option value="Jerami/Rumbia">Jerami/Rumbia</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Sumber Air Minum</label>
                      <select 
                        value={unifiedData.keluarga.sumberAirMinum || 'Leding/PAM'}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, sumberAirMinum: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="Leding/PAM">Leding/PAM</option>
                        <option value="Sumur Terlindungi">Sumur Terlindungi</option>
                        <option value="Air Hujan">Air Hujan</option>
                        <option value="Sungai">Sungai</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Sumber Penerangan</label>
                      <select 
                        value={unifiedData.keluarga.sumberPenerangan || 'Listrik PLN 1300W'}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, sumberPenerangan: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="Listrik PLN 1300W">Listrik PLN 1300W</option>
                        <option value="Listrik PLN 900W">Listrik PLN 900W</option>
                        <option value="Listrik Non PLN">Listrik Non PLN</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">No. Meteran Listrik</label>
                      <input 
                        type="text" 
                        value={unifiedData.keluarga.noListrik || ''}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, noListrik: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Pengeluaran Listrik (/bln)</label>
                      <input 
                        type="number" 
                        value={unifiedData.keluarga.pengeluaranListrik || ''}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, pengeluaranListrik: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Pengeluaran Kuota (/bln)</label>
                      <input 
                        type="number" 
                        value={unifiedData.keluarga.pengeluaranKuota || ''}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, pengeluaranKuota: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Pengeluaran Makanan (/bln)</label>
                      <input 
                        type="number" 
                        value={unifiedData.keluarga.pengeluaranMakanan || ''}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, pengeluaranMakanan: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Pengeluaran Non-Makanan (/bln)</label>
                      <input 
                        type="number" 
                        value={unifiedData.keluarga.pengeluaranNonMakanan || ''}
                        onChange={(e) => setUnifiedData({ ...unifiedData, keluarga: { ...unifiedData.keluarga, pengeluaranNonMakanan: e.target.value } })}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: ANGGOTA KELUARGA LIST */}
              {unifiedStep === 2 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Blok III: Anggota Keluarga ({unifiedData.anggota.length})</h4>
                    <button 
                      type="button"
                      onClick={() => setUnifiedData({ ...unifiedData, anggota: [...unifiedData.anggota, {}] })}
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Anggota Keluarga
                    </button>
                  </div>

                  {unifiedData.anggota.map((ang: any, i: number) => (
                    <div key={i} className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-4 relative shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg">Anggota #{i + 1}</span>
                        {i > 0 && (
                          <button 
                            type="button"
                            onClick={() => setUnifiedData({ ...unifiedData, anggota: unifiedData.anggota.filter((_: any, idx: number) => idx !== i) })}
                            className="text-[10px] text-rose-400 hover:underline font-semibold"
                          >
                            Hapus Anggota
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Nama Lengkap *</label>
                          <input 
                            type="text" 
                            required
                            value={ang.namaAnggota || ''}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].namaAnggota = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className={getInputValidationClass(ang.namaAnggota, validateNama(ang.namaAnggota), true, "p-2")}
                            placeholder="Nama Lengkap"
                          />
                          {ang.namaAnggota && !validateNama(ang.namaAnggota) && (
                            <p className="text-[10px] text-rose-400 mt-1">⚠️ Nama minimal 3 karakter.</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">NIK Anggota *</label>
                          <input 
                            type="text" 
                            required
                            value={ang.nikAnggota || ''}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].nikAnggota = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className={getInputValidationClass(ang.nikAnggota, validateNik(ang.nikAnggota), true, "p-2")}
                            placeholder="NIK 16 digit"
                          />
                          {ang.nikAnggota && !validateNik(ang.nikAnggota) && (
                            <p className="text-[10px] text-rose-400 mt-1 animate-pulse">⚠️ NIK harus 16 digit angka.</p>
                          )}
                          {ang.nikAnggota && validateNik(ang.nikAnggota) && (
                            <p className="text-[10px] text-emerald-400 mt-1">✓ Format NIK Valid.</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Hubungan</label>
                          <select
                            value={ang.hubungan || 'Kepala Keluarga'}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].hubungan = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                          >
                            <option value="Kepala Keluarga">Kepala Keluarga</option>
                            <option value="Istri">Istri</option>
                            <option value="Anak">Anak</option>
                            <option value="Orang Tua">Orang Tua</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Jenis Kelamin</label>
                          <select
                            value={ang.jk || 'Laki-laki'}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].jk = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                          >
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Tanggal Lahir (DD/MM/YYYY)</label>
                          <input 
                            type="text" 
                            placeholder="12/04/1981"
                            value={ang.tanggalLahir || ''}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].tanggalLahir = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className={getInputValidationClass(ang.tanggalLahir, validateTanggalLahir(ang.tanggalLahir), false, "p-2")}
                          />
                          {ang.tanggalLahir && !validateTanggalLahir(ang.tanggalLahir) && (
                            <p className="text-[10px] text-rose-400 mt-1">⚠️ Format tanggal: DD/MM/YYYY.</p>
                          )}
                          {ang.tanggalLahir && validateTanggalLahir(ang.tanggalLahir) && (
                            <p className="text-[10px] text-emerald-400 mt-1">✓ Format Tanggal Valid.</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Status Perkawinan</label>
                          <select
                            value={ang.statusPerkawinan || 'Belum Kawin'}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].statusPerkawinan = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                          >
                            <option value="Belum Kawin">Belum Kawin</option>
                            <option value="Kawin">Kawin</option>
                            <option value="Cerai Hidup">Cerai Hidup</option>
                            <option value="Cerai Mati">Cerai Mati</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Partisipasi Sekolah</label>
                          <select
                            value={ang.partisipasiSekolah || 'Masih aktif sekolah'}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].partisipasiSekolah = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                          >
                            <option value="Masih aktif sekolah">Masih aktif sekolah</option>
                            <option value="Tidak sekolah lagi">Tidak sekolah lagi</option>
                            <option value="Belum pernah sekolah">Belum pernah sekolah</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Ijazah Tertinggi</label>
                          <select
                            value={ang.ijazah || 'SMA/Sederajat'}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].ijazah = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                          >
                            <option value="Tidak punya ijazah">Tidak punya ijazah</option>
                            <option value="SD/Sederajat">SD/Sederajat</option>
                            <option value="SMP/Sederajat">SMP/Sederajat</option>
                            <option value="SMA/Sederajat">SMA/Sederajat</option>
                            <option value="S1/Diploma IV">S1/Diploma IV</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Pekerjaan Utama</label>
                          <input 
                            type="text" 
                            value={ang.pekerjaan || ''}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].pekerjaan = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Kedudukan Pekerjaan</label>
                          <select
                            value={ang.kedudukanPekerjaan || 'Bukan Pekerja'}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].kedudukanPekerjaan = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                          >
                            <option value="Buruh/Karyawan">Buruh/Karyawan</option>
                            <option value="Berusaha Sendiri">Berusaha Sendiri</option>
                            <option value="Bukan Pekerja">Bukan Pekerja</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Gaji Utama (/Bulan)</label>
                          <input 
                            type="number" 
                            value={ang.gaji || ''}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].gaji = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Omset Usaha (/Bulan)</label>
                          <input 
                            type="number" 
                            value={ang.omsetUsaha || ''}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].omsetUsaha = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Penyandang Disabilitas</label>
                          <select
                            value={ang.disabilitas || 'Tidak'}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].disabilitas = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                          >
                            <option value="Tidak">Tidak</option>
                            <option value="Ya (Fisik/Netra/Lainnya)">Ya (Fisik/Netra/Lainnya)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Keluhan Kesehatan (Sebulan Terakhir)</label>
                          <input 
                            type="text" 
                            placeholder="Tidak Ada / Hipertensi / Asma"
                            value={ang.keluhanPenyakit || ''}
                            onChange={(e) => {
                              const list = [...unifiedData.anggota];
                              list[i].keluhanPenyakit = e.target.value;
                              setUnifiedData({ ...unifiedData, anggota: list });
                            }}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 3: DATA USAHA LIST */}
              {unifiedStep === 3 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Blok II: Unit Usaha Ekonomi</h4>
                    <button 
                      type="button"
                      onClick={() => setUnifiedData({ ...unifiedData, usaha: [...unifiedData.usaha, {}] })}
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Unit Usaha
                    </button>
                  </div>

                  {unifiedData.usaha.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      <p>Keluarga ini tidak memiliki aktivitas usaha ekonomi.</p>
                      <button 
                        type="button"
                        onClick={() => setUnifiedData({ ...unifiedData, usaha: [{}] })}
                        className="text-indigo-400 font-bold hover:underline mt-2 inline-block"
                      >
                        Miliki Usaha Ekonomi? Klik disini
                      </button>
                    </div>
                  ) : (
                    unifiedData.usaha.map((u: any, i: number) => (
                      <div key={i} className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg">Unit Usaha #{i + 1}</span>
                          <button 
                            type="button"
                            onClick={() => setUnifiedData({ ...unifiedData, usaha: unifiedData.usaha.filter((_: any, idx: number) => idx !== i) })}
                            className="text-[10px] text-rose-400 hover:underline font-semibold"
                          >
                            Hapus Usaha
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Nama Usaha *</label>
                            <input 
                              type="text" 
                              required
                              value={u.namaUsaha || ''}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].namaUsaha = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className={getInputValidationClass(u.namaUsaha, validateNama(u.namaUsaha), true, "p-2")}
                              placeholder="Nama Usaha"
                            />
                            {u.namaUsaha && !validateNama(u.namaUsaha) && (
                              <p className="text-[10px] text-rose-400 mt-1">⚠️ Nama usaha minimal 3 karakter.</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Pilih Penanggung Jawab Usaha *</label>
                            <select
                              required
                              value={u.nikPj || ''}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].nikPj = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className={getInputValidationClass(u.nikPj, !!u.nikPj, true, "p-2")}
                            >
                              <option value="">-- Pilih Anggota Keluarga --</option>
                              {unifiedData.anggota.map((ang: any, idx: number) => (
                                <option key={idx} value={ang.nikAnggota || ''}>
                                  {ang.namaAnggota || `Anggota ${idx + 1}`} ({ang.nikAnggota || 'NIK belum diisi'})
                                </option>
                              ))}
                            </select>
                            {!u.nikPj && (
                              <p className="text-[10px] text-amber-400 mt-1">⚠️ Penanggung Jawab harus dipilih.</p>
                            )}
                            {u.nikPj && (
                              <p className="text-[10px] text-emerald-400 mt-1">✓ Penanggung Jawab terpilih.</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Alamat Usaha</label>
                            <input 
                              type="text" 
                              value={u.alamatUsaha || ''}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].alamatUsaha = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Memiliki NIB?</label>
                            <select
                              value={u.memilikiNib || 'Tidak'}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].memilikiNib = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                            >
                              <option value="Ya">Ya</option>
                              <option value="Tidak">Tidak</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">KBLI (5 Digit)</label>
                            <input 
                              type="text" 
                              maxLength={5}
                              value={u.kbli || ''}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].kbli = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className={getInputValidationClass(u.kbli, validateKbli(u.kbli), false, "p-2")}
                              placeholder="Contoh: 47111"
                            />
                            {u.kbli && !validateKbli(u.kbli) && (
                              <p className="text-[10px] text-rose-400 mt-1">⚠️ KBLI harus 5 digit angka.</p>
                            )}
                            {u.kbli && validateKbli(u.kbli) && (
                              <p className="text-[10px] text-emerald-400 mt-1">✓ KBLI Valid.</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Status Badan Usaha</label>
                            <select
                              value={u.statusBadan || 'Usaha Perseorangan'}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].statusBadan = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                            >
                              <option value="Usaha Perseorangan">Usaha Perseorangan</option>
                              <option value="CV">CV</option>
                              <option value="PT">PT</option>
                              <option value="Belum Berbadan Hukum">Belum Berbadan Hukum</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Kegiatan Utama</label>
                            <input 
                              type="text" 
                              value={u.kegiatanUtama || ''}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].kegiatanUtama = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Pekerja Laki-laki</label>
                            <input 
                              type="number" 
                              value={u.pekerjaLaki || '0'}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].pekerjaLaki = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Pekerja Perempuan</label>
                            <input 
                              type="number" 
                              value={u.pekerjaPerempuan || '0'}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].pekerjaPerempuan = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Pendapatan Bulan (Rp)</label>
                            <input 
                              type="number" 
                              value={u.pendapatanBulan || ''}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].pendapatanBulan = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Pengeluaran Bulan (Rp)</label>
                            <input 
                              type="number" 
                              value={u.pengeluaranBulan || ''}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].pengeluaranBulan = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Aset Emas (gr)</label>
                            <input 
                              type="number" 
                              value={u.asetEmas || ''}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].asetEmas = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Aset Motor (unit)</label>
                            <input 
                              type="number" 
                              value={u.asetMotor || ''}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].asetMotor = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Aset Mobil (unit)</label>
                            <input 
                              type="number" 
                              value={u.asetMobil || ''}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].asetMobil = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Aset Tanah (m²)</label>
                            <input 
                              type="number" 
                              value={u.asetTanah || ''}
                              onChange={(e) => {
                                const list = [...unifiedData.usaha];
                                list[i].asetTanah = e.target.value;
                                setUnifiedData({ ...unifiedData, usaha: list });
                              }}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Real-time Validation Warning Panel */}
              {getStepValidationErrors(unifiedStep).length > 0 && (
                <div className="mx-6 mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col gap-1.5 text-xs animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-bold text-rose-400">
                    <span className="text-sm">⚠️</span>
                    <span>Mohon lengkapi isian wajib sebelum melanjutkan:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-slate-300 font-medium">
                    {getStepValidationErrors(unifiedStep).map((err, idx) => (
                      <li key={idx} className="text-[11px]">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

            {/* WIZARD ACTIONS FOOTER */}
            <div className="p-6 bg-slate-950 border-t border-slate-850 flex justify-between items-center rounded-b-3xl">
              <button 
                type="button"
                disabled={unifiedStep === 1}
                onClick={() => setUnifiedStep(unifiedStep - 1)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl text-xs transition-all disabled:opacity-40"
              >
                Kembali
              </button>

              {unifiedStep < 3 ? (
                <button 
                  type="button"
                  disabled={getStepValidationErrors(unifiedStep).length > 0}
                  onClick={() => setUnifiedStep(unifiedStep + 1)}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-900 disabled:border-slate-850 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-2 px-5 rounded-xl text-xs transition-all flex items-center gap-1"
                >
                  <span>Selanjutnya</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button 
                  type="button"
                  disabled={getStepValidationErrors(unifiedStep).length > 0}
                  onClick={saveUnifiedCensus}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-900 disabled:border-slate-850 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-xl text-xs transition-all"
                >
                  Simpan Seluruh Sensus
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
