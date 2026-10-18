import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import initialSeed from '../data/seedData.json';
import {
  Database,
  Employee,
  Team,
  Zone,
  StatsSummary,
  WarningItem,
  RankedTeam,
  ChampionInfo,
  WorstInfo,
  Attendance,
  LeaveRequest,
  TaskItem,
  Candidate,
  Visitor,
  DateRangeInfo,
  Company,
  Rules,
  Settings,
  MeetingItem,
  SupportTicket,
} from '../types';
import { D } from '../utils/date';
import { N } from '../utils/format';

const LS_KEY = 'v3m-hr-db-react';

export interface ToastItem {
  id: string;
  msg: string;
  type: 'info' | 'warn' | 'success';
}

interface StoreContextValue {
  db: Database;
  online: boolean;
  toasts: ToastItem[];
  savedFlash: boolean;
  addToast: (msg: string, type?: 'info' | 'warn' | 'success') => void;
  removeToast: (id: string) => void;
  
  // Helpers
  emp: (id: string) => Employee | undefined;
  team: (id: string) => Team | undefined;
  zone: (id: string) => Zone | undefined;
  teamsOf: (deptId: string) => Team[];
  empsOfTeam: (teamId: string) => Employee[];
  empsOfDept: (deptId: string) => Employee[];
  activeEmps: () => Employee[];
  isLeader: (e: Employee) => boolean;
  shortName: (e: Employee) => string;
  deptHead: (deptId: string) => Employee | null;
  
  // Metrics
  todayStatus: (empId: string) => string;
  empStats: (empId: string, range: string | DateRangeInfo) => StatsSummary;
  teamStats: (teamId: string, range: string | DateRangeInfo) => StatsSummary;
  deptStats: (deptId: string, range: string | DateRangeInfo) => StatsSummary;
  overviewStats: (range: string | DateRangeInfo) => StatsSummary;
  empWarnings: (empId: string) => WarningItem[];
  teamWarnings: (teamId: string) => WarningItem[];
  rankableTeams: () => Team[];
  ranking: (range: string | DateRangeInfo) => RankedTeam[];
  blink: (teamId: string, range?: string | DateRangeInfo) => 'red' | 'yellow' | null;
  redTeams: () => Team[];
  reminderTeams: () => Team[];
  champion: (range: string | DateRangeInfo) => ChampionInfo | null;
  worst: (range: string | DateRangeInfo) => WorstInfo | null;
  profiles: (limit?: number) => { emp: Employee; stats: StatsSummary }[];

  // Mutations
  saveEmployee: (empData: Partial<Employee> & { id?: string }) => void;
  deleteEmployee: (id: string) => void;
  saveTeam: (teamData: Partial<Team> & { id?: string }) => void;
  deleteTeam: (id: string) => void;
  updateZone: (zoneId: string, zoneData: Partial<Zone>) => void;
  
  setAttendanceRecord: (empId: string, date: string, key: string, val: unknown) => void;
  checkIn: (empId: string, date?: string) => void;
  checkOut: (empId: string, date?: string) => void;
  markAllPresent: (date?: string) => void;

  addLeave: (leave: Omit<LeaveRequest, 'id' | 'created'>) => void;
  setLeaveStatus: (id: string, status: 'pending' | 'approved' | 'rejected') => void;
  deleteLeave: (id: string) => void;

  addTask: (task: Omit<TaskItem, 'id' | 'created'>) => void;
  moveTask: (id: string, status: 'todo' | 'doing' | 'done') => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;

  saveCandidate: (cand: Partial<Candidate> & { id?: string }) => void;
  setCandidateStage: (id: string, stage: string) => void;
  deleteCandidate: (id: string) => void;
  hireCandidate: (candId: string, empData: Partial<Employee>) => void;

  saveVisitor: (visitor: Visitor, index?: number) => void;
  deleteVisitor: (index: number) => void;

  // Meetings & Virtual Meeting Zones
  empMeetings: (empId: string) => MeetingItem[];
  addMeeting: (meeting: Omit<MeetingItem, 'id'>) => void;
  deleteMeeting: (meetingId: string) => void;
  toggleMeetingAttendance: (meetingId: string, empId: string) => void;
  createVirtualMeetingZone: (
    meetingData: Omit<MeetingItem, 'id'>,
    zoneOptions?: {
      name?: string;
      sub?: string;
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      color?: string;
      accent?: string;
      icon?: string;
    }
  ) => { meeting: MeetingItem; zone: Zone };
  deleteVirtualMeetingZone: (zoneId: string) => void;

  // Support Tickets
  addSupportTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>) => void;
  resolveSupportTicket: (id: string) => void;

  updateCompany: (c: Partial<Company>) => void;
  updateRules: (r: Partial<Rules>) => void;
  updateSettings: (s: Partial<Settings>) => void;
  rearrangeDesks: (force?: boolean) => void;

  resetData: () => void;
  importJSON: (data: Database) => void;
  exportJSON: () => void;
}

