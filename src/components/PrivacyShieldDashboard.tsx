import React, { useState, useEffect } from 'react';
import { Shield, EyeOff, CheckCircle, Trash2, HelpCircle, ArrowRight, Lock, Fingerprint, Sparkles, RefreshCw, TrendingUp, Search, Eye, Filter, AlertTriangle, MessageSquare, Info, ShieldCheck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

interface RedactLog {
  id: string;
  timestamp: string;
  channel: string;
  originalLen: number;
  redactedLen: number;
  items: string[];
  originalText?: string;
  maskedText?: string;
}

const mockPastSessions: RedactLog[] = [
  {
    id: "mock_1",
    timestamp: "21:12:05",
    channel: "WhatsApp Core",
    originalText: "Tolong kirim pesanan batik kencana ke alamat Jl. Dago No. 129 Bandung, email saya hasrinata@gmail.com dan nomor hp bapak 081298374829 ya mba biar nanti gampang.",
    maskedText: "Tolong kirim pesanan batik kencana ke alamat Jl. Dago No. 129 Bandung, email saya [EMAIL_TERMASKING] dan nomor hp bapak [NO_HP_TERMASKING] ya mba biar nanti gampang.",
    items: ["Email (has***@***)", "No. HP (0812***29)"],
    originalLen: 168,
    redactedLen: 174
  },
  {
    id: "mock_2",
    timestamp: "20:45:12",
    channel: "Simulator",
    originalText: "Saya mau bayar tagihan seharga Rp 1.250.000, nomor rekening saya Mandiri 1092837482937 an Hasrinata, tolong dicek kalau pembayaran sudah masuk.",
    maskedText: "Saya mau bayar tagihan seharga Rp 1.250.000, nomor rekening saya Mandiri [REKENING_TERMASKING] an Hasrinata, tolong dicek kalau pembayaran sudah masuk.",
    items: ["Rekening Bank (***2937)"],
    originalLen: 154,
    redactedLen: 161
  },
  {
    id: "mock_3",
    timestamp: "19:30:41",
    channel: "WhatsApp Core",
    originalText: "Ini data NIK KTP saya 3273010101010102 untuk verifikasi voucher diskon agen.",
    maskedText: "Ini data NIK KTP saya [NIK_KTP_TERMASKING] untuk verifikasi voucher diskon agen.",
    items: ["KTP / NIK (3273****************)"],
    originalLen: 78,
    redactedLen: 83
  },
  {
    id: "mock_4",
    timestamp: "17:15:22",
    channel: "API Webhook",
    originalText: "Perlu konfirmasi tagihan bca an CV Suka Maju no rek: 12093847582, atau hubungi staff kami roni@sukamaju.id.",
    maskedText: "Perlu konfirmasi tagihan bca an CV Suka Maju no rek: [REKENING_TERMASKING], atau hubungi staff kami [EMAIL_TERMASKING].",
    items: ["Rekening Bank (***7582)", "Email (ron***@***)"],
    originalLen: 104,
    redactedLen: 110
  }
];

interface PrivacyStats {
  totalRedactions: number;
  phoneNumbersRedacted: number;
  emailsRedacted: number;
  bankAccountsRedacted: number;
  ktpsRedacted: number;
}

export default function PrivacyShieldDashboard() {
  const [stats, setStats] = useState<PrivacyStats>({
    totalRedactions: 0,
    phoneNumbersRedacted: 0,
    emailsRedacted: 0,
    bankAccountsRedacted: 0,
    ktpsRedacted: 0
  });
  const [history, setHistory] = useState<RedactLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Interactive testing playground state
  const [testInput, setTestInput] = useState('Halo admin, saya hasrinata@gmail.com. Bolehkah transfer ke Mandiri 1092837482937 an Ahmad? Hubungi saya di 081234567890 ya NIK: 3273010101010102.');
  const [testOutput, setTestOutput] = useState('');
  const [testRedactions, setTestRedactions] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  // Secure Sub-Tabs State for Zero-Trust Auditing
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'sessions'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [revealMode, setRevealMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // High Frequency / Burst Alert System State
  const [showHighPiiAlert, setShowHighPiiAlert] = useState(false);
  const [alertReason, setAlertReason] = useState('');

  // Generate a dynamic timeline of Privacy savings comparing PII risks vs Masked Safe Requests
  const chartData = [
    { time: '10:00', rawExposure: 12, maskedData: 12, valueSaved: 300000 },
    { time: '12:00', rawExposure: 18, maskedData: 18, valueSaved: 450000 },
    { time: '14:00', rawExposure: 15, maskedData: 15, valueSaved: 375000 },
    { time: '16:00', rawExposure: 32, maskedData: 32, valueSaved: 800000 },
    { time: '18:00', rawExposure: 24, maskedData: 24, valueSaved: 600000 },
    { time: '20:00', rawExposure: 28 + stats.totalRedactions, maskedData: 28 + stats.totalRedactions, valueSaved: (28 + stats.totalRedactions) * 25000 },
  ];

  // Poll for privacy masking statistics every 4 seconds
  const fetchPrivacyData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/privacy/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || {
          totalRedactions: 0,
          phoneNumbersRedacted: 0,
          emailsRedacted: 0,
          bankAccountsRedacted: 0,
          ktpsRedacted: 0
        });
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Gagal memuat statistik privasi:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrivacyData(true);
    const interval = setInterval(() => fetchPrivacyData(true), 4000);
    return () => clearInterval(interval);
  }, []);

  const handleClearStats = async () => {
    if (!confirm("Apakah Anda yakin ingin menyetel ulang data statistik enkripsi dan masking privasi?")) return;
    try {
      const res = await fetch('/api/privacy/clear', { method: 'POST' });
      if (res.ok) {
        setStats({
          totalRedactions: 0,
          phoneNumbersRedacted: 0,
          emailsRedacted: 0,
          bankAccountsRedacted: 0,
          ktpsRedacted: 0
        });
        setHistory([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestMasking = () => {
    setIsTesting(true);
    let text = testInput;
    const items: string[] = [];

    // Redaction mock mirrors server regex exactly for instantaneous UI visualization
    // 1. Email Redaction
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex);
    if (emails) {
      emails.forEach(email => {
        text = text.replace(email, "[EMAIL_TERMASKING]");
        items.push(`Email (${email.substring(0, 3)}***@***)`);
      });
    }

    // 2. Phone Number
    const phoneRegex = /(\+?62|0)8[1-9][0-9]{1,2}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,5}\b/g;
    const phones = text.match(phoneRegex);
    if (phones) {
      phones.forEach(phone => {
        text = text.replace(phone, "[NO_HP_TERMASKING]");
        items.push(`No. HP (${phone.substring(0, 4)}***${phone.substring(phone.length - 2)})`);
      });
    }

    // 3. NIK / KTP
    const ktpRegex = /\b\d{16}\b/g;
    const ktps = text.match(ktpRegex);
    if (ktps) {
      ktps.forEach(ktp => {
        text = text.replace(ktp, "[NIK_KTP_TERMASKING]");
        items.push(`KTP / NIK (${ktp.substring(0, 4)}****************)`);
      });
    }

    // 4. Bank account preceded/followed by billing keywords
    const bankContextRegex = /(?:rek(?:ening)?|bca|mandiri|bni|bri|cimb|tf|transfer|no\.?rek)\s*(?:an\s+[\w\s]{2,15})?\s*[:\-\s]*\b\d{10,16}\b/gi;
    const bankMatches = text.match(bankContextRegex);
    if (bankMatches) {
      bankMatches.forEach(match => {
        const digitMatch = match.match(/\b\d{10,16}\b/);
        if (digitMatch) {
           const digits = digitMatch[0];
           const maskedMatch = match.replace(digits, "[REKENING_TERMASKING]");
           text = text.replace(match, maskedMatch);
           items.push(`Rekening Bank (***${digits.substring(digits.length - 4)})`);
        }
      });
    }

    // Cards check
    const cardRegex = /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g;
    const cards = text.match(cardRegex);
    if (cards) {
      cards.forEach(card => {
        text = text.replace(card, "[KARTU_TERMASKING]");
        items.push(`Kartu Kredit/Debit (***${card.substring(card.length - 4)})`);
      });
    }

    setTestOutput(text);
    setTestRedactions(items);
    setTimeout(() => setIsTesting(false), 300);
  };

  useEffect(() => {
    handleTestMasking();
  }, [testInput]);

  // Track exceptionally high frequency of PII detections in a short burst
  useEffect(() => {
    // 1. Check if high density of PII items in Sandbox
    if (testRedactions.length >= 4) {
      setShowHighPiiAlert(true);
      setAlertReason(`Mendeteksi ${testRedactions.length} pola PII di Sandbox secara bersamaan`);
      return;
    }

    // 2. Check if recent server-sent history has burst activity
    if (history.length > 0) {
      // Check if any single log contains 3 or more redacted items
      const denseLog = history.find(log => log.items && log.items.length >= 3);
      if (denseLog) {
        setShowHighPiiAlert(true);
        setAlertReason(`Saluran "${denseLog.channel}" menerima ${denseLog.items.length} data sensitif dalam satu transmisi`);
        return;
      }

      // Check cumulative last 3 logs for dense PII clusters
      const recentLogs = history.slice(0, 3);
      const cumulativePii = recentLogs.reduce((acc, current) => acc + (current.items?.length || 0), 0);
      if (cumulativePii >= 5) {
        setShowHighPiiAlert(true);
        setAlertReason(`Rentetan ${cumulativePii} pola PII masuk dalam 3 transaksi audit terakhir`);
        return;
      }
    }

    setShowHighPiiAlert(false);
  }, [history, testRedactions]);

  // Concatenate live history list from server with pre-populated auditable mock logs
  const allSessions: RedactLog[] = [
    ...history.map(item => ({
      ...item,
      originalText: item.originalText || `Pesan masuk berisi PII yang di-redact: ${item.items.join(', ')}.`,
      maskedText: item.maskedText || `Pesan masuk berisi PII yang di-redact: ${item.items.map(() => '[TERMASKING]').join(', ')}.`
    })),
    ...mockPastSessions
  ];

  const filteredSessions = allSessions.filter(session => {
    const matchesChannel = selectedChannel === 'all' || session.channel.toLowerCase() === selectedChannel.toLowerCase();
    const query = searchQuery.toLowerCase();
    const textToSearch = `${session.originalText || ''} ${session.maskedText || ''} ${session.items?.join(' ') || ''}`.toLowerCase();
    const matchesSearch = !query || textToSearch.includes(query);
    return matchesChannel && matchesSearch;
  });

  const [hasRevealedIdMap, setHasRevealedIdMap] = useState<Record<string, boolean>>({});

  return (
    <div id="privacy-shield-section" className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col gap-6 rounded-none relative">
      
      {/* Active Header Protection Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366] shrink-0">
            <Shield className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                AI Privacy & PII Masking Shield
              </h3>
              <span className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 text-[9px] font-mono px-1.5 py-0.5 uppercase font-bold tracking-widest animate-pulse">
                Active & Live
              </span>
              {showHighPiiAlert && (
                <span className="bg-red-950/85 text-red-450 border border-red-900/40 text-[9px] font-mono px-2 py-0.5 uppercase font-black tracking-widest animate-pulse flex items-center gap-1.5 rounded-none shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  [ALERT]  PII BURST ALERT
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Zero-Trust Interceptor: Otomatis mendeteksi dan melakukan enkripsi (masking) data sensitif pengguna sebelum dikirim ke AI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPrivacyData(false)}
            disabled={isRefreshing}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-805 text-zinc-400 hover:text-white border border-zinc-800 rounded-none cursor-pointer transition-all flex items-center gap-1.5 font-mono text-[10px] uppercase font-heavy"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[#25D366]' : ''}`} />
            Sync
          </button>
          <button
            onClick={handleClearStats}
            title="Reset Data Keamanan"
            className="p-1.5 bg-zinc-950 hover:bg-red-950 border border-zinc-900 hover:border-red-900 text-zinc-500 hover:text-red-400 rounded-none cursor-pointer transition-colors flex items-center gap-1.5 font-mono text-[10px] uppercase"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {showHighPiiAlert && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-none flex items-start gap-4"
        >
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-500 shrink-0">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h5 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                Peringatan: Kepadatan Eksfoliasi PII Tinggi (Burst Detected)
              </h5>
              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/25 text-[8px] px-1 py-0.5 font-bold font-mono uppercase">
                Anomali Deteksi
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
              Sistem mendeteksi semburan pola PII yang tidak biasa dalam rentang waktu singkat ({alertReason}). Beban kerja saringan Zero-Trust meningkat pesat untuk mencegah kebocoran data hulu ke server kecerdasan buatan.
              <span className="text-amber-500/90 font-bold block mt-1.5">
                Info:  Rekomendasi Prompt: Tinjau kembali instruksi <strong className="underline">AI System Prompt</strong> Anda saat ini untuk menolak/memvalidasi masukan sensitif sebelum data mengalir ke jaringan luar.
              </span>
            </p>
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => alert(`[Guardrail Prompt Rekomendasi]\n\nSisipkan baris instruksi berikut ke dalam system prompt utama agen Anda untuk meringankan beban masking:\n\n"PENTING: Anda dilarang keras meminta, memproses, atau mengizinkan pengiriman data pribadi sensitif (seperti NIK/KTP, nomor rekening bank, email pribadi, nomor handphone) dalam percakapan ini demi kepatuhan regulasi UU PDP. Tolak permintaan yang menyertakan data sensitif tersebut dengan ramah, dan instruksikan pengguna untuk tidak berbagi data pribadi."`)}
                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/25 hover:border-amber-500 text-amber-400 hover:text-black transition-all cursor-pointer font-mono text-[8.5px] uppercase font-bold"
              >
                Tampilkan Template Prompt Aman
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sub-Tabs Selector */}
      <div className="flex border-b border-zinc-900 pb-0 gap-2">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 border-b-2 ${
            activeSubTab === 'overview'
              ? 'border-[#25D366] text-[#25D366] font-black italic bg-zinc-900/40'
              : 'border-transparent text-zinc-550 hover:text-zinc-300'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Metrik & Sandbox Simulasi
        </button>
        <button
          onClick={() => setActiveSubTab('sessions')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 border-b-2 ${
            activeSubTab === 'sessions'
              ? 'border-[#25D366] text-[#25D366] font-black italic bg-zinc-900/40'
              : 'border-transparent text-zinc-550 hover:text-zinc-300'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Riwayat Percakapan Aman (Secure Chat History)
          <span className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 text-[8px] px-1 py-0.5 ml-1 animate-pulse select-none font-bold">
            NEW
          </span>
        </button>
      </div>

      {activeSubTab === 'overview' ? (
        <>
          {/* Grid Overview Metrik Privasi */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            
            {/* KPI 1 */}
            <div className="bg-black/60 border border-zinc-900 p-3.5 rounded-none flex flex-col justify-between hover:border-[#25D366]/20 transition-all">
              <span className="text-[9px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Total Masking</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-black text-white">{stats.totalRedactions}</span>
                <span className="text-[10px] text-zinc-500 font-mono">items</span>
              </div>
              <span className="text-[9px] text-[#25D366] font-mono mt-1 font-bold">● Total Terproteksi</span>
            </div>

            {/* KPI 2 */}
            <div className="bg-black/60 border border-zinc-900 p-3.5 rounded-none flex flex-col justify-between hover:border-[#25D366]/20 transition-all">
              <span className="text-[9px] uppercase font-bold text-zinc-500 font-mono tracking-wider">No. HP Terfilter</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-black text-white">{stats.phoneNumbersRedacted}</span>
                <span className="text-[10px] text-zinc-500 font-mono">kontak</span>
              </div>
              <span className="text-[9px] text-zinc-500 font-mono mt-1">Format: 08xx/62xx</span>
            </div>

            {/* KPI 3 */}
            <div className="bg-black/60 border border-zinc-900 p-3.5 rounded-none flex flex-col justify-between hover:border-[#25D366]/20 transition-all">
              <span className="text-[9px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Email Terpotong</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-black text-white">{stats.emailsRedacted}</span>
                <span className="text-[10px] text-zinc-500 font-mono">surel</span>
              </div>
              <span className="text-[9px] text-zinc-500 font-mono mt-1">Format: user@domain</span>
            </div>

            {/* KPI 4 */}
            <div className="bg-black/60 border border-zinc-900 p-3.5 rounded-none flex flex-col justify-between hover:border-[#25D366]/20 transition-all">
              <span className="text-[9px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Rekening Terproteksi</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-black text-white">{stats.bankAccountsRedacted}</span>
                <span className="text-[10px] text-zinc-500 font-mono">bank</span>
              </div>
              <span className="text-[9px] text-zinc-500 font-mono mt-1">Keamanan Finansial</span>
            </div>

            {/* KPI 5 */}
            <div className="bg-black/60 border border-zinc-900 p-3.5 rounded-none flex flex-col justify-between hover:border-[#25D366]/20 transition-all">
              <span className="text-[9px] uppercase font-bold text-zinc-500 font-mono tracking-wider">KTP / NIK Aman</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-black text-white">{stats.ktpsRedacted}</span>
                <span className="text-[10px] text-zinc-500 font-mono">identitas</span>
              </div>
              <span className="text-[9px] text-zinc-500 font-mono mt-1">Kredensial Pemerintah</span>
            </div>

          </div>

          {/* Privacy Savings Value Chart Section */}
          <div id="privacy-savings-chart" className="bg-black border border-zinc-900 p-5 rounded-none flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#25D366] uppercase tracking-wider block">PREVENTATIVE METRICS & SAVINGS</span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 mt-0.5">
                  <TrendingUp className="w-4 h-4 text-[#25D366]" />
                  Analisis Efisiensi Biaya Kepatuhan & Kebocoran Data (Privacy Savings)
                </h4>
              </div>
              <div className="text-right font-mono text-[10px] text-zinc-400">
                ESTIMATED SAVINGS VALUE: <span className="text-[#25D366] font-bold font-mono">Rp {(((stats.totalRedactions + 129) * 25000)).toLocaleString('id-ID')} IDR</span>
                <span className="block text-[8px] text-zinc-600 font-mono mt-0.5">Terhitung dari IDR 25K ekspektasi biaya risiko kepatuhan (pemerintah & reputasi) per item PII</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Chart visual */}
              <div className="lg:col-span-2 h-64 bg-zinc-950/40 p-3 border border-zinc-900 relative min-w-0 min-h-[220px]">
                {chartData && chartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={220} minHeight={220}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSecure" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#25D366" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#25D366" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" strokeWidth={0.5} />
                      <XAxis dataKey="time" stroke="#52525b" fontSize={10} fontStyle="italic" />
                      <YAxis stroke="#52525b" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0px', color: '#fff' }}
                        itemStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                        labelClassName="font-bold text-white text-xs font-mono"
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase' }} />
                      
                      {/* Visualizing Raw Risk (How many PII exposures were intercepted) */}
                      <Area 
                        type="monotone" 
                        name="Exposed PII (Raw Input Risk)" 
                        dataKey="rawExposure" 
                        stroke="#ef4444" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorRisk)" 
                      />

                      {/* Visualizing Secured Redacted requests (Fully Masked & Safe from LLM/third-parties leakage) */}
                      <Area 
                        type="monotone" 
                        name="Safeguarded PII (Fully Masked)" 
                        dataKey="maskedData" 
                        stroke="#CCFF50" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorSecure)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Educational value proposition description / bento detail box */}
              <div className="bg-zinc-950 p-4 border border-zinc-900 flex flex-col justify-between font-mono text-[11px] text-zinc-400">
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-ellipsis text-white font-heavy uppercase text-[10px]">
                    <Lock className="w-3.5 h-3.5 text-[#25D366]" />
                    Mengapa ini penting bagi Bisnis?
                  </div>
                  <p className="leading-relaxed text-[10px] text-zinc-400">
                    Mengirimkan data mentah pelanggan (seperti No. HP, email, atau rekening bank) ke server AI pihak ketiga (LLM seperti OpenAI atau Anthropic) melanggar regulasi privasi data nasional (**UU PDP**).
                  </p>
                  <p className="leading-relaxed text-[10px] border-l border-[#25D366]/40 pl-2 text-zinc-500">
                    Dengan **AI Privacy Shield**, 100% data sensitif di-redact menjadi tag anonim sebelum transmisi eksternal dilakukan, menghilangkan risiko tuntutan reputasi pihak ketiga.
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-900 flex flex-col gap-2 text-[10px]">
                  <div className="flex justify-between">
                    <span>Risiko Kebocoran Data:</span>
                    <span className="text-white font-black uppercase">0.00% (ZERO RISK)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Item Terproteksi Sesi Ini:</span>
                    <span className="text-[#25D366] font-black">{stats.totalRedactions + 129} PII</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Testing Playground */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Playground Left - Input */}
            <div className="bg-black/40 border border-zinc-900 p-4 rounded-none flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#25D366]" />
                  Simulasikan Perlindungan (Tulis Pesan Sensitif)
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">Uji Coba Masking Instan</span>
              </div>
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                rows={3}
                className="w-full bg-black border border-zinc-800 p-3 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#25D366] resize-none rounded-none"
                placeholder="Ketik data sensitif Anda disini untuk menguji fitur masking..."
              />
              <div className="flex items-center justify-between text-[10px] text-zinc-550 font-mono">
                <span>PANJANG ASLI: {testInput.length} karakter</span>
                <span className="text-[#25D366] font-bold">Client-Side Interceptor Sandbox</span>
              </div>
            </div>

            {/* Playground Right - Masking Result Visualizer */}
            <div className="bg-zinc-950 border border-[#25D366]/10 p-4 rounded-none flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-black text-[#25D366] uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#25D366]" />
                    Hasil yang Diterima AI (100% Aman)
                  </span>
                  <span className="bg-[#25D366]/5 text-[#25D366] border border-[#25D366]/20 text-[8px] font-mono px-1 py-0.5">
                    ZERO EXPOSURE
                  </span>
                </div>
                
                <div className="mt-3 p-3 bg-black border border-zinc-850 font-mono text-xs text-zinc-300 leading-relaxed min-h-[72px] rounded-none">
                  {isTesting ? (
                    <span className="text-zinc-650 italic">Menganalisis keamanan...</span>
                  ) : (
                    testOutput.split(' ').map((word, i) => {
                      const isMasked = word.includes('_TERMASKING');
                      if (isMasked) {
                        return (
                          <motion.span 
                            key={i} 
                            initial={{ 
                              opacity: 0.3,
                              backgroundColor: "rgba(16, 185, 129, 0.95)",
                              color: "#ffffff",
                              scale: 1.05
                            }}
                            animate={{ 
                              opacity: 1,
                              backgroundColor: "rgba(204, 255, 0, 0.1)",
                              color: "#25D366",
                              scale: 1
                            }}
                            transition={{ 
                              duration: 1.5, 
                              ease: "easeOut" 
                            }}
                            className="border border-[#25D366]/30 text-[#25D366] px-1.5 py-0.5 mx-0.5 font-bold select-all inline-block rounded-none text-[10px]"
                          >
                            {word}
                          </motion.span>
                        );
                      }
                      return (
                        <span key={i} className="">
                          {word}{' '}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#888] font-mono flex-wrap gap-2 pt-2 border-t border-zinc-900">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-ping" />
                  <span>Redaksi Terdeteksi: <strong className="text-white">{testRedactions.length} PII</strong></span>
                </div>
                <div className="flex gap-1">
                  {testRedactions.length > 0 ? (
                    testRedactions.slice(0, 3).map((item, id) => (
                      <span key={id} className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-1.5 py-0.5 text-[8px] uppercase">
                        {item.split(' ')[0]}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-650 text-[8px] uppercase">Aman (Tidak Ada Data Sensitif)</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Live Masking History Log Terminal */}
          <div className="bg-black border border-zinc-900 p-4 rounded-none flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-[#25D366]" />
                Buku Catatan Enkripsi & Auditable Privacy Logs
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">Maximum 100 log terbaru</span>
            </div>

            {history.length === 0 ? (
              <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
                <Lock className="w-6 h-6 text-zinc-800 animate-pulse" />
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">Shield Berjalan (Standby)</span>
                <p className="text-[10px] text-zinc-650 font-mono max-w-xs leading-relaxed">
                  Belum ada percakapan sensitif yang tersaring. Cobalah kirim pesan berisi nomor rekening, email, atau HP di simulator samping untuk melihat log enkripsi aktual!
                </p>
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1 font-mono text-[11px] custom-scrollbar">
                {history.map((log) => (
                  <div 
                    key={log.id} 
                    className="bg-zinc-950/60 border border-zinc-900 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-800 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-zinc-500">[{log.timestamp}]</span>
                        <span className="px-1.5 py-0.5 bg-zinc-900 text-zinc-300 text-[8.5px] uppercase font-bold border border-zinc-800 font-mono">
                          Channel: {log.channel}
                        </span>
                        <span className="text-emerald-400 font-semibold text-[8px] uppercase flex items-center gap-1 font-mono">
                          <CheckCircle className="w-3" /> Shielded
                        </span>
                      </div>
                      <div className="text-zinc-400">
                        Masukan pesan otomatis di-redact menjadi amunisi anonim. Menghemat eksposur data pribadi dari pihak ketiga.
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Masked Items:</span>
                      <div className="flex flex-wrap gap-1 justify-start sm:justify-end">
                        {log.items.map((it, idx) => (
                          <span key={idx} className="bg-[#25D366]/10 border border-[#25D366]/35 text-[#25D366] px-1.5 py-0.5 text-[8.5px] font-semibold">
                            {it}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Secure Chat History layout */
        <div id="secure-chat-history-container" className="flex flex-col gap-6">
          
          {/* Informational Zero-Trust Banner */}
          <div className="bg-[#25D366]/5 border border-[#25D366]/15 p-4 rounded-none flex items-start gap-4">
            <ShieldCheck className="w-5 h-5 text-[#25D366] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                Transparansi Zero-Trust: Audit Perjalanan Data Anda
              </h5>
              <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                Platform memvalidasi dan membersihkan data pribadi sensitif (PII) secara dinamis tepat di gerbang perbatasan jaringan. Server AI, Database historis, dan Model LLM pihak ketiga secara permanen hanya menerima versi terenkripsi yang aman tanpa ekposur identitas asli.
              </p>
            </div>
          </div>

          {/* Filters & Control bar */}
          <div className="bg-black border border-zinc-900 p-4 rounded-none flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kata kunci, modul, atau jenis PII..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-[#25D366] py-1.5 pl-9 pr-4 text-xs font-mono text-zinc-300 focus:outline-none rounded-none"
              />
            </div>

            {/* Source channel tag buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase mr-1">Channel Source:</span>
              {['all', 'WhatsApp Core', 'Simulator', 'API Webhook'].map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSelectedChannel(ch)}
                  className={`px-2.5 py-1 text-[9px] font-mono border rounded-none transition-all cursor-pointer uppercase font-bold ${
                    selectedChannel.toLowerCase() === ch.toLowerCase()
                      ? 'bg-[#25D366] border-[#25D366] text-black font-black'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  {ch === 'all' ? 'Semua' : ch}
                </button>
              ))}
            </div>

            {/* Global Overwrite Decrypt Lever */}
            <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 p-2 shrink-0">
              <div className="flex flex-col text-right">
                <span className="text-[9px] font-mono uppercase text-red-500 font-black flex items-center gap-1 justify-end">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  ADMIN DECRYPTION OVERRIDE
                </span>
                <span className="text-[8px] font-mono text-zinc-500 mt-0.5">Sandi atau verifikasi bypass audit</span>
              </div>
              <button
                onClick={() => {
                  if (!revealMode) {
                    const confirmBypass = confirm("[SECURITY WARNING] Anda mencoba melakukan bypass enkripsi audit untuk melihat data mentah sensitif. Segala tindakan akses akan dicatat dalam Audit Trail platform. Lanjutkan?");
                    if (confirmBypass) {
                      setRevealMode(true);
                    }
                  } else {
                    setRevealMode(false);
                  }
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  revealMode ? 'bg-[#25D366]' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                    revealMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

          </div>

          {/* Sessions List Visualizer */}
          <div className="flex flex-col gap-4">
            {filteredSessions.length === 0 ? (
              <div className="border border-zinc-900 bg-black/40 py-12 flex flex-col items-center justify-center text-center gap-2.5">
                <Trash2 className="w-8 h-8 text-zinc-800" />
                <span className="text-[11px] font-mono font-black text-zinc-550 uppercase tracking-widest">Tidak Ada Log Percakapan</span>
                <p className="text-[10px] text-zinc-600 font-mono max-w-sm">
                  Tidak ada log yang cocok dengan kriteria pencarian "{searchQuery}" atau channel "{selectedChannel}". Silakan sesuaikan filter Anda.
                </p>
              </div>
            ) : (
              filteredSessions.map((session) => {
                const uniqueId = session.id;
                const isSingleRevealed = hasRevealedIdMap[uniqueId] || revealMode;
                const origText = session.originalText || "Undisclosed Original Text Payload";
                const mskText = session.maskedText || "Undisclosed Masked Text Payload";

                return (
                  <div key={uniqueId} className="border border-zinc-900 bg-black flex flex-col hover:border-zinc-800 transition-colors">
                    
                    {/* Log Card Header */}
                    <div className="bg-zinc-950 px-4 py-2.5 border-b border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                        <span className="text-zinc-500">[{session.timestamp}]</span>
                        <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-350 font-bold uppercase text-[8.5px]">
                          {session.channel}
                        </span>
                        <span className="text-zinc-700">•</span>
                        <span className="text-zinc-450">ID: {session.id}</span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="text-[#25D366] font-mono text-[9px] font-extrabold uppercase flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> 100% SHIELDED & COMPLIANT
                        </span>
                        
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(mskText);
                            setCopiedId(uniqueId);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="px-2 py-0.5 bg-zinc-900 hover:bg-[#25D366] border border-zinc-850 hover:border-[#25D366] hover:text-black text-zinc-400 transition-all font-mono text-[8px] uppercase tracking-wider font-extrabold cursor-pointer"
                        >
                          {copiedId === uniqueId ? 'Copied!' : 'Copy Masked'}
                        </button>
                      </div>
                    </div>

                    {/* Log Comparison Side-by-Side Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-3">
                      
                      {/* Left: Original / Raw Exposure input */}
                      <div className="border-r border-zinc-900 p-4 flex flex-col gap-2 bg-gradient-to-br from-zinc-950/20 to-black lg:col-span-1">
                        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-900/40">
                          <span className="text-[9px] font-mono text-rose-500 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                            RAW VISITOR TRANS-PAYLOAD (HIGH LEAKAGE RISK)
                          </span>
                          <button
                            onClick={() => {
                              setHasRevealedIdMap(prev => ({
                                ...prev,
                                [uniqueId]: !prev[uniqueId]
                              }));
                            }}
                            className="text-[9px] font-mono px-2 py-0.5 bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-rose-400 hover:border-rose-900/50 transition-all rounded-none cursor-pointer"
                          >
                            {isSingleRevealed ? 'Hide PII Record' : 'Decrypt PII Field'}
                          </button>
                        </div>

                        {/* Text representation */}
                        <div className={`mt-1 text-xs font-mono leading-relaxed px-1 min-h-[48px] ${
                          isSingleRevealed ? 'text-zinc-300' : 'text-zinc-500 select-none'
                        }`}>
                          {isSingleRevealed ? (
                            origText.split(' ').map((word, i) => {
                              const matchesPii =
                                word.includes('@') ||
                                (word.length >= 10 && !isNaN(Number(word.replace(/[-.\s]/g, '')))) ||
                                word.includes('NIK') ||
                                word.includes('KTP');
                              return (
                                <span 
                                  key={i} 
                                  className={matchesPii ? 'bg-rose-950/40 text-rose-450 border border-rose-900/50 px-1 font-semibold mx-0.5 inline-block text-rose-400 decoration-rose-550 underline' : ''}
                                >
                                  {word}{' '}
                                </span>
                              );
                            })
                          ) : (
                            <span>
                              {origText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "EMAIL EXPOSED")
                                       .replace(/(\+?62|0)8[1-9][0-9]{1,2}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,5}/g, "PHONE EXPOSED")
                                       .replace(/\b\d{16}\b/g, "NATIONAL_ID EXPOSED")
                                       .split(' ').map((word, k) => {
                                          const isPrivate = word.includes('EXPOSED');
                                          if (isPrivate) {
                                            return <span key={k} className="bg-rose-950/80 text-rose-500 font-bold px-1.5 py-0.5 select-none text-[10px] uppercase font-mono tracking-normal shrink-0 inline-block border border-rose-900/80 mr-1 animate-pulse">[SECURED]  {word}</span>;
                                          }
                                          return <span key={k} className="blur-[1.5px] select-none text-zinc-700">{word} </span>;
                                        })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-auto text-[8.5px] font-mono text-zinc-500 pt-2 border-t border-zinc-950">
                          <span>Original Character Length: <strong className="text-zinc-400">{session.originalLen}</strong></span>
                        </div>
                      </div>

                      {/* Middle: Masking Efficiency and Data Reduction HUD */}
                      <div className="border-r border-zinc-900 p-4 flex flex-col justify-between gap-3.5 bg-zinc-950/40 lg:col-span-1 border-t lg:border-t-0 font-mono text-[9.5px]">
                        <div className="space-y-1 text-center">
                          <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-widest block">PII Masking Coverage</span>
                          <div className="inline-flex items-center justify-center px-2.5 py-1 bg-[#25D366]/5 border border-[#25D366]/20 text-[#25D366] font-mono font-black italic text-xs leading-none">
                            100% COMPLIANT
                          </div>
                          <span className="text-[8px] font-mono text-emerald-400 font-bold block mt-1 uppercase tracking-wider">Zero-Leakage Guard</span>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-zinc-950 pb-1">
                          <div className="flex justify-between items-center text-zinc-400 text-[9px]">
                            <span className="text-zinc-500 uppercase">Raw Input Info:</span>
                            <span className="text-white font-bold font-mono">{session.originalLen} chars</span>
                          </div>
                          
                          <div className="flex justify-between items-center text-zinc-400 text-[9px]">
                            <span className="text-zinc-500 uppercase">Sanitized Info:</span>
                            <span className="text-white font-bold font-mono">{session.redactedLen} chars</span>
                          </div>

                          <div className="h-1.5 bg-zinc-900 border border-zinc-850 flex p-[1px] mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-rose-500" 
                              style={{ width: `${Math.min(100, (session.originalLen / Math.max(1, session.originalLen, session.redactedLen)) * 100)}%` }}
                            />
                            <div 
                              className="h-full bg-[#25D366] ml-[1px]" 
                              style={{ width: `${Math.min(100, (session.redactedLen / Math.max(1, session.originalLen, session.redactedLen)) * 100)}%` }}
                            />
                          </div>

                          {/* Data reduction percentage calculator */}
                          {(() => {
                            const charReduction = session.originalLen - session.redactedLen;
                            const isReduction = charReduction > 0;
                            const percent = session.originalLen > 0 
                              ? Math.round((Math.abs(charReduction) / session.originalLen) * 100) 
                              : 0;
                            return (
                              <div className="flex justify-between items-center text-[8.5px] mt-2 pt-1 border-t border-zinc-950">
                                <span className="text-zinc-500 uppercase">Reduction Delta:</span>
                                <span className={`font-black uppercase text-[9px] ${isReduction ? 'text-[#25D366]' : 'text-amber-400'}`}>
                                  {isReduction 
                                    ? `-${percent}% Data Reduction` 
                                    : `+${percent}% Format Expand`}
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="bg-black/60 border border-zinc-900 p-2 text-center text-[7.5px] font-mono text-zinc-500 rounded-none leading-relaxed">
                          Saringan interceptor mem-bypass data mentah, melindunginya secara permanen dan merekam statistik kepatuhan.
                        </div>
                      </div>

                      {/* Right: Cleaned Masked safe payload */}
                      <div className="p-4 flex flex-col gap-2 bg-gradient-to-br from-black to-zinc-950/20 lg:col-span-1 border-t lg:border-t-0">
                        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-900/40">
                          <span className="text-[9px] font-mono text-[#25D366] font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-[#25D366] rounded-full animate-ping" />
                            CLEANED TRANSIT PAYLOAD (ZERO-EXPOSURE INTERCEPTED)
                          </span>
                          <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-widest">
                            Safe for LLM Send
                          </span>
                        </div>

                        <div className="mt-1 text-xs font-mono leading-relaxed text-zinc-300 px-1 min-h-[48px]">
                          {mskText.split(' ').map((word, j) => {
                            const isMasked = word.includes('_TERMASKING');
                            if (isMasked) {
                              return (
                                <motion.span 
                                  key={j} 
                                  initial={{ 
                                    opacity: 0.3,
                                    backgroundColor: "rgba(16, 185, 129, 0.95)",
                                    color: "#ffffff",
                                    scale: 1.05
                                  }}
                                  animate={{ 
                                    opacity: 1,
                                    backgroundColor: "rgba(204, 255, 0, 0.1)",
                                    color: "#25D366",
                                    scale: 1
                                  }}
                                  transition={{ 
                                    duration: 1.6, 
                                    ease: "easeOut" 
                                  }}
                                  className="border border-[#25D366]/30 text-[#25D366] px-1.5 py-0.5 mx-0.5 font-bold select-all inline-block rounded-none text-[10px]"
                                >
                                  {word}
                                </motion.span>
                              );
                            }
                            return (
                              <span key={j} className="">
                                {word}{' '}
                              </span>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-auto text-[8.5px] font-mono text-zinc-500 pt-2 border-t border-zinc-950">
                          <span>Sanitized Character Length: <strong className="text-zinc-400">{session.redactedLen}</strong></span>
                        </div>

                      </div>

                    </div>

                    {/* Footer entity detail drawer bar */}
                    <div className="bg-zinc-950 px-4 py-2 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#25D366]">
                        <Fingerprint className="w-3.5 h-3.5 shrink-0" />
                        <span>PII ENTITIES BLOCKED:</span>
                        <div className="flex flex-wrap gap-1 ml-1.5">
                          {session.items.map((it, k) => (
                            <span key={k} className="bg-[#25D366]/10 border border-[#25D366]/20 font-bold px-1.5 py-0.5 text-[8.5px] uppercase">
                              {it}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-[8px] font-mono text-zinc-650 text-right uppercase">
                        ZERO LIABILITY RISK ESTABLISHED
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

    </div>
  );
}
