import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Cpu, Check, ToggleLeft, ToggleRight, Shuffle, AlertCircle, Play, 
  Sparkles, ShieldCheck, Zap, ChevronRight, RefreshCw, MessageSquare, 
  HelpCircle, Settings, Award, Clipboard, Terminal, ArrowRight, UserCheck, CheckCircle2
} from 'lucide-react';
import { AgentConfig, SubAgent } from '../types';

interface AgentDelegationHarnessProps {
  config: AgentConfig | null;
  onUpdateConfig: (newC: AgentConfig) => void;
}

export default function AgentDelegationHarness({ config, onUpdateConfig }: AgentDelegationHarnessProps) {
  const renderSubAgentIcon = (id: string, className = "w-5 h-5") => {
    switch (id) {
      case 'sales_agent':
        return <Sparkles className={`${className} text-[#25D366]`} />;
      case 'tech_support':
        return <Settings className={`${className} text-emerald-400`} />;
      case 'billing_finance':
        return <ShieldCheck className={`${className} text-emerald-500`} />;
      case 'feedback_loyalty':
        return <Award className={`${className} text-amber-500`} />;
      default:
        return <Cpu className={`${className} text-zinc-500`} />;
    }
  };

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [simInput, setSimInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSteps, setSimSteps] = useState<{ step: string; type: 'info' | 'success' | 'warn' | 'dispatch' }[]>([]);
  const [simResult, setSimResult] = useState<string | null>(null);
  const [selectedSimAgent, setSelectedSimAgent] = useState<SubAgent | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [showPromptSaved, setShowPromptSaved] = useState<string | null>(null);

  // Generate dynamic default sub-agents if they don't exist yet
  useEffect(() => {
    if (!config) return;
    if (config.subAgents && config.subAgents.length === 4) return;

    const isShoe = config.name.toLowerCase().includes('shoe') || config.bio.toLowerCase().includes('sepatu');
    const isFood = config.name.toLowerCase().includes('ummi') || config.bio.toLowerCase().includes('catering') || config.bio.toLowerCase().includes('makan');
    const isLaundry = config.name.toLowerCase().includes('griya') || config.bio.toLowerCase().includes('laundry') || config.bio.toLowerCase().includes('kost');

    const defaultSubAgents: SubAgent[] = [
      {
        id: 'sales_agent',
        name: 'Sales & Closing Booster',
        role: 'Spesialis Menutup Penjualan & Rekomendasi Unit',
        icon: 'sales',
        isEnabled: true,
        selectedModel: 'gemini-3.5-flash',
        delegatedCount: 148,
        responsibilities: [
          'Mengidentifikasi minat beli pelanggan',
          'Merekomendasikan varian produk terlaris',
          'Menawarkan diskon tersembunyi secara bijak untuk memicu closing cepat',
          'Mengirimkan format pengisian alamat COD/transfer'
        ],
        suggestedTriggers: [
          'bisa diskon?', 'harganya berapa?', 'mau order dong', 'ada promo apa?', 'ready stock?', 'cara pesan', 'beli sekarang', 'mau bayar', 'bisa COD'
        ],
        systemPrompt: `Anda adalah Sales Specialist untuk ${config.name}.
Tugas utama Anda adalah MEMBANTU PELANGGAN MEMILIH PRODUK DAN MELAKUKAN PEMESANAN (CLOSING).
Gunakan gaya komunikasi: ${config.toneStyle === 'casual' ? 'casual dan santai' : config.toneStyle === 'warm' ? 'hangat dan bersahabat' : 'formal dan profesional'}.

Detail Bisnis:
${config.bio}

Aturan Penjualan:
- Fokus pada keunggulan produk. ${isShoe ? 'Sebutan bonus kaos kaki premium gratis.' : isFood ? 'Unggulkan kebersihan premium tanpa MSG.' : 'Unggulkan efisiensi waktu.'}
- Jika pelanggan menawar harga, jangan langsung menolak. Berikan opsi voucher promo senilai 15-25 ribu atau souvenir gratis asalkan order hari ini.`
      },
      {
        id: 'tech_support',
        name: 'Product & Tech Specialist',
        role: 'Spesialis Panduan Produk & Logistik Pengiriman',
        icon: 'tech',
        isEnabled: true,
        selectedModel: 'gemini-3.5-flash',
        delegatedCount: 64,
        responsibilities: [
          'Menjelaskan panduan detail ukuran (sizing) atau bahan',
          'Menjawab bahan baku/kandungan produk secara detail',
          'Melacak status pengiriman kurir',
          'Memberikan tips perawatan produk'
        ],
        suggestedTriggers: [
          'ukurannya gimana?', 'retur ukuran', 'kirim pake apa?', 'cara rawat', 'bahan apa?'
        ],
        systemPrompt: `Anda adalah Product & Support Specialist untuk ${config.name}.
Tugas utama Anda adalah MENJAWAB DETAILS TEKNIS PRODUK, SIZING GUIDE, DAN INFORMASI PENGIRIMAN.
Sikap Anda harus sangat sabar, detail, komunikatif, dan solutif.

Aturan Khas Sektor:
${isShoe ? '- Berikan panduan cara mengukur kaki menggunakan penggaris (panjang insole).\n- Jelaskan garansi boleh tukar size dalam 3 hari.' :
  isFood ? '- Jelaskan daya tahan makanan jika ditaruh di freezer atau suhu ruang.\n- Terangkan bahwa semua masakan sehat, higienis, dan tanpa bahan pengawet.' :
  '- Jelaskan slot kamar kost yang tersisa (jika relevan).\n- Jelaskan prosedur penjemputan pakaian laundry kiloan.'}`
      },
      {
        id: 'billing_finance',
        name: 'Billing & Ledger Officer',
        role: 'Spesialis Verifikasi Transaksi & Kebijakan COD',
        icon: 'billing',
        isEnabled: true,
        selectedModel: 'gemini-3.1-pro-preview',
        delegatedCount: 92,
        responsibilities: [
          'Menyajikan nomor rekening resmi BCA/Mandiri',
          'Memvalidasi bukti transfer bank yang dikirim konsumen',
          'Menjelaskan syarat COD (Bayar di Tempat)',
          'Memeriksa status down payment'
        ],
        suggestedTriggers: [
          'minta no rek', 'sudah transfer', 'bukti bayar', 'minta invoice', 'konfirmasi transfer'
        ],
        systemPrompt: `Anda adalah Financial Administrator untuk ${config.name}.
Tugas utama Anda adalah MEMVALIDASI PEMBAYARAN, MENJELASKAN SISTEM COD, DAN MENYEDIAKAN NO REKENING PEMBAYARAN RESMI.
Gaya Anda harus sangat sopan, jujur, akurat, dan menjamin rasa aman bertransaksi.

Nomor Rekening Simulasi:
BCA: 804-556-7890 a/n PT Multi Agent Solusindo

Jika pelanggan mengirimkan bukti transfer, katakan: "Baik Kak, terima kasih bukti transfernya. Sedang admin teruskan ke tim finance untuk verifikasi pembukuan instan. Mohon ditunggu sebentar ya!"`
      },
      {
        id: 'feedback_loyalty',
        name: 'Brand Advocate Officer',
        role: 'Manajemen feedback negatif & Upsell Membership',
        icon: 'loyalty',
        isEnabled: true,
        selectedModel: 'gemini-3.5-flash',
        delegatedCount: 39,
        responsibilities: [
          'Menangani komplain negatif dengan empati tinggi',
          'Tindak lanjut pasca-pembelian (follow-up kepuasan)',
          'Menawarkan membership berlangganan / repeat order discount',
          'Memberikan kompensasi voucher jika terjadi kendala pengantaran'
        ],
        suggestedTriggers: [
          'kecewa nih', 'barangnya robek', 'salah kirim', 'langganan bulanan', 'repeat order'
        ],
        systemPrompt: `Anda adalah Customer Happiness & Loyalty Advocate untuk ${config.name}.
Tugas utama Anda adalah MENANGANI KOMPLAIN DENGAN TULUS, MINTA MAAF, SERTA MENDORONG REPEAT ORDER / MEMBERSHIP.
Jangan pernah defensif. Selalu validasi perasaan kecewa konsumen terdahulu sebelum menawarkan solusi ganti rugi atau voucher.

Skema Loyalitas:
Berikan voucher diskon khusus 10% untuk pemesanan berikutnya sebagai bentuk apresiasi kesabaran konsumen jika mereka memberikan ulasan atau masukan.`
      }
    ];

    onUpdateConfig({
      ...config,
      subAgents: defaultSubAgents
    });
    setSelectedAgentId(defaultSubAgents[0].id);

  }, [config]);

  const subAgents = config?.subAgents || [];

  const handleToggleSubAgent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!config || !subAgents.length) return;
    const updated = subAgents.map(sa => {
      if (sa.id === id) {
        return { ...sa, isEnabled: !sa.isEnabled };
      }
      return sa;
    });
    onUpdateConfig({ ...config, subAgents: updated });
  };

  const handleUpdateAgentPrompt = (id: string, newPrompt: string) => {
    if (!config || !subAgents.length) return;
    const updated = subAgents.map(sa => {
      if (sa.id === id) {
        return { ...sa, systemPrompt: newPrompt };
      }
      return sa;
    });
    onUpdateConfig({ ...config, subAgents: updated });
    setShowPromptSaved(id);
    setTimeout(() => setShowPromptSaved(null), 2500);
  };

  const handleUpdateAgentModel = (id: string, model: 'gemini-3.5-flash' | 'gemini-3.1-pro-preview') => {
    if (!config || !subAgents.length) return;
    const updated = subAgents.map(sa => {
      if (sa.id === id) {
        return { ...sa, selectedModel: model };
      }
      return sa;
    });
    onUpdateConfig({ ...config, subAgents: updated });
  };

  const handleUpdateResponsibilities = (id: string, index: number, value: string) => {
    if (!config || !subAgents.length) return;
    const updated = subAgents.map(sa => {
      if (sa.id === id) {
        const resp = [...sa.responsibilities];
        resp[index] = value;
        return { ...sa, responsibilities: resp };
      }
      return sa;
    });
    onUpdateConfig({ ...config, subAgents: updated });
  };

  // Run the Multi-Agent Harness routing simulation locally
  const runHarnessSimulation = async () => {
    if (!simInput.trim()) return;
    setIsSimulating(true);
    setSimResult(null);
    setSelectedSimAgent(null);
    setConfidence(null);
    setSimSteps([]);

    const text = simInput.toLowerCase();

    // Steps logging simulation
    const steps: { step: string; type: 'info' | 'success' | 'warn' | 'dispatch' }[] = [];
    
    steps.push({ step: '[Signal]  Orchestrator: Menangkap masukan pengguna baru...', type: 'info' });
    setSimSteps([...steps]);
    await new Promise(resolve => setTimeout(resolve, 800));

    steps.push({ step: '[Scan]  Orchestrator: Menganalisis metadata & kata pemicu (keywords mapping)...', type: 'info' });
    setSimSteps([...steps]);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Intelligence routing logic with prioritized Sales Closing optimization for high-purchase-intent triggers
    let targetId = 'sales_agent';
    let matchedConfidence = 88;

    const highIntentSalesTriggers = [
      'mau order', 'order dong', 'beli', 'checkout', 'pesan sekarang', 'promo', 'diskon', 'cara pesan', 'mau bayar', 'bisa cod', 'ready stock', 'harganya berapa'
    ];
    const hasHighIntentClosing = highIntentSalesTriggers.some(trig => text.includes(trig));

    if (hasHighIntentClosing) {
      targetId = 'sales_agent';
      matchedConfidence = 99; // Optimized: High purchase-intent triggers route immediately to Sales Closings
    } else if (text.includes('ukuran') || text.includes('size') || text.includes('bahan') || text.includes('sol') || text.includes('panduan') || text.includes('mesin') || text.includes('daya tahan') || text.includes('msg') || text.includes('sehat')) {
      targetId = 'tech_support';
      matchedConfidence = 95;
    } else if (text.includes('transfer') || text.includes('bca') || text.includes('mandiri') || text.includes('rekening') || text.includes('bukti') || text.includes('lunas') || text.includes('kirim resi') || text.includes('uang')) {
      // Billing processes actual payment verification assets; purchase intent goes to Sales above
      targetId = 'billing_finance';
      matchedConfidence = 98;
    } else if (text.includes('kecewa') || text.includes('robek') || text.includes('rusak') || text.includes('salah kirim') || text.includes('telat') || text.includes('retur') || text.includes('kapok') || text.includes('langganan') || text.includes('bulanan')) {
      targetId = 'feedback_loyalty';
      matchedConfidence = 92;
    } else {
      targetId = 'sales_agent';
      matchedConfidence = 85;
    }

    const matchedAgent = subAgents.find(sa => sa.id === targetId);

    if (matchedAgent && !matchedAgent.isEnabled) {
      steps.push({ 
        step: `[PERINGATAN]  Orchestrator mendeteksi kecocokan sub-agent [${matchedAgent.name}] (${matchedConfidence}%), tetapi agent sedang DINONAKTIFKAN!`, 
        type: 'warn' 
      });
      steps.push({ 
        step: ` Memilih fallback agent: Sales & Closing Booster...`, 
        type: 'info' 
      });
      setSimSteps([...steps]);
      await new Promise(resolve => setTimeout(resolve, 1200));
      targetId = 'sales_agent';
    }

    const finalAgent = subAgents.find(sa => sa.id === targetId) || subAgents[0];
    setSelectedSimAgent(finalAgent);
    setConfidence(matchedConfidence);

    steps.push({ 
      step: `[Target]  HASIL DELEGASI: Mengalihkan payload ke sub-agent [${finalAgent.name}] (Confidence Score: ${matchedConfidence}%)`, 
      type: 'dispatch' 
    });
    steps.push({ 
      step: ` Menjalankan prompt instruksi khusus sub-agent menggunakan model ${finalAgent.selectedModel === 'gemini-3.1-pro-preview' ? 'Gemini 1.5 Pro' : 'Gemini 1.5 Flash'}...`, 
      type: 'info' 
    });
    setSimSteps([...steps]);
    await new Promise(resolve => setTimeout(resolve, 1400));

    // Simulated high-fidelity response output structured on prompts
    let reply = "";
    if (finalAgent.id === 'sales_agent') {
      reply = `Halo Kak! Unit produk pesanan Kakak yang dicarikan kebetulan sedang ready stock terbatas lho untuk pengiriman hari ini. Khusus pemesanan sekarang, admin siap bantu sisipkan bonus merchandise gratis serta voucher subsidi ongkir instan agar belanjanya hemat dan fleksibel COD. Mau dibantu admin buatkan pesanannya Kak?`;
    } else if (finalAgent.id === 'tech_support') {
      if (text.includes('ukuran') || text.includes('size')) {
        reply = `Tentu Kak. Untuk panduan ukuran paling pas, Kakak bisa mengukur panjang telapak kaki menggunakan penggaris lalu dicocokkan dengan insole tabel kami. Tenang saja Kak, kami sediakan garansi tukar size gratis ongkir selama 3 hari setelah paket tiba jika ukurannya kurang pas di kaki Kakak.`;
      } else {
        reply = `Siap Kak, untuk detail spesifikasi bahan baku, kami menjamin seluruh material diproduksi dengan standar ramah lingkungan dan kualitas pengerjaan terbaik (grade A). Daya tahannya sangat tangguh untuk pemakaian jangka panjang harian. Ada info spesifik lain yang ingin ditanyakan Kak?`;
      }
    } else if (finalAgent.id === 'billing_finance') {
      reply = `Baik Kak, berikut untuk detail rekening pembayaran resmi kami:\n\nbilling *BCA*: 8045567890\nAtas nama: *PT Multi Agent Solusindo*\n\nJika Kakak sudah menyelesaikan transfer, mohon lampirkan foto bukti transaksi di sini ya Kak agar admin teruskan ke tim finance untuk verifikasi pembukuan instat. Terima kasih banyak Kak!`;
    } else {
      reply = `Duh, mohon maaf sebesar-besarnya atas kendala ketidaknyamanan yang Kakak alami ya. Kami sangat memahami kekecewaan Kakak. Mohon bantu lampirkan foto produk atau nomor resinya Kak, agar langsung admin bantu urus proses penukaran barang baru dan kompensasi voucher diskon khusus 15% untuk menebus ketidaknyamanan ini.`;
    }

    steps.push({ step: ` Sub-agent [${finalAgent.name}] berhasil menyelesaikan sintesis jawaban aman!`, type: 'success' });
    setSimSteps([...steps]);
    setSimResult(reply);

    // Increment agent call count
    const updated = subAgents.map(sa => {
      if (sa.id === finalAgent.id) {
        return { ...sa, delegatedCount: sa.delegatedCount + 1 };
      }
      return sa;
    });
    onUpdateConfig({ ...config, subAgents: updated });

    setIsSimulating(false);
  };

  const selectedAgent = subAgents.find(sa => sa.id === selectedAgentId);

  return (
    <div className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col gap-6 rounded-none relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#25D366] animate-pulse" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
              Agent Harness Multi-Model Workspace
            </h3>
            <span className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 text-[9px] px-1.5 py-0.5 tracking-widest font-mono font-bold uppercase animate-pulse">
              Orchestrator Mode Active
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-mono">
            Sistem Multi-Agent: Delegasikan tugas berat asisten ke masing-masing sub-model spesialis untuk meningkatkan efisiensi dan kecerdasan tanggapan usaha Anda.
          </p>
        </div>
        <div className="hidden md:flex gap-1">
          <span className="text-[8px] font-mono text-zinc-650 tracking-widest uppercase bg-zinc-900 px-2 py-1 border border-zinc-850">
            Node Count: {subAgents.length}
          </span>
        </div>
      </div>

      {!config ? (
        <div className="py-12 border border-zinc-900 py-12 flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="w-8 h-8 text-zinc-700 animate-pulse" />
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Workspace Kosong</span>
          <p className="text-[10px] text-zinc-600 font-mono max-w-xs leading-relaxed">
            Silakan generate AI WhatsApp Employee di halaman depan terlebih dahulu sebelum membagi tugas di panel delegasi ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* LEFT PANEL: Interactive Node Visualizer Graph */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block border-b border-zinc-900 pb-2">
              1. PETA DELEGASI MODEL HARNESS
            </span>

            {/* Central Orchestrator Node Display */}
            <div className="bg-black/80 border border-zinc-900 p-4 rounded-none flex flex-col items-center justify-center text-center gap-2 relative">
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[7.5px] font-mono text-emerald-400 font-bold uppercase">Online</span>
              </div>
              <div className="w-12 h-12 rounded-none bg-gradient-to-br from-[#25D366] to-emerald-500 p-[1px] flex items-center justify-center shadow-[0_0_15px_rgba(204,255,0,0.15)]">
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-[#25D366]" />
                </div>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[10.5px] font-black text-white uppercase tracking-wider font-mono">Gemini Router Orchestrator</h4>
                <p className="text-[8px] text-zinc-500 font-mono leading-relaxed uppercase">
                  Menganalisis Pesan Masuk & Mendistribusikan Kerja Secara Real-Time
                </p>
              </div>
            </div>

            {/* Connective Line Design Placeholder / Grid branches */}
            <div className="flex justify-center items-center h-4 relative -my-2 select-none">
              <div className="w-[1px] h-full bg-gradient-to-b from-[#25D366] to-zinc-900"></div>
            </div>

            {/* Branching Sub-Agent Nodes Grid */}
            <div className="grid grid-cols-2 gap-3">
              {subAgents.map((sa) => {
                const isSelected = selectedAgentId === sa.id;
                return (
                  <div
                    key={sa.id}
                    onClick={() => setSelectedAgentId(sa.id)}
                    className={`bg-black/60 border ${
                      isSelected 
                        ? 'border-[#25D366] shadow-[0_0_12px_rgba(204,255,0,0.05)] bg-[#25D366]/5' 
                        : 'border-zinc-900 hover:border-zinc-800'
                    } p-3.5 rounded-none flex flex-col justify-between transition-all gap-3 cursor-pointer group`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="shrink-0">{renderSubAgentIcon(sa.id, "w-5 h-5")}</span>
                      <button
                        onClick={(e) => handleToggleSubAgent(sa.id, e)}
                        className="text-zinc-650 hover:text-white transition-colors"
                      >
                        {sa.isEnabled ? (
                          <ToggleRight className="w-6 h-6 text-[#25D366]" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-zinc-700" />
                        )}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h5 className="text-[10px] font-black text-white uppercase tracking-wider font-mono line-clamp-1 group-hover:text-[#25D366] transition-colors">
                        {sa.name}
                      </h5>
                      <p className="text-[8px] text-zinc-500 font-mono tracking-tight uppercase line-clamp-1">
                        {sa.role}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-950 flex items-center justify-between font-mono text-[8.5px]">
                      <span className="text-zinc-550 uppercase">Delegated Tasks:</span>
                      <span className={`${sa.isEnabled ? 'text-zinc-400 font-bold' : 'text-zinc-700'}`}>
                        {sa.delegatedCount}x
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Test Simulation Panel */}
            <div className="bg-black/40 border border-zinc-900 p-4 rounded-none flex flex-col gap-3 mt-2">
              <span className="text-[9px] font-black text-[#25D366] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5" />
                Diagnostic Console Simulator
              </span>
              <p className="text-[9px] text-zinc-500 font-mono leading-relaxed mt-0.5">
                Ketikkan dialog uji coba pelanggan di bawah ini untuk melihat bagaimana Orchestrator memilah dan mendelegasikan tugas ke sub-agent model terbaik secara instan.
              </p>

              <div className="space-y-2">
                <textarea
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-950/80 border border-zinc-850 p-2.5 text-[10.5px] text-zinc-300 font-mono focus:outline-none focus:border-[#25D366] resize-none rounded-none"
                  placeholder="Ketik contoh: 'saya mau pesan donk, harganya berapa ya?' atau 'ukurannya muat gak?'..."
                />
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    'Minat beli: "diskon berapa?"',
                    'Logistik: "retur size"',
                    'Finansial: "transfer BCA"',
                    'Advocacy: "komplain telat"'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const parsed = preset.match(/"([^"]+)"/);
                        if (parsed) setSimInput(parsed[1]);
                      }}
                      className="text-[8.5px] font-mono px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={runHarnessSimulation}
                disabled={isSimulating || !simInput.trim()}
                className="w-full py-2 bg-[#25D366] hover:bg-[#1ebd50] disabled:bg-zinc-900 text-black disabled:text-zinc-650 font-black font-mono text-[9.5px] uppercase tracking-wider shadow-md hover:shadow-[#25D366]/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Memproses Delegasi...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-black" />
                    Analis & Delegasikan Kerja
                  </>
                )}
              </button>
            </div>
          </div>

          {/* DYNAMIC DIAGNOSTIC RUNS (Shows when simulation is active or calculated) */}
          <div className="xl:col-span-2 flex flex-col gap-5">
            {isSimulating || simSteps.length > 0 ? (
              <div className="bg-black border border-zinc-900 p-4 rounded-none flex flex-col gap-4 font-mono text-[10.5px]">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-[9.5px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                    <Terminal className="w-4 h-4 animate-pulse" />
                    Trace Log Jalur Orchestration
                  </span>
                  <span className="text-[8px] text-zinc-550">TRACER: ONLINE</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                  {simSteps.map((s, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 border leading-relaxed ${
                        s.type === 'info' ? 'bg-zinc-950/80 border-zinc-900 text-zinc-450' :
                        s.type === 'success' ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-450' :
                        s.type === 'warn' ? 'bg-amber-950/20 border-amber-900/50 text-amber-450' :
                        'bg-[#25D366]/5 border-[#25D366]/20 text-[#25D366] font-black italic'
                      }`}
                    >
                      {s.step}
                    </div>
                  ))}
                </div>

                {simResult && selectedSimAgent && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-zinc-950 border border-zinc-900 flex flex-col gap-3 mt-1"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0">{renderSubAgentIcon(selectedSimAgent.id, "w-4.5 h-4.5")}</span>
                        <span className="font-extrabold text-white text-[11px] uppercase tracking-wide">
                          HASIL PENGERJAAN: {selectedSimAgent.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[9px] text-zinc-500">
                        <span>Confidence Map: <strong className="text-white font-mono">{confidence}%</strong></span>
                        <span>|</span>
                        <span>Model: <strong className="text-emerald-400 font-mono">{selectedSimAgent.selectedModel === 'gemini-3.1-pro-preview' ? '1.5-Pro' : '1.5-Flash'}</strong></span>
                      </div>
                    </div>

                    <div className="bg-black/60 p-3 border border-zinc-900/80 rounded-none leading-relaxed text-zinc-300 font-sans text-xs italic pl-4 border-l-2 border-l-[#25D366]">
                      "{simResult}"
                    </div>

                    <div className="flex items-center justify-between text-[8px] text-zinc-550 border-t border-zinc-900/40 pt-2 font-mono">
                      <span>Proses Delegasi Selesai (Time Elapsed: 320ms)</span>
                      <span className="text-emerald-500 uppercase font-black tracking-widest flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Audit Compliant
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : null}

            {/* CENTRE PANEL: Detail Configuration Inspector */}
            <div className="bg-black border border-zinc-900 p-5 rounded-none flex flex-col gap-5">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block border-b border-zinc-900 pb-2">
                2. INSPEKTUR & KONTROL FORMULASI SUB-MODEL
              </span>

              {selectedAgent ? (
                <div className="flex flex-col gap-5">
                  
                  {/* Selected Agent Identity Card */}
                  <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-12 h-12 bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                        {renderSubAgentIcon(selectedAgent.id, "w-6 h-6")}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                            {selectedAgent.name}
                          </h4>
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 uppercase ${
                            selectedAgent.isEnabled 
                              ? 'bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20' 
                              : 'bg-zinc-900 text-zinc-650 border border-zinc-850'
                          }`}>
                            {selectedAgent.isEnabled ? 'Aktif' : 'Non-aktif'}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase tracking-tight">
                          {selectedAgent.role}
                        </p>
                      </div>
                    </div>

                    {/* LLM Engine allocation choice */}
                    <div className="flex flex-col items-start sm:items-end gap-1.5 font-mono">
                      <span className="text-[8.5px] text-zinc-500 uppercase">Alokasi Model AI</span>
                      <div className="flex gap-1.5 border border-zinc-900 p-1 bg-black">
                        {[
                          { val: 'gemini-3.5-flash', label: '1.5 Flash (Cepat)' },
                          { val: 'gemini-3.1-pro-preview', label: '1.5 Pro (Kompleks)' }
                        ].map((m) => (
                          <button
                            key={m.val}
                            onClick={() => handleUpdateAgentModel(selectedAgent.id, m.val as any)}
                            className={`px-2 py-1 text-[8.5px] uppercase font-bold transition-all cursor-pointer rounded-none border ${
                              selectedAgent.selectedModel === m.val
                                ? 'bg-[#25D366] border-[#25D366] text-black font-black italic'
                                : 'bg-transparent border-transparent text-zinc-500 hover:text-white'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Core Responsibilities Array */}
                  <div className="space-y-2">
                    <span className="text-[9.5px] font-bold text-zinc-400 font-mono uppercase tracking-wider block">
                      Tanggung Jawab Prioritas (Triggers Parameter)
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedAgent.responsibilities.map((resp, bIdx) => (
                        <div key={bIdx} className="bg-zinc-950 border border-zinc-900/60 p-2.5 flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[9px] font-mono text-zinc-500 shrink-0 mt-0.5">
                            {bIdx + 1}
                          </div>
                          <input
                            type="text"
                            value={resp}
                            onChange={(e) => handleUpdateResponsibilities(selectedAgent.id, bIdx, e.target.value)}
                            className="bg-transparent text-xs text-zinc-300 font-mono w-full focus:outline-none border-b border-transparent focus:border-zinc-800 pb-0.5"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Triggers examples tag bubbles */}
                  <div className="space-y-2">
                    <span className="text-[9.5px] font-bold text-zinc-500 font-mono uppercase tracking-wider block">
                      Kata Kunci Pendeteksi Paling Relevan
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAgent.suggestedTriggers.map((trig, sIdx) => (
                        <span key={sIdx} className="bg-zinc-950 border border-zinc-900 font-mono text-[9px] text-[#25D366] px-2 py-0.5">
                          "{trig}"
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Specialized system instruction prompt */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-bold text-zinc-400 font-mono uppercase tracking-wider">
                        System Prompt Khusus Sub-Agent (Seni Instruksi)
                      </span>
                      {showPromptSaved === selectedAgent.id && (
                        <span className="text-[9px] font-mono text-emerald-400 font-black uppercase flex items-center gap-1 animate-pulse">
                          <Check className="w-3.5 h-3.5" /> Prompt Disinkronkan ke Cloud!
                        </span>
                      )}
                    </div>
                    <textarea
                      value={selectedAgent.systemPrompt}
                      onChange={(e) => handleUpdateAgentPrompt(selectedAgent.id, e.target.value)}
                      rows={6}
                      className="w-full bg-zinc-950 border border-zinc-900 p-3 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#25D366] resize-y leading-relaxed"
                    />
                  </div>

                  <div className="text-[9px] text-zinc-650 font-mono leading-relaxed uppercase border-t border-zinc-950 pt-2">
                    Info:  Perubahan prompt dan alokasi AI Model di atas akan langsung disimpan secara hibrida ke Cloud Database sinkronisasi otomatis Anda.
                  </div>

                </div>
              ) : (
                <div className="py-8 text-center text-zinc-600 font-mono text-xs uppercase">
                  Pilih salah satu sub-agent di grid sebelah kiri untuk mengonfigurasi prompt perilakunya.
                </div>
              )}

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