export function generateInitialMeetings(employees: Employee[], zones: Zone[]): MeetingItem[] {
  const t = D.today();
  const list: MeetingItem[] = [];
  const activeEmps = employees.filter(e => e.status !== 'resigned');
  const allActiveIds = activeEmps.map(e => e.id);

  // 1. All-hands meetings (Company-wide)
  list.push({
    id: 'meet-allhands-1',
    title: 'Họp toàn thể công ty (All-hands) & Công bố mục tiêu chiến lược Q4',
    room: 'Hội trường chính V3M / Zoom Hall',
    date: D.addDays(t, -2),
    time: '09:00 - 10:30',
    type: 'allhands',
    attendees: allActiveIds,
    status: 'completed',
    notes: 'Tổng kết doanh thu tháng, vinh danh cá nhân xuất sắc và định hướng phát triển AI Workplace.',
  });

  list.push({
    id: 'meet-allhands-2',
    title: 'Townhall & Chia sẻ văn hóa doanh nghiệp tháng 10',
    room: 'Hội trường chính V3M',
    date: D.addDays(t, -8),
    time: '14:00 - 15:30',
    type: 'allhands',
    attendees: allActiveIds,
    status: 'completed',
    notes: 'Ban Giám Đốc giải đáp Q&A nhân sự và cập nhật chính sách phúc lợi mới.',
  });

  const deptRoomMap: Record<string, string> = {
    'dieu-hanh': 'Phòng họp VIP Ban Giám Đốc',
    'leader-hub': 'Phòng họp Chiến lược Leader Hub',
    'nhan-su': 'Phòng họp Lotus (Nhân sự)',
    'kinh-doanh': 'Phòng họp Sapphire (Kinh doanh)',
    'ky-thuat': 'Phòng TechLab & Scrum Room',
    'marketing': 'Phòng Sáng tạo Creative Hub',
  };

  const deptMeetingTemplates: Record<string, { title: string; type: MeetingItem['type']; notes: string }[]> = {
    'dieu-hanh': [
      { title: 'Họp Hội đồng Điều hành & Quản trị rủi ro', type: 'internal', notes: 'Rà soát ngân sách quý và phê duyệt kế hoạch mở rộng thị trường.' },
      { title: 'Làm việc với Quỹ đầu tư & Đối tác chiến lược', type: 'client', notes: 'Thương thảo điều khoản hợp tác công nghệ và gọi vốn vòng Series B.' },
      { title: 'Giao ban Ban Lãnh đạo đầu tuần', type: 'standup', notes: 'Thống nhất các đầu việc ưu tiên của khối vận hành.' },
    ],
    'leader-hub': [
      { title: 'Đồng bộ chỉ số KPI liên phòng ban & AI Agents', type: 'internal', notes: 'Tối ưu hóa quy trình phối hợp tự động giữa các phòng ban.' },
      { title: 'Giao ban Trưởng bộ phận & Điều phối nhân sự dự án', type: 'standup', notes: 'Giải quyết các điểm nghẽn về tiến độ và nguồn lực.' },
      { title: 'Review hiệu suất vận hành định kỳ', type: 'review', notes: 'Phân tích báo cáo hiệu suất 30 ngày và đề xuất giải pháp cải tiến.' },
    ],
    'nhan-su': [
      { title: 'Rà soát kế hoạch tuyển dụng & Sàng lọc hồ sơ ứng viên', type: 'sprint', notes: 'Đánh giá pipeline ứng viên các vị trí Tech Lead và Senior Sales.' },
      { title: 'Phỏng vấn chuyên sâu ứng viên vòng chung khảo', type: 'review', notes: 'Phỏng vấn trực tiếp cùng Trưởng bộ phận và chuyên viên nhân sự.' },
      { title: 'Workshop Đào tạo nội bộ & Onboarding nhân viên mới', type: 'internal', notes: 'Hướng dẫn sử dụng hệ thống HR Office và quy chuẩn an toàn bảo mật.' },
      { title: 'Họp chốt chính sách C&B và Thưởng năng suất', type: 'standup', notes: 'Đối soát bảng lương, công và chỉ số chuyên cần.' },
    ],
    'kinh-doanh': [
      { title: 'Báo cáo doanh số tuần & Chiến dịch thúc đẩy Deal lớn', type: 'sprint', notes: 'Phân tích tỷ lệ chuyển đổi khách hàng và kế hoạch chăm sóc VIP.' },
      { title: 'Demo giải pháp hệ sinh thái số cho khách hàng Doanh nghiệp', type: 'client', notes: 'Thuyết trình sản phẩm thực tế và ký kết biên bản ghi nhớ hợp tác.' },
      { title: 'Daily Sales Standup - Khởi động ngày mới', type: 'standup', notes: 'Cập nhật mục tiêu cuộc gọi, lịch hẹn và doanh số mục tiêu trong ngày.' },
    ],
    'ky-thuat': [
      { title: 'Sprint Retrospective & Lập kế hoạch Sprint mới', type: 'sprint', notes: 'Đánh giá kết quả triển khai tính năng và cải tiến mã nguồn.' },
      { title: 'Daily Engineering Standup', type: 'standup', notes: 'Cập nhật tiến độ task, rà soát blocker và code review chéo.' },
      { title: 'Kiến trúc hệ thống Microservices & Security Audit', type: 'review', notes: 'Nâng cấp bảo mật, tối ưu hóa truy vấn dữ liệu và hạ tầng cloud.' },
    ],
    'marketing': [
      { title: 'Kế hoạch truyền thông đa kênh & Chiến dịch ra mắt sản phẩm', type: 'sprint', notes: 'Phân bổ ngân sách quảng cáo và duyệt kịch bản video viral.' },
      { title: 'Review thiết kế nhận diện thương hiệu & Content Audit', type: 'review', notes: 'Duyệt key visual, banner và tài liệu tiếp thị số.' },
    ],
  };

  const depts = Array.from(new Set(employees.map(e => e.dept).filter(Boolean)));

  depts.forEach((dept, dIdx) => {
    const deptEmps = activeEmps.filter(e => e.dept === dept);
    if (deptEmps.length === 0) return;
    const room = deptRoomMap[dept] || 'Phòng họp đa năng';
    const templates = deptMeetingTemplates[dept] || [
      { title: `Họp triển khai công việc phòng ${dept}`, type: 'internal', notes: 'Thảo luận kế hoạch thực hiện tuần mới.' },
      { title: `Đánh giá tiến độ dự án phòng ${dept}`, type: 'review', notes: 'Rà soát các mốc tiến độ quan trọng.' },
    ];

    templates.forEach((tmpl, tIdx) => {
      const daysAgo = (tIdx * 2 + (dIdx % 2)) % 6;
      list.push({
        id: `meet-${dept}-${tIdx + 1}`,
        title: tmpl.title,
        room,
        date: D.addDays(t, -daysAgo),
        time: tIdx % 2 === 0 ? '09:30 - 10:45' : '14:30 - 15:45',
        dept,
        type: tmpl.type,
        attendees: deptEmps.map(e => e.id),
        status: 'completed',
        notes: tmpl.notes,
      });
    });

    deptEmps.forEach((emp, empIdx) => {
      list.push({
        id: `meet-1on1-${emp.id}`,
        title: `1-on-1: Trao đổi mục tiêu & phản hồi hiệu suất công việc`,
        room: 'Phòng trao đổi 1-1 / Meeting Room B',
        date: D.addDays(t, -((empIdx % 4) + 1)),
        time: '15:30 - 16:15',
        dept,
        type: 'internal',
        attendees: [emp.id],
        status: 'completed',
        notes: 'Phiên thảo luận cá nhân định kỳ với Trưởng phòng về tiến độ và hỗ trợ công việc.',
      });
    });
  });

  return list;
}

