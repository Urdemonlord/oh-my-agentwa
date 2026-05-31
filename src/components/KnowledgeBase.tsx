import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, FileText, HelpCircle, Sparkles, RefreshCw } from 'lucide-react';
import { FAQItem, AgentConfig } from '../types';

interface KnowledgeBaseProps {
  config: AgentConfig;
  onUpdateConfig: (newConfig: AgentConfig) => void;
}

export default function KnowledgeBase({ config, onUpdateConfig }: KnowledgeBaseProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [isGeneratingFaq, setIsGeneratingFaq] = useState(false);

  const handleSuggestFaq = async () => {
    setIsGeneratingFaq(true);
    try {
      const res = await fetch("/api/generate-faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.faq && data.faq.length > 0) {
          const updatedFaq = [...config.faq, ...data.faq];
          onUpdateConfig({
            ...config,
            faq: updatedFaq
          });
        }
      }
    } catch (err) {
      console.error("Failed to generate AI FAQs", err);
    } finally {
      setIsGeneratingFaq(false);
    }
  };

  const handleStartEdit = (item: FAQItem) => {
    setEditingId(item.id);
    setEditQuestion(item.question);
    setEditAnswer(item.answer);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = (id: string) => {
    if (!editQuestion.trim() || !editAnswer.trim()) return;

    const updatedFaq = config.faq.map(item => {
      if (item.id === id) {
        return { ...item, question: editQuestion, answer: editAnswer };
      }
      return item;
    });

    onUpdateConfig({
      ...config,
      faq: updatedFaq
    });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updatedFaq = config.faq.filter(item => item.id !== id);
    onUpdateConfig({
      ...config,
      faq: updatedFaq
    });
  };

  const handleAddFaq = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const newItem: FAQItem = {
      id: `faq_${Date.now()}`,
      question: newQuestion,
      answer: newAnswer
    };

    onUpdateConfig({
      ...config,
      faq: [...config.faq, newItem]
    });

    setIsAdding(false);
    setNewQuestion('');
    setNewAnswer('');
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-none p-6 flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-5">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase italic tracking-tight">
            <FileText className="w-5 h-5 text-[#25D366]" />
            Knowledge Base — FAQ Produk
          </h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            FAQ ini tersinkronisasi otomatis dengan basis pengetahuan admin untuk memberikan jawaban akurat & presisi.
          </p>
        </div>
        
        {!isAdding && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={handleSuggestFaq}
              disabled={isGeneratingFaq}
              className="bg-black text-[#25D366] border border-[#25D366]/40 hover:border-[#25D366] font-black uppercase text-xs tracking-wider italic px-4 py-3 rounded-none flex items-center justify-center gap-2 hover:bg-zinc-900 transition-all duration-300 disabled:opacity-50 select-none cursor-pointer"
            >
              {isGeneratingFaq ? (
                <RefreshCw className="w-4 h-4 text-[#25D366] animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-[#25D366]" />
              )}
              {isGeneratingFaq ? "Menyusun FAQ..." : "Sarankan FAQ Baru (AI)"}
            </button>

            <button
              onClick={() => setIsAdding(true)}
              className="bg-[#25D366] text-black font-black uppercase text-xs tracking-wider italic px-5 py-3 rounded-none flex items-center justify-center gap-2 hover:bg-white hover:shadow-[0_0_15px_rgba(204,255,0,0.2)] transition-all duration-300 select-none cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black" />
              Tambah FAQ Baru
            </button>
          </div>
        )}
      </div>

      {/* Add New Form */}
      {isAdding && (
        <div className="bg-black border border-zinc-800 rounded-none p-5 flex flex-col gap-4 animate-fadeIn">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 italic">
              <Plus className="w-4 h-4 text-[#25D366]" />
              Formulir FAQ Baru
            </span>
            <button 
              onClick={() => setIsAdding(false)}
              className="text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1 uppercase tracking-wider font-mono">Pertanyaan Potensial</label>
              <input
                type="text"
                placeholder="Contoh: Apakah barang ready stock? Bagaimana sistem retur barang?"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-none py-2.5 px-3.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#25D366]"
              />
            </div>
            
            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1 uppercase tracking-wider font-mono">Jawaban Persuasif</label>
              <textarea
                rows={3}
                placeholder="Contoh: Ya, semua produk ready stock Kak! Untuk retur, garansi 7 hari jika ukuran tidak pas..."
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-none py-2.5 px-3.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#25D366] resize-none"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 text-xs font-mono">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-none transition-colors uppercase tracking-wider text-[10px]"
            >
              Batal
            </button>
            <button
              onClick={handleAddFaq}
              disabled={!newQuestion.trim() || !newAnswer.trim()}
              className="px-4 py-2 bg-[#25D366] text-black font-black rounded-none hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider text-[10px]"
            >
              Simpan FAQ
            </button>
          </div>
        </div>
      )}

      {/* FAQ Grid/List */}
      <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
        {config.faq.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs font-mono uppercase tracking-wider">
            Belum ada FAQ. Klik "Tambah FAQ Baru" untuk membuat basis pengetahuan pertamamu!
          </div>
        ) : (
          config.faq.map((item, index) => {
            const isEditing = editingId === item.id;
            return (
              <div 
                key={item.id}
                className={`border p-4.5 rounded-none transition-all ${
                  isEditing 
                    ? 'bg-zinc-950 border-[#25D366]' 
                    : 'bg-black/40 border-zinc-900 hover:bg-zinc-900/50 hover:border-zinc-800'
                }`}
              >
                {isEditing ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black font-mono text-[#25D366] uppercase tracking-wider">FAQ #{index + 1} (Editing)</span>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => handleSaveEdit(item.id)}
                          className="p-1 hover:bg-zinc-900 text-emerald-400 rounded transition-colors"
                          title="Simpan"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          className="p-1 hover:bg-zinc-900 text-zinc-400 rounded transition-colors"
                          title="Batal"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <input
                      type="text"
                      value={editQuestion}
                      onChange={(e) => setEditQuestion(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-none py-2 px-3 text-xs text-white font-black uppercase italic tracking-tight"
                    />
                    
                    <textarea
                      rows={3}
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-none py-2 px-3 text-xs text-white leading-relaxed resize-none"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-2.5 items-start">
                        <HelpCircle className="w-4.5 h-4.5 text-[#25D366] shrink-0 mt-0.5" />
                        <h4 className="font-extrabold text-sm text-zinc-100 uppercase tracking-tight italic">{item.question}</h4>
                      </div>
                      
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-none transition-colors"
                          title="Edit FAQ"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-none transition-colors"
                          title="Hapus FAQ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-xs text-zinc-400 leading-relaxed pl-7 mt-2 mt-2 whitespace-pre-wrap border-l border-zinc-800 font-sans">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
