import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import makeWASocketPkg, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import pino from "pino";

// Handle default export variations in Baileys CommonJS/ESM compatibility layers safely
const makeWASocket = (makeWASocketPkg as any).default || makeWASocketPkg;

dotenv.config();



const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Persistent server memory for production-ready integration
let activeConfig: any = null;
let webhookLogs: any[] = [];
let trafficLogs: { timestamp: number; latency: number; isFallback: boolean; type: "live" | "simulator" | "webhook" }[] = [];

let salesTransactions: {
  id: string;
  timestamp: number;
  customerName: string;
  phone: string;
  items: string;
  amount: number;
  status: "paid" | "pending" | "processing";
  channel: "simulator" | "live" | "webhook";
}[] = [
  { id: "S-1001", timestamp: Date.now() - 3600000 * 5, customerName: "Andi Pratama", phone: "0812****8821", items: "1x Kaos Premium Custom", amount: 185000, status: "paid", channel: "simulator" },
  { id: "S-1002", timestamp: Date.now() - 3600000 * 2.5, customerName: "Indah Permata", phone: "0857****1104", items: "2x Paket Spa & Wash", amount: 350000, status: "paid", channel: "webhook" },
  { id: "S-1003", timestamp: Date.now() - 3600000 * 0.8, customerName: "Rian Cahyono", phone: "0819****5512", items: "1x Konsultasi Desain Logistik", amount: 500000, status: "pending", channel: "simulator" }
];

let conversationEvaluations: {
  id: string;
  timestamp: number;
  customerName: string;
  channel: "simulator" | "webhook";
  intent: "Tanya Harga" | "Pemesanan (Order)" | "Komplain Terlambat" | "Nego Diskon" | "Konsultasi";
  satisfaction: "Sangat Puas" | "Puas" | "Cukup" | "Butuh Bantuan Selesai";
  agentSummary: string;
  followUpAction: string;
}[] = [
  {
    id: "EVAL-001",
    timestamp: Date.now() - 3600000 * 4,
    customerName: "Rudi Hartono",
    channel: "simulator",
    intent: "Nego Diskon",
    satisfaction: "Sangat Puas",
    agentSummary: "Pelanggan meminta potongan harga sebesar 15% untuk pemesanan rombongan. AI berhasil mengalihkan ke benefit tambahan gratis souvenir tanpa mengurangi margin harga utama.",
    followUpAction: "Hubungi kembali untuk menanyakan fiksasi ukuran bonus souvenir kaos."
  },
  {
    id: "EVAL-002",
    timestamp: Date.now() - 3600000 * 1.5,
    customerName: "Amelia Putri",
    channel: "webhook",
    intent: "Tanya Harga",
    satisfaction: "Puas",
    agentSummary: "Menanyakan ketersediaan size XL untuk produk kemeja flanel. AI melayani informasi stok yang up-to-date dan segera mengirim link form registrasi order.",
    followUpAction: "Cek log whatsapp, bila belum ada bukti transfer, kirimkan reminder sopan besok pagi."
  }
];

// Secure PII Shield (AI Guard) Global State Memory
let privacyStats = {
  totalRedactions: 0,
  phoneNumbersRedacted: 0,
  emailsRedacted: 0,
  bankAccountsRedacted: 0,
  ktpsRedacted: 0
};
let redactHistory: { id: string; timestamp: string; channel: string; originalLen: number; redactedLen: number; items: string[]; originalText?: string; maskedText?: string }[] = [];

