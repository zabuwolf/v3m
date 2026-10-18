import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { D } from '../../utils/date';
import {
  X,
  LogIn,
  LogOut,
  Clock,
  CheckCircle2,
  User,
  Search,
} from 'lucide-react';

interface QuickCheckInModalProps {
  onClose: () => void;
}

export const QuickCheckInModal: React.FC<QuickCheckInModalProps> = ({ onClose }) => {
  const { activeEmps, team, todayStatus, checkIn, checkOut, db } = useStore();
  const employees = activeEmps();

  const [search, setSearch] = useState('');

  const filtered = employees.filter(
    e =>
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.code || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Chấm Công Nhanh (Quick Attendance)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ghi nhận Check-in / Check-out thời gian thực cho hôm nay ({D.fmtFull(D.today())})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã nhân sự..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {filtered.map(emp => {
            const st = todayStatus(emp.id);
            const empTeam = team(emp.team);
            const att = db.attendance.find(a => a.emp === emp.id && a.date === D.today());
            const isCheckedIn = !!att?.checkIn;
            const isCheckedOut = !!att?.checkOut;

            return (
              <div
                key={emp.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: empTeam?.color || '#8b5cf6' }}
                  >
                    {emp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-xs text-white truncate">{emp.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {emp.role} · {empTeam?.name} · {att?.checkIn ? `Vào: ${att.checkIn}` : 'Chưa check-in'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!isCheckedIn ? (
                    <button
                      onClick={() => checkIn(emp.id)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow flex items-center gap-1 transition active:scale-95"
                    >
                      <LogIn className="w-3 h-3" />
                      <span>Check-in</span>
                    </button>
                  ) : !isCheckedOut ? (
                    <button
                      onClick={() => checkOut(emp.id)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] shadow flex items-center gap-1 transition active:scale-95"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Check-out</span>
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-medium">
                      Đã hoàn thành ca
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};
