import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// Shared Gemini Client
let ai: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing. Please set it in Settings > Secrets.');
    }
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

function formatGeminiError(error: any, defaultMsg: string): string {
  const errStr = String(error.message || error);
  if (errStr.includes('429') || errStr.toLowerCase().includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
    return 'Batas kuota API Gemini (Rate Limit / Quota Exceeded 429) tercapai. Silakan coba beberapa saat lagi atau periksa kuota kunci API Anda di menu Settings > Secrets jika Anda menggunakan kunci API kustom.';
  }
  if (errStr.toLowerCase().includes('api_key') || errStr.toLowerCase().includes('api key') || errStr.toLowerCase().includes('invalid')) {
    return 'Kunci API Gemini tidak valid atau belum dikonfigurasi. Silakan periksa kunci API Anda di menu Settings > Secrets.';
  }
  return error.message || defaultMsg;
}

// 1. Text & Maps Grounding endpoint (Gemini 3.5-flash + Google Maps)
app.post('/api/gemini/text', async (req, res) => {
  try {
    const client = getGeminiClient();
    const { prompt, useMaps, lat, lng } = req.body;

    const config: any = {};
    if (useMaps) {
      config.tools = [{ googleMaps: {} }];
      if (lat && lng) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: Number(lat),
              longitude: Number(lng)
            }
          }
        };
      }
    }

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config
    });

    res.json({
      text: response.text,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || null
    });
  } catch (error: any) {
    console.error('Gemini text error:', error);
    res.status(500).json({ error: formatGeminiError(error, 'Error calling Gemini Text/Maps API') });
  }
});

// 2. High Thinking Mode endpoint (Gemini 3.1-pro-preview + HIGH thinking level)
app.post('/api/gemini/thinking', async (req, res) => {
  try {
    const client = getGeminiClient();
    const { prompt } = req.body;

    const response = await client.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH
        }
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini thinking error:', error);
    res.status(500).json({ error: formatGeminiError(error, 'Error calling Gemini Thinking API') });
  }
});

// 3. Image Generation endpoint (Gemini 3-pro-image-preview with customizable resolution)
app.post('/api/gemini/image', async (req, res) => {
  try {
    const client = getGeminiClient();
    const { prompt, size } = req.body; // size can be "1K", "2K", "4K"

    const response = await client.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: '16:9',
          imageSize: size || '1K'
        }
      }
    });

    let base64Image = '';
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        base64Image = part.inlineData.data;
        break;
      }
    }

    if (!base64Image) {
      throw new Error('Model did not return any image data.');
    }

    res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
  } catch (error: any) {
    console.error('Gemini image error:', error);
    res.status(500).json({ error: formatGeminiError(error, 'Error calling Gemini Image API') });
  }
});