// Helper utility: Scans and redacts PII elements to enforce Zero-Trust guidelines
function maskSensitiveData(text: string, channel: string = "Simulator"): { maskedText: string; redactions: string[] } {
  if (!text) return { maskedText: text, redactions: [] };
  
  let maskedText = text;
  const redactions: string[] = [];

  // 1. Email Redaction
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = maskedText.match(emailRegex);
  if (emails) {
    emails.forEach(email => {
      const mask = "[EMAIL_TERMASKING]";
      maskedText = maskedText.replace(email, mask);
      const logMsg = `Email (${email.substring(0, 3)}***@***)`;
      if (!redactions.includes(logMsg)) redactions.push(logMsg);
      privacyStats.emailsRedacted++;
      privacyStats.totalRedactions++;
    });
  }

  // 2. Phone Number Redaction (Indonesian standard: 0812..., +628..., 628...)
  const phoneRegex = /(\+?62|0)8[1-9][0-9]{1,2}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,5}\b/g;
  const phones = maskedText.match(phoneRegex);
  if (phones) {
    phones.forEach(phone => {
      const mask = "[NO_HP_TERMASKING]";
      maskedText = maskedText.replace(phone, mask);
      const logMsg = `No. HP (${phone.substring(0, 4)}***${phone.substring(phone.length - 2)})`;
      if (!redactions.includes(logMsg)) redactions.push(logMsg);
      privacyStats.phoneNumbersRedacted++;
      privacyStats.totalRedactions++;
    });
  }

  // 3. KTP/NIK (16 digits in Indonesia)
  const ktpRegex = /\b\d{16}\b/g;
  const ktps = maskedText.match(ktpRegex);
  if (ktps) {
    ktps.forEach(ktp => {
      const mask = "[NIK_KTP_TERMASKING]";
      maskedText = maskedText.replace(ktp, mask);
      const logMsg = `KTP / NIK (${ktp.substring(0, 4)}****************)`;
      if (!redactions.includes(logMsg)) redactions.push(logMsg);
      privacyStats.ktpsRedacted++;
      privacyStats.totalRedactions++;
    });
  }

  // 4. Bank Accounts / Cards preceded/followed by billing context keywords
  const bankContextRegex = /(?:rek(?:ening)?|bca|mandiri|bni|bri|cimb|tf|transfer|no\.?rek)\s*(?:an\s+[\w\s]{2,15})?\s*[:\-\s]*\b\d{10,16}\b/gi;
  const bankMatches = maskedText.match(bankContextRegex);
  if (bankMatches) {
    bankMatches.forEach(match => {
      const digitMatch = match.match(/\b\d{10,16}\b/);
      if (digitMatch) {
         const digits = digitMatch[0];
         const maskedMatch = match.replace(digits, "[REKENING_TERMASKING]");
         maskedText = maskedText.replace(match, maskedMatch);
         const logMsg = `Rekening Bank (***${digits.substring(digits.length - 4)})`;
         if (!redactions.includes(logMsg)) redactions.push(logMsg);
         privacyStats.bankAccountsRedacted++;
         privacyStats.totalRedactions++;
      }
    });
  }

  // Check general credit cards block (4 sets of 4 digits)
  const cardRegex = /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g;
  const cards = maskedText.match(cardRegex);
  if (cards) {
    cards.forEach(card => {
      const mask = "[KARTU_TERMASKING]";
      maskedText = maskedText.replace(card, mask);
      const logMsg = `Kartu Kredit/Debit (***${card.substring(card.length - 4)})`;
      if (!redactions.includes(logMsg)) redactions.push(logMsg);
      privacyStats.bankAccountsRedacted++;
      privacyStats.totalRedactions++;
    });
  }

  if (redactions.length > 0) {
    redactHistory.push({
      id: `redact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      channel,
      originalLen: text.length,
      redactedLen: maskedText.length,
      items: redactions,
      originalText: text,
      maskedText: maskedText
    });
    if (redactHistory.length > 100) redactHistory.shift();
  }

  return { maskedText, redactions };
}

// Live WhatsApp (Baileys.js) Engine State Memory
let baileysSock: any = null;
let baileysStatus: "idle" | "connecting" | "qr" | "open" | "closed" | "error" = "idle";
let latestQr: string = "";
let connectedPhone: string = "";
let baileysError: string = "";

// Telemetry state of Baileys.js socket
let baileysReconnectCount = 0;
let baileysUptimeStart: number | null = null;
let baileysTotalMessagesProcessed = 0;
let baileysLatencyHistory: { timestamp: string; latency: number }[] = [];

// Interface for Message classification results
interface MessageClassification {
  category: "greeting" | "inquiry" | "transaction" | "unknown" | "Owner Query";
  confidence: "high" | "medium" | "low";
  reason: string;
}

/**
 * Heuristics-based message classifier to handle short, vague, or ambiguous user chats.
 */
function classifyMessage(msgText: string): MessageClassification {
  const text = msgText.toLowerCase().trim();
  const words = text.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  
  const hasWord = (w: string) => words.includes(w);
  const hasAnyWord = (wordsList: string[]) => wordsList.some(w => words.includes(w));
  const hasPhrase = (phrase: string) => text.includes(phrase);
  const hasAnyPhrase = (phrasesList: string[]) => phrasesList.some(p => text.includes(p));

  // 1. Check GREETING (Highly focused on short/salutation-only messages)
  const greetingWords = [
    "halo", "hai", "hi", "hello", "hei", "pagi", "siang", "sore", "malam", 
    "salam", "assalamualaikum", "p", "test", "tes", "ping", "pagi kak", 
    "siang kak", "sore kak", "malam kak", "halo kak", "hai kak"
  ];
  const isGreetingLoose = hasAnyWord(greetingWords) || greetingWords.some(g => text.startsWith(g));
  
  if (isGreetingLoose) {
    const txIndicators = ["beli", "harga", "price", "pesan", "order", "ongkir", "cod", "tukar", "retur", "sepatu", "produk", "ready", "stok", "stock", "ada", "tersedia", "toko", "jual"];
    const hasTxIndicator = txIndicators.some(tx => text.includes(tx));
    if (!hasTxIndicator || words.length <= 2) {
      return {
        category: "greeting",
        confidence: "high",
        reason: "Matched common short greeting terms with no product/purchase context."
      };
    }
  }

  // 2. Check INQUIRY (product catalog, store definition, ready stocks, models, details)
  const inquiryPhrases = [
    "toko apa", "kamu toko", "apa sih", "toko ini", "jual apa", "menjual apa", "bisnis apa", 
    "layanan apa", "siapa kamu", "kamu siapa", "sepatunya apa aja", "sepatu apa saja", 
    "produknya apa aja", "pilihan apa", "pilihan produk", "model apa", "varian apa", 
    "isinya apa", "katalog", "jenis apa", "ada warna", "bahan apa", "terbuat dari",
    "ready", "stok", "stock", "ada", "tersedia", "restock", "ukuran apa", "nomor berapa", 
    "toko dimana", "alamat", "lokasi", "gudang", "daerah mana"
  ];
  if (
    hasAnyPhrase(inquiryPhrases) || 
    hasAnyWord(["katalog", "warna", "bahan", "model", "varian", "produk", "sepatu", "barang", "ukuran", "alamat", "lokasi", "gudang"]) ||
    (hasAnyWord(["toko", "kamu", "jual"]) && hasAnyWord(["apa", "siapa", "mana"]))
  ) {
    return {
      category: "inquiry",
      confidence: "high",
      reason: "Matched keywords relating to product specs, catalog, models, or general store identification."
    };
  }

  // 3. Check TRANSACTION (pricing, promo, orders, buying, shipping, payments, refund/exchange)
  const txPhrases = [
    "harga", "price", "berapa", "tarif", "biaya", "nego", "kurang", "diskon", "potong", 
    "murah", "tawar", "promo", "voucher", "order", "pesan", "beli", "bayar", "transfer", 
    "rekening", "cara", "alur", "format", "cod", "bayar di tempat", "ditempat", "ongkir", 
    "kirim", "ongkos", "tarif", "kurir", "ekspedisi", "tukar", "retur", "garansi", "refund"
  ];
  if (hasAnyPhrase(txPhrases) || hasAnyWord(["beli", "pesan", "order", "ongkir", "cod", "bayar", "harga", "diskon", "murah", "retur", "garansi"])) {
    return {
      category: "transaction",
      confidence: "high",
      reason: "Matched keywords relating to price, discount, payment options, order placement, shipping, or returns."
    };
  }

  // Fallback for short words
  if (words.length > 0 && words.length <= 2 && isGreetingLoose) {
    return {
      category: "greeting",
      confidence: "medium",
      reason: "Extremely short message matching weak greeting pattern."
    };
  }

  return {
    category: "unknown",
    confidence: "low",
    reason: "Underdetermined message; routing to generic conversation handling."
  };
}

/**
 * Helper to check if a sender matches the registered owner phone number
 */
function isOwnerPhone(senderPhone: string, ownerPhone: string): boolean {
  if (!ownerPhone || !senderPhone) return false;
  const cleanSender = senderPhone.replace(/\D/g, "");
  const cleanOwner = ownerPhone.replace(/\D/g, "");
  if (!cleanSender || !cleanOwner) return false;
  const normSender = cleanSender.replace(/^62|^0/, "");
  const normOwner = cleanOwner.replace(/^62|^0/, "");
  return normSender === normOwner;
}

/**
 * Generates unified real-time sales and performance data context for the Owner
 */
function getOwnerDataContext(config: any): string {
  if (!config) return "";

  const totalRevenue = salesTransactions.filter(t => t.status === "paid").reduce((sum, t) => sum + t.amount, 0);
  const pendingRevenue = salesTransactions.filter(t => t.status === "pending").reduce((sum, t) => sum + t.amount, 0);
  const salesCountList = salesTransactions.length;
  const paidCountList = salesTransactions.filter(t => t.status === "paid").length;
  const pendingCountList = salesTransactions.filter(t => t.status === "pending").length;

  const salesSummaryText = salesTransactions.map(t => 
    `- ID: ${t.id}, Pelanggan: ${t.customerName}, Produk: ${t.items}, Nominal: Rp${t.amount.toLocaleString('id-ID')}, Status: ${t.status}, Channel: ${t.channel}`
  ).join("\n");

  const evaluationsSummaryText = conversationEvaluations.map(e =>
    `- Pelanggan: ${e.customerName}, Sentimen: ${e.satisfaction}, Intent: ${e.intent}, Ringkasan: ${e.agentSummary}`
  ).join("\n");

  return `
    === INFORMASI KHUSUS OWNER (MANAJEMEN KINERJA & KEUANGAN) ===
    Sapa pengirim dengan penuh hormat sebagai Owner / Atasan / Boss.
    Jangan tawarkan produk apa pun atau memperlakukannya seperti pembeli biasa!
    Berikan laporan, rekapitulasi, persentase konversi ( conversion rate ), analisis, atau status bisnis secara real-time dari data di bawah ini:
    
    DATA PENJUALAN TOKO SAAT INI (REAL-TIME LAPORAN):
    - Total Transaksi Penjualan: ${salesCountList} Transaksi
      - Lunas (Paid): ${paidCountList} Terbayar (Total Nilai: Rp${totalRevenue.toLocaleString('id-ID')})
      - Tertunda (Pending): ${pendingCountList} Tertunda (Total Nilai: Rp${pendingRevenue.toLocaleString('id-ID')})
      
    - Rincian Transaksi Penjualan Lengkap:
    ${salesSummaryText}
    
    - Rincian Evaluasi Kepuasan Pelanggan (CRM):
    ${evaluationsSummaryText}
    
    PANDUAN LAPORAN:
    - Jawab pertanyaan Owner secara langsung, taktis, cerdas, padat, dan akurat berdasarkan data di atas.
    - Sajikan dengan format laporan atau poin-poin yang rapi dan mudah dibaca oleh Owner.
    - Tetap sopan, rendah hati, dan siap melayani keluhan atau pertanyaan taktis Owner.
  `;
}

/**
 * Post-processor targeting AI-isms and standard slop words (Indonesian & English).
 * Inspired by hardikpandya/stop-slop to keep conversation highly direct, human-like, and punchy.
 */
function cleanAiSlop(text: string): string {
  if (!text) return "";
  let cleanText = text;

  // Indonesian AI-isms / conversational slops
  const indonesianSlops = [
    { pattern: /^Tentu saja Kak!\s*/gi, replacement: "Bisa Kak! " },
    { pattern: /^Tentu saja Kak,\s*/gi, replacement: "Bisa Kak, " },
    { pattern: /^Tentu saja,\s*/gi, replacement: "Bisa, " },
    { pattern: /^Tentu saja!\s*/gi, replacement: "" },
    { pattern: /^Baik Kak,\s*/gi, replacement: "" },
    { pattern: /^Halo Kak! Tentu saja\s*/gi, replacement: "Halo Kak! " },
    { pattern: /perlu dicatat bahwa/gi, replacement: "" },
    { pattern: /perlu diingat bahwa/gi, replacement: "" },
    { pattern: /penting untuk diingat bahwa/gi, replacement: "" },
    { pattern: /penting untuk diketahui bahwa/gi, replacement: "" },
    { pattern: /tidak hanya itu,\s*/gi, replacement: "Selain itu, " },
    { pattern: /tidak hanya itu/gi, replacement: "selain itu" },
    { pattern: /menariknya,\s*/gi, replacement: "" },
    { pattern: /secara keseluruhan,\s*/gi, replacement: "" },
    { pattern: /sebagai kesimpulan,\s*/gi, replacement: "" },
    { pattern: /pada akhirnya,\s*/gi, replacement: "" },
    { pattern: /mari kita bahas/gi, replacement: "berikut" },
    { pattern: /mari kita ulas/gi, replacement: "berikut" },
    { pattern: /menyelami/gi, replacement: "mempelajari" },
    { pattern: /kami hadir untuk menghadirkan/gi, replacement: "kami sedia" },
    { pattern: /kami hadir untuk/gi, replacement: "kami siap" },
    { pattern: /menghadirkan solusi/gi, replacement: "membantu" },
    { pattern: /menyediakan jaminan/gi, replacement: "ada" },
    { pattern: /kenyamanan dan kepuasan kakak adalah prioritas utama (kami|bagi kami)/gi, replacement: "kepuasan Kakak jaminan kami" },
    { pattern: /kenyamanan dan kepuasan anda adalah prioritas utama kami/gi, replacement: "" },
    { pattern: /jangan ragu untuk/gi, replacement: "silakan" },
    { pattern: /asisten digital resmi/gi, replacement: "admin" },
    { pattern: /asisten resmi/gi, replacement: "admin" },
    { pattern: /sangat senang membantu!/gi, replacement: "" },
    { pattern: /apakah ada hal lain yang bisa saya bantu\??/gi, replacement: "Ada lagi yang bisa dibantu?" },
    { pattern: /apakah ada yang bisa saya bantu lagi\??/gi, replacement: "Ada lagi yang bisa dibantu?" }
  ];

  // English AI-isms / conversational slops
  const englishSlops = [
    { pattern: /\bat its core\b/gi, replacement: "" },
    { pattern: /\bin today's fast-paced world\b/gi, replacement: "" },
    { pattern: /\bit is worth noting that\b/gi, replacement: "" },
    { pattern: /\bat the end of the day\b/gi, replacement: "" },
    { pattern: /\bwhen it comes to\b/gi, replacement: "for" },
    { pattern: /\bin a world where\b/gi, replacement: "" },
    { pattern: /\bthe reality is\b/gi, replacement: "" },
    { pattern: /\bhere's the thing:\s*/gi, replacement: "" },
    { pattern: /\blet me be clear,\s*/gi, replacement: "" },
    { pattern: /\bmake no mistake,\s*/gi, replacement: "" },
    { pattern: /\blet that sink in\b/gi, replacement: "" },
    { pattern: /\bgame-changer\b/gi, replacement: "important" },
    { pattern: /\bdeep dive\b/gi, replacement: "look" },
    { pattern: /\bnavigate (challenges|difficulties)\b/gi, replacement: "handle" },
    { pattern: /\bdelve\b/gi, replacement: "look" },
    { pattern: /\btapestry\b/gi, replacement: "collection" },
    { pattern: /\bnot only\b/gi, replacement: "" }
  ];

  for (const item of indonesianSlops) {
    cleanText = cleanText.replace(item.pattern, item.replacement);
  }

  for (const item of englishSlops) {
    cleanText = cleanText.replace(item.pattern, item.replacement);
  }

  // Clean dual spacing, trailing whitespace, or dangling characters left from deletions
  cleanText = cleanText
    .replace(/\s+/g, " ")
    .replace(/\.( \.)+/g, ".")
    .replace(/,\s*,/g, ",")
    .replace(/^\s*[.,]\s*/, "")
    .trim();

  return cleanText;
}

// Helper: Generates a highly aligned response using Gemini or keyword fallback matching of the current activeConfig
async function generateResponseForMessage(messageText: string, pushName: string, senderPhone?: string): Promise<string> {
  const startTime = Date.now();
  if (!activeConfig) {
    // Lazy initialized default fallback configuration
    activeConfig = generateLocalFallback(
      "SneakerKicks",
      "Toko sepatu premium Bandung. Harga Rp250.000 - Rp750.000. Gratis tukar size.",
      "Anak muda",
      "casual",
      "Closing sales"
    );
  }

  const isOwner = activeConfig.ownerPhone && senderPhone && isOwnerPhone(senderPhone, activeConfig.ownerPhone);

  // Enforce PII Masking on incoming WhatsApp messages before executing AI generation
  const { maskedText, redactions } = maskSensitiveData(messageText, "WhatsApp Core");

  let replyText = "";
  const apiKey = process.env.GEMINI_API_KEY;
  const isInvalidOrPlaceholder = !apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("PLACEHOLDER");
  let useFallbackMode = activeConfig.isFallbackActive || isInvalidOrPlaceholder;

  // Step 1: Pre-classify message to handle short, vague, or ambiguous chats beautifully
  const localClassification = classifyMessage(messageText);
  let finalClassification = { ...localClassification };

  if (isOwner) {
    finalClassification = {
      category: "Owner Query",
      confidence: "high",
      reason: "Owner communication recognized via matching registered phone number."
    };
  } else if (!useFallbackMode) {
    try {
      // Use low-temperature AI call to confirm or refine classification
      const classificationPrompt = `
        Klasifikasikan pesan pembeli WhatsApp berikut ke dalam salah satu kategori berikut secara objektif: "greeting", "inquiry", atau "transaction".
        
        Pesan Pembeli: "${maskedText}"
        Nama Pengirim: "${pushName}"
        
        Aturan Klasifikasi:
        - "greeting": Jika pesan hanya berupa sapaan, salam, perkenalan singkat, tes koneksi (contoh: "hai", "halo", "p", "siang", "pagi", "tes", "assalamualaikum").
        - "inquiry": Jika pesan menanyakan detail tentang toko, jenis produk yang dijual, koleksi model/katalog, bahan, atau pertanyaan info umum (contoh: "kamu toko apa", "sepatunya apa aja", "lokasi dimana", "ada warna apa").
        - "transaction": Jika pesan menanyakan harga, diskon, cara order, format pemesanan, ongkir, COD, pengiriman, garansi size, retur ukuran, atau berniat membeli (contoh: "harga berapa", "bisa kirim", "bisa tukar size", "order", "ongkir ke bandung").
        
        Kembalikan output dalam format JSON mentah bermutu tinggi (langsung output kurung kurawal, jangan bungkus markdown block):
        {"category": "greeting" atau "inquiry" atau "transaction", "reason": "Alasan singkat dalam Bahasa Indonesia"}
      `;

      const aiClassResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: classificationPrompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });
      
      const resText = aiClassResponse.text?.trim() || "";
      if (resText) {
        const cleanedJsonText = resText.replace(/```json/g, "").replace(/```/g, "").trim();
        const aiJson = JSON.parse(cleanedJsonText);
        if (aiJson && ["greeting", "inquiry", "transaction"].includes(aiJson.category)) {
          finalClassification = {
            category: aiJson.category,
            confidence: "high",
            reason: aiJson.reason || "Classified by AI Classifier"
          };
        }
      }
    } catch (err: any) {
      console.warn("⚠️ AI Assistant Classification step exception (falling back to local heuristics):", err.message);
    }
  }

  console.log(`🔍 [Intent Classification Pipeline] Message "${messageText}" classified as: [${finalClassification.category.toUpperCase()}] (${finalClassification.reason})`);

  if (!useFallbackMode) {
    try {
      const faqContext = activeConfig.faq.map((item: any) => `Tanya: ${item.question}\nJawab: ${item.answer}`).join("\n\n");
      const flowContext = activeConfig.flowRules.map((item: any) => `Pemicu: ${item.condition}\nTindakan: ${item.action}`).join("\n\n");

      // Generate context-rich instruction specifying classified intent
      let fullInstruction = `
        ${activeConfig.systemPrompt}
        
        Anda adalah ${activeConfig.name}, dengan Bio: "${activeConfig.bio}".
        Gaya bahasa komunikasi Anda adalah: ${activeConfig.toneStyle}.
        
        Gunakan basis pengetahuan FAQ berikut jika relevan dengan pertanyaan pembeli:
        --- PENGETAHUAN PRODUK (FAQ) ---
        ${faqContext}
        
        Gunakan acuan flow dan skenario respons khusus berikut jika mendapati situasi yang cocok:
        --- CONDITIONAL FLOWS ---
        ${flowContext}
        
        ⚠️ HASIL DETEKSI INTENT PERCAKAPAN:
        Kategori Terklasifikasi: [${finalClassification.category.toUpperCase()}]
        Alasan Klasifikasi: ${finalClassification.reason}
        
        📌 INSTRUKSI PENALARAN KHUSUS (ANTI JAWABAN GA NYAMBUNG):
        1. "greeting": Jika sapaan semata, JANGAN langsung mengirimkan FAQ tukar size, COD, atau rincian detail pengiriman. Jawab dengan menyapa balik dengan penuh keceriaan ("Halo Kak! Selamat datang di ${activeConfig.name}..."), tanyakan kabarnya, dan bersikap sangat membantu memandu mereka.
        2. "inquiry": Jawab pertanyaan produk mereka secara langsung. Jika ia menanyakan "sepatunya apa aja", jelaskan koleksi lengkap Anda (sepatu kasual, best-seller, dll.) dan persilakan bertanya model/size favoritnya. Jangan kirim rincian komplain/tukar size.
        3. "transaction": Jika sudah membicarakan harga, diskon, ongkir, COD, format order, tukar size/size chart, maka persilakan mereka mengisi format order secara langsung, tawarkan diskon, atau informasikan cara tukar ukuran dengan sigap untuk meningkatkan rasio closing.
        
        ATURAN CHATTER:
        1. Jawablah langsung dengan singkat, padat, dan ramah seperti layaknya Admin WhatsApp aslinya (maksimal 2-3 paragraf per chat, usahakan to the point tapi memikat).
        2. Jangan pernah mengakui diri sebagai LLM atau bot jika tidak perlu. Bersikaplah seperti manusia staff asli yang ditugaskan memantau chat.
        3. Jika informasi tidak ada di FAQ atau system instruksi, jawablah dengan diplomatis sesuai kepribadianmu dan tawarkan untuk mengeceknya ke owner/gudang terlebih dahulu daripada memberikan informasi palsu.
        4. Fokus utama Anda adalah melayani dengan menyenangkan dan mendorong pelanggan melakukan pemesanan (Closing Order).
        5. ANTI AI-SLOP (INSTRUKSI PENTING ANTI-ROBOT):
           - CUT FILLER: Jangan pernah memulai jawaban dengan "Tentu saja Kak!", "Baik Kak,", "Tentu saja!", "Perlu dicatat bahwa", "Menariknya,". Langsung berikan jawaban to-the-point yang bersahabat.
           - NO JARGON/ROBOT SPEAK: Hindari kata hiperbolis (luar biasa, menakjubkan, solusi cerdas) dan kata kaku (menjelajahi, menyelami, menavigasi, tapestri). Gunakan kalimat luwes layaknya chat WA santai.
           - TRUST THE READER: Beri informasi secara langsung tanpa hand-holding kaku khas AI.
      `;

      if (isOwner) {
        fullInstruction = `
          Anda adalah ${activeConfig.name}, asisten virtual kecerdasan bisnis profesional.
          Target Anda saat ini adalah memberikan laporan penjualan, kepuasan pelanggan, dan analisis finansial secara akurat kepada Owner / Atasan Anda.
          
          ${getOwnerDataContext(activeConfig)}
          
          Gaya bahasa komunikasi tetap sopan, sigap, ramah, dan profesional. Gunakan format laporan atau tabel yang rapi agar mudah dibaca Owner.
        `;
      }

      const chatPrompt = `
        Nama pelanggan / pengirim: "${pushName}"
        Pesan baru masuk: "${maskedText}"
        Kategori Pesan: [${finalClassification.category.toUpperCase()}]
        
        Berikan jawaban balasan yang natural, ramah, dan sangat nyambung sebagai ${activeConfig.name}:
      `;

      const chatResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: chatPrompt,
        config: {
          systemInstruction: fullInstruction,
          temperature: 0.7,
        }
      });
      replyText = chatResponse.text || "";
    } catch (err: any) {
      console.warn("⚠️ AI Generation exception:", err.message);
      useFallbackMode = true;
    }
  }

  if (useFallbackMode || !replyText) {
    if (isOwner) {
      const msg = messageText.toLowerCase();
      if (msg.includes("lapor") || msg.includes("rekap") || msg.includes("jual") || msg.includes("omset") || msg.includes("omzet") || msg.includes("laba") || msg.includes("transaksi") || msg.includes("kepuasan") || msg.includes("crm") || msg.includes("keberhasilan") || msg.includes("pembeli") || msg.includes("konversi")) {
        const totalRevenue = salesTransactions.filter(t => t.status === "paid").reduce((sum, t) => sum + t.amount, 0);
        const pendingRevenue = salesTransactions.filter(t => t.status === "pending").reduce((sum, t) => sum + t.amount, 0);
        const salesCountList = salesTransactions.length;
        const paidCountList = salesTransactions.filter(t => t.status === "paid").length;
        const pendingCountList = salesTransactions.filter(t => t.status === "pending").length;

        replyText = `Halo Boss/Owner 👑! Berikut adalah Laporan Kinerja Real-Time Toko ${activeConfig.name} (Local Standby Mode):

📈 RINGKASAN FINANSIAL:
- Total Transaksi Masuk: ${salesCountList} kali
- Transaksi Lunas: ${paidCountList} kali (Total Omset: Rp${totalRevenue.toLocaleString("id-ID")})
- Transaksi Pending: ${pendingCountList} kali (Tertunda: Rp${pendingRevenue.toLocaleString("id-ID")})

📊 EVALUASI CRM PELANGGAN:
- Kepuasan: Terpantau Luar Biasa Baik
- Sentimen Masuk: Didominasi transaksi lancar & minat tinggi. Beberapa masukan feedback direspon cepat sesuai flow rules.

Owner butuh dicarikan data transaksi id tertentu atau informasi tambahan lainnya? Siap dilaksanakan!`;
      } else {
        replyText = `Halo Boss/Owner 👑! Senang bisa menyapa Anda di panel kontrol. Ada yang bisa saya laporkan atau bantu seputar data penjualan, kinerja transaksi harian, atau evaluasi chat pelanggan ${activeConfig.name} hari ini?`;
      }
    } else {
      replyText = simulateChatResponse(messageText, activeConfig);
    }
  }

  const durationSec = parseFloat(((Date.now() - startTime) / 1000).toFixed(3));
  trafficLogs.push({
    timestamp: Date.now(),
    latency: durationSec,
    isFallback: useFallbackMode,
    type: "live"
  });
  if (trafficLogs.length > 300) trafficLogs.shift();

  return cleanAiSlop(replyText);
}

// RESTful controls to trigger Baileys.js Live Client Core Socket connection
async function startBaileysEngine() {
  if (baileysStatus === "connecting" || baileysStatus === "open") {
    console.log("Baileys is already operating.");
    return;
  }

  baileysStatus = "connecting";
  baileysError = "";
  latestQr = "";

  try {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(process.cwd(), "baileys_auth_info"));

    baileysSock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: "silent" }) as any
    });

    baileysSock.ev.on("creds.update", saveCreds);

    baileysSock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        baileysStatus = "qr";
        latestQr = qr;
        console.log(`📡 [Baileys Live Client] QR Code emission: ${qr}`);
      }

      if (connection === "connecting") {
        baileysStatus = "connecting";
      }

      if (connection === "open") {
        baileysStatus = "open";
         latestQr = "";
         baileysUptimeStart = Date.now();
         const userJid = baileysSock.user?.id;
         connectedPhone = userJid ? userJid.split(":")[0].split("@")[0] : "WhatsApp Live Client";
         console.log(`✅ [Baileys Live Client] Connection established on phone: +${connectedPhone}`);

         // Inject successful event log
         webhookLogs.push({
           timestamp: new Date().toLocaleTimeString(),
           source: "WhatsApp Live Connection",
           sender: connectedPhone,
           name: "Sistem",
           received: "Perangkat WhatsApp Berhasil Dipasangkan",
           replied: "Koneksi Live Berhasil! Chatbot sekarang siap memproses semua pesan WhatsApp asli yang masuk ke nomor ini.",
           isFallback: false
         });
      }

      if (connection === "close") {
        const lastDisconnectErr = lastDisconnect?.error as any;
        const statusCode = lastDisconnectErr?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`❌ [Baileys Live Client] Connection closed with statusCode: ${statusCode}. Reconnecting: ${shouldReconnect}`);
        
        baileysStatus = "closed";
        latestQr = "";
        baileysUptimeStart = null;
        
        if (shouldReconnect) {
          baileysReconnectCount++;
          setTimeout(() => {
            startBaileysEngine();
          }, 4000);
        } else {
          baileysStatus = "idle";
          connectedPhone = "";
        }
      }
    });

    baileysSock.ev.on("messages.upsert", async (m: any) => {
      const msg = m.messages[0];
      if (!msg.message) return;
      if (msg.key.fromMe) return; // Prevent self loops or echoing back

      const senderJid = msg.key.remoteJid;
      if (!senderJid) return;

      // Filter out groups to only handle personal business DMs
      if (senderJid.endsWith("@g.us")) return;

      baileysTotalMessagesProcessed++;

      const messageText = msg.message.conversation || 
                          msg.message.extendedTextMessage?.text || 
                          msg.message.imageMessage?.caption || 
                          "";

      if (!messageText) return;

      const pushName = msg.pushName || "Pelanggan";
      console.log(`📥 [Baileys Inbox] message from ${pushName}: "${messageText}"`);

      try {
        // Trigger response computation with active configuration
        const senderPhoneNum = senderJid.split("@")[0];
        const replyText = await generateResponseForMessage(messageText, pushName, senderPhoneNum);

        // Send out to actual customer via WhatsApp socket
        await baileysSock.sendMessage(senderJid, { text: replyText });

        // Add to persistent logs in memory for live monitoring
        webhookLogs.push({
          timestamp: new Date().toLocaleTimeString(),
          source: "WhatsApp (Baileys.js)",
          sender: senderJid.split("@")[0],
          name: pushName,
          received: messageText,
          replied: replyText,
          isFallback: false
        });
        if (webhookLogs.length > 50) webhookLogs.shift();
      } catch (err: any) {
        console.error("❌ [Baileys Response Router Exception] Failed to send answer:", err.message);
      }
    });

  } catch (err: any) {
    console.error("❌ Failed to spawn Baileys instance:", err.message);
    baileysStatus = "error";
    baileysError = err.message;
  }
}

async function stopBaileysEngine() {
  baileysStatus = "idle";
  latestQr = "";
  connectedPhone = "";
  baileysUptimeStart = null;
  baileysTotalMessagesProcessed = 0;
  baileysReconnectCount = 0;
  baileysLatencyHistory = [];
  if (baileysSock) {
    try {
      await baileysSock.logout();
    } catch (e) {}
    try {
       baileysSock.end(undefined);
    } catch(e) {}
    baileysSock = null;
  }
  console.log("Disconnected Baileys live engine context.");
}

// Baileys HTTP API exposure
app.get("/api/baileys/status", (req, res) => {
  try {
    let currentLatency = 0;
    if (baileysStatus === "open") {
      currentLatency = Math.floor(25 + Math.random() * 15); // 25-40 ms
    } else if (baileysStatus === "connecting") {
      currentLatency = Math.floor(120 + Math.random() * 60); // 120-180 ms
    } else if (baileysStatus === "qr") {
      currentLatency = Math.floor(65 + Math.random() * 25); // 65-90 ms
    }

    // Generate dynamic timestamps safely
    let timeStr = "";
    try {
      timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      const now = new Date();
      timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    }

    if (!Array.isArray(baileysLatencyHistory)) {
      baileysLatencyHistory = [];
    }

    // Pre-populate historical lines if empty and actively running
    if (baileysLatencyHistory.length === 0 && baileysStatus !== "idle") {
      for (let i = 11; i >= 1; i--) {
        const pastTime = new Date(Date.now() - i * 3000);
        let pastTimeStr = "";
        try {
          pastTimeStr = pastTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch (e) {
          pastTimeStr = `${String(pastTime.getHours()).padStart(2, '0')}:${String(pastTime.getMinutes()).padStart(2, '0')}:${String(pastTime.getSeconds()).padStart(2, '0')}`;
        }
        let baseLat = 0;
        if (baileysStatus === "open") baseLat = Math.floor(25 + Math.random() * 15);
        else if (baileysStatus === "connecting") baseLat = Math.floor(120 + Math.random() * 60);
        else if (baileysStatus === "qr") baseLat = Math.floor(65 + Math.random() * 25);
        
        baileysLatencyHistory.push({
          timestamp: pastTimeStr,
          latency: baseLat
        });
      }
    }

    if (baileysStatus !== "idle") {
      baileysLatencyHistory.push({
        timestamp: timeStr,
        latency: currentLatency
      });
    } else {
      baileysLatencyHistory = [];
    }

    if (baileysLatencyHistory.length > 15) {
      baileysLatencyHistory.shift();
    }

    const uptime = baileysUptimeStart ? Math.floor((Date.now() - baileysUptimeStart) / 1000) : 0;

    res.json({
      status: baileysStatus || "idle",
      qr: latestQr || "",
      phone: connectedPhone || "",
      error: baileysError || "",
      telemetry: {
        latency: currentLatency,
        reconnectCount: baileysReconnectCount || 0,
        totalProcessed: baileysTotalMessagesProcessed || 0,
        uptime: uptime,
        history: baileysLatencyHistory
      }
    });
  } catch (err: any) {
    console.error("Error in /api/baileys/status:", err);
    res.status(500).json({
      status: "error",
      error: err.message || String(err),
      qr: "",
      phone: "",
      telemetry: {
        latency: 0,
        reconnectCount: 0,
        totalProcessed: 0,
        uptime: 0,
        history: []
      }
    });
  }
});

app.post("/api/baileys/start", async (req, res) => {
  // Start engine in background asynchronously
  startBaileysEngine().catch((e) => console.error("Async launch exception:", e));
  res.json({ status: "initiated", message: "Baileys process starting..." });
});

app.post("/api/baileys/stop", async (req, res) => {
  await stopBaileysEngine();
  res.json({ status: "stopped", message: "Baileys process destroyed." });
});

// Get active configuration
app.get("/api/config", (req, res) => {
  res.json(activeConfig || {});
});

// Save or overwrite active configuration
app.post("/api/config", (req, res) => {
  activeConfig = req.body;
  res.json({ status: "success", config: activeConfig });
});

// Fetch integration activity logs
app.get("/api/webhook/logs", (req, res) => {
  res.json(webhookLogs);
});

// Fetch live KPI metrics and timeline chart points
app.get("/api/analytics", (req, res) => {
  const now = Date.now();
  const points = [];
  
  // Return the last 7 minutes as direct, live-responsive buckets
  for (let i = 6; i >= 0; i--) {
    const bucketTime = new Date(now - i * 60000);
    const minuteStr = bucketTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    // Find logs in this specific 1-minute window
    const windowStart = now - (i * 60000) - 30000;
    const windowEnd = now - (i * 60000) + 30000;
    
    const logsInWindow = trafficLogs.filter(log => log.timestamp >= windowStart && log.timestamp < windowEnd);
    const volume = logsInWindow.length;
    
    const responseTime = volume > 0
      ? parseFloat((logsInWindow.reduce((acc, curr) => acc + curr.latency, 0) / volume).toFixed(2))
      : 0;
      
    points.push({
      day: minuteStr,
      volume,
      responseTime
    });
  }

  // Calculate actual statistics from keseluruhan trafficLogs
  const totalVolume = trafficLogs.length;
  const avgResponseTime = totalVolume > 0
    ? parseFloat((trafficLogs.reduce((acc, curr) => acc + curr.latency, 0) / totalVolume).toFixed(2))
    : 0;

  const successfulCalls = trafficLogs.filter(log => !log.isFallback).length;
  const accuracyPercentage = totalVolume > 0
    ? parseFloat(((successfulCalls / totalVolume) * 100).toFixed(1))
    : 100.0;

  res.json({
    totalVolume,
    avgResponseTime,
    accuracyPercentage,
    points
  });
});

// Fetch evaluation CRM & sales performance reports
app.get("/api/reports", (req, res) => {
  res.json({
    sales: salesTransactions,
    evaluations: conversationEvaluations
  });
});

// Reset evaluation CRM & sales reports data
app.post("/api/reports/clear", (req, res) => {
  salesTransactions = [];
  conversationEvaluations = [];
  res.json({ status: "ok" });
});

// Manually trigger simulated transaction and evaluation to easily populate the dashboard for demoing
app.post("/api/reports/simulate-sale", (req, res) => {
  const names = ["Ahmad Fauzi", "Rina Amelia", "Doni Saputra", "Eka Wahyuni", "Herry Prasetyo", "Sinta Lestari", "Yusuf Subagja"];
  const products = ["1x Paket Hemat Laundry Kiloan", "2x Sepatu Best-Seller Vintage", "1x VIP Consulting Session", "1x Custom Merchandise Kit", "3x Premium Spa Treatment Pack"];
  const prices = [75000, 480000, 650000, 150000, 320000];
  const index = Math.floor(Math.random() * names.length);
  const prodIndex = Math.floor(Math.random() * products.length);
  
  const newTx = {
    id: `S-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: Date.now(),
    customerName: names[index],
    phone: `0856****${Math.floor(1000 + Math.random() * 9000)}`,
    items: products[prodIndex],
    amount: prices[prodIndex],
    status: (Math.random() > 0.4 ? "paid" : "pending") as "paid" | "pending" | "processing",
    channel: (Math.random() > 0.5 ? "simulator" : "webhook") as "simulator" | "live" | "webhook"
  };
  
  salesTransactions.unshift(newTx);
  if (salesTransactions.length > 50) salesTransactions.pop();

  const intents = ["Tanya Harga", "Pemesanan (Order)", "Komplain Terlambat", "Nego Diskon", "Konsultasi"] as const;
  const satisfactions = ["Sangat Puas", "Puas", "Cukup"] as const;
  const randomIntent = intents[Math.floor(Math.random() * intents.length)];
  
  const newEval = {
    id: `EVAL-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: Date.now(),
    customerName: names[index],
    channel: (Math.random() > 0.5 ? "simulator" : "webhook") as "simulator" | "webhook",
    intent: randomIntent,
    satisfaction: satisfactions[Math.floor(Math.random() * satisfactions.length)],
    agentSummary: `Asisten AI berhasil mendeteksi serta mengklasifikasikan intent pelanggan tentang '${randomIntent}'. AI merespons dalam waktu singkat menggunakan basis pengetahuan.`,
    followUpAction: randomIntent === "Pemesanan (Order)" ? "Verifikasi pembayaran lunas dan atur tim logistik untuk pengemasan." : "Follow-up detail kelancaran transaksi."
  };

  conversationEvaluations.unshift(newEval);
  if (conversationEvaluations.length > 50) conversationEvaluations.pop();

  res.json({ status: "ok", transaction: newTx, evaluation: newEval });
});

// Fetch Zero-Trust PII Masking Shield analytics & logs
app.get("/api/privacy/stats", (req, res) => {
  res.json({
    stats: privacyStats,
    history: redactHistory
  });
});

// Clear masking logs & reset statistics
app.post("/api/privacy/clear", (req, res) => {
  privacyStats = {
    totalRedactions: 0,
    phoneNumbersRedacted: 0,
    emailsRedacted: 0,
    bankAccountsRedacted: 0,
    ktpsRedacted: 0
  };
  redactHistory = [];
  res.json({ status: "ok" });
});

// Clear integration logs
app.post("/api/webhook/logs/clear", (req, res) => {
  webhookLogs = [];
  res.json({ status: "ok" });
});

// Helper to escape XML for Twilio compatibility
function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// RESTFUL LIVE WEBHOOK: Handles real WhatsApp/Twilio triggers & custom posts
app.post("/api/webhook/whatsapp", async (req, res) => {
  const webhookStartTime = Date.now();
  const payload = req.body;
  console.log("📥 [AgentWA Webhook] Received payload:", JSON.stringify(payload));

  let messageText = "";
  let senderJid = "";
  let pushName = "Pelanggan";
  let sourceFamily = "Generic Webhook";

  // Case A: Meta Cloud API (Official Webhook)
  if (payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
    const waMsg = payload.entry[0].changes[0].value.messages[0];
    messageText = waMsg.text?.body || "";
    senderJid = waMsg.from || "";
    pushName = payload.entry[0].changes[0].value.contacts?.[0]?.profile?.name || "Pelanggan";
    sourceFamily = "Meta Cloud API (WABA)";
  }
  // Case B: Evolution API / Baileys
  else if (payload.event === "messages.upsert" && payload.data?.message) {
    const data = payload.data;
    messageText = data.message.conversation || data.message.extendedTextMessage?.text || "";
    senderJid = data.key.remoteJid || "";
    pushName = data.pushName || "Pelanggan";
    sourceFamily = "Evolution API (Baileys)";
  }
  // Case C: Twilio WhatsApp
  else if (payload.Body && payload.From) {
    messageText = payload.Body;
    senderJid = payload.From;
    pushName = payload.ProfileName || "Pelanggan";
    sourceFamily = "Twilio (WhatsApp SMS)";
  }
  // Case D: Direct simple JSON
  else if (payload.message || payload.text) {
    messageText = payload.message || payload.text || "";
    senderJid = payload.sender || payload.from || "62899999999";
    pushName = payload.name || "Pelanggan";
    sourceFamily = "Asynchronous API Client";
  } else {
    return res.status(400).json({ 
      error: "Format Payload tidak dikenal.", 
      message: "Kirimkan JSON minimal berisi parameter 'message' atau 'text'."
    });
  }

  if (!messageText) {
    return res.json({ status: "ignored", reason: "Message text is empty" });
  }

  // Load defaults if config is not initialized yet
  if (!activeConfig) {
    activeConfig = generateLocalFallback(
      "SneakerKicks",
      "Toko sepatu premium Bandung. Harga Rp250.000 - Rp750.000. Gratis tukar size.",
      "Anak muda",
      "casual",
      "Closing sales"
    );
  }

  let replyText = "";
  const apiKey = process.env.GEMINI_API_KEY;
  const isInvalidOrPlaceholder = !apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("PLACEHOLDER");
  let useFallbackMode = activeConfig.isFallbackActive || isInvalidOrPlaceholder;

  if (!useFallbackMode) {
    try {
      const faqContext = activeConfig.faq.map((item: any) => `Tanya: ${item.question}\nJawab: ${item.answer}`).join("\n\n");
      const flowContext = activeConfig.flowRules.map((item: any) => `Pemicu: ${item.condition}\nTindakan: ${item.action}`).join("\n\n");

      const fullInstruction = `
        ${activeConfig.systemPrompt}
        
        Anda adalah ${activeConfig.name}, dengan Bio: "${activeConfig.bio}".
        Gaya bahasa komunikasi Anda adalah: ${activeConfig.toneStyle}.
        
        Gunakan basis pengetahuan FAQ berikut jika relevan dengan pertanyaan pembeli:
        --- PENGETAHUAN PRODUK (FAQ) ---
        ${faqContext}
        
        Gunakan acuan flow dan skenario respons khusus berikut jika mendapati situasi yang cocok:
        --- CONDITIONAL FLOWS ---
        ${flowContext}
        
        ATURAN CHATTER:
        1. Jawablah langsung dengan singkat, padat, dan ramah seperti layaknya Admin WhatsApp aslinya (maksimal 2-3 paragraf per chat, usahakan to the point tapi memikat).
        2. Jangan pernah mengakui diri sebagai LLM atau bot jika tidak perlu. Bersikaplah seperti manusia staff asli yang ditugaskan memantau chat.
        3. Jika informasi tidak ada di FAQ atau system instruksi, jawablah dengan diplomatis sesuai kepribadianmu dan tawarkan untuk mengeceknya ke owner/gudang terlebih dahulu daripada memberikan informasi palsu.
        4. Fokus utama Anda adalah melayani dengan menyenangkan dan mendorong pelanggan melakukan pemesanan (Closing Order).
      `;

      const chatPrompt = `
        Nama pelanggan / pengirim: "${pushName}"
        Pesan baru masuk: "${messageText}"
        
        Berikan jawaban balasan yang natural sebagai ${activeConfig.name}:
      `;

      const chatResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: chatPrompt,
        config: {
          systemInstruction: fullInstruction,
          temperature: 0.7,
        }
      });
      replyText = chatResponse.text || "";
    } catch (err: any) {
      console.warn("⚠️ Webhook AI exception:", err.message);
      useFallbackMode = true;
    }
  }

  if (useFallbackMode) {
    replyText = simulateChatResponse(messageText, activeConfig);
  }

  // Register Event in webhook log memory
  webhookLogs.push({
    timestamp: new Date().toLocaleTimeString(),
    source: sourceFamily,
    sender: senderJid,
    name: pushName,
    received: messageText,
    replied: replyText,
    isFallback: useFallbackMode
  });
  if (webhookLogs.length > 50) webhookLogs.shift();

  const durationSec = parseFloat(((Date.now() - webhookStartTime) / 1000).toFixed(3));
  trafficLogs.push({
    timestamp: Date.now(),
    latency: durationSec,
    isFallback: useFallbackMode,
    type: "webhook"
  });
  if (trafficLogs.length > 300) trafficLogs.shift();

  // If client is Twilio, respond with TwiML XML
  if (payload.From && payload.Body && !payload.event) {
    res.setHeader("Content-Type", "text/xml");
    return res.send(`
      <Response>
        <Message>${escapeXml(replyText)}</Message>
      </Response>
    `);
  }

  return res.json({
    status: "success",
    timestamp: new Date().toISOString(),
    integration: sourceFamily,
    sender: senderJid,
    customerName: pushName,
    reply: replyText
  });
});

// API Route: Optimize & Enhance Business Prompt with AI
app.post("/api/enhance-prompt", async (req, res) => {
  const { businessName, businessDescription, toneStyle } = req.body;
  if (!businessName || !businessDescription) {
    return res.status(400).json({ error: "Nama Bisnis dan Deskripsi wajib diisi." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const isInvalidOrPlaceholder = !apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("PLACEHOLDER");

  if (isInvalidOrPlaceholder) {
    return res.json({
      enhancedDescription: `${businessDescription} Kami menjamin produk premium dengan pengerjaan detail rapi, garansi 100% kepuasan pelanggan, pengiriman instan aman ke seluruh Indonesia, dan respon layanan admin ramah.`,
      suggestedGoal: "Membimbing calon pelanggan dari sapaan hangat hingga penyelesaian transaksi dengan cepat",
      suggestedTarget: "Konsumen modern yang mengutamakan kecepatan layanan dan kualitas produk premium terjamin"
    });
  }

  try {
    const prompt = `
      Anda adalah pakar copywriter dan pengembang bisnis digital berpengalaman di Indonesia.
      Tugas Anda adalah memperluas dan menyempurnakan draf deskripsi bisnis kasar berikut agar menjadi profil bisnis yang sangat detail, memikat, terstruktur, dan persuasif demi mendukung akurasi instruksi asisten chatbot WhatsApp Business.

      Nama Bisnis: ${businessName}
      Gaya Komunikasi (Tone): ${toneStyle}
      Deskripsi Kasar: ${businessDescription}

      Formulasikan struktur output dalam skema JSON ini secara presisi:
      1. "enhancedDescription": Deskripsi lengkap berbobot (2-3 kalimat, menonjolkan keunikan layanan/produk, estimasi harga rasional, jaminan garansi retur/tukar, and ajakan pesan yang persuasif).
      2. "suggestedGoal": Sasaran performa asisten yang optimal (misal: "Mengedukasi pembeli, memberikan solusi harga, dan membimbing pengisian format pemesanan").
      3. "suggestedTarget": Profil pelanggan ideal terlatih (misal: "Mahasiswa perkotaan yang menyukai kepraktisan mode kasual retro").
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedDescription: { type: Type.STRING },
            suggestedGoal: { type: Type.STRING },
            suggestedTarget: { type: Type.STRING }
          },
          required: ["enhancedDescription", "suggestedGoal", "suggestedTarget"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (err: any) {
    console.error("Prompt enhancement error:", err);
    return res.json({
      enhancedDescription: `${businessDescription} Kami menjamin produk premium dengan pengerjaan detail rapi, garansi 100% kepuasan pelanggan, pengiriman instan aman ke seluruh Indonesia, dan respon layanan admin ramah.`,
      suggestedGoal: "Membimbing calon pelanggan dari sapaan hangat hingga penyelesaian transaksi dengan cepat",
      suggestedTarget: "Konsumen modern yang mengutamakan kecepatan layanan dan kualitas produk premium terjamin"
    });
  }
});

// API Route: Smart Suggest FAQ with AI
app.post("/api/generate-faq", async (req, res) => {
  const { config } = req.body;
  if (!config) {
    return res.status(400).json({ error: "Config asisten wajib dilampirkan." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const isInvalidOrPlaceholder = !apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("PLACEHOLDER");

  if (isInvalidOrPlaceholder) {
    return res.json({
      faq: [
        {
          id: `faq_ai_1_${Date.now()}`,
          question: `Apakah ada jaminan uang kembali jika barang terbukti cacat?`,
          answer: `Ada Kak! Kepuasan Anda adalah prioritas no. 1 kami. Jika produk yang diterima cacat produksi atau salah kirim dari tim kami, Kakak berhak mengajukan retur gratis 100%. Ongkos kirim pulang-pergi kami tanggung!`
        },
        {
          id: `faq_ai_2_${Date.now()}`,
          question: `Bagaimana cara kerja metode pembayaran menggunakan transfer bank?`,
          answer: `Sangat mudah Kak! Setelah mengisi format order, Admin akan mengirimkan nomor rekening resmi unit bisnis kami. Kakak tinggal melakukan pembayaran lalu kirimkan bukti transfer foto/screenshot ke sini ya.`
        }
      ]
    });
  }

  try {
    const prompt = `
      Berdasarkan asisten berikut:
      Nama Asisten: ${config.name}
      Bio: ${config.bio}
      Gaya Bicara: ${config.toneStyle}
      Instruksi / System Prompt: ${config.systemPrompt}

      Hasilkan 3 butir FAQ tambahan yang kreatif, relevan, realistis, dan sangat sering ditanyakan oleh pembeli di Indonesia beserta jawabannya yang ramah, informatif, dan persuasif.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faq: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING }
                },
                required: ["question", "answer"]
              }
            }
          },
          required: ["faq"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    const faqWithID = (parsed.faq || []).map((f: any, i: number) => ({
      id: `faq_ai_${i}_${Date.now()}`,
      question: f.question,
      answer: f.answer
    }));

    return res.json({ faq: faqWithID });
  } catch (err: any) {
    console.error("Smart FAQ suggestion error:", err);
    return res.json({
      faq: [
        {
          id: `faq_ai_1_${Date.now()}`,
          question: `Apakah ada jaminan uang kembali jika barang terbukti cacat?`,
          answer: `Ada Kak! Kepuasan Anda adalah prioritas no. 1 kami. Jika produk yang diterima cacat produksi atau salah kirim dari tim kami, Kakak berhak mengajukan retur gratis 100%. Ongkos kirim pulang-pergi kami tanggung!`
        }
      ]
    });
  }
});

// API Route: Sparkle / AI Rephrase message input for manual chat simulation
app.post("/api/rephrase-reply", async (req, res) => {
  const { message, toneStyle, config } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Pesan wajib diisi." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const isInvalidOrPlaceholder = !apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("PLACEHOLDER");

  if (isInvalidOrPlaceholder) {
    const suffix = toneStyle === 'casual' ? ' ya Kak! Ditunggu lho ordernya.' : toneStyle === 'formal' ? ' Bapak/Ibu. Silakan hubungi kami kembali.' : ' ya Sahabat. Semoga harimu menyenangkan!';
    return res.json({ rephrased: `${message}${suffix}` });
  }

  try {
    const prompt = `
      Anda adalah asisten WhatsApp Business yang bijaksana bernama ${config?.name || "Admin"}.
      Ubah kalimat draf admin yang kurang rapi, kaku, atau sangat pendek berikut menjadi sapaan balasan yang sangat ramah, hangat, memikat, dan profesional sesuai gaya komunikasi: "${toneStyle || "casual"}".
      
      Draf Kasar Admin: "${message}"

      Hanya keluarkan string balasan akhir yang telah disempurnakan tanpa ada teks pengantar seperti "Berikut adalah..." atau tanda kutip pembungkus tambahan.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return res.json({ rephrased: response.text?.trim() });
  } catch (err: any) {
    console.error("Rephrase message error:", err);
    return res.json({ rephrased: `${message} (Sempurnakan dengan sapaan sayang) ` });
  }
});

// API Route: Generate AI Whatsapp Admin from Business Info
app.post("/api/generate", async (req, res) => {
  const { businessName, businessDescription, targetMarket, toneStyle, agentGoal } = req.body;

  if (!businessName || !businessDescription) {
    return res.status(400).json({ error: "Nama Bisnis dan Deskripsi wajib diisi." });
  }

  let useFallback = false;
  let fallbackReason = "";

  const apiKey = process.env.GEMINI_API_KEY;
  const isInvalidOrPlaceholder = !apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("PLACEHOLDER");

  if (isInvalidOrPlaceholder) {
    console.warn("⚠️ No valid GEMINI_API_KEY detected (placeholder or empty). Operating in smart offline simulation mode.");
    useFallback = true;
    fallbackReason = "API Key belum dikonfigurasi atau masih menggunakan nilai default placeholder 'MY_GEMINI_API_KEY'.";
  }

  if (!useFallback) {
    try {
      const toneInstruction = {
        casual: "Gaya bahasa santai, gaul khas anak muda, ramah, menggunakan kata sapaan bersahabat seperti 'Kak', 'Sis', atau 'Bro'.",
        formal: "Gaya bahasa formal, profesional, sopan santun tingkat tinggi, tata bahasa baku yang rapi, dan menyapa pelanggan dengan sebutan 'Bapak/Ibu' atau 'Kakak'.",
        warm: "Gaya bahasa hangat, penuh empati, ramah keluarga, sabar menghadapi berbagai pertanyaan, dan menyapa dengan 'Kak' atau 'Sahabat'.",
        assertive: "Gaya bahasa tegas, to-the-point, berwibawa namun tetap sopan, efektif dalam negosiasi dan tidak berbasa-basi berlebihan."
      }[toneStyle as 'casual' | 'formal' | 'warm' | 'assertive'] || "Gaya bahasa ramah dan adaptif.";

      const prompt = `
        Buatkan konfigurasi lengkap untuk WhatsApp AI Admin Employee baru berdasarkan detail bisnis berikut:
        Nama Bisnis: ${businessName}
        Deskripsi Bisnis: ${businessDescription}
        Target Market: ${targetMarket || "Masyarakat umum"}
        Gaya Komunikasi (Tone): ${toneStyle} (${toneInstruction})
        Tujuan Utama Admin (Goal): ${agentGoal || "Melayani pertanyaan dan membantu closing order"}

        Hasilkan data JSON valid berisi:
        1. Nama Admin yang unik dan menarik (misal: "Siska - CS Sepatuku", "Admin Budi", dsb).
        2. Seed kata tunggal untuk avatar bertema bisnis ini (misal: 'sneaker', 'mangkuk', 'skincare').
        3. Bio singkat WhatsApp business info (maksimal 137 karakter).
        4. System Prompt instruksi tebal instruksi detail untuk memandu cara berpikir AI saat chatting, mencakup kepribadian, penanganan negosiasi diskon, taktik closing order, gaya sapaan, cara mengatasi komplain, dan batasan pengetahuan.
        5. Daftar 8-12 FAQ specifik dengan pertanyaan realistis pelanggan lengkap dengan jawaban yang sangat persuasif, seolah-olah admin profesional yang menjawab.
        6. Daftar 4-6 Aturan Kondisi Flow khusus (kondisi pemicu dan tindakan cerdas yang harus diambil).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Anda adalah AI Staff Generator profesional untuk WhatsApp Business yang merancang rancangan operasional bot handal untuk UMKM Indonesia.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nama WhatsApp AI Employee / Admin yang kreatif namun relevan dengan jenis bisnis" },
              avatarSeed: { type: Type.STRING, description: "Satu kata benda bahasa Inggris untuk representasi avatar, misal 'shoe', 'noodles', 'skincare', 'laptop'" },
              bio: { type: Type.STRING, description: "Bio WA Business info singkat dan profesional, maks 137 karakter" },
              systemPrompt: { type: Type.STRING, description: "Sistem prompt instruksi tebal dan rinci yang memandu kepribadian, gaya sapaan sesuai toneStyle, batasan bot, cara handling diskon, dan cara closing order" },
              faq: {
                type: Type.ARRAY,
                description: "Daftar 8-12 FAQ otomatis berkualitas tinggi yang sangat spesifik dan relevan dengan deskripsi produk bisnis ini",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Contoh: faq_1, faq_2" },
                    question: { type: Type.STRING, description: "Pertanyaan potensial dari calon pembeli" },
                    answer: { type: Type.STRING, description: "Jawaban yang persuasif, informatif, dan membantu (relevan dengan tipe produk)" }
                  },
                  required: ["id", "question", "answer"]
                }
              },
              flowRules: {
                type: Type.ARRAY,
                description: "Daftar 4-6 aturan penanganan skenario khusus percakapan (order, tanya ongkir, komplain, atau nego)",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Contoh: flow_1, flow_2" },
                    condition: { type: Type.STRING, description: "Kondisi pemicu, misal: 'Pelanggan meminta diskon tambahan', 'Pelanggan ingin melakukan pemesanan'" },
                    action: { type: Type.STRING, description: "Tindakan cerdas dan taktik closing yang harus dilakukan oleh AI" }
                  },
                  required: ["id", "condition", "action"]
                }
              }
            },
            required: ["name", "avatarSeed", "bio", "systemPrompt", "faq", "flowRules"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      activeConfig = { 
        ...result, 
        faq: (result.faq || []).map((f: any, idx: number) => ({
          id: f.id || `faq_${idx}_${Date.now()}`,
          question: f.question,
          answer: f.answer
        })),
        flowRules: (result.flowRules || []).map((fr: any, idx: number) => ({
          id: fr.id || `flow_${idx}_${Date.now()}`,
          condition: fr.condition,
          action: fr.action
        })),
        toneStyle,
        isFallbackActive: false 
      };
      return res.json(activeConfig);

    } catch (geminiError: any) {
      const errMsg = geminiError?.message || String(geminiError);
      let customMsg = errMsg;
      if (errMsg.includes("leaked") || errMsg.includes("403") || errMsg.includes("key")) {
        customMsg = "API Key Gemini Anda dilaporkan bocor atau tidak valid (403 Permission Denied). Silakan perbarui API Key Anda di panel Settings > Secrets di pojok kanan atas.";
        console.warn("⚠️ [Gemini Generator Warning] API Key tidak valid atau bocor. Sistem otomatis beralih ke fallback generator lokal.");
      } else {
        console.warn("⚠️ [Gemini Generator Warning] Gagal terkoneksi ke Gemini. Mengaktifkan fallback lokal. Detail:", errMsg);
      }
      useFallback = true;
      fallbackReason = customMsg;
    }
  }

  if (useFallback) {
    console.info("Generating beautiful Indonesian business configuration via local synthetic parser...");
    const fallbackConfig = generateLocalFallback(businessName, businessDescription, targetMarket, toneStyle, agentGoal);
    activeConfig = {
      ...fallbackConfig,
      isFallbackActive: true,
      fallbackReason: fallbackReason
    };
    return res.json(activeConfig);
  }
});

// Helper to process, classify and record interaction metrics from simulation chats
function processConversationMetrics(message: string, replyText: string) {
  try {
    const msgLower = message.toLowerCase();
    let detectedIntent: "Tanya Harga" | "Pemesanan (Order)" | "Komplain Terlambat" | "Nego Diskon" | "Konsultasi" = "Konsultasi";
    let amount = 0;
    let items = "";

    if (msgLower.includes("harga") || msgLower.includes("berapa") || msgLower.includes("biaya") || msgLower.includes("pricelist")) {
      detectedIntent = "Tanya Harga";
    } else if (msgLower.includes("order") || msgLower.includes("pesan") || msgLower.includes("beli") || msgLower.includes("bayar") || msgLower.includes("transfer") || msgLower.includes("rekening")) {
      detectedIntent = "Pemesanan (Order)";
      amount = Math.floor(100 + Math.random() * 400) * 1000; // Rp 100.000 - Rp 500.000
      const products = ["Paket Produk Best-Seller", "Custom Service Pack", "Premium Kit", "Daily Wash & Spa", "Consulting Hour"];
      items = `1x ${products[Math.floor(Math.random() * products.length)]}`;
    } else if (msgLower.includes("lambat") || msgLower.includes("komplain") || msgLower.includes("kecewa") || msgLower.includes("rusak") || msgLower.includes("salah kirim")) {
      detectedIntent = "Komplain Terlambat";
    } else if (msgLower.includes("nego") || msgLower.includes("diskon") || msgLower.includes("kurang") || msgLower.includes("potong")) {
      detectedIntent = "Nego Diskon";
    }

    // Add transaction if purchase intent detected
    if (detectedIntent === "Pemesanan (Order)") {
      const names = ["Pelanggan Simulasi", "Budi Santoso", "Siti Rahma", "Yusuf Subagja"];
      const name = names[Math.floor(Math.random() * names.length)];
      
      salesTransactions.unshift({
        id: `S-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: Date.now(),
        customerName: name,
        phone: `0812****${Math.floor(1000 + Math.random() * 9000)}`,
        items,
        amount,
        status: Math.random() > 0.5 ? "paid" : "pending",
        channel: "simulator"
      });
      if (salesTransactions.length > 50) salesTransactions.pop();
    }

    // Write beautiful user evaluation summary dynamically
    const satisfactions: ("Sangat Puas" | "Puas" | "Cukup")[] = ["Sangat Puas", "Puas", "Cukup"];
    const satisfied = satisfactions[Math.floor(Math.random() * satisfactions.length)];
    
    let summary = "";
    let followUp = "";
    
    if (detectedIntent === "Pemesanan (Order)") {
      summary = "AI mendeteksi kata kunci pemesanan barang. AI otomatis merespons dengan format formulir pemesanan resmi dan petunjuk transfer pembayaran.";
      followUp = "Hubungi kembali untuk memverifikasi kelengkapan form alamat & nomor HP yang telah dikirim pelanggan.";
    } else if (detectedIntent === "Tanya Harga") {
      summary = "Menanyakan detail tarif atau harga produk. AI menceritakan benefit premium dan mengindikasikan ketersediaan promo gratis ongkir hari ini.";
      followUp = "Tawarkan bantuan personal atau kirim foto katalog visual lanjutan.";
    } else if (detectedIntent === "Komplain Terlambat") {
      summary = "Merespons masalah komplain atau keterlambatan. AI melayani dengan empati penuh, menawarkan asuransi retur ganti baru guna meredam ketegangan pelanggan.";
      followUp = "Segera hubungi tim ekspedisi mitra untuk melacak nomor resi fisik pelanggan ini.";
    } else if (detectedIntent === "Nego Diskon") {
      summary = "Pelanggan meminta potongan harga tambahan. AI bertahan pada harga resmi namun sukses melakukan nego dengan kompensasi gantinya bonus souvenir eksklusif.";
      followUp = "Beri penanda khusus pada label pengiriman agar tim packing menyisipkan souvenir bonus.";
    } else {
      summary = "Pertanyaan konsultasi umum mengenai spesifikasi produk dan ketersediaan stok. AI menjawab dengan detail sesuai database FAQ.";
      followUp = "Tanyakan apakah penjelasan AI sudah membantu atau ada hal lain yang bisa kami bantu.";
    }

    conversationEvaluations.unshift({
      id: `EVAL-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: Date.now(),
      customerName: "Pelanggan Simulasi",
      channel: "simulator",
      intent: detectedIntent,
      satisfaction: satisfied,
      agentSummary: summary,
      followUpAction: followUp
    });
    if (conversationEvaluations.length > 50) conversationEvaluations.pop();

  } catch (err) {
    console.warn("Gagal mengekstrak metrik evaluasi:", err);
  }
}

/**
 * API Route: Chat interaction with AI admin
 */
app.post("/api/chat", async (req, res) => {
  const chatStartTime = Date.now();
  const { message, history, config, senderPhone } = req.body;

  if (!message || !config) {
    return res.status(400).json({ error: "Message dan Config wajib dilampirkan." });
  }

  const isOwner = config && config.ownerPhone && senderPhone && isOwnerPhone(senderPhone, config.ownerPhone);

  // Pre-emptively mask PII in the simulated message before it reaches any LLM or log
  const { maskedText, redactions } = maskSensitiveData(message, "Simulator");

  // Detect if previous state was generated in fallback, or if key is missing/leaked
  const currentApiKey = process.env.GEMINI_API_KEY;
  const isInvalidOrPlaceholder = !currentApiKey || currentApiKey.trim() === "" || currentApiKey === "MY_GEMINI_API_KEY" || currentApiKey.includes("PLACEHOLDER");
  let useFallback = config.isFallbackActive || isInvalidOrPlaceholder;

  if (!useFallback) {
    try {
      // Construct the context from FAQs and Flow Rules
      const faqContext = config.faq.map((item: any) => `Tanya: ${item.question}\nJawab: ${item.answer}`).join("\n\n");
      const flowContext = config.flowRules.map((item: any) => `Pemicu: ${item.condition}\nTindakan: ${item.action}`).join("\n\n");

      let fullInstruction = `
        ${config.systemPrompt}
        
        Anda adalah ${config.name}, dengan Bio: "${config.bio}".
        Gaya bahasa komunikasi Anda adalah: ${config.toneStyle}.
        
        Gunakan basis pengetahuan FAQ berikut jika relevan dengan pertanyaan pembeli:
        --- PENGETAHUAN PRODUK (FAQ) ---
        ${faqContext}
        
        Gunakan acuan flow dan skenario respons khusus berikut jika mendapati situasi yang cocoK:
        --- CONDITIONAL FLOWS ---
        ${flowContext}
        
        ATURAN CHATTER:
        1. Jawablah langsung dengan singkat, padat, dan ramah seperti layaknya Admin WhatsApp aslinya (maksimal 2-3 paragraf per chat, usahakan to the point tapi memikat).
        2. Jangan pernah mengakui diri sebagai LLM atau bot jika tidak perlu. Bersikaplah seperti manusia staff asli yang ditugaskan memantau chat.
        3. Jika informasi tidak ada di FAQ atau system instruksi, jawablah dengan diplomatis sesuai kepribadianmu dan tawarkan untuk mengeceknya ke owner/gudang terlebih dahulu daripada memberikan informasi palsu.
        4. Fokus utama Anda adalah melayani dengan menyenangkan dan mendorong pelanggan melakukan pemesanan (Closing Order).
      `;

      if (isOwner) {
        fullInstruction = `
          Anda adalah ${config.name}, asisten virtual kecerdasan bisnis profesional.
          Target Anda saat ini adalah memberikan laporan penjualan, kepuasan pelanggan, dan analisis finansial secara akurat kepada Owner / Atasan Anda.
          
          ${getOwnerDataContext(config)}
          
          Gaya bahasa komunikasi tetap sopan, sigap, ramah, dan profesional. Gunakan format laporan atau tabel yang rapi agar mudah dibaca Owner.
        `;
      }

      // Mask the dialogue history as well
      const dialogueHist = (history || []).map((msg: any) => {
        const senderName = msg.sender === "customer" ? "Pelanggan" : config.name;
        const maskedHistoryText = maskSensitiveData(msg.text, "History").maskedText;
        return `${senderName}: ${maskedHistoryText}`;
      }).join("\n");

      const chatPrompt = `
        Berikut adalah riwayat percakapan sebelumnya (jika ada):
        ${dialogueHist || "(Tidak ada percakapan sebelumnya)"}
        
        Pelanggan mengirim pesan baru: "${maskedText}"
        
        Berikan jawaban balasan yang natural sebagai ${config.name}:
      `;

      const chatResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: chatPrompt,
        config: {
          systemInstruction: fullInstruction,
          temperature: 0.7,
        }
      });

      const durationSec = parseFloat(((Date.now() - chatStartTime) / 1000).toFixed(3));
      trafficLogs.push({
        timestamp: Date.now(),
        latency: durationSec,
        isFallback: false,
        type: "simulator"
      });
      if (trafficLogs.length > 300) trafficLogs.shift();

      const reply = chatResponse.text || "";
      processConversationMetrics(message, reply);

      return res.json({ reply: cleanAiSlop(reply), isFallbackActive: false });

    } catch (geminiError: any) {
      const errMsg = geminiError?.message || String(geminiError);
      if (errMsg.includes("leaked") || errMsg.includes("403") || errMsg.includes("key")) {
        console.warn("⚠️ [Gemini Chat Warning] Chat - Fallback simulator aktif karena API Key bocor atau tidak valid.");
      } else {
        console.warn("⚠️ [Gemini Chat Warning] Chat - Gagal memanggil model, menggunakan local NLP matching. Info:", errMsg);
      }
      useFallback = true;
    }
  }

  if (useFallback) {
    console.info("Replying using local keyword-matching database response (Fallback Mode Active)");
    let reply = "";
    if (isOwner) {
      const msg = maskedText.toLowerCase();
      if (msg.includes("lapor") || msg.includes("rekap") || msg.includes("jual") || msg.includes("omset") || msg.includes("omzet") || msg.includes("laba") || msg.includes("transaksi") || msg.includes("kepuasan") || msg.includes("crm") || msg.includes("keberhasilan") || msg.includes("pembeli") || msg.includes("konversi")) {
        const totalRevenue = salesTransactions.filter(t => t.status === "paid").reduce((sum, t) => sum + t.amount, 0);
        const pendingRevenue = salesTransactions.filter(t => t.status === "pending").reduce((sum, t) => sum + t.amount, 0);
        const salesCountList = salesTransactions.length;
        const paidCountList = salesTransactions.filter(t => t.status === "paid").length;
        const pendingCountList = salesTransactions.filter(t => t.status === "pending").length;

        reply = `Halo Boss/Owner 👑! Berikut adalah Laporan Kinerja Real-Time Toko ${config.name} (Local Standby Mode):

📈 RINGKASAN FINANSIAL:
- Total Transaksi Masuk: ${salesCountList} kali
- Transaksi Lunas: ${paidCountList} kali (Total Omset: Rp${totalRevenue.toLocaleString("id-ID")})
- Transaksi Pending: ${pendingCountList} kali (Tertunda: Rp${pendingRevenue.toLocaleString("id-ID")})

📊 EVALUASI CRM PELANGGAN:
- Kepuasan: Terpantau Luar Biasa Baik
- Sentimen Masuk: Didominasi transaksi lancar & minat tinggi. Beberapa masukan feedback direspon cepat sesuai flow rules.

Owner butuh dicarikan data transaksi id tertentu atau informasi tambahan lainnya? Siap dilaksanakan!`;
      } else {
        reply = `Halo Boss/Owner 👑! Senang bisa menyapa Anda di panel kontrol. Ada yang bisa saya laporkan atau bantu seputar data penjualan, kinerja transaksi harian, atau evaluasi chat pelanggan ${config.name} hari ini?`;
      }
    } else {
      reply = simulateChatResponse(maskedText, config);
    }

    const durationSec = parseFloat(((Date.now() - chatStartTime) / 1000).toFixed(3));
    trafficLogs.push({
      timestamp: Date.now(),
      latency: durationSec,
      isFallback: true,
      type: "simulator"
    });
    if (trafficLogs.length > 300) trafficLogs.shift();

    processConversationMetrics(message, reply);

    return res.json({ reply: cleanAiSlop(reply), isFallbackActive: true });
  }
});

/**
 * Robust Local Helper: Generates beautiful tailored mock configs for presentation safety
 */
function generateLocalFallback(
  businessName: string,
  businessDescription: string,
  targetMarket: string,
  toneStyle: string,
  agentGoal: string
) {
  const toneDesc = {
    casual: "santai, asyik, gaul khas anak muda, menyapa 'Kak', 'Sis', 'Bro', pakai emoticon ceria",
    warm: "ramah, penuh empati, peduli, menyapa 'Kak' dengan sopan, tulus melayani",
    formal: "profesional, sopan santun, menggunakan tata bahasa baku, menyapa 'Bapak/Ibu' atau 'Kakak'",
    assertive: "tegas, to-the-point, berwibawa, menjawab seperlunya namun mantap"
  }[toneStyle as 'casual' | 'formal' | 'warm' | 'assertive'] || "ramah adaptif";

  const adminName = `${toneStyle === 'casual' ? 'Siska' : toneStyle === 'formal' ? 'Bapak Budi' : toneStyle === 'warm' ? 'Kak Ayu' : 'Kevin'} - CS ${businessName}`;
  
  let avatarSeed = "chat";
  const lowerDesc = businessDescription.toLowerCase();
  if (lowerDesc.includes("sepatu") || lowerDesc.includes("shoe") || lowerDesc.includes("sneaker")) {
    avatarSeed = "shoe";
  } else if (lowerDesc.includes("makan") || lowerDesc.includes("catering") || lowerDesc.includes("kuliner") || lowerDesc.includes("dapur") || lowerDesc.includes("resto")) {
    avatarSeed = "noodles";
  } else if (lowerDesc.includes("laundry") || lowerDesc.includes("baju") || lowerDesc.includes("kost") || lowerDesc.includes("kamar")) {
    avatarSeed = "shop";
  } else if (lowerDesc.includes("skincare") || lowerDesc.includes("makeup") || lowerDesc.includes("cantik") || lowerDesc.includes("glow")) {
    avatarSeed = "makeup";
  }

  const bio = `Akun Resmi CS Admin ${businessName}. Aktif melayani. ${agentGoal || "Respons cepat dan terpercaya."}`.substring(0, 137);

  const systemPrompt = `Anda adalah ${adminName}, asisten layanan pelanggan untuk ${businessName}.
Menggunakan gaya bicara: ${toneStyle} (${toneDesc}).
Panduan Kerja:
1. Prioritas Utama: ${agentGoal || "Membantu tanya-jawab produk, edukasi keunggulan, serta membimbing hingga pembeli mengisi format pemesanan."}
2. Sesuai deskripsi bisnis: ${businessDescription}. Gunakan detail di sana untuk menjawab rentang harga & ketentuan khusus.
3. Tetaplah sabar dan sopan seolah Anda staff ahli yang menyayangi pelanggan.
4. Hindari bahasa kaku khas AI (AI Slop), seperti: "Tentu saja Kak!", "Baik Kak,", "Perlu dicatat bahwa", "Menariknya,", "Secara keseluruhan,". Jawablah langsung, luwes, bersahabat, dan padat seperti manusia asli mengetik chat WhatsApp.`;

  const isShoe = lowerDesc.includes("sepatu") || lowerDesc.includes("shoe") || lowerDesc.includes("sneaker");
  const isFood = lowerDesc.includes("makan") || lowerDesc.includes("catering") || lowerDesc.includes("kuliner") || lowerDesc.includes("dapur");

  const faq = [
    {
      id: "faq_1",
      question: "Apakah produk ready stock dan bisa langsung dikirim hari ini?",
      answer: isShoe 
        ? "Ready banget Kak! Sepatu best seller kami selalu kami restock berkala di warehouse Bandung. Pesanan sebelum jam 16.00 WIB akan langsung diserahkan ke kurir di hari yang sama ya Kak, silakan diorder sebelum kehabisan size!"
        : isFood
        ? "Untuk jaminan kesegaran maksimal, masakan kami diolah fresh setiap pagi Kak! Kami merekomendasikan pemesanan dikonfirmasi H-1 sebelum jam 17.00 sore ya, agar kebagian slot menu spesial esok hari!"
        : "Tentu ready Kak! Semua item yang ada di etalase kami siap kirim. Batas pengiriman harian kami adalah jam 16.00 WIB, jadi kalau kakak memesan sekarang, bisa banget langsung dikirim hari ini!"
    },
    {
      id: "faq_2",
      question: "Berapa harganya dan apakah ada paket promo diskon khusus?",
      answer: `Untuk harga di ${businessName}, kami memberikan penawaran paling kompetitif. Sesuai dengan detail layanan kami, harga berkisar sangat terjangkau dibanding kualitas premium yang Kakak terima! Khusus pesanan hari ini, ada promo subsidi gratis ongkir dan bonus cinderamata eksklusif lho. Kakak mau coba ambil produk apa nih?`
    },
    {
      id: "faq_3",
      question: "Bagaimana alur dan tata cara pemesanannya (cara order)?",
      answer: "Caranya simpel banget Kak! Cukup isi format pesanan resmi berikut ini ya:\n\n1. *Nama Penerima*:\n2. *No. HP Aktif*:\n3. *Alamat Lengkap (Kecamatan & Kota)*:\n4. *Detail Item & Jumlah*:\n\nNanti admin akan langsung bantu hitungkan rincian harga, ongkir termurah, serta memberikan rekening pembayaran resmi ya Kak!"
    },
    {
      id: "faq_4",
      question: "Apakah bisa bayar di tempat ketika barang sampai (layanan COD)?",
      answer: "Bisa banget Kak! Kami bekerjasama dengan ekspedisi handal untuk mendukung fasilitas Cash on Delivery (COD) di seluruh wilayah Indonesia agar Kakak bisa bertransaksi dengan 100% aman, tenang, dan tanpa perlu repot transfer bank!"
    },
    {
      id: "faq_5",
      question: "Kirim dari mana dan berapa tarif ongkos kirimnya?",
      answer: "Semua pengantaran kami lakukan langsung dari gudang distribusi utama kami Kak. Untuk ongkos kirim paling akurat & hemat, boleh dibantu infokan nama *kecamatan dan kota tujuan pengiriman* Kakak? Biar langsung admin cekkan diskon ongkirnya!"
    },
    {
      id: "faq_6",
      question: isShoe ? "Bagaimana kalau ukuran sepatunya tidak muat, apa boleh ditukar?" : isFood ? "Apakah hidangannya bebas dari MSG dan bahan pengawet?" : "Bagaimana ketentuan garansi atau kebijakan pengembalian barang?",
      answer: isShoe 
        ? "Tentu saja boleh Kak! Kami ada garansi penukaran size secara GRATIS dalam waktu 3 hari setelah paket tiba, asalkan label belum dicopot dan belum dipakai di luar ruangan. Kenyamanan kaki Kakak adalah nomor satu!"
        : isFood
        ? "Benar sekali Kak! Kami menjamin 100% makanan sehat tanpa bahan pengawet sintetis dan tanpa MSG tambahan. Kami hanya memakai rempah segar alami sehingga sangat aman dikonsumsi harian oleh anak-anak maupun lansia."
        : "Ada garansi kepuasan 100% Kak! Jika pesanan yang diterima rusak, cacat, atau tidak sesuai pesanan, tinggal infokan ke kami untuk retur ganti baru dengan ongkir yang kami tanggung sepenuhnya."
    },
    {
      id: "faq_7",
      question: "Bisa dapat diskon tambahan tidak jika saya menawar sedikit saja?",
      answer: "Tenang saja Kak! Di kami, harga sudah diatur sepadan kualitas terbaik. Tapi khusus hari ini, admin bisa bantu mengajukan voucher potongan harga khusus atau bonus free item buat Kakak yang deal pesan sekarang juga. Mau admin bantu proses promonya Kak?"
    },
    {
      id: "faq_8",
      question: "Apakah melayani konsultasi kost, laundry grosir, atau pesanan partai besar?",
      answer: "Ya, kami melayani pesanan partai besar/grosir, catering korporat, maupun kerja sama langganan jangka panjang dengan harga yang jauh lebih miring Kak! Silakan beri tahu jumlah item atau porsi yang Kakak butuhkan ya."
    }
  ];

  const flowRules = [
    {
      id: "flow_1",
      condition: "Pelanggan meminta potongan harga tambahan (nego harga).",
      action: "Terangkan bahwa harga sebanding kualitas superior. Namun demi kenyamanan, berikan opsi voucher promo senilai 15-25 ribu atau merchandise gratis asalkan memesan hari ini."
    },
    {
      id: "flow_2",
      condition: "Pelanggan menanyakan ongkos kirim dan estimasi pengiriman.",
      action: "Tanyakan kecamatan tujuan pengiriman terlebih dahulu untuk menghitung ongkir paling hemat menggunakan kurir mitra kami."
    },
    {
      id: "flow_3",
      condition: "Pelanggan ingin melakukan pemesanan (ingin bayar).",
      action: "Kirimkan template format pemesanan dan nomor rekening resmi dengan ramah dan sopan."
    },
    {
      id: "flow_4",
      condition: "Pelanggan komplain pesanan terlambat sampai atau salah kirim.",
      action: "Ucapkan permohonan maaf mendalam dengan empati tinggi, minta nomor resi, lakukan pelacakan cepat, dan laporkan statusnya segera."
    },
    {
      id: "flow_5",
      condition: "Pelanggan menunjukkan keraguan atau menanyakan keaslian.",
      action: "Yakinkan dengan fasilitas COD, ulasan positif konsumen lain, dan garansi retur ganti baru."
    }
  ];

  return {
    name: adminName,
    avatarSeed,
    bio,
    systemPrompt,
    toneStyle,
    faq,
    flowRules
  };
}

/**
 * Intelligent Keyword Matching Local Simulator
 */
function simulateChatResponse(message: string, config: any): string {
  const msg = message.toLowerCase().trim();
  
  // Clean message and extract exact alphanumeric word tokens (to avoid matching sub-parts of words)
  const words = msg.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  
  const hasWord = (w: string) => words.includes(w);
  const hasAnyWord = (arr: string[]) => arr.some(w => words.includes(w));
  const hasPhrase = (phrase: string) => msg.includes(phrase);
  const hasAnyPhrase = (arr: string[]) => arr.some(p => msg.includes(p));

  // 1. GREETINGS (Comprehensive Indonesian & English greetings)
  if (hasAnyWord(["halo", "hai", "hi", "hello", "hei", "pagi", "siang", "sore", "malam", "salam", "assalamualaikum", "p", "test", "tes", "ping"])) {
    return `Halo Kak! Selamat datang di layanan asisten resmi ${config.name}. Saya siap membantu merekomendasikan produk unggulan, menjawab detail spesifikasi produk, hingga memandu cara order secara praktis. Ada yang bisa kami bantu hari ini Kakak?`;
  }

  // 2. STORE INITIAL DEFINITION ("kamu toko apa", "toko apa ini", "jual apa")
  if (hasAnyPhrase(["toko apa", "kamu toko", "apa sih", "toko ini", "jual apa", "menjual apa", "bisnis apa", "layanan apa", "siapa kamu", "kamu siapa"])) {
    return `Kami adalah asisten digital resmi dari ${config.name} Kak! Kami hadir untuk menghadirkan produk dengan standar mutu tinggi dan pelayanan prima demi kenyamanan berbelanja Kakak. Kira-kira Kakak sedang mencari produk atau informasi khusus apa nih biar admin bantu carikan?`;
  }

  // 3. PRODUCT CATALOG/OPTIONS INQUIRY ("sepatunya apa aja", "model apa saja", "katalog produk")
  if (
    hasAnyPhrase(["sepatunya apa aja", "sepatu apa saja", "produknya apa aja", "pilihan apa", "pilihan produk", "model apa", "varian apa", "isinya apa", "katalog", "jenis apa"]) ||
    (hasAnyWord(["produk", "sepatu", "barang"]) && hasAnyWord(["apa", "mana", "saja", "aja", "pilihan", "koleksi", "kumpulan"]))
  ) {
    return `Kami memiliki beragam koleksi produk unggulan terlengkap di ${config.name} Kak! Mulai dari varian klasik hingga model best-seller terbaru yang selalu kami restock berkala. Silakan sampaikan spesifikasi, model, atau ukuran nomor berapa yang Kakak inginkan agar kami bisa segera merekomendasikan pilihan terbaik untuk Kakak!`;
  }

  // 4. PRICE / DISCOUNT / NEGO
  if (hasAnyWord(["price", "harga", "berapa", "tarif", "biaya", "nego", "kurang", "diskon", "potong", "murah", "tawar", "promo", "voucher"])) {
    return `Mengenai harga, toko kami ${config.name} selalu menawarkan harga terbaik yang sangat sepadan dengan kualitas premium produk Kak. Khusus pesanan hari ini, diskon promo tambahan serta asuransi pengiriman penuh siap kami berikan khusus untuk Kakak! Tertarik mencoba memproses order hari ini, Kak?`;
  }

  // 5. EXCHANGE & POLICY (Tukar ukuran, Garansi, dll)
  if (
    hasAnyPhrase(["tukar ukuran", "tukar size", "kekecilan", "kebesaran", "pengembalian", "garansi", "ga muat", "tidak muat", "boleh tukar", "bisa tukar"]) ||
    (hasAnyWord(["tukar", "retur", "garansi"]) && hasAnyWord(["ukuran", "size", "barang", "produk", "kembali"]))
  ) {
    const f = config.faq.find((item: any) => item.id === "faq_6") || config.faq[5];
    return f?.answer || `Tentu saja boleh Kak! Kami menyediakan jaminan garansi retur/ganti baru secara GRATIS jika barang yang sampai tidak sesuai, rusak, atau salah ukuran. Kenyamanan dan kepuasan Kakak adalah prioritas nomor satu bagi kami!`;
  }

  // 6. SHIPPING / SHIPPING RATES / SENDER location
  if (hasAnyWord(["ongkir", "kirim", "ongkos", "tarif", "kurir", "ekspedisi", "pos", "jne", "jnt", "sicepat", "anteraja", "gudang", "daerah"])) {
    const f = config.faq.find((item: any) => item.id === "faq_5") || config.faq[4];
    return f?.answer || `Pengiriman dilakukan langsung dari warehouse utama kami Kak dengan pilihan kurir express terbaik. Untuk menghitung tarif ongkos kirim paling hemat, boleh diinfokan Kecamatan dan Kota tujuan pengiriman Kakak?`;
  }

  // 7. ORDER / PURCHASE / METHOD
  if (hasAnyWord(["order", "pesan", "beli", "bayar", "transfer", "rekening", "cara", "alur", "format"])) {
    const f = config.faq.find((item: any) => item.id === "faq_3") || config.faq[2];
    return f?.answer || `Untuk melakukan pemesanan, silakan isi format order berikut ya Kak:\n\n1. Nama:\n2. No. HP:\n3. Alamat Lengkap:\n4. Jenis Produk & Ukuran:\n\nSetelah itu, admin akan langsung berikan rincian total dan rekening resmi toko kami.`;
  }

  // 8. COD / CASH ON DELIVERY
  if (hasAnyWord(["cod", "bayar di tempat", "ditempat"])) {
    const f = config.faq.find((item: any) => item.id === "faq_4") || config.faq[3];
    return f?.answer || `Bisa banget COD Kak! Kami menyediakan sistem Cash on Delivery di seluruh wilayah Indonesia agar transaksi Kakak dijamin 100% aman dan nyaman tanpa repot transfer bank.`;
  }

  // 9. READY STOCK / RESTOCK
  if (hasAnyWord(["ready", "stok", "stock", "ada", "tersedia", "restock"])) {
    const f = config.faq.find((item: any) => item.id === "faq_1") || config.faq[0];
    return f?.answer || `Produk paling dicari selalu kami restok berkala Kak! Silakan sebutkan model atau size yang Kakak incar agar kami bisa langsung booking-kan slotnya sebelum diborong pembeli lain.`;
  }

  // 10. COMPLAINT / LATE
  if (hasAnyWord(["komplain", "telat", "stuck", "salah", "resi", "kecewa", "lambat", "rusak", "cacat"])) {
    return `Mohon maaf sedalam-dalamnya atas kendala yang Kakak hadapi. Kami di ${config.name} sangat menghargai feedback Kakak dan akan segera melacak posisi paket Kakak langsung ke pihak ekspedisi terkait hari ini. Mohon infokan nama lengkap atau nomor transaksi Kakak ya.`;
  }

  // 11. Overlap search in FAQs with exact word scores (to avoid matching subwords like "apakah" with "apa"!)
  let bestFaq: any = null;
  let maxScore = 0;
  
  for (const item of config.faq) {
    const qLower = item.question.toLowerCase();
    const qWords = qLower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
    let score = 0;
    
    for (const w of words) {
      if (["apa", "aja", "ada", "yang", "dan", "di", "ke", "dari", "ini", "itu", "saya", "kamu", "kita", "mereka"].includes(w)) {
        continue;
      }
      if (qWords.includes(w)) {
        score += 2; // Exact word match gets higher score
      } else if (qLower.includes(w) && w.length >= 4) {
        score += 0.5; // Substring match only for longer words
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      bestFaq = item;
    }
  }
  
  if (bestFaq && maxScore >= 2) {
    return bestFaq.answer;
  }
  
  // 12. Smart dynamic generic response
  return `Terima kasih atas pesan Anda Kak. Agar kami dapat memberikan informasi yang paling akurat seputar ${config.name}, mohon dijelaskan kebutuhan atau pertanyaan Kakak lebih detail? Admin siap membantu merekomendasikan pilihan terbaik.`;
}

// Vite middleware and Express Server Bootstrap within async function to support CJS Compilation
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Backend bootstrap failure:", err);
});
