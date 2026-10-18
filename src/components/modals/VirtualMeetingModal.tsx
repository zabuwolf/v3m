import React from 'react';
import { useStore } from '../../context/StoreContext';
import { D } from '../../utils/date';
import {
  X,
  Video,
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  Trash2,
  Play,
  RotateCcw,
  Sparkles,
  MapPin,
  ExternalLink,
} from 'lucide-react';

interface VirtualMeetingModalProps {
  zoneId: string;
  onClose: () => void;
  onFocusDesk?: (empId: string) => void;
  onSelectEmployee?: (empId: string) => void;
}

export const VirtualMeetingModal: React.FC<VirtualMeetingModalProps> = ({
  zoneId,
  onClose,
  onFocusDesk,
  onSelectEmployee,
}) => {
  const { db, deleteVirtualMeetingZone, toggleMeetingAttendance, todayStatus, team, activeEmps } = useStore();

  const z = db.zones.find(x => x.id === zoneId);
  if (!z) return null;

  const meeting = (db.meetings || []).find(m => m.id === z.meetingId || m.virtualZoneId === z.id);
  const attendees = meeting?.attendees || [];
  const attendeeEmps = activeEmps().filter(e => attendees.includes(e.id));

  const typeLabelMap: Record<string, { label: string; icon: string; color: string }> = {
    sprint: { label: 'Sprint & Kế Hoạch 3D', icon: '⚡', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
    allhands: { label: 'Toàn Thể Công Ty (All-Hands)', icon: '🚀', color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30' },
    standup: { label: 'Daily Standup Nhanh', icon: '⏱️', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    client: { label: 'Đối Tác & Khách Hàng', icon: '🤝', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    review: { label: 'Đánh Giá & Review AI', icon: '💡', color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
    internal: { label: 'Nội Bộ Phòng Ban', icon: '🏢', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
  };

  const typeInfo = meeting?.type ? typeLabelMap[meeting.type] || typeLabelMap.internal : typeLabelMap.internal;

  const handleDeleteZone = () => {
    if (confirm(`Bạn có chắc chắn muốn đóng phòng họp ảo "${z.name}" khỏi bản đồ 3D?`)) {
      deleteVirtualMeetingZone(z.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg"
              style={{
                backgroundColor: z.accent || '#8b5cf6',
                boxShadow: `0 10px 25px ${z.accent || '#8b5cf6'}40`,
              }}
            >
              {z.icon || '🌐'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{z.name}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold uppercase">
                  3D Virtual Zone
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Vị trí tọa độ 3D: [{z.x}, {z.y}] · Kích thước: {z.w} × {z.h} ô
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meeting Information Card */}
        {meeting ? (
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-xl border font-semibold flex items-center gap-1.5 ${typeInfo.color}`}>
                <span>{typeInfo.icon}</span>
                <span>{typeInfo.label}</span>
              </span>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{D.fmtFull(meeting.date)}</span>
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-indigo-300 flex items-center gap-1 font-bold">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{meeting.time}</span>
                </span>
              </div>
            </div>

            <h3 className="text-base font-bold text-white">{meeting.title}</h3>

            {meeting.notes && (
              <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                {meeting.notes}
              </p>
            )}

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
              <span className="text-slate-400">Trạng thái cuộc họp:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                  meeting.status === 'in-progress'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                    : meeting.status === 'completed'
                    ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                }`}
              >
                {meeting.status === 'in-progress'
                  ? '🟢 Đang diễn ra trực tiếp'
                  : meeting.status === 'completed'
                  ? '✓ Đã hoàn thành'
                  : '🔵 Đã lên lịch'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400">
            Phòng họp ảo đang ở trạng thái chờ kết nối.
          </div>
        )}

        {/* Attendees Roster */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Thành viên tham dự ({attendeeEmps.length} nhân sự)</span>
            </span>
            <span className="text-[11px] text-slate-400">Đang có mặt trong phòng 3D</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {attendeeEmps.map(empItem => {
              const empTeam = team(empItem.team);
              const st = todayStatus(empItem.id);

              return (
                <div
                  key={empItem.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: empTeam?.color || '#6366f1' }}
                    >
                      {empItem.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-xs text-white truncate">
                        {empItem.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {empItem.role} · {empTeam?.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onClose();
                        onSelectEmployee?.(empItem.id);
                      }}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] transition"
                      title="Xem hồ sơ nhân sự"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleDeleteZone}
            className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Đóng / Xóa phòng họp ảo</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