// 4. Smart Auto-fill Extract endpoint (Extract census fields from free-text chat/interview transcript)
app.post('/api/gemini/autofill', async (req, res) => {
  try {
    const client = getGeminiClient();
    const { transcript } = req.body;

    const prompt = `Analisis teks transkrip percakapan wawancara sensus atau ringkasan data keluarga berikut dan ekstrak kolom-kolom data sensus dalam format JSON yang valid.
Format JSON harus persis mengikuti struktur ini (kembalikan nilai kosong atau null jika tidak disebutkan):
{
  "keluarga": {
    "noKk": "16 digit angka",
    "nikKepala": "16 digit angka",
    "namaKepala": "Nama lengkap kepala keluarga",
    "provinsi": "Nama provinsi (huruf kapital)",
    "kabKota": "Nama kabupaten/kota (huruf kapital)",
    "kecamatan": "Nama kecamatan (huruf kapital)",
    "desaKelurahan": "Nama desa/kelurahan (huruf kapital)",
    "jmlAnggota": "Jumlah anggota keluarga dalam angka",
    "jenisBangunan": "Pilih salah satu: 'Rumah Tinggal Biasa', 'Kontrakan/Kos', 'Ruko / Tempat Usaha'",
    "statusKepemilikan": "Pilih salah satu: 'Milik Sendiri', 'Sewa/Kontrak', 'Bebas Sewa'",
    "luasLantai": "Luas lantai dalam m2 (angka)",
    "bahanLantai": "Contoh: 'Keramik', 'Semen', 'Ubin'",
    "bahanDinding": "Contoh: 'Tembok/Semen', 'Kayu', 'Bambu'",
    "bahanAtap": "Contoh: 'Genteng', 'Asbes', 'Seng'",
    "sumberAirMinum": "Contoh: 'Leding/PAM', 'Sumur Terlindungi'",
    "sumberPenerangan": "Contoh: 'Listrik PLN 1300W', 'Listrik PLN 900W'",
    "pengeluaranMakanan": "Estimasi pengeluaran makanan per bulan (angka tanpa titik/koma)",
    "pengeluaranNonMakanan": "Estimasi pengeluaran non-makanan per bulan (angka tanpa titik/koma)",
    "noListrik": "ID pelanggan PLN / nomor token jika ada",
    "pengeluaranListrik": "Biaya listrik bulanan (angka)",
    "pengeluaranKuota": "Biaya kuota internet bulanan (angka)",
    "noHp": "Nomor HP aktif",
    "email": "Email aktif"
  },
  "anggota": [
    {
      "noUrut": "1",
      "nikAnggota": "16 digit angka NIK",
      "namaAnggota": "Nama lengkap anggota",
      "hubungan": "Hubungan dalam keluarga (contoh: 'Kepala Keluarga', 'Istri', 'Anak', 'Orang Tua / Mertua')",
      "jk": "Pilih: 'Laki-laki' atau 'Perempuan'",
      "tanggalLahir": "Format DD/MM/YYYY (contoh: 12/04/1981)",
      "statusPerkawinan": "Pilih: 'Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'",
      "partisipasiSekolah": "Pilih: 'Tidak sekolah lagi', 'Masih aktif sekolah', 'Belum pernah sekolah'",
      "ijazah": "Ijazah tertinggi, contoh: 'S1/Diploma IV', 'SMA/Sederajat', 'SMP/Sederajat', 'SD/Sederajat'",
      "pekerjaan": "Profesi atau pekerjaan utama saat ini",
      "gaji": "Gaji/upah bulanan dalam angka",
      "disabilitas": "Pilih: 'Tidak', 'Netra', 'Rungu/Wicara', 'Daksa', 'Mental'",
      "keluhanPenyakit": "Keluhan penyakit sebulan terakhir (contoh: 'Tidak Ada', 'Asma', 'Darah Tinggi')"
    }
  ],
  "usaha": [
    {
      "namaUsaha": "Nama unit usaha ekonomi",
      "alamatUsaha": "Alamat tempat usaha",
      "memilikiNib": "Ya atau Tidak",
      "statusBadan": "Pilih: 'Usaha Perseorangan', 'CV / Firma', 'PT', 'Koperasi'",
      "kegiatanUtama": "Deskripsi kegiatan utama usaha",
      "kbli": "5 digit kode KBLI jika diketahui (contoh: 56210)",
      "pekerjaLaki": "Jumlah pekerja laki-laki dibayar (angka)",
      "pekerjaPerempuan": "Jumlah pekerja perempuan dibayar (angka)",
      "pengeluaranBulan": "Biaya operasional usaha per bulan (angka)",
      "pendapatanBulan": "Pendapatan/omset usaha per bulan (angka)"
    }
  ]
}

Gunakan transkrip wawancara di bawah ini untuk mengekstrak data di atas. Pastikan format output hanya berisi JSON murni yang valid tanpa membungkusnya dalam markdown blocks atau teks penjelasan lainnya!

Berikut adalah transkripnya:
"${transcript}"`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '{}';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Gemini autofill error:', error);
    res.status(500).json({ error: formatGeminiError(error, 'Error calling Gemini Auto-fill API') });
  }
});

// Serve frontend assets or run in Vite middleware mode
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  // Serve static assets from dist
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // In development, dynamically load Vite dev server as middleware!
  console.log('Starting server in development mode with Vite dev middleware...');
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
