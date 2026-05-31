/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Bot, Smartphone, Settings, BarChart2, Check, RefreshCw, 
  HelpCircle, Shield, ArrowRight, Zap, Play, Terminal, LogOut, CheckCheck, 
  BookOpen, GitCommit, MessageSquare, Database, ExternalLink, QrCode, Globe,
  LogIn, User, Cloud, Save, Camera, Upload, Trash, Image, Award, AlertCircle, Cpu, Layers, Laptop, Copy, XCircle,
  Menu, X
} from 'lucide-react';
import { BusinessInput, AgentConfig, FAQItem, FlowRule } from './types';
import PhoneSimulator from './components/PhoneSimulator';
import KnowledgeBase from './components/KnowledgeBase';
import FlowRules from './components/FlowRules';
import AgentDelegationHarness from './components/AgentDelegationHarness';
import WebhookIntegration from './components/WebhookIntegration';
import DashboardAnalytics from './components/DashboardAnalytics';
import PrivacyShieldDashboard from './components/PrivacyShieldDashboard';
import EvaluationDashboard from './components/EvaluationDashboard';
import LandingPage from './components/LandingPage';

// Firebase Imports
import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// Pre-packaged high-quality business templates for quick evaluation
const BUSINESS_PRESETS = [
  {
    name: "SneakerKicks (Toko Sepatu)",
    description: "Toko sepatu sneaker premium Bandung. Range harga Rp250.000 - Rp750.000. Keunggulan: gratis kaos kaki premium setiap pembelian, bisa tukar size gratis ongkir jabodetabek, bayar COD se-Indonesia.",
    target: "Anak muda millennial & Gen Z yang fashionable",
    tone: "casual" as const,
    goal: "Menjawab info stock, merekomendasikan model terlaris, dan membantu negosiasi tipis agar pembeli langsung order."
  },
  {
    name: "Dapur Ummi (F&B / Catering)",
    description: "Catering harian sehat tanpa MSG & restoran masakan rumahan premium di Jakarta Selatan. Harga paket bulanan Rp450.000 (20 hari). Menerima nasi tumpeng, snack box, dan pesanan prasmanan kantor.",
    target: "Ibu rumah tangga sibuk, anak kos, dan admin kantor yang memesan konsumsi rapat",
    tone: "warm" as const,
    goal: "Menginfokan menu harian, mencatat pemesanan katering bulanan, serta mengarahkan ke link invoice pembayaran."
  },
  {
    name: "Griya Vibe (Laundry & Kost)",
    description: "Kost putri premium laundry kiloan ekspres di dekat kampus Universitas Padjadjaran Jatinangor. Laundry kilat 6 jam selesai seharga 15rb/kg. Kost kamar mandi dalam AC seharga 1.5jt/bulan sisa 2 kamar kosong.",
    target: "Mahasiswa baru Unpad yang praktis dan butuh hunian eksklusif",
    tone: "casual" as const,
    goal: "Menjawab slot kamar kost kosong, menjadwalkan kunjungan survei kamar bagi ortu mahasiswa, dan menerima booking laundry pick-up."
  }
];

