import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Radio, 
  HardDrive, 
  Clock, 
  Zap, 
  MessageSquare
} from 'lucide-react';

interface TelemetryData {
  latency: number;
  reconnectCount: number;
  totalProcessed: number;
  uptime: number;
  history: { timestamp: string; latency: number }[];
}

interface BaileysStatus {
  status: 'idle' | 'connecting' | 'qr' | 'open' | 'closed' | 'error';
  qr: string;
  phone: string;
  error: string;
  telemetry?: TelemetryData;
}

interface BaileysTelemetryProps {
  isBypassMode: boolean;
  baileysConnectState: BaileysStatus;
  onRefresh?: () => void;
}

export default function BaileysTelemetry({ isBypassMode, baileysConnectState, onRefresh }: BaileysTelemetryProps) {
  const [browserPing, setBrowserPing] = useState<number | null>(null);
  const [isBrowserPinging, setIsBrowserPinging] = useState(false);
  const [localHistory, setLocalHistory] = useState<{ x: number; y: number; label: string }[]>([]);

  // Calculate browser-to-server actual HTTP RTT
  const handleTestPing = async () => {
    setIsBrowserPinging(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/baileys/status');
      if (res.ok) {
        await res.json();
        const end = performance.now();
        setBrowserPing(Math.round(end - start));
      }
    } catch (e) {
      console.error(e);
      setBrowserPing(-1);
    } finally {
      setIsBrowserPinging(false);
    }
  };

  const telemetry = baileysConnectState.telemetry;
  const rawHistory = telemetry?.history;

  // Transform raw history into responsive SVG rendering coordinates
  useEffect(() => {
    let points: { timestamp: string; latency: number }[] = [];
    
    if (isBypassMode) {
      // Simulate highly realistic live mock historical points for manual workspace simulator users
      const count = 12;
      for (let i = count; i >= 0; i--) {
        const t = new Date(Date.now() - i * 3000);
        const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        points.push({
          timestamp: timeStr,
          latency: Math.floor(10 + Math.random() * 15) // highly optimal mock connection 10-25ms
        });
      }
    } else {
      points = [...(rawHistory || [])];
    }

    if (points.length === 0) {
      setLocalHistory(prev => prev.length > 0 ? [] : prev);
      return;
    }

    // Capture highest peak in dataset and scale beautifully inside the card graph layout
    const maxVal = Math.max(...points.map(p => p.latency), 120); 
    const minVal = 0;
    const range = maxVal - minVal;

    const width = 500;
    const height = 110;
    const paddingX = 20;
    const paddingY = 15;

    const stepX = (width - paddingX * 2) / Math.max(points.length - 1, 1);
    
    const transformed = points.map((pt, index) => {
      const x = paddingX + index * stepX;
      const y = height - paddingY - ((pt.latency - minVal) / range) * (height - paddingY * 2);
      return { x, y, label: `${pt.latency}ms (${pt.timestamp})` };
    });

    setLocalHistory(transformed);
  }, [rawHistory, isBypassMode, baileysConnectState.status]);

  // Format processes runtime ticker
  const formatUptimeValue = (seconds: number) => {
    if (!seconds) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const getStatusLabelText = () => {
    if (isBypassMode) return "SIMULASI BYPASS";
    switch (baileysConnectState.status) {
      case 'idle': return "STANDEY / IDLE";
      case 'connecting': return "MENYAMBUNG SERVER";
      case 'qr': return "BELUM SCAN HP";
      case 'open': return "KONEKSI AKTIF (LIVE)";
      case 'closed': return "SAMBUNGAN MATI";
      case 'error': return "ERROR DRIVER";
      default: return "UNKNOWN";
    }
  };

  const getStatusColorClasses = () => {
    if (isBypassMode) {
      return {
        badge: "bg-amber-950/20 text-amber-300 border-amber-500/20",
        pill: "bg-amber-400 animate-pulse"
      };
    }

    switch (baileysConnectState.status) {
      case 'open':
        return {
          badge: "bg-emerald-950/20 text-emerald-300 border-emerald-500/20",
          pill: "bg-emerald-400 animate-pulse"
        };
      case 'connecting':
      case 'qr':
        return {
          badge: "bg-yellow-950/20 text-yellow-300 border-yellow-500/20",
          pill: "bg-yellow-400 animate-bounce"
        };
      case 'closed':
      case 'error':
        return {
          badge: "bg-rose-950/20 text-rose-300 border-rose-500/20",
          pill: "bg-rose-400"
        };
      default:
        return {
          badge: "bg-zinc-900 border-zinc-800 text-zinc-500",
          pill: "bg-zinc-650"
        };
    }
  };

  const styleSet = getStatusColorClasses();

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-none p-5 flex flex-col gap-5 select-none font-sans relative overflow-hidden shadow-xl animate-fadeIn">
      
      {/* Decorative Matrix Scan Line Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(204,255,0,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(204,255,0,0.012)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40"></div>

      {/* Header telemetry info bar */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3.5 z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#25D366]" />
          <div>
            <h3 className="text-sm font-black text-white uppercase italic tracking-wider">
              TELEMETRI KONEKSI UTAMA
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wider">
              Real-time socket health & latency tracker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 text-[9px] font-mono tracking-widest border font-black uppercase flex items-center gap-1.5 ${styleSet.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${styleSet.pill}`} />
            {getStatusLabelText()}
          </div>
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 px-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all rounded-none cursor-pointer"
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Stats parameters panels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10">
        
        {/* Metric 1 */}
        <div className="bg-black border border-zinc-900 p-3.5 flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-zinc-500 font-mono text-[9px] uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-zinc-600" />
            Socket Ping
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black font-mono tracking-tight text-white">
              {isBypassMode 
                ? "14" 
                : (baileysConnectState?.status === 'open' || baileysConnectState?.status === 'qr' || baileysConnectState?.status === 'connecting')
                  ? `${telemetry?.latency || 32}` 
                  : "0"}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">ms</span>
          </div>
          <span className="text-[9px] text-[#25D366]/80 font-mono mt-1 block">
            WebSocket link latency
          </span>
        </div>

        {/* Metric 2 */}
        <div className="bg-black border border-zinc-900 p-3.5 flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-zinc-500 font-mono text-[9px] uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-zinc-600" />
            Active Session
          </span>
          <div className="mt-1">
            <span className="text-base font-black font-mono tracking-tight text-white block">
              {isBypassMode 
                ? "24:15:08" 
                : formatUptimeValue(telemetry?.uptime || 0)}
            </span>
          </div>
          <span className="text-[9px] text-zinc-500 font-mono mt-1 block">
            Core process run duration
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-black border border-zinc-900 p-3.5 flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-zinc-500 font-mono text-[9px] uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5 text-zinc-600" />
            Processed Chats
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black font-mono tracking-tight text-white">
              {isBypassMode ? "142" : telemetry?.totalProcessed || 0}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">DMs</span>
          </div>
          <span className="text-[9px] text-emerald-400 font-mono mt-1 block">
            Managed by AI Agent
          </span>
        </div>

        {/* Metric 4 */}
        <div className="bg-black border border-zinc-900 p-3.5 flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-zinc-500 font-mono text-[9px] uppercase tracking-wider">
            <RefreshCw className="w-3.5 h-3.5 text-zinc-600" />
            Socket Healing
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black font-mono tracking-tight text-white">
              {isBypassMode ? "0" : telemetry?.reconnectCount || 0}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Rsts</span>
          </div>
          <span className="text-[9px] text-zinc-500 font-mono mt-1 block">
            Reconnection recoveries
          </span>
        </div>

      </div>

      {/* SVG Network Trend Visualizer */}
      <div className="bg-black border border-zinc-900 p-4 flex flex-col gap-3 z-10">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400 font-mono uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3 h-3 text-[#25D366]" />
            Aliran Latensi Jaringan Utama (Grafik Heartbeat)
          </span>
          <span className="text-[8px] text-zinc-650 font-mono uppercase tracking-widest">
            {isBypassMode ? "SIMULATED INTERVAL 3s" : "DIRECT SOCKET TICKS"}
          </span>
        </div>

        <div className="relative w-full h-24 bg-[#030303] flex items-center justify-center overflow-hidden border border-zinc-950">
          {localHistory.length > 1 ? (
            <svg 
              viewBox="0 0 500 110" 
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              {/* Horizontal Reference lines */}
              <line x1="0" y1="15" x2="500" y2="15" stroke="#121212" strokeWidth="1" strokeDasharray="3" />
              <line x1="0" y1="55" x2="500" y2="55" stroke="#121212" strokeWidth="1" strokeDasharray="3" />
              <line x1="0" y1="95" x2="500" y2="95" stroke="#121212" strokeWidth="1" strokeDasharray="3" />

              {/* Laser gradient def */}
              <defs>
                <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#25D366" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#25D366" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Shadow filling area */}
              <path
                d={`
                  M ${localHistory[0].x} 110 
                  L ${localHistory.map(p => `${p.x} ${p.y}`).join(' L ')} 
                  L ${localHistory[localHistory.length - 1].x} 110 
                  Z
                `}
                fill="url(#gArea)"
              />

              {/* Main glowing line path */}
              <path
                d={localHistory.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                fill="none"
                stroke="#25D366"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Coordinates dots */}
              {localHistory.map((pt, i) => (
                <g key={i} className="group cursor-help">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="3.5"
                    fill="#25D366"
                    className="stroke-[#000000] stroke-1.5 transition-all outline-none"
                  />
                  <title>{pt.label}</title>
                </g>
              ))}
            </svg>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-zinc-700 select-none">
              <Activity className="w-5 h-5 animate-pulse text-zinc-800" />
              <span className="text-[9px] font-mono uppercase tracking-widest">Menunggu Ticks Data Pertama...</span>
            </div>
          )}

          {/* Glowing laser sliding effect when active */}
          {(isBypassMode || baileysConnectState.status === 'open') && (
            <div className="absolute top-0 bottom-0 w-0.5 bg-[#25D366]/40 drop-shadow-[0_0_8px_#25D366] left-0 animate-[scanLaser_3000ms_linear_infinite]" />
          )}
        </div>

        <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
          <span>{localHistory[0]?.label ? `T1: ${localHistory[0].label.split('(')[1]?.replace(')', '') || ''}` : '00:00:00'}</span>
          <span className="text-zinc-650 tracking-widest text-[8px]">HEALTHY CONTEXT STABLE</span>
          <span>{localHistory[localHistory.length - 1]?.label ? `T2: ${localHistory[localHistory.length - 1].label.split('(')[1]?.replace(')', '') || ''}` : '00:00:00'}</span>
        </div>
      </div>

      {/* Manual verification probe */}
      <div className="bg-black/30 border border-zinc-900 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 z-10 rounded-none">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-zinc-600 shrink-0" />
          <span className="text-[10px] text-zinc-500 leading-normal font-sans">
            Gunakan probe manual di samping untuk menghitung langsung latensi round-trip (RTT) dari browser Anda ke container endpoint AI Studio Server.
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {browserPing !== null && (
            <span className={`text-[9px] font-mono font-bold tracking-widest px-2.5 py-0.5 border ${
              browserPing === -1
                ? 'bg-rose-950/20 text-rose-400 border-rose-500/20'
                : browserPing < 60
                  ? 'bg-emerald-950/15 text-emerald-400 border-emerald-500/15'
                  : 'bg-yellow-950/15 text-yellow-400 border-yellow-500/15'
            }`}>
              {browserPing === -1 ? 'OFFLINE' : `BROWSER PING: ${browserPing}ms`}
            </span>
          )}

          <button
            onClick={handleTestPing}
            disabled={isBrowserPinging}
            className="text-[9px] font-bold uppercase tracking-wider font-mono px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-[#25D366] hover:text-[#25D366] text-zinc-400 disabled:opacity-40 rounded-none transition-all flex items-center gap-1.5 select-none cursor-pointer"
          >
            {isBrowserPinging ? (
              <RefreshCw className="w-3 h-3 text-[#25D366] animate-spin" />
            ) : (
              <Activity className="w-3 h-3 text-[#25D366]" />
            )}
            CEK PING TELEMETRI
          </button>
        </div>
      </div>

    </div>
  );
}
