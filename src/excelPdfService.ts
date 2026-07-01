import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to save file from blob
function saveAs(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 1. Download Excel Template
export function downloadExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // Template Data Keluarga
  const headersKeluarga = [
    'noKk', 'nikKepala', 'namaKepala', 'provinsi', 'kabKota', 'kecamatan', 'desaKelurahan', 'rt', 'rw',
    'alamatSesuai', 'jmlAnggota', 'jenisBangunan', 'statusKepemilikan', 'luasLantai', 'bahanLantai',
    'bahanDinding', 'bahanAtap', 'sumberAirMinum', 'sumberPenerangan', 'pengeluaranMakanan',
    'pengeluaranNonMakanan', 'noListrik', 'pengeluaranListrik', 'pengeluaranKuota', 'noHp', 'email'
  ];
  const sampleKeluarga = [
    {
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
  const wsKeluarga = XLSX.utils.json_to_sheet(sampleKeluarga, { header: headersKeluarga });
  XLSX.utils.book_append_sheet(wb, wsKeluarga, 'Data Keluarga');

  // Template Anggota Keluarga
  const headersAnggota = [
    'noKk', 'noUrut', 'nikAnggota', 'namaAnggota', 'hubungan', 'jk', 'tanggalLahir',
    'statusPerkawinan', 'partisipasiSekolah', 'ijazah', 'pekerjaan', 'kedudukanPekerjaan',
    'gaji', 'omsetUsaha', 'disabilitas', 'keluhanPenyakit'
  ];
  const sampleAnggota = [
    {
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
    }
  ];
  const wsAnggota = XLSX.utils.json_to_sheet(sampleAnggota, { header: headersAnggota });
  XLSX.utils.book_append_sheet(wb, wsAnggota, 'Anggota Keluarga');

  // Template Unit Usaha
  const headersUsaha = [
    'nikPj', 'namaUsaha', 'alamatUsaha', 'memilikiNib', 'statusBadan', 'kegiatanUtama',
    'kbli', 'pekerjaLaki', 'pekerjaPerempuan', 'pengeluaranBulan', 'pendapatanBulan',
    'asetEmas', 'asetMotor', 'asetMobil', 'asetTanah'
  ];
  const sampleUsaha = [
    {
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
    }
  ];
  const wsUsaha = XLSX.utils.json_to_sheet(sampleUsaha, { header: headersUsaha });
  XLSX.utils.book_append_sheet(wb, wsUsaha, 'Unit Usaha');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, 'template_sensus_ekonomi_2026.xlsx');
}

// 2. Parse uploaded Excel file containing multiple sheets
export function parseExcelFile(file: File): Promise<{ keluarga: any[], anggota: any[], usaha: any[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let keluarga: any[] = [];
        let anggota: any[] = [];
        let usaha: any[] = [];

        // Parse sheets by name or index
        workbook.SheetNames.forEach(sheetName => {
          const lowerName = sheetName.toLowerCase().replace(/\s/g, '');
          const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

          if (lowerName.includes('keluarga')) {
            keluarga = sheetData;
          } else if (lowerName.includes('anggota')) {
            anggota = sheetData;
          } else if (lowerName.includes('usaha') || lowerName.includes('unit')) {
            usaha = sheetData;
          }
        });

        // If sheet names didn't match, attempt mapping based on specific unique headers
        if (keluarga.length === 0 && workbook.SheetNames[0]) {
          const firstSheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
          if (firstSheet.length > 0 && ('noKk' in firstSheet[0] && 'nikKepala' in firstSheet[0])) {
            keluarga = firstSheet;
          }
        }
        if (anggota.length === 0 && workbook.SheetNames[1]) {
          const secondSheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[1]]) as any[];
          if (secondSheet.length > 0 && ('nikAnggota' in secondSheet[0] && 'hubungan' in secondSheet[0])) {
            anggota = secondSheet;
          }
        }
        if (usaha.length === 0 && workbook.SheetNames[2]) {
          const thirdSheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[2]]) as any[];
          if (thirdSheet.length > 0 && ('namaUsaha' in thirdSheet[0] && 'nikPj' in thirdSheet[0])) {
            usaha = thirdSheet;
          }
        }

        resolve({ keluarga, anggota, usaha });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// 3. Export full database to beautifully formatted Excel
export function exportAllToExcel(dataKeluarga: any[], dataAnggota: any[], dataUsaha: any[]) {
  const wb = XLSX.utils.book_new();

  // 1. Data Keluarga
  const wsKeluarga = XLSX.utils.json_to_sheet(dataKeluarga);
  XLSX.utils.book_append_sheet(wb, wsKeluarga, 'Data Keluarga');

  // 2. Anggota Keluarga
  const wsAnggota = XLSX.utils.json_to_sheet(dataAnggota);
  XLSX.utils.book_append_sheet(wb, wsAnggota, 'Anggota Keluarga');

  // 3. Unit Usaha
  const wsUsaha = XLSX.utils.json_to_sheet(dataUsaha);
  XLSX.utils.book_append_sheet(wb, wsUsaha, 'Unit Usaha');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, `ekspor_sensus_ekonomi_2026_${Date.now()}.xlsx`);
}

