import React from 'react';
import { useStore } from '../../context/StoreContext';
import { D } from '../../utils/date';
import { X, AlertCircle, Check, XCircle } from 'lucide-react';

interface AlertsModalProps {
  onClose: () => void;
  onFocusTeam?: (deptId: string) => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({ onClose, onFocusTeam }) => {
  const {
    db,
    emp,
    redTeams,
    reminderTeams,
    teamWarnings,
    setLeaveStatus,
    resolveSupportTicket,
  } = useStore();

  const red = redTeams();
  const rem = reminderTeams();
  const pendingLeaves = db.leaves.filter(l => l.status === 'pending');
  const openTickets = (db.supportTickets || []).filter(t => t.status !== 'resolved');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-500/20 text-red-400">🔔</span>
            <div>
              <h2 className="text-lg font-bold text-white">Cần xử lý & Cảnh báo</h2>
              <div className="text-xs text-slate-400">
                {red.length} nháy đỏ · {rem.length} nhắc nhở · {pendingLeaves.length} đơn nghỉ · {openTickets.length} hỗ trợ
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pending Leaves */}
        {pendingLeaves.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
              <span>Đơn nghỉ phép chờ duyệt ({pendingLeaves.length})</span>
            </h3>
            <div className="space-y-2">
              {pendingLeaves.map(l => {
                const requester = emp(l.emp);
                return (
                  <div
                    key={l.id}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <b className="text-white text-sm">{requester?.name || 'Nhân viên'}</b>
                      <div className="text-slate-400">
                        {l.type} · {D.fmt(l.from)} đến {D.fmt(l.to)} ({l.days} ngày)
                      </div>
                      {l.reason && <p className="text-slate-500 text-[11px] mt-0.5">"{l.reason}"</p>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setLeaveStatus(l.id, 'approved')}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Duyệt</span>
                      </button>
                      <button
                        onClick={() => setLeaveStatus(l.id, 'rejected')}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 font-semibold flex items-center gap-1 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Red Teams */}
        {red.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wide">
              <span>🔴 Tổ nháy đỏ - Cần xử lý ngay ({red.length})</span>
            </h3>
            <div className="space-y-2">
              {red.map(t => {
                const w = teamWarnings(t.id);
                return (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <b className="text-sm text-red-200">{t.name}</b>
                      <span className="text-[11px] text-red-400 font-semibold">
                        {w.length} tiêu chí vi phạm
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {w.map((item, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-xl bg-slate-950/80 border border-red-900/40 flex justify-between"
                        >
                          <span className="text-slate-400">{item.label}:</span>
                          <b className="text-red-300">
                            {item.value}
                            {item.unit}
                          </b>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reminder Teams */}
        {rem.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
              <span>🟡 Tổ trong diện theo dõi & nhắc nhở ({rem.length})</span>
            </h3>
            <div className="space-y-2">
              {rem.map(t => {
                const w = teamWarnings(t.id);
                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/50 flex justify-between items-center text-xs"
                  >
                    <div>
                      <b className="text-sm text-amber-200">{t.name}</b>
                      <div className="text-slate-400 text-[11px]">
                        Cảnh báo: {w.map(x => `${x.label} (${x.value}${x.unit})`).join(', ')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {openTickets.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wide">
              Yêu cầu hỗ trợ đang mở ({openTickets.length})
            </h3>
            <div className="space-y-2">
              {openTickets.slice(0, 5).map(t => (
                <div
                  key={t.id}
                  className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <b className="text-white text-sm block truncate">{t.title}</b>
                    <div className="text-slate-400 truncate">
                      {emp(t.empId)?.name || 'Nhân viên'} · {t.assignee || 'Chưa gán'}
                    </div>
                  </div>
                  <button
                    onClick={() => resolveSupportTicket(t.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shrink-0"
                  >
                    Đóng
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {red.length === 0 && rem.length === 0 && pendingLeaves.length === 0 && openTickets.length === 0 && (
          <div className="py-8 text-center text-emerald-400 font-semibold text-sm">
            ✓ Hiện tại không có vấn đề nào cần xử lý!
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
