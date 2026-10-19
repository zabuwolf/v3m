import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Employee, Zone, AIAgent, Visitor } from '../../types';
import { D } from '../../utils/date';
import { N, esc } from '../../utils/format';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Settings as SettingsIcon,
  Play,
  Volume2,
  VolumeX,
  Clock,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Calendar,
  Users,
  Video,
  Sparkles,
} from 'lucide-react';
import { drawPerson } from './drawPerson';
import { MeetingSchedulerDrawer } from './MeetingSchedulerDrawer';
import { VirtualMeetingModal } from '../modals/VirtualMeetingModal';

const TW = 64;
const TH = 32;
const DESK_H = 14;

interface HitTarget {
  kind: 'emp' | 'zone' | 'agent' | 'virtualMeeting';
  id: string;
  zoneId?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** world = floor grid, label = etched name, iso = sprite box in iso pixels */
  space?: 'world' | 'label' | 'iso';
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
}

interface SteamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
}

interface OfficeCanvasProps {
  onSelectEmployee?: (empId: string) => void;
  onSelectZone?: (zoneId: string) => void;
  onSelectAgent?: (agentId: string) => void;
  onOpenSettings?: () => void;
  onStartTour?: () => void;
  highlightZoneId?: string | null;
  highlightTeamId?: string | null;
  focusedEmpId?: string | null;
  focusedZoneId?: string | null;
  isTouring?: boolean;
}

function drawTeamSections(
  ctx: CanvasRenderingContext2D,
  iso: (x: number, y: number) => { x: number; y: number },
  z: Zone,
  db: { employees: Employee[]; teams: { id: string; name: string; color: string }[] },
) {
  const people = db.employees.filter(e => e.dept === z.id && e.status !== 'resigned' && e.desk);
  const groups = new Map<string, Employee[]>();
  for (const e of people) {
    const list = groups.get(e.team) || [];
    list.push(e);
    groups.set(e.team, list);
  }
  if (groups.size < 2) return;

  for (const [teamId, members] of groups) {
    const team = db.teams.find(t => t.id === teamId);
    if (!team || members.length === 0) continue;
    const xs = members.map(m => m.desk!.x);
    const ys = members.map(m => m.desk!.y);
    const x0 = Math.max(z.x + 0.15, Math.min(...xs) - 0.45);
    const y0 = Math.max(z.y + 0.15, Math.min(...ys) - 0.3);
    const x1 = Math.min(z.x + z.w - 0.15, Math.max(...xs) + 1.2);
    const y1 = Math.min(z.y + z.h - 0.15, Math.max(...ys) + 1.05);
    const corners = [iso(x0, y0), iso(x1, y0), iso(x1, y1), iso(x0, y1)];

    ctx.save();
    ctx.beginPath();
    corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = team.color;
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.15;
    ctx.strokeStyle = team.color;
    ctx.stroke();
    ctx.restore();

    const ep = iso(x0 + 0.2, Math.min(y1 - 0.15, y0 + 0.85));
    ctx.save();
    ctx.transform(1, 0.5, -1, 0.5, ep.x, ep.y);
    ctx.font = '700 8px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = team.color;
    ctx.globalAlpha = 0.95;
    ctx.fillText(team.name.toUpperCase(), 0, 0);
    ctx.restore();
  }
}

