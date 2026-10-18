import React from 'react';
import { useStore } from '../../context/StoreContext';
import { X, Bot, Cpu } from 'lucide-react';

interface AgentModalProps {
  agentId: string;
  onClose: () => void;
}

export const AgentModal: React.FC<AgentModalProps> = ({ agentId, onClose }) => {
  const { db, zone } = useStore();
  const a = db.agents.find(x => x.id === agentId);
  if (!a) return null;
  const z = zone(a.dept);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-indigo-400 uppercase">
                TRỢ LÝ AI TỰ ĐỘNG HÓA
              </div>
              <h2 className="text-lg font-bold text-white">{a.name}</h2>
              <div className="text-xs text-slate-400">{z?.name}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
          {a.desc}
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs text-center">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="block text-[10px] text-slate-500">Trạng thái</span>
            <b className="text-emerald-400 text-xs flex items-center justify-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Đang hoạt động</span>
            </b>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="block text-[10px] text-slate-500">Mô hình AI</span>
            <b className="text-indigo-300 text-xs mt-0.5 block">Gemini 2.5 Flash</b>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