export function assignDefaultDesks(database: Database, force = false): Database {
  const nextEmps = database.employees.map(e => ({ ...e }));
  
  // 1. Ensure every employee has a valid dept
  for (const e of nextEmps) {
    if (!e.dept || !database.zones.some(z => z.id === e.dept)) {
      const t = database.teams.find(t => t.id === e.team);
      e.dept = t ? t.dept : (database.zones[0]?.id || 'nhan-su');
    }
  }

  // 2. Assign desks per zone
  for (const z of database.zones) {
    const slots: { x: number; y: number }[] = [];
    const cols = Math.max(1, Math.floor((z.w - 1.5) / 2));
    const rows = Math.max(1, Math.floor((z.h - 1.5) / 2));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        slots.push({ x: z.x + 1.2 + c * 2, y: z.y + 1.2 + r * 2 });
      }
    }

    const inZone = (p: { x: number; y: number } | null | undefined) =>
      Boolean(
        p &&
        typeof p.x === 'number' &&
        typeof p.y === 'number' &&
        p.x >= z.x + 0.5 &&
        p.x <= z.x + z.w - 1 &&
        p.y >= z.y + 0.5 &&
        p.y <= z.y + z.h - 1
      );

    const used = new Set<string>();
    const deptEmps = nextEmps.filter(e => e.dept === z.id && e.status !== 'resigned');

    if (!force) {
      for (const e of deptEmps) {
        if (inZone(e.desk)) {
          used.add(`${e.desk!.x.toFixed(1)},${e.desk!.y.toFixed(1)}`);
        }
      }
    }

    const free = () => slots.find(s => !used.has(`${s.x.toFixed(1)},${s.y.toFixed(1)}`));

    for (let i = 0; i < deptEmps.length; i++) {
      const e = deptEmps[i];
      if (!force && inZone(e.desk)) continue;
      const s = free();
      if (!s) {
        // Fallback grid placement if slots are full
        const fc = (i % Math.max(1, Math.floor(z.w - 2))) + 1;
        const fr = (Math.floor(i / Math.max(1, Math.floor(z.w - 2))) % Math.max(1, Math.floor(z.h - 2))) + 1;
        e.desk = { x: z.x + fc, y: z.y + fr };
      } else {
        e.desk = { x: s.x, y: s.y };
        used.add(`${s.x.toFixed(1)},${s.y.toFixed(1)}`);
      }
    }
  }

  const zones = [...database.zones];
  let meetings = database.meetings;
  if (!meetings || meetings.length === 0) {
    meetings = generateInitialMeetings(nextEmps, zones);
  }

  // Ensure an initial virtual meeting zone exists on the 3D map
  if (!zones.some(z => z.isVirtual)) {
    const vZoneId = 'virtual-zone-alpha';
    const vMeetId = 'meet-virtual-live';
    const activeIds = nextEmps.filter(e => e.status !== 'resigned').map(e => e.id);
    const initialAttendees = activeIds.slice(0, 6);
    zones.push({
      id: vZoneId,
      name: 'Phòng Họp Ảo Hologram (V-Room)',
      sub: 'Họp Chiến Lược & Demo 3D · Đang diễn ra',
      icon: '🌐',
      color: 'rgba(99, 102, 241, 0.22)',
      accent: '#6366f1',
      x: 41,
      y: 2,
      w: 11,
      h: 8,
      isVirtual: true,
      meetingId: vMeetId,
      virtualType: 'sprint',
    });
    if (!meetings.some(m => m.id === vMeetId)) {
      meetings = [
        {
          id: vMeetId,
          title: 'Họp Chiến Lược 3D & Demo Tính Năng AI Workplace',
          room: 'Phòng Họp Ảo Hologram (V-Room)',
          date: D.today(),
          time: '10:00 - 11:30',
          type: 'sprint',
          attendees: initialAttendees,
          status: 'in-progress',
          notes: 'Phòng họp ảo đa điểm kết nối nhân sự trực tiếp và làm việc từ xa trên không gian 3D.',
          virtualZoneId: vZoneId,
          themeColor: '#6366f1',
        },
        ...meetings,
      ];
    }
  }

  let supportTickets = database.supportTickets;
  if (!supportTickets || supportTickets.length === 0) {
    supportTickets = [
      {
        id: 'ticket-001',
        category: 'it',
        empId: nextEmps[1]?.id || 'emp0002',
        title: 'Cài đặt driver máy in văn phòng & VPN',
        details: 'Cần hỗ trợ cấu hình máy in màu tầng 2 và tài khoản VPN bảo mật để làm việc từ xa.',
        priority: 'normal',
        status: 'in-progress',
        createdAt: D.today() + ' 08:30',
        assignee: 'Đội IT Kỹ thuật',
      },
      {
        id: 'ticket-002',
        category: 'admin',
        empId: nextEmps[2]?.id || 'emp0003',
        title: 'Bổ sung thẻ từ ra vào & thẻ giữ xe',
        details: 'Thẻ từ nhân viên bị xước mạch từ không quét được cửa tự động.',
        priority: 'high',
        status: 'pending',
        createdAt: D.today() + ' 09:15',
        assignee: 'Lễ tân & Hành chính',
      },
      {
        id: 'ticket-003',
        category: 'hr',
        empId: nextEmps[3]?.id || 'emp0004',
        title: 'Tư vấn chế độ bảo hiểm sức khỏe VIP',
        details: 'Hỏi về hạn mức bảo lãnh viện phí và quy trình nộp hóa đơn khám bệnh.',
        priority: 'low',
        status: 'resolved',
        createdAt: D.addDays(D.today(), -1) + ' 14:20',
        assignee: 'Chuyên viên Nhân sự',
      },
    ];
  }

  return { ...database, employees: nextEmps, zones, meetings, supportTickets };
}