export const OfficeCanvas: React.FC<OfficeCanvasProps> = ({
  onSelectEmployee,
  onSelectZone,
  onSelectAgent,
  onOpenSettings,
  onStartTour,
  highlightZoneId,
  highlightTeamId,
  focusedEmpId,
  focusedZoneId,
  isTouring = false,
}) => {
  const {
    db,
    emp,
    team,
    zone,
    activeEmps,
    empsOfDept,
    isLeader,
    shortName,
    deptHead,
    todayStatus,
    blink,
    empStats,
    deptStats,
    updateSettings,
  } = useStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const camRef = useRef<Camera>({ x: 0, y: 0, zoom: 0.95 });
  const animRef = useRef<{
    from: Camera;
    to: Camera;
    t0: number;
    ms: number;
  } | null>(null);

  const hitsRef = useRef<HitTarget[]>([]);
  const bubblesRef = useRef<Record<string, { text: string; until: number }>>({});
  const confettiRef = useRef<ConfettiPiece[]>([]);
  const steamRef = useRef<SteamParticle[]>([]);
  const timeRef = useRef<number>(0);

  const [hoverTarget, setHoverTarget] = useState<HitTarget | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoomDisplay, setZoomDisplay] = useState(100);

  // Meeting Scheduler & Virtual Meeting Zones state
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [selectedMeetingEmpIds, setSelectedMeetingEmpIds] = useState<string[]>([]);
  const [activeVirtualZoneId, setActiveVirtualZoneId] = useState<string | null>(null);

  // Isometric projection math
  const iso = useCallback((x: number, y: number) => ({
    x: (x - y) * (TW / 2),
    y: (x + y) * (TH / 2),
  }), []);

  const unIso = useCallback((ix: number, iy: number) => ({
    x: (ix / (TW / 2) + iy / (TH / 2)) / 2,
    y: (iy / (TH / 2) - ix / (TW / 2)) / 2,
  }), []);

  // Screen <-> Iso coordinates
  const screenToIso = useCallback((mx: number, my: number, W: number, H: number, cam: Camera) => ({
    x: (mx - W / 2 - cam.x) / cam.zoom,
    y: (my - H / 2 - cam.y) / cam.zoom,
  }), []);

  // Smooth camera animation
  const animateCameraTo = useCallback((target: Partial<Camera>, ms = 800) => {
    const current = { ...camRef.current };
    animRef.current = {
      from: current,
      to: {
        x: target.x !== undefined ? target.x : current.x,
        y: target.y !== undefined ? target.y : current.y,
        zoom: target.zoom !== undefined ? target.zoom : current.zoom,
      },
      t0: performance.now(),
      ms,
    };
  }, []);

  const focusWorld = useCallback((wx: number, wy: number, zoom: number, ms = 800) => {
    const p = iso(wx, wy);
    const topInset = isTouring ? 60 : 20;
    const bottomInset = isTouring ? 240 : 20;
    const cy = (topInset - bottomInset) / 2;
    animateCameraTo({ x: -p.x * zoom, y: -p.y * zoom + cy, zoom }, ms);
  }, [iso, animateCameraTo, isTouring]);

  const focusZone = useCallback((z: Zone, ms = 850) => {
    const corners = [
      iso(z.x, z.y),
      iso(z.x + z.w, z.y),
      iso(z.x, z.y + z.h),
      iso(z.x + z.w, z.y + z.h),
    ];
    const minX = Math.min(...corners.map(c => c.x));
    const maxX = Math.max(...corners.map(c => c.x));
    const minY = Math.min(...corners.map(c => c.y)) - 50;
    const maxY = Math.max(...corners.map(c => c.y));

    const cv = canvasRef.current;
    const W = cv ? cv.clientWidth : 1200;
    const H = cv ? cv.clientHeight : 800;
    const availH = H - (isTouring ? 300 : 80);
    const zoom = Math.max(0.45, Math.min(2.1, Math.min(W / ((maxX - minX) * 1.15), availH / ((maxY - minY) * 1.15))));
    focusWorld(z.x + z.w / 2, z.y + z.h / 2 - 0.5, zoom, ms);
  }, [iso, focusWorld, isTouring]);

  const fitAll = useCallback((ms = 800) => {
    const maxX = Math.max(...db.zones.map(z => z.x + z.w)) + 2;
    const maxY = Math.max(...db.zones.map(z => z.y + z.h)) + 2;
    const whole = { x: 0, y: 0, w: maxX, h: maxY, id: '', name: '', sub: '', icon: '', color: '', accent: '' };
    focusZone(whole, ms);
  }, [db.zones, focusZone]);

  const zoomBy = useCallback((factor: number) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    const currentZoom = camRef.current.zoom;
    const nextZoom = Math.max(0.35, Math.min(2.8, currentZoom * factor));

    const before = screenToIso(W / 2, H / 2, W, H, camRef.current);
    camRef.current.zoom = nextZoom;
    const after = screenToIso(W / 2, H / 2, W, H, camRef.current);
    camRef.current.x += (after.x - before.x) * nextZoom;
    camRef.current.y += (after.y - before.y) * nextZoom;
    animRef.current = null;
    setZoomDisplay(Math.round(nextZoom * 100));
  }, [screenToIso]);

  // Trigger focus when external props change
  useEffect(() => {
    if (focusedEmpId) {
      const e = emp(focusedEmpId);
      if (e && e.desk) {
        focusWorld(e.desk.x, e.desk.y, Math.max(camRef.current.zoom, 1.6), 800);
      }
    }
  }, [focusedEmpId, emp, focusWorld]);

  useEffect(() => {
    if (focusedZoneId) {
      const z = zone(focusedZoneId);
      if (z) focusZone(z, 900);
    }
  }, [focusedZoneId, zone, focusZone]);

  // Confetti triggering helper
  const burstConfetti = useCallback((n = 150) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    const colors = ['#f43f5e', '#fbbf24', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
    for (let i = 0; i < n; i++) {
      confettiRef.current.push({
        x: Math.random() * W,
        y: -10 - Math.random() * H * 0.4,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 2.2 + Math.random() * 3.8,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.25,
        w: 6 + Math.random() * 7,
        h: 4 + Math.random() * 5,
        color: colors[i % colors.length],
      });
    }
  }, []);

  // Expose confetti to window for tour ding celebration
  useEffect(() => {
    (window as unknown as { burstConfetti: () => void }).burstConfetti = () => burstConfetti(140);
  }, [burstConfetti]);

  // Speech bubble chatter
  useEffect(() => {
    const interval = setInterval(() => {
      if (isTouring) return;
      const emps = activeEmps().filter(e => e.desk && ['present', 'late', 'remote'].includes(todayStatus(e.id)));
      if (!emps.length) return;
      const chosen = emps[Math.floor(Math.random() * emps.length)];
      const chatter = [
        'Em đang gửi báo cáo KPI tuần',
        'Anh ơi duyệt giúp em đơn nghỉ',
        'Task này em đẩy lên trước 5h ạ',
        'Có đối tác tới phòng họp số 2',
        'Đang review PR cho team Backend',
        'Ai uống café hay trà sữa không em đặt?',
        'Mai họp giao ban sáng 9h nhé cả nhà',
        'Em check-in đầy đủ rồi nha',
        'Số liệu đã đồng bộ lên Data Hub',
        'Chốt KPI tháng này xuất sắc quá',
      ];
      const text = chosen.team === 'le-tan' ? 'Các anh chị dùng cà phê hay trà em chuẩn bị ạ? ☕' : chatter[Math.floor(Math.random() * chatter.length)];
      bubblesRef.current[chosen.id] = { text, until: performance.now() + 3800 };
    }, 4200);

    return () => clearInterval(interval);
  }, [activeEmps, todayStatus, isTouring]);

  // Dynamic local time ticker for time-of-day shifting
  const [localTime, setLocalTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTime(new Date());
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Compute atmospheric 3D lighting environment based on settings & local user time
  const ambientInfo = useMemo(() => {
    const mode = db.settings.dayNight;
    const hours = localTime.getHours();
    const minutes = localTime.getMinutes();
    const t = hours + minutes / 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    if (mode === 'day') {
      return {
        period: 'day' as const,
        timeStr,
        label: 'Ban ngày',
        sub: 'Ánh sáng tự nhiên',
        color: 'rgba(224, 242, 254, 0.02)',
        bgTop: '#020617',
        bgBottom: '#0f172a',
        accent: '#38bdf8',
        icon: 'day' as const,
        isNight: false,
      };
    }
    if (mode === 'night') {
      return {
        period: 'night' as const,
        timeStr,
        label: 'Ban đêm',
        sub: 'Ánh đêm yên tĩnh',
        color: 'rgba(15, 23, 42, 0.28)',
        bgTop: '#020617',
        bgBottom: '#090d16',
        accent: '#818cf8',
        icon: 'night' as const,
        isNight: true,
      };
    }

    // AUTO: Real-time based on local time
    if (t >= 5 && t < 8) {
      // Dawn (05:00 - 08:00): Soft peach-gold dawn
      return {
        period: 'dawn' as const,
        timeStr,
        label: 'Bình minh',
        sub: 'Ánh ban mai êm dịu',
        color: 'rgba(251, 146, 60, 0.05)',
        bgTop: '#090d16',
        bgBottom: '#1e1b4b',
        accent: '#fb923c',
        icon: 'dawn' as const,
        isNight: false,
      };
    } else if (t >= 8 && t < 16.5) {
      // Daylight (08:00 - 16:30): Crisp daylight
      return {
        period: 'day' as const,
        timeStr,
        label: 'Ban ngày',
        sub: 'Ánh sáng tự nhiên',
        color: 'rgba(224, 242, 254, 0.02)',
        bgTop: '#020617',
        bgBottom: '#0f172a',
        accent: '#38bdf8',
        icon: 'day' as const,
        isNight: false,
      };
    } else if (t >= 16.5 && t < 18.5) {
      // Golden Hour (16:30 - 18:30): Warm honey-amber glow
      return {
        period: 'golden' as const,
        timeStr,
        label: 'Chiều tà',
        sub: 'Giờ vàng ấm áp',
        color: 'rgba(245, 158, 11, 0.07)',
        bgTop: '#0f172a',
        bgBottom: '#291807',
        accent: '#f59e0b',
        icon: 'golden' as const,
        isNight: false,
      };
    } else if (t >= 18.5 && t < 20.5) {
      // Dusk / Twilight (18:30 - 20:30): Cool violet dusk
      return {
        period: 'dusk' as const,
        timeStr,
        label: 'Hoàng hôn',
        sub: 'Ánh hoàng hôn tím',
        color: 'rgba(99, 102, 241, 0.09)',
        bgTop: '#090d16',
        bgBottom: '#1e1b4b',
        accent: '#a855f7',
        icon: 'dusk' as const,
        isNight: false,
      };
    } else {
      // Night (20:30 - 05:00): Midnight deep slate
      return {
        period: 'night' as const,
        timeStr,
        label: 'Ban đêm',
        sub: 'Ánh đêm yên tĩnh',
        color: 'rgba(15, 23, 42, 0.28)',
        bgTop: '#020617',
        bgBottom: '#090d16',
        accent: '#818cf8',
        icon: 'night' as const,
        isNight: true,
      };
    }
  }, [db.settings.dayNight, localTime]);

  const isNight = useCallback(() => ambientInfo.isNight, [ambientInfo.isNight]);

  // Rounded rectangle helper
  const rr = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }, []);

  // 3D Isometric Box helper
  const box = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    d: number,
    h: number,
    top: string,
    left: string,
    right: string,
    lift = 0
  ) => {
    const p00 = iso(x, y);
    const p10 = iso(x + w, y);
    const p11 = iso(x + w, y + d);
    const p01 = iso(x, y + d);
    const up = (q: { x: number; y: number }) => ({ x: q.x, y: q.y - h - lift });
    const t00 = up(p00), t10 = up(p10), t11 = up(p11), t01 = up(p01);

    // Left face
    ctx.fillStyle = left;
    ctx.beginPath();
    ctx.moveTo(p01.x, p01.y - lift);
    ctx.lineTo(p11.x, p11.y - lift);
    ctx.lineTo(t11.x, t11.y);
    ctx.lineTo(t01.x, t01.y);
    ctx.closePath();
    ctx.fill();

    // Right face
    ctx.fillStyle = right;
    ctx.beginPath();
    ctx.moveTo(p11.x, p11.y - lift);
    ctx.lineTo(p10.x, p10.y - lift);
    ctx.lineTo(t10.x, t10.y);
    ctx.lineTo(t11.x, t11.y);
    ctx.closePath();
    ctx.fill();

    // Top face
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(t00.x, t00.y);
    ctx.lineTo(t10.x, t10.y);
    ctx.lineTo(t11.x, t11.y);
    ctx.lineTo(t01.x, t01.y);
    ctx.closePath();
    ctx.fill();

    return { t00, t10, t11, t01 };
  }, [iso]);


  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let reqId: number;

    const render = (ts: number) => {
      timeRef.current = ts;

      // Handle camera tweening
      if (animRef.current) {
        const a = animRef.current;
        const k = Math.max(0, Math.min(1, (performance.now() - a.t0) / a.ms));
        const ease = 1 - Math.pow(1 - k, 3);
        camRef.current.x = a.from.x + (a.to.x - a.from.x) * ease;
        camRef.current.y = a.from.y + (a.to.y - a.from.y) * ease;
        camRef.current.zoom = a.from.zoom + (a.to.zoom - a.from.zoom) * ease;
        setZoomDisplay(Math.round(camRef.current.zoom * 100));
        if (k >= 1) animRef.current = null;
      }

      // Resize check
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }

      const cam = camRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Atmospheric background gradient matching current time-of-day
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, ambientInfo.bgTop);
      bgGrad.addColorStop(1, ambientInfo.bgBottom);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Camera transform
      ctx.setTransform(
        dpr * cam.zoom,
        0,
        0,
        dpr * cam.zoom,
        dpr * (W / 2 + cam.x),
        dpr * (H / 2 + cam.y)
      );

      hitsRef.current = [];
      const zoneLabelHits: HitTarget[] = [];

      // 1. Base Building Floor with customizable Floor Texture
      const floorTex = db.settings.floorTexture || 'concrete';
      const maxX = Math.max(...db.zones.map(z => z.x + z.w)) + 2;
      const maxY = Math.max(...db.zones.map(z => z.y + z.h)) + 2;
      const floorPoly = [iso(0, 0), iso(maxX, 0), iso(maxX, maxY), iso(0, maxY)];

      if (floorTex === 'wood') {
        // Warm Wood Parquet Slab Sides
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.moveTo(floorPoly[3].x, floorPoly[3].y);
        ctx.lineTo(floorPoly[3].x, floorPoly[3].y + 22);
        ctx.lineTo(floorPoly[2].x, floorPoly[2].y + 22);
        ctx.lineTo(floorPoly[1].x, floorPoly[1].y + 22);
        ctx.lineTo(floorPoly[1].x, floorPoly[1].y);
        ctx.lineTo(floorPoly[2].x, floorPoly[2].y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.moveTo(floorPoly[2].x, floorPoly[2].y);
        ctx.lineTo(floorPoly[2].x, floorPoly[2].y + 22);
        ctx.lineTo(floorPoly[1].x, floorPoly[1].y + 22);
        ctx.lineTo(floorPoly[1].x, floorPoly[1].y);
        ctx.closePath();
        ctx.fill();

        // Top Warm Honey Wood Base
        ctx.fillStyle = '#dcc7aa';
        ctx.beginPath();
        floorPoly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.fill();

        // Hardwood parquet planks texture
        ctx.save();
        ctx.beginPath();
        floorPoly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.clip();

        const plankTones = ['#e0cdb2', '#d8c2a5', '#decab0', '#d2bb9b', '#e4d4ba'];
        for (let x = 0; x < maxX; x++) {
          for (let y = 0; y < maxY; y++) {
            const p00 = iso(x, y);
            const p10 = iso(x + 1, y);
            const p11 = iso(x + 1, y + 1);
            const p01 = iso(x, y + 1);

            const tone = plankTones[(x * 5 + y * 11) % plankTones.length];
            ctx.fillStyle = tone;
            ctx.beginPath();
            ctx.moveTo(p00.x, p00.y);
            ctx.lineTo(p10.x, p10.y);
            ctx.lineTo(p11.x, p11.y);
            ctx.lineTo(p01.x, p01.y);
            ctx.closePath();
            ctx.fill();

            // Planks wood grain line
            ctx.strokeStyle = 'rgba(120, 53, 15, 0.15)';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo((p00.x + p10.x) / 2, (p00.y + p10.y) / 2);
            ctx.lineTo((p01.x + p11.x) / 2, (p01.y + p11.y) / 2);
            ctx.stroke();

            // Parquet seam border
            ctx.strokeStyle = 'rgba(120, 53, 15, 0.2)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p00.x, p00.y);
            ctx.lineTo(p10.x, p10.y);
            ctx.lineTo(p11.x, p11.y);
            ctx.lineTo(p01.x, p01.y);
            ctx.closePath();
            ctx.stroke();
          }
        }
        ctx.restore();
      } else if (floorTex === 'tile') {
        // Minimalist Porcelain Tile Slab Sides
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(floorPoly[3].x, floorPoly[3].y);
        ctx.lineTo(floorPoly[3].x, floorPoly[3].y + 22);
        ctx.lineTo(floorPoly[2].x, floorPoly[2].y + 22);
        ctx.lineTo(floorPoly[1].x, floorPoly[1].y + 22);
        ctx.lineTo(floorPoly[1].x, floorPoly[1].y);
        ctx.lineTo(floorPoly[2].x, floorPoly[2].y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(floorPoly[2].x, floorPoly[2].y);
        ctx.lineTo(floorPoly[2].x, floorPoly[2].y + 22);
        ctx.lineTo(floorPoly[1].x, floorPoly[1].y + 22);
        ctx.lineTo(floorPoly[1].x, floorPoly[1].y);
        ctx.closePath();
        ctx.fill();

        // Minimalist White Porcelain Base
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        floorPoly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.fill();

        // High-end ceramic grid tiles with glossy sheen
        ctx.save();
        ctx.beginPath();
        floorPoly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.clip();

        for (let x = 0; x < maxX; x++) {
          for (let y = 0; y < maxY; y++) {
            const p00 = iso(x, y);
            const p10 = iso(x + 1, y);
            const p11 = iso(x + 1, y + 1);
            const p01 = iso(x, y + 1);

            const isLight = (x + y) % 2 === 0;
            ctx.fillStyle = isLight ? '#ffffff' : '#f1f5f9';
            ctx.beginPath();
            ctx.moveTo(p00.x, p00.y);
            ctx.lineTo(p10.x, p10.y);
            ctx.lineTo(p11.x, p11.y);
            ctx.lineTo(p01.x, p01.y);
            ctx.closePath();
            ctx.fill();

            // Grout line
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Gloss sheen highlight
            if (isLight) {
              const cx = (p00.x + p10.x + p11.x + p01.x) / 4;
              const cy = (p00.y + p10.y + p11.y + p01.y) / 4;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
              ctx.beginPath();
              ctx.arc(cx, cy, 3, 0, 6.28);
              ctx.fill();
            }
          }
        }
        ctx.restore();
      } else {
        // Modern Concrete (Default)
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(floorPoly[3].x, floorPoly[3].y);
        ctx.lineTo(floorPoly[3].x, floorPoly[3].y + 22);
        ctx.lineTo(floorPoly[2].x, floorPoly[2].y + 22);
        ctx.lineTo(floorPoly[1].x, floorPoly[1].y + 22);
        ctx.lineTo(floorPoly[1].x, floorPoly[1].y);
        ctx.lineTo(floorPoly[2].x, floorPoly[2].y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(floorPoly[2].x, floorPoly[2].y);
        ctx.lineTo(floorPoly[2].x, floorPoly[2].y + 22);
        ctx.lineTo(floorPoly[1].x, floorPoly[1].y + 22);
        ctx.lineTo(floorPoly[1].x, floorPoly[1].y);
        ctx.closePath();
        ctx.fill();

        // Architectural concrete slab
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        floorPoly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Concrete expansion joints every 3 tiles
        ctx.save();
        ctx.beginPath();
        floorPoly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.clip();
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.28)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= maxX; x += 3) {
          const a = iso(x, 0);
          const b = iso(x, maxY);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        for (let y = 0; y <= maxY; y += 3) {
          const a = iso(0, y);
          const b = iso(maxX, y);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Zone Floor Tiles
      for (const z of db.zones) {
        const poly = [
          iso(z.x, z.y),
          iso(z.x + z.w, z.y),
          iso(z.x + z.w, z.y + z.h),
          iso(z.x, z.y + z.h),
        ];
        const isHl = highlightZoneId === z.id;
        const isVirtual = z.isVirtual;

        if (isVirtual) {
          // Futuristic Holographic Virtual Meeting Zone Floor
          ctx.save();
          ctx.fillStyle = z.color || 'rgba(139, 92, 246, 0.22)';
          ctx.beginPath();
          poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
          ctx.closePath();
          ctx.fill();

          // Animated Cyber Glow Perimeter
          ctx.setLineDash([10, 4, 2, 4]);
          ctx.lineDashOffset = -(ts / 80) % 20;
          ctx.lineWidth = isHl ? 3.5 : 2.2;
          ctx.strokeStyle = z.accent || '#8b5cf6';
          ctx.globalAlpha = 0.9 + 0.1 * Math.sin(ts / 200);
          ctx.stroke();

          // Corner cyber brackets
          const corners = [
            iso(z.x, z.y),
            iso(z.x + z.w, z.y),
            iso(z.x + z.w, z.y + z.h),
            iso(z.x, z.y + z.h),
          ];
          ctx.fillStyle = z.accent || '#8b5cf6';
          corners.forEach(cp => {
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, 4, 0, 6.28);
            ctx.fill();
          });
          ctx.restore();

          // Department & Virtual badge etched onto isometric floor
          const ep = iso(z.x + 0.6, z.y + z.h - 0.4);
          ctx.save();
          ctx.transform(1, 0.5, -1, 0.5, ep.x, ep.y);
          ctx.font = `800 ${Math.max(11, Math.min(16, z.w * 1.3))}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillStyle = z.accent || '#8b5cf6';
          ctx.globalAlpha = 0.85;
          ctx.fillText(`🌐 ${z.name.toUpperCase()}`, 0, 0);
          ctx.restore();

          // Register floor hit
          hitsRef.current.push({ kind: 'virtualMeeting', id: z.id, x: z.x, y: z.y, w: z.w, h: z.h });
        } else {
          // Standard Zone pad
          ctx.fillStyle = z.color;
          ctx.beginPath();
          poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
          ctx.closePath();
          ctx.fill();

          // Perimeter line
          ctx.save();
          ctx.setLineDash([7, 5]);
          ctx.lineWidth = isHl ? 3 : 1.5;
          ctx.strokeStyle = z.accent;
          ctx.globalAlpha = isHl ? 1 : 0.7;
          ctx.stroke();
          ctx.restore();

          // Department name etched onto the isometric floor
          const label = z.name.toUpperCase();
          const fontSize = Math.max(11, Math.min(18, z.w * 1.45));
          const ep = iso(z.x + 0.6, z.y + z.h - 0.35);
          const nameHot = hoverTarget?.kind === 'zone' && hoverTarget.id === z.id;
          ctx.save();
          ctx.transform(1, 0.5, -1, 0.5, ep.x, ep.y);
          ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
          const textW = ctx.measureText(label).width;
          ctx.fillStyle = z.accent;
          ctx.globalAlpha = nameHot || isHl ? 0.92 : 0.45;
          ctx.fillText(label, 0, 0);
          ctx.restore();

          zoneLabelHits.push({
            kind: 'zone',
            id: z.id,
            x: ep.x,
            y: ep.y,
            w: textW,
            h: fontSize,
            space: 'label',
          });

          drawTeamSections(ctx, iso, z, db);

          // Floor is in world grid units — click anywhere on the pad to open details
          hitsRef.current.push({ kind: 'zone', id: z.id, x: z.x, y: z.y, w: z.w, h: z.h, space: 'world' });
        }
      }

      // 3. Grid if enabled
      if (db.settings.grid) {
        ctx.save();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let x = 0; x <= maxX; x++) {
          const a = iso(x, 0);
          const b = iso(x, maxY);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        for (let y = 0; y <= maxY; y++) {
          const a = iso(0, y);
          const b = iso(maxX, y);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 4. Connection Lines if enabled
      if (db.settings.connections) {
        ctx.save();
        const center = (e: Employee) => iso(e.desk!.x + 0.5, e.desk!.y + 0.5);
        for (const z of db.zones) {
          const head = deptHead(z.id);
          const teams = db.teams.filter(t => t.dept === z.id);
          for (const t of teams) {
            if (t.id === 'leaders' || t.id === 'bgd') continue;
            const members = activeEmps().filter(e => e.team === t.id && e.desk);
            const lead = members.find(e => isLeader(e)) || members[0];
            if (!lead || !lead.desk) continue;

            if (head && head.desk) {
              ctx.setLineDash([5, 5]);
              ctx.lineWidth = 1.4;
              ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)'; // Command link
              const a = center(head);
              const b = center(lead);
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }

            for (const m of members) {
              if (m.id === lead.id || !m.desk) continue;
              ctx.setLineDash([2, 4]);
              ctx.lineWidth = 1.1;
              ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)'; // Reporting link
              const a = center(m);
              const b = center(lead);
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      // 5. Sorted Isometric Entities (Walls, Furniture, Desks, People, AI Agents)
      interface Entity {
        depth: number;
        draw: () => void;
      }
      const entities: Entity[] = [];

      // Glass partition walls along the back edges of each zone
      const WALL_H = 28;
      for (const z of db.zones) {
        for (let i = 0; i < z.w; i++) {
          const a = iso(z.x + i, z.y);
          const b = iso(z.x + i + 1, z.y);
          entities.push({
            depth: z.x + i + z.y - 0.9,
            draw: () => {
              ctx.save();
              ctx.globalAlpha = 0.22;
              ctx.fillStyle = z.accent;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.lineTo(b.x, b.y - WALL_H);
              ctx.lineTo(a.x, a.y - WALL_H);
              ctx.closePath();
              ctx.fill();

              ctx.globalAlpha = 0.5;
              ctx.strokeStyle = z.accent;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y - WALL_H);
              ctx.lineTo(b.x, b.y - WALL_H);
              ctx.stroke();

              // Festive ornaments on wall top
              if (db.settings.theme === 'tet' && i % 3 === 0) {
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2 - WALL_H;
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.ellipse(mx, my + 6, 4.5, 6, 0, 0, 6.28);
                ctx.fill();
                ctx.fillStyle = '#eab308';
                ctx.fillRect(mx - 1.2, my + 12, 2.4, 4);
              }
              if (db.settings.theme === 'noel' && i % 3 === 0) {
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2 - WALL_H;
                ctx.fillStyle = i % 2 === 0 ? '#10b981' : '#ef4444';
                ctx.beginPath();
                ctx.arc(mx, my + 6, 4, 0, 6.28);
                ctx.fill();
              }
              ctx.restore();
            },
          });
        }

        for (let i = 0; i < z.h; i++) {
          const a = iso(z.x, z.y + i);
          const b = iso(z.x, z.y + i + 1);
          entities.push({
            depth: z.x + z.y + i - 0.9,
            draw: () => {
              ctx.save();
              ctx.globalAlpha = 0.22;
              ctx.fillStyle = z.accent;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.lineTo(b.x, b.y - WALL_H);
              ctx.lineTo(a.x, a.y - WALL_H);
              ctx.closePath();
              ctx.fill();

              ctx.globalAlpha = 0.5;
              ctx.strokeStyle = z.accent;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y - WALL_H);
              ctx.lineTo(b.x, b.y - WALL_H);
              ctx.stroke();
              ctx.restore();
            },
          });
        }
      }

      // Office Props & Furniture
      for (const z of db.zones) {
        // Lush potted plants at zone corners
        const plant1 = { x: z.x + z.w - 0.65, y: z.y + 0.45 };
        const plant2 = { x: z.x + 0.45, y: z.y + z.h - 0.65 };
        [plant1, plant2].forEach(p => {
          entities.push({
            depth: p.x + p.y,
            draw: () => {
              const q = iso(p.x, p.y);
              // Terracotta ceramic pot
              ctx.fillStyle = '#b45309';
              rr(ctx, q.x - 7, q.y - 12, 14, 12, 2.5);
              ctx.fill();
              ctx.fillStyle = '#78350f';
              ctx.fillRect(q.x - 6, q.y - 12, 12, 2);

              // Leafy foliage
              ctx.fillStyle = '#15803d';
              ctx.beginPath();
              ctx.arc(q.x, q.y - 23, 11, 0, 6.28);
              ctx.fill();

              ctx.fillStyle = '#22c55e';
              ctx.beginPath();
              ctx.arc(q.x - 4, q.y - 28, 7, 0, 6.28);
              ctx.arc(q.x + 4, q.y - 28, 6.5, 0, 6.28);
              ctx.fill();

              // Tết peach blossom flowers
              if (db.settings.theme === 'tet') {
                ctx.fillStyle = '#f472b6';
                for (let k = 0; k < 6; k++) {
                  ctx.beginPath();
                  ctx.arc(q.x - 8 + k * 3.2, q.y - 32 + (k % 2) * 5, 2, 0, 6.28);
                  ctx.fill();
                }
              }
              // Noel star
              if (db.settings.theme === 'noel') {
                ctx.fillStyle = '#facc15';
                ctx.beginPath();
                ctx.arc(q.x, q.y - 35, 3, 0, 6.28);
                ctx.fill();
              }
            },
          });
        });

        // Special zone features
        if (z.id === 'dieu-hanh') {
          // Executive Bookshelf
          entities.push({
            depth: z.x + 0.5 + z.y + 3.5,
            draw: () => {
              const r = box(ctx, z.x + 0.5, z.y + 3.5, 0.9, 2.6, 38, '#78350f', '#451a03', '#92400e');
              // Books & awards
              ctx.fillStyle = '#eab308';
              ctx.fillRect(r.t01.x + 2, r.t01.y + 6, 3.5, 12);
              ctx.fillStyle = '#3b82f6';
              ctx.fillRect(r.t01.x + 6, r.t01.y + 4, 3.5, 12);
              ctx.fillStyle = '#10b981';
              ctx.fillRect(r.t01.x + 10, r.t01.y + 2, 3.5, 12);
            },
          });
          // Executive Sofa
          entities.push({
            depth: z.x + z.w - 2.5 + z.y + z.h - 1.5,
            draw: () => {
              box(ctx, z.x + z.w - 2.5, z.y + z.h - 1.5, 2.2, 1.1, 10, '#c2410c', '#7c2d12', '#9a3412');
              box(ctx, z.x + z.w - 2.5, z.y + z.h - 1.5, 2.2, 0.35, 19, '#ea580c', '#7c2d12', '#9a3412');
            },
          });
        }

        if (z.id === 'leader-hub') {
          // Interactive Whiteboard with animated line chart
          entities.push({
            depth: z.x + 0.5 + z.y + 3.5,
            draw: () => {
              box(ctx, z.x + 0.5, z.y + 3.5, 0.35, 3.2, 32, '#0f172a', '#020617', '#1e293b');
              const a = iso(z.x + 0.35, z.y + 0.4);
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              for (let k = 0; k < 9; k++) {
                const px = a.x - k * 10;
                const py = a.y - 28 + k * 4 + Math.sin(k * 1.8 + ts / 450) * 4;
                if (k === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.stroke();
            },
          });
        }

        if (z.id === 'ky-thuat') {
          // High-tech Server Rack with blinking activity LEDs
          entities.push({
            depth: z.x + z.w - 1.5 + z.y + z.h - 1.5,
            draw: () => {
              const q = iso(z.x + z.w - 1.5, z.y + z.h - 1.5);
              box(ctx, z.x + z.w - 1.5, z.y + z.h - 1.5, 0.9, 0.9, 42, '#0f172a', '#020617', '#1e293b');
              for (let k = 0; k < 7; k++) {
                const ledCol = (k + Math.floor(ts / 300)) % 3 === 0 ? '#10b981' : (k % 2 === 0 ? '#38bdf8' : '#f59e0b');
                ctx.fillStyle = ledCol;
                ctx.fillRect(q.x + 4, q.y - 34 + k * 5, 2.5, 2.5);
              }
            },
          });
        }

        if (z.id === 'le-tan') {
          // Modern Reception Counter
          entities.push({
            depth: z.x + 2 + z.y + 1.2,
            draw: () => {
              const r = box(ctx, z.x + 2, z.y + 1.2, 4.2, 1.1, 18, '#f1f5f9', '#94a3b8', '#cbd5e1');
              ctx.font = '800 8.5px "Plus Jakarta Sans", sans-serif';
              ctx.fillStyle = '#0f172a';
              ctx.save();
              ctx.translate(r.t01.x + 14, r.t01.y + 11);
              ctx.transform(1, -0.5, 0, 1, 0, 0);
              ctx.fillText('LỄ TÂN · RECEPTION', 0, 0);
              ctx.restore();
            },
          });

          // Café Bar & Espresso Machine with steam particles
          entities.push({
            depth: z.x + z.w - 7 + z.y + 1.2,
            draw: () => {
              const r = box(ctx, z.x + z.w - 7, z.y + 1.2, 4.2, 1.1, 18, '#451a03', '#1c0a00', '#2e1002');
              // Espresso machine on counter
              box(ctx, z.x + z.w - 5.8, z.y + 1.4, 0.8, 0.6, 12, '#e2e8f0', '#64748b', '#94a3b8', 18);
              ctx.font = '800 8px "Plus Jakarta Sans", sans-serif';
              ctx.fillStyle = '#fde68a';
              ctx.save();
              ctx.translate(r.t01.x + 12, r.t01.y + 11);
              ctx.transform(1, -0.5, 0, 1, 0, 0);
              ctx.fillText(`${db.company.short} CAFÉ ☕`, 0, 0);
              ctx.restore();

              // Steam rising
              const sp = iso(z.x + z.w - 5.4, z.y + 1.6);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
              for (let s = 0; s < 3; s++) {
                const sy = sp.y - 32 - ((ts / 20 + s * 14) % 24);
                const sx = sp.x + Math.sin(sy / 6) * 3;
                ctx.beginPath();
                ctx.arc(sx, sy, 2.2 + s * 0.8, 0, 6.28);
                ctx.fill();
              }
            },
          });

          // Lounge Sofas & Coffee Tables for visitors
          const sofaPos = [
            { x: z.x + 12, y: z.y + 4.5 },
            { x: z.x + 16, y: z.y + 4.5 },
            { x: z.x + 22, y: z.y + 4.5 },
            { x: z.x + 26, y: z.y + 4.5 },
          ];
          sofaPos.forEach(p => {
            entities.push({
              depth: p.x + p.y,
              draw: () => {
                box(ctx, p.x, p.y, 2, 1, 10, '#0284c7', '#0369a1', '#075985');
                box(ctx, p.x, p.y, 2, 0.35, 18, '#38bdf8', '#0369a1', '#075985');
              },
            });
          });

          const tablePos = [
            { x: z.x + 14.2, y: z.y + 5.2 },
            { x: z.x + 24.2, y: z.y + 5.2 },
          ];
          tablePos.forEach(p => {
            entities.push({
              depth: p.x + p.y,
              draw: () => {
                box(ctx, p.x, p.y, 0.9, 0.9, 11, '#fef08a', '#ca8a04', '#eab308');
                const tq = iso(p.x + 0.45, p.y + 0.45);
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(tq.x, tq.y - 12, 3, 0, 6.28);
                ctx.fill();
              },
            });
          });
        }
      }
      // Desks & Employees (High-End Isometric Workstations)
      for (const e of activeEmps()) {
        if (!e.desk) continue;
        const eTeam = team(e.team);
        const tColor = eTeam ? eTeam.color : '#3b82f6';
        const st = todayStatus(e.id);
        const isAway = st === 'absent' || st === 'leave' || st === 'off';
        const isRemote = st === 'remote';
        const isLate = st === 'late';
        const isSelected = focusedEmpId === e.id || (hoverTarget && hoverTarget.kind === 'emp' && hoverTarget.id === e.id);
        const isMeetingSelected = selectedMeetingEmpIds.includes(e.id);
        const isTeamHighlighted = highlightTeamId === e.team;

        const gx = e.desk.x;
        const gy = e.desk.y;
        const dCenter = iso(gx + 0.5, gy + 0.5);
        const charPos = iso(gx + 0.45, gy + 0.45);

        // 1. Employee Character & Ergonomic Chair
        entities.push({
          depth: gx + gy + 0.5,
          draw: () => {
            ctx.save();

            // Selection / Focus Highlight ring
            if (isMeetingSelected) {
              const pulse = 1 + 0.12 * Math.sin(ts / 160);
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 3.2;
              ctx.beginPath();
              ctx.ellipse(charPos.x, charPos.y + 1, 18 * pulse, 9 * pulse, 0, 0, 6.28);
              ctx.stroke();

              // Extra outer glow
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.ellipse(charPos.x, charPos.y + 1, 23 * pulse, 11.5 * pulse, 0, 0, 6.28);
              ctx.stroke();
            } else if (isSelected || isTeamHighlighted) {
              ctx.strokeStyle = isSelected ? '#3b82f6' : tColor;
              ctx.lineWidth = 2.4;
              ctx.beginPath();
              ctx.ellipse(charPos.x, charPos.y + 1, 16, 8, 0, 0, 6.28);
              ctx.stroke();
            }

            // Draw the professional person on their ergonomic chair
            drawPerson(
              ctx,
              charPos.x,
              charPos.y,
              e.avatar || {},
              tColor,
              e.gender,
              ts / 750 + gx,
              isLeader(e),
              e.dept,
              e.role,
              st,
              true // isSeated
            );
            ctx.restore();

            // Name Tag Badge Floating Above Head
            if (db.settings.nameTags) {
              const name = shortName(e);
              const isLeadEmp = isLeader(e);
              ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
              const textWidth = ctx.measureText(name).width;

              // Extra badge width for Remote [TỪ XA] or Off [NGHỈ] or Leader badge
              const extraW = isRemote ? 44 : isAway ? 40 : isLeadEmp ? 28 : 22;
              const badgeW = textWidth + extraW;
              const badgeX = charPos.x - badgeW / 2;
              const badgeY = charPos.y - 58;

              // Drop shadow
              ctx.fillStyle = isRemote
                ? 'rgba(2, 132, 199, 0.22)'
                : isAway
                ? 'rgba(100, 116, 139, 0.12)'
                : 'rgba(15, 23, 42, 0.16)';
              rr(ctx, badgeX + 1, badgeY + 1.5, badgeW, 19, 9.5);
              ctx.fill();

              // Badge Body styling
              if (isAway) {
                // "ai off thì xám cả người cả bảng tên": Gray out badge completely
                ctx.fillStyle = '#f1f5f9';
                rr(ctx, badgeX, badgeY, badgeW, 19, 9.5);
                ctx.fill();
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1.4;
                ctx.stroke();
              } else if (isRemote) {
                // "ai làm việc từ xa thì bảng tên có bao xanh nước biển": Ocean Blue Enclosure
                ctx.fillStyle = '#f0f9ff';
                rr(ctx, badgeX, badgeY, badgeW, 19, 9.5);
                ctx.fill();
                ctx.strokeStyle = '#0284c7'; // Vivid Ocean Blue border
                ctx.lineWidth = 2.2;
                ctx.stroke();
              } else {
                // Active on-site employee
                ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.98)';
                rr(ctx, badgeX, badgeY, badgeW, 19, 9.5);
                ctx.fill();
                ctx.strokeStyle = isSelected ? '#3b82f6' : isLeadEmp ? '#f59e0b' : 'rgba(15, 23, 42, 0.14)';
                ctx.lineWidth = isSelected ? 1.8 : 1;
                ctx.stroke();
              }

              // Status indicator dot
              const dotColor = isAway
                ? '#94a3b8' // Slate gray dot
                : isRemote
                ? '#0284c7' // Ocean blue dot
                : isLate
                ? '#f59e0b' // Amber late dot
                : '#10b981'; // Emerald green present dot

              ctx.fillStyle = dotColor;
              ctx.beginPath();
              ctx.arc(badgeX + 8.5, badgeY + 9.5, 3.5, 0, 6.28);
              ctx.fill();

              // Leader Icon indicator
              let textOffset = badgeX + 16;
              if (isLeadEmp && !isAway) {
                ctx.fillStyle = '#f59e0b';
                ctx.font = '10px sans-serif';
                ctx.fillText('👑', badgeX + 14, badgeY + 13.5);
                textOffset += 12;
              }

              // Employee Name
              ctx.fillStyle = isAway
                ? '#64748b' // Desaturated slate name
                : isRemote
                ? '#0369a1' // Deep ocean blue name
                : '#0f172a'; // Bold dark slate name
              ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
              ctx.textBaseline = 'middle';
              ctx.fillText(name, textOffset, badgeY + 10);
              ctx.textBaseline = 'alphabetic';

              // Right pill tags for Remote [TỪ XA] or Off [NGHỈ]
              if (isRemote) {
                const tagW = 28;
                const tagX = badgeX + badgeW - tagW - 4;
                ctx.fillStyle = '#0284c7'; // Ocean blue pill
                rr(ctx, tagX, badgeY + 3.5, tagW, 12, 6);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = '700 7.5px "Plus Jakarta Sans", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('TỪ XA', tagX + tagW / 2, badgeY + 12);
                ctx.textAlign = 'start';
              } else if (isAway) {
                const tagW = 26;
                const tagX = badgeX + badgeW - tagW - 4;
                ctx.fillStyle = '#94a3b8'; // Neutral slate gray pill
                rr(ctx, tagX, badgeY + 3.5, tagW, 12, 6);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = '700 7.5px "Plus Jakarta Sans", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('NGHỈ', tagX + tagW / 2, badgeY + 12);
                ctx.textAlign = 'start';
              }
            }

            // Meeting Selection Indicator Badge
            if (isMeetingSelected) {
              ctx.font = '700 8.5px "Plus Jakarta Sans", sans-serif';
              const selText = '✓ ĐÃ CHỌN';
              const selW = ctx.measureText(selText).width + 12;
              const selX = charPos.x - selW / 2;
              const selY = charPos.y - 78;
              ctx.fillStyle = '#0284c7';
              rr(ctx, selX, selY, selW, 16, 8);
              ctx.fill();
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 1.2;
              ctx.stroke();
              ctx.fillStyle = '#ffffff';
              ctx.textBaseline = 'middle';
              ctx.fillText(selText, selX + 6, selY + 8);
              ctx.textBaseline = 'alphabetic';
            }

            // Hit detection zone
            hitsRef.current.push({
              kind: 'emp',
              id: e.id,
              x: charPos.x - 16,
              y: charPos.y - 48,
              w: 32,
              h: 52,
            });
          },
        });

        // 2. Desk Table, Mechanical Keyboard, Side-Angled Curved Monitor & Workstation Props
        entities.push({
          depth: gx + gy + 0.65,
          draw: () => {
            // Desk table slab (DESK_H = 12)
            box(ctx, gx + 0.12, gy + 0.12, 0.76, 0.76, 12, '#f8fafc', '#cbd5e1', '#e2e8f0');

            // Desk Mat (Dark navy / charcoal felt pad)
            ctx.fillStyle = '#1e293b';
            rr(ctx, dCenter.x - 11, dCenter.y - 12 - 1, 22, 9, 2);
            ctx.fill();

            // Low-Profile Mechanical Keyboard right in front of employee hands
            ctx.fillStyle = '#334155';
            rr(ctx, dCenter.x - 6.5, dCenter.y - 12 + 1, 13, 4.5, 1);
            ctx.fill();
            // Keycaps accent glow in team color
            ctx.fillStyle = tColor;
            ctx.globalAlpha = 0.75;
            ctx.fillRect(dCenter.x - 5.5, dCenter.y - 12 + 2, 11, 2);
            ctx.globalAlpha = 1;

            // Ergonomic Precision Mouse
            ctx.fillStyle = '#475569';
            rr(ctx, dCenter.x + 8, dCenter.y - 12 + 2, 2.8, 3.8, 1);
            ctx.fill();

            // Hot Ceramic Coffee Mug with delicate steam
            const mugX = dCenter.x - 12.5;
            const mugY = dCenter.y - 12;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(mugX, mugY, 2.4, 0, 6.28);
            ctx.fill();
            ctx.fillStyle = '#78350f'; // Dark roast coffee
            ctx.beginPath();
            ctx.arc(mugX, mugY, 1.7, 0, 6.28);
            ctx.fill();
            // Rising steam curl only when active
            if (!isAway) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(mugX, mugY - 3);
              ctx.quadraticCurveTo(mugX + 1.5, mugY - 6, mugX, mugY - 8.5);
              ctx.stroke();
            }

            // Succulent Desk Plant in geometric ceramic planter
            const plantX = dCenter.x - 12.5;
            const plantY = dCenter.y - 12 - 5.5;
            ctx.fillStyle = '#d97706'; // Terracotta pot
            rr(ctx, plantX - 2.5, plantY - 2.5, 5, 3.5, 1);
            ctx.fill();
            ctx.fillStyle = '#16a34a'; // Jade succulent leaves
            ctx.beginPath();
            ctx.arc(plantX, plantY - 3.8, 2, 0, 6.28);
            ctx.fill();

            // Sleek Curved Workstation Monitor - ANGLED ON THE SIDE CORNER
            // Placed at dCenter.x + 11 so it NEVER blocks the employee's body or face!
            const monX = dCenter.x + 11;
            const monY = dCenter.y - 12 - 9;
            // Monitor stand
            ctx.fillStyle = '#64748b';
            ctx.fillRect(monX - 1.5, monY + 8, 3, 4);
            ctx.fillRect(monX - 3.5, monY + 11, 7, 1.2);

            // Slim Bezel Monitor Chassis
            ctx.fillStyle = '#0f172a';
            rr(ctx, monX - 9, monY - 3, 18, 12, 2);
            ctx.fill();

            // Active vs. Offline Monitor Display
            if (isAway) {
              // Monitor in standby / sleep mode
              ctx.fillStyle = '#090d16';
              ctx.fillRect(monX - 8, monY - 2, 16, 9.5);
              // Standby amber status indicator LED
              ctx.fillStyle = '#f59e0b';
              ctx.beginPath();
              ctx.arc(monX + 6, monY + 6, 1, 0, 6.28);
              ctx.fill();
            } else {
              // Luminous Active Screen Display (with specialized departmental interface graphics!)
              ctx.fillStyle = '#020617';
              ctx.fillRect(monX - 8, monY - 2, 16, 9.5);

              if (e.dept === 'ky-thuat') {
                // Code IDE with syntax highlighting (green, cyan, amber)
                ctx.fillStyle = '#10b981';
                ctx.fillRect(monX - 6, monY, 5, 1);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(monX, monY, 5, 1);
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(monX - 6, monY + 2.5, 7, 1);
                ctx.fillStyle = '#a855f7';
                ctx.fillRect(monX - 6, monY + 5, 4, 1);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(monX - 1, monY + 5, 6, 1);
              } else if (e.dept === 'kinh-doanh' || e.dept === 'dieu-hanh' || e.dept === 'leader-hub') {
                // Upward Revenue & KPI Bar Charts
                ctx.fillStyle = '#10b981';
                ctx.fillRect(monX - 6, monY + 4, 2.2, 3);
                ctx.fillRect(monX - 3, monY + 2, 2.2, 5);
                ctx.fillRect(monX, monY + 1, 2.2, 6);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(monX + 3, monY - 0.5, 2.8, 7.5);
              } else if (e.dept === 'marketing') {
                // Creative Design Art Canvas / Vector shapes
                ctx.fillStyle = '#ec4899';
                ctx.fillRect(monX - 6, monY, 5, 3.5);
                ctx.fillStyle = '#8b5cf6';
                ctx.fillRect(monX, monY, 5, 3.5);
                ctx.fillStyle = '#06b6d4';
                ctx.fillRect(monX - 6, monY + 5, 11, 2);
              } else {
                // HR Kanban cards & Attendance badges
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(monX - 6, monY, 3.5, 5.5);
                ctx.fillStyle = '#10b981';
                ctx.fillRect(monX - 1.5, monY, 3.5, 4);
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(monX + 3, monY, 3, 5);
              }

              // Soft screen ambient glow on desk surface
              ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
              ctx.beginPath();
              ctx.ellipse(monX, monY + 12, 10, 4, 0, 0, 6.28);
              ctx.fill();
            }

            // If employee is on leave / absent: display stylish wooden placard on desk
            if (isAway) {
              const tagX = dCenter.x - 3;
              const tagY = dCenter.y - 12 - 2;
              ctx.fillStyle = '#d97706';
              rr(ctx, tagX - 8, tagY - 4, 16, 7, 1.5);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = '700 6.5px "Plus Jakarta Sans", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('NGHỈ PHÉP', tagX, tagY + 1);
              ctx.textAlign = 'start';
            }
          },
        });
      }

      // AI Agents
      for (const a of db.agents) {
        const z = zone(a.dept);
        if (!z) continue;
        const ax = z.x + z.w - 1.8;
        const ay = z.y + 1.8;
        entities.push({
          depth: ax + ay,
          draw: () => {
            const base = iso(ax + 0.5, ay + 0.5);
            // Floating pedestal
            box(ctx, ax + 0.1, ay + 0.1, 0.8, 0.8, 8, '#312e81', '#1e1b4b', '#3730a3');
            const px = base.x;
            const bob = Math.sin(ts / 500 + ax) * 2;
            const py = base.y - 12 + bob;

            // Chassis
            ctx.fillStyle = '#f8fafc';
            rr(ctx, px - 9, py - 22, 18, 18, 5);
            ctx.fill();
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Glowing Visor
            ctx.fillStyle = '#0f172a';
            rr(ctx, px - 8, py - 19, 16, 12, 3);
            ctx.fill();

            const glow = 0.65 + 0.35 * Math.sin(ts / 250);
            ctx.fillStyle = `rgba(56, 189, 248, ${glow})`;
            ctx.fillRect(px - 5, py - 15, 3.5, 3.5);
            ctx.fillRect(px + 1.5, py - 15, 3.5, 3.5);
            ctx.fillRect(px - 3, py - 10, 6, 2);

            // Antenna & Beacon
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(px, py - 22);
            ctx.lineTo(px, py - 29);
            ctx.stroke();
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.arc(px, py - 30, 2.5, 0, 6.28);
            ctx.fill();

            // Name tag
            if (db.settings.nameTags) {
              const txt = a.name;
              ctx.font = '700 9.5px "Plus Jakarta Sans", sans-serif';
              const textWidth = ctx.measureText(txt).width;
              const badgeW = textWidth + 28;
              const badgeX = px - badgeW / 2;
              const badgeY = py - 46;

              ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
              rr(ctx, badgeX, badgeY, badgeW, 16, 8);
              ctx.fill();
              ctx.strokeStyle = '#6366f1';
              ctx.stroke();

              ctx.fillStyle = '#6366f1';
              ctx.beginPath();
              ctx.arc(badgeX + 8, badgeY + 8, 4.5, 0, 6.28);
              ctx.fill();

              ctx.fillStyle = '#fff';
              ctx.font = '800 6.5px sans-serif';
              ctx.textBaseline = 'middle';
              ctx.fillText('AI', badgeX + 5, badgeY + 8);

              ctx.fillStyle = '#0f172a';
              ctx.font = '700 9.5px "Plus Jakarta Sans", sans-serif';
              ctx.fillText(txt, badgeX + 17, badgeY + 8);
              ctx.textBaseline = 'alphabetic';
            }

            hitsRef.current.push({
              kind: 'agent',
              id: a.id,
              x: px - 12,
              y: py - 32,
              w: 24,
              h: 38,
            });
          },
        });
      }

      // Visitors in Lounge
      const visitorsToday = db.visitors.filter(v => v.date === D.today());
      const zLounge = zone('le-tan');
      if (zLounge) {
        visitorsToday.forEach((v, idx) => {
          const vx = zLounge.x + 12.5 + (idx % 4) * 4 + (idx > 3 ? 1 : 0);
          const vy = zLounge.y + 3.8 + (idx > 3 ? 2.5 : 0);
          entities.push({
            depth: vx + vy,
            draw: () => {
              const vf = iso(vx, vy);
              drawPerson(
                ctx,
                vf.x,
                vf.y,
                { skin: '#fde2cc', hair: idx % 4, hairColor: '#334155' },
                ['#475569', '#64748b', '#0369a1', '#0d9488'][idx % 4],
                idx % 2 === 0 ? 'M' : 'F',
                ts / 800 + idx,
                false,
                'le-tan',
                'Khách mời',
                'present',
                false // isSeated
              );

              if (db.settings.nameTags) {
                ctx.font = '600 9.5px "Plus Jakarta Sans", sans-serif';
                const tw = ctx.measureText(v.name).width;
                const bw = tw + 14;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                rr(ctx, vf.x - bw / 2, vf.y - 52, bw, 15, 7.5);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.textBaseline = 'middle';
                ctx.fillText(v.name, vf.x - bw / 2 + 7, vf.y - 44);
                ctx.textBaseline = 'alphabetic';
              }
            },
          });
        });
      }

      // Virtual Meeting Zones: 3D Conference Table, Holographic Projector, Seated Attendees & Billboard
      const virtualZones = db.zones.filter(z => z.isVirtual);
      for (const vz of virtualZones) {
        const vMeet = (db.meetings || []).find(m => m.id === vz.meetingId || m.virtualZoneId === vz.id);
        const tcx = vz.x + vz.w / 2;
        const tcy = vz.y + vz.h / 2;
        const accent = vz.accent || '#8b5cf6';
        const attendees = vMeet?.attendees || [];

        // 1. Center Futuristic Conference Table & Holographic Projector
        entities.push({
          depth: tcx + tcy,
          draw: () => {
            const tableCenter = iso(tcx, tcy);
            ctx.save();

            // Table Pedestals
            ctx.fillStyle = '#1e293b';
            [-1, 1].forEach(dx => {
              const basePos = iso(tcx + dx * 1.6, tcy);
              ctx.beginPath();
              ctx.ellipse(basePos.x, basePos.y - 4, 14, 7, 0, 0, 6.28);
              ctx.fill();
            });

            // Frosted Glass Table Top (Isometric Ellipse)
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.beginPath();
            ctx.ellipse(tableCenter.x, tableCenter.y - 18, 54, 26, 0, 0, 6.28);
            ctx.fill();

            // Glowing Cyber Rim
            ctx.strokeStyle = accent;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.ellipse(tableCenter.x, tableCenter.y - 18, 54, 26, 0, 0, 6.28);
            ctx.stroke();

            // Inner Table Glass Core
            ctx.fillStyle = 'rgba(99, 102, 241, 0.12)';
            ctx.beginPath();
            ctx.ellipse(tableCenter.x, tableCenter.y - 18, 42, 20, 0, 0, 6.28);
            ctx.fill();

            // Center Holographic Projector Base
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = accent;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(tableCenter.x, tableCenter.y - 18, 14, 7, 0, 0, 6.28);
            ctx.fill();
            ctx.stroke();

            // Pulsing Holographic Rings & Light Beam
            const holoPulse = 0.85 + 0.15 * Math.sin(ts / 220);
            ctx.strokeStyle = accent;
            ctx.lineWidth = 1.4;
            ctx.globalAlpha = 0.7 * holoPulse;
            ctx.beginPath();
            ctx.ellipse(tableCenter.x, tableCenter.y - 18 - 14 * holoPulse, 10 * holoPulse, 5 * holoPulse, 0, 0, 6.28);
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(tableCenter.x, tableCenter.y - 18 - 28 * holoPulse, 7 * holoPulse, 3.5 * holoPulse, 0, 0, 6.28);
            ctx.stroke();

            // Floating 3D Holographic Sphere / Node Icon
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(tableCenter.x, tableCenter.y - 18 - 36, 4, 0, 6.28);
            ctx.fill();

            // Holographic Rays
            ctx.strokeStyle = accent;
            ctx.lineWidth = 0.8;
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.moveTo(tableCenter.x - 12, tableCenter.y - 18);
            ctx.lineTo(tableCenter.x, tableCenter.y - 54);
            ctx.moveTo(tableCenter.x + 12, tableCenter.y - 18);
            ctx.lineTo(tableCenter.x, tableCenter.y - 54);
            ctx.stroke();

            // Floating 3D Meeting Billboard / Header Banner
            const bannerY = tableCenter.y - 82;
            const titleText = vMeet ? vMeet.title : vz.name;
            ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
            const titleW = Math.min(220, ctx.measureText(titleText).width + 24);
            const bannerX = tableCenter.x - titleW / 2;

            // Banner shadow & background
            ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
            rr(ctx, bannerX, bannerY, titleW, 36, 12);
            ctx.fill();

            ctx.strokeStyle = accent;
            ctx.lineWidth = 1.8;
            ctx.globalAlpha = 0.9;
            ctx.stroke();

            // Banner Title
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 10.5px "Plus Jakarta Sans", sans-serif';
            ctx.textBaseline = 'top';
            ctx.fillText(titleText, bannerX + 10, bannerY + 6);

            // Banner Subtext: Status & Time
            ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
            const isLive = vMeet?.status === 'in-progress' || vMeet?.date === D.today();
            ctx.fillStyle = isLive ? '#34d399' : '#38bdf8';
            ctx.fillText(
              `${isLive ? '🟢 ĐANG DIỄN RA' : '🔵 SẮP DIỄN RA'} · ${vMeet?.time || '10:00 - 11:30'} · 👥 ${attendees.length}`,
              bannerX + 10,
              bannerY + 20
            );
            ctx.textBaseline = 'alphabetic';

            ctx.restore();

            // Hit target for clicking the virtual meeting zone
            hitsRef.current.push({
              kind: 'virtualMeeting',
              id: vz.id,
              x: tableCenter.x - titleW / 2,
              y: bannerY,
              w: titleW,
              h: 110,
            });
          },
        });

        // 2. Seated Attendees around Conference Table
        const seatOffsets = [
          { x: -1.8, y: -1.0 },
          { x: 0, y: -1.6 },
          { x: 1.8, y: -1.0 },
          { x: 2.3, y: 0.3 },
          { x: 1.8, y: 1.5 },
          { x: 0, y: 1.9 },
          { x: -1.8, y: 1.5 },
          { x: -2.3, y: 0.3 },
        ];

        attendees.forEach((empId, idx) => {
          const seat = seatOffsets[idx % seatOffsets.length];
          const empItem = emp(empId);
          if (!empItem) return;
          const chairX = tcx + seat.x;
          const chairY = tcy + seat.y;
          const empTm = team(empItem.team);

          entities.push({
            depth: chairX + chairY + 0.1,
            draw: () => {
              const cp = iso(chairX, chairY);
              ctx.save();

              // Modern ergonomic chair base
              ctx.fillStyle = '#334155';
              ctx.beginPath();
              ctx.ellipse(cp.x, cp.y + 1, 10, 5, 0, 0, 6.28);
              ctx.fill();

              // Draw seated employee
              drawPerson(
                ctx,
                cp.x,
                cp.y,
                empItem.avatar || {},
                empTm?.color || accent,
                empItem.gender,
                ts / 750 + idx,
                isLeader(empItem),
                empItem.dept,
                empItem.role,
                'present',
                true // isSeated
              );

              // Attendee Name Tag
              if (db.settings.nameTags) {
                const sName = shortName(empItem);
                ctx.font = '600 8.5px "Plus Jakarta Sans", sans-serif';
                const nw = ctx.measureText(sName).width + 12;
                const nx = cp.x - nw / 2;
                const ny = cp.y - 50;

                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                rr(ctx, nx, ny, nw, 14, 7);
                ctx.fill();

                ctx.strokeStyle = accent;
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.textBaseline = 'middle';
                ctx.fillText(sName, nx + 6, ny + 7);
                ctx.textBaseline = 'alphabetic';
              }

              ctx.restore();
            },
          });
        });
      }

      // Depth sort all isometric entities back-to-front
      entities.sort((a, b) => a.depth - b.depth);
      for (const ent of entities) ent.draw();

      // 6. Top layer: labels only for virtual rooms. Department names open from a floor click.
      for (const z of db.zones) {
        if (!z.isVirtual) continue;
        const p = iso(z.x + z.w / 2, z.y);
        const text = `${z.icon} ${z.name}`;
        ctx.font = '700 11.5px "Plus Jakarta Sans", sans-serif';
        const w = ctx.measureText(text).width + 24;
        const x = p.x - w / 2;
        const y = p.y - 46;

        const zoneBlink = (() => {
          for (const t of db.teams.filter(tm => tm.dept === z.id)) {
            const b = blink(t.id, 'today');
            if (b === 'red') return 'red';
            if (b === 'yellow') return 'yellow';
          }
          return null;
        })();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        ctx.strokeStyle = zoneBlink
          ? (zoneBlink === 'red' ? '#ef4444' : '#f59e0b')
          : z.accent;
        ctx.lineWidth = zoneBlink ? 2.5 : 1.4;
        rr(ctx, x, y, w, 24, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + 12, y + 12);
        ctx.textBaseline = 'alphabetic';

        if (zoneBlink) {
          const a = 0.5 + 0.5 * Math.sin(ts / 200);
          ctx.globalAlpha = a;
          ctx.fillStyle = zoneBlink === 'red' ? '#ef4444' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(x + w - 4, y + 3, 5, 0, 6.28);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        hitsRef.current.push({ kind: 'zone', id: z.id, x, y, w, h: 24 });
      }

      // Etched department names win over desks so hovering the letters opens the zone
      for (const labelHit of zoneLabelHits) hitsRef.current.push(labelHit);

      // 7. Speech Bubbles
      const now = performance.now();
      for (const id of Object.keys(bubblesRef.current)) {
        const b = bubblesRef.current[id];
        if (b.until < now) {
          delete bubblesRef.current[id];
          continue;
        }
        const e = emp(id);
        if (!e || !e.desk) continue;
        const f = iso(e.desk.x - 0.05, e.desk.y - 0.05);

        ctx.font = '600 10.5px "Plus Jakarta Sans", sans-serif';
        const textWidth = Math.min(220, ctx.measureText(b.text).width + 20);
        const bx = f.x - textWidth / 2;
        const by = f.y - 82;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        rr(ctx, bx, by, textWidth, 22, 11);
        ctx.fill();
        ctx.stroke();

        // Pointer triangle
        ctx.beginPath();
        ctx.moveTo(f.x - 4, by + 22);
        ctx.lineTo(f.x + 4, by + 22);
        ctx.lineTo(f.x, by + 28);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.textBaseline = 'middle';
        ctx.save();
        ctx.beginPath();
        ctx.rect(bx, by, textWidth, 22);
        ctx.clip();
        ctx.fillText(b.text, bx + 10, by + 11);
        ctx.restore();
        ctx.textBaseline = 'alphabetic';
      }

      // 8. Transform reset for overlay effects & subtle dynamic ambient lighting
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Subtle dynamic ambient lighting environment shift based on local time
      if (ambientInfo.color) {
        ctx.save();
        ctx.fillStyle = ambientInfo.color;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // 9. Confetti rendering
      if (confettiRef.current.length) {
        confettiRef.current = confettiRef.current.filter(p => p.y < H + 25);
        for (const p of confettiRef.current) {
          p.x += p.vx + Math.sin(p.y / 35) * 0.6;
          p.y += p.vy;
          p.rot += p.vr;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      reqId = requestAnimationFrame(render);
    };

    reqId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(reqId);
  }, [
    db,
    activeEmps,
    emp,
    team,
    zone,
    isLeader,
    shortName,
    deptHead,
    todayStatus,
    blink,
    iso,
    box,
    drawPerson,
    rr,
    isNight,
    ambientInfo,
    highlightZoneId,
    highlightTeamId,
    focusedEmpId,
    hoverTarget,
  ]);

  // Pointer & Touch Events
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    const ptrs = new Map<number, { x: number; y: number }>();
    let drag: { x: number; y: number; cx: number; cy: number } | null = null;
    let pinch: { d: number; z: number } | null = null;
    let moved = false;

    const hitAt = (mx: number, my: number): HitTarget | null => {
      const p = screenToIso(mx, my, cv.clientWidth, cv.clientHeight, camRef.current);
      const world = unIso(p.x, p.y);
      for (let i = hitsRef.current.length - 1; i >= 0; i--) {
        const h = hitsRef.current[i];
        if (h.kind === 'virtualMeeting') {
          const isInsideScreen = mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h;
          const targetZ = db.zones.find(z => z.id === h.id);
          const isInsideZone =
            targetZ &&
            world.x >= targetZ.x &&
            world.x <= targetZ.x + targetZ.w &&
            world.y >= targetZ.y &&
            world.y <= targetZ.y + targetZ.h;
          if (isInsideScreen || isInsideZone) return h;
        } else if (h.space === 'world') {
          if (world.x >= h.x && world.x <= h.x + h.w && world.y >= h.y && world.y <= h.y + h.h) return h;
        } else if (h.space === 'label') {
          // Inverse of the floor text shear: (lx, ly) -> (lx - ly, 0.5*lx + 0.5*ly)
          const dx = p.x - h.x;
          const dy = p.y - h.y;
          const lx = dx / 2 + dy;
          const ly = dy - dx / 2;
          const pad = 8;
          if (lx >= -pad && lx <= h.w + pad && ly >= -h.h - pad && ly <= pad) return h;
        } else if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) {
          return h;
        }
      }
      return null;
    };

    const handlePointerDown = (ev: PointerEvent) => {
      cv.setPointerCapture(ev.pointerId);
      ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      moved = false;

      if (ptrs.size === 1) {
        drag = {
          x: ev.clientX,
          y: ev.clientY,
          cx: camRef.current.x,
          cy: camRef.current.y,
        };
      }
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: camRef.current.zoom };
        drag = null;
      }
    };

    const handlePointerMove = (ev: PointerEvent) => {
      const rect = cv.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;

      if (ptrs.has(ev.pointerId)) {
        ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      }

      if (pinch && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const newZoom = Math.max(0.35, Math.min(2.8, (pinch.z * d) / pinch.d));
        camRef.current.zoom = newZoom;
        setZoomDisplay(Math.round(newZoom * 100));
        moved = true;
        return;
      }

      if (drag) {
        const dx = ev.clientX - drag.x;
        const dy = ev.clientY - drag.y;
        if (Math.hypot(dx, dy) > 4) moved = true;
        if (moved) {
          camRef.current.x = drag.cx + dx;
          camRef.current.y = drag.cy + dy;
          animRef.current = null;
        }
        return;
      }

      // Hover update
      const h = hitAt(mx, my);
      setHoverTarget(h);
      if (h) {
        setHoverPos({ x: ev.clientX, y: ev.clientY });
        cv.style.cursor = 'pointer';
      } else {
        cv.style.cursor = 'grab';
      }
    };

    const handlePointerUp = (ev: PointerEvent) => {
      ptrs.delete(ev.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (ptrs.size === 0) {
        if (!moved && drag) {
          const rect = cv.getBoundingClientRect();
          const mx = ev.clientX - rect.left;
          const my = ev.clientY - rect.top;
          const h = hitAt(mx, my);
          if (h) {
            if (h.kind === 'virtualMeeting') {
              setActiveVirtualZoneId(h.id);
            } else if (h.kind === 'emp') {
              if (schedulerOpen) {
                setSelectedMeetingEmpIds(prev =>
                  prev.includes(h.id) ? prev.filter(x => x !== h.id) : [...prev, h.id]
                );
              } else {
                onSelectEmployee?.(h.id);
              }
            } else if (h.kind === 'zone') {
              const targetZ = db.zones.find(z => z.id === h.id);
              if (targetZ?.isVirtual) {
                setActiveVirtualZoneId(targetZ.id);
              } else {
                onSelectZone?.(h.id);
              }
            } else if (h.kind === 'agent') {
              onSelectAgent?.(h.id);
            }
          }
        }
        drag = null;
      }
    };

    const handleWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = cv.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const factor = ev.deltaY < 0 ? 1.12 : 0.88;
      const nextZoom = Math.max(0.35, Math.min(2.8, camRef.current.zoom * factor));

      const before = screenToIso(mx, my, cv.clientWidth, cv.clientHeight, camRef.current);
      camRef.current.zoom = nextZoom;
      const after = screenToIso(mx, my, cv.clientWidth, cv.clientHeight, camRef.current);
      camRef.current.x += (after.x - before.x) * nextZoom;
      camRef.current.y += (after.y - before.y) * nextZoom;
      animRef.current = null;
      setZoomDisplay(Math.round(nextZoom * 100));
    };

    const handlePointerLeave = () => {
      setHoverTarget(null);
    };

    cv.addEventListener('pointerdown', handlePointerDown);
    cv.addEventListener('pointermove', handlePointerMove);
    cv.addEventListener('pointerup', handlePointerUp);
    cv.addEventListener('pointercancel', handlePointerUp);
    cv.addEventListener('wheel', handleWheel, { passive: false });
    cv.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      cv.removeEventListener('pointerdown', handlePointerDown);
      cv.removeEventListener('pointermove', handlePointerMove);
      cv.removeEventListener('pointerup', handlePointerUp);
      cv.removeEventListener('pointercancel', handlePointerUp);
      cv.removeEventListener('wheel', handleWheel);
      cv.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [screenToIso, unIso, onSelectEmployee, onSelectZone, onSelectAgent, schedulerOpen, db.zones]);

  // Initial fit view
  useEffect(() => {
    fitAll(0);
  }, [fitAll]);

  // Hover Card Rendering details
  const renderHoverCard = () => {
    if (!hoverTarget) return null;
    const { kind, id } = hoverTarget;

    let content = null;
    if (kind === 'emp') {
      const e = emp(id);
      if (!e) return null;
      const stats = empStats(id, '90d');
      const eTeam = team(e.team);
      const isLead = isLeader(e);
      const warnings = stats.warnings || [];
      const isRed = warnings.length >= db.rules.redMinWarnings;
      const hasWarn = warnings.length > 0;

      content = (
        <div className="space-y-2">
          <div className="flex items-center gap-3 border-b border-slate-700/60 pb-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center font-bold text-sm text-indigo-400">
              {e.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-100 text-sm">
                <span>{e.name}</span>
                {isLead && <span className="text-amber-400 text-xs">👑 Lead</span>}
              </div>
              <div className="text-xs text-slate-400">
                {eTeam?.name} · {e.role}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-800/80 p-1.5 rounded border border-slate-700">
              <span className="block text-[10px] text-slate-400">KPI 90n</span>
              <b className="text-slate-100 text-sm">{stats.kpi || '–'}</b>
            </div>
            <div className="bg-slate-800/80 p-1.5 rounded border border-slate-700">
              <span className="block text-[10px] text-slate-400">Chuyên cần</span>
              <b className="text-slate-100 text-sm">{N.pctS(stats.attendanceRate)}</b>
            </div>
            <div className="bg-slate-800/80 p-1.5 rounded border border-slate-700">
              <span className="block text-[10px] text-slate-400">Việc xong</span>
              <b className="text-slate-100 text-sm">
                {stats.tasksDone}/{stats.tasksAssigned}
              </b>
            </div>
          </div>

          {hasWarn ? (
            <div
              className={`p-2 rounded text-xs border ${
                isRed
                  ? 'bg-red-950/60 border-red-800 text-red-200'
                  : 'bg-amber-950/60 border-amber-800 text-amber-200'
              }`}
            >
              <div className="font-bold flex items-center gap-1">
                <span>{isRed ? '🔴 XỬ LÝ NGAY' : '🟡 CẦN CHÚ Ý'}</span>
                <span>· {warnings.length} vấn đề</span>
              </div>
              <div className="mt-1 space-y-0.5 text-[11px]">
                {warnings.map((w, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{w.label}</span>
                    <b>
                      {w.value}
                      {w.unit}
                    </b>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-emerald-400 font-medium">✓ Không có cảnh báo 30 ngày</div>
          )}
          <div className="text-[10px] text-slate-400 pt-1 text-right">Bấm để mở hồ sơ chi tiết →</div>
        </div>
      );
    } else if (kind === 'virtualMeeting' || (kind === 'zone' && zone(id)?.isVirtual)) {
      const vz = zone(id) || db.zones.find(z => z.id === id);
      if (!vz) return null;
      const vMeet = (db.meetings || []).find(m => m.id === vz.meetingId || m.virtualZoneId === vz.id);
      content = (
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">{vz.icon || '🌐'}</span>
              <div>
                <b className="text-sm text-white font-bold">{vz.name}</b>
                <div className="text-[10px] text-indigo-400 font-mono">PHÒNG HỌP ẢO 3D</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
              {vMeet?.status === 'in-progress' ? '🟢 LIVE' : '🔵 ĐÃ LÊN LỊCH'}
            </span>
          </div>
          {vMeet && (
            <div className="text-xs text-slate-100 font-semibold bg-slate-800/60 p-2 rounded-xl border border-slate-700/60">
              "{vMeet.title}"
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
              <span className="block text-[10px] text-slate-400">Thời gian</span>
              <b className="text-indigo-300 text-xs font-mono">{vMeet?.time || '10:00 - 11:30'}</b>
            </div>
            <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
              <span className="block text-[10px] text-slate-400">Tham gia</span>
              <b className="text-emerald-400 text-xs">{vMeet?.attendees.length || 0} nhân sự</b>
            </div>
          </div>
          <div className="text-[10px] text-indigo-300 pt-1 text-right font-medium">Bấm để mở chi tiết & điều khiển phòng họp →</div>
        </div>
      );
    } else if (kind === 'zone') {
      const z = zone(id);
      if (!z) return null;
      const stats = deptStats(id, 'today');
      content = (
        <div className="space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-700/60 pb-1.5">
            <span className="text-lg">{z.icon}</span>
            <div>
              <b className="text-sm text-slate-100">{z.name}</b>
              <div className="text-[11px] text-slate-400">{z.sub}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-800/80 p-1.5 rounded border border-slate-700">
              <span className="block text-[10px] text-slate-400">Nhân sự</span>
              <b className="text-slate-100 text-sm">{stats.headcount}</b>
            </div>
            <div className="bg-slate-800/80 p-1.5 rounded border border-slate-700">
              <span className="block text-[10px] text-slate-400">Có mặt</span>
              <b className="text-emerald-400 text-sm">{stats.working}</b>
            </div>
            <div className="bg-slate-800/80 p-1.5 rounded border border-slate-700">
              <span className="block text-[10px] text-slate-400">KPI TB</span>
              <b className="text-amber-400 text-sm">{stats.kpi || '–'}</b>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 text-right">Bấm sàn để xem thông tin phòng ban →</div>
        </div>
      );
    } else if (kind === 'agent') {
      const a = db.agents.find(x => x.id === id);
      if (!a) return null;
      const z = zone(a.dept);
      content = (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-1">
            <b className="text-sm text-slate-100">🤖 {a.name}</b>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
              AI AGENT
            </span>
          </div>
          <p className="text-xs text-slate-300">{a.desc}</p>
          <div className="text-[11px] text-slate-400">{z?.name} · Đang hoạt động</div>
        </div>
      );
    }

    const cardX = Math.min(window.innerWidth - 290, Math.max(16, hoverPos.x + 18));
    const cardY = Math.min(window.innerHeight - 200, Math.max(16, hoverPos.y + 18));

    return (
      <div
        className="pointer-events-none fixed z-30 w-72 rounded-xl bg-slate-900/95 backdrop-blur-md p-3.5 shadow-2xl border border-slate-700 text-slate-200 transition-all duration-75"
        style={{ left: cardX, top: cardY }}
      >
        {content}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      <canvas ref={canvasRef} className="w-full h-full block touch-none" />

      {/* Floating UI controls */}
      {!isTouring && (
        <>
          {/* Zoom controls */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-xl z-20">
            <button
              onClick={() => zoomBy(1.2)}
              title="Phóng to"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => zoomBy(0.82)}
              title="Thu nhỏ"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => fitAll(600)}
              title="Toàn cảnh văn phòng"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="text-[10px] text-center text-slate-400 font-mono py-0.5 border-t border-slate-800">
              {zoomDisplay}%
            </div>
          </div>

          {/* Dynamic Time-of-Day & 3D Ambient Lighting Indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl z-20 transition">
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-200">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-100">{ambientInfo.timeStr}</span>
            </div>

            <button
              onClick={() => {
                const nextMode =
                  db.settings.dayNight === 'auto'
                    ? 'day'
                    : db.settings.dayNight === 'day'
                    ? 'night'
                    : 'auto';
                updateSettings({ dayNight: nextMode });
              }}
              title={`Ánh sáng môi trường 3D: ${ambientInfo.label} (${ambientInfo.sub}). Nhấn để đổi chế độ (Tự động theo giờ thực / Ban ngày / Ban đêm)`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-xs text-slate-200 hover:text-white border border-slate-700/60 transition group active:scale-95"
            >
              {ambientInfo.icon === 'dawn' && <Sunrise className="w-3.5 h-3.5 text-amber-400" />}
              {ambientInfo.icon === 'day' && <Sun className="w-3.5 h-3.5 text-sky-400" />}
              {ambientInfo.icon === 'golden' && <Sunset className="w-3.5 h-3.5 text-orange-400" />}
              {ambientInfo.icon === 'dusk' && <Sunset className="w-3.5 h-3.5 text-purple-400" />}
              {ambientInfo.icon === 'night' && <Moon className="w-3.5 h-3.5 text-indigo-400" />}
              <span className="font-medium text-[11px]">{ambientInfo.label}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-900/90 text-slate-400 border border-slate-700/50 uppercase font-mono">
                {db.settings.dayNight === 'auto' ? 'Auto' : db.settings.dayNight}
              </span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            <button
              onClick={() => setSchedulerOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg border transition transform active:scale-95 ${
                schedulerOpen
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-fuchsia-400/50 shadow-violet-500/30'
                  : 'bg-slate-900/85 backdrop-blur-md text-slate-200 hover:text-white hover:bg-slate-800 border-slate-700 shadow-xl'
              }`}
              title="Lên lịch họp 3D và tạo phòng họp ảo trên bản đồ"
            >
              <Calendar className="w-3.5 h-3.5 text-violet-400" />
              <span>Lên lịch họp 3D</span>
              {selectedMeetingEmpIds.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-violet-500 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                  {selectedMeetingEmpIds.length}
                </span>
              )}
            </button>
            <button
              onClick={onStartTour}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition transform active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Tham quan 3D</span>
            </button>
            <button
              onClick={onOpenSettings}
              title="Cài đặt văn phòng"
              className="p-2 rounded-xl bg-slate-900/85 backdrop-blur-md text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 shadow-xl transition"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Active Scheduler Helper Notice */}
          {schedulerOpen && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/90 backdrop-blur-md border border-indigo-500/40 text-xs text-indigo-200 shadow-xl z-20 animate-fadeIn">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>
                <b>Chế độ Lên lịch họp 3D:</b> Click nhân sự trên bản đồ để chọn hoặc kéo thả vào ô lên lịch
              </span>
              {selectedMeetingEmpIds.length > 0 && (
                <button
                  onClick={() => setSelectedMeetingEmpIds([])}
                  className="ml-1 text-[10px] underline hover:text-white"
                >
                  Bỏ chọn ({selectedMeetingEmpIds.length})
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Hover Info Card */}
      {!isTouring && renderHoverCard()}

      {/* Meeting Scheduler Drawer */}
      <MeetingSchedulerDrawer
        isOpen={schedulerOpen}
        onClose={() => setSchedulerOpen(false)}
        selectedEmpIds={selectedMeetingEmpIds}
        onToggleSelectEmp={empId => {
          setSelectedMeetingEmpIds(prev =>
            prev.includes(empId) ? prev.filter(x => x !== empId) : [...prev, empId]
          );
        }}
        onClearSelectedEmps={() => setSelectedMeetingEmpIds([])}
        onFocusZone={zoneId => {
          const targetZone = db.zones.find(x => x.id === zoneId);
          if (targetZone) {
            focusWorld(targetZone.x + targetZone.w / 2, targetZone.y + targetZone.h / 2, Math.max(camRef.current.zoom, 1.4), 800);
          }
        }}
        onSelectMeetingZone={zoneId => setActiveVirtualZoneId(zoneId)}
      />

      {/* Virtual Meeting Details Modal */}
      {activeVirtualZoneId && (
        <VirtualMeetingModal
          zoneId={activeVirtualZoneId}
          onClose={() => setActiveVirtualZoneId(null)}
          onFocusDesk={id => {
            const e = emp(id);
            if (e && e.desk) {
              focusWorld(e.desk.x, e.desk.y, Math.max(camRef.current.zoom, 1.6), 800);
            }
          }}
          onSelectEmployee={id => onSelectEmployee?.(id)}
        />
      )}
    </div>
  );
};
