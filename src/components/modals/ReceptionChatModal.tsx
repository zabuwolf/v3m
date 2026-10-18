import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { D } from '../../utils/date';
import { X, Coffee, Send, User } from 'lucide-react';

interface ReceptionChatModalProps {
  onClose: () => void;
  onOpenManageVisitors: () => void;
}

export const ReceptionChatModal: React.FC<ReceptionChatModalProps> = ({
  onClose,
  onOpenManageVisitors,
}) => {
  const { db, overviewStats, ranking, empsOfTeam } = useStore();

  const ov = overviewStats('today');
  const rk = ranking('today');
  const visitorsToday = db.visitors.filter(v => v.date === D.today());
  const receptionist = empsOfTeam('le-tan')[0];

  const [customMsg, setCustomMsg] = useState('');
  const [messages, setMessages] = useState([
    {
      from: 'Lễ tân',
      isMe: true,
      text: `Dạ em chào quý anh chị, chào mừng đến ${db.company.name}! Chúc các anh chị buổi làm việc hiệu quả 🌸`,
    },
    {
      from: visitorsToday[0]?.name || 'Khách mời',
      isMe: false,
      text: 'Chào em! Hôm nay văn phòng công ty mình có gì mới không?',
    },
    {
      from: 'Lễ tân',
      isMe: true,
      text: `Dạ hôm nay công ty có ${ov.working}/${ov.headcount} nhân sự đi làm, đã chốt ${ov.tasksDone} đầu việc. Tổ ${
        rk[0]?.team.name || 'dẫn đầu'
      } đang đứng top 1 KPI với ${rk[0]?.stats.kpi || 90} điểm ạ! 🏆`,
    },
    {
      from: visitorsToday[1]?.name || 'Khách mời 2',
      isMe: false,
      text: 'Tuyệt quá, cho anh xin 1 ly cà phê sữa đá nhé!',
    },
    {
      from: 'Lễ tân',
      isMe: true,
      text: `Dạ có ngay ạ! Mời các anh chị ngồi sofa nghỉ ngơi, quầy ${db.company.short} CAFÉ phục vụ trong 3 phút ☕`,
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;

    setMessages(prev => [
      ...prev,
      {
        from: 'Khách mời',
        isMe: false,
        text: customMsg.trim(),
      },
      {
        from: 'Lễ tân',
        isMe: true,
        text: 'Dạ em ghi nhận và đã gửi tin báo đến phòng ban liên quan rồi ạ! ✨',
      },
    ]);
    setCustomMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-400 uppercase">
                ☕ {db.company.short} CAFÉ & LỄ TÂN
              </div>
              <h2 className="text-lg font-bold text-white">Đón tiếp khách mời</h2>
              <div className="text-xs text-slate-400">
                {receptionist?.name || 'Nhân viên lễ tân'} · {visitorsToday.length} khách mời hôm nay
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visitors avatars */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {visitorsToday.map((v, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs shrink-0"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>{v.name}</span>
              {v.org && <small className="text-slate-500">({v.org})</small>}
            </div>
          ))}
          {visitorsToday.length === 0 && (
            <span className="text-xs text-slate-500 italic">Chưa có khách mời hôm nay</span>
          )}
        </div>

        {/* Chat message stream */}
        <div className="flex-1 overflow-y-auto space-y-2.5 p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 min-h-[260px]">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col text-xs ${m.isMe ? 'items-start' : 'items-end'}`}
            >
              <span className="text-[10px] font-semibold text-slate-500 mb-0.5 px-1">{m.from}</span>
              <div
                className={`px-3.5 py-2 rounded-2xl max-w-[85%] leading-relaxed ${
                  m.isMe
                    ? 'bg-indigo-950/80 border border-indigo-800/80 text-indigo-100 rounded-tl-sm'
                    : 'bg-amber-950/80 border border-amber-800/80 text-amber-100 rounded-tr-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={customMsg}
            onChange={e => setCustomMsg(e.target.value)}
            placeholder="Nhắn tin với lễ tân (Order nước, đặt phòng họp, hỏi việc...)"
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => {
              onClose();
              onOpenManageVisitors();
            }}
            className="text-indigo-400 hover:underline"
          >
            → Quản lý danh sách khách mời
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
