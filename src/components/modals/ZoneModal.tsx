import React from 'react';
import { useStore } from '../../context/StoreContext';
import { X, MapPin, Users } from 'lucide-react';

interface ZoneModalProps {
  zoneId: string;
  onClose: () => void;
  onFocusZone: (zoneId: string) => void;
  onGoToTeamsManage: () => void;
}

export const ZoneModal: React.FC<ZoneModalProps> = ({
  zoneId,
  onClose,
  onFocusZone,
  onGoToTeamsManage,
}) => {
  const { zone, deptStats, teamsOf, empsOfTeam, blink } = useStore();
  const z = zone(zoneId);
  if (!z) return null;

  const s = deptStats(z.id, 'today');
  const teams = [...teamsOf(z.id)].sort(
    (a, b) =>
      (/leader|trưởng|sáng lập/i.test(a.name) ? 0 : 1) - (/leader|trưởng|sáng lập/i.test(b.name) ? 0 : 1) ||
      a.name.localeCompare(b.name, 'vi'),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-2xl bg-slate-800 border border-slate-700">
              {z.icon}
            </span>
            <div>
              <div className="text-[11px] font-bold text-indigo-400 uppercase">THÔNG TIN KHU VỰC</div>
              <h2 className="text-xl font-bold text-white">{z.name}</h2>
              <div className="text-xs text-slate-400">{z.sub}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2.5 text-center text-xs">
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <span className="block text-[11px] text-slate-400">Nhân sự</span>
            <b className="text-base text-white">{s.headcount}</b>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <span className="block text-[11px] text-slate-400">Có mặt</span>
            <b className="text-base text-emerald-400">{s.working}</b>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <span className="block text-[11px] text-slate-400">Việc hoàn thành</span>
            <b className="text-base text-sky-400">
              {s.tasksDone}/{s.tasksAssigned}
            </b>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <span className="block text-[11px] text-slate-400">KPI Trung bình</span>
            <b className="text-base text-amber-400">{s.kpi || '–'}</b>
          </div>
        </div>

        {/* Teams List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
            Các tổ chuyên môn ({teams.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {teams.map(t => {
              const members = empsOfTeam(t.id);
              const b = blink(t.id, 'today');
              return (
                <div
                  key={t.id}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <div>
                      <b className="text-white text-sm">{t.name}</b>
                      <div className="text-[11px] text-slate-400">
                        {members.length} nhân viên ·{' '}
                        {members.map(m => m.name.split(' ').pop()).join(', ')}
                      </div>
                    </div>
                  </div>

                  {b && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b === 'red'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {b === 'red' ? '🔴 Xử lý ngay' : '🟡 Kém nhất kỳ'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs">
          <button
            onClick={() => {
              onClose();
              onFocusZone(z.id);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Phóng to khu vực này</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => {
                onClose();
                onGoToTeamsManage();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Quản lý tổ
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
