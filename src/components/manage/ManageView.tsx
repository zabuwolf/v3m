import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ManageTab, Employee, Team, Candidate, Visitor } from '../../types';
import { D } from '../../utils/date';
import { N } from '../../utils/format';
import {
  LayoutDashboard,
  Users,
  Building,
  Clock,
  Palmtree,
  CheckSquare,
  Magnet,
  Coffee,
  Settings,
  Plus,
  Search,
  Download,
  Upload,
  RotateCcw,
  Check,
  X,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

interface ManageViewProps {
  onSelectEmployee: (empId: string) => void;
  onEditEmployee: (empId?: string | null) => void;
  initialTab?: ManageTab;
}

export const ManageView: React.FC<ManageViewProps> = ({
  onSelectEmployee,
  onEditEmployee,
  initialTab = 'dashboard',
}) => {
  const {
    db,
    emp,
    team,
    zone,
    teamsOf,
    shortName,
    activeEmps,
    empsOfDept,
    empsOfTeam,
    deptStats,
    teamStats,
    overviewStats,
    ranking,
    redTeams,
    reminderTeams,
    teamWarnings,
    todayStatus,
    checkIn,
    checkOut,
    markAllPresent,
    setAttendanceRecord,
    setLeaveStatus,
    deleteLeave,
    addLeave,
    addTask,
    moveTask,
    deleteTask,
    saveCandidate,
    setCandidateStage,
    deleteCandidate,
    hireCandidate,
    saveVisitor,
    deleteVisitor,
    saveTeam,
    deleteTeam,
    updateZone,
    deleteEmployee,
    updateCompany,
    updateRules,
    resetData,
    importJSON,
    exportJSON,
    addToast,
  } = useStore();

  const [currentTab, setCurrentTab] = useState<ManageTab>(initialTab);

  // Sub-state for attendance date
  const [attDate, setAttDate] = useState<string>(D.today());

  // Search & filter state
  const [empSearch, setEmpSearch] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('');

  // Modals inside manage
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [newLeave, setNewLeave] = useState({
    emp: activeEmps()[0]?.id || '',
    type: 'Nghỉ phép năm',
    from: D.today(),
    to: D.today(),
    reason: '',
  });

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    emp: activeEmps()[0]?.id || '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    due: D.addDays(D.today(), 3),
  });

  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Partial<Team> | null>(null);

  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<{ id: string; name: string; sub: string; icon: string; accent: string; color: string } | null>(null);

  const [candModalOpen, setCandModalOpen] = useState(false);
  const [editingCand, setEditingCand] = useState<Partial<Candidate> | null>(null);

  const [visitorModalOpen, setVisitorModalOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<{ index?: number; visitor: Visitor } | null>(null);

  // Tabs definitions
  const tabs = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'employees', label: 'Nhân sự', icon: Users },
    { id: 'teams', label: 'Phòng & Tổ', icon: Building },
    { id: 'attendance', label: 'Chấm công', icon: Clock },
    { id: 'leaves', label: 'Nghỉ phép', icon: Palmtree },
    { id: 'tasks', label: 'Công việc', icon: CheckSquare },
    { id: 'candidates', label: 'Tuyển dụng', icon: Magnet },
    { id: 'visitors', label: 'Khách mời', icon: Coffee },
    { id: 'data', label: 'Dữ liệu & Quy tắc', icon: Settings },
  ] as const;

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Mã NV',
      'Họ và tên',
      'Chức vụ',
      'Phòng ban',
      'Tổ công tác',
      'Giới tính',
      'Email',
      'Điện thoại',
      'Ngày vào làm',
      'Trạng thái',
      'Lương cơ bản',
    ];
    const rows = db.employees.map(e => [
      e.code || '',
      e.name,
      e.role,
      zone(e.dept)?.name || '',
      team(e.team)?.name || '',
      e.gender === 'M' ? 'Nam' : 'Nữ',
      e.email || '',
      e.phone || '',
      e.joinDate || '',
      e.status,
      e.salary || '',
    ]);

    const csvContent =
      '\uFEFF' + [headers, ...rows].map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `danh-sach-nhan-su-${D.today()}.csv`;
    link.click();
    addToast('Đã tải xuống file CSV nhân sự', 'success');
  };

  return (
    <div className="flex h-[calc(100vh-56px)] bg-slate-950 overflow-hidden text-slate-100">
      {/* Sidebar Tabs */}
      <aside className="w-56 bg-slate-900/80 border-r border-slate-800 p-3 space-y-1 overflow-y-auto shrink-0 select-none">
        <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
          QUẢN LÝ DOANH NGHIỆP
        </div>
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = currentTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setCurrentTab(t.id as ManageTab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Tab 1: Dashboard */}
        {currentTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-white">Tổng quan nhân sự & vận hành</h2>
              <p className="text-xs text-slate-400">
                Thống kê số liệu chấm công, xếp hạng tổ chuyên môn và cảnh báo định kỳ
              </p>
            </div>

            {/* KPI Cards */}
            {(() => {
              const ov = overviewStats('today');
              const wk = overviewStats('week');
              const mo = overviewStats('month');
              const pendingLeaves = db.leaves.filter(l => l.status === 'pending').length;
              const red = redTeams().length;

              return (
                <div className="grid grid-cols-6 gap-3">
                  <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                    <span className="text-[11px] text-slate-400">Tổng nhân sự</span>
                    <b className="text-2xl text-white block mt-0.5">{ov.headcount}</b>
                    <small className="text-[10px] text-slate-500">
                      {db.teams.length} tổ · {db.zones.length} khu
                    </small>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                    <span className="text-[11px] text-slate-400">Có mặt hôm nay</span>
                    <b className="text-2xl text-emerald-400 block mt-0.5">{ov.working}</b>
                    <small className="text-[10px] text-slate-500">
                      {ov.late} muộn · {ov.remote} từ xa
                    </small>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                    <span className="text-[11px] text-slate-400">Nghỉ hôm nay</span>
                    <b className="text-2xl text-rose-400 block mt-0.5">{ov.absent + ov.leave}</b>
                    <small className="text-[10px] text-slate-500">{ov.leave} có phép</small>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                    <span className="text-[11px] text-slate-400">Việc hoàn thành</span>
                    <b className="text-2xl text-sky-400 block mt-0.5">{ov.tasksDone}</b>
                    <small className="text-[10px] text-slate-500">
                      /{ov.tasksAssigned} ({N.pctS(ov.taskRate)})
                    </small>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                    <span className="text-[11px] text-slate-400">KPI Trung bình</span>
                    <b className="text-2xl text-amber-400 block mt-0.5">{mo.kpi || '–'}</b>
                    <small className="text-[10px] text-slate-500">Tuần này: {wk.kpi || '–'}</small>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                    <span className="text-[11px] text-slate-400">Cần xử lý</span>
                    <b className="text-2xl text-orange-400 block mt-0.5">{pendingLeaves}</b>
                    <small className="text-[10px] text-red-400">{red} tổ nháy đỏ</small>
                  </div>
                </div>
              );
            })()}

            {/* Split row: Ranking & Unchecked */}
            <div className="grid grid-cols-3 gap-6">
              {/* Ranking Table */}
              <div className="col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center justify-between">
                  <span>Bảng xếp hạng tổ · Tháng này</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 text-slate-400 text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Tổ</th>
                        <th className="py-2.5 px-3 text-center">KPI</th>
                        <th className="py-2.5 px-3 text-center">Việc xong</th>
                        <th className="py-2.5 px-3 text-center">Chuyên cần</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {ranking('month').map((r, i) => (
                        <tr key={r.team.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-bold text-slate-400">{i + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: r.team.color }}
                            />
                            <span>{r.team.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-amber-400">
                            {r.stats.kpi}
                          </td>
                          <td className="py-2.5 px-3 text-center text-sky-400">
                            {N.pctS(r.stats.taskRate)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-emerald-400">
                            {N.pctS(r.stats.attendanceRate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Unchecked employees list */}
              {(() => {
                const todayAtt = db.attendance.filter(a => a.date === D.today());
                const notIn = activeEmps().filter(
                  e => !todayAtt.find(a => a.emp === e.id && a.checkIn)
                );

                return (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center justify-between">
                        <span>Chưa check-in hôm nay</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          {notIn.length} người
                        </span>
                      </h3>
                      <div className="space-y-2 mt-3 max-h-72 overflow-y-auto pr-1">
                        {notIn.slice(0, 10).map(e => (
                          <div
                            key={e.id}
                            className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-semibold text-white">{e.name}</div>
                              <div className="text-[10px] text-slate-500">{team(e.team)?.name}</div>
                            </div>
                            <button
                              onClick={() => checkIn(e.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition"
                            >
                              Check-in
                            </button>
                          </div>
                        ))}
                        {notIn.length === 0 && (
                          <div className="py-6 text-center text-emerald-400 text-xs font-semibold">
                            ✓ Tất cả nhân viên đã check-in!
                          </div>
                        )}
                      </div>
                    </div>

                    {notIn.length > 0 && (
                      <button
                        onClick={() => markAllPresent()}
                        className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
                      >
                        ✓ Đánh dấu tất cả có mặt
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Tab 2: Employees */}
        {currentTab === 'employees' && (
          <div className="max-w-6xl mx-auto space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Danh sách nhân sự</h2>
                <p className="text-xs text-slate-400">
                  Quản lý hồ sơ nhân viên, mã số, vị trí công tác và thông tin liên hệ
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất CSV</span>
                </button>
                <button
                  onClick={() => onEditEmployee(null)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm nhân viên</span>
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  placeholder="🔍 Tìm theo tên, mã NV, chức vụ..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              </div>

              <select
                value={empDeptFilter}
                onChange={e => setEmpDeptFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">Tất cả phòng ban</option>
                {db.zones.map(z => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Mã</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Chức vụ</th>
                    <th className="py-3 px-4">Phòng ban</th>
                    <th className="py-3 px-4">Tổ công tác</th>
                    <th className="py-3 px-4 text-center">Hôm nay</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {db.employees
                    .filter(
                      e =>
                        (!empDeptFilter || e.dept === empDeptFilter) &&
                        (!empSearch.trim() ||
                          e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
                          e.role.toLowerCase().includes(empSearch.toLowerCase()) ||
                          (e.code && e.code.toLowerCase().includes(empSearch.toLowerCase())))
                    )
                    .map(e => {
                      const st = todayStatus(e.id);
                      const eTeam = team(e.team);
                      const z = zone(e.dept);
                      return (
                        <tr key={e.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono text-slate-400">{e.code}</td>
                          <td className="py-3 px-4 font-semibold text-white">
                            <button
                              onClick={() => onSelectEmployee(e.id)}
                              className="hover:text-indigo-400 hover:underline transition"
                            >
                              {e.name}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{e.role}</td>
                          <td className="py-3 px-4 text-slate-400">{z?.name}</td>
                          <td className="py-3 px-4 text-slate-300 flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: eTeam?.color }}
                            />
                            <span>{eTeam?.name}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                st === 'present'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : st === 'late'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : st === 'remote'
                                  ? 'bg-sky-500/20 text-sky-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {st === 'present'
                                ? 'Có mặt'
                                : st === 'late'
                                ? 'Muộn'
                                : st === 'remote'
                                ? 'Từ xa'
                                : 'Chưa chấm'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-400">
                            {{
                              active: 'Đang làm',
                              probation: 'Thử việc',
                              leave: 'Nghỉ dài hạn',
                              resigned: 'Đã nghỉ',
                            }[e.status] || e.status}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onEditEmployee(e.id)}
                                title="Sửa"
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Xoá hồ sơ nhân viên ${e.name}?`)) {
                                    deleteEmployee(e.id);
                                  }
                                }}
                                title="Xoá"
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Teams & Zones */}
        {currentTab === 'teams' && (
          <div className="max-w-6xl mx-auto space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Phòng ban & Tổ chuyên môn</h2>
                <p className="text-xs text-slate-400">
                  Quản lý phân khu văn phòng, thiết lập tổ làm việc và cán bộ phụ trách
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingTeam({ name: '', dept: db.zones[0]?.id || '', color: '#3b82f6' });
                  setTeamModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm tổ</span>
              </button>
            </div>

            <div className="space-y-4">
              {db.zones.map(z => {
                const teams = teamsOf(z.id);
                const s = deptStats(z.id, 'today');
                return (
                  <div
                    key={z.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3"
                    style={{ borderLeftColor: z.accent, borderLeftWidth: 4 }}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-1.5 rounded-xl bg-slate-950 border border-slate-800">
                          {z.icon}
                        </span>
                        <div>
                          <b className="text-sm text-white">{z.name}</b>
                          <div className="text-xs text-slate-400">{z.sub}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                          {s.headcount} nhân sự · {s.working} có mặt
                        </span>
                        <button
                          onClick={() => {
                            setEditingZone({ ...z });
                            setZoneModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
                        >
                          ✏️ Sửa khu
                        </button>
                      </div>
                    </div>

                    {/* Teams table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[11px] text-slate-400 border-b border-slate-800/60">
                          <tr>
                            <th className="py-2 px-3">Tổ</th>
                            <th className="py-2 px-3">Thành viên</th>
                            <th className="py-2 px-3 text-center">KPI tháng</th>
                            <th className="py-2 px-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {teams.map(t => {
                            const members = empsOfTeam(t.id);
                            const st = teamStats(t.id, 'month');
                            return (
                              <tr key={t.id} className="hover:bg-slate-800/30">
                                <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                                  <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: t.color }}
                                  />
                                  <span>{t.name}</span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-300">
                                  <div className="flex flex-wrap gap-1">
                                    {members.map(m => (
                                      <span
                                        key={m.id}
                                        className="px-2 py-0.5 rounded-md bg-slate-950 text-[11px] text-slate-300 border border-slate-800"
                                      >
                                        {shortName(m)}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold text-amber-400">
                                  {st.kpi || '–'}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingTeam({ ...t });
                                        setTeamModalOpen(true);
                                      }}
                                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Xoá tổ ${t.name}?`)) {
                                          deleteTeam(t.id);
                                        }
                                      }}
                                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Attendance */}
        {currentTab === 'attendance' && (
          <div className="max-w-6xl mx-auto space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Chấm công & Điểm danh</h2>
                <p className="text-xs text-slate-400">
                  Ghi nhận giờ vào, giờ ra, số giờ tăng ca (OT), việc hoàn thành và KPI
                </p>
              </div>

              {/* Date navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAttDate(D.addDays(attDate, -1))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={attDate}
                  onChange={e => setAttDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <button
                  onClick={() => setAttDate(D.addDays(attDate, 1))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setAttDate(D.today())}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                >
                  Hôm nay
                </button>
                <button
                  onClick={() => markAllPresent(attDate)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                >
                  ✓ Tất cả có mặt
                </button>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Tổ</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-center">Giờ vào</th>
                    <th className="py-3 px-4 text-center">Giờ ra</th>
                    <th className="py-3 px-4 text-center">OT (h)</th>
                    <th className="py-3 px-4 text-center">Việc xong / Giao</th>
                    <th className="py-3 px-4 text-center">KPI ngày</th>
                    <th className="py-3 px-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {activeEmps().map(e => {
                    const rec = db.attendance.find(a => a.emp === e.id && a.date === attDate);
                    return (
                      <tr key={e.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-semibold text-white">{e.name}</td>
                        <td className="py-2.5 px-4 text-slate-400">{team(e.team)?.name}</td>
                        <td className="py-2.5 px-4">
                          <select
                            value={rec?.status || ''}
                            onChange={ev =>
                              setAttendanceRecord(e.id, attDate, 'status', ev.target.value)
                            }
                            className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
                          >
                            <option value="">– Chưa chấm –</option>
                            <option value="present">Có mặt</option>
                            <option value="late">Đi muộn</option>
                            <option value="remote">Làm từ xa</option>
                            <option value="leave">Nghỉ phép</option>
                            <option value="absent">Vắng mặt</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="time"
                            value={rec?.checkIn || ''}
                            onChange={ev =>
                              setAttendanceRecord(e.id, attDate, 'checkIn', ev.target.value)
                            }
                            className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-xs text-center"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="time"
                            value={rec?.checkOut || ''}
                            onChange={ev =>
                              setAttendanceRecord(e.id, attDate, 'checkOut', ev.target.value)
                            }
                            className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-xs text-center"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={rec?.overtime ?? 0}
                            onChange={ev =>
                              setAttendanceRecord(e.id, attDate, 'overtime', Number(ev.target.value))
                            }
                            className="w-14 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-xs text-center"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={rec?.tasksDone ?? 0}
                              onChange={ev =>
                                setAttendanceRecord(e.id, attDate, 'tasksDone', Number(ev.target.value))
                              }
                              className="w-12 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-xs text-center text-sky-400 font-semibold"
                            />
                            <span className="text-slate-500">/</span>
                            <input
                              type="number"
                              min="0"
                              value={rec?.tasksAssigned ?? 0}
                              onChange={ev =>
                                setAttendanceRecord(
                                  e.id,
                                  attDate,
                                  'tasksAssigned',
                                  Number(ev.target.value)
                                )
                              }
                              className="w-12 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-xs text-center text-slate-400"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={rec?.kpi ?? ''}
                            onChange={ev =>
                              setAttendanceRecord(e.id, attDate, 'kpi', Number(ev.target.value))
                            }
                            className="w-14 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-xs text-center font-bold text-amber-400"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {!rec || !rec.checkIn ? (
                            <button
                              onClick={() => checkIn(e.id, attDate)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px]"
                            >
                              Vào
                            </button>
                          ) : !rec.checkOut ? (
                            <button
                              onClick={() => checkOut(e.id, attDate)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px]"
                            >
                              Ra
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Leaves */}
        {currentTab === 'leaves' && (
          <div className="max-w-6xl mx-auto space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Quản lý nghỉ phép</h2>
                <p className="text-xs text-slate-400">
                  Duyệt đơn xin nghỉ phép, nghỉ ốm, thai sản và cập nhật tự động bảng chấm công
                </p>
              </div>

              <button
                onClick={() => setLeaveModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo đơn nghỉ phép</span>
              </button>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Nhân viên</th>
                    <th className="py-3 px-4">Loại nghỉ</th>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4 text-center">Số ngày</th>
                    <th className="py-3 px-4">Lý do</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {db.leaves.map(l => {
                    const requester = emp(l.emp);
                    return (
                      <tr key={l.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-white">
                          {requester?.name || 'Nhân viên'}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{l.type}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {D.fmt(l.from)} → {D.fmt(l.to)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-indigo-400">{l.days}</td>
                        <td className="py-3 px-4 text-slate-400 italic">{l.reason || '–'}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              l.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : l.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {l.status === 'approved'
                              ? 'Đã duyệt'
                              : l.status === 'rejected'
                              ? 'Từ chối'
                              : 'Chờ duyệt'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {l.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => setLeaveStatus(l.id, 'approved')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                                >
                                  Duyệt
                                </button>
                                <button
                                  onClick={() => setLeaveStatus(l.id, 'rejected')}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 font-semibold text-[11px]"
                                >
                                  Từ chối
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setLeaveStatus(l.id, 'pending')}
                                title="Mở lại"
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px]"
                              >
                                ↺ Mở lại
                              </button>
                            )}
                            <button
                              onClick={() => deleteLeave(l.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: Tasks Kanban */}
        {currentTab === 'tasks' && (
          <div className="max-w-6xl mx-auto space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Bảng công việc (Kanban)</h2>
                <p className="text-xs text-slate-400">
                  Giao việc, theo dõi tiến độ và ghi nhận tỷ lệ hoàn thành KPI nhân sự
                </p>
              </div>

              <button
                onClick={() => setTaskModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Giao việc mới</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {(['todo', 'doing', 'done'] as const).map(colKey => {
                const colTitle = {
                  todo: 'Cần làm',
                  doing: 'Đang thực hiện',
                  done: 'Đã hoàn thành',
                }[colKey];

                const colTasks = db.tasks.filter(t => t.status === colKey);

                return (
                  <div
                    key={colKey}
                    className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <b className="text-sm text-white font-bold">{colTitle}</b>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                      {colTasks.map(t => {
                        const assignee = emp(t.emp);
                        const isLate = t.status !== 'done' && t.due < D.today();
                        return (
                          <div
                            key={t.id}
                            className={`p-3 rounded-2xl bg-slate-950/80 border space-y-2 text-xs transition ${
                              isLate
                                ? 'border-red-800/80 bg-red-950/20'
                                : 'border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="font-semibold text-white leading-snug">{t.title}</div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>👤 {assignee?.name || 'Nhân viên'}</span>
                              <span className={isLate ? 'text-red-400 font-semibold' : ''}>
                                {isLate ? '⚠ Hạn ' : 'Hạn '}
                                {D.fmt(t.due)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                              <div className="flex gap-1">
                                {colKey !== 'todo' && (
                                  <button
                                    onClick={() =>
                                      moveTask(t.id, colKey === 'done' ? 'doing' : 'todo')
                                    }
                                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]"
                                  >
                                    ←
                                  </button>
                                )}
                                {colKey !== 'done' && (
                                  <button
                                    onClick={() =>
                                      moveTask(t.id, colKey === 'todo' ? 'doing' : 'done')
                                    }
                                    className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-semibold"
                                  >
                                    {colKey === 'todo' ? 'Bắt đầu →' : 'Xong ✓'}
                                  </button>
                                )}
                              </div>
                              <button
                                onClick={() => deleteTask(t.id)}
                                className="text-slate-500 hover:text-rose-400 p-0.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 7: Candidates */}
        {currentTab === 'candidates' && (
          <div className="max-w-6xl mx-auto space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Quy trình tuyển dụng</h2>
                <p className="text-xs text-slate-400">
                  Theo dõi hồ sơ ứng viên, các vòng phỏng vấn và chuyển thành nhân viên chính thức
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCand({ name: '', role: '', source: 'LinkedIn', applied: D.today(), stage: 'Mới nộp' });
                  setCandModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm ứng viên</span>
              </button>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Ứng viên</th>
                    <th className="py-3 px-4">Vị trí ứng tuyển</th>
                    <th className="py-3 px-4">Nguồn tuyển</th>
                    <th className="py-3 px-4">Ngày nộp</th>
                    <th className="py-3 px-4">Giai đoạn</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {db.candidates.map(c => {
                    const stages = [
                      'Mới nộp',
                      'Sàng lọc',
                      'Phỏng vấn 1',
                      'Phỏng vấn 2',
                      'Đề nghị',
                      'Từ chối',
                      'Đã nhận',
                    ];
                    return (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-white">{c.name}</td>
                        <td className="py-3 px-4 text-slate-300">{c.role}</td>
                        <td className="py-3 px-4 text-slate-400">{c.source}</td>
                        <td className="py-3 px-4 text-slate-400">{D.fmtFull(c.applied)}</td>
                        <td className="py-3 px-4">
                          <select
                            value={c.stage}
                            onChange={e => setCandidateStage(c.id, e.target.value)}
                            className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
                          >
                            {stages.map(s => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(c.stage === 'Đề nghị' || c.stage === 'Đã nhận') && (
                              <button
                                onClick={() =>
                                  hireCandidate(c.id, {
                                    name: c.name,
                                    role: c.role,
                                    team: db.teams[0]?.id,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                              >
                                → Nhận việc
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingCand({ ...c });
                                setCandModalOpen(true);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-white"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteCandidate(c.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 8: Visitors */}
        {currentTab === 'visitors' && (
          <div className="max-w-6xl mx-auto space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Khách mời & Đối tác</h2>
                <p className="text-xs text-slate-400">
                  Lịch đón tiếp khách mời, đối tác ghé thăm và giao lưu tại quầy Café
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingVisitor({ visitor: { name: '', org: '', date: D.today() } });
                  setVisitorModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm khách mời</span>
              </button>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Đơn vị / Tổ chức</th>
                    <th className="py-3 px-4">Ngày ghé thăm</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {db.visitors.map((v, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-white">{v.name}</td>
                      <td className="py-3 px-4 text-slate-300">{v.org || '–'}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {D.fmtFull(v.date)}
                        {v.date === D.today() && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[10px]">
                            Hôm nay
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingVisitor({ index: i, visitor: { ...v } });
                              setVisitorModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteVisitor(i)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 9: Data & Rules */}
        {currentTab === 'data' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-white">Dữ liệu & Quy tắc vận hành</h2>
              <p className="text-xs text-slate-400">
                Cấu hình thông số cảnh báo nhấp nháy 3D, sao lưu và khôi phục dữ liệu
              </p>
            </div>

            {/* Company Info */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">Thông tin công ty</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="space-y-1">
                  <span className="text-slate-400">Tên doanh nghiệp</span>
                  <input
                    type="text"
                    value={db.company.name}
                    onChange={e => updateCompany({ name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400">Tên viết tắt</span>
                  <input
                    type="text"
                    value={db.company.short}
                    onChange={e => updateCompany({ short: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </label>
                <label className="col-span-2 space-y-1">
                  <span className="text-slate-400">Slogan / Khẩu hiệu</span>
                  <input
                    type="text"
                    value={db.company.slogan}
                    onChange={e => updateCompany({ slogan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </label>
              </div>
            </div>

            {/* Rules Configuration */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">
                Ngưỡng cảnh báo hiệu suất ({db.rules.windowDays} ngày)
              </h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <label className="space-y-1">
                  <span className="text-slate-400">Đi muộn tối đa (%)</span>
                  <input
                    type="number"
                    value={db.rules.lateRate}
                    onChange={e => updateRules({ lateRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400">Chuyên cần tối thiểu (%)</span>
                  <input
                    type="number"
                    value={db.rules.attendanceRate}
                    onChange={e => updateRules({ attendanceRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400">Hoàn thành việc tối thiểu (%)</span>
                  <input
                    type="number"
                    value={db.rules.taskRate}
                    onChange={e => updateRules({ taskRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400">Điểm KPI tối thiểu</span>
                  <input
                    type="number"
                    value={db.rules.kpiMin}
                    onChange={e => updateRules({ kpiMin: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400">Số cảnh báo để nháy đỏ</span>
                  <input
                    type="number"
                    value={db.rules.redMinWarnings}
                    onChange={e => updateRules({ redMinWarnings: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400">Cửa sổ tính toán (ngày)</span>
                  <input
                    type="number"
                    value={db.rules.windowDays}
                    onChange={e => updateRules({ windowDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </label>
              </div>
            </div>

            {/* Backup & Reset */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">Sao lưu & Khôi phục</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportJSON}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất file JSON</span>
                </button>

                <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  <span>Nhập file JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    hidden
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => {
                        try {
                          const data = JSON.parse(ev.target?.result as string);
                          importJSON(data);
                        } catch (_) {
                          addToast('Lỗi đọc file JSON', 'warn');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>

                <button
                  onClick={() => {
                    if (confirm('Khôi phục toàn bộ dữ liệu mẫu ban đầu?')) {
                      resetData();
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold border border-rose-800 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Khôi phục dữ liệu gốc</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sub-modals for Leave, Task, Team, Zone, Candidate, Visitor */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-base">Tạo đơn nghỉ phép</h3>
              <button onClick={() => setLeaveModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                const days = Math.max(
                  1,
                  Math.round(
                    (new Date(newLeave.to).getTime() - new Date(newLeave.from).getTime()) /
                      (1000 * 3600 * 24)
                  ) + 1
                );
                addLeave({ ...newLeave, days, status: 'pending' });
                setLeaveModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <label className="space-y-1 block">
                <span className="text-slate-400">Nhân viên</span>
                <select
                  value={newLeave.emp}
                  onChange={e => setNewLeave({ ...newLeave, emp: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                >
                  {activeEmps().map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="text-slate-400">Loại nghỉ</span>
                <select
                  value={newLeave.type}
                  onChange={e => setNewLeave({ ...newLeave, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                >
                  <option value="Nghỉ phép năm">Nghỉ phép năm</option>
                  <option value="Nghỉ ốm">Nghỉ ốm</option>
                  <option value="Việc riêng">Việc riêng</option>
                  <option value="Nghỉ thai sản">Nghỉ thai sản</option>
                  <option value="Nghỉ không lương">Nghỉ không lương</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 block">
                  <span className="text-slate-400">Từ ngày</span>
                  <input
                    type="date"
                    required
                    value={newLeave.from}
                    onChange={e => setNewLeave({ ...newLeave, from: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-slate-400">Đến ngày</span>
                  <input
                    type="date"
                    required
                    value={newLeave.to}
                    onChange={e => setNewLeave({ ...newLeave, to: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-slate-400">Lý do nghỉ</span>
                <textarea
                  rows={2}
                  value={newLeave.reason}
                  onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLeaveModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold"
                >
                  Gửi đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-base">Giao công việc mới</h3>
              <button onClick={() => setTaskModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                addTask({ ...newTask, status: 'todo' });
                setTaskModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <label className="space-y-1 block">
                <span className="text-slate-400">Tiêu đề công việc *</span>
                <input
                  required
                  type="text"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-slate-400">Giao cho nhân viên *</span>
                <select
                  value={newTask.emp}
                  onChange={e => setNewTask({ ...newTask, emp: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                >
                  {activeEmps().map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({team(e.team)?.name})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 block">
                  <span className="text-slate-400">Mức ưu tiên</span>
                  <select
                    value={newTask.priority}
                    onChange={e =>
                      setNewTask({
                        ...newTask,
                        priority: e.target.value as 'low' | 'normal' | 'high',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                  >
                    <option value="low">Thấp</option>
                    <option value="normal">Bình thường</option>
                    <option value="high">Cao (Gấp 🔥)</option>
                  </select>
                </label>

                <label className="space-y-1 block">
                  <span className="text-slate-400">Hạn chót</span>
                  <input
                    type="date"
                    required
                    value={newTask.due}
                    onChange={e => setNewTask({ ...newTask, due: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold"
                >
                  Giao việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {teamModalOpen && editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-base">
                {editingTeam.id ? 'Sửa thông tin tổ' : 'Thêm tổ mới'}
              </h3>
              <button onClick={() => setTeamModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                saveTeam(editingTeam);
                setTeamModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <label className="space-y-1 block">
                <span className="text-slate-400">Tên tổ *</span>
                <input
                  required
                  type="text"
                  value={editingTeam.name || ''}
                  onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-slate-400">Phòng ban phụ thuộc</span>
                <select
                  value={editingTeam.dept || ''}
                  onChange={e => setEditingTeam({ ...editingTeam, dept: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                >
                  {db.zones.map(z => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="text-slate-400">Màu sắc nhận diện</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingTeam.color || '#3b82f6'}
                    onChange={e => setEditingTeam({ ...editingTeam, color: e.target.value })}
                    className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                  />
                  <span className="font-mono text-xs">{editingTeam.color}</span>
                </div>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTeamModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {zoneModalOpen && editingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-base">Sửa thông tin khu vực</h3>
              <button onClick={() => setZoneModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                updateZone(editingZone.id, editingZone);
                setZoneModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <label className="space-y-1 block">
                <span className="text-slate-400">Tên khu vực *</span>
                <input
                  required
                  type="text"
                  value={editingZone.name}
                  onChange={e => setEditingZone({ ...editingZone, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-slate-400">Mô tả</span>
                <input
                  type="text"
                  value={editingZone.sub}
                  onChange={e => setEditingZone({ ...editingZone, sub: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 block">
                  <span className="text-slate-400">Icon Emoji</span>
                  <input
                    type="text"
                    value={editingZone.icon}
                    onChange={e => setEditingZone({ ...editingZone, icon: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-center text-lg"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-slate-400">Màu nhấn viền</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingZone.accent}
                      onChange={e => setEditingZone({ ...editingZone, accent: e.target.value })}
                      className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                    />
                    <span className="font-mono text-xs">{editingZone.accent}</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setZoneModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {candModalOpen && editingCand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-base">
                {editingCand.id ? 'Sửa ứng viên' : 'Thêm ứng viên'}
              </h3>
              <button onClick={() => setCandModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                saveCandidate(editingCand);
                setCandModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <label className="space-y-1 block">
                <span className="text-slate-400">Họ và tên *</span>
                <input
                  required
                  type="text"
                  value={editingCand.name || ''}
                  onChange={e => setEditingCand({ ...editingCand, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-slate-400">Vị trí ứng tuyển *</span>
                <input
                  required
                  type="text"
                  value={editingCand.role || ''}
                  onChange={e => setEditingCand({ ...editingCand, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 block">
                  <span className="text-slate-400">Nguồn tuyển dụng</span>
                  <input
                    type="text"
                    value={editingCand.source || ''}
                    onChange={e => setEditingCand({ ...editingCand, source: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-slate-400">Ngày nộp</span>
                  <input
                    type="date"
                    value={editingCand.applied || D.today()}
                    onChange={e => setEditingCand({ ...editingCand, applied: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCandModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {visitorModalOpen && editingVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-base">
                {editingVisitor.index != null ? 'Sửa thông tin khách' : 'Thêm khách mời'}
              </h3>
              <button onClick={() => setVisitorModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                saveVisitor(editingVisitor.visitor, editingVisitor.index);
                setVisitorModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <label className="space-y-1 block">
                <span className="text-slate-400">Tên khách mời *</span>
                <input
                  required
                  type="text"
                  placeholder="Ví dụ: Anh Khải"
                  value={editingVisitor.visitor.name}
                  onChange={e =>
                    setEditingVisitor({
                      ...editingVisitor,
                      visitor: { ...editingVisitor.visitor, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-slate-400">Đơn vị / Công ty</span>
                <input
                  type="text"
                  value={editingVisitor.visitor.org || ''}
                  onChange={e =>
                    setEditingVisitor({
                      ...editingVisitor,
                      visitor: { ...editingVisitor.visitor, org: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-slate-400">Ngày đến thăm</span>
                <input
                  type="date"
                  value={editingVisitor.visitor.date}
                  onChange={e =>
                    setEditingVisitor({
                      ...editingVisitor,
                      visitor: { ...editingVisitor.visitor, date: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVisitorModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