// 4. Export publication-quality PDF Report using jsPDF & jspdf-autotable
export function exportAllToPdf(dataKeluarga: any[], dataAnggota: any[], dataUsaha: any[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const totalGaji = dataAnggota.reduce((sum, item) => sum + Number(item.gaji || 0), 0);
  const totalOmset = dataUsaha.reduce((sum, item) => sum + Number(item.pendapatanBulan || 0), 0);

  // Define styling constants
  const primaryColor: [number, number, number] = [99, 102, 241]; // indigo-500
  const darkColor: [number, number, number] = [15, 23, 42]; // slate-900
  const lightBg: [number, number, number] = [248, 250, 252]; // slate-50

  // PAGE 1: COVER & EXECUTIVE SUMMARY
  // Top Banner
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.rect(0, 0, 210, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('REKAPITULASI RESMI SENSUS EKONOMI 2026', 15, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(199, 210, 254);
  doc.text('BADAN PUSAT STATISTIK - SISTEM INFORMASI TERPADU PRO', 15, 28);
  doc.text(`Waktu Cetak: ${new Date().toLocaleString('id-ID')}`, 15, 35);

  // Sub Title
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('1. LAPORAN RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)', 15, 58);

  // Draw statistics grid boxes
  const drawStatBox = (x: number, y: number, w: number, h: number, title: string, value: string, color: number[]) => {
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(x, y, w, h, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240); // border gray
    doc.roundedRect(x, y, w, h, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(title.toUpperCase(), x + 5, y + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(value, x + 5, y + 18);
  };

  drawStatBox(15, 65, 42, 25, 'Total Keluarga', `${dataKeluarga.length} KK`, primaryColor);
  drawStatBox(62, 65, 42, 25, 'Anggota Sensus', `${dataAnggota.length} Jiwa`, [16, 185, 129]); // emerald-500
  drawStatBox(109, 65, 42, 25, 'Unit Usaha Mikro', `${dataUsaha.length} Unit`, [245, 158, 11]); // amber-500
  drawStatBox(156, 65, 40, 25, 'Total Perputaran', `Rp ${( (totalGaji + totalOmset) / 1000000 ).toFixed(1)} Jt`, [236, 72, 153]); // pink-500

  // Narrative summary paragraph
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85); // slate-700
  const descParagraph = `Berdasarkan pengumpulan data Sensus Ekonomi 2026 terpadu yang dicatat oleh petugas, wilayah cakupan saat ini memiliki total ${dataKeluarga.length} Kepala Keluarga terdaftar yang mengasuh sebanyak ${dataAnggota.length} jiwa anggota keluarga. Dari sisi produktivitas ekonomi mandiri, tercatat sebanyak ${dataUsaha.length} unit usaha mikro, kecil, atau menengah (UMKM) aktif yang dikelola oleh anggota rumah tangga. Total estimasi perputaran pendapatan bulanan dari upah karyawan dan omset usaha lokal di cakupan sensus ini mencapai Rp ${(totalGaji + totalOmset).toLocaleString('id-ID')}.`;
  
  const splitDesc = doc.splitTextToSize(descParagraph, 180);
  doc.text(splitDesc, 15, 100);

  // Quick chart data or secondary table on Page 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('2. DAFTAR SUMMARY WILAYAH & KEPALA KELUARGA', 15, 130);

  // Generate Table of Keluarga
  const tableKeluargaBody = dataKeluarga.map((k, i) => [
    i + 1,
    k.noKk || '',
    k.namaKepala || '',
    k.desaKelurahan ? `${k.desaKelurahan} (RT ${k.rt || '00'}/RW ${k.rw || '00'})` : '',
    `${k.jmlAnggota || 0} Jiwa`,
    `Rp ${(Number(k.pengeluaranMakanan || 0) + Number(k.pengeluaranNonMakanan || 0)).toLocaleString('id-ID')}`,
    k.jenisBangunan || ''
  ]);

  autoTable(doc, {
    startY: 136,
    head: [['No', 'Nomor KK', 'Nama Kepala Keluarga', 'Desa / RT-RW', 'ART', 'Total Pengeluaran', 'Jenis Bangunan']],
    body: tableKeluargaBody,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 32 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 12 },
      5: { cellWidth: 30 },
      6: { cellWidth: 28 },
    },
    margin: { left: 15, right: 15 }
  });

  // Footer text
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Sensus Ekonomi 2026 Terpadu Pro | Halaman ${i} dari ${pageCount}`, 15, 287);
    doc.text('Badan Pusat Statistik (BPS) Republik Indonesia', 140, 287);
  }

  // PAGE 2: ANGGOTA KELUARGA & UNIT USAHA
  doc.addPage();
  
  // Page 2 header
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.rect(0, 0, 210, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. DAFTAR ANGGOTA KELUARGA TERDAFTAR (BLOK IV SENSUS)', 15, 12);

  const tableAnggotaBody = dataAnggota.slice(0, 30).map((a, i) => [
    i + 1,
    a.nikAnggota || '',
    a.namaAnggota || '',
    a.hubungan || '',
    a.pekerjaan || '',
    a.ijazah || '',
    `Rp ${Number(a.gaji || 0).toLocaleString('id-ID')}`
  ]);

  autoTable(doc, {
    startY: 24,
    head: [['No', 'NIK Anggota', 'Nama Lengkap', 'Hubungan', 'Pekerjaan', 'Pendidikan Terakhir', 'Gaji / Upah']],
    body: tableAnggotaBody,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] as [number, number, number], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 32 },
      2: { cellWidth: 42 },
      3: { cellWidth: 25 },
      4: { cellWidth: 30 },
      5: { cellWidth: 25 },
      6: { cellWidth: 18 }
    },
    margin: { left: 15, right: 15 }
  });

  // Section 4: Unit Usaha
  const nextY = (doc as any).lastAutoTable.finalY + 12;
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. PRODUKTIVITAS EKONOMI & UNIT USAHA MIKRO/KECIL (BLOK V SENSUS)', 15, nextY);

  const tableUsahaBody = dataUsaha.map((u, i) => [
    i + 1,
    u.namaUsaha || '',
    u.alamatUsaha || '',
    u.statusBadan || '',
    u.kegiatanUtama || '',
    `${Number(u.pekerjaLaki || 0) + Number(u.pekerjaPerempuan || 0)} Org`,
    `Rp ${Number(u.pendapatanBulan || 0).toLocaleString('id-ID')}`
  ]);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['No', 'Nama Usaha', 'Alamat Usaha', 'Badan Usaha', 'Kegiatan Utama', 'Pekerja', 'Omset/Bulan']],
    body: tableUsahaBody,
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] as [number, number, number], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { cellWidth: 40 },
      5: { cellWidth: 15 },
      6: { cellWidth: 22 }
    },
    margin: { left: 15, right: 15 }
  });

  // Signature Block at the end of PDF
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  if (finalY < 250) {
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Mengesahkan Laporan Sensus,', 140, finalY);
    doc.text('Petugas Sensus Lapangan', 140, finalY + 5);

    doc.setDrawColor(148, 163, 184);
    doc.line(140, finalY + 24, 190, finalY + 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('ID Petugas: SE-2026-991', 140, finalY + 28);
    doc.text(`Tanggal Pengesahan: ${new Date().toLocaleDateString('id-ID')}`, 140, finalY + 32);
  }

  // Update footer pages again to account for page 2
  const finalPageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= finalPageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Sensus Ekonomi 2026 Terpadu Pro | Halaman ${i} dari ${finalPageCount}`, 15, 287);
  }

  doc.save(`Laporan_Sensus_Ekonomi_2026_${Date.now()}.pdf`);
}

