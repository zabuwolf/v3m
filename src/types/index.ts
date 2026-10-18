export interface Company {
  name: string;
  short: string;
  slogan: string;
  port?: number;
}

export interface Settings {
  theme: 'tet' | 'none' | 'noel';
  floorTexture?: 'concrete' | 'wood' | 'tile';
  nameTags: boolean;
  connections: boolean;
  grid: boolean;
  lights: boolean;
  dayNight: 'auto' | 'day' | 'night';
  slideSeconds: number;
  slideshowAt: string;
  music?: boolean;
}

export interface Zone {
  id: string;
  name: string;
  sub: string;
  icon: string;
  color: string;
  accent: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isVirtual?: boolean;
  meetingId?: string;
  virtualType?: 'internal' | 'client' | 'sprint' | 'standup' | 'allhands' | 'review';
}

export interface Team {
  id: string;
  dept: string;
  name: string;
  color: string;
}

export interface AIAgent {
  id: string;
  dept: string;
  name: string;
  desc: string;
}

export interface Avatar {
  skin?: string;
  hair?: number;
  hairColor?: string;
  glasses?: boolean;
}

export interface DeskPosition {
  x: number;
  y: number;
}

export interface Employee {
  id: string;
  code?: string;
  name: string;
  role: string;
  dept: string;
  team: string;
  gender: 'M' | 'F';
  email?: string;
  phone?: string;
  dob?: string;
  joinDate?: string;
  salary?: number;
  desk?: DeskPosition | null;
  avatar?: Avatar;
  status: 'active' | 'probation' | 'leave' | 'resigned';
}

export interface Attendance {
  id: string;
  emp: string;
  date: string;
  status: 'present' | 'late' | 'remote' | 'absent' | 'leave';
  checkIn?: string | null;
  checkOut?: string | null;
  overtime?: number;
  tasksDone?: number;
  tasksAssigned?: number;
  kpi?: number;
}

export interface LeaveRequest {
  id: string;
  emp: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  created?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  emp: string;
  priority: 'low' | 'normal' | 'high';
  due: string;
  status: 'todo' | 'doing' | 'done';
  created?: string;
}

export interface Candidate {
  id: string;
  name: string;
  role: string;
  source?: string;
  applied: string;
  stage: string;
}

export interface MeetingItem {
  id: string;
  title: string;
  room?: string;
  date: string;
  time: string;
  dept?: string;
  attendees: string[];
  type?: 'internal' | 'client' | 'sprint' | 'standup' | 'allhands' | 'review';
  status?: 'scheduled' | 'in-progress' | 'completed';
  notes?: string;
  virtualZoneId?: string;
  themeColor?: string;
}

export interface Visitor {
  name: string;
  org?: string;
  date: string;
}

export interface Rules {
  lateRate: number;
  attendanceRate: number;
  taskRate: number;
  kpiMin: number;
  redMinWarnings: number;
  windowDays: number;
}

export interface SupportTicket {
  id: string;
  category: 'it' | 'hr' | 'admin' | 'reception';
  empId: string;
  title: string;
  details: string;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'in-progress' | 'resolved';
  createdAt: string;
  deskCoord?: string;
  assignee?: string;
}

export interface Database {
  company: Company;
  settings: Settings;
  zones: Zone[];
  teams: Team[];
  agents: AIAgent[];
  employees: Employee[];
  attendance: Attendance[];
  leaves: LeaveRequest[];
  tasks: TaskItem[];
  candidates: Candidate[];
  visitors: Visitor[];
  rules: Rules;
  meetings?: MeetingItem[];
  supportTickets?: SupportTicket[];
}

export interface WarningItem {
  code: string;
  label: string;
  value: number;
  unit: string;
  threshold: string;
  bad: boolean;
}

export interface StatsSummary {
  days: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
  remote: number;
  working: number;
  tasksDone: number;
  tasksAssigned: number;
  overtime: number;
  attendanceRate: number;
  lateRate: number;
  taskRate: number;
  kpi: number;
  headcount: number;
  perHead: number;
  warnings?: WarningItem[];
  pendingLeaves?: number;
  openTasks?: number;
}

export interface DateRangeInfo {
  from: string;
  to: string;
  label: string;
  sub: string;
}

export interface RankedTeam {
  team: Team;
  stats: StatsSummary;
  members: Employee[];
}

export interface ChampionInfo {
  team: Team;
  stats: StatsSummary;
  people: { emp: Employee; stats: StatsSummary }[];
}

export interface WorstInfo {
  byPerHead: RankedTeam;
  byKpi: RankedTeam;
  avgPerHead: number;
  avgKpi: number;
  teams: Team[];
}

export type ViewTab = 'office' | 'manage' | 'reports';

export type ManageTab =
  | 'dashboard'
  | 'employees'
  | 'teams'
  | 'attendance'
  | 'leaves'
  | 'tasks'
  | 'candidates'
  | 'visitors'
  | 'data';
