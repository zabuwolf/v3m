import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { D } from '../../utils/date';
import { N } from '../../utils/format';
import {
  X,
  Clock,
  Calendar,
  CheckSquare,
  AlertCircle,
  Edit,
  MapPin,
  Video,
  Users,
  CheckCircle2,
  Activity,
  ChevronDown,
  ChevronUp,
  Briefcase,
  LogIn,
} from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'checkin' | 'task' | 'meeting';
  date: string;
  time: string;
  sortKey: string;
  title: string;
  categoryLabel: string;
  isToday: boolean;
  statusBadge: { label: string; color: string };
  priorityBadge?: { label: string; color: string };
  details: string;
}

interface EmployeeModalProps {
  empId: string;
  onClose: () => void;
  onEdit: (empId: string) => void;
  onFocusDesk: (empId: string) => void;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  empId,
  onClose,
  onEdit,
  onFocusDesk,
}) => {
  const {
    emp,
    team,
    zone,
    empStats,
    todayStatus,
    checkIn,
    checkOut,
    db,
    toggleTask,
    addToast,
    empMeetings,
  } = useStore();

  const e = emp(empId);
  if (!e) return null;

  const eTeam = team(e.team);
  const z = zone(e.dept);
  const st = todayStatus(e.id);
  const todayRec = db.attendance.find(a => a.emp === e.id && a.date === D.today());

  const periods = ['today', 'week', 'month', '90d'] as const;
  const stats = periods.map(p => ({
    key: p,
    label: D.range(p).label,
    s: empStats(e.id, p),
  }));

  const userTasks = db.tasks.filter(t => t.emp === e.id);
  const userLeaves = db.leaves.filter(l => l.emp === e.id);
  const warnings = stats[3].s.warnings || [];

  // Recent Activity Timeline Data (Check-ins, Tasks Completed, Meeting Attendance)
  const [activityFilter, setActivityFilter] = useState<'all' | 'checkin' | 'task' | 'meeting'>('all');
  const [showAllActivities, setShowAllActivities] = useState(false);

  // 1. Employee check-in & check-out attendance records
  const userAttendanceActivities = useMemo<ActivityItem[]>(() => {
    return db.attendance
      .filter(a => a.emp === e.id && (a.checkIn || a.status !== 'absent'))
      .map(a => {
        const isLate = a.status === 'late';
        const isRemote = a.status === 'remote';
        const isToday = a.date === D.today();
        return {
          id: `act-att-${a.id || a.date}`,
          type: 'checkin' as const,
          date: a.date,
          time: a.checkIn || '–',
          sortKey: `${a.date} ${a.checkIn || '00:00'}`,
          title: isRemote
            ? 'Check-in làm việc từ xa (Remote)'
            : isLate
            ? 'Check-in ca làm việc (Đi muộn)'
            : 'Check-in ca làm việc (Đúng giờ)',
          categoryLabel: 'Chấm công',
          isToday,
          statusBadge: {
            label: isLate ? 'Đi muộn' : isRemote ? 'Làm từ xa' : 'Đúng giờ',
            color: isLate
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : isRemote
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          },
          details: `Giờ vào: ${a.checkIn || '–'}${a.checkOut ? ` · Giờ ra: ${a.checkOut}` : isToday ? ' · Đang làm việc' : ''}${
            a.overtime ? ` · Tăng ca (OT): +${a.overtime}h` : ''
          }${a.tasksDone ? ` · Hoàn thành: ${a.tasksDone}/${a.tasksAssigned || a.tasksDone} việc` : ''}`,
        };
      });
  }, [db.attendance, e.id]);

  // 2. Tasks completed by the employee
  const userCompletedTaskActivities = useMemo<ActivityItem[]>(() => {
    return db.tasks
      .filter(t => t.emp === e.id && t.status === 'done')
      .map(t => {
        const priorityLabel =
          t.priority === 'high' ? 'Ưu tiên cao' : t.priority === 'normal' ? 'Bình thường' : 'Thấp';
        const priorityColor =
          t.priority === 'high'
            ? 'bg-red-500/20 text-red-300 border-red-500/30'
            : t.priority === 'normal'
            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            : 'bg-slate-500/20 text-slate-300 border-slate-500/30';
        return {
          id: `act-task-${t.id}`,
          type: 'task' as const,
          date: t.created || t.due || D.today(),
          time: 'Đã hoàn thành',
          sortKey: `${t.due || D.today()} 18:00`,
          title: `Hoàn thành công việc: "${t.title}"`,
          categoryLabel: 'Nhiệm vụ',
          isToday: (t.created || t.due) === D.today(),
          statusBadge: {
            label: 'Đã hoàn thành',
            color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          },
          priorityBadge: {
            label: priorityLabel,
            color: priorityColor,
          },
          details: `Hạn chót: ${D.fmt(t.due)} · Trạng thái: Đã hoàn thành`,
        };
      });
  }, [db.tasks, e.id]);

  // 3. Meeting attendance by the employee
  const userMeetingActivities = useMemo<ActivityItem[]>(() => {
    const list = empMeetings
      ? empMeetings(e.id)
      : (db.meetings || []).filter(m => m.attendees && m.attendees.includes(e.id));
    const typeLabelMap: Record<string, string> = {
      allhands: 'Toàn công ty (All-hands)',
      sprint: 'Họp Sprint & Kế hoạch',
      standup: 'Daily Standup',
      client: 'Đối tác & Khách hàng',
      review: 'Đánh giá & Review',
      internal: 'Nội bộ phòng ban',
    };
    return list.map(m => {
      return {
        id: `act-meet-${m.id}`,
        type: 'meeting' as const,
        date: m.date,
        time: m.time,
        sortKey: `${m.date} ${m.time.split('-')[0].trim()}`,
        title: `Tham gia cuộc họp: "${m.title}"`,
        categoryLabel: 'Cuộc họp',
        isToday: m.date === D.today(),
        statusBadge: {
          label: m.status === 'completed' ? 'Đã tham gia' : 'Đã lên lịch',
          color:
            m.status === 'completed'
              ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
              : 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        },
        typeLabel: m.type ? typeLabelMap[m.type] || m.type : 'Họp ban',
        details: `Địa điểm: ${m.room || 'Phòng họp nội bộ'}${
          m.type ? ` · ${typeLabelMap[m.type] || m.type}` : ''
        }${m.notes ? ` · ${m.notes}` : ''}`,
      };
    });
  }, [empMeetings, db.meetings, e.id]);

  // Combined timeline sorted chronologically descending (newest first)
  const allTimelineActivities = useMemo<ActivityItem[]>(() => {
    const combined = [
      ...userAttendanceActivities,
      ...userCompletedTaskActivities,
      ...userMeetingActivities,
    ];
    return combined.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [userAttendanceActivities, userCompletedTaskActivities, userMeetingActivities]);

  const filteredActivities = useMemo<ActivityItem[]>(() => {
    if (activityFilter === 'checkin') return allTimelineActivities.filter(a => a.type === 'checkin');
    if (activityFilter === 'task') return allTimelineActivities.filter(a => a.type === 'task');
    if (activityFilter === 'meeting') return allTimelineActivities.filter(a => a.type === 'meeting');
    return allTimelineActivities;
  }, [allTimelineActivities, activityFilter]);

  const displayedActivities = showAllActivities ? filteredActivities : filteredActivities.slice(0, 5);

  const statusMap: Record<string, { label: string; color: string }> = {
    present: { label: 'Có mặt', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    late: { label: 'Đi muộn', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    remote: { label: 'Làm từ xa', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
    leave: { label: 'Nghỉ phép', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    absent: { label: 'Vắng mặt', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    none: { label: 'Chưa chấm công', color: 'bg-slate-700/50 text-slate-400 border-slate-600' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-extrabold text-white text-xl shadow-lg shadow-indigo-500/25">
              {e.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{e.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 font-mono text-slate-400 border border-slate-700">
                  {e.code}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                {e.role} · <span style={{ color: eTeam?.color }}>{eTeam?.name}</span> · {z?.name}
              </p>
              <div className="text-xs text-slate-500 mt-0.5">
                {e.email || 'email@company.vn'} · {e.phone || '0988 123 456'} · Vào làm:{' '}
                {D.fmtFull(e.joinDate || '')}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Check-in Bar */}
        <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-slate-400">Hôm nay ({D.fmtFull(D.today())}):</span>
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                statusMap[st]?.color || statusMap.none.color
              }`}
            >
              {statusMap[st]?.label || 'Chưa chấm công'}
            </span>
            {todayRec?.checkIn && (
              <span className="text-slate-400 text-[11px]">
                Vào: <b>{todayRec.checkIn}</b>
                {todayRec.checkOut && (
                  <>
                    {' '}
                    · Ra: <b>{todayRec.checkOut}</b>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!todayRec || !todayRec.checkIn ? (
              <button
                onClick={() => checkIn(e.id)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 transition"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Check-in</span>
              </button>
            ) : !todayRec.checkOut ? (
              <button
                onClick={() => checkOut(e.id)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-1 transition"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Check-out</span>
              </button>
            ) : null}

            <button
              onClick={() => {
                onClose();
                onFocusDesk(e.id);
              }}
              title="Đưa góc nhìn camera tới bàn của nhân viên"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1 transition"
            >
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tới bàn</span>
            </button>

            <button
              onClick={() => onEdit(e.id)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Sửa hồ sơ"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Kỳ báo cáo</th>
                <th className="py-2.5 px-3 text-center">Công</th>
                <th className="py-2.5 px-3 text-center">Có mặt</th>
                <th className="py-2.5 px-3 text-center">Muộn</th>
                <th className="py-2.5 px-3 text-center">Việc xong</th>
                <th className="py-2.5 px-3 text-center">KPI TB</th>
                <th className="py-2.5 px-3 text-center">Tăng ca (OT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stats.map(row => (
                <tr key={row.key} className="hover:bg-slate-800/40">
                  <td className="py-2 px-3 font-semibold text-slate-200">{row.label}</td>
                  <td className="py-2 px-3 text-center">{row.s.days}</td>
                  <td className="py-2 px-3 text-center text-emerald-400">{row.s.working}</td>
                  <td className="py-2 px-3 text-center text-amber-400">{row.s.late}</td>
                  <td className="py-2 px-3 text-center text-sky-400">
                    {row.s.tasksDone}/{row.s.tasksAssigned}
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-amber-400">
                    {row.s.kpi || '–'}
                  </td>
                  <td className="py-2 px-3 text-center">{row.s.overtime}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Warnings or OK */}
        {warnings.length > 0 ? (
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-2xl text-xs space-y-1">
            <b className="text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Cảnh báo hiệu suất 30 ngày ({warnings.length} tiêu chí):</span>
            </b>
            <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
              {warnings.map((w, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{w.label}:</span>
                  <b className="text-red-300">
                    {w.value}
                    {w.unit} ({w.threshold})
                  </b>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl text-xs text-emerald-400 font-medium">
            ✓ Không có cảnh báo hiệu suất trong 30 ngày qua
          </div>
        )}

        {/* Recent Activity Panel */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3.5">
          {/* Panel Header & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                    Hoạt động gần đây (Recent Activity)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {allTimelineActivities.length} sự kiện
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Dòng thời gian chấm công, nhiệm vụ hoàn thành và tham gia cuộc họp
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setActivityFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activityFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tất cả ({allTimelineActivities.length})
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('checkin')}
                className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                  activityFilter === 'checkin'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Check-in ({userAttendanceActivities.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('task')}
                className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                  activityFilter === 'task'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-sky-300'
                }`}
              >
                <CheckSquare className="w-3 h-3" />
                <span>Việc xong ({userCompletedTaskActivities.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('meeting')}
                className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                  activityFilter === 'meeting'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-violet-300'
                }`}
              >
                <Video className="w-3 h-3" />
                <span>Cuộc họp ({userMeetingActivities.length})</span>
              </button>
            </div>
          </div>

          {/* Timeline Feed */}
          {displayedActivities.length > 0 ? (
            <div className="relative pl-3 pt-1 space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {displayedActivities.map((act, index) => {
                const isLast = index === displayedActivities.length - 1;
                return (
                  <div key={act.id} className="relative pl-6 pb-2 group">
                    {/* Connecting Vertical Line */}
                    {!isLast && (
                      <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-slate-800 group-hover:bg-slate-700 transition" />
                    )}

                    {/* Timeline Node Badge */}
                    <div
                      className={`absolute left-0 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border shadow-sm ${
                        act.type === 'checkin'
                          ? 'bg-emerald-950 border-emerald-500/50 text-emerald-400'
                          : act.type === 'task'
                          ? 'bg-sky-950 border-sky-500/50 text-sky-400'
                          : 'bg-violet-950 border-violet-500/50 text-violet-400'
                      }`}
                    >
                      {act.type === 'checkin' && <Clock className="w-2.5 h-2.5" />}
                      {act.type === 'task' && <CheckCircle2 className="w-2.5 h-2.5" />}
                      {act.type === 'meeting' && <Video className="w-2.5 h-2.5" />}
                    </div>

                    {/* Event Content Card */}
                    <div className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-xl p-2.5 transition text-xs shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              act.type === 'checkin'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : act.type === 'task'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                            }`}
                          >
                            {act.categoryLabel}
                          </span>

                          <span className="text-[11px] font-mono text-slate-300">
                            {act.isToday ? (
                              <b className="text-amber-400 font-medium">Hôm nay</b>
                            ) : (
                              `${D.weekday(act.date)}, ${D.fmt(act.date)}`
                            )}
                          </span>

                          <span className="text-[10px] text-slate-500">· {act.time}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {act.priorityBadge && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${act.priorityBadge.color}`}
                            >
                              {act.priorityBadge.label}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${act.statusBadge.color}`}
                          >
                            {act.statusBadge.label}
                          </span>
                        </div>
                      </div>

                      <div className="font-semibold text-slate-100 leading-snug">
                        {act.title}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {act.details}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800/60">
              Không có sự kiện nào trong danh mục này
            </div>
          )}

          {/* Expand / Collapse Button */}
          {filteredActivities.length > 5 && (
            <div className="pt-0.5 text-center">
              <button
                type="button"
                onClick={() => setShowAllActivities(!showAllActivities)}
                className="px-3 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-700/80 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                {showAllActivities ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Thu gọn hoạt động</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Xem thêm {filteredActivities.length - 5} hoạt động trước đó</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Tasks & Leaves section */}
        <div className="grid grid-cols-2 gap-4">
          {/* Tasks */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Công việc phụ trách ({userTasks.length})</span>
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {userTasks.length > 0 ? (
                userTasks.map(t => (
                  <label
                    key={t.id}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs hover:bg-slate-800/60 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={t.status === 'done'}
                      onChange={() => toggleTask(t.id)}
                      className="rounded accent-indigo-600"
                    />
                    <span
                      className={`flex-1 truncate ${
                        t.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'
                      }`}
                    >
                      {t.title}
                    </span>
                    <span className="text-[10px] text-slate-500">{D.fmt(t.due)}</span>
                  </label>
                ))
              ) : (
                <div className="text-xs text-slate-500 py-3 text-center">Chưa có công việc nào</div>
              )}
            </div>
          </div>

          {/* Leaves */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Lịch sử nghỉ phép ({userLeaves.length})</span>
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {userLeaves.length > 0 ? (
                userLeaves.map(l => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
                  >
                    <div>
                      <div className="text-slate-200 font-medium">{l.type}</div>
                      <div className="text-[10px] text-slate-500">
                        {D.fmt(l.from)} - {D.fmt(l.to)} ({l.days} ngày)
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        l.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : l.status === 'rejected'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {l.status === 'approved'
                        ? 'Đã duyệt'
                        : l.status === 'rejected'
                        ? 'Từ chối'
                        : 'Chờ duyệt'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 py-3 text-center">Chưa có đơn nghỉ nào</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
