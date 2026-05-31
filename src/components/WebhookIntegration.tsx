import React, { useState, useEffect } from 'react';
import { 
  Globe, Play, Code, Copy, Check, Download, AlertTriangle, 
  Terminal, Server, RefreshCw, Layers, HelpCircle, Truck,
  QrCode, Smartphone, Wifi, WifiOff, Power, CheckCircle, Settings, Camera, Sparkles
} from 'lucide-react';
import { AgentConfig } from '../types';
import BaileysTelemetry from './BaileysTelemetry';

interface WebhookIntegrationProps {
  config: AgentConfig;
  onLogUpdated: (log: string) => void;
}

export default function WebhookIntegration({ config, onLogUpdated }: WebhookIntegrationProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  
  // Custom interactive webhook tester states
  const [testMessage, setTestMessage] = useState('Halo. Apakah sepatu retro masih ready stock?');
  const [testFormat, setTestFormat] = useState<'generic' | 'meta' | 'evolution' | 'twilio'>('generic');
  const [testResponse, setTestResponse] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Active webhook logs state
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);

  // shipping integration states
  const [shippingProvider, setShippingProvider] = useState('rajaongkir');
  const [markupType, setMarkupType] = useState('flat');
  const [markupValue, setMarkupValue] = useState('5000');
  const [isShippingSaved, setIsShippingSaved] = useState(false);

  // Baileys.js Live Client connection state
  const [baileysState, setBaileysState] = useState<{
    status: 'idle' | 'connecting' | 'qr' | 'open' | 'closed' | 'error';
    qr: string;
    phone: string;
    error: string;
  }>({ status: 'idle', qr: '', phone: '', error: '' });
  const [isRefreshingBaileys, setIsRefreshingBaileys] = useState(false);

  // Get active browser host
  const hostUrl = typeof window !== 'undefined' ? window.location.origin : 'https://agentwa-platform.io';
  const webhookUrl = `${hostUrl}/api/webhook/whatsapp`;

  const fetchBaileysStatus = async () => {
    try {
      const res = await fetch('/api/baileys/status');
      if (res.ok) {
        const data = await res.json();
        setBaileysState(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartBaileys = async () => {
    setIsRefreshingBaileys(true);
    try {
      await fetch('/api/baileys/start', { method: 'POST' });
      onLogUpdated('[Baileys.js] Sistem inisialisasi socket live dimulai. Menunggu kode QR...');
      setTimeout(fetchBaileysStatus, 1500);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsRefreshingBaileys(false);
    }
  };

  const handleStopBaileys = async () => {
    setIsRefreshingBaileys(true);
    try {
      await fetch('/api/baileys/stop', { method: 'POST' });
      onLogUpdated('[Baileys.js] Sesi asisten WhatsApp diputus dan dinonaktifkan.');
      setTimeout(fetchBaileysStatus, 1500);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsRefreshingBaileys(false);
    }
  };

  const fetchWebhookLogs = async () => {
    setIsFetchingLogs(true);
    try {
      const res = await fetch('/api/webhook/logs');
      if (res.ok) {
        const data = await res.json();
        setWebhookLogs(data.reverse()); // latest first
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingLogs(false);
    }
  };

  const clearWebhookLogs = async () => {
    try {
      await fetch('/api/webhook/logs/clear', { method: 'POST' });
      setWebhookLogs([]);
      onLogUpdated('[Webhook] Logs terminal cleared successfully.');
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchWebhookLogs();
    fetchBaileysStatus();

    const intervalWebhook = setInterval(fetchWebhookLogs, 6000); // Poll logs every 6s
    const intervalBaileys = setInterval(fetchBaileysStatus, 2500); // Poll baileys status every 2.5s
    
    // Sync current client config to the server memory on mounting
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    }).then(() => {
      onLogUpdated('[System] Configuration successfully synchronized to backup Webhook server.');
    });

    return () => {
      clearInterval(intervalWebhook);
      clearInterval(intervalBaileys);
    };
  }, [config]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(config.systemPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const getTestPayload = () => {
    if (testFormat === 'meta') {
      return {
        object: "whatsapp_business_account",
        entry: [{
          id: "WABA_ID_123",
          changes: [{
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "628999999", phone_number_id: "PHONE_ID" },
              contacts: [{ profile: { name: "Budi Meta Sandbox" }, wa_id: "628123456789" }],
              messages: [{
                from: "628123456789",
                id: "ABGGAtZ06A4v",
                timestamp: Math.floor(Date.now() / 1000),
                text: { body: testMessage },
                type: "text"
              }]
            },
            field: "messages"
          }]
        }]
      };
    }
    if (testFormat === 'evolution') {
      return {
        event: "messages.upsert",
        instance: "AgentWA_Demo",
        data: {
          key: { remoteJid: "62899112233@s.whatsapp.net", fromMe: false, id: "MSG_EVO_99" },
          pushName: "Aditya Pratama",
          message: { conversation: testMessage },
          messageType: "conversation"
        }
      };
    }
    if (testFormat === 'twilio') {
      return {
        Body: testMessage,
        From: "whatsapp:+628111222333",
        ProfileName: "Sarah Sativa",
        MessageSid: "SM102030"
      };
    }
    return {
      message: testMessage,
      sender: "62888999111",
      name: "Tomy Wijaya"
    };
  };

  const executeTestWebhook = async () => {
    setIsTesting(true);
    setTestResponse(null);
    try {
      const payload = getTestPayload();
      
      const res = await fetch('/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        parsed = text; // XML/Plain
      }
      
      setTestResponse({
        statusCode: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        body: parsed
      });
      
      onLogUpdated(`[Webhook TEST] POST request processed with status ${res.status}`);
      fetchWebhookLogs();
    } catch (err: any) {
      setTestResponse({ error: err.message });
      onLogUpdated(`[Webhook TEST] Error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyCurl = () => {
    const curl = `curl -X POST "${webhookUrl}" \\
     -H "Content-Type: application/json" \\
     -d '${JSON.stringify({ message: testMessage, sender: "6285555555", name: "Rian" })}'`;
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleDownloadConfig = () => {
    const fileData = JSON.stringify(config, null, 2);
    const blob = new Blob([fileData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agentwa-config-${config.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onLogUpdated('[System] agentwa-config.json exported successfully.');
  };

  return (
    <div className="space-y-6">

      {/* SECTION 0: WHATSAPP LIVE CLIENT CONNECTION (BAILEYS.JS CLIENT) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-none p-6 flex flex-col gap-5">
        
        <div className="border-b border-zinc-850 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xl font-black text-white flex items-center gap-2.5 uppercase tracking-wide italic">
              <QrCode className="w-5.5 h-5.5 text-[#25D366]" />
              KONEKSI LIVE WHATSAPP (CORE PROTOCOL)
            </h2>
            
            {/* Realtime Status Badges */}
            <div className="flex items-center gap-2">
              {baileysState.status === 'open' ? (
                <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/45 border border-emerald-500/35 px-2.5 py-1 uppercase tracking-widest animate-pulse">
                  <Wifi className="w-3.5 h-3.5" />
                  ONLINE: +{baileysState.phone}
                </span>
              ) : baileysState.status === 'connecting' || baileysState.status === 'qr' ? (
                <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-[#25D366] bg-[#25D366]/10 border border-[#25D366]/25 px-2.5 py-1 uppercase tracking-widest">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  PAIRING MODE
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 uppercase tracking-widest">
                  <WifiOff className="w-3.5 h-3.5" />
                  OFFLINE / DISCONNECTED
                </span>
              )}
            </div>
          </div>
          
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Nyalakan modul koneksi internal kami untuk menghubungkan nomor WhatsApp pribadi / bisnis Anda secara live-time. Begitu terhubung, asisten AI **{config.name}** akan langsung merespons semua pesan pribadi baru secara aslinya di WhatsApp!
          </p>
        </div>

        {/* Dynamic Layout according to connection status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left instructions or Success state info (Col Span 7) */}
          <div className="col-span-1 lg:col-span-7 flex flex-col gap-4">
            
            {baileysState.status === 'open' ? (
              <div className="bg-[#25D366]/5 border border-[#25D366]/20 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366]">
                    <CheckCircle className="w-6 h-6 text-[#25D366]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">KONEKSI WHATSAPP AKTIF & LIVE!</h4>
                    <p className="text-xs text-[#25D366] font-mono">ID Sesi Pasangan: info_auth_active</p>
                  </div>
                </div>

                <div className="text-xs text-zinc-300 leading-relaxed font-sans space-y-2">
                  <p>
                    ✓ Laptop / Server Anda sekarang bekerjasama secara live dengan akun WhatsApp **+{baileysState.phone}**.
                  </p>
                  <p>
                    ✓ Semua pesan obrolan perorangan (JID berakhir di <code className="text-[#25D366] font-mono">@s.whatsapp.net</code>) yang dikirim ke nomor Anda akan dianalisis secara otomatis oleh sistem, dicarikan tanggapan paling mematikan lewat basis FAQ & Aturan Closing, lalu dibalas instan.
                  </p>
                  <p className="text-zinc-500 italic block pt-1">
                    *Catatan: Obrolan dalam Grup (Group Chats) secara default diabaikan secara aman agar tidak memicu spam tidak terkendali.
                  </p>
                </div>

                <div className="border-t border-zinc-850 pt-3">
                  <button
                    onClick={handleStopBaileys}
                    disabled={isRefreshingBaileys}
                    className="w-full sm:w-auto bg-rose-950/20 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-400 text-rose-300 hover:text-white font-bold text-xs uppercase px-5 py-2.5 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
                  >
                    <Power className="w-4 h-4" />
                    DODGE / PUTUSKAN SESI WHATSAPP (LOGOUT)
                  </button>
                </div>
              </div>
            ) : baileysState.status === 'connecting' ? (
              <div className="bg-black/40 border border-zinc-900 p-6 flex flex-col items-center text-center justify-center gap-3 py-12">
                <RefreshCw className="w-10 h-10 text-[#25D366] animate-spin mb-2" />
                <h4 className="text-xs font-bold font-mono uppercase tracking-widest text-zinc-300">MENUNGGU KODE QR DARI WHATSAPP...</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed max-w-sm">
                  Sistem sedang mengaktifkan modul penghubung dan membuat sesi enkripsi kunci pribadi. Proses ini biasanya butuh waktu 5-8 detik.
                </p>
              </div>
            ) : baileysState.status === 'qr' ? (
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold text-[#25D366] font-mono tracking-widest bg-[#25D366]/10 border border-[#25D366]/20 px-2.5 py-1 inline-block">
                  PANDUAN PEMINDAIAN KODE QR
                </span>

                <div className="flex flex-col gap-2 relative border-l border-zinc-850 pl-2">
                  {/* Step Row 1 */}
                  <div className="flex gap-3 items-start bg-black/40 p-2.5 border border-zinc-900 hover:border-zinc-800 transition-colors">
                    <div className="w-5.5 h-5.5 shrink-0 rounded-none bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-[10px] font-black font-mono flex items-center justify-center">
                      01
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#25D366]" /> Buka WhatsApp
                      </span>
                      <p className="text-[10.5px] text-zinc-400 font-sans leading-snug">
                        Buka aplikasi <strong>WhatsApp</strong> resmi di ponsel pintar Anda.
                      </p>
                    </div>
                  </div>

                  {/* Step Row 2 */}
                  <div className="flex gap-3 items-start bg-black/40 p-2.5 border border-zinc-900 hover:border-zinc-800 transition-colors">
                    <div className="w-5.5 h-5.5 shrink-0 rounded-none bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-[10px] font-black font-mono flex items-center justify-center">
                      02
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-[#25D366]" /> Masuk ke Menu
                      </span>
                      <p className="text-[10.5px] text-zinc-400 font-sans leading-snug">
                        Ketuk ikon <strong>Tiga Titik (⋮)</strong> di kanan atas (Android) atau tab <strong>Pengaturan</strong> di kanan bawah (iOS).
                      </p>
                    </div>
                  </div>

                  {/* Step Row 3 */}
                  <div className="flex gap-3 items-start bg-black/40 p-2.5 border border-zinc-900 hover:border-zinc-800 transition-colors">
                    <div className="w-5.5 h-5.5 shrink-0 rounded-none bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-[10px] font-black font-mono flex items-center justify-center">
                      03
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#25D366]" /> Perangkat Tertaut
                      </span>
                      <p className="text-[10.5px] text-zinc-400 font-sans leading-snug">
                        Pilih menu <strong>Perangkat Tertaut (Linked Devices)</strong>, lalu ketuk tombol <strong>Tautkan Perangkat</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step Row 4 */}
                  <div className="flex gap-3 items-start bg-black/40 p-2.5 border border-zinc-900 hover:border-zinc-800 transition-colors">
                    <div className="w-5.5 h-5.5 shrink-0 rounded-none bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-[10px] font-black font-mono flex items-center justify-center">
                      04
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-[#25D366]" /> Arahkan Kamera & Scan
                      </span>
                      <p className="text-[10.5px] text-zinc-400 font-sans leading-snug">
                        Arahkan kamera ponsel Anda langsung ke <strong>Kode QR</strong> visual di panel sebelah kanan Anda.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                  *Setelah pemindaian sukses, asisten cerdas Anda akan langsung terotentikasi dan otomatis aktif siaga melayani pelanggan dalam hitungan detik.
                </p>

                <div className="border-t border-zinc-900 pt-3 flex gap-3">
                  <button
                    onClick={handleStopBaileys}
                    disabled={isRefreshingBaileys}
                    className="bg-zinc-90 w-full sm:w-auto hover:bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-xs px-4 py-2 hover:text-white transition-colors cursor-pointer"
                  >
                    Batal / Matikan Engine
                  </button>
                </div>
              </div>
            ) : (
              // Idle / Closed / Error status
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono tracking-widest bg-zinc-900 border border-zinc-800 px-2.5 py-1 inline-block">
                  KONEKTIVITAS MANDIRI TANPA BOT GATEWAY PIHAK KETIGA
                </span>
                
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  UBAH NOMOR WHATSAPP ANDA MENJADI AI SALES SECARA INSTAN!
                </h4>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tidak butuh setup webhook berbayar atau hosting ribet. Protokol kami bekerja dengan mensimulasikan web socket WhatsApp Web client langsung dari kontainer kami. Anda hanya butuh melakukan proses **Tautkan Perangkat** seolah-olah Kakak sedang login lewat WhatsApp Web di laptop biasa.
                </p>

                {baileysState.error && (
                  <div className="bg-rose-955/20 border border-rose-500/20 p-3 text-[10.5px] text-rose-300 font-mono flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>Error Log: {baileysState.error}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleStartBaileys}
                    disabled={isRefreshingBaileys}
                    className="w-full sm:w-auto bg-[#25D366] hover:bg-white text-black font-black uppercase text-xs tracking-wider italic px-6 py-3 rounded-none flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg active:scale-95"
                  >
                    <Power className="w-4.5 h-4.5 text-black" />
                    AKTIFKAN KONEKSI & TAMPILKAN QR CODE
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Right Dynamic Showcase Panel (Col Span 5) */}
          <div className="col-span-1 lg:col-span-5 flex flex-col items-center justify-center bg-black/60 border border-zinc-900 p-6 min-h-[290px] relative">
            
            {baileysState.status === 'qr' && baileysState.qr ? (
              <div className="flex flex-col items-center text-center gap-4 animate-fadeIn">
                <div className="bg-white p-3 border-4 border-[#25D366] shadow-2xl relative">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=5&data=${encodeURIComponent(baileysState.qr)}`}
                    alt="WhatsApp QR Code"
                    width="200"
                    height="200"
                    referrerPolicy="no-referrer"
                    className="max-w-full block"
                  />
                  <div className="absolute inset-0 border-2 border-black/10 pointer-events-none"></div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-[#25D366] font-black uppercase tracking-widest animate-pulse">
                     QR CODE AKTIF TERPANCAR
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Scan via Linked Devices WhatsApp HP Anda
                  </p>
                </div>
              </div>
            ) : baileysState.status === 'open' ? (
              <div className="flex flex-col items-center text-center gap-4 py-8 animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
                  <Wifi className="w-8 h-8 text-emerald-400 animate-pulse" />
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase text-white font-sans tracking-wide">
                    ASISTEN AKTIF AKUN:
                  </span>
                  <p className="text-lg font-black text-[#25D366] font-mono leading-none tracking-tight">
                    +{baileysState.phone}
                  </p>
                  <p className="text-[10.5px] text-emerald-400/90 font-mono uppercase tracking-widest block pt-2">
                    ● SESI TEROTENTIKASI & LIVE
                  </p>
                </div>
              </div>
            ) : baileysState.status === 'connecting' ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-t-2 border-r-2 border-[#25D366] rounded-full animate-spin"></div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Memulai Sesi Secure...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-3 text-zinc-500 py-10">
                <Smartphone className="w-14 h-14 text-zinc-700 block mb-2" />
                <p className="text-xs font-mono uppercase tracking-widest">WHATSAPP DORMANT</p>
                <p className="text-[10px] text-zinc-600 leading-relaxed max-w-[200px]">
                  Silakan nyalakan engine koneksi untuk memancarkan QR Code live-time.
                </p>
              </div>
            )}

          </div>

        </div>

      </div>


      {/* SECTION 0.5: LIVE TELEMETRY HEALTH & PING DATA */}
      <BaileysTelemetry 
        isBypassMode={false} 
        baileysConnectState={baileysState} 
        onRefresh={fetchBaileysStatus} 
      />


      
      {/* SECTION 1: MAIN WEBHOOK CONFIGURATION CARD */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-none p-6 flex flex-col gap-5">
        
        <div className="border-b border-zinc-850 pb-4">
          <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-wide italic">
            <Globe className="w-5 h-5 text-[#25D366]" />
            PRODUKSI INTEGRASI: LIVE WEBHOOK API
          </h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Asisten WhatsApp Anda kini **siap dipasarkan di sistem produksi**. Gunakan Webhook HTTP URL di bawah ini untuk menghubungkan generator asisten kami ke WABA (WhatsApp Business Cloud API) rujukan meta, Evolution API, Twilio, ataupun backend gateway kustom Anda.
          </p>
        </div>

        {/* Copyable URL area */}
        <div className="bg-black border border-zinc-850 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 flex-1">
            <span className="text-[10px] text-zinc-500 font-mono block uppercase tracking-widest">LIVE ENDPOINT WEBHOOK URL (PRODUCTION_READY)</span>
            <span className="text-xs font-mono text-[#25D366] font-black break-all select-all">{webhookUrl}</span>
          </div>

          <button
            onClick={handleCopyUrl}
            className="w-full sm:w-auto shrink-0 bg-[#25D366]/10 border border-[#25D366]/30 hover:bg-[#25D366] hover:text-black text-[#25D366] font-bold text-xs px-4 py-2.5 transition-all flex items-center justify-center gap-1.5"
          >
            {copiedUrl ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Salin Webhook URL
              </>
            )}
          </button>
        </div>

        {/* Action Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Action A: Copy Prompt */}
          <div className="bg-black/55 border border-zinc-900 p-4 flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-zinc-200 block uppercase tracking-wider">Salin Full System Prompt</span>
              <span className="text-[10.5px] text-zinc-500 block">Dapatkan prompt mental instruktif yang menampung seluruh FAQ & Aturan Closing.</span>
            </div>
            
            <button
              onClick={handleCopyPrompt}
              className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-[#25D366] hover:text-white text-zinc-400 rounded-none transition-colors"
              title="Salin Prompt"
            >
              {copiedPrompt ? <Check className="w-4.5 h-4.5 text-emerald-400" /> : <Copy className="w-4.5 h-4.5" />}
            </button>
          </div>

          {/* Action B: Download json */}
          <div className="bg-black/55 border border-zinc-900 p-4 flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-zinc-200 block uppercase tracking-wider">Ekspor agentwa-config.json</span>
              <span className="text-[10.5px] text-zinc-500 block">Unduh berkas penuh instruksi, FAQ, dan Aturan Flow dalam bentuk JSON bersih.</span>
            </div>
            
            <button
              onClick={handleDownloadConfig}
              className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-[#25D366] hover:text-white text-zinc-400 rounded-none transition-colors"
              title="Unduh JSON"
            >
              <Download className="w-4.5 h-4.5" />
            </button>
          </div>

        </div>

      </div>

      {/* SECTION 2: COURIER & EXPEDITION PRODUCTION GATEWAY DECORATOR */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-none p-6 flex flex-col gap-5">
        <div className="border-b border-zinc-850 pb-4">
          <h3 className="text-md font-black text-white flex items-center gap-2 uppercase tracking-wide">
            <Truck className="w-4.5 h-4.5 text-[#25D366]" />
            MODUL CEK ONGKIR INDONESIA (CEK TARIF PROD)
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Asisten WhatsApp dapat dikoneksikan ke Logistik Nasional untuk pengiriman otomatis. Konfigurasikan margin tambahan dan provider di bawah ini:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block mb-1">LOGISTIK PROVIDER</label>
            <select
              value={shippingProvider}
              onChange={(e) => setShippingProvider(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-none py-2.5 px-3 text-xs text-zinc-200"
            >
              <option value="rajaongkir">RajaOngkir API Gateway (JNE/Pos/Tiki)</option>
              <option value="biteship">Biteship API Integrasi Korporat (GoSend/Grab/J&T)</option>
              <option value="shipper">Shipper.id Aggregator</option>
              <option value="manual">Manual Flat Rate (Ketentuan Sendiri)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block mb-1">MARGIN MARKUP ONGKIR</label>
            <select
              value={markupType}
              onChange={(e) => setMarkupType(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-none py-2.5 px-3 text-xs text-zinc-200"
            >
              <option value="flat">Markup Flat (Tambahan Rp)</option>
              <option value="percentage">Markup Persentase (Tambahan %)</option>
              <option value="none">Sesuai Tarif Asli Ekspedisi</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block mb-1">NILAI MARKUP</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={markupValue}
                onChange={(e) => setMarkupValue(e.target.value)}
                placeholder="Misal: 5000"
                className="w-full bg-black border border-zinc-800 rounded-none py-2 px-3 text-xs text-zinc-200 font-mono"
              />
              <button
                onClick={() => {
                  setIsShippingSaved(true);
                  setTimeout(() => setIsShippingSaved(false), 2000);
                  onLogUpdated(`[Settings] Ekspedisi diset: ${shippingProvider} dengan markup ${markupValue}`);
                }}
                className="bg-[#25D366] text-black text-[10px] font-bold px-3 py-2 uppercase font-mono shrink-0 select-none hover:bg-white transition-colors"
              >
                {isShippingSaved ? 'Saved!' : 'Apply'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 3: HTTP WEBHOOK INTERACTIVE TESTER (PLAYGROUND) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-none p-6 flex flex-col gap-5">
        
        <div className="border-b border-zinc-850 pb-4">
          <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-wide italic">
            <Play className="w-5 h-5 text-[#25D366]" />
            TESTER WEBHOOK LIVE (HTTP POST SIMULATION)
          </h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Simulasikan pengiriman HTTP POST dari server gateway Anda langsung ke endpoint asisten ini. Sistem akan merespons menggunakan algoritma AI aktif dan mencatatnya ke log server.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Input payload sender mock content */}
            <div className="col-span-1 md:col-span-8 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">Isi Pesan Pelanggan</label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Tulis pesan uji coba di sini..."
                className="w-full bg-black border border-zinc-800 rounded-none py-3 px-4 text-xs text-white placeholder-zinc-700 font-sans focus:outline-none focus:border-[#25D366]"
              />
            </div>

            {/* Input payload format selector */}
            <div className="col-span-1 md:col-span-4 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">Skema Payload Integrasi</label>
              <select
                value={testFormat}
                onChange={(e) => setTestFormat(e.target.value as any)}
                className="w-full bg-black border border-zinc-800 rounded-none py-3 px-4 text-xs text-white focus:outline-none focus:border-[#25D366]"
              >
                <option value="generic">Custom Simple JSON Payload</option>
                <option value="meta">Meta Cloud API (WABA Format)</option>
                <option value="evolution">Evolution / Baileys API Protocol</option>
                <option value="twilio">Twilio WhatsApp Message Protocol</option>
              </select>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-zinc-900 pt-3">
            <span className="text-[10px] text-zinc-500 font-mono italic">
              Metode: POST | Format Output: JSON / XML TwiML
            </span>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyCurl}
                className="flex-1 sm:flex-none uppercase font-mono text-[10px] tracking-widest text-zinc-400 hover:text-white px-3 py-2 bg-zinc-900 border border-zinc-800 active:scale-95 transition-all text-center"
              >
                {copiedCurl ? 'cURL Copied!' : 'Salin cURL Script'}
              </button>

              <button
                onClick={executeTestWebhook}
                disabled={isTesting || !testMessage.trim()}
                className="flex-1 sm:flex-none bg-[#25D366] text-black font-black uppercase text-xs tracking-wider italic px-5 py-2.5 rounded-none flex items-center justify-center gap-1.5 hover:bg-white transition-colors"
              >
                {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-black fill-black" />}
                KIRIM POST KE WEBHOOK
              </button>
            </div>
          </div>

          {/* Test Response Output Code View */}
          {testResponse && (
            <div className="bg-black border border-zinc-850 p-4.5 rounded-none space-y-3 font-mono text-xs animate-fadeIn">
              <div className="flex justify-between items-center text-[10.5px] border-b border-zinc-900 pb-2">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  RESPONS SERVER WEBHOOK: HTTP {testResponse.statusCode || 200} OK
                </span>
                <button 
                  onClick={() => setTestResponse(null)} 
                  className="text-zinc-600 hover:text-white"
                >
                  CLEAR
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto text-zinc-300 pr-1 text-[11px] leading-relaxed whitespace-pre font-mono">
                {typeof testResponse.body === 'string' 
                  ? testResponse.body 
                  : JSON.stringify(testResponse.body, null, 2)
                }
              </div>
            </div>
          )}

        </div>

      </div>

      {/* SECTION 4: REAL-TIME HTTP INCOMING CALL LOGS */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-none p-6 flex flex-col gap-4">
        
        <div className="flex justify-between items-start border-b border-zinc-850 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4.5 h-4.5 text-[#25D366]" />
            <h3 className="text-xs font-black uppercase tracking-wider font-mono text-white">LIVE WEBHOOK CONNECTION LOGS (REAL-TIME HISTORY)</h3>
          </div>
          
          <div className="flex gap-3 text-[10px] font-mono">
            <button
              onClick={fetchWebhookLogs}
              className="text-zinc-400 hover:text-white flex items-center gap-1"
              disabled={isFetchingLogs}
            >
              <RefreshCw className={`w-3 h-3 ${isFetchingLogs ? 'animate-spin' : ''}`} />
              REFRESH
            </button>
            <button
              onClick={clearWebhookLogs}
              className="text-zinc-500 hover:text-rose-400 my-0"
            >
              CLEAR TRAFFIC LOG
            </button>
          </div>
        </div>

        {webhookLogs.length === 0 ? (
          <div className="bg-black/40 border border-zinc-900 rounded-none p-10 text-center text-xs text-zinc-500 font-mono uppercase tracking-wider leading-relaxed">
            [Signal]  Menunggu panggilan Webhook API masuk... <br />
            Silakan kirimkan payload simulator di atas atau hubungkan endpoint kustom Anda untuk memantau trafik HTTP.
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
            {webhookLogs.map((log, idx) => (
              <div key={idx} className="bg-black border border-zinc-900 hover:border-zinc-800 p-4 font-mono text-[11px] leading-relaxed relative flex flex-col gap-2.5">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-1.5 py-0.5 bg-zinc-850 text-zinc-300 font-bold uppercase border border-zinc-800">{log.source}</span>
                    <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                  </div>
                  <span className="text-zinc-600 font-bold">sender: {log.sender?.substring(0, 15)}... ({log.name})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-normal">
                  <div className="bg-[#050505] p-2.5 border border-zinc-900">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1 font-mono">PESAN DITERIMA:</div>
                    <p className="text-zinc-300 font-sans italic">"{log.received}"</p>
                  </div>
                  <div className="bg-[#0c0c0c] p-2.5 border border-[#25D366]/10">
                    <div className="text-[10px] text-[#25D366]/60 font-bold uppercase tracking-wider mb-1 font-mono">REBALASAN ASISTEN AI:</div>
                    <p className="text-[#25D366] font-sans">"{log.replied}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
