import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie,
  AreaChart, Area, Legend
} from 'recharts';
import { 
  TrendingUp, Coins, Users, Target, CheckCircle2, 
  AlertCircle, Sparkles, Plus, Trash2, RefreshCw, MessageSquareCode,
  ArrowUpRight, HeartHandshake, ShieldCheck, Calendar, Download, Filter,
  Menu, X
} from 'lucide-react';

interface SaleTransaction {
  id: string;
  timestamp: number;
  customerName: string;
  phone: string;
  items: string;
  amount: number;
  status: "paid" | "pending" | "processing";
  channel: "simulator" | "live" | "webhook";
}

interface ConversationEvaluation {
  id: string;
  timestamp: number;
  customerName: string;
  channel: "simulator" | "webhook";
  intent: "Tanya Harga" | "Pemesanan (Order)" | "Komplain Terlambat" | "Nego Diskon" | "Konsultasi";
  satisfaction: "Sangat Puas" | "Puas" | "Cukup" | "Butuh Bantuan Selesai";
  agentSummary: string;
  followUpAction: string;
}

export default function EvaluationDashboard() {
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [evaluations, setEvaluations] = useState<ConversationEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Filter States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'processing'>('all');

  const fetchReports = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
        setEvaluations(data.evaluations || []);
      }
    } catch (err: any) {
      console.error("Gagal mematikan laporan evaluasi:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports(true);
    // Poll for changes every 4 seconds to catch active simulated order interactions from user chat
    const interval = setInterval(() => fetchReports(true), 4000);
    return () => clearInterval(interval);
  }, []);

  const handleClearReports = async () => {
    if (!window.confirm("Apakah Anda yakin ingin mengatur ulang data log penjualan dan evaluasi?")) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/reports/clear', { method: 'POST' });
      if (res.ok) {
        setSales([]);
        setEvaluations([]);
      }
    } catch (err) {
      console.error("Error clearing reports:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSimulateSale = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/reports/simulate-sale', { method: 'POST' });
      if (res.ok) {
        await fetchReports(true);
      }
    } catch (err) {
      console.error("Error simulating sale:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  // Filter Sales and Evaluations chronologically based on selected Specific Timeframe
  const filteredSales = sales.filter(s => {
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (s.timestamp < start.getTime()) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (s.timestamp > end.getTime()) return false;
    }
    return true;
  });

  const filteredEvaluations = evaluations.filter(ev => {
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (ev.timestamp < start.getTime()) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (ev.timestamp > end.getTime()) return false;
    }
    return true;
  });

  // Apply visual status filter specifically on Sales Pipeline list
  const filteredSalesForTable = filteredSales.filter(s => {
    if (statusFilter === 'all') return true;
    return s.status === statusFilter;
  });

  // Export Sales & Conversation Evaluations dynamically to Consolidated CSV File
  const handleExportCSV = () => {
    try {
      let csvParts: string[] = [];
      
      // 1. Sales Report Chunk
      csvParts.push("=== LAPORAN TRANSAKSI PENJUALAN ===");
      csvParts.push("ID TRx,Waktu,Nama Pelanggan,Kontak HP,Produk / Layanan,Nominal,Status,Kategori Channel");
      
      filteredSales.forEach(s => {
        const timeStr = new Date(s.timestamp).toLocaleString('id-ID').replace(/,/g, ' ');
        const escapedName = `"${s.customerName.replace(/"/g, '""')}"`;
        const escapedItems = `"${s.items.replace(/"/g, '""')}"`;
        csvParts.push(`${s.id},${timeStr},${escapedName},${s.phone},${escapedItems},${s.amount},${s.status.toUpperCase()},${s.channel}`);
      });
      
      csvParts.push(""); // spacer
      csvParts.push(""); // spacer
      
      // 2. Evaluations Report Chunk
      csvParts.push("=== ANALISIS SESI CHAT & EVALUASI AI ===");
      csvParts.push("ID Eval,Waktu,Nama Pelanggan,Saluran,Topik (Intent),Tingkat Kepuasan,Ringkasan AI,Saran Tindakan (Follow Up)");
      
      filteredEvaluations.forEach(ev => {
        const timeStr = new Date(ev.timestamp).toLocaleString('id-ID').replace(/,/g, ' ');
        const escapedName = `"${ev.customerName.replace(/"/g, '""')}"`;
        const escapedSummary = `"${ev.agentSummary.replace(/"/g, '""')}"`;
        const escapedAction = `"${ev.followUpAction.replace(/"/g, '""')}"`;
        csvParts.push(`${ev.id},${timeStr},${escapedName},${ev.channel},${ev.intent},${ev.satisfaction},${escapedSummary},${escapedAction}`);
      });

      const csvString = csvParts.join("\r\n");
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      
      const localeDate = new Date().toISOString().split('T')[0];
      link.setAttribute("download", `Laporan_Evaluasi_AI_Penjualan_${localeDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal melakukan ekspor data ke CSV:", err);
    }
  };

  // Compute stats based on the active timeframe filtered sales
  const totalRevenue = filteredSales
    .filter(s => s.status === 'paid')
    .reduce((sum, s) => sum + s.amount, 0);

  const pendingRevenue = filteredSales
    .filter(s => s.status === 'pending')
    .reduce((sum, s) => sum + s.amount, 0);

  const totalLeads = filteredSales.length;
  const paidLeads = filteredSales.filter(s => s.status === 'paid').length;
  const conversionRate = totalLeads > 0 ? parseFloat(((paidLeads / totalLeads) * 100).toFixed(1)) : 100;

  // Format currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  // Prepare Pie Chart data for categories in active timeframe
  const intentCounts: { [key: string]: number } = {};
  filteredEvaluations.forEach(ev => {
    intentCounts[ev.intent] = (intentCounts[ev.intent] || 0) + 1;
  });
  const chartDataIntents = Object.keys(intentCounts).map(intent => ({
    name: intent,
    value: intentCounts[intent]
  }));

  // Assemble Daily Revenue changes for the financial trend line area chart
  const dailyRevenueData = (() => {
    const groups: { [key: string]: { dateStr: string; timestamp: number; paidAmount: number; pendingAmount: number } } = {};
    
    filteredSales.forEach(s => {
      const dateObj = new Date(s.timestamp);
      const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
      if (!groups[dateStr]) {
        groups[dateStr] = {
          dateStr,
          timestamp: s.timestamp,
          paidAmount: 0,
          pendingAmount: 0
        };
      }
      if (s.status === 'paid') {
        groups[dateStr].paidAmount += s.amount;
      } else if (s.status === 'pending') {
        groups[dateStr].pendingAmount += s.amount;
      }
    });

    // Chronological order sorting
    return Object.values(groups)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(g => ({
        Tanggal: g.dateStr,
        'Revenue Paid': g.paidAmount,
        'Potential Pending': g.pendingAmount
      }));
  })();

  const COLORS = ['#25D366', '#38bdf8', '#f43f5e', '#fbbf24', '#a855f7'];

  return (
    <div id="evaluation-dashboard-container" className="space-y-6 animate-fadeIn pb-12">
      
      {/* Header Panel */}
      <div className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider font-mono">
            <TrendingUp className="w-4 h-4 text-[#25D366]" />
            Dashboard Evaluasi & Laporan Penjualan AI
          </h3>
          <p className="text-[11px] text-zinc-500 font-mono mt-1">
            Analisis pipeline closing order, klasifikasi intent chat, tingkat kepuasan pelanggan, dan rekomendasi tindak lanjut (follow-up).
          </p>
        </div>

        {/* Hamburger Menu Toggle on Mobile */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full py-2 px-4 bg-zinc-900 border border-zinc-800 text-white font-mono text-[10px] uppercase font-black hover:border-[#25D366] active:bg-zinc-850 flex items-center justify-between gap-4 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#25D366]" />
              Menu Aksi & Filter
            </span>
            {isMobileMenuOpen ? (
              <X className="w-4 h-4 text-[#25D366]" />
            ) : (
              <Menu className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        </div>

        {/* Desktop Always-on Action Panel */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={handleSimulateSale}
            disabled={isSimulating}
            className="py-1.5 px-3 bg-[#25D366] hover:bg-[#20ba59] text-black border border-[#25D366] rounded-none cursor-pointer transition-colors flex items-center gap-1.5 font-mono text-[10px] uppercase font-extrabold disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Simulasi Order Baru
          </button>

          <button
            onClick={() => fetchReports(false)}
            disabled={isRefreshing}
            className="py-1.5 px-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 rounded-none cursor-pointer transition-colors flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#25D366]' : ''}`} />
            Perbarui
          </button>

          <button
            onClick={handleClearReports}
            className="py-1.5 px-3 bg-red-950/20 border border-red-900/40 hover:bg-red-950/45 hover:border-red-500 text-red-500 hover:text-red-400 rounded-none cursor-pointer transition-colors flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset Data
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Actions Drawer/Container */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-zinc-950 border border-[#25D366]/40 p-5 space-y-4 animate-scaleIn">
          <div className="border-b border-zinc-900 pb-2">
            <span className="text-[10px] font-bold font-mono text-[#25D366] uppercase tracking-wider">Aksi Cepat</span>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => {
                handleSimulateSale();
                setIsMobileMenuOpen(false);
              }}
              disabled={isSimulating}
              className="py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba59] text-black border border-[#25D366] rounded-none cursor-pointer transition-colors flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase font-extrabold disabled:opacity-50 w-full"
            >
              <Plus className="w-3.5 h-3.5" />
              Simulasi Order Baru
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  fetchReports(false);
                  setIsMobileMenuOpen(false);
                }}
                disabled={isRefreshing}
                className="py-2 px-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-350 border border-zinc-800 rounded-none cursor-pointer transition-colors flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase font-bold disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#25D366]' : ''}`} />
                Perbarui
              </button>

              <button
                onClick={() => {
                  handleClearReports();
                  setIsMobileMenuOpen(false);
                }}
                className="py-2 px-3 bg-red-950/20 border border-red-900/40 hover:bg-red-950/45 text-red-500 rounded-none cursor-pointer transition-colors flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Data
              </button>
            </div>
          </div>

          <div className="border-b border-zinc-900 pt-2 pb-2">
            <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider">Filter Rentang Tanggal</span>
          </div>

          <div className="space-y-3 font-mono text-[10px]">
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 uppercase font-bold">Mulai dari:</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-black border border-zinc-900 text-zinc-300 font-mono text-[11px] py-1.5 px-3 rounded-none outline-none focus:border-[#25D366]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 uppercase font-bold">Sampai dengan:</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-black border border-zinc-900 text-zinc-300 font-mono text-[11px] py-1.5 px-3 rounded-none outline-none focus:border-[#25D366]"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  handleResetDateFilter();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-[10px] uppercase font-mono font-bold transition-all"
              >
                Reset Filter (Semua Waktu)
              </button>
            )}
          </div>

          <div className="border-b border-zinc-900 pt-2 pb-2">
            <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider">Eksport Data Sekali Klik</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="text-[9px] font-mono text-zinc-400 bg-zinc-900 px-2 py-2 border border-zinc-850/50 text-center">
              Terfilter: <strong>{filteredSales.length}</strong> Penjualan | <strong>{filteredEvaluations.length}</strong> Evaluasi
            </div>
            <button
              onClick={() => {
                handleExportCSV();
                setIsMobileMenuOpen(false);
              }}
              disabled={filteredSales.length === 0 && filteredEvaluations.length === 0}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 text-[#25D366] border border-zinc-800 hover:border-[#25D366] rounded-none cursor-pointer font-black font-mono text-[10px] uppercase transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-[#25D366]" />
              Unduh CSV Laporan
            </button>
          </div>
        </div>
      )}

      {/* Date Range Picker Action Bar - Always visible on desktop */}
      <div className="hidden md:flex bg-zinc-950 border border-zinc-900 p-4 flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#25D366]" />
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-400">Rentang Waktu Laporan:</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-zinc-500 uppercase">Mulai:</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-black border border-zinc-900 text-zinc-350 font-mono text-[10px] py-1 px-2.5 rounded-none outline-none focus:border-[#25D366] hover:border-zinc-850"
            />
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-zinc-500 uppercase">Sampai:</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-black border border-zinc-900 text-zinc-350 font-mono text-[10px] py-1 px-2.5 rounded-none outline-none focus:border-[#25D366] hover:border-zinc-850"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={handleResetDateFilter}
              className="py-1 px-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white text-[9px] uppercase font-mono transition-all rounded-none cursor-pointer font-bold"
            >
              Semua Waktu
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-start">
          <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 px-2 py-1.5 border border-zinc-850/50">
            Terfilter: <strong>{filteredSales.length}</strong> Penjualan | <strong>{filteredEvaluations.length}</strong> Evaluasi Sesi
          </span>
          <button
            onClick={handleExportCSV}
            disabled={filteredSales.length === 0 && filteredEvaluations.length === 0}
            className="py-1.5 px-3.5 bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-800 hover:border-[#25D366] rounded-none cursor-pointer font-black font-mono text-[10px] uppercase transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:hover:border-zinc-800"
          >
            <Download className="w-3.5 h-3.5 text-[#25D366]" />
            Ekspor Data (CSV)
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Rev Paid */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-none hover:border-[#25D366]/40 transition-colors flex flex-col justify-between h-28 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-15 text-zinc-750 group-hover:opacity-20 transition-opacity">
            <Coins className="w-16 h-16 text-[#25D366]" />
          </div>
          <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 font-mono">Pendapatan Closing (Paid)</span>
          <div>
            <div className="text-xl font-mono font-black text-[#25D366]">{formatIDR(totalRevenue)}</div>
            <p className="text-[9px] text-zinc-400 font-mono mt-0.5">Sukses dari riwayat transaksi terekam.</p>
          </div>
        </div>

        {/* Rev Pending */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-none hover:border-amber-500/40 transition-colors flex flex-col justify-between h-28 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 text-zinc-700 group-hover:opacity-15 transition-opacity">
            <ArrowUpRight className="w-16 h-16" />
          </div>
          <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 font-mono">Potensi Omset (Pending Form)</span>
          <div>
            <div className="text-xl font-mono font-black text-amber-400">{formatIDR(pendingRevenue)}</div>
            <p className="text-[9px] text-zinc-400 font-mono mt-0.5">Menunggu transfer/bukti pembayaran.</p>
          </div>
        </div>

        {/* Leads Count */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-none hover:border-sky-500/40 transition-colors flex flex-col justify-between h-28 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 text-zinc-700 group-hover:opacity-15 transition-opacity">
            <Users className="w-16 h-16" />
          </div>
          <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 font-mono">Total Leads Terdeteksi</span>
          <div>
            <div className="text-xl font-mono font-black text-white">{totalLeads} Prospek</div>
            <p className="text-[9px] text-zinc-450 font-mono mt-0.5">Tercatat dari sapaan & form pemesanan.</p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-none hover:border-emerald-500/40 transition-colors flex flex-col justify-between h-28 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 text-zinc-700 group-hover:opacity-15 transition-opacity">
            <Target className="w-16 h-16" />
          </div>
          <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 font-mono">Rasio Conversion Rate AI</span>
          <div>
            <div className="text-xl font-mono font-black text-emerald-400">{conversionRate}%</div>
            <p className="text-[9px] text-zinc-455 font-mono mt-0.5">Rasio lead berubah menjadi closing paid.</p>
          </div>
        </div>
      </div>

      {/* Visual Charts Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Bar Chart Prospek omset */}
        <div className="lg:col-span-7 bg-zinc-950 border border-zinc-900 p-4 flex flex-col gap-4">
          <div className="border-b border-zinc-900 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-[#25D366]" />
              Visualisasi Omset & Status Pipeline
            </span>
            <span className="text-[9px] font-mono text-zinc-500">IDR RUPIAH</span>
          </div>
          <div className="w-full h-[220px] bg-black/40 flex items-center justify-center min-w-0 min-h-[220px] relative">
            {filteredSales.length === 0 ? (
              <span className="text-zinc-650 font-mono text-[10px] uppercase">Belum ada transaksi pemesanan untuk digrafikkan</span>
            ) : (
              <ResponsiveContainer width="100%" height={220} minHeight={220}>
                <BarChart data={[
                  { name: 'Paid (Lunas)', jumlah: totalRevenue, fill: '#25D366' },
                  { name: 'Pending', jumlah: pendingRevenue, fill: '#fbbf24' }
                ]} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontStyle="italic" />
                  <YAxis stroke="#52525b" fontSize={10} />
                  <Tooltip 
                    formatter={(value) => [formatIDR(value as number), 'Nilai Rupiah']}
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#222', borderRadius: '0' }}
                  />
                  <Bar dataKey="jumlah">
                    <Cell fill="#25D366" />
                    <Cell fill="#fbbf24" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie Chart intent categorization */}
        <div className="lg:col-span-5 bg-zinc-950 border border-zinc-900 p-4 flex flex-col gap-4">
          <div className="border-b border-zinc-900 pb-2">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-white">Distribusi Topik Chat (Intent)</span>
          </div>
          <div className="w-full h-[220px] bg-black/40 flex items-center justify-center min-w-0 min-h-[220px] relative">
            {filteredEvaluations.length === 0 ? (
              <span className="text-zinc-650 font-mono text-[10px] uppercase">Belum ada riwayat topik chat terekam</span>
            ) : (
              <ResponsiveContainer width="100%" height={220} minHeight={220}>
                <PieChart>
                  <Pie
                    data={chartDataIntents}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                    fontSize={9}
                    fontFamily="monospace"
                  >
                    {chartDataIntents.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#222' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Area/Trend Chart: Daily Revenue Changes helper */}
      <div className="bg-zinc-950 border border-zinc-900 p-5 flex flex-col gap-4">
        <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#25D366]" />
            <h4 className="text-xs font-black uppercase text-white font-mono tracking-wider">
              Grafik Tren Omset & Pertumbuhan Penjualan Harian
            </h4>
          </div>
          <span className="text-[9px] font-mono text-[#25D366] bg-[#25D366]/10 border border-[#25D366]/20 px-2 py-0.5 uppercase">
            Laporan Real-time Pertumbuhan Finansial
          </span>
        </div>
        <div className="w-full h-64 bg-black/40 flex items-center justify-center p-2 min-w-0 min-h-[240px] relative">
          {filteredSales.length === 0 ? (
            <span className="text-zinc-650 font-mono text-[10px] uppercase">Belum ada transaksi pemesanan dalam rentang tanggal ini untuk mengukur tren pergerakan harian</span>
          ) : (
            <ResponsiveContainer width="100%" height={240} minHeight={240}>
              <AreaChart data={dailyRevenueData} margin={{ top: 15, right: 15, left: 15, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#25D366" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#25D366" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="Tanggal" stroke="#52525b" fontSize={10} fontStyle="italic" />
                <YAxis stroke="#52525b" fontSize={10} tickFormatter={(val) => `Rp ${val / 1000}k`} />
                <Tooltip 
                  formatter={(value) => [formatIDR(value as number), '']}
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#222', borderRadius: '0' }}
                />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="Revenue Paid" stroke="#25D366" fillOpacity={1} fill="url(#colorPaid)" strokeWidth={2.5} name="Total Lunas (Paid)" />
                <Area type="monotone" dataKey="Potential Pending" stroke="#fbbf24" fillOpacity={1} fill="url(#colorPending)" strokeWidth={1.5} strokeDasharray="4 4" name="Menunggu Transfer (Pending)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Sales Pipeline Table */}
      <div className="bg-zinc-950 border border-zinc-900 p-5 flex flex-col gap-4">
        
        {/* Table Header Filter UI */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-3 gap-3">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#25D366]" />
            <h4 className="text-xs font-black uppercase text-white font-mono tracking-wider">
              Daftar Prospek Penjualan & Closing (CRM Minimalis)
            </h4>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <Filter className="w-3.5 h-3.5 text-[#25D366]" />
              <span className="text-zinc-500 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-black border border-zinc-900 text-zinc-300 font-mono text-[10px] py-1 px-2.5 rounded-none outline-none focus:border-[#25D366] hover:border-zinc-800 transition-colors uppercase cursor-pointer"
              >
                <option value="all">SEMUA STATUS</option>
                <option value="paid">LUNAS (PAID)</option>
                <option value="pending">PENDING (MENUNGGU)</option>
                <option value="processing">PROSES (PROCESSING)</option>
              </select>
            </div>

            <div className="px-2 py-0.5 bg-[#25D366]/5 border border-[#25D366]/15 text-[9px] text-[#25D366] font-mono uppercase">
              Auto-Updated
            </div>
          </div>
        </div>

        {filteredSalesForTable.length === 0 ? (
          <div className="h-28 flex flex-col items-center justify-center text-center gap-1.5 p-4 bg-black/40">
            <AlertCircle className="w-5 h-5 text-zinc-650 animate-pulse" />
            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider font-bold">Kategori Kosong</span>
            <p className="text-[9px] text-zinc-550 max-w-sm leading-relaxed">
              Tidak ada catatan draf pemesanan dengan status <strong>{statusFilter.toUpperCase()}</strong> dalam filter/rentang waktu yang diterapkan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto animate-fadeIn">
            <table className="w-full text-left font-mono text-[10px] border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 pb-2">
                  <th className="py-2.5 font-bold uppercase tracking-wider">ID TRx</th>
                  <th className="font-bold uppercase tracking-wider">Waktu</th>
                  <th className="font-bold uppercase tracking-wider">Nama Pelanggan</th>
                  <th className="font-bold uppercase tracking-wider">Kontak HP</th>
                  <th className="font-bold uppercase tracking-wider">Produk / Layanan</th>
                  <th className="font-bold uppercase tracking-wider">Nominal</th>
                  <th className="font-bold uppercase tracking-wider text-right">Status Pajak/Transfer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredSalesForTable.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2.5 font-bold text-zinc-400">{item.id}</td>
                    <td className="text-zinc-500 italic">
                      {new Date(item.timestamp).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="text-white font-semibold">{item.customerName}</td>
                    <td className="text-zinc-400">{item.phone}</td>
                    <td className="text-zinc-300">{item.items}</td>
                    <td className="text-white font-bold">{formatIDR(item.amount)}</td>
                    <td className="text-right">
                      <span className={`inline-block px-1.5 py-0.5 font-bold rounded-none text-[8px] uppercase tracking-wider border ${
                        item.status === 'paid' 
                          ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-400' 
                          : item.status === 'pending'
                          ? 'bg-amber-950/20 border-amber-900/60 text-amber-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}>
                        {item.status === 'paid' ? 'LUNAS (PAID)' : item.status === 'pending' ? 'MENUNGGU TRANSFER' : 'PROCESSING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Evaluasi Chat List */}
      <div className="bg-zinc-950 border border-zinc-900 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-[#25D366]" />
            <h4 className="text-xs font-black uppercase text-white font-mono tracking-wider">
              Analisis Sesi Chat & Rekomendasi Tindak Lanjut (Evaluasi AI)
            </h4>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[9px] px-2 py-0.5 bg-black text-emerald-400 border border-zinc-850">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Auto-Evaluator Aktif</span>
          </div>
        </div>

        {filteredEvaluations.length === 0 ? (
          <div className="h-28 flex flex-col items-center justify-center text-center gap-1.5 p-4 bg-black/40">
            <MessageSquareCode className="w-5 h-5 text-zinc-650 animate-pulse" />
            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider font-bold">Belum Ada Sesi Chat yang Dievaluasi</span>
            <p className="text-[9px] text-zinc-550 max-w-sm leading-relaxed">
              Kirimkan pertanyaan ke asisten AI di Chat Simulator untuk langsung menganalisis topik, tingkat kepuasan, dan rekomendasi follow-up nya di sini!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvaluations.map((ev) => (
              <div 
                key={ev.id} 
                className="p-4 bg-black border border-zinc-900 flex flex-col md:grid md:grid-cols-12 gap-4 hover:border-zinc-800 transition-colors"
              >
                {/* Meta details */}
                <div className="md:col-span-3 space-y-1.5 font-mono text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#25D366]">{ev.id}</span>
                    <span className="text-zinc-500 italic">
                      {new Date(ev.timestamp).toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-white font-extrabold">{ev.customerName}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 bg-zinc-900 text-zinc-300 font-bold uppercase tracking-wide">
                      {ev.intent}
                    </span>
                  </div>
                </div>

                {/* Summarized Evaluation */}
                <div className="md:col-span-5 space-y-1 font-mono text-[10px]">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Tindakan AI & Hasil Evaluasi:</span>
                  <p className="text-zinc-300 leading-relaxed italic">
                    "{ev.agentSummary}"
                  </p>
                </div>

                {/* Follow up actions */}
                <div className="md:col-span-4 bg-zinc-900/40 p-2.5 border-l-2 border-[#25D366] flex flex-col justify-between font-mono text-[10px]">
                  <div className="space-y-1">
                    <span className="text-[9px] text-[#25D366] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#25D366]" /> 
                      Saran Tindakan User (Follow Up)
                    </span>
                    <p className="text-zinc-300 leading-relaxed">
                      {ev.followUpAction}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-850/60">
                    <span className="text-[8px] text-zinc-500 font-semibold uppercase">KEPUASAN AI :</span>
                    <span className="text-[9px] font-extrabold text-emerald-400 font-mono tracking-wider bg-emerald-950/20 border border-emerald-900/50 px-1.5 py-0.2 uppercase">
                      {ev.satisfaction}
                    </span>
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