const StoreContext = createContext<StoreContextValue | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<Database>(() => {
    let initial: Database;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.employees) {
          initial = parsed;
        } else {
          initial = JSON.parse(JSON.stringify(initialSeed)) as Database;
        }
      } else {
        initial = JSON.parse(JSON.stringify(initialSeed)) as Database;
      }
    } catch (e) {
      console.warn('Could not load localStorage:', e);
      initial = JSON.parse(JSON.stringify(initialSeed)) as Database;
    }
    return assignDefaultDesks(initial, false);
  });

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const [online] = useState(true);

  const addToast = useCallback((msg: string, type: 'info' | 'warn' | 'success' = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const flashSaved = useCallback(() => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }, []);

  // Save to localStorage whenever db changes
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(db));
      flashSaved();
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [db, flashSaved]);

  // Lookup Maps
  const empById = useMemo(() => new Map(db.employees.map(e => [e.id, e])), [db.employees]);
  const teamById = useMemo(() => new Map(db.teams.map(t => [t.id, t])), [db.teams]);
  const zoneById = useMemo(() => new Map(db.zones.map(z => [z.id, z])), [db.zones]);
  
  const attByEmp = useMemo(() => {
    const map = new Map<string, Attendance[]>();
    for (const a of db.attendance) {
      const list = map.get(a.emp) || [];
      list.push(a);
      map.set(a.emp, list);
    }
    return map;
  }, [db.attendance]);

  const emp = useCallback((id: string) => empById.get(id), [empById]);
  const team = useCallback((id: string) => teamById.get(id), [teamById]);
  const zone = useCallback((id: string) => zoneById.get(id), [zoneById]);

  const teamsOf = useCallback((deptId: string) => db.teams.filter(t => t.dept === deptId), [db.teams]);
  const empsOfTeam = useCallback(
    (teamId: string) => db.employees.filter(e => e.team === teamId && e.status !== 'resigned'),
    [db.employees]
  );
  const empsOfDept = useCallback(
    (deptId: string) => db.employees.filter(e => e.dept === deptId && e.status !== 'resigned'),
    [db.employees]
  );
  const activeEmps = useCallback(
    () => db.employees.filter(e => e.status !== 'resigned'),
    [db.employees]
  );
  const isLeader = useCallback(
    (e: Employee) => /trưởng|lead|ceo|coo|giám đốc/i.test(e.role || ''),
    []
  );
  const shortName = useCallback((e: Employee) => {
    const p = (e.name || '').trim().split(/\s+/);
    return p.slice(-2).join(' ');
  }, []);

  const deptHead = useCallback((deptId: string) => {
    const z = zoneById.get(deptId);
    if (!z) return null;
    const kw = z.name.replace(/^Phòng /i, '').split(' ')[0];
    const head = db.employees.find(
      e => e.team === 'leaders' && new RegExp(kw, 'i').test(e.role)
    );
    return head || null;
  }, [zoneById, db.employees]);

  // Statistics calculation
  const summarize = useCallback((rows: Attendance[], headcount: number): StatsSummary => {
    let present = 0, late = 0, absent = 0, leave = 0, remote = 0;
    let tasksDone = 0, tasksAssigned = 0, overtime = 0;
    const kpis: number[] = [];

    for (const r of rows) {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'remote') remote++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'leave') leave++;

      tasksDone += r.tasksDone || 0;
      tasksAssigned += r.tasksAssigned || 0;
      overtime += r.overtime || 0;
      if (r.kpi != null) kpis.push(r.kpi);
    }

    const working = present + late + remote;
    const days = rows.length;
    const attendanceRate = N.pct(working, days);
    const lateRate = N.pct(late, days);
    const taskRate = N.pct(tasksDone, tasksAssigned);
    const kpi = N.avg(kpis);
    const roundedOvertime = Math.round(overtime * 10) / 10;
    const perHead = headcount ? Math.round((tasksDone / headcount) * 10) / 10 : 0;

    return {
      days,
      present,
      late,
      absent,
      leave,
      remote,
      working,
      tasksDone,
      tasksAssigned,
      overtime: roundedOvertime,
      attendanceRate,
      lateRate,
      taskRate,
      kpi,
      headcount,
      perHead,
    };
  }, []);

  const getAttendanceInRange = useCallback(
    (range: DateRangeInfo, empIds?: string[]) => {
      const set = empIds ? new Set(empIds) : null;
      return db.attendance.filter(
        a => a.date >= range.from && a.date <= range.to && (!set || set.has(a.emp))
      );
    },
    [db.attendance]
  );

  const checkWarnings = useCallback((stats: StatsSummary): WarningItem[] => {
    const R = db.rules;
    const w: WarningItem[] = [];
    if (stats.days === 0) return w;
    if (stats.lateRate > R.lateRate) {
      w.push({ code: 'late', label: 'Đi muộn', value: stats.lateRate, unit: '%', threshold: `ngưỡng ≤ ${R.lateRate}%`, bad: true });
    }
    if (stats.attendanceRate < R.attendanceRate) {
      w.push({ code: 'att', label: 'Chuyên cần thấp', value: stats.attendanceRate, unit: '%', threshold: `ngưỡng ≥ ${R.attendanceRate}%`, bad: true });
    }
    if (stats.tasksAssigned && stats.taskRate < R.taskRate) {
      w.push({ code: 'task', label: 'Hoàn thành việc thấp', value: stats.taskRate, unit: '%', threshold: `ngưỡng ≥ ${R.taskRate}%`, bad: true });
    }
    if (stats.kpi && stats.kpi < R.kpiMin) {
      w.push({ code: 'kpi', label: 'KPI thấp', value: stats.kpi, unit: '', threshold: `ngưỡng ≥ ${R.kpiMin}`, bad: true });
    }
    return w;
  }, [db.rules]);

  const empWarnings = useCallback((empId: string) => {
    const range = D.range(`${db.rules.windowDays}d`);
    const rows = (attByEmp.get(empId) || []).filter(a => a.date >= range.from && a.date <= range.to);
    return checkWarnings(summarize(rows, 1));
  }, [db.rules.windowDays, attByEmp, checkWarnings, summarize]);

  const teamWarnings = useCallback((teamId: string) => {
    const range = D.range('30d');
    const emps = empsOfTeam(teamId);
    const rows = getAttendanceInRange(range, emps.map(e => e.id));
    return checkWarnings(summarize(rows, emps.length));
  }, [empsOfTeam, getAttendanceInRange, checkWarnings, summarize]);

  const empStats = useCallback((empId: string, rangeOrKey: string | DateRangeInfo): StatsSummary => {
    const range = typeof rangeOrKey === 'string' ? D.range(rangeOrKey) : rangeOrKey;
    const rows = (attByEmp.get(empId) || []).filter(a => a.date >= range.from && a.date <= range.to);
    const s = summarize(rows, 1);
    s.warnings = empWarnings(empId);
    return s;
  }, [attByEmp, summarize, empWarnings]);

  const teamStats = useCallback((teamId: string, rangeOrKey: string | DateRangeInfo): StatsSummary => {
    const range = typeof rangeOrKey === 'string' ? D.range(rangeOrKey) : rangeOrKey;
    const emps = empsOfTeam(teamId);
    const rows = getAttendanceInRange(range, emps.map(e => e.id));
    const s = summarize(rows, emps.length);
    s.warnings = teamWarnings(teamId);
    return s;
  }, [empsOfTeam, getAttendanceInRange, summarize, teamWarnings]);

  const deptStats = useCallback((deptId: string, rangeOrKey: string | DateRangeInfo): StatsSummary => {
    const range = typeof rangeOrKey === 'string' ? D.range(rangeOrKey) : rangeOrKey;
    const emps = empsOfDept(deptId);
    const rows = getAttendanceInRange(range, emps.map(e => e.id));
    return summarize(rows, emps.length);
  }, [empsOfDept, getAttendanceInRange, summarize]);

  const overviewStats = useCallback((rangeOrKey: string | DateRangeInfo): StatsSummary => {
    const range = typeof rangeOrKey === 'string' ? D.range(rangeOrKey) : rangeOrKey;
    const emps = activeEmps();
    const rows = getAttendanceInRange(range, emps.map(e => e.id));
    const s = summarize(rows, emps.length);
    s.pendingLeaves = db.leaves.filter(l => l.status === 'pending').length;
    s.openTasks = db.tasks.filter(t => t.status !== 'done').length;
    return s;
  }, [activeEmps, getAttendanceInRange, summarize, db.leaves, db.tasks]);

  const rankableTeams = useCallback(() => {
    return db.teams.filter(
      t => !['bgd', 'leaders', 'le-tan'].includes(t.id) && empsOfTeam(t.id).length >= 2
    );
  }, [db.teams, empsOfTeam]);

  const ranking = useCallback((rangeOrKey: string | DateRangeInfo): RankedTeam[] => {
    const list = rankableTeams().map(t => ({
      team: t,
      stats: teamStats(t.id, rangeOrKey),
      members: empsOfTeam(t.id),
    })).filter(x => x.stats.days > 0);

    list.sort((a, b) => b.stats.kpi - a.stats.kpi || b.stats.taskRate - a.stats.taskRate);
    return list;
  }, [rankableTeams, teamStats, empsOfTeam]);

  const blink = useCallback((teamId: string, rangeOrKey: string | DateRangeInfo = 'today'): 'red' | 'yellow' | null => {
    if (teamWarnings(teamId).length >= db.rules.redMinWarnings) return 'red';
    const rk = ranking(rangeOrKey);
    if (rk.length && rk[rk.length - 1].team.id === teamId) return 'yellow';
    return null;
  }, [teamWarnings, db.rules.redMinWarnings, ranking]);

  const redTeams = useCallback(() => {
    return db.teams.filter(t => teamWarnings(t.id).length >= db.rules.redMinWarnings);
  }, [db.teams, teamWarnings, db.rules.redMinWarnings]);

  const reminderTeams = useCallback(() => {
    return db.teams.filter(t => {
      const n = teamWarnings(t.id).length;
      return n > 0 && n < db.rules.redMinWarnings;
    });
  }, [db.teams, teamWarnings, db.rules.redMinWarnings]);

  const champion = useCallback((rangeOrKey: string | DateRangeInfo): ChampionInfo | null => {
    const rk = ranking(rangeOrKey);
    if (!rk.length) return null;
    const top = rk[0];
    const people = top.members
      .map(e => ({ emp: e, stats: empStats(e.id, rangeOrKey) }))
      .sort((a, b) => b.stats.kpi - a.stats.kpi);
    return { team: top.team, stats: top.stats, people: people.slice(0, 2) };
  }, [ranking, empStats]);

  const worst = useCallback((rangeOrKey: string | DateRangeInfo): WorstInfo | null => {
    const rk = ranking(rangeOrKey);
    if (rk.length < 2) return null;
    const byPerHead = [...rk].sort((a, b) => a.stats.perHead - b.stats.perHead)[0];
    const byKpi = rk[rk.length - 1];
    const avgPerHead = N.avg(rk.map(x => x.stats.perHead));
    const avgKpi = N.avg(rk.map(x => x.stats.kpi));
    return {
      byPerHead,
      byKpi,
      avgPerHead,
      avgKpi,
      teams: byPerHead.team.id === byKpi.team.id ? [byKpi.team] : [byPerHead.team, byKpi.team],
    };
  }, [ranking]);

  const profiles = useCallback((limit?: number) => {
    const list = activeEmps()
      .filter(e => !['bgd', 'leaders', 'le-tan'].includes(e.team))
      .map(e => ({ emp: e, stats: empStats(e.id, '90d') }))
      .filter(x => x.stats.days > 5)
      .sort((a, b) => b.stats.kpi - a.stats.kpi);
    return limit ? list.slice(0, limit) : list;
  }, [activeEmps, empStats]);

  const todayStatus = useCallback((empId: string) => {
    const t = D.today();
    const rows = attByEmp.get(empId) || [];
    const row = rows.find(a => a.date === t);
    if (row) return row.status;
    
    // Fallback: If no record for today (e.g. today is past seed range, weekend, or timezone mismatch),
    // retrieve the most recent recorded attendance status for this employee
    if (rows.length > 0) {
      const latest = rows.reduce((acc, curr) => (curr.date > acc.date ? curr : acc), rows[0]);
      return latest?.status || 'present';
    }
    return 'present';
  }, [attByEmp]);

  // Desk arrangement logic
  const rearrangeDesks = useCallback((force = false) => {
    setDb(prev => assignDefaultDesks(prev, force));
    addToast('Đã sắp xếp lại toàn bộ bàn làm việc!', 'success');
  }, [addToast]);

  // Employee mutations
  const saveEmployee = useCallback((empData: Partial<Employee> & { id?: string }) => {
    setDb(prev => {
      const next = { ...prev };
      const teamObj = prev.teams.find(t => t.id === empData.team);
      const deptId = teamObj ? teamObj.dept : empData.dept || prev.zones[0]?.id || 'nhan-su';

      if (empData.id) {
        next.employees = next.employees.map(e => {
          if (e.id === empData.id) {
            const teamChanged = empData.team && empData.team !== e.team;
            return {
              ...e,
              ...empData,
              dept: deptId,
              desk: teamChanged ? null : e.desk,
              avatar: { ...e.avatar, ...empData.avatar },
            };
          }
          return e;
        });
        addToast(`Đã cập nhật ${empData.name || 'nhân viên'}`);
      } else {
        let n = prev.employees.length + 1;
        while (prev.employees.some(x => x.id === `nv${String(n).padStart(3, '0')}`)) n++;
        const newId = `nv${String(n).padStart(3, '0')}`;
        const newCode = empData.code || `${prev.company.short}${String(prev.employees.length + 1).padStart(3, '0')}`;
        const newEmp: Employee = {
          id: newId,
          code: newCode,
          name: empData.name || 'Nhân viên mới',
          role: empData.role || 'Nhân viên',
          dept: deptId,
          team: empData.team || prev.teams[0]?.id || 'kinh-doanh-1',
          gender: empData.gender || 'M',
          status: empData.status || 'active',
          joinDate: empData.joinDate || D.today(),
          salary: empData.salary || 10000000,
          desk: null,
          avatar: empData.avatar || {
            skin: '#f1c9a3',
            hair: 0,
            hairColor: '#2b1d14',
            glasses: false,
          },
          email: empData.email || '',
          phone: empData.phone || '',
          dob: empData.dob || '',
        };
        next.employees = [...next.employees, newEmp];
        addToast(`Đã thêm ${newEmp.name}`, 'success');
      }
      return next;
    });
  }, [addToast]);

  const deleteEmployee = useCallback((id: string) => {
    setDb(prev => ({
      ...prev,
      employees: prev.employees.filter(x => x.id !== id),
      attendance: prev.attendance.filter(x => x.emp !== id),
      tasks: prev.tasks.filter(x => x.emp !== id),
      leaves: prev.leaves.filter(x => x.emp !== id),
    }));
    addToast('Đã xoá hồ sơ nhân viên', 'info');
  }, [addToast]);

  // Team mutations
  const saveTeam = useCallback((teamData: Partial<Team> & { id?: string }) => {
    setDb(prev => {
      if (teamData.id) {
        return {
          ...prev,
          teams: prev.teams.map(t => (t.id === teamData.id ? { ...t, ...teamData } as Team : t)),
        };
      }
      const newId = 'team-' + Date.now().toString(36);
      const newTeam: Team = {
        id: newId,
        name: teamData.name || 'Tổ mới',
        dept: teamData.dept || prev.zones[0]?.id || 'kinh-doanh',
        color: teamData.color || '#2f7bd1',
      };
      return { ...prev, teams: [...prev.teams, newTeam] };
    });
    addToast('Đã lưu thông tin tổ');
  }, [addToast]);

  const deleteTeam = useCallback((id: string) => {
    setDb(prev => ({
      ...prev,
      teams: prev.teams.filter(t => t.id !== id),
    }));
    addToast('Đã xoá tổ');
  }, [addToast]);

  const updateZone = useCallback((zoneId: string, zoneData: Partial<Zone>) => {
    setDb(prev => ({
      ...prev,
      zones: prev.zones.map(z => (z.id === zoneId ? { ...z, ...zoneData } : z)),
    }));
    addToast('Đã lưu thông tin khu vực');
  }, [addToast]);

  // Attendance mutations
  const setAttendanceRecord = useCallback((empId: string, date: string, key: string, val: unknown) => {
    setDb(prev => {
      let found = false;
      let nextAtt = prev.attendance.map(a => {
        if (a.emp === empId && a.date === date) {
          found = true;
          const updated = { ...a, [key]: val };
          if (key === 'checkIn' && val && typeof val === 'string') {
            updated.status = val > '08:40' ? 'late' : (updated.status === 'absent' || updated.status === 'leave' ? 'present' : updated.status);
          }
          if (key === 'checkOut' && val && typeof val === 'string' && val > '17:30') {
            const [h, m] = val.split(':').map(Number);
            updated.overtime = Math.max(0, Math.round(((h * 60 + m) - 1050) / 6) / 10);
          }
          return updated;
        }
        return a;
      });

      if (!found) {
        const newRecord: Attendance = {
          id: `att-${empId}-${date}`,
          emp: empId,
          date,
          status: 'present',
          checkIn: key === 'checkIn' ? (val as string) : null,
          checkOut: key === 'checkOut' ? (val as string) : null,
          overtime: key === 'overtime' ? (val as number) : 0,
          tasksDone: key === 'tasksDone' ? (val as number) : 0,
          tasksAssigned: key === 'tasksAssigned' ? (val as number) : 0,
          kpi: key === 'kpi' ? (val as number) : 0,
          [key]: val,
        };
        nextAtt = [...nextAtt, newRecord];
      }

      // If status cleared to empty
      if (key === 'status' && !val) {
        nextAtt = nextAtt.filter(a => !(a.emp === empId && a.date === date));
      }

      return { ...prev, attendance: nextAtt };
    });
  }, []);

  const checkIn = useCallback((empId: string, date = D.today()) => {
    const hm = date === D.today() ? D.nowHM() : '08:30';
    setAttendanceRecord(empId, date, 'checkIn', hm);
    const empObj = empById.get(empId);
    addToast(`${empObj ? empObj.name : 'Nhân viên'} đã check-in lúc ${hm}`, 'success');
  }, [setAttendanceRecord, empById, addToast]);

  const checkOut = useCallback((empId: string, date = D.today()) => {
    const hm = date === D.today() ? D.nowHM() : '17:30';
    setAttendanceRecord(empId, date, 'checkOut', hm);
    const empObj = empById.get(empId);
    addToast(`${empObj ? empObj.name : 'Nhân viên'} đã check-out lúc ${hm}`, 'success');
  }, [setAttendanceRecord, empById, addToast]);

  const markAllPresent = useCallback((date = D.today()) => {
    setDb(prev => {
      const active = prev.employees.filter(e => e.status !== 'resigned');
      const attMap = new Map<string, Attendance>();
      for (const a of prev.attendance) {
        if (a.date === date) attMap.set(a.emp, a);
      }

      const nextAtt = [...prev.attendance];
      for (const e of active) {
        const existing = attMap.get(e.id);
        if (!existing) {
          nextAtt.push({
            id: `att-${e.id}-${date}`,
            emp: e.id,
            date,
            status: 'present',
            checkIn: '08:25',
            checkOut: null,
            overtime: 0,
            tasksDone: 3,
            tasksAssigned: 4,
            kpi: 85,
          });
        } else if (!existing.checkIn) {
          const idx = nextAtt.findIndex(x => x.id === existing.id);
          if (idx !== -1) {
            nextAtt[idx] = { ...existing, checkIn: '08:25', status: 'present' };
          }
        }
      }
      return { ...prev, attendance: nextAtt };
    });
    addToast('Đã đánh dấu tất cả có mặt hôm nay', 'success');
  }, [addToast]);

  // Leave mutations
  const addLeave = useCallback((leaveData: Omit<LeaveRequest, 'id' | 'created'>) => {
    setDb(prev => {
      let n = prev.leaves.length + 1;
      while (prev.leaves.some(x => x.id === `leave${String(n).padStart(3, '0')}`)) n++;
      const newLeave: LeaveRequest = {
        ...leaveData,
        id: `leave${String(n).padStart(3, '0')}`,
        status: 'pending',
        created: D.today(),
      };
      return { ...prev, leaves: [...prev.leaves, newLeave] };
    });
    addToast('Đã tạo đơn nghỉ phép', 'success');
  }, [addToast]);

  const setLeaveStatus = useCallback((id: string, status: 'pending' | 'approved' | 'rejected') => {
    setDb(prev => {
      const nextLeaves = prev.leaves.map(l => (l.id === id ? { ...l, status } : l));
      const target = prev.leaves.find(x => x.id === id);
      let nextAtt = prev.attendance;

      if (status === 'approved' && target) {
        nextAtt = [...prev.attendance];
        for (let d = target.from; d <= target.to; d = D.addDays(d, 1)) {
          if (d > D.today()) continue;
          const idx = nextAtt.findIndex(a => a.emp === target.emp && a.date === d);
          if (idx !== -1) {
            nextAtt[idx] = {
              ...nextAtt[idx],
              status: 'leave',
              checkIn: null,
              checkOut: null,
              overtime: 0,
              tasksDone: 0,
              tasksAssigned: 0,
              kpi: 0,
            };
          } else {
            nextAtt.push({
              id: `att-${target.emp}-${d}`,
              emp: target.emp,
              date: d,
              status: 'leave',
              checkIn: null,
              checkOut: null,
              overtime: 0,
              tasksDone: 0,
              tasksAssigned: 0,
              kpi: 0,
            });
          }
        }
      }
      return { ...prev, leaves: nextLeaves, attendance: nextAtt };
    });
    addToast(status === 'approved' ? 'Đã duyệt đơn nghỉ' : status === 'rejected' ? 'Đã từ chối đơn' : 'Đã mở lại đơn');
  }, [addToast]);

  const deleteLeave = useCallback((id: string) => {
    setDb(prev => ({ ...prev, leaves: prev.leaves.filter(x => x.id !== id) }));
    addToast('Đã xoá đơn nghỉ phép');
  }, [addToast]);

  // Tasks mutations
  const addTask = useCallback((taskData: Omit<TaskItem, 'id' | 'created'>) => {
    setDb(prev => {
      let n = prev.tasks.length + 1;
      while (prev.tasks.some(x => x.id === `task${String(n).padStart(3, '0')}`)) n++;
      const newTask: TaskItem = {
        ...taskData,
        id: `task${String(n).padStart(3, '0')}`,
        status: 'todo',
        created: D.today(),
      };
      return { ...prev, tasks: [...prev.tasks, newTask] };
    });
    addToast('Đã giao công việc', 'success');
  }, [addToast]);

  const moveTask = useCallback((id: string, status: 'todo' | 'doing' | 'done') => {
    setDb(prev => {
      const task = prev.tasks.find(x => x.id === id);
      if (!task) return prev;
      const was = task.status;
      const nextTasks = prev.tasks.map(t => (t.id === id ? { ...t, status } : t));
      
      let nextAtt = prev.attendance;
      if (status === 'done' && was !== 'done') {
        const today = D.today();
        const attIdx = nextAtt.findIndex(a => a.emp === task.emp && a.date === today);
        if (attIdx !== -1) {
          const rec = nextAtt[attIdx];
          const tasksDone = (rec.tasksDone || 0) + 1;
          const tasksAssigned = Math.max(rec.tasksAssigned || 0, tasksDone);
          nextAtt = [...nextAtt];
          nextAtt[attIdx] = { ...rec, tasksDone, tasksAssigned };
        }
      }
      return { ...prev, tasks: nextTasks, attendance: nextAtt };
    });
  }, []);

  const toggleTask = useCallback((id: string) => {
    const task = db.tasks.find(x => x.id === id);
    if (!task) return;
    moveTask(id, task.status === 'done' ? 'doing' : 'done');
  }, [db.tasks, moveTask]);

  const deleteTask = useCallback((id: string) => {
    setDb(prev => ({ ...prev, tasks: prev.tasks.filter(x => x.id !== id) }));
    addToast('Đã xoá công việc');
  }, [addToast]);

  // Candidates mutations
  const saveCandidate = useCallback((cand: Partial<Candidate> & { id?: string }) => {
    setDb(prev => {
      if (cand.id) {
        return {
          ...prev,
          candidates: prev.candidates.map(c => (c.id === cand.id ? { ...c, ...cand } as Candidate : c)),
        };
      }
      let n = prev.candidates.length + 1;
      while (prev.candidates.some(x => x.id === `cand${String(n).padStart(3, '0')}`)) n++;
      const newCand: Candidate = {
        id: `cand${String(n).padStart(3, '0')}`,
        name: cand.name || 'Ứng viên mới',
        role: cand.role || 'Vị trí ứng tuyển',
        source: cand.source || 'Website',
        applied: cand.applied || D.today(),
        stage: cand.stage || 'Mới nộp',
      };
      return { ...prev, candidates: [...prev.candidates, newCand] };
    });
    addToast('Đã lưu thông tin ứng viên');
  }, [addToast]);

  const setCandidateStage = useCallback((id: string, stage: string) => {
    setDb(prev => ({
      ...prev,
      candidates: prev.candidates.map(c => (c.id === id ? { ...c, stage } : c)),
    }));
  }, []);

  const deleteCandidate = useCallback((id: string) => {
    setDb(prev => ({ ...prev, candidates: prev.candidates.filter(x => x.id !== id) }));
    addToast('Đã xoá ứng viên');
  }, [addToast]);

  const hireCandidate = useCallback((candId: string, empData: Partial<Employee>) => {
    setDb(prev => {
      const cand = prev.candidates.find(c => c.id === candId);
      if (!cand) return prev;
      const teamObj = prev.teams.find(t => t.id === empData.team);
      const deptId = teamObj ? teamObj.dept : prev.zones[0]?.id || 'nhan-su';
      let n = prev.employees.length + 1;
      while (prev.employees.some(x => x.id === `nv${String(n).padStart(3, '0')}`)) n++;
      const newEmp: Employee = {
        id: `nv${String(n).padStart(3, '0')}`,
        code: empData.code || `${prev.company.short}${String(prev.employees.length + 1).padStart(3, '0')}`,
        name: empData.name || cand.name,
        role: empData.role || cand.role,
        dept: deptId,
        team: empData.team || prev.teams[0]?.id || 'kinh-doanh-1',
        gender: empData.gender || 'M',
        status: 'probation',
        joinDate: empData.joinDate || D.today(),
        salary: empData.salary || 10000000,
        desk: null,
        avatar: empData.avatar || {
          skin: '#f1c9a3',
          hair: 0,
          hairColor: '#2b1d14',
          glasses: false,
        },
        email: empData.email || '',
        phone: empData.phone || '',
      };

      return {
        ...prev,
        candidates: prev.candidates.filter(c => c.id !== candId),
        employees: [...prev.employees, newEmp],
      };
    });
    addToast('Đã chuyển ứng viên thành nhân viên chính thức!', 'success');
  }, [addToast]);

  // Visitors mutations
  const saveVisitor = useCallback((visitor: Visitor, index?: number) => {
    setDb(prev => {
      const nextVisitors = [...prev.visitors];
      if (index != null && index >= 0 && index < nextVisitors.length) {
        nextVisitors[index] = visitor;
      } else {
        nextVisitors.push(visitor);
      }
      return { ...prev, visitors: nextVisitors };
    });
    addToast('Đã lưu thông tin khách mời');
  }, [addToast]);

  const deleteVisitor = useCallback((index: number) => {
    setDb(prev => {
      const nextVisitors = [...prev.visitors];
      nextVisitors.splice(index, 1);
      return { ...prev, visitors: nextVisitors };
    });
    addToast('Đã xoá khách mời');
  }, [addToast]);

  // Meetings
  const empMeetings = useCallback((empId: string): MeetingItem[] => {
    const list = db.meetings || [];
    return list
      .filter(m => m.attendees && m.attendees.includes(empId))
      .sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));
  }, [db.meetings]);

  const addMeeting = useCallback((meeting: Omit<MeetingItem, 'id'>) => {
    const id = 'meet-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newMeet: MeetingItem = { ...meeting, id };
    setDb(prev => ({
      ...prev,
      meetings: [newMeet, ...(prev.meetings || [])],
    }));
    addToast(`Đã ghi nhận cuộc họp "${meeting.title}"`, 'success');
  }, [addToast]);

  const deleteMeeting = useCallback((meetingId: string) => {
    setDb(prev => {
      const nextMeetings = (prev.meetings || []).filter(m => m.id !== meetingId);
      const nextZones = prev.zones.filter(z => z.meetingId !== meetingId);
      return { ...prev, meetings: nextMeetings, zones: nextZones };
    });
    addToast('Đã xóa cuộc họp');
  }, [addToast]);

  const toggleMeetingAttendance = useCallback((meetingId: string, empId: string) => {
    setDb(prev => {
      const meetings = (prev.meetings || []).map(m => {
        if (m.id !== meetingId) return m;
        const exists = m.attendees.includes(empId);
        const nextAttendees = exists
          ? m.attendees.filter(id => id !== empId)
          : [...m.attendees, empId];
        return { ...m, attendees: nextAttendees };
      });
      return { ...prev, meetings };
    });
  }, []);

  const createVirtualMeetingZone = useCallback(
    (
      meetingData: Omit<MeetingItem, 'id'>,
      zoneOptions?: {
        name?: string;
        sub?: string;
        x?: number;
        y?: number;
        w?: number;
        h?: number;
        color?: string;
        accent?: string;
        icon?: string;
      }
    ) => {
      const meetingId = 'meet-v-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const zoneId = 'vzone-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

      // Determine smart position for new virtual zone if not provided
      // Virtual wing starts at x = 41. Find the next free y slot
      let targetX = zoneOptions?.x ?? 41;
      let targetY = zoneOptions?.y;
      const targetW = zoneOptions?.w ?? 11;
      const targetH = zoneOptions?.h ?? 8;

      if (targetY === undefined) {
        const currentZones = db.zones || [];
        const existingVirtuals = currentZones.filter(z => z.isVirtual);
        if (existingVirtuals.length === 0) {
          targetY = 2;
        } else {
          const maxY = Math.max(...existingVirtuals.map(z => z.y + z.h));
          if (maxY + targetH <= 28) {
            targetY = maxY + 2;
          } else {
            // Place below main office floor
            targetX = 14;
            targetY = 29;
          }
        }
      }

      const accentColor = zoneOptions?.accent || (meetingData.type === 'sprint' ? '#38bdf8' : meetingData.type === 'allhands' ? '#ec4899' : '#8b5cf6');
      const bgColor = zoneOptions?.color || 'rgba(139, 92, 246, 0.22)';
      const zoneName = zoneOptions?.name || `Phòng Họp Ảo: ${meetingData.title.slice(0, 26)}`;
      const zoneIcon = zoneOptions?.icon || (meetingData.type === 'sprint' ? '⚡' : meetingData.type === 'allhands' ? '🚀' : meetingData.type === 'client' ? '🤝' : '🌐');

      const newZone: Zone = {
        id: zoneId,
        name: zoneName,
        sub: `${meetingData.time} · ${meetingData.attendees.length} nhân sự tham gia`,
        icon: zoneIcon,
        color: bgColor,
        accent: accentColor,
        x: targetX,
        y: targetY,
        w: targetW,
        h: targetH,
        isVirtual: true,
        meetingId: meetingId,
        virtualType: meetingData.type || 'internal',
      };

      const newMeeting: MeetingItem = {
        ...meetingData,
        id: meetingId,
        room: zoneName,
        virtualZoneId: zoneId,
        themeColor: accentColor,
        status: meetingData.status || 'scheduled',
      };

      setDb(prev => ({
        ...prev,
        zones: [...prev.zones, newZone],
        meetings: [newMeeting, ...(prev.meetings || [])],
      }));

      addToast(`Đã khởi tạo phòng họp ảo "${meetingData.title}" trên bản đồ 3D!`, 'success');
      return { meeting: newMeeting, zone: newZone };
    },
    [db.zones, addToast]
  );

  const deleteVirtualMeetingZone = useCallback((zoneId: string) => {
    setDb(prev => {
      const targetZone = prev.zones.find(z => z.id === zoneId);
      const meetingId = targetZone?.meetingId;
      const nextZones = prev.zones.filter(z => z.id !== zoneId);
      const nextMeetings = (prev.meetings || []).map(m => {
        if (m.id === meetingId) {
          return { ...m, virtualZoneId: undefined };
        }
        return m;
      });
      return { ...prev, zones: nextZones, meetings: nextMeetings };
    });
    addToast('Đã đóng phòng họp ảo trên bản đồ 3D');
  }, [addToast]);

  // Support Tickets
  const addSupportTicket = useCallback(
    (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>) => {
      const id = 'ticket-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      const now = new Date();
      const timeStr = `${D.today()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newTicket: SupportTicket = {
        ...ticket,
        id,
        createdAt: timeStr,
        status: 'pending',
      };
      setDb(prev => ({
        ...prev,
        supportTickets: [newTicket, ...(prev.supportTickets || [])],
      }));
      addToast(`Đã tiếp nhận yêu cầu hỗ trợ "${ticket.title}"`, 'success');
    },
    [addToast]
  );

  const resolveSupportTicket = useCallback(
    (id: string) => {
      setDb(prev => ({
        ...prev,
        supportTickets: (prev.supportTickets || []).map(t =>
          t.id === id ? { ...t, status: 'resolved' as const } : t
        ),
      }));
      addToast('Đã đánh dấu xử lý xong yêu cầu hỗ trợ', 'success');
    },
    [addToast]
  );

  // Company / Settings / Rules
  const updateCompany = useCallback((c: Partial<Company>) => {
    setDb(prev => ({ ...prev, company: { ...prev.company, ...c } }));
    addToast('Đã cập nhật thông tin công ty');
  }, [addToast]);

  const updateRules = useCallback((r: Partial<Rules>) => {
    setDb(prev => ({ ...prev, rules: { ...prev.rules, ...r } }));
    addToast('Đã cập nhật quy tắc cảnh báo', 'success');
  }, [addToast]);

  const updateSettings = useCallback((s: Partial<Settings>) => {
    setDb(prev => ({ ...prev, settings: { ...prev.settings, ...s } }));
  }, []);

  // Reset / Import / Export
  const resetData = useCallback(() => {
    const seeded = JSON.parse(JSON.stringify(initialSeed)) as Database;
    setDb(assignDefaultDesks(seeded, true));
    localStorage.removeItem(LS_KEY);
    addToast('Đã khôi phục dữ liệu mẫu ban đầu', 'success');
  }, [addToast]);

  const importJSON = useCallback((data: Database) => {
    if (!data || !data.employees) {
      addToast('File dữ liệu không hợp lệ', 'warn');
      return;
    }
    setDb(assignDefaultDesks(data, false));
    addToast('Đã nạp dữ liệu thành công', 'success');
  }, [addToast]);

  const exportJSON = useCallback(() => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `v3m-hr-backup-${D.today()}.json`);
    dlAnchorElem.click();
  }, [db]);

  const value = {
    db,
    online,
    toasts,
    savedFlash,
    addToast,
    removeToast,
    emp,
    team,
    zone,
    teamsOf,
    empsOfTeam,
    empsOfDept,
    activeEmps,
    isLeader,
    shortName,
    deptHead,
    todayStatus,
    empStats,
    teamStats,
    deptStats,
    overviewStats,
    empWarnings,
    teamWarnings,
    rankableTeams,
    ranking,
    blink,
    redTeams,
    reminderTeams,
    champion,
    worst,
    profiles,
    saveEmployee,
    deleteEmployee,
    saveTeam,
    deleteTeam,
    updateZone,
    setAttendanceRecord,
    checkIn,
    checkOut,
    markAllPresent,
    addLeave,
    setLeaveStatus,
    deleteLeave,
    addTask,
    moveTask,
    toggleTask,
    deleteTask,
    saveCandidate,
    setCandidateStage,
    deleteCandidate,
    hireCandidate,
    saveVisitor,
    deleteVisitor,
    empMeetings,
    addMeeting,
    deleteMeeting,
    toggleMeetingAttendance,
    createVirtualMeetingZone,
    deleteVirtualMeetingZone,
    addSupportTicket,
    resolveSupportTicket,
    updateCompany,
    updateRules,
    updateSettings,
    rearrangeDesks,
    resetData,
    importJSON,
    exportJSON,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