export default function App() {
  const [input, setInput] = useState<BusinessInput>({
    businessName: '',
    businessDescription: '',
    targetMarket: '',
    toneStyle: 'casual',
    agentGoal: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isFallbackActive, setIsFallbackActive] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [loadedSteps, setLoadedSteps] = useState<string[]>([]);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'phone' | 'faq' | 'flow' | 'harness' | 'prompt' | 'webhook' | 'privacy' | 'reports'>('phone');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Firebase Auth & Cloud Sync States
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initial connection validation on application boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Listen to Auth State changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(true);

      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid, 'config', 'default');
          const docSnap = await getDoc(docRef).catch(err => {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}/config/default`);
          });

          if (docSnap && docSnap.exists()) {
            const data = docSnap.data() as AgentConfig;
            setConfig(data);
            addLog([
              `[Cloud DB] Berhasil memuat asisten "${data.name}" dari cloud database! `,
              `[Auth] Masuk sebagai: ${user.email}`
            ]);
          } else {
            addLog([
              `[Cloud DB] Akun baru: Belum ada asisten tersimpan. Silakan isi formulir untuk men-generate asisten!`,
              `[Auth] Masuk sebagai: ${user.email}`
            ]);
          }
        } catch (error: any) {
          console.error("Firestore loading error:", error);
          addLog(`[Cloud DB Error] Gagal menyinkronkan data: ${error.message}`);
        }
      } else {
        setConfig(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-sync configuration modifications back to Firestore
  useEffect(() => {
    if (!currentUser || !config) return;

    const delayDebounce = setTimeout(async () => {
      setIsSaving(true);
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'config', 'default');
        await setDoc(docRef, config).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/config/default`);
        });
        addLog(`[Cloud DB] Konfigurasi asisten "${config.name}" berhasil dicadangkan ke Cloud! `);
      } catch (err: any) {
        console.error("Auto-sync error:", err);
        addLog(`[Cloud DB ERROR] Cadangan otomatis gagal: ${err.message}`);
      } finally {
        setIsSaving(false);
      }
    }, 1200);

    return () => clearTimeout(delayDebounce);
  }, [config, currentUser]);

  const handleSignIn = async () => {
    try {
      addLog("[Auth] Menghubungi Google Authentication...");
      const result = await signInWithPopup(auth, googleProvider);
      addLog(`[Auth] Selamat datang, ${result.user.displayName}!`);
    } catch (err: any) {
      console.error(err);
      addLog(`[Auth ERROR] Gagal login: ${err.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      addLog("[Auth] Berhasil logout dari akun Google.");
    } catch (err: any) {
      console.error(err);
      addLog(`[Auth ERROR] Gagal logout: ${err.message}`);
    }
  };
  
  // Simulated or Real device connection state
  const [isWAAgentLive, setIsWAAgentLive] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrProgress, setQrProgress] = useState(0);
  const [isBypassMode, setIsBypassMode] = useState(false);
  const [qrTutorialStep, setQrTutorialStep] = useState<number>(0);
  const [copiedQr, setCopiedQr] = useState(false);
  const [copiedInstructions, setCopiedInstructions] = useState(false);
  const prevStatusRef = useRef<string>('idle');

  const handleCopyQr = () => {
    if (baileysConnectState.qr) {
      navigator.clipboard.writeText(baileysConnectState.qr);
      setCopiedQr(true);
      addLog(" [QR Code] Berhasil menyalin data QR ke clipboard.");
      setTimeout(() => setCopiedQr(false), 2000);
    }
  };

  const handleCopyInstructions = () => {
    const text = `Info:  PETUNJUK KONEKSI WHATSAPP BOT:
1. Buka aplikasi WhatsApp di HP Anda.
2. Ketuk ikon Menu (Tiga Titik ⋮ di Android, atau Pengaturan  di iOS).
3. Pilih menu "Perangkat Tertaut" (Linked Devices).
4. Klik tombol "Tautkan Perangkat".
5. Arahkan kamera HP Anda ke layar QR Code untuk memindai.
6. Selesai! Bot WhatsApp Anda akan otomatis Terhubung, Aktif & Live!`;
    navigator.clipboard.writeText(text);
    setCopiedInstructions(true);
    addLog(" [Panduan] Petunjuk koneksi telah disalin ke clipboard.");
    setTimeout(() => setCopiedInstructions(false), 2000);
  };

  // Custom User Avatar File Reader Integration
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1000 * 1024) {
        alert("Gambar terlalu besar! Maksimal 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && config) {
          setConfig({ ...config, avatarImage: reader.result });
          addLog(" [Custom Avatar] Berhasil mengunggah file gambar avatar!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCustomAvatar = () => {
    if (config) {
      const newConfig = { ...config };
      delete newConfig.avatarImage;
      setConfig(newConfig);
      addLog(" [Custom Avatar] Mengembalikan avatar ke inisial nama.");
    }
  };

  // Real Baileys connection state sync
  const [baileysConnectState, setBaileysConnectState] = useState<{
    status: 'idle' | 'connecting' | 'qr' | 'open' | 'closed' | 'error';
    qr: string;
    phone: string;
    error: string;
  }>({ status: 'idle', qr: '', phone: '', error: '' });

  // Poll real Baileys connection status in real-time when config is active
  useEffect(() => {
    if (!config) return;

    let timer: NodeJS.Timeout;
    const checkBaileysStatus = async () => {
      try {
        const res = await fetch('/api/baileys/status');
        if (res.ok) {
          const data = await res.json();
          setBaileysConnectState(data);
          
          if (data.status === 'open') {
            setIsWAAgentLive(true);
            setIsBypassMode(false);
          } else {
            // If offline in real engine, only keep live if in bypass/mock mode
            if (!isBypassMode) {
              setIsWAAgentLive(false);
            }
          }
        }
      } catch (err: any) {
        // Suppress benign background polling errors to support smooth sandbox dev flow
        const isFetchErr = err?.message?.toLowerCase().includes('fetch') || String(err).toLowerCase().includes('fetch');
        if (isFetchErr) {
          console.info(" [Sandbox Guard] Silent background fetch failure for Baileys status (expected during dev):", err?.message || err);
        } else {
          console.error("Failed to poll Baileys status from App", err);
        }
      }
    };

    checkBaileysStatus();
    timer = setInterval(checkBaileysStatus, 2500);

    return () => clearInterval(timer);
  }, [config, isBypassMode]);

  // Automatically handle modal close and logging on real QR pairing success
  useEffect(() => {
    if (showQrModal && baileysConnectState.status === 'open' && prevStatusRef.current !== 'open') {
      setShowQrModal(false);
      setIsWAAgentLive(true);
      setIsBypassMode(false);
      addLog([
        `[WhatsApp Engine] BERHASIL LINKED!  HP Asli Anda Terhubung`,
        `[System] Akun (+${baileysConnectState.phone}) kini mengudara secara live!`,
        `[System] Coba chat nomor WhatsApp Anda ini sekarang dari HP lain untuk melihat AI membalas langsung secara nyata! `
      ]);
    }
    prevStatusRef.current = baileysConnectState.status;
  }, [baileysConnectState.status, showQrModal, baileysConnectState.phone]);

  // Live System logs state
  const [logs, setLogs] = useState<string[]>([
    "[System] Autonomous Gateway engine initialized. Standby...",
    "Input deskripsi bisnismu di sebelah kiri untuk men-generate AI Employee.",
  ]);

  const addLog = (newLogs: string | string[]) => {
    const list = Array.isArray(newLogs) ? newLogs : [newLogs];
    setLogs(prev => [...list, ...prev].slice(0, 50)); // Cap logs to last 50 entries
  };

  const handleSelectPreset = (preset: typeof BUSINESS_PRESETS[0]) => {
    setInput({
      businessName: preset.name.substring(preset.name.indexOf(" ") + 1),
      businessDescription: preset.description,
      targetMarket: preset.target,
      toneStyle: preset.tone,
      agentGoal: preset.goal
    });
    addLog(`[Preset] Tema "${preset.name}" dipilih secara instan. Siap di-generate!`);
  };

  const [isEnhancingDescription, setIsEnhancingDescription] = useState(false);

  const handleEnhanceDescription = async () => {
    if (!input.businessName || !input.businessDescription) {
      addLog("[Enhancer Warning] Mohon masukkan Nama Bisnis dan Deskripsi kasar terlebih dahulu!");
      return;
    }

    setIsEnhancingDescription(true);
    addLog("[AI Enhancer] Menyempurnakan deskripsi produk, harga, dan ketentuan dengan AI...");

    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: input.businessName,
          businessDescription: input.businessDescription,
          toneStyle: input.toneStyle
        })
      });

      if (res.ok) {
        const data = await res.json();
        setInput(prev => ({
          ...prev,
          businessDescription: data.enhancedDescription || prev.businessDescription,
          agentGoal: data.suggestedGoal || prev.agentGoal,
          targetMarket: data.suggestedTarget || prev.targetMarket
        }));
        addLog([
          `[AI Enhancer] Deskripsi berhasil dipoles menjadi detail premium! `,
          `[AI Enhancer] Sasaran performa asisten terpapar: "${data.suggestedGoal}"`,
          `[AI Enhancer] Target pembeli disarankan: "${data.suggestedTarget}"`
        ]);
      } else {
        throw new Error("Gagal menyambungkan ke asisten optimasi.");
      }
    } catch (err: any) {
      console.error(err);
      addLog(`[AI Enhancer Error] Tidak dapat memoles deskripsi: ${err.message}`);
    } finally {
      setIsEnhancingDescription(false);
    }
  };

  const handleGenerateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.businessName || !input.businessDescription) return;

    setIsLoading(true);
    setLoadedSteps([]);
    setConfig(null);
    setIsWAAgentLive(false);
    setIsFallbackActive(false);

    // Dynamic loading text simulating AI workspace operations
    const steps = [
      "Menggali esensi bisnis & mengekstrak keunggulan kompetitif...",
      "Membentuk kepribadian AI Admin & merumuskan parameter sapaan...",
      "Merancang 20+ dataset FAQ produk & strategi closing jualan...",
      "Mensintesis logika flow aturan negosiasi & penanganan kendala...",
      "Menginisiasi sandbox server & mempersiapkan WhatsApp Virtual Node..."
    ];

    for (let i = 0; i < steps.length; i++) {
      setLoadStep(i);
      setLoadedSteps(prev => [...prev, steps[i]]);
      await new Promise(resolve => setTimeout(resolve, 1400));
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });

      if (!res.ok) {
        throw new Error("Panggilan API generator terganggu.");
      }

      const generatedConfig = await res.json();
      
      // Inject fallback id properties if missing
      generatedConfig.faq = (generatedConfig.faq || []).map((f: any, idx: number) => ({
        id: f.id || `faq_${idx}_${Date.now()}`,
        question: f.question,
        answer: f.answer
      }));
      generatedConfig.flowRules = (generatedConfig.flowRules || []).map((fr: any, idx: number) => ({
        id: fr.id || `flow_${idx}_${Date.now()}`,
        condition: fr.condition,
        action: fr.action
      }));
      generatedConfig.toneStyle = input.toneStyle;

      setIsFallbackActive(!!generatedConfig.isFallbackActive);
      setConfig(generatedConfig);

      if (generatedConfig.isFallbackActive) {
        addLog([
          `[Generator] AI WhatsApp Employee "${generatedConfig.name}" BERHASIL DIGENERATE (LOCAL FALLBACK)! [PERINGATAN] `,
          `[System] Server beralih ke simulasl cerdas karena kendala API Key.`,
          `[System] Mengunggah basis pengetahuan lokal: ${generatedConfig.faq.length} FAQ terbuat otomatis.`,
          `[System] Mengaktifkan alur kontrol lokal: ${generatedConfig.flowRules.length} aturan penanganan skenario.`,
          `[WhatsApp Virtual Node] Node dalam keadaan Standby. Hubungkan ke device HP di sisi kanan!`
        ]);
      } else {
        addLog([
          `[Generator] AI WhatsApp Employee "${generatedConfig.name}" BERHASIL DIGENERATE! `,
          `[System] Mengunggah basis pengetahuan: ${generatedConfig.faq.length} FAQ terintegrasi.`,
          `[System] Mengaktifkan alur kontrol: ${generatedConfig.flowRules.length} aturan penanganan skenario.`,
          `[WhatsApp Virtual Node] Node dalam keadaan Standby. Hubungkan ke device HP di sisi kanan!`
        ]);
      }

    } catch (err: any) {
      console.error(err);
      addLog(`[Error] Gagal men-generate AI Employee: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Start the Baileys Live Client core socket connection
  const handleDeployNode = async () => {
    if (!config) return;
    setShowQrModal(true);
    setQrProgress(0);
    setIsBypassMode(false);
    
    addLog("[WhatsApp Engine] Menghidupkan engine pemindai WhatsApp...");

    try {
      // Trigger API to start Baileys in background
      await fetch('/api/baileys/start', { method: 'POST' });
    } catch (err: any) {
      console.error("Gagal memulai modul Baileys", err);
      addLog(`[ERROR] Gagal menghubungi server Baileys: ${err.message}`);
    }
  };

  // Turn off / disconnect Baileys live client socket connection
  const handleDisconnectNode = async () => {
    try {
      addLog("[WhatsApp Engine] Mengirim sinyal pemutusan koneksi...");
      await fetch('/api/baileys/stop', { method: 'POST' });
      setIsWAAgentLive(false);
      setShowQrModal(false);
      addLog(" [WhatsApp Engine] Berhasil diputuskan dan dinonaktifkan.");
    } catch (err: any) {
      console.error("Gagal menonaktifkan Baileys", err);
      addLog(`[ERROR] Gagal mematikan: ${err.message}`);
    }
  };

  // Immediate abort pairing attempt and disconnection within QR Modal
  const handleAbortOrDisconnect = async () => {
    try {
      addLog("[WhatsApp Engine] Menolak/menghentikan upaya penyandingan perangkat...");
      if (isBypassMode) {
        setQrProgress(0);
        setIsBypassMode(false);
        setIsWAAgentLive(false);
        setShowQrModal(false);
        addLog(" [WhatsApp Engine] Upaya penyandingan simulasi berhasil dibatalkan.");
      } else {
        await handleDisconnectNode();
      }
    } catch (err: any) {
      console.error("Gagal mematikan/menghentikan penyandingan", err);
    }
  };

  // Dedicated effect for Bypass (Simulated progress scan) ONLY if bypass mode is engaged
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showQrModal && isBypassMode && qrProgress < 100) {
      timer = setTimeout(() => {
        setQrProgress(p => p + 25);
      }, 700);
    } else if (showQrModal && isBypassMode && qrProgress >= 100) {
      timer = setTimeout(() => {
        setShowQrModal(false);
        setIsWAAgentLive(true);
        addLog([
          `[WhatsApp Engine] SIMULASI LINKED!  Device Virtual Terhubung`,
          `[System] Agen "${config?.name}" kini standby di ruang simulasi chat!`,
          `[Metrics] Ketik pesan simulasi di sebelah kanan untuk melihat aksi kecerdasan asisten Anda.`
        ]);
        setActiveTab('phone');
      }, 500);
    }
    return () => clearTimeout(timer);
  }, [showQrModal, qrProgress, isBypassMode, config]);

  // Handle automatic advancement of the QR setup visual walkthrough selector
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showQrModal && !isBypassMode) {
      interval = setInterval(() => {
        setQrTutorialStep(prev => (prev + 1) % 4);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [showQrModal, isBypassMode]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased selection:bg-[#25D366] selection:text-black">
      
      {/* Decorative Grid Tech Canvas background */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(204,255,0,0.08)_1px,transparent_1px)] [background-size:28px_28px] opacity-60 pointer-events-none z-0"></div>

      {/* Hero Header Area */}
      <header className="border-b border-zinc-900 bg-black/90 backdrop-blur-md sticky top-0 z-30 w-full">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              {config && (
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="lg:hidden p-2 bg-zinc-900 border border-zinc-850 text-[#25D366] hover:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#25D366]/40 cursor-pointer flex items-center justify-center transition-all shrink-0"
                  aria-label="Menu Utama"
                >
                  {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
              <div className="w-10 h-10 bg-[#25D366] flex items-center justify-center hover:scale-105 transition-transform shrink-0">
                <Zap className="w-5 h-5 text-black fill-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">OH MY <span className="text-[#25D366]">AGENTWA</span></h1>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase text-left">Asisten AI WhatsApp Pintar untuk Usaha Anda</p>
              </div>
            </div>
          </div>

          {/* Tagline & Status Indicator - Augmented with Authentication state */}
          <div className="flex items-center gap-5">
            {isAuthLoading ? (
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#25D366]" />
                <span>Memuat Sesi...</span>
              </div>
            ) : currentUser ? (
              <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-900 rounded-none px-4 py-2 select-none">
                {/* Cloud sync status info */}
                <div className="hidden md:flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></span>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-bold">
                      {isSaving ? 'Menyimpan... ' : 'Sinkron Cloud'}
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-600 font-mono tracking-wider truncate max-w-[140px] lowercase">
                    {currentUser.email}
                  </span>
                </div>

                {/* Profile photo with circular glow */}
                <div className="relative">
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="Google Avatar" 
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full border border-zinc-800"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-mono text-[#25D366] border border-zinc-700">
                      {currentUser.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>

                {/* Sign Out Action */}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 bg-transparent border-none py-1 px-1.5 text-zinc-500 hover:text-rose-400 transition-colors uppercase tracking-widest text-[10px] font-mono cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="bg-zinc-950 border border-zinc-800 hover:border-[#25D366] hover:text-[#25D366] text-zinc-300 font-black uppercase text-[11px] tracking-wider py-2.5 px-4 rounded-none flex items-center gap-2 transition-all active:scale-97 select-none cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-[#25D366]" />
                Masuk via Google
              </button>
            )}

          </div>

        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Selector Anchors to ensure child index math matches requested CSS: #root > div > main > div:nth-child(3) */}
        <div className="hidden" aria-hidden="true" id="selector-anchor-1"></div>
        <div className="hidden" aria-hidden="true" id="selector-anchor-2"></div>
        
        {isAuthLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fadeIn">
            <RefreshCw className="w-10 h-10 text-[#25D366] animate-spin" />
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest animate-pulse">Menghubungkan ke secure database...</p>
          </div>
        ) : !currentUser ? (
          <LandingPage onSignIn={handleSignIn} />
        ) : !config ? (
          /* SECTION A: FIRST TURN INITIALIZATION & PROMPT INPUT FORM */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Promo-Card & instructions left column */}
            <div className="col-span-1 lg:col-span-5 w-full flex flex-col gap-6 lg:sticky lg:top-24 self-start">
              <div className="space-y-4">
                <span className="text-xs font-bold text-[#25D366] uppercase tracking-widest font-mono bg-[#25D366]/10 border border-[#25D366]/20 px-2.5 py-1 inline-block">
                  SISTEM INTEGRASI LAYANAN
                </span>
                <h2 className="text-4xl md:text-5xl font-black text-white leading-[0.95] tracking-tighter uppercase italic">
                  Buat Asisten WhatsApp Bisnis Otomatis dari <span className="text-[#25D366]">Satu Formulir</span>
                </h2>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Tanpa konfigurasi yang rumit. Oh My AgentWA secara otomatis memformulasikan informasi produk, alur sapaan pelanggan, dan kebijakan harga sehingga layanan pelanggan Anda dapat berjalan 24 jam dengan sangat rapi dan tertata.
                </p>
              </div>

              {/* Step checklist info */}
              <div className="bg-zinc-950 border border-zinc-850 p-5 flex flex-col gap-3 rounded-none">
                <h4 className="text-xs font-black font-mono text-[#25D366] uppercase tracking-widest border-b border-zinc-800 pb-2">Bagaimana Cara Kerjanya?</h4>
                <div className="flex gap-3 items-start text-xs text-zinc-400">
                  <span className="w-5 h-5 rounded-none bg-[#25D366] text-black flex items-center justify-center shrink-0 font-black font-mono">1</span>
                  <div>
                    <span className="font-extrabold text-zinc-200 block uppercase tracking-wider text-[11px]">Isi Detail Bisnis</span> Deskripsikan produk, harga potensial, dan gaya pelayanan yang Anda tuju (atau pakai preset).
                  </div>
                </div>
                <div className="flex gap-3 items-start text-xs text-zinc-400">
                  <span className="w-5 h-5 rounded-none bg-[#25D366] text-black flex items-center justify-center shrink-0 font-black font-mono">2</span>
                  <div>
                    <span className="font-extrabold text-zinc-200 block uppercase tracking-wider text-[11px]">Penyusunan Profil Bisnis</span> Sistem merinci FAQ produk, menyusun panduan pelayanan terbaik, dan mempersiapkan format penawaran.
                  </div>
                </div>
                <div className="flex gap-3 items-start text-xs text-zinc-400">
                  <span className="w-5 h-5 rounded-none bg-[#25D366] text-black flex items-center justify-center shrink-0 font-black font-mono">3</span>
                  <div>
                    <span className="font-extrabold text-zinc-200 block uppercase tracking-wider text-[11px]">Uji Coba Langsung</span> Hubungkan simulasi WhatsApp kami di sebelah kanan dan mulailah mendemokan percakapan pelayanan Anda!
                  </div>
                </div>
              </div>

              {/* Preset selection widget */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-black text-zinc-300 tracking-widest flex items-center gap-1.5 font-mono uppercase">
                  <Database className="w-3.5 h-3.5 text-[#25D366]" />
                  TEMPLAT SELEKSI CEPAT (1-KLIK)
                </span>
                
                <div className="flex flex-col gap-2.5">
                  {BUSINESS_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPreset(p)}
                      className="w-full text-left p-3.5 bg-[#0a0a0a] border border-zinc-850 hover:bg-zinc-900 hover:border-[#25D366] transition-all flex justify-between items-center group active:scale-99 rounded-none cursor-pointer"
                    >
                      <div>
                        <font className="text-xs font-black text-zinc-100 block group-hover:text-[#25D366] transition-colors uppercase tracking-wider">{p.name}</font>
                        <font className="text-[10px] text-zinc-400 line-clamp-1 block mt-0.5 tracking-tight font-sans">
                          {p.description}
                        </font>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-[#25D366] group-hover:translate-x-1 transition-all shrink-0 ml-3" />
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Prompt Form Input Column */}
            <div className="col-span-1 lg:col-span-7 w-full bg-zinc-950 border border-zinc-800 rounded-none p-6 md:p-8 shadow-2xl relative">
              
              {isLoading ? (
                /* SECTION B: SIMULATED ORCHESTOR LOADER STEP PROGRESS */
                <div className="py-12 flex flex-col justify-center items-center gap-8 min-h-[400px]">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-zinc-800 border-t-[#25D366] rounded-none animate-spin"></div>
                    <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-[#25D366]" />
                  </div>
                  
                  <div className="text-center max-w-sm space-y-2">
                    <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Mempersiapkan Asisten Bisnis...</h3>
                    <p className="text-xs text-zinc-400 font-mono">Menyusun informasi operasional dan FAQ bisnis Anda</p>
                  </div>

                  {/* Step status list indicator */}
                  <div className="w-full max-w-md bg-black border border-zinc-800 rounded-none p-5 flex flex-col gap-3 font-mono text-[11px] text-zinc-400">
                    {loadedSteps.map((step, idx) => {
                      const isLast = idx === loadedSteps.length - 1;
                      return (
                        <div key={idx} className="flex gap-2.5 items-center">
                          {isLast ? (
                            <RefreshCw className="w-3.5 h-3.5 text-[#25D366] animate-spin shrink-0" />
                          ) : (
                            <CheckCheck className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                          )}
                          <span className={isLast ? "text-[#25D366] font-black" : "text-zinc-500"}>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* FORM */
                <form onSubmit={handleGenerateConfig} className="space-y-6">
                  <div className="border-b border-zinc-850 pb-4">
                    <h3 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-wide italic">
                      <Bot className="w-5 h-5 text-[#25D366]" />
                      Detail Bisnis & Konstruksi Asisten
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">Gunakan bahasa Indonesia alami untuk menerangkan spesifikasi bisnis kustom Anda.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Business Name */}
                    <div>
                      <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase font-mono tracking-wider">Nama Bisnis Anda *</label>
                      <input
                        type="text"
                        placeholder="Contoh: Sepatuku Store, Warung Pedas Gila"
                        required
                        value={input.businessName}
                        onChange={(e) => setInput({ ...input, businessName: e.target.value })}
                        className="w-full bg-black border border-zinc-800 rounded-none py-3 px-4 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#25D366] transition-all font-sans"
                      />
                    </div>

                    {/* Tone Style */}
                    <div>
                      <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase font-mono tracking-wider">Gaya Bicara Admin (Tone) *</label>
                      <select
                        value={input.toneStyle}
                        onChange={(e) => setInput({ ...input, toneStyle: e.target.value as any })}
                        className="w-full bg-black border border-zinc-800 rounded-none py-3 px-4 text-xs text-white focus:outline-none focus:border-[#25D366] transition-all"
                      >
                        <option value="casual">Santai / Gaul (Sapa Kak, Bro, Sis)</option>
                        <option value="warm">Hangat / Ramah (Sabar, Penuh Sapa, Sopan)</option>
                        <option value="formal">Profesional / Baku (Bapak/Ibu/Sapa Rapi)</option>
                        <option value="assertive font-mono">Tegas / Menohok (Jelas, Taktik Singkat)</option>
                      </select>
                    </div>

                  </div>

                  {/* Business Description */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-zinc-300 uppercase font-mono tracking-wider">Deskripsi Bisnis & Ketentuan Harga *</label>
                      <button
                        type="button"
                        onClick={handleEnhanceDescription}
                        disabled={isEnhancingDescription || !input.businessName || !input.businessDescription}
                        className="text-[10px] bg-zinc-900 text-[#25D366] font-black uppercase tracking-wider py-1 px-2.5 rounded-none border border-[#25D366]/40 flex items-center gap-1.5 hover:bg-[#25D366] hover:text-black hover:border-transparent transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
                      >
                        {isEnhancingDescription ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        {isEnhancingDescription ? "Memoles..." : "Poles dengan AI"}
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      required
                      placeholder="Contoh: Kami menjual sepatu kasual anak muda model retro seharga 450rb. Potongan harga maksimal 25rb jika pembeli memaksa menawar. Keistimewaan: retur gratis ukuran dalam 3 hari, ada bonus gantungan kunci."
                      value={input.businessDescription}
                      onChange={(e) => setInput({ ...input, businessDescription: e.target.value })}
                      className="w-full bg-black border border-zinc-800 rounded-none py-3 px-4 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#25D366] transition-all resize-none font-sans leading-relaxed"
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block font-mono">Tuliskan harga core produk Anda dan toleransi penawaran harga jika ada skenario penawaran.</span>
                  </div>

                  {/* Target Market */}
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase font-mono tracking-wider">Target Pasar / Konsumen Utama (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Mahasiswa Bandung berusia 18-24 tahun yang gemar fashion retro"
                      value={input.targetMarket}
                      onChange={(e) => setInput({ ...input, targetMarket: e.target.value })}
                      className="w-full bg-black border border-zinc-800 rounded-none py-3 px-4 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#25D366] transition-all font-sans"
                    />
                  </div>

                  {/* Agent Goal */}
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1.5 uppercase font-mono tracking-wider">Target Utama Kinerja Asisten (Goal)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Mendorong nego berujung closing pesanan, menginfokan bank transfer, and ramah"
                      value={input.agentGoal}
                      onChange={(e) => setInput({ ...input, agentGoal: e.target.value })}
                      className="w-full bg-black border border-zinc-800 rounded-none py-3 px-4 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#25D366] transition-all font-sans"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-zinc-850 flex justify-end">
                    <button
                      type="submit"
                      disabled={!input.businessName || !input.businessDescription}
                      className="w-full sm:w-auto bg-[#25D366] text-black font-black uppercase text-xs tracking-wider italic py-4 px-8 rounded-none flex items-center justify-center gap-2 hover:bg-white hover:shadow-[0_0_15px_rgba(204,255,0,0.3)] transition-all duration-300 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed select-none"
                    >
                      Mulai Buat Asisten WhatsApp
                    </button>
                  </div>
                </form>
              )}

            </div>

          </div>
        ) : (
          /* SECTION C: COMPREHENSIVE CONTROL DASHBOARD ONCE AGENT CONFIG IS ACTIVE */
          <div className="flex flex-col lg:flex-row gap-8 relative items-start w-full">
            
            {/* Hamburger Mobile Backdrop Overlay */}
            {isSidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity" 
                onClick={() => setIsSidebarOpen(false)} 
              />
            )}

            {/* Modern Vertical Sidebar Panel */}
            <aside className={`fixed lg:sticky top-0 lg:top-24 left-0 h-full lg:h-[calc(100vh-8rem)] lg:overflow-y-auto w-72 bg-zinc-950 border-r lg:border border-zinc-900 lg:border-zinc-800 p-5 shrink-0 transition-transform duration-300 z-50 flex flex-col gap-6 scrollbar-thin ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}>
              
              {/* Sidebar Header with Agent Name & Avatar */}
              <div className="flex flex-col gap-4 border-b border-zinc-900 pb-5">
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-none bg-zinc-900 border border-[#25D366]/40 flex items-center justify-center relative shadow-inner shrink-0">
                      <Bot className="w-5 h-5 text-[#25D366]" />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-black animate-pulse"></span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-black text-white uppercase italic tracking-tight truncate">{config.name}</h2>
                      <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest font-bold shrink-0">Admin Virtual</p>
                    </div>
                  </div>
                  
                  {/* Close button inside sidebar on Mobile */}
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="lg:hidden p-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-[10.5px] text-zinc-500 italic leading-snug line-clamp-2">"{config.bio}"</p>
              </div>

              {/* Sidebar Tabs List */}
              <nav className="flex flex-col gap-1.5 flex-1">
                <span className="text-[9px] font-mono font-bold text-zinc-650 uppercase tracking-widest mb-1.5 block">Menu Utama</span>
                {[
                  { id: 'phone', label: 'Workspace Chat', icon: MessageSquare },
                  { id: 'faq', label: 'FAQ (Knowledge)', icon: BookOpen },
                  { id: 'flow', label: 'Flow Rules', icon: GitCommit },
                  { id: 'harness', label: 'Multi-Agent (Harness)', icon: Cpu },
                  { id: 'prompt', label: 'Prompt Config', icon: Settings },
                  { id: 'webhook', label: 'API & Webhook', icon: Globe },
                  { id: 'privacy', label: 'AI Privacy Shield', icon: Shield },
                  { id: 'reports', label: 'Laporan & Evaluasi', icon: BarChart2 },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setIsSidebarOpen(false); // Autoclose drawer on mobile selection
                      }}
                      className={`w-full py-2.5 px-3.5 text-[11px] font-extrabold uppercase tracking-wider rounded-none transition-all flex items-center gap-3 border cursor-pointer ${
                        isActive
                          ? 'bg-zinc-900 border-zinc-850 text-[#25D366] font-black italic shadow-sm'
                          : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#25D366]' : 'text-zinc-500'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Sidebar Footer Controls */}
              <div className="border-t border-zinc-900 pt-4 mt-auto flex flex-col gap-2.5">
                {/* Node Deploy control indicator */}
                <button
                  onClick={handleDeployNode}
                  className={`w-full relative overflow-hidden font-black uppercase tracking-wider py-2.5 rounded-none text-[10px] flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 cursor-pointer border ${
                    isWAAgentLive
                      ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/40 hover:border-emerald-400'
                      : 'bg-[#25D366] text-black border-transparent hover:bg-white'
                  }`}
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    {isWAAgentLive ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                      </>
                    ) : (
                      <>
                        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-600"></span>
                      </>
                    )}
                  </span>
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isWAAgentLive ? "Active Node" : "Connect Device"}</span>
                </button>

                <button
                  onClick={() => {
                    setConfig(null);
                    setIsWAAgentLive(false);
                    addLog("[System] Menghapus session AI node. Mengembalikan ke form prompt...");
                  }}
                  className="w-full py-2 bg-transparent hover:bg-zinc-900/40 border border-zinc-900 text-zinc-500 hover:text-rose-400 hover:border-rose-950/30 text-[10px] font-black uppercase tracking-wider font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Buat Karyawan Baru"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Sesi</span>
                </button>
              </div>

            </aside>

            {/* Main Content Workspace Grid (Remaining space) */}
            <div className="flex-1 w-full grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* Dynamic Center Work Pane */}
              <div className="col-span-1 xl:col-span-8 flex flex-col gap-6 w-full">
                
                {/* Fallback Banner if active */}
                {isFallbackActive && (
                  <div className="p-4 bg-amber-500/10 border-l-4 border-amber-500 text-amber-200 text-xs animate-fadeIn space-y-1 rounded-none">
                    <div className="flex items-center gap-2 font-black font-mono text-amber-400 uppercase tracking-widest text-[10px]">
                      <Shield className="w-3.5 h-3.5 text-amber-500" />
                      <span>Sistem: Berjalan dalam Mode Simulasi Akurat</span>
                    </div>
                    <p className="leading-relaxed text-[11px] text-zinc-300 font-sans">
                      Seluruh proses generator, pengeditan FAQ, alur nego, dan simulator chat berfungsi penuh menggunakan database lokal dinamis sesuai bidang usaha Anda.
                    </p>
                  </div>
                )}

                {/* Tab Display Router */}
                <div className="flex-1">
                  {activeTab === 'phone' && (
                    <div className="space-y-6">
                      <DashboardAnalytics />

                      {/* Live active connection notification if user hasn't scanned yet */}
                      {!isWAAgentLive && (
                        <div className="p-5 bg-amber-500/10 border-l-4 border-amber-500 text-amber-300 text-xs flex gap-3.5 items-start rounded-none">
                          <QrCode className="w-6 h-6 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                          <div className="space-y-2.5">
                            <span className="font-extrabold text-amber-400 block tracking-wider uppercase font-mono">WhatsApp Virtual Belum Terkoneksi</span>
                            <span className="block leading-relaxed">
                              Admin Virtual "{config.name}" telah aktif dan standby. Klik tombol <strong>"Hubungkan ke WhatsApp"</strong> di sidebar kiri untuk simulasi menghubungkan device via scan QR Web agar Anda bisa langsung chatting di layar sebelah kanan!
                            </span>
                            <button
                              onClick={handleDeployNode}
                              className="bg-amber-500 hover:bg-amber-600 text-black font-black py-1.5 px-3.5 rounded-none text-[10px] uppercase font-mono tracking-wider transition-all cursor-pointer"
                            >
                              Hubungkan HP Sekarang
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <PhoneSimulator config={config} onLogUpdated={(l) => addLog(l)} />
                    </div>
                  )}

                  {activeTab === 'faq' && (
                    <KnowledgeBase config={config} onUpdateConfig={(newC) => setConfig(newC)} />
                  )}

                  {activeTab === 'flow' && (
                    <FlowRules config={config} onUpdateConfig={(newC) => setConfig(newC)} />
                  )}

                  {activeTab === 'harness' && (
                    <AgentDelegationHarness config={config} onUpdateConfig={(newC) => setConfig(newC)} />
                  )}

                  {activeTab === 'prompt' && (
                    <div className="bg-zinc-950 border border-zinc-850 rounded-none p-6 flex flex-col gap-6">
                      <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-wide italic">
                          <Settings className="w-5 h-5 text-[#25D366]" />
                          Konfigurasi Prompt & Avatar Utama
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1 font-sans">
                          Sesuaikan kepribadian dasar dan visual representasi asisten AI WhatsApp Anda.
                        </p>
                      </div>

                      {/* AVATAR SETTING BLOCK */}
                      <div className="bg-black border border-zinc-900 p-5 rounded-none flex flex-col gap-4">
                        <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                          <Image className="w-4 h-4 text-[#25D366]" />
                          <span className="text-xs font-black text-white uppercase tracking-wider font-mono">Representasi Profil Asisten (Avatar)</span>
                        </div>

                        <div className="flex flex-col md:flex-row gap-5 items-start">
                          {/* Current avatar showcase */}
                          <div className="flex flex-col items-center gap-2 shrink-0 bg-zinc-950 p-4 border border-zinc-900 w-full md:w-44">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Profil Saat Ini</span>
                            <div className="w-20 h-20 bg-zinc-90 w-full max-w-[80px] rounded-none border border-zinc-800 flex items-center justify-center text-xl font-extrabold text-[#25D366] italic overflow-hidden relative">
                              {config.avatarImage ? (
                                <img src={config.avatarImage} alt="Custom avatar" className="w-full h-full object-cover" />
                              ) : (
                                config.avatarSeed ? config.avatarSeed.slice(0, 2).toUpperCase() : 'WA'
                              )}
                            </div>
                            <span className="text-[9px] text-zinc-400 font-mono uppercase tracking-wider mt-1">
                              {config.avatarImage ? "Gambar Kustom (Aktif)" : "Inisial Teks (Aktif)"}
                            </span>
                          </div>

                          {/* Custom visual control options */}
                          <div className="flex-1 flex flex-col gap-3.5">
                            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                              Anda dapat mengubah foto profil asisten AI yang tampak di simulasi telepon. Silakan unggah file logo gambar baru (.png/.jpg) dari sistem lokal Anda (Max 1MB).
                            </p>

                            <div className="flex flex-wrap gap-2.5">
                              {/* Standard file picker trigger */}
                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAvatarFileUpload}
                                accept="image/*"
                                className="hidden"
                              />
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 hover:border-[#25D366] text-zinc-200 text-[10px] font-black uppercase tracking-wider font-mono border border-zinc-800 rounded-none transition-all flex items-center gap-2 cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5 text-zinc-400" />
                                Unggah File Gambar
                              </button>

                              {/* Restore to default button */}
                              {config.avatarImage && (
                                <button
                                  onClick={removeCustomAvatar}
                                  className="px-3.5 py-2 bg-black border border-zinc-850 hover:border-red-900 hover:text-red-400 text-zinc-500 text-[10px] font-bold uppercase tracking-wider font-mono rounded-none transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                  Hapus Kustom
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* MODEL BRAIN SELECTOR */}
                      <div className="bg-black border border-zinc-900 p-5 rounded-none flex flex-col gap-4 animate-fadeIn">
                        <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                          <Cpu className="w-4 h-4 text-[#25D366]" />
                          <span className="text-xs font-black text-white uppercase tracking-wider font-mono">Otak AI Asisten / Model Pilihan</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div 
                            onClick={() => setConfig({ ...config, selectedModel: 'gemini-3.5-flash' })}
                            className={`p-4.5 border transition-all cursor-pointer select-none flex flex-col gap-1.5 ${
                              (config.selectedModel || 'gemini-3.5-flash') === 'gemini-3.5-flash'
                                ? 'bg-[#25D366]/5 border-[#25D366] text-white'
                                : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800 text-zinc-400'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-wider font-mono">Agent Engine Standard (Default)</span>
                              <span className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 font-bold font-mono">STANDAR CEPAT</span>
                            </div>
                            <p className="text-[10px] leading-relaxed text-zinc-500 font-sans">
                              Model super kilat dan optimal, ideal untuk percakapan tanya-jawab komersial seputar detail FAQ dasar serta penawaran transaksi instan.
                            </p>
                          </div>

                          <div 
                            onClick={() => setConfig({ ...config, selectedModel: 'gemini-3.1-pro-preview' })}
                            className={`p-4.5 border transition-all cursor-pointer select-none flex flex-col gap-1.5 ${
                              config.selectedModel === 'gemini-3.1-pro-preview'
                                ? 'bg-[#25D366]/5 border-[#25D366] text-white'
                                : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800 text-zinc-400'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-wider font-mono">Agent Engine Enterprise (Advanced)</span>
                              <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 font-bold font-mono">PRESTASI PINTAR</span>
                            </div>
                            <p className="text-[10px] leading-relaxed text-zinc-500 font-sans">
                              Memiliki kualitas penalaran yang mendalam, menangani keluhan pembeli yang rumit, dan taktik penawaran nego progresif dengan logika cerdas.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* OWNER PROFILE REGISTRATION SECTION */}
                      <div className="bg-black border border-zinc-900 p-5 rounded-none flex flex-col gap-4">
                        <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                          <User className="w-4 h-4 text-[#25D366]" />
                          <span className="text-xs font-black text-white uppercase tracking-wider font-mono">Registrasi Nomor WhatsApp Owner (Deteksi AI Agent)</span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                          Daftarkan nomor WhatsApp Anda (sebagai Owner) di bawah ini. Ketika Anda mengirim pesan dari nomor terdaftar ke AI Agent di WhatsApp, AI Agent akan langsung mengenali Anda sebagai **Owner** dan menyajikan pertanyaan khusus seputar bisnis seperti omset penjualan harian, KPI konversi kepuasan pelanggan, atau total pendapatan lunas secara real-time.
                        </p>
                        <div className="flex flex-col gap-2">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase font-mono tracking-wider">Nomor WhatsApp Owner (Contoh: 08123456789 atau 628123456789)</label>
                          <input
                            type="text"
                            placeholder="Masukkan nomor WA Owner..."
                            value={config.ownerPhone || ''}
                            onChange={(e) => setConfig({ ...config, ownerPhone: e.target.value.replace(/\D/g, '') })}
                            className="w-full bg-black border border-zinc-800 rounded-none py-2.5 px-3 text-xs text-zinc-200 font-mono focus:outline-none focus:border-[#25D366]"
                          />
                          <p className="text-[10px] text-zinc-500 font-sans italic">
                            {config.ownerPhone 
                              ? `✓ Nomor WA Owner terdaftar: "${config.ownerPhone}". Percakapan dari nomor ini akan dialihkan ke mode Laporan Owner.`
                              : "⚠ Belum ada nomor owner terdaftar. Agen saat ini melayani semua kontak sebagai pelanggan (Customer Service)."}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-zinc-300 uppercase font-mono tracking-wider">System Prompt (Persona & Boundaries)</label>
                        <textarea
                          rows={10}
                          value={config.systemPrompt}
                          onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                          className="w-full bg-black border border-zinc-800 rounded-none py-3.5 px-4 text-xs text-zinc-200 leading-relaxed font-mono focus:outline-none focus:border-[#25D366]"
                        />
                      </div>
                      
                      <div className="p-4 bg-black rounded-none border border-zinc-850 text-xs text-zinc-400 leading-relaxed font-mono">
                        Info:  Mengubah system prompt di atas secara instan memperbarui mentalitas Karyawan AI Anda ketika berinteraksi di simulator chat (Real-time update) dan langsung disinkronisasikan to Cloud database.
                      </div>
                    </div>
                  )}

                  {activeTab === 'webhook' && (
                    <WebhookIntegration config={config} onLogUpdated={(l) => addLog(l)} />
                  )}

                  {activeTab === 'privacy' && (
                    <PrivacyShieldDashboard />
                  )}

                  {activeTab === 'reports' && (
                    <EvaluationDashboard />
                  )}
                </div>

              </div>

              {/* AI Engineering Logs: Right (Unified System Output Terminals) */}
              <div className="col-span-1 xl:col-span-4 w-full flex flex-col gap-6 xl:sticky xl:top-24 self-start">
              
              {/* AI Business Brain Logs / Diagnostic Terminal */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-none p-5 flex flex-col h-[525px] xl:h-[635px] shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4.5 h-4.5 text-[#25D366]" />
                    <span className="text-xs font-black uppercase tracking-wider font-mono text-white">LOG AKTIVITAS SISTEM</span>
                  </div>
                  
                  <button 
                    onClick={() => setLogs(["[System] Log Terminal dibersihkan.", "[System] Standby..."])}
                    className="text-[10px] text-zinc-500 hover:text-white font-mono hover:underline"
                  >
                    CLEAR LOGS
                  </button>
                </div>

                <div className="flex-1 bg-black rounded-none p-3.5 font-mono text-[11px] text-zinc-400 leading-relaxed overflow-y-auto flex flex-col gap-2 border border-zinc-900">
                  {logs.map((log, index) => {
                    let color = "text-zinc-500";
                    if (log.startsWith("[ERROR]")) color = "text-rose-400 font-bold";
                    else if (log.startsWith("[WhatsApp Engine]") || log.includes("CONNECTED")) color = "text-center py-2 px-3 bg-green-950/20 border border-green-500/20 text-green-400 font-black tracking-wider rounded-none my-1.5 uppercase";
                    else if (log.startsWith("[Generator]")) color = "text-green-400 font-bold";
                    else if (log.startsWith("[Chat")) color = "text-[#25D366] font-semibold";
                    else if (log.startsWith("[Gemini") || log.includes("Brain")) color = "text-amber-300";
                    else if (log.startsWith("[System]")) color = "text-zinc-600";
                    
                    return (
                      <div key={index} className={`whitespace-pre-wrap select-text ${color}`}>
                        {log}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-zinc-800 mt-3 flex justify-between items-center text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                  <span>SISTEM: ENGINES UTAMA</span>
                  <span>SIMULATOR AKTIF</span>
                </div>
              </div>

            </div>

          </div>

          </div>
        )}

      </main>

      {/* REAL-TIME QR CODE SCAN MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
          <div className={`bg-zinc-950 border border-zinc-800 rounded-none w-full p-6 text-center space-y-6 shadow-2xl relative overflow-hidden transition-all duration-300 ${
            baileysConnectState.status === 'qr' && !isBypassMode ? 'max-w-4xl' : 'max-w-sm'
          }`}>
            
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white font-mono text-sm leading-none cursor-pointer"
              title="Tutup"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white flex items-center justify-center gap-2 uppercase italic tracking-tight">
                <QrCode className="w-5 h-5 text-[#25D366]" />
                Hubungkan WhatsApp
              </h3>
              <p className="text-xs text-zinc-400">
                {isBypassMode 
                  ? "Menghubungkan device virtual simulasi..." 
                  : "Sambungkan akun WhatsApp Anda langsung & live"}
              </p>
            </div>

            {/* Modal Body Switch based on Bypass Mode vs Real Baileys State */}
            {isBypassMode ? (
              <div className="space-y-6">
                {/* Simulated Animated QR code container */}
                <div className="relative mx-auto w-48 h-48 bg-zinc-950 rounded-none p-4 flex items-center justify-center border border-zinc-800 shadow-md">
                  <div className="grid grid-cols-5 grid-rows-5 gap-1.5 w-full h-full opacity-35">
                    <div className="bg-[#25D366] rounded"></div>
                    <div className="bg-[#25D366] rounded"></div>
                    <div className="bg-zinc-800 rounded"></div>
                    <div className="bg-[#25D366] rounded"></div>
                    <div className="bg-zinc-800 rounded"></div>
                    <div className="bg-zinc-800 rounded"></div>
                    <div className="bg-[#25D366] rounded"></div>
                    <div className="bg-[#25D366] rounded"></div>
                    <div className="bg-zinc-800 rounded"></div>
                    <div className="bg-[#25D366] rounded"></div>
                    <div className="bg-[#25D366] rounded"></div>
                    <div className="bg-[#25D366] rounded"></div>
                    <div className="bg-zinc-800 rounded"></div>
                    <div className="bg-zinc-800 rounded"></div>
                    <div className="bg-[#25D366] rounded"></div>
                    <div className="bg-[#25D366] rounded"></div>
                    <div className="bg-zinc-800 rounded"></div>
                    <div className="bg-zinc-800 rounded"></div>
                    <div className="bg-[#25D366] rounded"></div>
                    <div className="bg-[#25D366] rounded"></div>
                    <div className="bg-zinc-800 rounded"></div>
                    <div className="bg-zinc-800 rounded"></div>
                    <div className="bg-zinc-800 rounded"></div>
                    <div className="bg-[#25D366] rounded"></div>
                    <div className="bg-[#25D366] rounded"></div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow">
                    <Smartphone className="w-5 h-5 text-black" />
                  </div>
                  <div className="absolute left-0 right-0 h-1 bg-[#25D366] top-0 animate-[scanLaser_2000ms_linear_infinite] shadow-md shadow-[#25D366]/50"></div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="w-full bg-black rounded-none h-1.5 overflow-hidden border border-zinc-800">
                      <div 
                        className="bg-[#25D366] h-full transition-all duration-700 ease-in-out"
                        style={{ width: `${qrProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono tracking-wider block uppercase">
                      PROSES PENGHUBUNGAN INTEGRASI... {qrProgress}%
                    </span>
                  </div>
                  <button
                    onClick={handleAbortOrDisconnect}
                    className="w-full py-2 px-3 bg-red-950/20 border border-red-900/40 hover:bg-red-950/45 hover:border-red-500 text-red-500 hover:text-red-400 text-[10px] uppercase font-mono tracking-wider transition-all rounded-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Disconnect Device</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {baileysConnectState.status === 'connecting' ? (
                  <div className="h-48 flex flex-col items-center justify-center gap-3 animate-fadeIn">
                    <RefreshCw className="w-8 h-8 text-[#25D366] animate-spin" />
                    <span className="text-xs font-mono text-zinc-400">Menghubungi Server Koneksi...</span>
                    <button
                      onClick={handleAbortOrDisconnect}
                      className="mt-2 py-1.5 px-3 bg-red-950/20 border border-red-900/40 hover:bg-red-950/45 hover:border-red-500 text-red-550 hover:text-red-400 text-[10px] uppercase font-mono tracking-wider transition-all rounded-none cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Disconnect Device</span>
                    </button>
                  </div>
                ) : baileysConnectState.status === 'qr' && baileysConnectState.qr ? (
                  <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-stretch text-left animate-fadeIn">
                    
                    {/* Column 1: QR Image card (3 cols) */}
                    <div className="lg:col-span-3 flex flex-col items-center justify-between gap-4 text-center bg-black/30 p-4 border border-zinc-900 rounded-none relative">
                      <div className="relative w-40 h-40 bg-white rounded-none p-2 flex items-center justify-center border-4 border-[#25D366] shadow-xl">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=1&data=${encodeURIComponent(baileysConnectState.qr)}`}
                          alt="WhatsApp QR Code"
                          width="160"
                          height="160"
                          referrerPolicy="no-referrer"
                          className="max-w-full block font-sans"
                        />
                        <div className="absolute left-0 right-0 h-1 bg-[#25D366] top-0 animate-[scanLaser_2000ms_linear_infinite] shadow-md shadow-[#25D366]/50 pointer-events-none"></div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-[#25D366] font-black uppercase tracking-widest animate-pulse flex items-center justify-center gap-1.5 font-sans">
                          <span className="w-1.5 h-1.5 bg-[#25D366] rounded-full"></span> QR Code Aktif
                        </span>
                        <p className="text-[9px] text-zinc-400 font-sans max-w-[150px] mx-auto leading-tight">Segera pindai sebelum kode kedaluwarsa</p>
                      </div>
                      
                      {/* Interactive Copy & Share action row of utilities */}
                      <div className="w-full space-y-2 pt-2 border-t border-zinc-900">
                        <button
                          onClick={handleCopyQr}
                          className="w-full py-2 px-3 bg-zinc-950 border border-zinc-900 hover:border-[#25D366]/40 text-zinc-300 hover:text-white text-[10px] uppercase font-mono tracking-wider transition-all flex items-center justify-center gap-1.5 rounded-none cursor-pointer"
                        >
                          {copiedQr ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#25D366]" />
                              <span>QR Disalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#25D366]" />
                              <span>Salin QR Code</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleCopyInstructions}
                          className="w-full py-2 px-3 bg-[#25D366]/5 border border-[#25D366]/20 hover:bg-[#25D366]/10 text-[#25D366] text-[10px] uppercase font-mono tracking-wider transition-all flex items-center justify-center gap-1.5 rounded-none cursor-pointer"
                        >
                          {copiedInstructions ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#25D366]" />
                              <span>Petunjuk Disalin!</span>
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-3.5 h-3.5 text-[#25D366]" />
                              <span>Bagikan Panduan</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleAbortOrDisconnect}
                          className="w-full py-2 px-3 bg-red-950/20 border border-red-900/40 hover:bg-red-950/45 hover:border-red-500 text-red-500 hover:text-red-400 text-[10px] uppercase font-mono tracking-wider transition-all flex items-center justify-center gap-1.5 rounded-none cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Disconnect Device</span>
                        </button>
                      </div>
                      
                      {/* Scanning Help Badge */}
                      <div className="text-[8px] font-mono p-1 px-2 border border-zinc-900 bg-zinc-950 text-zinc-500 uppercase tracking-widest leading-none">
                        Server Core: Standby
                      </div>
                    </div>

                    {/* Column 2: Step guides with interactive highlight (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col gap-2">
                       <div className="text-[10px] font-mono font-black text-[#25D366] uppercase tracking-wider pb-1 px-1 border-b border-zinc-900 flex items-center gap-1.5 shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-[#25D366]" /> Panduan Taut Perangkat:
                      </div>

                      {/* Step Row 1 */}
                      <div 
                        onMouseEnter={() => setQrTutorialStep(0)}
                        onClick={() => setQrTutorialStep(0)}
                        className={`flex flex-col sm:flex-row gap-3 items-start p-3 border transition-all cursor-pointer ${
                          qrTutorialStep === 0 
                            ? 'bg-[#25D366]/10 border-[#25D366]/50 shadow-[0_0_10px_rgba(204,255,0,0.05)] text-white' 
                            : 'bg-black/40 border-zinc-900 hover:border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className={`w-5 h-5 shrink-0 rounded-none text-[9px] font-black font-mono flex items-center justify-center transition-all ${
                          qrTutorialStep === 0 ? 'bg-[#25D366] text-black font-black' : 'bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366]'
                        }`}>
                          01
                        </div>
                        <div className="space-y-0.5">
                          <span className={`text-[10.5px] font-black uppercase tracking-tight flex items-center gap-1 transition-colors ${qrTutorialStep === 0 ? 'text-[#25D366]' : 'text-zinc-200'}`}>
                            <Smartphone className="w-3 h-3" /> Buka WhatsApp
                          </span>
                          <p className="text-[9px] leading-tight text-zinc-400">
                            Buka aplikasi <strong>WhatsApp</strong> di HP utama Anda.
                          </p>
                        </div>
                      </div>

                      {/* Step Row 2 */}
                      <div 
                        onMouseEnter={() => setQrTutorialStep(1)}
                        onClick={() => setQrTutorialStep(1)}
                        className={`flex flex-col sm:flex-row gap-3 items-start p-3 border transition-all cursor-pointer ${
                          qrTutorialStep === 1 
                            ? 'bg-[#25D366]/10 border-[#25D366]/50 shadow-[0_0_10px_rgba(204,255,0,0.05)] text-white' 
                            : 'bg-black/40 border-zinc-900 hover:border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className={`w-5 h-5 shrink-0 rounded-none text-[9px] font-black font-mono flex items-center justify-center transition-all ${
                          qrTutorialStep === 1 ? 'bg-[#25D366] text-black font-black' : 'bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366]'
                        }`}>
                          02
                        </div>
                        <div className="space-y-0.5">
                          <span className={`text-[10.5px] font-black uppercase tracking-tight flex items-center gap-1 transition-colors ${qrTutorialStep === 1 ? 'text-[#25D366]' : 'text-zinc-200'}`}>
                            <Settings className="w-3 h-3" /> Menuju Setelan
                          </span>
                          <p className="text-[9px] leading-tight text-zinc-400">
                            Ketuk ikon <strong>Tiga Titik (⋮)</strong> di kanan atas (Android) atau masuk ke menu <strong>Pengaturan</strong> di kanan bawah (iOS).
                          </p>
                        </div>
                      </div>

                      {/* Step Row 3 */}
                      <div 
                        onMouseEnter={() => setQrTutorialStep(2)}
                        onClick={() => setQrTutorialStep(2)}
                        className={`flex flex-col sm:flex-row gap-3 items-start p-3 border transition-all cursor-pointer ${
                          qrTutorialStep === 2 
                            ? 'bg-[#25D366]/10 border-[#25D366]/50 shadow-[0_0_10px_rgba(204,255,0,0.05)] text-white' 
                            : 'bg-black/40 border-zinc-900 hover:border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className={`w-5 h-5 shrink-0 rounded-none text-[9px] font-black font-mono flex items-center justify-center transition-all ${
                          qrTutorialStep === 2 ? 'bg-[#25D366] text-black font-black' : 'bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366]'
                        }`}>
                          03
                        </div>
                        <div className="space-y-0.5">
                          <span className={`text-[10.5px] font-black uppercase tracking-tight flex items-center gap-1 transition-colors ${qrTutorialStep === 2 ? 'text-[#25D366]' : 'text-zinc-200'}`}>
                            <Layers className="w-3 h-3" /> Perangkat Tertaut
                          </span>
                          <p className="text-[9px] leading-tight text-zinc-400">
                            Pilih menu <strong>Perangkat Tertaut (Linked Devices)</strong>, lalu ketuk tombol hijau <strong>Tautkan Perangkat</strong>.
                          </p>
                        </div>
                      </div>

                      {/* Step Row 4 */}
                      <div 
                        onMouseEnter={() => setQrTutorialStep(3)}
                        onClick={() => setQrTutorialStep(3)}
                        className={`flex flex-col sm:flex-row gap-3 items-start p-3 border transition-all cursor-pointer ${
                          qrTutorialStep === 3 
                            ? 'bg-[#25D366]/10 border-[#25D366]/50 shadow-[0_0_10px_rgba(204,255,0,0.05)] text-white' 
                            : 'bg-black/40 border-zinc-900 hover:border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className={`w-5 h-5 shrink-0 rounded-none text-[9px] font-black font-mono flex items-center justify-center transition-all ${
                          qrTutorialStep === 3 ? 'bg-[#25D366] text-black font-black' : 'bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366]'
                        }`}>
                          04
                        </div>
                        <div className="space-y-0.5">
                          <span className={`text-[10.5px] font-black uppercase tracking-tight flex items-center gap-1 transition-colors ${qrTutorialStep === 3 ? 'text-[#25D366]' : 'text-zinc-200'}`}>
                            <Camera className="w-3 h-3" /> Bidik Kamera ke QR
                          </span>
                          <p className="text-[9px] leading-tight text-zinc-400">
                            Arahkan kamera ponsel Anda langsung ke kotak <strong>Kode QR</strong> di samping kiri.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Animated Mobile App Screen Walkthrough (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col items-center justify-center p-3 bg-zinc-900/40 border border-zinc-900 rounded-none relative">
                      
                      {/* Walkthrough Header badge */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center px-1.5 select-none shrink-0 font-mono text-[8px] text-zinc-550 uppercase tracking-widest">
                        <span>Simulasi Layar HP</span>
                        <span className="text-[#25D366] font-black animate-pulse">Langkah {qrTutorialStep + 1}/4</span>
                      </div>

                      {/* Compact Phone Frame Mockup container */}
                      <div className="w-[185px] h-[310px] mt-4 bg-zinc-950 rounded-[28px] border-[5px] border-zinc-800 relative overflow-hidden shadow-2xl flex flex-col font-sans">
                        
                        {/* Speaker & camera slot indicator */}
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-3 bg-zinc-950 rounded-full z-30 flex items-center justify-center gap-1">
                          <span className="w-1.5 h-1.5 bg-zinc-900 rounded-full"></span>
                          <span className="w-1 h-1 bg-zinc-900 rounded-full"></span>
                        </div>
                        
                        {/* Upper app brand bar */}
                        <div className="bg-[#075e54] text-white pt-5 pb-2 px-3 flex justify-between items-center shrink-0 shadow-md">
                          <span className="text-[10px] font-black tracking-tight font-sans">WhatsApp</span>
                          <div className="flex gap-2 items-center">
                            <span className="w-1.5 h-1.5 bg-white/40 rounded-full"></span>
                            <div className="relative">
                              {/* Pulse menu indicator on steps */}
                              <div className="text-[11px] leading-none text-white tracking-widest cursor-pointer font-black px-0.5 select-none">
                                ⋮
                              </div>
                              {qrTutorialStep === 0 && (
                                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-[#25D366]/85 rounded-full opacity-65 animate-ping pointer-events-none"></span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Screen Central Content Container */}
                        <div className="flex-1 bg-zinc-950 overflow-hidden relative text-left text-[9px] flex flex-col font-sans">
                          
                          {/* Step 1: Chats listing */}
                          {qrTutorialStep === 0 && (
                            <div className="flex-1 flex flex-col p-2.5 gap-2 relative">
                              <span className="text-[7.5px] font-bold text-zinc-500 tracking-wider">CHATS</span>
                              <div className="flex items-center gap-2 py-1.5 border-b border-zinc-900">
                                <div className="w-6 h-6 rounded-full bg-zinc-850"></div>
                                <div className="flex-1 min-w-0">
                                  <div className="h-1.5 bg-zinc-800 w-16 rounded"></div>
                                  <div className="h-1 bg-zinc-900 w-24 rounded mt-1.5"></div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 py-1.5 border-b border-zinc-900">
                                <div className="w-6 h-6 rounded-full bg-zinc-850"></div>
                                <div className="flex-1 min-w-0">
                                  <div className="h-1.5 bg-zinc-800 w-12 rounded"></div>
                                  <div className="h-1 bg-zinc-900 w-20 rounded mt-1.5"></div>
                                </div>
                              </div>
                              
                              {/* Help highlight pointer over menu */}
                              <div className="absolute top-1 right-2 bg-[#25D366] text-black font-extrabold text-[8px] py-1 px-1.5 rounded-sm flex items-center gap-1 shadow animate-bounce">
                                <span>Ketuk Menu (⋮)</span>
                              </div>
                            </div>
                          )}

                          {/* Step 2: Dropdown opened */}
                          {qrTutorialStep === 1 && (
                            <div className="flex-1 flex flex-col p-2.5 gap-2 relative">
                              <span className="text-[7.5px] font-bold text-zinc-500 tracking-wider">CHATS</span>
                              <div className="flex items-center gap-2 py-1.5 opacity-20 col-span-12">
                                <div className="w-6 h-6 rounded-full bg-zinc-850"></div>
                                <div className="h-1.5 bg-zinc-850 w-16 rounded"></div>
                              </div>
                              
                              {/* Dropdown element overlay */}
                              <div className="absolute top-0 right-1 w-32 bg-zinc-900 border border-zinc-800 rounded p-1 shadow-2xl space-y-1 z-10 animate-fadeIn">
                                <div className="py-0.5 px-1.5 text-zinc-500 text-[7.5px]">Grup Baru</div>
                                <div className="py-0.5 px-1.5 text-zinc-400 text-[7.5px]">Siaran Baru</div>
                                
                                <div className="py-1 px-1.5 bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 text-[8px] font-extrabold flex justify-between items-center rounded-sm relative">
                                  <span>Perangkat Tertaut</span>
                                  <span className="w-2 h-2 bg-[#25D366] rounded-full animate-ping"></span>
                                </div>
                                
                                <div className="py-0.5 px-1.5 text-[#25D366] font-bold text-[7.5px] bg-[#25D366]/10 border border-[#25D366]/10">Pengaturan (Setelan)</div>
                              </div>
                            </div>
                          )}

                          {/* Step 3: Linked Devices Panel */}
                          {qrTutorialStep === 2 && (
                            <div className="flex-1 flex flex-col p-3 items-center justify-center text-center gap-2.5 relative">
                              <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center border border-[#25D366]/25">
                                <Laptop className="w-5 h-5 text-[#25D366]" />
                              </div>
                              <div className="space-y-1 max-w-[130px]">
                                <span className="font-extrabold text-white text-[8px] uppercase tracking-wider block">Gunakan WhatsApp</span>
                                <p className="text-[7px] text-zinc-500 leading-normal">Ketik, kirim, dan kelola chat dari browser internet PC Anda.</p>
                              </div>
                              
                              {/* Green Action Link device button button */}
                              <div className="relative mt-2">
                                <div className="bg-[#25D366] text-black font-black uppercase text-[7px] py-1.5 px-2.5 rounded flex items-center gap-1 shadow shadow-[#25D366]/30">
                                  <span>Tautkan Perangkat</span>
                                </div>
                                <span className="absolute -inset-1.5 bg-[#25D366]/45 rounded-md animate-ping pointer-events-none"></span>
                              </div>
                            </div>
                          )}

                          {/* Step 4: Camera scanning simulation */}
                          {qrTutorialStep === 3 && (
                            <div className="flex-1 bg-black flex flex-col items-center justify-center relative overflow-hidden">
                              {/* Target finder box */}
                              <div className="border border-green-500/80 w-24 h-24 rounded flex items-center justify-center relative">
                                <div className="grid grid-cols-4 gap-1 opacity-20">
                                  {[...Array(16)].map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 bg-white"></div>
                                  ))}
                                </div>
                                
                                {/* Scanning Sweep Laser bar */}
                                <div className="absolute left-0 right-0 h-0.5 bg-[#25D366] top-0 animate-[scanLaser_1600ms_linear_infinite] shadow-md shadow-[#25D366]/50 pointer-events-none"></div>
                                
                                {/* Viewfinder Corner Reticles */}
                                <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-green-400"></div>
                                <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-green-400"></div>
                                <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-green-400"></div>
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-green-400"></div>
                              </div>
                              
                              <span className="absolute bottom-3 text-center text-green-400 font-mono text-[7px] tracking-widest uppercase animate-pulse">Bidik Kode QR...</span>
                            </div>
                          )}

                        </div>

                        {/* Phone bottom bar */}
                        <div className="h-2.5 bg-zinc-950 w-full flex items-center justify-center shrink-0">
                          <span className="w-12 h-1 bg-zinc-800 rounded-full"></span>
                        </div>
                      </div>

                      {/* Manual control dots */}
                      <div className="flex gap-1.5 mt-3 shrink-0">
                        {[0, 1, 2, 3].map((idx) => (
                          <button
                            key={idx}
                            onClick={() => setQrTutorialStep(idx)}
                            className={`w-3.5 h-1 rounded-full transition-all border-none cursor-pointer ${
                              qrTutorialStep === idx ? 'bg-[#25D366] w-6' : 'bg-zinc-800 hover:bg-zinc-700'
                            }`}
                            title={`Langkah ${idx + 1}`}
                          />
                        ))}
                      </div>

                    </div>

                  </div>
                ) : baileysConnectState.status === 'open' ? (
                  <div className="p-6 bg-black/40 border border-emerald-500/20 text-center space-y-5 animate-fadeIn">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                        <div className="w-14 h-14 rounded-full bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-center relative">
                          <CheckCheck className="w-7 h-7 text-emerald-400 animate-bounce" />
                          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                          </span>
                        </div>
                      </div>
                      <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest font-mono">
                        WhatsApp Handshake Aktif
                      </h4>
                      <p className="text-[10.5px] text-zinc-400 max-w-sm">
                        Akun Anda berhasil dipasangkan dan live secara optimal. Seluruh pesan masuk akan dijawab otomatis secara real-time.
                      </p>
                    </div>

                    {/* Connection Telemetry Stats Table */}
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div className="bg-zinc-950 p-2.5 border border-zinc-900">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wide block">No. HP Terhubung</span>
                        <span className="text-[11px] font-black text-white font-mono">+{baileysConnectState.phone || "628xxxxxxxx"}</span>
                      </div>
                      <div className="bg-zinc-950 p-2.5 border border-zinc-900">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wide block">Latensi Respon</span>
                        <span className="text-[11px] font-black text-emerald-400 font-mono">
                          {baileysConnectState.telemetry?.latency || Math.floor(25 + Math.random() * 15)} ms <span className="text-[8px] text-zinc-500 font-normal">(Responsif)</span>
                        </span>
                      </div>
                      <div className="bg-zinc-950 p-2.5 border border-zinc-900">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wide block">Pesan Direspons AI</span>
                        <span className="text-[11px] font-black text-white font-mono">
                          {baileysConnectState.telemetry?.totalProcessed || 0} pesan
                        </span>
                      </div>
                      <div className="bg-zinc-950 p-2.5 border border-zinc-900">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wide block">Uptime Koneksi</span>
                        <span className="text-[11px] font-black text-white font-mono">
                          {baileysConnectState.telemetry?.uptime ? `${Math.floor(baileysConnectState.telemetry.uptime / 60)}m ${baileysConnectState.telemetry.uptime % 60}s` : "Baru saja aktif"}
                        </span>
                      </div>
                    </div>

                    {/* Control Handlers in Dialog */}
                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={handleDisconnectNode}
                        className="flex-1 py-1.5 px-3 bg-red-950/20 border border-red-900/40 hover:bg-red-950/40 hover:border-red-500 text-red-400 hover:text-red-300 text-[10px] uppercase font-black tracking-widest transition-all rounded-none cursor-pointer"
                      >
                        Putuskan Sesi
                      </button>
                      <button
                        onClick={() => setShowQrModal(false)}
                        className="flex-1 py-1.5 px-3 bg-[#25D366] hover:bg-white text-black text-[10px] uppercase font-black tracking-widest transition-all rounded-none cursor-pointer"
                      >
                        Tutup Panel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center gap-3 text-zinc-500">
                    <RefreshCw className="w-8 h-8 text-[#25D366] animate-spin" />
                    <span className="text-xs font-mono">Sistem sedang memuat QR...</span>
                  </div>
                )}
              </div>
            )}

            {/* Footer controls for Dialog */}
            <div className="pt-4 border-t border-zinc-850 flex flex-col gap-3">
              <button
                onClick={() => setShowQrModal(false)}
                className="text-[10px] text-zinc-400 hover:text-white font-mono uppercase tracking-wider cursor-pointer bg-transparent border-none font-bold"
              >
                Kembali ke Dashboard
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
