import React, { useState, useEffect } from 'react';
import { 
  LogIn, Zap, Bot, Shield, ChevronRight, HelpCircle, ArrowRight, 
  MessageSquare, Sparkles, Database, Check, Play, Layout, Phone, 
  Layers, Users, Star, ArrowUpRight, TrendingUp, X, Globe, Terminal,
  ShieldCheck, HeartHandshake, Smile, RefreshCw, Send, Network, Cpu, ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LandingPageProps {
  onSignIn: () => void;
}

export default function LandingPage({ onSignIn }: LandingPageProps) {
  // Dynamic Agent Harness Simulation for live agents active work visual representation
  const [activeSimIndex, setActiveSimIndex] = useState(0);
  const liveAgentActivities = [
    {
      id: "frontline",
      role: "FRONT-OFFICE",
      name: "Siti Rahma",
      incoming: "Kak, sepatu sneaker hitam yang kemarin dipromoin size 42 ready stock ga?",
      action: "ANALISIS STOK & SAMBUNG SPEK KATALOG",
      confidence: 99,
      statusText: "Siti Rahma: Menyisir database stok sandal & menjawab pertanyaan...",
      outgoing: "Ready banget Kak! SneakerKicks size 42 hitam tinggal sisa 2 pasang lho. Kebetulan hari ini ada promo diskon 10% + kaos kaki premium gratis. Mau diamankan slotnya, Kak?"
    },
    {
      id: "negotiator",
      role: "BONUS & NEGO",
      name: "Budi Santoso",
      incoming: "Harganya bisa kurang lagi ga mas? Kemahalan nih untuk kantong saya.",
      action: "PERHITUNGAN MARGIN MAKSIMAL & ALTERNATIF INSENTIF",
      confidence: 96,
      statusText: "Budi Santoso: Menghitung diskon alternatif, menyisipkan bonus gantungan...",
      outgoing: "Wah maaf belum bisa kurang lagi nih Kak, harganya sudah pas. Tapi khusus pembeli hari ini, Budi bonusin gantungan kunci kulit eksklusif juga ya biar tambah keren!"
    },
    {
      id: "complain",
      role: "COMPLAINT CARE",
      name: "Yusuf Subagja",
      incoming: "Gimana sih min, kiriman salah ukuran. Saya pesan logo hijau malah dikirim merah!",
      action: "DOKUMENTASI KESALAHAN & JAMINAN RETUR GRATIS",
      confidence: 98,
      statusText: "Yusuf Subagja: Memvalidasi komplain, mengatur retur tukar instan...",
      outgoing: "Aduh mohon maaf sekali Kak atas salah kirim dari kurir kami! Tenang Kak, silakan foto barangnya dan Yusuf bantu retur tukar size 100% GRATIS ONGKIR bolak-balik ya."
    },
    {
      id: "finance",
      role: "CRM ADMIN / CLOSING",
      name: "Asisten Admin Closing",
      incoming: "Oke deal saya langsung ambil, tolong kirim nomor rekening bank resmi toko ya.",
      action: "GENERATOR INVOICE PESANAN & DETEKSI SISTEM COD/TRANSFER",
      confidence: 99,
      statusText: "Closing Admin: Mengunci pesanan, mencetak total rincian belanja & no rek BCA...",
      outgoing: "Mantap! Berikut rinciannya: SneakerKicks size 42 + Bonus Kaos Kaki + Gantungan Kunci. Total: Rp149.000. Pembayaran ke rekening resmi BCA: 123-4567-89 a/n AGENTWA."
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSimIndex(prev => (prev + 1) % liveAgentActivities.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Interactive Gather-style AI Virtual Office State
  const [selectedOfficeAgent, setSelectedOfficeAgent] = useState<'siti' | 'budi' | 'yusuf' | 'closing' | null>(null);
  
  const [officeAgents, setOfficeAgents] = useState({
    siti: { 
      id: 'siti' as const,
      name: "Siti Rahma", 
      emoji: "🐱", 
      role: "CS Frontliner",
      x: 18, 
      y: 28, 
      color: "border-pink-500/80 bg-pink-950/90 text-pink-400 shadow-pink-500/20",
      status: "💻 Buka laptop: sapa calon pembeli..." 
    },
    budi: { 
      id: 'budi' as const,
      name: "Budi Santoso", 
      emoji: "🦊", 
      role: "Nego Assistant",
      x: 72, 
      y: 28, 
      color: "border-orange-500/80 bg-orange-950/90 text-orange-400 shadow-orange-500/20",
      status: "⚖️ Menghitung kupon murah..." 
    },
    yusuf: { 
      id: 'yusuf' as const,
      name: "Yusuf Subagja", 
      emoji: "🐼", 
      role: "Complain Care",
      x: 18, 
      y: 72, 
      color: "border-cyan-500/80 bg-cyan-950/90 text-cyan-400 shadow-cyan-500/20",
      status: "🛠️ Mengajukan penggantian size..." 
    },
    closing: { 
      id: 'closing' as const,
      name: "Admin Closing", 
      emoji: "🦁", 
      role: "CRM Admin",
      x: 72, 
      y: 72, 
      color: "border-emerald-500/80 bg-emerald-950/90 text-emerald-400 shadow-emerald-500/20",
      status: "💰 Merapikan rekap invoice transfer BCA..." 
    }
  });

  // Automated random office walk simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const keys: Array<'siti' | 'budi' | 'yusuf' | 'closing'> = ['siti', 'budi', 'yusuf', 'closing'];
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      
      const options = [
        { dest: "desk", status: "" },
        { dest: "pantry", status: "☕ Seduh kopi di Pantry Kopi WA... 🏃" },
        { dest: "gemini", status: "🧬 Sinkronisasi database kognitif via Gemini..." },
        { dest: "lounge", status: "🛋️ Duduk selonjoran bentar di sofa bareng tim..." }
      ];
      
      const choice = options[Math.floor(Math.random() * options.length)];
      let nx = 50;
      let ny = 50;
      let ns = choice.status;
      
      if (choice.dest === "desk") {
        if (randomKey === "siti") { nx = 18; ny = 28; ns = "💻 Kembali di meja, standby cari stok..."; }
        if (randomKey === "budi") { nx = 72; ny = 28; ns = "⚖️ Diskusi harga nego & bikin bonus gantungan..."; }
        if (randomKey === "yusuf") { nx = 18; ny = 72; ns = "🛠️ Menindaklanjuti keluhan ongkir..."; }
        if (randomKey === "closing") { nx = 72; ny = 72; ns = "💰 Merapikan rekap invoice transfer BCA..."; }
      } else if (choice.dest === "pantry") {
        nx = 50; ny = 12;
      } else if (choice.dest === "gemini") {
        nx = 50; ny = 48;
      } else if (choice.dest === "lounge") {
        nx = 50; ny = 85;
      }
      
      setOfficeAgents(prev => ({
        ...prev,
        [randomKey]: {
          ...prev[randomKey],
          x: nx,
          y: ny,
          status: ns
        }
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Live Chat Simulator state
  const [messages, setMessages] = useState([
    { sender: 'customer', text: 'Permisi min, apakah sepatu SneakerKicks ready ukuran 42?' },
    { sender: 'bot', text: 'Halo Kak! Selama bisa diklik di etalase, SneakerKicks ukuran 42 READY STOCK ya! Kebetulan untuk hari ini sedang ada diskon 10% + gratis kaos kaki premium lho. Mau sekalian diamanankan slotnya Kak? (Asisten SneakerKicks)' }
  ]);
  const [simulatedTyping, setSimulatedTyping] = useState(false);

  const sampleQuestions = [
    { q: "Ada garansi ukuran jika kekecilan?", a: "Ada banget Kak! Garansi Tukar Size 100% GRATIS Ongkos Kirim untuk wilayah Jabodetabek. Jadi Kakak tidak perlu khawatir salah pilih ukuran ya! Ada lagi yang bisa dibantu?" },
    { q: "Bisa bayar di rumah (COD)?", a: "Bisa sekali Sahabat! Kami mendukung fitur Bayar di Tempat (COD) ke seluruh Indonesia via kurir mitra kami. Kakak tinggal bayar tunai ke kurir saat paket sampai di depan pintu!" },
    { q: "Berapa lama estimasi pengirimannya?", a: "Untuk wilayah Pulau Jawa estimasi 1-3 hari kerja Kak, sedangkan luar Pulau Jawa berkisar 3-5 hari kerja. Pesanan sebelum jam 16:00 WIB kami usahakan kirim di hari yang sama!" }
  ];

  const handleSimulateQuestion = (question: string, answer: string) => {
    if (simulatedTyping) return;
    
    // Append customer message
    setMessages(prev => [...prev, { sender: 'customer', text: question }]);
    setSimulatedTyping(true);

    // Simulate fast human typing
    setTimeout(() => {
      setSimulatedTyping(false);
      setMessages(prev => [...prev, { sender: 'bot', text: answer }]);
    }, 1500);
  };

  // Pricing plans interactive active tab
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // FAQ Accordion toggles
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Legal & API documentation modals state
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | 'api' | null>(null);

  const faqItems = [
    {
      q: "Apakah asisten WhatsApp ini berjalan otomatis 24 jam?",
      a: "Ya! Karena berjalan secara cloud, asisten Anda siap membalas pesan pelanggan 24 jam tanpa perlu menyalakan komputer atau membiarkan ponsel Anda aktif sepanjang hari."
    },
    {
      q: "Bagaimana cara melatih asisten agar mengerti tentang toko saya?",
      a: "Sangat mudah! Anda cukup menulis deskripsi singkat tentang jualan atau toko Anda di dashboard. Asisten pintar kami akan membantu menyusun draf FAQ lengkap, gaya bicara asisten, serta langkah pelayanan transaksi dalam beberapa detik saja."
    },
    {
      q: "Apakah asisten ini dapat melayani proses pemajangan & pembayaran?",
      a: "Tentu saja. Anda dapat mengatur alur pesan di 'Flow Rules' untuk mengirimkan format pemesanan, info nomor rekening, hingga langkah-langkah mengirim bukti transfer belanjaan pelanggan."
    },
    {
      q: "Apakah asisten ini aman bagi nomor WhatsApp saya?",
      a: "Asisten kami dilengkapi dengan jeda ketik acak alami sehingga percakapan terasa manusiawi dan meminimalisir risiko spam."
    }
  ];

  return (
    <div className="w-full relative animate-fadeIn flex flex-col gap-20 pb-16">
      
      {/* Glow Effects */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#25D366]/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* SECTION 1: HERO & INTERACTIVE WHATSAPP PREVIEW */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8">
        
        {/* Hero Left Info */}
        <div className="col-span-1 lg:col-span-7 flex flex-col gap-6 text-left">
          
          <div className="inline-flex items-center gap-2 bg-[#25D366]/10 border border-[#25D366]/25 px-3 py-1.5 self-start rounded-none animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-[#25D366]" />
            <span className="text-[10px] font-mono text-[#25D366] uppercase tracking-widest font-black">
              CS WHATSAPP OTOMATIS UMKM
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[0.9] uppercase italic tracking-tighter font-display">
            Asisten WhatsApp <span className="text-[#25D366]">Bekerja Otomatis</span> Balas Chat & Orderan 24 Jam
          </h1>

          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-xl font-sans">
            Hanya butuh 2 menit. Cukup tulis deskripsi singkat bisnis Anda, asisten pintar kami akan otomatis menyusun cara sapa pelanggan, info stok/katalog, nego harga, hingga cetak tagihan transfer.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-3">
            <button
              onClick={onSignIn}
              className="bg-[#25D366] hover:bg-white text-black font-black uppercase text-xs tracking-wider italic py-4 px-8 rounded-none flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(37,211,102,0.35)] select-none cursor-pointer group"
            >
              <span>BUAT ASISTEN SEKARANG</span>
              <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="#demo"
              className="bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white font-black uppercase text-xs tracking-wider italic py-4 px-6 rounded-none flex items-center justify-center gap-2 transition-all select-none cursor-pointer"
            >
              <Play className="w-4 h-4 text-[#25D366]" />
              COBA DEMO SIMULASI
            </a>
          </div>

          {/* Quick trust metrics */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-zinc-900/80 max-w-md">
            <div>
              <span className="text-lg font-black text-white block">Aman 24/7</span>
              <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">Berjalan di Cloud</span>
            </div>
            <div>
              <span className="text-lg font-black text-[#25D366] block">&lt; 3 Detik</span>
              <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">Kecepatan Balas</span>
            </div>
            <div>
              <span className="text-lg font-black text-white block">Hemat Waktu</span>
              <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">Tidak Perlu Begadang</span>
            </div>
          </div>

        </div>

        {/* Live Simulator Phone Showcase Right Side */}
        <div id="demo" className="col-span-1 lg:col-span-5 w-full flex flex-col items-center">
          <div className="w-full max-w-[340px] bg-zinc-950 border border-zinc-800 p-3 rounded-[32px] shadow-2xl relative overflow-hidden ring-1 ring-[#25D366]/10">
            {/* Top Speaker camera notch decoration */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-zinc-900 rounded-full z-10 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 bg-zinc-850 rounded-full"></span>
              <span className="w-12 h-1 bg-zinc-800 rounded-full"></span>
            </div>

            {/* Inner display layout */}
            <div className="w-full h-[480px] bg-[#0c0c0e] border border-zinc-900 overflow-hidden relative flex flex-col pt-6 rounded-[22px]">
              
              {/* WhatsApp Mock Top Header */}
              <div className="bg-zinc-900 px-3 py-2 flex items-center justify-between border-b border-zinc-850 select-none">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#25D366] text-black font-extrabold text-[10px] rounded-full flex items-center justify-center">
                    SK
                  </div>
                  <div>
                    <h5 className="text-[10px] font-bold text-white leading-none">SneakerKicks AI</h5>
                    <span className="text-[8px] text-[#25D366] leading-none animate-pulse flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-[#25D366] rounded-full"></span> Online
                    </span>
                  </div>
                </div>
                <div className="text-[9px] font-mono text-zinc-500">
                  UTC 2026
                </div>
              </div>

              {/* Chat messages viewport */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 scrollbar-thin">
                {messages.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`max-w-[85%] p-2.5 rounded-none text-[10px] leading-relaxed relative ${
                      m.sender === 'customer'
                        ? 'bg-zinc-900 text-zinc-100 rounded-tl-xl rounded-bl-xl rounded-br-xl self-end border-r-2 border-[#25D366]'
                        : 'bg-[#25D366]/10 text-zinc-100 rounded-tr-xl rounded-br-xl rounded-bl-xl self-start border-l-2 border-[#25D366]'
                    } animate-fadeIn`}
                  >
                    <span className="block font-mono text-[7px] text-zinc-400 uppercase tracking-widest font-black mb-1">
                      {m.sender === 'customer' ? 'Calon Pembeli' : 'Asisten AI'}
                    </span>
                    <p>{m.text}</p>
                  </div>
                ))}

                {simulatedTyping && (
                  <div className="bg-zinc-900/60 border border-zinc-850 p-2 text-[10px] font-mono text-zinc-400 self-start animate-pulse flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#25D366] rounded-full animate-bounce"></span>
                    <span>Asisten sedang mengetik...</span>
                  </div>
                )}
              </div>

              {/* Bottom question helpers */}
              <div className="bg-zinc-950 p-2.5 border-t border-zinc-900">
                <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest text-center mb-1.5">Pilih pertanyaan simulasi di bawah:</p>
                <div className="flex flex-col gap-1">
                  {sampleQuestions.map((sq, sIdx) => {
                    const isUsed = messages.some(msg => msg.text === sq.q);
                    return (
                      <button
                        key={sIdx}
                        onClick={() => handleSimulateQuestion(sq.q, sq.a)}
                        disabled={simulatedTyping || isUsed}
                        className={`text-left text-[8px] px-2 py-1.5 font-bold rounded-none border leading-tight transition-all truncate select-none cursor-pointer flex items-center gap-1.5 ${
                          isUsed 
                            ? 'bg-zinc-950 text-zinc-650 border-zinc-900 cursor-not-allowed'
                            : 'bg-zinc-900 hover:bg-[#25D366] hover:text-black hover:border-transparent text-zinc-300 border-zinc-800'
                        }`}
                      >
                        <HelpCircle className="w-3 h-3 text-[#25D366] inline-block shrink-0" />
                        <span className="truncate">"{sq.q}"</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
          
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mt-4 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#25D366]" /> Interaktif: Klik tombol di HP simulasi di atas untuk mencoba
          </span>
        </div>

      </section>

      {/* SECTION BONUS: NAMA AGENT & KELEBIHAN AGENT HARNESS */}
      <section className="bg-zinc-950 border border-zinc-900 p-8 flex flex-col gap-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-[#25D366] uppercase tracking-widest font-mono">
            SISTEM KERJA ASISTEN
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tight font-display">
            Satu Nomor WA untuk <span className="text-[#25D366]">Semua Tugas Penjualan</span>
          </h2>
          <p className="text-zinc-400 text-xs font-sans leading-relaxed">
            Asisten kami siaga memandu pelanggan dari sapaan awal, mengenalkan produk, menjawab tanya jawab umum, hingga mengirim format pembayaran secara tertib.
          </p>
        </div>

        {/* 1. Kelebihan Harness */}
        <div className="border-b border-zinc-900 pb-8">
          <h3 className="text-xs font-mono font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#25D366]" />
            BAGAIMANA ASISTEN MEMUDAHKAN TOKO ANDA
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 bg-black border border-zinc-900">
              <span className="text-[#25D366] font-mono text-xs font-black block mb-1">01. SELALU SIAGA</span>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">Menjawab puluhan chat pertanyaan produk sekaligus secara otomatis tanpa membuat calon pembeli menunggu.</p>
            </div>
            <div className="p-4 bg-black border border-zinc-900">
              <span className="text-[#25D366] font-mono text-xs font-black block mb-1">02. JEDA KETIK ALAMI</span>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">Memiliki jeda kirim ketik yang wajar agar balasan terasa ramah, manusiawi, dan aman bagi nomor WA Anda.</p>
            </div>
            <div className="p-4 bg-black border border-zinc-900">
              <span className="text-[#25D366] font-mono text-xs font-black block mb-1">03. BANTU SAMPAI ORDER</span>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">Memandu pembeli dengan ramah mulai dari menyapa produk, rekap data nama/alamat, hingga info nomor rekening.</p>
            </div>
            <div className="p-4 bg-black border border-zinc-900">
              <span className="text-[#25D366] font-mono text-xs font-black block mb-1">04. REKAP RIWAYAT RAPI</span>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">Menyimpan riwayat pesan pembeli, evaluasi kepuasan bintang, dan grafik omset harian secara otomatis.</p>
            </div>
          </div>
        </div>

        {/* Live Active AI Delegation Harness Simulation */}
        <div className="border border-zinc-850 bg-black/60 p-6 flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 font-mono text-[8px] bg-[#25D366]/10 text-[#25D366] uppercase font-bold tracking-widest">
            ● SIMULASI INTEGRASI AKTIF
          </div>
          <div className="flex flex-col gap-1 text-left">
            <span className="text-[10px] font-mono font-black text-[#25D366] uppercase tracking-wider flex items-center gap-2">
              <Network className="w-4 h-4 text-[#25D366]" />
              INTELLIGENT MESSAGE DELEGATOR & HARNESS INTERCEPTOR (LIVE ACT)
            </span>
            <p className="text-[11px] text-zinc-400 font-sans max-w-2xl leading-relaxed">
              Saksikan bagaimana asisten WhatsApp Anda membagi tugas secara otomatis dalam hitungan mili-detik menggunakan model AI Gemini untuk menghasilkan akurasi closing maksimal.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Box: Incoming Message */}
            <div className="lg:col-span-4 p-5 bg-zinc-950 border border-zinc-900 flex flex-col justify-between gap-4 text-left relative">
              <div className="flex items-center justify-between font-mono text-[9px] text-zinc-500 border-b border-zinc-900 pb-2">
                <span>Pesan Masuk WhatsApp</span>
                <span className="text-[#25D366] animate-pulse uppercase">STANDBY NYATA</span>
              </div>
              
              <div className="flex-1 flex flex-col justify-center py-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSimIndex}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.3 }}
                    className="p-3.5 bg-zinc-900 border-l-2 border-[#25D366] text-xs font-sans text-white leading-relaxed relative"
                  >
                    <span className="absolute -top-2.5 left-2 bg-[#25D366] text-black font-extrabold text-[8px] px-1.5 uppercase font-mono tracking-wider">
                      CALON PEMBELI
                    </span>
                    "{liveAgentActivities[activeSimIndex].incoming}"
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-2 pt-2 border-t border-zinc-900">
                <Send className="w-3.5 h-3.5 text-zinc-500" />
                <span>Terdeteksi di Handshake Node</span>
              </div>
            </div>

            {/* Middle Box: Routing Node Brain */}
            <div className="lg:col-span-4 p-5 bg-zinc-950/40 border border-zinc-900 flex flex-col justify-between gap-4 text-left relative">
              <div className="flex items-center justify-between font-mono text-[9px] text-zinc-500 border-b border-zinc-900 pb-2">
                <span>Harness Router Inteligensi</span>
                <span className="text-amber-400 font-bold font-mono">GEMINI CORE V2</span>
              </div>

              <div className="flex-1 flex flex-col justify-center items-center gap-4 py-3">
                <div className="w-12 h-12 bg-emerald-950/20 border border-[#25D366]/40 flex items-center justify-center relative rounded-full">
                  <Cpu className="w-5 h-5 text-[#25D366] animate-pulse" />
                  <span className="absolute inset-0 bg-[#25D366]/5 rounded-full animate-ping"></span>
                </div>
                
                <div className="text-center w-full space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span>Kepercayaan Router</span>
                    <span className="text-[#25D366] font-bold">{liveAgentActivities[activeSimIndex].confidence}% Confident</span>
                  </div>
                  <div className="w-full bg-black h-1.5 border border-zinc-850">
                    <motion.div 
                      key={activeSimIndex}
                      initial={{ width: "0%" }}
                      animate={{ width: `${liveAgentActivities[activeSimIndex].confidence}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="bg-[#25D366] h-full"
                    />
                  </div>
                  <div className="text-[10px] font-mono text-zinc-300 text-center uppercase tracking-normal animate-pulse truncate font-bold">
                    {liveAgentActivities[activeSimIndex].action}
                  </div>
                </div>
              </div>

              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider text-center pt-2 border-t border-zinc-900 truncate">
                {liveAgentActivities[activeSimIndex].statusText}
              </div>
            </div>

            {/* Right Box: Target Agent Active Reply */}
            <div className="lg:col-span-4 p-5 bg-zinc-950 border border-zinc-900 flex flex-col justify-between gap-4 text-left relative">
              <div className="flex items-center justify-between font-mono text-[9px] text-zinc-500 border-b border-zinc-900 pb-2">
                <span>Output Respon Asisten</span>
                <span className="text-[#25D366] font-bold">TERKIRIM KLIK</span>
              </div>

              <div className="flex-1 flex flex-col justify-center py-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSimIndex}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3 }}
                    className="p-3.5 bg-emerald-950/[0.15] border border-emerald-500/25 text-xs font-sans text-zinc-100 leading-relaxed relative"
                  >
                    <span className="absolute -top-2.5 left-2 bg-[#25D366] text-black font-extrabold text-[8px] px-1.5 uppercase font-mono tracking-wider">
                      {liveAgentActivities[activeSimIndex].name} ({liveAgentActivities[activeSimIndex].role})
                    </span>
                    "{liveAgentActivities[activeSimIndex].outgoing}"
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2 text-[9px] font-mono text-emerald-400 uppercase tracking-widest mt-2 pt-2 border-t border-zinc-900">
                <Smile className="w-3.5 h-3.5 text-[#25D366]" />
                <span>Penerimaan Di Sisi WhatsApp</span>
              </div>
            </div>
          </div>

          {/* GATHER-TOWN STYLE INTERACTIVE COLLABORATIVE 2D OFFICE FLOOR PLAN */}
          <div className="border-t border-zinc-900 pt-6 mt-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="text-left">
                <span className="text-[10px] font-mono font-bold text-[#25D366] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  GATHER-TOWN COLLABORATIVE OFFICE MAP (REAL-TIME AGENT EMULATION)
                </span>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Karakter AI berjalan otomatis mengelilingi ruangan kerja virtual. Pilih agen dan arahkan mereka untuk berkolaborasi!
                </p>
              </div>
              <div className="flex gap-2 font-mono text-[9px] uppercase">
                <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-850 text-zinc-400">
                  Agen Terpilih: <strong className="text-white">{selectedOfficeAgent ? officeAgents[selectedOfficeAgent].name : 'PILIH AGEN DI SINI'}</strong>
                </span>
                {selectedOfficeAgent && (
                  <button 
                    onClick={() => setSelectedOfficeAgent(null)}
                    className="px-2 py-0.5 bg-red-950/40 border border-red-900 text-red-100 hover:bg-red-900/30 font-bold transition-all cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                )}
              </div>
            </div>

            {/* Office map container */}
            <div 
              className="relative w-full h-[360px] bg-[#030303] border border-zinc-900 p-4 overflow-hidden cursor-crosshair"
              style={{
                backgroundImage: 'radial-gradient(rgba(37, 211, 102, 0.08) 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px'
              }}
              onClick={(e) => {
                // If an agent is selected, move them to the clicked coordinates!
                if (!selectedOfficeAgent) return;
                
                // Get click percentage coordinates relative to map container
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = ((e.clientX - rect.left) / rect.width) * 100;
                const clickY = ((e.clientY - rect.top) / rect.height) * 100;

                // Restrict boundaries so they stay neatly inside walls
                const boundedX = Math.max(8, Math.min(92, clickX));
                const boundedY = Math.max(10, Math.min(90, clickY));

                setOfficeAgents(prev => ({
                  ...prev,
                  [selectedOfficeAgent]: {
                    ...prev[selectedOfficeAgent],
                    x: boundedX,
                    y: boundedY,
                    status: `🏃 Pergi ke koordinat kustom (${Math.round(boundedX)}%, ${Math.round(boundedY)}%)...`
                  }
                }));

                // Auto deselect after command
                setTimeout(() => {
                  setSelectedOfficeAgent(null);
                }, 100);
              }}
            >
              {/* Rooms & Desks Layout Visual Guides */}
              
              {/* Top Area: Pantry */}
              <div className="absolute top-[5%] left-[40%] w-[20%] h-[18%] border-2 border-dashed border-zinc-900 bg-zinc-950/40 flex flex-col items-center justify-center pointer-events-none rounded px-1">
                <span className="text-lg">☕</span>
                <span className="text-[8px] font-mono text-zinc-550 font-bold tracking-widest">PANTRY COFFEES</span>
              </div>

              {/* Center Area: Gemini Core CPU */}
              <div className="absolute top-[38%] left-[40%] w-[20%] h-[24%] border-2 border-[#1c3325] bg-[#25D366]/[0.02] flex flex-col items-center justify-center pointer-events-none rounded-full shadow-[inset_0_0_15px_rgba(37,211,102,0.03)] px-2 text-center">
                <span className="text-xl animate-pulse">🧬</span>
                <span className="text-[8px] font-mono text-emerald-500 font-black tracking-widest uppercase">GEMINI PRO CORE</span>
                <span className="text-[6px] font-mono text-zinc-500 tracking-normal mt-0.5 uppercase">SYSTEM OVERSEER</span>
              </div>

              {/* Bottom Area: Lounge */}
              <div className="absolute bottom-[5%] left-[40%] w-[20%] h-[18%] border-2 border-dashed border-zinc-900 bg-zinc-950/40 flex flex-col items-center justify-center pointer-events-none rounded px-1">
                <span className="text-lg">🛋️</span>
                <span className="text-[8px] font-mono text-zinc-550 font-bold tracking-widest">DISCUSS LOUNGE</span>
              </div>

              {/* Four Workstations for specific roles */}
              {/* WS 1: Front Office (Top Left) */}
              <div className="absolute top-[15%] left-[8%] w-[22%] h-[24%] border border-zinc-900 bg-zinc-950/80 p-2 flex flex-col justify-between pointer-events-none rounded text-left">
                <div className="flex justify-between items-center text-[7px] font-mono text-pink-400 font-bold tracking-wider">
                  <span>WS-01</span>
                  <span>ONLINE</span>
                </div>
                <div className="text-center py-1">
                  <span className="text-sm">💻</span>
                  <div className="text-[8px] font-sans text-zinc-300 font-extrabold truncate uppercase mt-0.5">SITI RAHMA DESK</div>
                </div>
                <span className="text-[6px] font-mono text-zinc-500 uppercase tracking-widest">Front Office CS</span>
              </div>

              {/* WS 2: Nego & Bonus (Top Right) */}
              <div className="absolute top-[15%] right-[8%] w-[22%] h-[24%] border border-zinc-900 bg-zinc-950/80 p-2 flex flex-col justify-between pointer-events-none rounded text-left">
                <div className="flex justify-between items-center text-[7px] font-mono text-orange-400 font-bold tracking-wider">
                  <span>WS-02</span>
                  <span>ONLINE</span>
                </div>
                <div className="text-center py-1">
                  <span className="text-sm">⚖️</span>
                  <div className="text-[8px] font-sans text-zinc-300 font-extrabold truncate uppercase mt-0.5">BUDI SANTOSO DESK</div>
                </div>
                <span className="text-[6px] font-mono text-zinc-500 uppercase tracking-widest">Bonus & Negotiator</span>
              </div>

              {/* WS 3: Complaints (Bottom Left) */}
              <div className="absolute bottom-[15%] left-[8%] w-[22%] h-[24%] border border-zinc-900 bg-zinc-950/80 p-2 flex flex-col justify-between pointer-events-none rounded text-left">
                <div className="flex justify-between items-center text-[7px] font-mono text-cyan-400 font-bold tracking-wider">
                  <span>WS-03</span>
                  <span>ONLINE</span>
                </div>
                <div className="text-center py-1">
                  <span className="text-sm">🛠️</span>
                  <div className="text-[8px] font-sans text-zinc-300 font-extrabold truncate uppercase mt-0.5">YUSUF SUBAGJA DESK</div>
                </div>
                <span className="text-[6px] font-mono text-zinc-500 uppercase tracking-widest">Complain & Care</span>
              </div>

              {/* WS 4: Closing CRM (Bottom Right) */}
              <div className="absolute bottom-[15%] right-[8%] w-[22%] h-[24%] border border-zinc-900 bg-zinc-950/80 p-2 flex flex-col justify-between pointer-events-none rounded text-left">
                <div className="flex justify-between items-center text-[7px] font-mono text-emerald-400 font-bold tracking-wider">
                  <span>WS-04</span>
                  <span>ONLINE</span>
                </div>
                <div className="text-center py-1">
                  <span className="text-sm">💰</span>
                  <div className="text-[8px] font-sans text-zinc-300 font-extrabold truncate uppercase mt-0.5">CLOSING ADMIN DESK</div>
                </div>
                <span className="text-[6px] font-mono text-zinc-500 uppercase tracking-widest">CRM Closing & Admin</span>
              </div>

              {/* Render moving agents dynamically */}
              {(Object.keys(officeAgents) as Array<keyof typeof officeAgents>).map((key) => {
                const agent = officeAgents[key];
                const isActive = selectedOfficeAgent === agent.id;
                return (
                  <motion.div
                    key={agent.id}
                    className="absolute cursor-pointer z-20 group"
                    style={{ left: `${agent.x}%`, top: `${agent.y}%` }}
                    initial={false}
                    animate={{ 
                      left: `${agent.x}%`, 
                      top: `${agent.y}%`,
                    }}
                    transition={{ 
                      type: "spring",
                      stiffness: 75,
                      damping: 15,
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // Avoid triggering map coordinate movement
                      setSelectedOfficeAgent(agent.id);
                    }}
                  >
                    {/* Status popup text speech bubble above agent */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[170px] bg-black/95 border border-zinc-805 text-white text-[8.5px] p-2 leading-relaxed font-mono shadow-[0_4px_12px_rgba(0,0,0,0.8)] pointer-events-none rounded-none z-30 flex flex-col gap-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <span className="text-[#25D366] font-extrabold text-[8px] uppercase">{agent.name} ({agent.role})</span>
                      <span className="text-zinc-300 leading-tight text-[8px]">{agent.status || "Standby di Meja Kerja..."}</span>
                      {isActive && (
                        <span className="text-yellow-400 text-[7px] font-black animate-pulse mt-0.5">⭐ BERIKAN PERINTAH JALAN (KLIK LANTAI KOORDINAT)</span>
                      )}
                    </div>

                    {/* Agent avatar capsule */}
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all relative ${
                      isActive 
                        ? 'border-yellow-400 bg-yellow-950/80 scale-110 shadow-[0_0_15px_rgba(234,179,8,0.4)] animate-bounce' 
                        : 'border-zinc-750 bg-zinc-950 hover:border-[#25D366]/80 hover:scale-105'
                    }`}>
                      <span className="text-base select-none">{agent.emoji}</span>
                      
                      {/* Pulse active dot */}
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-black animate-pulse"></span>
                    </div>

                    {/* Simple tag showing first name */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1 bg-black/80 border border-zinc-900 text-[7px] text-zinc-400 font-mono text-center w-max uppercase tracking-wider font-extrabold rounded-none">
                      {agent.name.split(' ')[0]}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Quick Agent Selection Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 p-2.5 bg-zinc-950 border border-zinc-900 text-[10px] font-mono rounded">
              <span className="text-zinc-500 uppercase tracking-wider">Klik Cepat Untuk Memiliki Kendali:</span>
              <div className="flex gap-2">
                {(Object.keys(officeAgents) as Array<keyof typeof officeAgents>).map((key) => {
                  const agent = officeAgents[key];
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedOfficeAgent(agent.id)}
                      className={`px-3 py-1 flex items-center gap-1.5 border uppercase font-bold text-[9px] transition-all cursor-pointer ${
                        selectedOfficeAgent === agent.id
                          ? 'bg-yellow-400 text-black border-yellow-500 font-extrabold italic'
                          : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:text-white hover:border-[#25D366]'
                      }`}
                    >
                      <span>{agent.emoji}</span>
                      <span>{agent.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="text-[9px] font-mono text-zinc-500 text-center uppercase tracking-wide">
              💡 Klik tombol karakter di atas atau ikon dalam peta, lalu Klik lantai kantor virtual untuk menyuruh karakter tersebut berjalan ke sana secara manual!
            </div>
          </div>
        </div>

        {/* 2. Daftar Nama Agent */}
        <div>
          <h3 className="text-xs font-mono font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2 select-none">
            <Bot className="w-4 h-4 text-[#25D366]" />
            DOKUMENTASI KEMAMPUAN AGENT COLLABORATIVE YANG SEDANG BEROPERASI
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {/* Agent 1 */}
            <div className={`p-5 bg-black border flex flex-col gap-3 transition-all relative ${
              activeSimIndex === 0 
                ? 'border-[#25D366] shadow-[0_0_20px_rgba(37,211,102,0.12)] bg-[#25D366]/5 scale-[1.03]' 
                : 'border-zinc-900 opacity-60 hover:opacity-100 hover:border-zinc-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#25D366] font-black font-mono tracking-widest uppercase">FRONT-OFFICE</span>
                <span className={`w-2 h-2 bg-emerald-500 rounded-full ${activeSimIndex === 0 ? 'animate-ping' : ''}`}></span>
              </div>
              <h4 className="text-sm font-black text-white uppercase font-display italic flex items-center gap-1.5">
                Sapa & Cek Stok
                {activeSimIndex === 0 && <span className="text-[9px] text-[#25D366] uppercase font-mono not-italic">(Aktif)</span>}
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                <strong>Siti Rahma (CS Frontliner)</strong>: Menyapa hangat calon pembeli baru, mengenalkan katalog produk terlaris Anda, dan mengonfirmasi ketersediaan pilihan warna serta ukuran.
              </p>
            </div>

            {/* Agent 2 */}
            <div className={`p-5 bg-black border flex flex-col gap-3 transition-all relative ${
              activeSimIndex === 1 
                ? 'border-[#25D366] shadow-[0_0_20px_rgba(37,211,102,0.12)] bg-[#25D366]/5 scale-[1.03]' 
                : 'border-zinc-900 opacity-60 hover:opacity-100 hover:border-zinc-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#25D366] font-black font-mono tracking-widest uppercase">BONUS & NEGO</span>
                <span className={`w-2 h-2 bg-emerald-500 rounded-full ${activeSimIndex === 1 ? 'animate-ping' : ''}`}></span>
              </div>
              <h4 className="text-sm font-black text-white uppercase font-display italic flex items-center gap-1.5">
                Tawarkan Bonus Menarik
                {activeSimIndex === 1 && <span className="text-[9px] text-[#25D366] uppercase font-mono not-italic">(Aktif)</span>}
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                <strong>Budi Santoso (Nego Assistant)</strong>: Menawarkan bonus merchandise kecil (seperti gantungan kunci menarik atau kaos kaki gratis) jika pembeli menawar harga terlalu ketat agar margin laba Anda tetap aman.
              </p>
            </div>

            {/* Agent 3 */}
            <div className={`p-5 bg-black border flex flex-col gap-3 transition-all relative ${
              activeSimIndex === 2 
                ? 'border-[#25D366] shadow-[0_0_20px_rgba(37,211,102,0.12)] bg-[#25D366]/5 scale-[1.03]' 
                : 'border-zinc-900 opacity-60 hover:opacity-100 hover:border-zinc-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#25D366] font-black font-mono tracking-widest uppercase">COMPLAINT CARE</span>
                <span className={`w-2 h-2 bg-emerald-500 rounded-full ${activeSimIndex === 2 ? 'animate-ping' : ''}`}></span>
              </div>
              <h4 className="text-sm font-black text-white uppercase font-display italic flex items-center gap-1.5">
                Atasi Keluhan Sabar
                {activeSimIndex === 2 && <span className="text-[9px] text-[#25D366] uppercase font-mono not-italic">(Aktif)</span>}
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                <strong>Yusuf Subagja (Complain Care)</strong>: Membantu memantau pengiriman barang yang terlambat secara tenang, sopan, dan solutif sehingga pelanggan tetap loyal dan puas.
              </p>
            </div>

            {/* Agent 4 */}
            <div className={`p-5 bg-black border flex flex-col gap-3 transition-all relative ${
              activeSimIndex === 3 
                ? 'border-[#25D366] shadow-[0_0_20px_rgba(37,211,102,0.12)] bg-[#25D366]/5 scale-[1.03]' 
                : 'border-zinc-900 opacity-60 hover:opacity-100 hover:border-zinc-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#25D366] font-black font-mono tracking-widest uppercase">CRM ADMIN</span>
                <span className={`w-2 h-2 bg-emerald-500 rounded-full ${activeSimIndex === 3 ? 'animate-ping' : ''}`}></span>
              </div>
              <h4 className="text-sm font-black text-white uppercase font-display italic flex items-center gap-1.5">
                Cetak Tagihan & No Rek
                {activeSimIndex === 3 && <span className="text-[9px] text-[#25D366] uppercase font-mono not-italic">(Aktif)</span>}
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                <strong>Asisten Admin Closing</strong>: Merespons data pesanan secara otomatis, memberikan total tagihan belanjaan secara rapi, memandu pembeli ke nomor rekening transfer, serta mendata input pesanan Anda.
              </p>
            </div>
          </div>
        </div>

      </section>

      {/* SECTION 2: BENTO GRID VALUE PROPOSITIONS */}
      <section className="flex flex-col gap-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs font-bold text-[#25D366] uppercase tracking-widest font-mono">
            MANFAAT UTAMA ASISTEN
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tight font-display">
            MENGAPA PILIH OH MY <span className="text-[#25D366]">AGENTWA</span>?
          </h2>
          <p className="text-zinc-500 text-xs font-sans leading-relaxed">
            Didesain khusus untuk mempermudah transaksi toko online dan UMKM Indonesia yang ingin respon super cepat tanpa repot.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="bg-zinc-950/80 border border-zinc-900 p-6 flex flex-col gap-4 hover:border-[#25D366]/40 transition-colors">
            <div className="w-10 h-10 bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#25D366]" />
            </div>
            <h3 className="text-base font-bold text-white uppercase font-sans">Buat Profil Sekali Klik</h3>
            <p className="text-zinc-400 text-xs leading-relaxed font-sans">
              Formulasikan nama asisten, bio, detail FAQ produk, dan kata-kata promosi hanya sekali klik dengan bantuan asisten pintar kami.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-zinc-950/80 border border-zinc-900 p-6 flex flex-col gap-4 hover:border-[#25D366]/40 transition-colors">
            <div className="w-10 h-10 bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-sky-400" />
            </div>
            <h3 className="text-base font-bold text-white uppercase font-sans">Penyimpanan Database Aman</h3>
            <p className="text-zinc-400 text-xs leading-relaxed font-sans">
              Terhubung langsung ke cloud database aman untuk menyimpan rekap order, FAQ, serta setelan asisten secara otomatis dan real-time.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-zinc-950/80 border border-zinc-900 p-6 flex flex-col gap-4 hover:border-[#25D366]/40 transition-colors">
            <div className="w-10 h-10 bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-[#25D366]" />
            </div>
            <h3 className="text-base font-bold text-white uppercase font-sans">Kontrol Pembelian Tertib</h3>
            <p className="text-zinc-400 text-xs leading-relaxed font-sans">
              Atur format kirim orderan, petunjuk transfer, hingga pemindahan obrolan ke WhatsApp admin asli secara tertib dan disiplin.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-zinc-950/80 border border-zinc-900 p-6 flex flex-col gap-4 hover:border-[#25D366]/40 transition-colors">
            <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Phone className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-base font-bold text-white uppercase font-sans">Simulasi HP Interaktif</h3>
            <p className="text-zinc-400 text-xs leading-relaxed font-sans">
              Coba sapa dan ketes asisten Anda secara langsung melalui replika HP simulator WhatsApp sebelum meluncurkannya ke publik.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-zinc-950/80 border border-zinc-900 p-6 flex flex-col gap-4 hover:border-[#25D366]/40 transition-colors">
            <div className="w-10 h-10 bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-[#25D366]" />
            </div>
            <h3 className="text-base font-bold text-white uppercase font-sans">Koneksi QR WA Mudah</h3>
            <p className="text-zinc-400 text-xs leading-relaxed font-sans">
              Hubungkan asisten ke nomor WhatsApp bisnis Anda dengan memindai kode QR. Aman, mudah, dan langsung siap menjawab obrolan.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-zinc-950/80 border border-zinc-900 p-6 flex flex-col gap-4 hover:border-[#25D366]/40 transition-colors">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-white uppercase font-sans">Laporan Grafik Praktis</h3>
            <p className="text-zinc-400 text-xs leading-relaxed font-sans">
              Pantau total chat masuk harian, kecepatan respon asisten, hingga grafik bintang kepuasan pembeli secara praktis dan ringkas.
            </p>
          </div>

        </div>
      </section>

      {/* SECTION 3: INTERACTIVE PRICING GRID */}
      <section className="bg-zinc-950 border border-zinc-900 p-8 md:p-12 relative overflow-hidden flex flex-col gap-10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#25D366]/5 to-transparent pointer-events-none"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-900 pb-8">
          <div>
            <span className="text-xs font-bold text-[#25D366] uppercase tracking-widest font-mono">SKEMA PRICING ADAPTIF</span>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tight mt-1 font-display">Pilih Paket Penunjang Bisnis Anda</h2>
            <p className="text-zinc-500 text-xs mt-1.5 font-sans leading-relaxed">
              Mulai dari paket sandbox gratis uji simulasi sepuasnya, hingga infrastruktur server cloud 24/7 dedicated untuk kebutuhan profesional.
            </p>
          </div>

          {/* Switch cycle toggle button */}
          <div className="flex items-center bg-black border border-zinc-850 p-1 font-mono text-xs select-none">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 uppercase tracking-wide font-black border-none cursor-pointer ${
                billingCycle === 'monthly' ? 'bg-[#25D366] text-black' : 'bg-transparent text-zinc-400'
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 uppercase tracking-wide font-black border-none cursor-pointer ${
                billingCycle === 'yearly' ? 'bg-[#25D366] text-black' : 'bg-transparent text-zinc-400'
              }`}
            >
              Tahunan (-20%)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Plan 1 */}
          <div className="border border-zinc-900 p-6 bg-black flex flex-col justify-between gap-8 hover:border-zinc-800 transition-colors">
            <div className="space-y-4">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Uji Coba Sandbox</span>
              <h4 className="text-xl font-black text-white uppercase italic">Starter Plan</h4>
              <p className="text-zinc-500 text-xs leading-relaxed">Cocok untuk pemula yang ingin mengetes asisten di simulator internal sebelum meluncur to asisten WhatsApp asli.</p>
              
              <div className="pt-2">
                <span className="text-3xl font-black text-white">Rp 0</span>
                <span className="text-zinc-500 text-xs font-mono"> / selamanya</span>
              </div>

              <ul className="space-y-2 border-t border-zinc-900 pt-4 text-[11px] text-zinc-400 font-sans">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#25D366]" /> 1 Mock Assistant Profile</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#25D366]" /> Unlimited Sandbox Chat Test</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#25D366]" /> Manual FAQ Addition</li>
                <li className="flex items-center gap-2 text-zinc-650 line-through"><Check className="w-3.5 h-3.5 text-zinc-700" /> Link real WhatsApp Number</li>
                <li className="flex items-center gap-2 text-zinc-650 line-through"><Check className="w-3.5 h-3.5 text-zinc-700" /> Full Automated Webhooks Sync</li>
              </ul>
            </div>

            <button
              onClick={onSignIn}
              className="w-full bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-850 py-3 text-xs font-black uppercase tracking-wider italic rounded-none select-none cursor-pointer"
            >
              Coba Sekarang
            </button>
          </div>

          {/* Plan 2 */}
          <div className="border-2 border-[#25D366] p-6 bg-black/40 flex flex-col justify-between gap-8 relative">
            <span className="absolute -top-3 left-4 bg-[#25D366] text-black font-extrabold uppercase font-mono text-[9px] px-2.5 py-0.5 tracking-wider italic">REKOMENDASI UMKM</span>
            
            <div className="space-y-4">
              <span className="text-[10px] font-mono text-[#25D366] uppercase tracking-widest block">FULL SYSTEM KONEKTIVITAS</span>
              <h4 className="text-xl font-black text-white uppercase italic">Business Pro</h4>
              <p className="text-zinc-400 text-xs leading-relaxed">Pilihan standar terbaik bagi online shop berkembang di Instagram, Shopee, Tokopedia, dan katering lokal.</p>
              
              <div className="pt-2">
                <span className="text-3xl font-black text-white">
                  {billingCycle === 'monthly' ? 'Rp 149.000' : 'Rp 119.000'}
                </span>
                <span className="text-zinc-500 text-xs font-mono"> / bulan</span>
              </div>

              <ul className="space-y-2 border-t border-zinc-900 pt-4 text-[11px] text-zinc-300 font-sans">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#25D366]" /> 1 Real Active WhatsApp Linked</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#25D366]" /> Auto Generate FAQ & Custom Prompt</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#25D366]" /> Custom Skenario Flow Rules</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#25D366]" /> Real-time Handheld Telemetry</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#25D366]" /> Webhook Logs & CRM Proxy</li>
              </ul>
            </div>

            <button
              onClick={onSignIn}
              className="w-full bg-[#25D366] hover:bg-white text-black py-3.5 text-xs font-black uppercase tracking-wider italic rounded-none flex items-center justify-center gap-1.5 select-none cursor-pointer hover:shadow-[0_0_15px_rgba(37,211,102,0.25)] transition-all"
            >
              <span>Langganan Pro</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Plan 3 */}
          <div className="border border-zinc-900 p-6 bg-black flex flex-col justify-between gap-8 hover:border-zinc-800 transition-colors">
            <div className="space-y-4">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">ENTERPRISE CLUSTER</span>
              <h4 className="text-xl font-black text-white uppercase italic">Scale-Up Max</h4>
              <p className="text-zinc-500 text-xs leading-relaxed">Model cluster bagi agensi besar, developer sistem CRM, atau jaringan startup retail dengan multi-nomor terpadu.</p>
              
              <div className="pt-2">
                <span className="text-3xl font-black text-white">
                  {billingCycle === 'monthly' ? 'Rp 499.000' : 'Rp 399.000'}
                </span>
                <span className="text-zinc-500 text-xs font-mono"> / bulan</span>
              </div>

              <ul className="space-y-2 border-t border-zinc-900 pt-4 text-[11px] text-zinc-400 font-sans">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#25D366]" /> Up to 5 Real Active WhatsApps</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#25D366]" /> High Priority API Server</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#25D366]" /> Dedicated Node Infrastructure</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#25D366]" /> SLA Uptime 99.9%</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#25D366]" /> White-Label Admin Dashboards</li>
              </ul>
            </div>

            <button
              onClick={onSignIn}
              className="w-full bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-850 py-3 text-xs font-black uppercase tracking-wider italic rounded-none select-none cursor-pointer"
            >
              Hubungi Sales
            </button>
          </div>

        </div>
      </section>

      {/* SECTION 4: COLLAPSIBLE FAQ ACCORDION */}
      <section className="flex flex-col gap-8 max-w-3xl mx-auto w-full">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-[#25D366] uppercase tracking-widest font-mono">FAQ CENTER</span>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tight font-display">TANYA JAWAB UMUM</h2>
          <p className="text-zinc-500 text-xs font-sans">Pertanyaan seputar integrasi asisten robot Oh My AgentWA yang sering ditanyakan partner UMKM.</p>
        </div>

        <div className="flex flex-col gap-3">
          {faqItems.map((fi, i) => (
            <div 
              key={i} 
              className="bg-zinc-950 border border-zinc-900 transition-all duration-300"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left p-5 flex justify-between items-center bg-transparent border-none text-white font-sans font-bold text-sm cursor-pointer hover:bg-zinc-900 select-none"
              >
                <span>{fi.q}</span>
                <ChevronRight className={`w-4 h-4 text-[#25D366] font-black transition-transform duration-300 ${
                  openFaq === i ? 'rotate-90' : 'rotate-0'
                }`} />
              </button>
              
              {openFaq === i && (
                <div className="px-5 pb-5 pt-1 text-zinc-400 text-xs leading-relaxed font-sans border-t border-zinc-900">
                  {fi.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER AREA */}
      <footer className="w-full border-t border-zinc-900 bg-black/20 mt-12">
        <div className="max-w-[1600px] w-full mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] text-zinc-500 font-mono">
          <div>
            © 2026 <span className="text-white hover:text-[#25D366] transition-colors font-bold">OH MY AGENTWA</span>. Sukses Bersama UMKM Indonesia.
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <button 
              onClick={() => setActiveLegalModal('privacy')}
              className="hover:text-white transition-colors cursor-pointer bg-transparent border-none text-[10px] font-mono p-0 uppercase"
            >
              KEBIJAKAN PRIVASI
            </button>
            <span>•</span>
            <button 
              onClick={() => setActiveLegalModal('terms')}
              className="hover:text-white transition-colors cursor-pointer bg-transparent border-none text-[10px] font-mono p-0 uppercase"
            >
              KETENTUAN LAYANAN
            </button>
          </div>
        </div>
      </footer>

      {/* FULL LEGAL / API MODAL SWITCH */}
      {activeLegalModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-850 rounded-none w-full max-w-2xl p-6 text-left space-y-5 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#25D366]"></span>
                <span className="text-xs font-mono font-black text-[#25D366] uppercase tracking-wider">
                  {activeLegalModal === 'privacy' && 'Dokumen Resmi: Kebijakan Privasi'}
                  {activeLegalModal === 'terms' && 'Dokumen Resmi: Ketentuan Layanan'}
                </span>
              </div>
              <button
                onClick={() => setActiveLegalModal(null)}
                className="w-8 h-8 rounded-none border border-zinc-900 text-zinc-400 hover:text-white hover:border-[#25D366] flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto pr-2 space-y-4 text-xs text-zinc-300 font-sans leading-relaxed selection:bg-[#25D366] selection:text-black">
              {activeLegalModal === 'privacy' && (
                <>
                  <p className="font-bold text-white text-sm">KEBIJAKAN PRIVASI OH MY AGENTWA</p>
                  <p className="text-zinc-400 font-mono text-[10px]">Terakhir diperbarui: 25 Mei 2026</p>
                  
                  <div className="space-y-3 pt-2">
                    <h4 className="text-white font-bold uppercase tracking-tight">1. Pengumpulan Informasi</h4>
                    <p>
                      Oh My AgentWA mengumpulkan data konfigurasi asisten pintar Anda, daftar FAQ, alur aturan skenario, dan riwayat sapaan simulator demi kelancaran balasan kecerdasan buatan. Kami menghormati hak privasi pelanggan Anda sepenuhnya. Riwayat chat WhatsApp Anda tidak akan disalahgunakan atau dijual ke pihak ketiga manapun.
                    </p>
                    
                    <h4 className="text-white font-bold uppercase tracking-tight">2. Enkripsi Sesi WhatsApp</h4>
                    <p>
                      Koneksi kami ke nomor WhatsApp Anda dilakukan menggunakan enkripsi private key WebSocket lokal. Kami tidak menyimpan kata sandi Anda dan tidak mengendalikan akses finansial pada akun Anda. Anda memegang kendali penuh dan dapat memutuskan tautan perangkat secara instan melalui aplikasi WhatsApp resmi Anda kapan saja.
                    </p>

                    <h4 className="text-white font-bold uppercase tracking-tight">3. Integritas Keamanan Berkas</h4>
                    <p>
                      Jika Anda mengaktifkan Firebase Cloud Sync, seluruh kredensial terenkripsi aman di cloud Firestore pribadi Anda tanpa risiko bocor. Kami merekomendasikan untuk menghindari pengisian informasi keamanan perbankan sensitif pada instruksi agen Anda.
                    </p>
                  </div>
                </>
              )}

              {activeLegalModal === 'terms' && (
                <>
                  <p className="font-bold text-white text-sm">KETENTUAN LAYANAN & PENGGUNAAN</p>
                  <p className="text-zinc-400 font-mono text-[10px]">Terakhir diperbarui: 25 Mei 2026</p>

                  <div className="space-y-3 pt-2">
                    <h4 className="text-white font-bold uppercase tracking-tight">1. Penggunaan yang Diperbolehkan</h4>
                    <p>
                      Oh My AgentWA diciptakan untuk mempermudah operasional UMKM, menjawab keluhan, memberikan edukasi produk, serta mengarahkan pembeli Indonesia menuju metode transaksi jual-beli yang legal dan transparan.
                    </p>

                    <h4 className="text-white font-bold uppercase tracking-tight">2. Larangan Penyalahgunaan (Anti-Spam)</h4>
                    <p>
                      Anda dilarang keras menggunakan sistem kami untuk tindakan spamming massal (blast iklan tak bertanggung jawab), penyebaran berita bohong, ujaran kebencian, perjudian, narkoba, atau aktivitas ilegal yang melanggar hukum Republik Indonesia serta melanggar Ketentuan Layanan resmi dari Meta WhatsApp Business API.
                    </p>

                    <h4 className="text-white font-bold uppercase tracking-tight">3. Penafian Tanggung Jawab</h4>
                    <p>
                      Kami menyediakan asisten ini untuk kemudahan simulasi dan otomatisasi mandiri. Segala kerusakan, suspend nomor WhatsApp yang disebabkan oleh aktivitas spam intensitas tinggi, sepenuhnya merupakan tanggung jawab pengguna. Silakan gunakan fitur sapaan manusiawi dan jeda antar-detik secara bijaksana.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-900 pt-3 flex justify-end">
              <button
                onClick={() => setActiveLegalModal(null)}
                className="bg-[#25D366] hover:bg-white text-black font-black uppercase text-[10px] tracking-wider italic px-4 py-2 cursor-pointer transition-colors"
              >
                TUTUP JENDELA
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
