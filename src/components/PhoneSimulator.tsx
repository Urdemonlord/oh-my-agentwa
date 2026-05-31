import { useState, useEffect, useRef } from 'react';
import { 
  Send, Check, CheckCheck, Phone, Video, MoreVertical, 
  Wifi, Battery, Shield, Bot, User, Sparkles, RefreshCw, Smartphone, Zap,
  Mic, MicOff, Volume2, VolumeX, Pause, Play, AlertCircle
} from 'lucide-react';
import { ChatSession, AgentConfig, Message } from '../types';

interface PhoneSimulatorProps {
  config: AgentConfig;
  onLogUpdated: (logs: string[]) => void;
}

export default function PhoneSimulator({ config, onLogUpdated }: PhoneSimulatorProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [timeStr, setTimeStr] = useState('09:41');
  const [isRephrasing, setIsRephrasing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice Recording & Playback states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingError, setRecordingError] = useState('');
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [isPlayingMsgId, setIsPlayingMsgId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState(0);

  const recordingTimerRef = useRef<any>(null);
  const playbackTimerRef = useRef<any>(null);

  const startRecording = () => {
    setIsRecording(true);
    setRecordingDuration(0);
    setRecordingError('');

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(p => p + 1);
    }, 1000);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'id-ID';

        recognition.onresult = (event: any) => {
          const resultText = event.results[0][0].transcript;
          if (resultText) {
            handleVoiceSend(resultText, recordingDuration || 4);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech Recognition Error:", event.error);
          if (event.error === 'not-allowed') {
            setRecordingError("Izin mikrofon ditolak / terblokir");
          } else {
            setRecordingError(`Error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          // Finished standard stream
        };

        recognition.start();
        setRecognitionInstance(recognition);
        onLogUpdated([`[Mikrofon] Memulai perekaman dan mendeteksi ucapan...`]);
      } catch (err: any) {
        setRecordingError("Gagal mengaktifkan modul suara");
      }
    } else {
      setRecordingError("Browser tidak mendukung Web Speech API");
    }
  };

  const stopRecording = (cancelled: boolean = false) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);

    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (e) {}
      setRecognitionInstance(null);
    }

    if (cancelled) {
      onLogUpdated([`[Voicenote Tool] Perekaman suara dibatalkan.`]);
    }
  };

  const handleVoiceSend = async (textToSend: string, durationSec: number = 3) => {
    if (!textToSend.trim() || !activeSessionId || !config) return;

    const min = Math.floor(durationSec / 60);
    const sec = durationSec % 60;
    const durationStr = `${min}:${String(sec).padStart(2, '0')}`;

    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: 'customer',
      text: textToSend,
      timestamp: new Date().toISOString(),
      isVoice: true,
      voiceDuration: durationStr,
      voiceTranscriptStatus: 'success'
    };

    updateSessionWithNewMessage(activeSessionId, newMsg);

    onLogUpdated([
      `[Voice Note] Menggunakan Web Speech API untuk transkripsi...`,
      `[Transkripsi Sukses] "${textToSend}" (${durationStr})`,
      `[System] Asisten menerima pesan suara & memproses jawaban...`
    ]);

    await triggerAiResponse(activeSessionId, textToSend);
  };

  const togglePlayMsg = (msgId: string) => {
    if (isPlayingMsgId === msgId) {
      setIsPlayingMsgId(null);
      setPlayProgress(0);
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    } else {
      setIsPlayingMsgId(msgId);
      setPlayProgress(0);
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
      
      let currentProgress = 0;
      playbackTimerRef.current = setInterval(() => {
        currentProgress += 5;
        if (currentProgress > 100) {
          setIsPlayingMsgId(null);
          setPlayProgress(0);
          if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current);
            playbackTimerRef.current = null;
          }
        } else {
          setPlayProgress(currentProgress);
        }
      }, 250);

      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(320, audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.1);
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const handleRephrase = async () => {
    if (!inputText.trim()) return;
    setIsRephrasing(true);
    try {
      const res = await fetch("/api/rephrase-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputText,
          toneStyle: config.toneStyle,
          config: config
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rephrased) {
          setInputText(data.rephrased);
          onLogUpdated([
            `[AI Rephraser] Pesan berhasil di-rephrase secara dinamis menggunakan gaya bicara "${config.toneStyle}"! `
          ]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRephrasing(false);
    }
  };

  // Update battery and mock time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hrs}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Initialize simulated chat scenarios tailored to the generated business
  useEffect(() => {
    if (!config) return;

    const initialScenarioSessions: ChatSession[] = [
      {
        id: 'session_owner',
        customerName: 'Owner Kontrol / Pengelola 👑',
        customerPhone: config.ownerPhone || '628112233445',
        avatarSeed: 'owner',
        unreadCount: 1,
        messages: [
          {
            id: 'owner_m1',
            sender: 'customer',
            text: `Halo ${config.name}, tolong laporkan rekapan total laba kotor, jumlah transaksi penjualan hari ini, dan hasil kepuasan pelanggan dong!`,
            timestamp: new Date(Date.now() - 60000).toISOString(),
            status: 'read'
          }
        ]
      },
      {
        id: 'session_nego',
        customerName: 'Budi Santoso (Calon Buyer)',
        customerPhone: '+62 812-3456-7890',
        avatarSeed: 'budi',
        unreadCount: 1,
        messages: [
          {
            id: 'nego_m1',
            sender: 'customer',
            text: `Halo admin, salam kenal! Saya tertarik banget dengan produk ${config.name} ini. Yang best seller ready stock gak kak? Terus harganya apa bisa kurang dikit nih biar saya langsung bungkus hari ini?`,
            timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
            status: 'read'
          }
        ]
      },
      {
        id: 'session_ongkir',
        customerName: 'Susi Susanti (Tanya Ongkir & Order)',
        customerPhone: '+62 856-9876-5432',
        avatarSeed: 'susi',
        unreadCount: 1,
        messages: [
          {
            id: 'ongkir_m1',
            sender: 'customer',
            text: `Sore sis! Mau nanya dong, kalau kirim ke daerah Kecamatan Kebayoran Baru, Jakarta Selatan, ongkos kirimnya berapa ya? Pakai kurir apa aja yang tersedia? Terus cara pemesanannya bagaimana ya?`,
            timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
            status: 'read'
          }
        ]
      },
      {
        id: 'session_complaint',
        customerName: 'Roni Pratama (Komplain)',
        customerPhone: '+62 821-4567-8901',
        avatarSeed: 'roni',
        unreadCount: 1,
        messages: [
          {
            id: 'comp_m1',
            sender: 'customer',
            text: `Halo, kok paket saya yang dikirim 3 hari lalu belum sampai-sampai ya? Di resi tracking-nya masih stuck di hub transit Bandung. Tolong dibantu follow up ya min, soalnya ini urgent barangnya mau dipakai kado ulang tahun keluarga besok.`,
            timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
            status: 'read'
          }
        ]
      }
    ];

    setSessions(initialScenarioSessions);
    setActiveSessionId(initialScenarioSessions[0].id);
    onLogUpdated(["[WhatsApp Engine] Node Virtual aktif", `[System] Memuat 3 skenario percakapan simulasi untuk bisnis: "${config.name}"`]);
  }, [config]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId, isTyping]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Send message function (from customer)
  const handleCustomerSend = async (textToSend: string) => {
    if (!textToSend.trim() || !activeSessionId || !config) return;

    // 1. Add Customer Message to local state
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: 'customer',
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    updateSessionWithNewMessage(activeSessionId, newMsg);
    setInputText('');

    // 2. Trigger AI Bot thinking/typing
    onLogUpdated([
      `[Chat - ${activeSession?.customerName}] Pelanggan mengirim: "${textToSend}"`,
      `[System] Menganalisis pesan dan konteks bisnis...`,
      `[System] Menelusuri FAQ relevan dengan gaya bicara: "${config.toneStyle}"...`
    ]);

    await triggerAiResponse(activeSessionId, textToSend);
  };

  const updateSessionWithNewMessage = (sessionId: string, newMsg: Message) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          unreadCount: 0,
          messages: [...session.messages, newMsg]
        };
      }
      return session;
    }));
  };

  // Bot response logic via Express Backend API calling Gemini
  const triggerAiResponse = async (sessionId: string, customerMessage: string) => {
    setIsTyping(true);
    
    const targetSession = sessions.find(s => s.id === sessionId);
    if (!targetSession) return;

    try {
      // Package recent history to send to server
      const chatHistory = targetSession.messages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: customerMessage,
          history: chatHistory,
          config: config,
          senderPhone: targetSession.customerPhone
        })
      });

      if (!res.ok) {
        throw new Error("API call failed");
      }

      const data = await res.json();
      const botReply = data.reply || "Maaf Kak, ada sedikit gangguan koneksi. Boleh diulang pertanyaannya?";

      // Add delay to simulate natural WhatsApp typing speed
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

      const adminMsg: Message = {
        id: `msg_${Date.now()}_admin`,
        sender: 'admin',
        text: botReply,
        timestamp: new Date().toISOString(),
        status: 'read'
      };

      setSessions(prev => prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            messages: [...session.messages, adminMsg]
          };
        }
        return session;
      }));

      // Update AI Logs
      onLogUpdated([
        `[System] Selesai menyusun tanggapan.`,
        `[System] Tanggapan siap dikirim.`,
        `[WA Admin Response] "${botReply.slice(0, 70)}..."`,
        `[System] Status: Terkirim`
      ]);

    } catch (err: any) {
      console.error(err);
      onLogUpdated([`[System] Gagal mendapatkan respon: ${err.message}`]);
      
      const adminMsgError: Message = {
        id: `msg_err_${Date.now()}`,
        sender: 'admin',
        text: "Maaf Kak, saat ini sedang padat pemesanan. Admin akan hadir kembali sebentar lagi.",
        timestamp: new Date().toISOString()
      };
      
      setSessions(prev => prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            messages: [...session.messages, adminMsgError]
          };
        }
        return session;
      }));
    } finally {
      setIsTyping(false);
    }
  };

  // Fast trigger scenario reply for presentation demo convenience
  const handleFastTriggerResponse = (text: string) => {
    handleCustomerSend(text);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full h-full min-h-[600px]">
      
      {/* Session List Panel */}
      <div className="w-full xl:w-80 shrink-0 bg-zinc-950 border border-zinc-800 rounded-none p-4 flex flex-col gap-3">
        <h3 className="text-xs font-black text-white px-1 uppercase tracking-wider flex items-center gap-2 italic">
          <Smartphone className="w-4 h-4 text-[#25D366]" />
          Inbox WhatsApp Simulasi
        </h3>
        
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[350px] xl:max-h-[500px]">
          {sessions.map(s => {
            const lastMsg = s.messages[s.messages.length - 1];
            const isActive = activeSessionId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSessionId(s.id);
                  // Clear unread indicator
                  setSessions(prev => prev.map(item => item.id === s.id ? { ...item, unreadCount: 0 } : item));
                }}
                className={`w-full text-left p-3.5 rounded-none transition-all duration-200 flex gap-3 border ${
                  isActive 
                    ? 'bg-zinc-900 border-[#25D366] shadow-xl' 
                    : 'bg-black/60 border-zinc-900 hover:bg-zinc-900 hover:border-zinc-800'
                }`}
              >
                <div className="w-11 h-11 rounded-none bg-zinc-900 border border-zinc-800 font-extrabold flex items-center justify-center text-zinc-300 relative text-sm shrink-0">
                  {s.customerName[0]}
                  {s.unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#25D366] text-black font-black text-[10px] rounded-none flex items-center justify-center antialiased animate-bounce">
                      {s.unreadCount}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-extrabold text-xs text-zinc-100 truncate">{s.customerName}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono block">{s.customerPhone}</span>
                  <p className="text-xs text-zinc-400 line-clamp-1 mt-1 font-sans leading-snug">
                    {lastMsg ? lastMsg.text : 'Belum ada pesan'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Info Helper */}
        <div className="p-3 bg-black rounded-none border border-zinc-850 text-[11px] text-zinc-400 flex gap-2">
          <Sparkles className="w-4 h-4 text-[#25D366] shrink-0" />
          <div>
            <span className="font-bold text-zinc-200">Tips Presentasi:</span> Klik salah satu skenario inbox di atas untuk menguji taktik closing atau respon bot secara instan!
          </div>
        </div>
      </div>

      {/* WhatsApp Device Mockup */}
      <div className="flex-1 flex justify-center items-center w-full">
        <div className="relative w-full max-w-[340px] h-[640px] bg-black rounded-none p-3 shadow-2xl border-[6px] border-zinc-800 flex flex-col overflow-hidden">
          
          {/* Smartphone Camera Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-4.5 bg-zinc-900 rounded-none z-30 flex items-center justify-between px-3">
            <span className="w-2.5 h-2.5 bg-zinc-800 rounded-full"></span>
            <span className="w-12 h-1 bg-black rounded-none"></span>
          </div>

          {/* Device Screen Status Bar */}
          <div className="h-7 w-full bg-zinc-950/40 text-zinc-400 flex justify-between items-center px-6 text-[10px] font-mono select-none z-20 mt-1 shrink-0">
            <span>{timeStr}</span>
            <div className="flex gap-1.5 items-center">
              <Wifi className="w-3 h-3 text-zinc-400" />
              <span className="text-[9px]">4G</span>
              <Battery className="w-3.5 h-3.5 text-zinc-400" />
            </div>
          </div>

          {/* WhatsApp Header App Bar */}
          <div className="bg-zinc-950 border-b border-zinc-850 p-2.5 flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-none bg-zinc-900 border border-zinc-800 font-extrabold text-xs flex items-center justify-center text-[#25D366] italic overflow-hidden">
                {config.avatarImage ? (
                  <img src={config.avatarImage} alt={config.name} className="w-full h-full object-cover" />
                ) : (
                  config.avatarSeed ? config.avatarSeed.slice(0, 2).toUpperCase() : 'WA'
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-tight text-white uppercase italic">{config.name}</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-none bg-[#25D366] animate-pulse"></span>
                  <span className="text-[9px] text-zinc-400 font-mono uppercase tracking-wider">online</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 text-zinc-400">
              <Video className="w-4 h-4 cursor-pointer opacity-70 hover:opacity-100" />
              <Phone className="w-4 h-4 cursor-pointer opacity-70 hover:opacity-100" />
              <MoreVertical className="w-4 h-4 cursor-pointer opacity-70 hover:opacity-100" />
            </div>
          </div>

          {/* Chat Background and message flow */}
          <div className="flex-1 bg-black p-3 overflow-y-auto flex flex-col gap-2.5 relative" style={{ backgroundImage: 'radial-gradient(#1c1c1f 1px, transparent 0)', backgroundSize: '16px 16px' }}>
            
            {/* Encryption notice */}
            <div className="mx-auto my-1 py-1.5 px-3 bg-zinc-900 border border-zinc-850 rounded-none text-[9px] text-[#25D366] text-center max-w-[250px] leading-tight font-mono uppercase tracking-wider">
              Koneksi Terenkripsi • Virtual Node
            </div>

            {activeSession && activeSession.messages.map((m) => {
              const isAdmin = m.sender === 'admin';
              return (
                <div 
                  key={m.id}
                  className={`flex flex-col max-w-[82%] rounded-none px-3.5 py-2 text-xs relative border shadow-sm ${
                    isAdmin 
                      ? 'self-end bg-[#25D366] text-black border-[#25D366] font-medium' 
                      : 'self-start bg-zinc-900 text-zinc-200 border-zinc-800'
                  }`}
                >
                  {m.isVoice ? (
                    <div className="flex flex-col gap-2 py-1 min-w-[210px] select-none font-sans">
                      {/* Audio Player Header */}
                      <div className="flex items-center gap-2.5">
                        {/* Play/Pause Button */}
                        <button
                          onClick={() => togglePlayMsg(m.id)}
                          className="w-8 h-8 rounded-full bg-emerald-500/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/15 transition-all shrink-0 cursor-pointer"
                        >
                          {isPlayingMsgId === m.id ? (
                            <Pause className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366] ml-0.5" />
                          )}
                        </button>

                        {/* Waveform Animation */}
                        <div className="flex-grow flex items-end gap-0.5 h-6">
                          {[20, 45, 30, 60, 25, 55, 40, 75, 20, 50, 65, 35, 60].map((h, idx) => {
                            const isActive = isPlayingMsgId === m.id && (playProgress / 100) * 13 > idx;
                            return (
                              <span
                                key={idx}
                                className="w-0.5 transition-all duration-150 rounded-full"
                                style={{
                                  height: `${h}%`,
                                  backgroundColor: isActive ? '#25D366' : '#4b5563',
                                }}
                              ></span>
                            );
                          })}
                        </div>

                        {/* Mic/Speaker Badge */}
                        <div className="relative shrink-0 pr-0.5">
                          <Mic className="w-4 h-4 text-[#25D366]" />
                          <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-emerald-400 rounded-full border border-zinc-950"></span>
                        </div>
                      </div>

                      {/* Voice Info */}
                      <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono px-0.5">
                        <span>Pesan Suara ({m.voiceDuration || '0:05'})</span>
                        {isPlayingMsgId === m.id && (
                          <span className="text-[#25D366] animate-pulse">Memutar...</span>
                        )}
                      </div>

                      {/* Dynamic AI Transcription Box */}
                      <div className="bg-black/40 border border-zinc-850 p-2 font-sans rounded-none transition-all mt-1">
                        <div className="flex items-center gap-1 mb-1 border-b border-zinc-900 pb-1 text-[9px] font-mono uppercase tracking-widest text-[#25D366]">
                          <Sparkles className="w-3 h-3 text-[#25D366]" />
                          <span>Transkripsi Instan (AI)</span>
                        </div>
                        <p className="text-[11px] text-zinc-300 italic font-sans leading-relaxed">
                          "{m.text}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1.5">
                    <span className={`text-[8px] font-mono leading-none ${isAdmin ? 'text-black/60' : 'text-zinc-500'}`}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isAdmin && (
                      <CheckCheck className="w-3 h-3 text-black opacity-80 leading-none" />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Simulated typing indicator */}
            {isTyping && (
              <div className="self-start bg-zinc-900 text-zinc-300 rounded-none border border-zinc-850 px-3.5 py-2.5 text-xs flex items-center gap-1 shadow-sm">
                <span className="text-zinc-400 font-extrabold text-[9px] uppercase tracking-wider font-mono mr-1 italic">
                  {config.name} mengetik
                </span>
                <span className="w-1.5 h-1.5 bg-[#25D366] rounded-none animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#25D366] rounded-none animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#25D366] rounded-none animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick Demo Pre-filled Answer Taps */}
          {activeSession && activeSession.messages.length === 1 && (
            <div className="bg-zinc-950 px-2 py-1.5 flex flex-col gap-1.5 border-t border-zinc-850 shrink-0">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Pilih Balasan Pelanggan:</span>
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[75px]">
                {activeSession.id === 'session_nego' && (
                  <>
                    <button 
                      onClick={() => handleFastTriggerResponse("Waduh Kak, apa dapet potongan kalau saya ambil 2 pasang langsung? Tolong dikasih harga net ya")}
                      className="text-[9px] text-left shrink-0 bg-black text-zinc-300 px-2.5 py-1.5 rounded-none border border-zinc-800 hover:bg-white hover:text-black hover:border-white truncate font-mono uppercase tracking-wide transition-all"
                    >
                      Potongan ambil 2 pasang...
                    </button>
                    <button 
                      onClick={() => handleFastTriggerResponse("Bisa bayar COD tidak kak? Terus model retro merah size 42 ready kan?")}
                      className="text-[9px] text-left shrink-0 bg-black text-zinc-300 px-2.5 py-1.5 rounded-none border border-zinc-800 hover:bg-white hover:text-black hover:border-white truncate font-mono uppercase tracking-wide transition-all"
                    >
                      Bisa bayar COD? ready size 42?
                    </button>
                  </>
                )}
                {activeSession.id === 'session_ongkir' && (
                  <>
                    <button 
                      onClick={() => handleFastTriggerResponse("Oh gitu kak. Kirim dari mana ya? Kalau saya pesen sekarang pakai kurir Same Day JNE bisa?")}
                      className="text-[9px] text-left shrink-0 bg-black text-zinc-300 px-2.5 py-1.5 rounded-none border border-zinc-800 hover:bg-white hover:text-black hover:border-white truncate font-mono uppercase tracking-wide transition-all"
                    >
                      Kirim darimana? Same Day JNE?
                    </button>
                  </>
                )}
                {activeSession.id === 'session_complaint' && (
                  <>
                    <button 
                      onClick={() => handleFastTriggerResponse("Tolong dicek secepatnya ya min, soalnya anak saya mau ultah besok sore, takut ga sempet dikasih kado")}
                      className="text-[9px] text-left shrink-0 bg-black text-zinc-300 px-2.5 py-1.5 rounded-none border border-zinc-800 hover:bg-white hover:text-black hover:border-white truncate font-mono uppercase tracking-wide transition-all"
                    >
                      Tolong cek secepatnya min...
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* WhatsApp Text Input Bar footer */}
          {isRecording ? (
            <div className="bg-zinc-950 p-2.5 flex flex-col gap-2 border-t border-zinc-850 shrink-0 select-none z-20 animate-fadeIn">
              {/* Recording Status & Wave */}
              <div className="flex items-center justify-between px-2 py-1 bg-black/60 border border-zinc-855 rounded-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                  <span className="text-[10px] font-mono font-black text-red-500 uppercase tracking-wider">
                    MEREKAM ({Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')})
                  </span>
                </div>
                <div className="flex gap-0.5 items-end h-3 pr-0.5">
                  {[20, 60, 40, 80, 50, 90, 30, 70, 45, 85].map((h, i) => (
                    <span 
                      key={i} 
                      className="w-0.5 bg-red-500 rounded-full animate-bounce" 
                      style={{ height: `${h}%`, animationDuration: `${0.4 + i*0.04}s` }}
                    ></span>
                  ))}
                </div>
              </div>

              {/* Status and instruction helpers */}
              <div className="text-[10px] text-zinc-400 font-sans px-0.5 space-y-1">
                {recordingError ? (
                  <p className="text-amber-500 flex items-center gap-1 font-mono uppercase text-[8.5px] tracking-wide leading-tight">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {recordingError}
                  </p>
                ) : (
                  <p className="text-[#25D366] animate-pulse text-[9px]">
                     Bicara sekarang untuk mentranskrip secara instan...
                  </p>
                )}
                
                {/* Fast simulated option choices so they can test voice feature completely inside Iframe */}
                <div className="border-t border-zinc-900 pt-1.5 mt-1">
                  <span className="text-[8px] text-zinc-500 font-bold block uppercase tracking-wider font-mono mb-1"> PILIH SIMULASI SUARA CEPAT:</span>
                  <div className="flex flex-col gap-1 max-h-[110px] overflow-y-auto pr-0.5 line-clamp-2">
                    <button
                      type="button"
                      onClick={() => {
                        stopRecording();
                        handleVoiceSend("Halo admin, produk best seller yang harganya promo apakah bahannya terjamin awet kak?", 6);
                      }}
                      className="text-[9px] text-left bg-zinc-900 hover:bg-[#25D366] hover:text-black border border-zinc-800 hover:border-transparent px-2 py-1.5 rounded-none font-mono text-zinc-300 transition-all truncate"
                    >
                       "Apakah kaos best-seller bahannya awet...?"
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopRecording();
                        handleVoiceSend("Sore sis, paket saya dari Sukabumi bisa nyampe lusa gak ya? Soalnya mau dipake kerja.", 8);
                      }}
                      className="text-[9px] text-left bg-zinc-900 hover:bg-[#25D366] hover:text-black border border-zinc-800 hover:border-transparent px-2 py-1.5 rounded-none font-mono text-zinc-300 transition-all truncate"
                    >
                       "Paket dari Sukabumi bisa kirim lusa...?"
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopRecording();
                        handleVoiceSend("Halo, min tolong ya saya tadi salah ketik alamat pengiriman, solusinya gimana ya?", 11);
                      }}
                      className="text-[9px] text-left bg-zinc-900 hover:bg-[#25D366] hover:text-black border border-zinc-800 hover:border-transparent px-2 py-1.5 rounded-none font-mono text-zinc-300 transition-all truncate"
                    >
                       "Tolong min, saya salah draf alamat kiriman..."
                    </button>
                  </div>
                </div>
              </div>

              {/* Action record controller footer */}
              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => stopRecording(true)}
                  className="flex-1 py-1.5 bg-zinc-900 hover:bg-red-950 text-red-400 border border-zinc-800 hover:border-red-900 font-black uppercase text-[9px] tracking-wider italic rounded-none cursor-pointer text-center"
                >
                  BATAL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    if (!recognitionInstance && !SpeechRecognition) {
                      stopRecording();
                      handleVoiceSend("Halo kak, saya mau tanya apakah paket saya yang order kemarin sudah diproses kurir?", 7);
                    } else {
                      stopRecording();
                    }
                  }}
                  className="flex-1 py-1.5 bg-[#25D366] hover:bg-white text-black font-black uppercase text-[9px] tracking-wider italic rounded-none cursor-pointer text-center"
                >
                  KIRIM SUARA
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-950 p-2 flex items-center gap-1.5 border-t border-zinc-850 shrink-0 select-none z-20">
              {/* Voice note trigger */}
              <button
                type="button"
                onClick={startRecording}
                title="Kirim Pesan Suara / Voice Note (Mendukung Transkrip) "
                className="w-8.5 h-8.5 rounded-none bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-[#25D366] hover:border-[#25D366] flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer"
              >
                <Mic className="w-4 h-4" />
              </button>

              <div className="flex-1 bg-black rounded-none flex items-center px-2.5 py-1 border border-zinc-800 gap-1.5">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Kirim chat Pelanggan..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomerSend(inputText);
                  }}
                  className="flex-1 bg-transparent border-none text-white placeholder-zinc-650 text-xs focus:outline-none"
                />
                {inputText.trim() && (
                  <button
                    type="button"
                    onClick={handleRephrase}
                    disabled={isRephrasing}
                    title="Optimalkan pesan ini menggunakan gaya bicara AI Asisten (Tone: Sesuai Pilihan) "
                    className="p-1 text-[#25D366] hover:bg-zinc-900 transition-all rounded-none border-none bg-transparent flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    {isRephrasing ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-[#25D366]" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-[#25D366]" />
                    )}
                  </button>
                )}
              </div>
              
              <button
                onClick={() => handleCustomerSend(inputText)}
                disabled={!inputText.trim() || isTyping}
                className={`w-8.5 h-8.5 rounded-none flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                  inputText.trim() 
                    ? 'bg-[#25D366] text-black hover:bg-white' 
                    : 'bg-zinc-900 text-zinc-650 border border-zinc-850 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