// 5. Export single family questionnaire to beautiful PDF
export function exportSingleKkToPdf(familyData: any, memberList: any[], businessList: any[], isBlank: boolean) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const f = isBlank ? {} : familyData;
  const members = isBlank ? [{}, {}, {}] : memberList;
  const businesses = isBlank ? [{}, {}] : businessList;

  // PAGE 1: Lembar 1 - Identitas & Bangunan/Utilitas
  // BPS Top Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('KUESIONER SENSUS EKONOMI 2026', 15, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(199, 210, 254);
  doc.text('BADAN PUSAT STATISTIK (BPS) REPUBLIK INDONESIA', 15, 18);
  doc.text(`Dokumen Resmi Sensus Terpadu - Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 15, 23);

  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(15, 23, 42);
  doc.rect(160, 8, 35, 12, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SE26.K1', 165, 14);
  doc.setFontSize(7);
  doc.text('LEMBAR 1', 165, 18);

  // Blok I
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('BLOK I: IDENTIFIKASI KELUARGA & KONTAK RESPONDEN', 15, 42);

  const formatVal = (val: any, placeholder = '') => {
    if (isBlank) return placeholder;
    return val !== undefined && val !== null && val !== '' ? String(val) : '-';
  };

  const formatRupiahVal = (val: any) => {
    if (isBlank) return 'Rp ..................................';
    if (val === undefined || val === null || val === '') return 'Rp -';
    return `Rp ${Number(val).toLocaleString('id-ID')}`;
  };

  const formatBoxedString = (val: string, length: number) => {
    if (isBlank) {
      return Array(length).fill('_').join(' ');
    }
    const chars = String(val || '').replace(/\D/g, '').split('');
    return Array.from({ length }).map((_, i) => chars[i] !== undefined ? chars[i] : '.').join(' ');
  };

  const rtVal = isBlank ? '' : String(f.rt || '').padStart(3, '0');
  const rwVal = isBlank ? '' : String(f.rw || '').padStart(3, '0');

  const formatBoxedRtRw = () => {
    if (isBlank) {
      return 'RT: _ _ _      RW: _ _ _';
    }
    const rtChars = rtVal.split('');
    const rwChars = rwVal.split('');
    const rtBox = Array.from({ length: 3 }).map((_, i) => rtChars[i] !== undefined ? rtChars[i] : '.').join(' ');
    const rwBox = Array.from({ length: 3 }).map((_, i) => rwChars[i] !== undefined ? rwChars[i] : '.').join(' ');
    return `RT:  ${rtBox}      RW:  ${rwBox}`;
  };

  const blokIBody = [
    [
      { content: `101. PROVINSI\n${f.provinsi || 'JAWA BARAT'}` },
      { content: `106. NOMOR KARTU KELUARGA (KK)\n${formatBoxedString(f.noKk, 16)}`, styles: { font: 'courier' } }
    ],
    [
      { content: `102. KABUPATEN / KOTA\n${f.kabKota || 'GARUT'}` },
      { content: `107. NIK KEPALA KELUARGA\n${formatBoxedString(f.nikKepala, 16)}`, styles: { font: 'courier' } }
    ],
    [
      { content: `103. KECAMATAN\n${f.kecamatan || 'PAKENJENG'}` },
      { content: `108. NAMA LENGKAP KEPALA KELUARGA\n${formatVal(f.namaKepala)}` }
    ],
    [
      { content: `104. DESA / KELURAHAN\n${formatVal(f.desaKelurahan)}` },
      { content: `109. NOMOR HANDPHONE / WA KONTAK\n${formatBoxedString(f.noHp, 13)}`, styles: { font: 'courier' } }
    ],
    [
      { content: `105. RUKUN TETANGGA (RT) / RUKUN WARGA (RW)\n${formatBoxedRtRw()}`, styles: { font: 'courier' } },
      { content: `110. ALAMAT EMAIL RESPONDEN\n${formatVal(f.email)}` }
    ]
  ];

  autoTable(doc, {
    startY: 46,
    head: [['A. WILAYAH ADMINISTRASI', 'B. IDENTITAS KEPALA KELUARGA']],
    body: blokIBody as any,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'left' },
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [15, 23, 42], lineColor: [15, 23, 42], lineWidth: 0.3, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 90 }
    },
    margin: { left: 15, right: 15 }
  });

  const nextYBlok4 = (doc as any).lastAutoTable.finalY + 10;

  // Blok IV
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('BLOK IV: KARAKTERISTIK BANGUNAN, UTILITAS & PENGELUARAN', 15, nextYBlok4);

  const blokIVBody = [
    [
      { content: `401. JENIS BANGUNAN TEMPAT TINGGAL\n${formatVal(f.jenisBangunan)}` },
      { content: `408. PENGELUARAN LISTRIK BULANAN\n${formatRupiahVal(f.pengeluaranListrik)}`, styles: { textColor: [4, 120, 87] } }
    ],
    [
      { content: `402. STATUS KEPEMILIKAN RUMAH\n${formatVal(f.statusKepemilikan)}` },
      { content: `409. PENGELUARAN KUOTA INTERNET / HP\n${formatRupiahVal(f.pengeluaranKuota)}`, styles: { textColor: [4, 120, 87] } }
    ],
    [
      { content: `403. LUAS LANTAI BANGUNAN\n${isBlank ? '.................... m²' : `${f.luasLantai || 0} m²`}` },
      { content: `410. PENGELUARAN MAKANAN SEBULAN\n${formatRupiahVal(f.pengeluaranMakanan)}`, styles: { textColor: [4, 120, 87] } }
    ],
    [
      { content: `404. BAHAN LANTAI TERLUAS\n${formatVal(f.bahanLantai)}` },
      { content: `411. PENGELUARAN NON-MAKANAN SEBULAN\n${formatRupiahVal(f.pengeluaranNonMakanan)}`, styles: { textColor: [4, 120, 87] } }
    ],
    [
      { content: `405. BAHAN DINDING TERLUAS\n${formatVal(f.bahanDinding)}` },
      { 
        content: `412. REKAPITULASI ANGGOTA KELUARGA (ART)\n\nJumlah Anggota Keluarga: ${isBlank ? '..........' : `${memberList.length} Jiwa`}\n\n* Rincian lengkap nama, NIK, dan pekerjaan dicatat secara rinci pada Lembar 2 kuesioner ini.`, 
        rowSpan: 3, 
        styles: { fillColor: [238, 242, 255], textColor: [67, 56, 202] } 
      }
    ],
    [
      { content: `406. BAHAN ATAP TERLUAS\n${formatVal(f.bahanAtap)}` }
    ],
    [
      { 
        content: `407. SUMBER AIR MINUM UTAMA & PENERANGAN\nAir Minum: ${isBlank ? '_________________________' : (f.sumberAirMinum || '-')}\nPenerangan: ${isBlank ? '_________________________' : (f.sumberPenerangan || '-')}\nID PEL: ${isBlank ? '_________________________' : (f.noListrik || '-')}` 
      }
    ]
  ];

  autoTable(doc, {
    startY: nextYBlok4 + 4,
    head: [['C. KARAKTERISTIK BANGUNAN & UTILITAS', 'D. REKAPITULASI PENGELUARAN BULANAN (RUPIAH)']],
    body: blokIVBody as any,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'left' },
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [15, 23, 42], lineColor: [15, 23, 42], lineWidth: 0.3, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 90 }
    },
    margin: { left: 15, right: 15 }
  });

  // Page 1 Footer / Signatures
  const signY = (doc as any).lastAutoTable.finalY + 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, signY, 195, signY);

  const savedOfficerName = localStorage.getItem('se2026_officer_name') || 'Andi Lutfi';
  const savedOfficerId = localStorage.getItem('se2026_officer_id') || 'SE2026-PAK-091';
  const savedOfficerRole = localStorage.getItem('se2026_officer_role') || 'PPL';

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${savedOfficerRole === 'PML' ? 'Pengawas (PML)' : 'Pencacah (PPL)'} Sensus`, 40, signY + 8, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(savedOfficerName, 40, signY + 28, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`ID: ${savedOfficerId}`, 40, signY + 33, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text('Responden / Kepala Keluarga', 155, signY + 8, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(isBlank ? '_______________________' : (f.namaKepala || '_______________________'), 155, signY + 28, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 155, signY + 33, { align: 'center' });


  // PAGE 2: Lembar 2 - Anggota Keluarga & Usaha
  doc.addPage();

  // Header Page 2
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('KUESIONER SENSUS EKONOMI 2026', 15, 10);
  doc.setFontSize(8);
  doc.setTextColor(199, 210, 254);
  doc.text('BLOK III & BLOK II: ANGGOTA KELUARGA & UNIT USAHA EKONOMI', 15, 15);

  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(15, 23, 42);
  doc.rect(160, 5, 35, 12, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SE26.K2', 165, 11);
  doc.setFontSize(7);
  doc.text('LEMBAR 2', 165, 15);

  // Blok III: Anggota Keluarga
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('BLOK III: RINCIAN KETERANGAN ANGGOTA KELUARGA (ART)', 15, 32);

  const membersBody = members.map((ang: any, idx: number) => {
    const namaNik = isBlank 
      ? '..................................................\nNIK: .......................................'
      : `${ang.namaAnggota || '-'}\nNIK: ${ang.nikAnggota || '-'}`;
    
    const hubJk = isBlank
      ? '......................\n.....'
      : `${ang.hubungan || '-'}\n(${ang.jk || '-'})`;

    const tglKawin = isBlank
      ? '......................\n.................'
      : `${ang.tanggalLahir || '-'}\n${ang.statusPerkawinan || '-'}`;

    const sekolahIjazah = isBlank
      ? '..................................\nIjazah: .....'
      : `${ang.partisipasiSekolah || '-'}\nIjazah: ${ang.ijazah || '-'}`;

    const kerjaGaji = isBlank
      ? '..................................\nGaji: Rp .....................'
      : `${ang.pekerjaan || 'Tidak Bekerja'}\nRp ${Number(ang.gaji || 0).toLocaleString('id-ID')}`;

    const kesehatan = isBlank
      ? 'Keluhan: ......................\nDisabilitas: .....'
      : `Keluhan: ${ang.keluhanPenyakit || 'Tidak Ada'}\nDisab: ${ang.disabilitas || 'Tidak'}`;

    return [
      idx + 1,
      namaNik,
      hubJk,
      tglKawin,
      sekolahIjazah,
      kerjaGaji,
      kesehatan
    ];
  });

  autoTable(doc, {
    startY: 36,
    head: [['No', 'Nama Lengkap & NIK', 'Hubungan / JK', 'Tgl Lahir / Perkawinan', 'Sekolah & Ijazah', 'Pekerjaan & Gaji (Rp)', 'Kesehatan']],
    body: membersBody,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 7, cellPadding: 2, textColor: [15, 23, 42], lineColor: [15, 23, 42], lineWidth: 0.3 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 42 },
      2: { cellWidth: 22 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 32 },
      5: { cellWidth: 31 },
      6: { cellWidth: 20 }
    },
    margin: { left: 15, right: 15 }
  });

  const nextYBlok2 = (doc as any).lastAutoTable.finalY + 8;

  // Blok II: Unit Usaha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('BLOK II: UNIT USAHA EKONOMI KELUARGA RESPONDEN', 15, nextYBlok2);

  if (businesses.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Keluarga responden menyatakan tidak memiliki unit usaha ekonomi aktif.', 15, nextYBlok2 + 6);
  } else {
    const businessesBody = businesses.map((bus: any, idx: number) => {
      const identitas = isBlank
        ? '..................................................\nNIB: .....\nAlamat: .......................................'
        : `${bus.namaUsaha || '-'}\nNIB: ${bus.memilikiNib === 'Ya' ? 'Ada' : 'Tidak Ada'} | PJ: ${bus.nikPj || '-'}\nAlamat: ${bus.alamatUsaha || '-'}`;

      const kbli = isBlank
        ? 'KBLI: .....\nUtama: ......................\nBadan: ......................'
        : `KBLI: ${bus.kbli || '-'}\nUtama: ${bus.kegiatanUtama || '-'}\nBadan: ${bus.statusBadan || '-'}`;

      const pekerja = isBlank
        ? 'L: ...\nP: ...'
        : `L: ${bus.pekerjaLaki || 0} orang\nP: ${bus.pekerjaPerempuan || 0} orang`;

      const keuangan = isBlank
        ? 'In: Rp ..................\nOut: Rp ..................'
        : `In: Rp ${Number(bus.pendapatanBulan || 0).toLocaleString('id-ID')}\nOut: Rp ${Number(bus.pengeluaranBulan || 0).toLocaleString('id-ID')}`;

      const aset = isBlank
        ? 'Emas: ..... g | Mtr: ..... u\nMbl: ..... u | Tnh: ..... m²'
        : `Emas: ${bus.asetEmas || 0} g | Mtr: ${bus.asetMotor || 0} u\nMbl: ${bus.asetMobil || 0} u | Tnh: ${bus.asetTanah || 0} m²`;

      return [
        idx + 1,
        identitas,
        kbli,
        pekerja,
        keuangan,
        aset
      ];
    });

    autoTable(doc, {
      startY: nextYBlok2 + 4,
      head: [['No', 'Identitas Usaha & NIB', 'KBLI & Kegiatan Utama', 'Pekerja', 'Pemasukan & Pengeluaran (Rp)', 'Rincian Aset Usaha']],
      body: businessesBody,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 7, cellPadding: 2, textColor: [15, 23, 42], lineColor: [15, 23, 42], lineWidth: 0.3 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 42 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20 },
        4: { cellWidth: 38 },
        5: { cellWidth: 37 }
      },
      margin: { left: 15, right: 15 }
    });
  }

  const finalSignY = Math.max((doc as any).lastAutoTable?.finalY || nextYBlok2, nextYBlok2 + 25) + 12;
  let signY2 = finalSignY;
  if (finalSignY >= 245) {
    doc.addPage();
    signY2 = 25; // start near top of new page
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('BLOK III: PENGESAHAN DOKUMEN SENSUS', 15, signY2);
    signY2 += 6;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(15, signY2, 195, signY2);

  const savedOfficerName2 = localStorage.getItem('se2026_officer_name') || 'Andi Lutfi';
  const savedOfficerId2 = localStorage.getItem('se2026_officer_id') || 'SE2026-PAK-091';
  const savedOfficerRole2 = localStorage.getItem('se2026_officer_role') || 'PPL';

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${savedOfficerRole2 === 'PML' ? 'Pengawas (PML)' : 'Pencacah (PPL)'} Sensus`, 40, signY2 + 8, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(savedOfficerName2, 40, signY2 + 28, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`ID: ${savedOfficerId2}`, 40, signY2 + 33, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text('Responden / Kepala Keluarga', 155, signY2 + 8, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(isBlank ? '_______________________' : (f.namaKepala || '_______________________'), 155, signY2 + 28, { align: 'center' });

  // Set page numbering on both pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Sensus Ekonomi 2026 - Formulir Kuesioner Resmi | Halaman ${i} dari ${totalPages}`, 15, 287);
  }

  const filename = isBlank 
    ? 'Formulir_Kuesioner_Blanko_SE2026.pdf' 
    : `Kuesioner_SE2026_${f.noKk || 'Sensus'}.pdf`;

  doc.save(filename);
}

