import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, GitCommit, Zap } from 'lucide-react';
import { FlowRule, AgentConfig } from '../types';

interface FlowRulesProps {
  config: AgentConfig;
  onUpdateConfig: (newConfig: AgentConfig) => void;
}

export default function FlowRules({ config, onUpdateConfig }: FlowRulesProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCondition, setEditCondition] = useState('');
  const [editAction, setEditAction] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [newCondition, setNewCondition] = useState('');
  const [newAction, setNewAction] = useState('');

  const handleStartEdit = (item: FlowRule) => {
    setEditingId(item.id);
    setEditCondition(item.condition);
    setEditAction(item.action);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = (id: string) => {
    if (!editCondition.trim() || !editAction.trim()) return;

    const updatedRules = config.flowRules.map(item => {
      if (item.id === id) {
        return { ...item, condition: editCondition, action: editAction };
      }
      return item;
    });

    onUpdateConfig({
      ...config,
      flowRules: updatedRules
    });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updatedRules = config.flowRules.filter(item => item.id !== id);
    onUpdateConfig({
      ...config,
      flowRules: updatedRules
    });
  };

  const handleAddRule = () => {
    if (!newCondition.trim() || !newAction.trim()) return;

    const newItem: FlowRule = {
      id: `flow_${Date.now()}`,
      condition: newCondition,
      action: newAction
    };

    onUpdateConfig({
      ...config,
      flowRules: [...config.flowRules, newItem]
    });

    setIsAdding(false);
    setNewCondition('');
    setNewAction('');
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-none p-6 flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-5">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase italic tracking-tight">
            <GitCommit className="w-5 h-5 text-[#25D366]" />
            Flow Generator — Alur Percakapan
          </h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Formula instruksi alur jualan ini dijalankan untuk menyetir arah percakapan pelayanan dengan pelanggan.
          </p>
        </div>
        
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-[#25D366] text-black font-black uppercase text-xs tracking-wider italic px-5 py-3 rounded-none flex items-center justify-center gap-2 hover:bg-white hover:shadow-[0_0_15px_rgba(204,255,0,0.2)] transition-all duration-300"
          >
            <Plus className="w-4 h-4 text-black" />
            Atur Kondisi Flow Baru
          </button>
        )}
      </div>

      {/* Add New Form */}
      {isAdding && (
        <div className="bg-black border border-zinc-800 rounded-none p-5 flex flex-col gap-4 animate-fadeIn">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 italic">
              <Zap className="w-4 h-4 text-[#25D366] animate-pulse" />
              Formula Flow Logika Baru
            </span>
            <button 
              onClick={() => setIsAdding(false)}
              className="text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1 uppercase tracking-wider font-mono">Apabila Kondisi Ini Terjadi (Pemicu):</label>
              <textarea
                rows={3}
                placeholder="Contoh: Customer menanyakan diskon di atas 20% atau memaksa minta gratis ongkir pulau Jawa."
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-none py-2.5 px-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#25D366] resize-none font-sans"
              />
            </div>
            
            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1 uppercase tracking-wider font-mono">Maka AI Harus Mengambil Tindakan Berikut:</label>
              <textarea
                rows={3}
                placeholder="Contoh: Tolak dengan sangat sopan, infokan bahwa margin produk tipis demi menjaga kualitas, lalu tawarkan bonus gantungan kunci gratis senilai 10rb."
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-none py-2.5 px-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#25D366] resize-none font-sans"
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
              onClick={handleAddRule}
              disabled={!newCondition.trim() || !newAction.trim()}
              className="px-4 py-2 bg-[#25D366] text-black font-black rounded-none hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider text-[10px]"
            >
              Simpan Aturan Flow
            </button>
          </div>
        </div>
      )}

      {/* Rules Grid/List */}
      <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
        {config.flowRules.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs font-mono uppercase tracking-wider">
            Belum ada Aturan Flow. Klik "Atur Kondisi Flow Baru" untuk mengajari asisten taktik closing andalanmu!
          </div>
        ) : (
          config.flowRules.map((item, index) => {
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
                      <span className="text-[10px] font-black font-mono text-[#25D366] uppercase tracking-wider">Flow Rule #{index + 1} (Editing)</span>
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono block mb-1">Apabila:</span>
                        <textarea
                          rows={2}
                          value={editCondition}
                          onChange={(e) => setEditCondition(e.target.value)}
                          className="w-full bg-black border border-zinc-850 rounded-none py-2 px-3 text-xs text-white leading-relaxed resize-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono block mb-1">Maka (Tindakan):</span>
                        <textarea
                          rows={2}
                          value={editAction}
                          onChange={(e) => setEditAction(e.target.value)}
                          className="w-full bg-black border border-zinc-850 rounded-none py-2 px-3 text-xs text-white leading-relaxed resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-2.5">
                      <div className="flex gap-2 items-center">
                        <Zap className="w-4 h-4 text-[#25D366] animate-pulse" />
                        <h4 className="font-extrabold text-xs text-[#25D366] select-none uppercase tracking-wider font-mono">FLOW CONDITION #{index + 1}</h4>
                      </div>
                      
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-none transition-colors"
                          title="Edit Aturan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-none transition-colors"
                          title="Hapus Aturan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 px-1">
                      <div className="p-3 bg-black rounded-none border border-zinc-900">
                        <span className="text-[9px] text-[#25D366] font-mono block mb-1 uppercase tracking-wider">Jika Situasi / Chat Masuk:</span>
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed">{item.condition}</p>
                      </div>
                      <div className="p-3 bg-black rounded-none border border-zinc-900">
                        <span className="text-[9px] text-zinc-400 font-mono block mb-1 uppercase tracking-wider">Maka Respon / Taktik Asisten:</span>
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed">{item.action}</p>
                      </div>
                    </div>
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
