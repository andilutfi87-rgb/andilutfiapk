/**
 * Google Drive and Google Sheets API Integration
 * Communicates directly with Google REST APIs using the OAuth Access Token
 */

export interface CensusState {
  dataKeluarga: any[];
  dataAnggota: any[];
  dataUsaha: any[];
}

/**
 * Creates a file on Google Drive (Saves Sensus Backup as a JSON file)
 */
export async function saveBackupToDrive(accessToken: string, state: CensusState, filename?: string): Promise<any> {
  const name = filename || `se2026_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const metadata = {
    name,
    mimeType: 'application/json',
    description: 'Sensus Ekonomi 2026 Pro - Backup Data Terintegrasi'
  };

  const boundary = 'se2026_multipart_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(state, null, 2) +
    closeDelim;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive Upload Error: ${response.status} - ${errText}`);
  }

  return response.json();
}

/**
 * Lists backups in Google Drive with name starting with 'se2026_backup' or containing 'backup'
 */
export async function listDriveBackups(accessToken: string): Promise<any[]> {
  const q = "name contains 'se2026_backup' and mimeType = 'application/json' and trashed = false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=createdTime desc&fields=files(id,name,createdTime,size)`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive List Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Downloads a backup file's contents from Google Drive
 */
export async function downloadBackupFromDrive(accessToken: string, fileId: string): Promise<CensusState> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive Download Error: ${response.status} - ${errText}`);
  }

  return response.json();
}

/**
 * Creates a brand new Google Spreadsheet with sheets for Keluarga, Anggota, and Usaha
 * then writes the current census data to it.
 * Returns the spreadsheet details, including spreadsheetId and spreadsheetUrl.
 */
export async function exportToGoogleSheets(accessToken: string, state: CensusState): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create Spreadsheet with metadata
  const spreadsheetMeta = {
    properties: {
      title: `Sensus Ekonomi 2026 Pro - Ekspor ${new Date().toLocaleDateString('id-ID')}`
    },
    sheets: [
      { properties: { title: 'Data Keluarga' } },
      { properties: { title: 'Anggota Keluarga' } },
      { properties: { title: 'Data Usaha' } }
    ]
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(spreadsheetMeta)
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Google Sheets Create Error: ${createRes.status} - ${errText}`);
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl;

  // 2. Map data to rows
  // Header 1: Data Keluarga
  const keluargaHeader = [
    "No KK", "Nama Kepala Keluarga", "NIK Kepala Keluarga", "Provinsi", "Kabupaten/Kota", 
    "Kecamatan", "Desa/Kelurahan", "RT", "RW", "Alamat Sesuai", "Jumlah Anggota", "Jenis Bangunan", 
    "Status Kepemilikan", "Luas Lantai", "Bahan Lantai", "Bahan Dinding", "Bahan Atap", 
    "Sumber Air Minum", "Sumber Penerangan", "Pengeluaran Makanan", "Pengeluaran Non-Makanan", 
    "No Listrik", "Pengeluaran Listrik", "Pengeluaran Kuota", "No HP", "Email"
  ];
  const keluargaRows = state.dataKeluarga.map(item => [
    item.noKk || "", item.namaKepala || "", item.nikKepala || "", item.provinsi || "", item.kabKota || "",
    item.kecamatan || "", item.desaKelurahan || "", item.rt || "", item.rw || "", item.alamatSesuai || "Ya", item.jmlAnggota || "1",
    item.jenisBangunan || "", item.statusKepemilikan || "", item.luasLantai || "", item.bahanLantai || "",
    item.bahanDinding || "", item.bahanAtap || "", item.sumberAirMinum || "", item.sumberPenerangan || "",
    item.pengeluaranMakanan || "0", item.pengeluaranNonMakanan || "0", item.noListrik || "",
    item.pengeluaranListrik || "0", item.pengeluaranKuota || "0", item.noHp || "", item.email || ""
  ]);

  // Header 2: Anggota Keluarga
  const anggotaHeader = [
    "No KK", "No Urut", "NIK Anggota", "Nama Anggota", "Hubungan", "Jenis Kelamin", 
    "Tanggal Lahir", "Status Perkawinan", "Partisipasi Sekolah", "Ijazah Tertinggi", 
    "Profesi Pekerjaan Utama", "Kedudukan Pekerjaan", "Upah/Gaji Utama", "Omset Usaha Lainnya", 
    "Disabilitas", "Keluhan Penyakit"
  ];
  const anggotaRows = state.dataAnggota.map(item => [
    item.noKk || "", item.noUrut || "", item.nikAnggota || "", item.namaAnggota || "", item.hubungan || "",
    item.jk || "", item.tanggalLahir || "", item.statusPerkawinan || "", item.partisipasiSekolah || "",
    item.ijazah || "", item.pekerjaan || "", item.kedudukanPekerjaan || "", item.gaji || "0",
    item.omsetUsaha || "0", item.disabilitas || "Tidak", item.keluhanPenyakit || "Tidak Ada"
  ]);

  // Header 3: Data Usaha
  const usahaHeader = [
    "NIK Penanggung Jawab", "Nama Unit Usaha", "Alamat Fisik Usaha", "Memiliki NIB", 
    "Status Badan Usaha", "Deskripsi Kegiatan", "KBLI", "Pekerja Laki-laki", "Pekerja Perempuan", 
    "Total Pengeluaran Bulan", "Total Pendapatan Bulan", "Aset Emas", "Aset Motor", 
    "Aset Mobil", "Aset Tanah"
  ];
  const usahaRows = state.dataUsaha.map(item => [
    item.nikPj || "", item.namaUsaha || "", item.alamatUsaha || "", item.memilikiNib || "Tidak",
    item.statusBadan || "", item.kegiatanUtama || "", item.kbli || "", item.pekerjaLaki || "0",
    item.pekerjaPerempuan || "0", item.pengeluaranBulan || "0", item.pendapatanBulan || "0",
    item.asetEmas || "0", item.asetMotor || "0", item.asetMobil || "0", item.asetTanah || "0"
  ]);

  // 3. Batch Update spreadsheet values
  const dataPayload = {
    valueInputOption: "USER_ENTERED",
    data: [
      {
        range: "'Data Keluarga'!A1",
        values: [keluargaHeader, ...keluargaRows]
      },
      {
        range: "'Anggota Keluarga'!A1",
        values: [anggotaHeader, ...anggotaRows]
      },
      {
        range: "'Data Usaha'!A1",
        values: [usahaHeader, ...usahaRows]
      }
    ]
  };

  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dataPayload)
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Google Sheets Update Error: ${updateRes.status} - ${errText}`);
  }

  return { spreadsheetId, spreadsheetUrl };
}