// 6. Export single family questionnaire to beautiful Microsoft Word / DOCX Format
export function exportSingleKkToDocx(familyData: any, memberList: any[], businessList: any[], isBlank: boolean) {
  const f = isBlank ? {} : familyData;
  const members = isBlank ? [{}, {}, {}] : memberList;
  const businesses = isBlank ? [{}, {}] : businessList;

  const formatVal = (val: any, placeholder = '') => {
    if (isBlank) return placeholder;
    return val !== undefined && val !== null && val !== '' ? String(val) : '-';
  };

  const formatRupiah = (val: any) => {
    if (isBlank) return 'Rp ..................................';
    if (val === undefined || val === null || val === '') return 'Rp -';
    return `Rp ${Number(val).toLocaleString('id-ID')}`;
  };

  const formatBoxedString = (val: string, length: number) => {
    if (isBlank) {
      return Array(length).fill('_').join(' ');
    }
    const chars = String(val || '').replace(/\D/g, '').split('');
    return Array.from({ length }).map((_, i) => chars[i] !== undefined ? chars[i] : '.').join(' ');
  };

  const rtVal = isBlank ? '' : String(f.rt || '').padStart(3, '0');
  const rwVal = isBlank ? '' : String(f.rw || '').padStart(3, '0');

  const formatBoxedRtRw = () => {
    if (isBlank) {
      return 'RT: _ _ _      RW: _ _ _';
    }
    const rtChars = rtVal.split('');
    const rwChars = rwVal.split('');
    const rtBox = Array.from({ length: 3 }).map((_, i) => rtChars[i] !== undefined ? rtChars[i] : '.').join(' ');
    const rwBox = Array.from({ length: 3 }).map((_, i) => rwChars[i] !== undefined ? rwChars[i] : '.').join(' ');
    return `RT:  ${rtBox}      RW:  ${rwBox}`;
  };

  // Build the complete HTML representation for Word
  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>Kuesioner Sensus Ekonomi 2026</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.3;
          color: #000000;
          margin: 1in;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-bottom: 20px;
        }
        .header-title {
          font-size: 16pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        .header-subtitle {
          font-size: 8pt;
          color: #555555;
          text-transform: uppercase;
        }
        .doc-code {
          border: 2px solid #000000;
          padding: 8px;
          font-weight: bold;
          text-align: center;
          font-size: 11pt;
          background-color: #f3f4f6;
        }
        .section-header {
          background-color: #0f172a;
          color: #ffffff;
          font-weight: bold;
          font-size: 10pt;
          padding: 6px 10px;
          margin-top: 25px;
          margin-bottom: 10px;
          text-transform: uppercase;
          border-radius: 4px;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .info-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
          font-size: 9.5pt;
          vertical-align: middle;
        }
        .label-cell {
          background-color: #f8fafc;
          font-weight: bold;
          width: 25%;
        }
        .value-cell {
          width: 25%;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          margin-bottom: 20px;
        }
        .data-table th {
          border: 1px solid #334155;
          background-color: #0f172a;
          color: #ffffff;
          font-weight: bold;
          font-size: 8.5pt;
          padding: 6px;
          text-align: center;
        }
        .data-table td {
          border: 1px solid #cbd5e1;
          padding: 6px;
          font-size: 8.5pt;
          vertical-align: top;
        }
        .usaha-table th {
          background-color: #0f172a;
        }
        .signature-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-top: 35px;
        }
        .signature-table td {
          border: none;
          width: 50%;
          text-align: center;
          font-size: 9.5pt;
        }
        .page-break {
          page-break-before: always;
        }
      </style>
    </head>
    <body>

      <!-- PAGE 1: LEMBAR 1 -->
      <table class="header-table">
        <tr>
          <td style="border:none; text-align:left;">
            <div class="header-title">SENSUS EKONOMI 2026</div>
            <div class="header-subtitle">REPUBLIK INDONESIA - BADAN PUSAT STATISTIK (BPS)</div>
          </td>
          <td style="border:none; text-align:right; width: 120px;">
            <div class="doc-code">
              SE26.K1<br/>
              <span style="font-size: 8pt; font-weight: normal;">LEMBAR 1</span>
            </div>
          </td>
        </tr>
      </table>

      <div class="section-header">BLOK I: IDENTIFIKASI KELUARGA & KONTAK RESPONDEN</div>
      <table class="info-table">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff; font-weight: bold;">
            <th style="padding: 6px 10px; font-size: 10pt; text-align: left; width: 50%;">A. WILAYAH ADMINISTRASI</th>
            <th style="padding: 6px 10px; font-size: 10pt; text-align: left; width: 50%;">B. IDENTITAS KEPALA KELUARGA</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">101. PROVINSI</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; text-transform: uppercase;">${f.provinsi || 'JAWA BARAT'}</div>
            </td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">106. NOMOR KARTU KELUARGA (KK)</div>
              <div style="font-family: monospace; font-size: 10.5pt; font-weight: bold; margin-top: 4px; letter-spacing: 2px;">${formatBoxedString(f.noKk, 16)}</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">102. KABUPATEN / KOTA</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; text-transform: uppercase;">${f.kabKota || 'GARUT'}</div>
            </td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">107. NIK KEPALA KELUARGA</div>
              <div style="font-family: monospace; font-size: 10.5pt; font-weight: bold; margin-top: 4px; letter-spacing: 2px;">${formatBoxedString(f.nikKepala, 16)}</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">103. KECAMATAN</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; text-transform: uppercase;">${f.kecamatan || 'PAKENJENG'}</div>
            </td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">108. NAMA LENGKAP KEPALA KELUARGA</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; text-transform: uppercase;">${formatVal(f.namaKepala)}</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">104. DESA / KELURAHAN</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; text-transform: uppercase;">${formatVal(f.desaKelurahan)}</div>
            </td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">109. NOMOR HANDPHONE / WA KONTAK</div>
              <div style="font-family: monospace; font-size: 10.5pt; font-weight: bold; margin-top: 4px; letter-spacing: 2px;">${formatBoxedString(f.noHp, 13)}</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">105. RUKUN TETANGGA (RT) / RUKUN WARGA (RW)</div>
              <div style="font-family: monospace; font-weight: bold; font-size: 10pt; margin-top: 4px;">${formatBoxedRtRw()}</div>
            </td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">110. ALAMAT EMAIL RESPONDEN</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px;">${formatVal(f.email)}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="section-header">BLOK IV: KARAKTERISTIK BANGUNAN, UTILITAS & PENGELUARAN</div>
      <table class="info-table">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff; font-weight: bold;">
            <th style="padding: 6px 10px; font-size: 10pt; text-align: left; width: 50%;">C. KARAKTERISTIK BANGUNAN & UTILITAS</th>
            <th style="padding: 6px 10px; font-size: 10pt; text-align: left; width: 50%;">D. REKAPITULASI PENGELUARAN BULANAN (RUPIAH)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">401. JENIS BANGUNAN TEMPAT TINGGAL</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; text-transform: uppercase;">${formatVal(f.jenisBangunan)}</div>
            </td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">408. PENGELUARAN LISTRIK BULANAN</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; color: #047857;">${formatRupiah(f.pengeluaranListrik)}</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">402. STATUS KEPEMILIKAN RUMAH</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; text-transform: uppercase;">${formatVal(f.statusKepemilikan)}</div>
            </td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">409. PENGELUARAN KUOTA INTERNET / HP</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; color: #047857;">${formatRupiah(f.pengeluaranKuota)}</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">403. LUAS LANTAI BANGUNAN</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px;">${isBlank ? '.................... m²' : `${f.luasLantai || 0} m²`}</div>
            </td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">410. PENGELUARAN MAKANAN SEBULAN</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; color: #047857;">${formatRupiah(f.pengeluaranMakanan)}</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">404. BAHAN LANTAI TERLUAS</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; text-transform: uppercase;">${formatVal(f.bahanLantai)}</div>
            </td>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">411. PENGELUARAN NON-MAKANAN SEBULAN</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; color: #047857;">${formatRupiah(f.pengeluaranNonMakanan)}</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">405. BAHAN DINDING TERLUAS</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; text-transform: uppercase;">${formatVal(f.bahanDinding)}</div>
            </td>
            <td style="border: 1px solid #000000; padding: 8px; vertical-align: top; background-color: #eef2ff;" rowspan="3">
              <div style="font-size: 8pt; color: #4338ca; font-weight: bold;">412. REKAPITULASI ANGGOTA KELUARGA (ART)</div>
              <div style="font-weight: bold; font-size: 11pt; color: #4338ca; margin-top: 8px;">Jumlah Anggota Keluarga: ${isBlank ? '..........' : `${memberList.length} Jiwa`}</div>
              <div style="font-size: 8pt; color: #555555; margin-top: 8px; line-height: 1.4;">* Rincian lengkap nama, NIK, dan pekerjaan dicatat secara rinci pada Lembar 2 kuesioner ini.</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">406. BAHAN ATAP TERLUAS</div>
              <div style="font-weight: bold; font-size: 10pt; margin-top: 4px; text-transform: uppercase;">${formatVal(f.bahanAtap)}</div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; vertical-align: top;">
              <div style="font-size: 8pt; color: #555555; font-weight: bold;">407. SUMBER AIR MINUM UTAMA & PENERANGAN</div>
              <div style="font-size: 9pt; margin-top: 4px; line-height: 1.4;">
                <strong>Air Minum:</strong> ${isBlank ? '_________________________' : (f.sumberAirMinum || '-')}<br/>
                <strong>Penerangan:</strong> ${isBlank ? '_________________________' : (f.sumberPenerangan || '-')}<br/>
                <strong>ID PEL:</strong> ${isBlank ? '_________________________' : (f.noListrik || '-')}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table class="signature-table">
        <tr>
          <td>
            <p>${(localStorage.getItem('se2026_officer_role') || 'PPL') === 'PML' ? 'Pengawas (PML)' : 'Pencacah (PPL)'} Sensus</p>
            <p style="margin-top: 40px; font-weight: bold;">${localStorage.getItem('se2026_officer_name') || 'Andi Lutfi'}</p>
            <p style="font-size: 8pt; color: #555555;">ID Petugas: ${localStorage.getItem('se2026_officer_id') || 'SE2026-PAK-091'}</p>
          </td>
          <td>
            <p>Responden / Kepala Keluarga</p>
            <p style="margin-top: 40px; font-weight: bold;">${isBlank ? '___________________________' : (f.namaKepala || '___________________________')}</p>
            <p style="font-size: 8pt; color: #555555;">Tanggal: ${new Date().toLocaleDateString('id-ID')}</p>
          </td>
        </tr>
      </table>

      <!-- PAGE BREAK FOR PAGE 2 -->
      <div class="page-break"></div>

      <table class="header-table">
        <tr>
          <td style="border:none; text-align:left;">
            <div class="header-title">SENSUS EKONOMI 2026</div>
            <div class="header-subtitle">REPUBLIK INDONESIA - BADAN PUSAT STATISTIK (BPS)</div>
          </td>
          <td style="border:none; text-align:right; width: 120px;">
            <div class="doc-code">
              SE26.K2<br/>
              <span style="font-size: 8pt; font-weight: normal;">LEMBAR 2</span>
            </div>
          </td>
        </tr>
      </table>

      <div class="section-header">BLOK III: RINCIAN KETERANGAN ANGGOTA KELUARGA (ART)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 5%;">No</th>
            <th style="width: 25%;">Nama Lengkap & NIK</th>
            <th style="width: 15%;">Hubungan & JK</th>
            <th style="width: 15%;">Tgl Lahir / Nikah</th>
            <th style="width: 20%;">Sekolah & Ijazah</th>
            <th style="width: 20%;">Pekerjaan & Gaji</th>
          </tr>
        </thead>
        <tbody>
          ${members.map((ang: any, idx: number) => `
            <tr>
              <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
              <td>
                <strong>${isBlank ? '..................................................' : (ang.namaAnggota || '-')}</strong><br/>
                <span style="font-size: 7.5pt; color: #555555;">NIK: ${isBlank ? '............................' : (ang.nikAnggota || '-')}</span>
              </td>
              <td>
                ${isBlank ? '......................' : (ang.hubungan || '-')}<br/>
                <span style="font-size: 7.5pt; color: #4f46e5; font-weight: bold;">${isBlank ? '.....' : (ang.jk || '-')}</span>
              </td>
              <td style="text-align: center;">
                ${isBlank ? '......................' : (ang.tanggalLahir || '-')}<br/>
                <span style="font-size: 7.5pt; color: #555555;">${isBlank ? '.................' : (ang.statusPerkawinan || '-')}</span>
              </td>
              <td>
                ${isBlank ? '..................................' : (ang.partisipasiSekolah || '-')}<br/>
                <span style="font-size: 7.5pt; color: #555555;">Ijazah: ${isBlank ? '.....' : (ang.ijazah || '-')}</span>
              </td>
              <td>
                <strong>${isBlank ? '..................................' : (ang.pekerjaan || 'Tidak Bekerja')}</strong><br/>
                <span style="font-size: 7.5pt; color: #10b981; font-weight: bold;">Gaji: ${formatRupiah(ang.gaji)}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="section-header">BLOK II: UNIT USAHA EKONOMI RESPONDEN</div>
      ${businesses.length === 0 ? `
        <p style="font-style: italic; font-size: 9pt; color: #64748b; padding: 10px; border: 1px dashed #cbd5e1; text-align: center;">
          Keluarga responden menyatakan tidak memiliki unit usaha ekonomi aktif.
        </p>
      ` : `
        <table class="data-table usaha-table">
          <thead>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 25%;">Identitas Usaha & NIB</th>
              <th style="width: 20%;">KBLI & Kegiatan Utama</th>
              <th style="width: 15%;">Pekerja (L/P)</th>
              <th style="width: 15%;">Keuangan Bulanan</th>
              <th style="width: 20%;">Rincian Aset</th>
            </tr>
          </thead>
          <tbody>
            ${businesses.map((bus: any, idx: number) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                <td>
                  <strong>${isBlank ? '..................................................' : (bus.namaUsaha || '-')}</strong><br/>
                  <span style="font-size: 7.5pt; color: #555555;">NIB: ${isBlank ? '.....' : (bus.memilikiNib === 'Ya' ? 'Ada' : 'Tidak Ada')} | PJ: ${isBlank ? '.....' : (bus.nikPj || '-')}</span><br/>
                  <span style="font-size: 7.5pt; color: #64748b;">Alamat: ${isBlank ? '........................' : (bus.alamatUsaha || '-')}</span>
                </td>
                <td>
                  KBLI: ${isBlank ? '.....' : (bus.kbli || '-')}<br/>
                  <span style="font-size: 7.5pt; color: #555555;">Utama: ${isBlank ? '.....' : (bus.kegiatanUtama || '-')}</span><br/>
                  <span style="font-size: 7.5pt; color: #64748b;">Badan: ${isBlank ? '.....' : (bus.statusBadan || '-')}</span>
                </td>
                <td style="text-align: center;">
                  L: ${isBlank ? '...' : (bus.pekerjaLaki || 0)} Orang<br/>
                  P: ${isBlank ? '...' : (bus.pekerjaPerempuan || 0)} Orang
                </td>
                <td>
                  <span style="color: #047857; font-weight: bold;">In: ${formatRupiah(bus.pendapatanBulan)}</span><br/>
                  <span style="color: #be123c; font-size: 7.5pt;">Out: ${formatRupiah(bus.pengeluaranBulan)}</span>
                </td>
                <td style="font-size: 7.5pt; color: #475569;">
                  Emas: ${isBlank ? '..... g' : `${bus.asetEmas || 0} g`}<br/>
                  Motor: ${isBlank ? '..... u' : `${bus.asetMotor || 0} u`}<br/>
                  Mobil: ${isBlank ? '..... u' : `${bus.asetMobil || 0} u`}<br/>
                  Tanah: ${isBlank ? '..... m²' : `${bus.asetTanah || 0} m²`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}

      <table class="signature-table">
        <tr>
          <td>
            <p>${(localStorage.getItem('se2026_officer_role') || 'PPL') === 'PML' ? 'Pengawas (PML)' : 'Pencacah (PPL)'} Sensus</p>
            <p style="margin-top: 40px; font-weight: bold;">${localStorage.getItem('se2026_officer_name') || 'Andi Lutfi'}</p>
            <p style="font-size: 8pt; color: #555555;">ID Petugas: ${localStorage.getItem('se2026_officer_id') || 'SE2026-PAK-091'}</p>
          </td>
          <td>
            <p>Responden / Kepala Keluarga</p>
            <p style="margin-top: 40px; font-weight: bold;">${isBlank ? '___________________________' : (f.namaKepala || '___________________________')}</p>
          </td>
        </tr>
      </table>

    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/msword' });
  const filename = isBlank 
    ? 'Formulir_Kuesioner_Blanko_SE2026.doc' 
    : `Kuesioner_SE2026_${f.noKk || 'Sensus'}.doc`;

  saveAs(blob, filename);
}

