import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../context/StoreContext';
import { Zone, RankedTeam, Employee } from '../../types';
import { D } from '../../utils/date';
import { N } from '../../utils/format';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
  BarChart3,
  Trophy,
  Coffee,
  AlertTriangle,
  Award,
} from 'lucide-react';

interface TourOverlayProps {
  onClose: () => void;
  onOpenReports: () => void;
  onHighlightZone: (zoneId: string | null) => void;
  onHighlightTeam: (teamId: string | null) => void;
  onFocusZone: (zoneId: string | null) => void;
  onFocusEmployee: (empId: string | null) => void;
}

interface Slide {
  type: 'intro' | 'zone' | 'reception' | 'rules' | 'overview' | 'honor' | 'champion' | 'worst' | 'reminder' | 'profile';
  title: string;
  ms?: number;
  zone?: Zone;
  period?: string;
  teamId?: string;
  empId?: string;
  rank?: number;
  idx?: number;
}

export const TourOverlay: React.FC<TourOverlayProps> = ({
  onClose,
  onOpenReports,
  onHighlightZone,
  onHighlightTeam,
  onFocusZone,
  onFocusEmployee,
}) => {
  const {
    db,
    emp,
    team,
    zone,
    deptStats,
    overviewStats,
    ranking,
    champion,
    worst,
    redTeams,
    reminderTeams,
    teamWarnings,
    profiles,
    empsOfTeam,
    shortName,
  } = useStore();

  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [receptionStep, setReceptionStep] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound chime helper
  const playDing = useCallback(() => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ac = audioCtxRef.current;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ac.destination);
        const startTime = ac.currentTime + idx * 0.12;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.08, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);
        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch (_) {
      // Audio not permitted or supported
    }
  }, [isMuted]);

  // Build slides array
  useEffect(() => {
    const list: Slide[] = [];
    // 1. Intro
    list.push({ type: 'intro', title: 'Khởi động tham quan', ms: 5000 });

    // 2. All zones
    db.zones.forEach((z, idx) => {
      list.push({
        type: 'zone',
        title: `Tham quan khu vực · ${z.name}`,
        zone: z,
        idx: idx + 1,
      });
    });

    // 3. Reception & Visitors
    const recZone = db.zones.find(z => z.id === 'le-tan');
    list.push({
      type: 'reception',
      title: 'Đón tiếp khách mời & Sảnh Café',
      zone: recZone,
      ms: 12000,
    });

    // 4. Office Rules
    list.push({ type: 'rules', title: 'Quy tắc nhấp nháy cảnh báo' });

    // 5. Periods (Today, Yesterday, Week, Month)
    for (const p of ['today', 'yesterday', 'week', 'month']) {
      const r = D.range(p);
      list.push({ type: 'overview', title: `Tổng quan · ${r.label}`, period: p });

      const rk = ranking(p);
      if (rk.length >= 2) {
        list.push({ type: 'honor', title: `Bục vinh danh · ${r.label}`, period: p });
        const ch = champion(p);
        if (ch) {
          list.push({
            type: 'champion',
            title: `Quán quân kỳ · ${r.label}`,
            period: p,
            teamId: ch.team.id,
            zone: zone(ch.team.dept),
          });
        }
        const w = worst(p);
        if (w) {
          list.push({
            type: 'worst',
            title: `Cần cải thiện · ${r.label}`,
            period: p,
            teamId: w.byKpi.team.id,
            zone: zone(w.byKpi.team.dept),
          });
        }
      }
    }

    // 6. Warnings
    for (const t of redTeams()) {
      list.push({
        type: 'reminder',
        title: `🔴 Xử lý ngay · ${t.name}`,
        teamId: t.id,
        zone: zone(t.dept),
      });
    }
    for (const t of reminderTeams()) {
      list.push({
        type: 'reminder',
        title: `⚠ Nhắc nhở · ${t.name}`,
        teamId: t.id,
        zone: zone(t.dept),
      });
    }

    // 7. Top employee profiles
    profiles(3).forEach((p, k) => {
      list.push({
        type: 'profile',
        title: `Hồ sơ nhân sự · ${p.emp.name}`,
        empId: p.emp.id,
        rank: k + 1,
        zone: zone(p.emp.dept),
      });
    });

    setSlides(list);
    setCurrentIdx(0);
  }, [db.zones, ranking, champion, worst, redTeams, reminderTeams, profiles, zone]);

  // Navigate to slide
  const showSlide = useCallback(
    (index: number) => {
      if (!slides.length) return;
      const nextIdx = (index + slides.length) % slides.length;
      setCurrentIdx(nextIdx);
      const s = slides[nextIdx];

      // Clean up previous highlights
      onHighlightZone(null);
      onHighlightTeam(null);
      onFocusEmployee(null);

      // Setup camera & highlights for slide
      if (s.type === 'zone' && s.zone) {
        onHighlightZone(s.zone.id);
        onFocusZone(s.zone.id);
      } else if (s.type === 'reception' && s.zone) {
        onHighlightZone(s.zone.id);
        onFocusZone(s.zone.id);
        setReceptionStep(0);
      } else if (s.type === 'honor') {
        onFocusZone(null);
        playDing();
        (window as unknown as { burstConfetti?: () => void }).burstConfetti?.();
      } else if (s.type === 'champion') {
        if (s.teamId) onHighlightTeam(s.teamId);
        if (s.zone) onFocusZone(s.zone.id);
        (window as unknown as { burstConfetti?: () => void }).burstConfetti?.();
      } else if (s.type === 'worst') {
        if (s.teamId) onHighlightTeam(s.teamId);
        if (s.zone) onFocusZone(s.zone.id);
      } else if (s.type === 'reminder') {
        if (s.teamId) onHighlightTeam(s.teamId);
        if (s.zone) onFocusZone(s.zone.id);
      } else if (s.type === 'profile' && s.empId) {
        onFocusEmployee(s.empId);
      } else {
        onFocusZone(null);
      }
    },
    [slides, onHighlightZone, onHighlightTeam, onFocusZone, onFocusEmployee, playDing]
  );

  // Reception chat advance animation
  useEffect(() => {
    const s = slides[currentIdx];
    if (s && s.type === 'reception') {
      const stepTimer = setInterval(() => {
        setReceptionStep(prev => (prev < 4 ? prev + 1 : prev));
      }, 2000);
      return () => clearInterval(stepTimer);
    }
  }, [slides, currentIdx]);

  // Automatic slide progress timer
  useEffect(() => {
    if (isPaused || !slides.length) return;
    const currentSlide = slides[currentIdx];
    const duration = currentSlide?.ms || db.settings.slideSeconds * 1000;

    const timer = setTimeout(() => {
      showSlide(currentIdx + 1);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIdx, isPaused, slides, db.settings.slideSeconds, showSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        showSlide(currentIdx + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showSlide(currentIdx - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, showSlide, onClose]);

  if (!slides.length) return null;
  const currentSlide = slides[currentIdx];
  const progressPct = ((currentIdx + 1) / slides.length) * 100;

  // Render Slide Card
  const renderCardContent = () => {
    switch (currentSlide.type) {
      case 'intro':
        return (
          <div className="text-center py-6 space-y-3">
            <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 font-mono text-xs font-bold border border-indigo-500/30">
              TRÌNH CHIẾU VĂN PHÒNG 3D
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {db.company.name.toUpperCase()}
            </h1>
            <p className="text-indigo-300 font-medium text-sm">{db.company.slogan}</p>
            <div className="text-xs text-slate-400">
              {D.weekday(D.today())}, {D.fmtFull(D.today())} · {D.nowHM()}
            </div>
          </div>
        );

      case 'zone': {
        const z = currentSlide.zone!;
        const s = deptStats(z.id, 'today');
        const teams = db.teams.filter(t => t.dept === z.id);
        const agentsCount = db.agents.filter(a => a.dept === z.id).length;

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                  {z.icon}
                </span>
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-indigo-400 uppercase">
                    KHU VỰC {currentSlide.idx}/{db.zones.length}
                  </div>
                  <h2 className="text-xl font-bold text-white">{z.name}</h2>
                  <p className="text-xs text-slate-400">{z.sub}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 font-semibold text-slate-300 border border-slate-700">
                  {teams.length} Tổ chuyên môn
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                <span className="block text-[11px] text-slate-400">Nhân sự</span>
                <b className="text-lg text-white">{s.headcount}</b>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                <span className="block text-[11px] text-slate-400">Có mặt hôm nay</span>
                <b className="text-lg text-emerald-400">{s.working}</b>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                <span className="block text-[11px] text-slate-400">Việc hoàn thành</span>
                <b className="text-lg text-sky-400">
                  {s.tasksDone}/{s.tasksAssigned}
                </b>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                <span className="block text-[11px] text-slate-400">Trợ lý AI</span>
                <b className="text-lg text-purple-400">{agentsCount} đang chạy</b>
              </div>
            </div>
          </div>
        );
      }

      case 'reception': {
        const vs = db.visitors.filter(v => v.date === D.today());
        const rec = empsOfTeam('le-tan')[0];
        const dialogue = [
          { speaker: 'Lễ tân', text: `Dạ em chào quý anh chị đối tác, chào mừng đến ${db.company.name} ạ! 🌸` },
          { speaker: vs[0]?.name || 'Khách mời', text: 'Chào em! Cho đoàn anh cà phê sữa đá và trà đào nhé.' },
          { speaker: 'Lễ tân', text: `Dạ có ngay ạ! Mời anh chị ngồi sofa nghỉ ngơi, ${db.company.short} CAFÉ phục vụ trong 3 phút ☕` },
          { speaker: 'Lễ tân', text: `Hôm nay toàn công ty đã hoàn thành tốt KPI, chúc anh chị có buổi làm việc hiệu quả!` },
        ];

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-700/60 pb-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Coffee className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-amber-400 uppercase">
                  ĐÓN TIẾP KHÁCH MỜI & GIAO LƯU
                </div>
                <h2 className="text-xl font-bold text-white">Sảnh Lễ Tân & {db.company.short} Café</h2>
                <div className="text-xs text-slate-400">
                  Hôm nay có {vs.length} khách mời đang dừng chân tại khu lounge
                </div>
              </div>
            </div>

            {/* Visitors list */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {vs.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200"
                >
                  <span className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-[10px]">
                    {v.name.slice(0, 1)}
                  </span>
                  <span>{v.name}</span>
                  {v.org && <small className="text-slate-400">({v.org})</small>}
                </div>
              ))}
            </div>

            {/* Animated conversation */}
            <div className="space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              {dialogue.slice(0, receptionStep + 1).map((d, i) => (
                <div
                  key={i}
                  className={`flex flex-col text-xs transition-opacity duration-300 ${
                    d.speaker === 'Lễ tân' ? 'items-start text-indigo-300' : 'items-end text-amber-300'
                  }`}
                >
                  <span className="text-[10px] font-semibold opacity-75">{d.speaker}</span>
                  <div
                    className={`px-3 py-1.5 rounded-xl max-w-[80%] ${
                      d.speaker === 'Lễ tân'
                        ? 'bg-indigo-950/70 border border-indigo-800/80 text-slate-100'
                        : 'bg-amber-950/70 border border-amber-800/80 text-slate-100'
                    }`}
                  >
                    {d.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'rules':
        return (
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-indigo-400 uppercase">
              TIÊU CHUẨN VẬN HÀNH VĂN PHÒNG
            </div>
            <h2 className="text-xl font-bold text-white">Quy tắc cảnh báo nhấp nháy 3D</h2>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 space-y-1">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                  <span>NHÁY ĐỎ · XỬ LÝ NGAY</span>
                </div>
                <p className="text-xs text-slate-300">
                  Tổ có từ <b>{db.rules.redMinWarnings} cảnh báo</b> đồng thời: Đi muộn &gt;{' '}
                  {db.rules.lateRate}%, Chuyên cần &lt; {db.rules.attendanceRate}%, Việc xong &lt;{' '}
                  {db.rules.taskRate}%, KPI &lt; {db.rules.kpiMin}.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 space-y-1">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>NHÁY VÀNG · KÉM NHẤT KỲ</span>
                </div>
                <p className="text-xs text-slate-300">
                  Tổ có chỉ số thấp nhất trong kỳ so với toàn bộ các tổ khác. Cần ưu tiên phân bổ thêm
                  nguồn lực hoặc hỗ trợ kịp thời.
                </p>
              </div>
            </div>
          </div>
        );

      case 'overview': {
        const r = D.range(currentSlide.period!);
        const ov = overviewStats(r);
        return (
          <div className="space-y-4">
            <div className="border-b border-slate-700/60 pb-2">
              <div className="text-[11px] font-bold text-indigo-400 uppercase">TỔNG QUAN VĂN PHÒNG</div>
              <h2 className="text-xl font-bold text-white">{r.label.toUpperCase()}</h2>
              <div className="text-xs text-slate-400">{r.sub}</div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="block text-[11px] text-slate-400">Đi làm</span>
                <b className="text-xl text-emerald-400">
                  {ov.working}/{ov.headcount}
                </b>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="block text-[11px] text-slate-400">Việc hoàn thành</span>
                <b className="text-xl text-sky-400">
                  {ov.tasksDone}/{ov.tasksAssigned} ({N.pctS(ov.taskRate)})
                </b>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="block text-[11px] text-slate-400">KPI Trung bình</span>
                <b className="text-xl text-amber-400">{ov.kpi || '–'}</b>
              </div>
            </div>
          </div>
        );
      }

      case 'honor': {
        const r = D.range(currentSlide.period!);
        const rk = ranking(currentSlide.period!);
        const [first, second, third] = [rk[0], rk[1], rk[2]];

        return (
          <div className="space-y-4">
            <div className="text-center border-b border-slate-700/60 pb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs border border-amber-500/40">
                <Trophy className="w-3.5 h-3.5" />
                <span>BỤC VINH DANH XẾP HẠNG</span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-1">Xếp Hạng Tổ · {r.label}</h2>
            </div>

            {/* Podium Display */}
            <div className="grid grid-cols-3 items-end gap-3 pt-2 text-center">
              {/* 2nd Place */}
              {second && (
                <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-600 flex flex-col items-center space-y-1">
                  <span className="w-7 h-7 rounded-full bg-slate-400 text-slate-900 font-extrabold text-xs flex items-center justify-center">
                    2
                  </span>
                  <b className="text-xs text-white truncate max-w-full">{second.team.name}</b>
                  <div className="text-amber-400 font-bold text-sm">{second.stats.kpi} đ</div>
                  <div className="text-[10px] text-slate-400">{second.stats.tasksDone} việc</div>
                </div>
              )}

              {/* 1st Place */}
              {first && (
                <div className="bg-gradient-to-b from-amber-950/80 to-slate-900 p-4 rounded-2xl border-2 border-amber-400 flex flex-col items-center space-y-1.5 shadow-xl shadow-amber-500/20 transform -translate-y-2">
                  <span className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shadow">
                    👑 1
                  </span>
                  <b className="text-sm text-white font-extrabold truncate max-w-full">
                    {first.team.name}
                  </b>
                  <div className="text-amber-300 font-black text-lg">{first.stats.kpi} Điểm</div>
                  <div className="text-xs text-emerald-400 font-medium">
                    {first.stats.tasksDone} việc hoàn tất
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {third && (
                <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-600 flex flex-col items-center space-y-1">
                  <span className="w-7 h-7 rounded-full bg-amber-700 text-amber-100 font-extrabold text-xs flex items-center justify-center">
                    3
                  </span>
                  <b className="text-xs text-white truncate max-w-full">{third.team.name}</b>
                  <div className="text-amber-400 font-bold text-sm">{third.stats.kpi} đ</div>
                  <div className="text-[10px] text-slate-400">{third.stats.tasksDone} việc</div>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'champion': {
        const ch = champion(currentSlide.period!);
        if (!ch) return null;
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-700/60 pb-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Award className="w-7 h-7" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-amber-400 uppercase">
                  QUÁN QUÂN XUẤT SẮC NHẤT KỲ
                </div>
                <h2 className="text-xl font-black text-white">{ch.team.name}</h2>
                <div className="text-xs text-slate-300">
                  Gương mặt tiêu biểu: {ch.people.map(p => shortName(p.emp)).join(' & ')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="block text-[11px] text-slate-400">KPI Tổ</span>
                <b className="text-xl text-amber-400">{ch.stats.kpi}</b>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="block text-[11px] text-slate-400">Việc xong</span>
                <b className="text-xl text-emerald-400">{ch.stats.tasksDone}</b>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="block text-[11px] text-slate-400">Chuyên cần</span>
                <b className="text-xl text-sky-400">{N.pctS(ch.stats.attendanceRate)}</b>
              </div>
            </div>
          </div>
        );
      }

      case 'worst': {
        const w = worst(currentSlide.period!);
        if (!w) return null;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-3 border-b border-slate-700/60 pb-2">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-amber-400 uppercase">
                  TỔ CẦN TẬP TRUNG HỖ TRỢ
                </div>
                <h2 className="text-xl font-bold text-white">
                  {w.teams.map(t => t.name).join(' & ')}
                </h2>
                <p className="text-xs text-slate-400">
                  Chỉ số đang ở mức cần cải thiện so với mặt bằng chung
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-slate-300">
                <span>{w.byPerHead.team.name} (Ít việc/người nhất):</span>
                <b className="text-amber-400">
                  {w.byPerHead.stats.perHead} (TB: {w.avgPerHead})
                </b>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>{w.byKpi.team.name} (KPI thấp nhất kỳ):</span>
                <b className="text-amber-400">
                  {w.byKpi.stats.kpi} (TB: {w.avgKpi})
                </b>
              </div>
            </div>
          </div>
        );
      }

      case 'reminder': {
        const t = team(currentSlide.teamId!);
        if (!t) return null;
        const w = teamWarnings(t.id);
        const isRed = w.length >= db.rules.redMinWarnings;

        return (
          <div className="space-y-3">
            <div className="flex items-center gap-3 border-b border-slate-700/60 pb-2">
              <div
                className={`p-2.5 rounded-xl border ${
                  isRed
                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div
                  className={`text-[11px] font-bold uppercase ${
                    isRed ? 'text-red-400' : 'text-amber-400'
                  }`}
                >
                  {isRed ? '🔴 XỬ LÝ NGAY' : '⚠ NHẮC NHỞ'}
                </div>
                <h2 className="text-xl font-bold text-white">{t.name}</h2>
                <div className="text-xs text-slate-400">
                  {w.length} tiêu chí chưa đạt ngưỡng trong {db.rules.windowDays} ngày
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {w.map((item, idx) => (
                <div key={idx} className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[11px]">{item.label}</div>
                  <div className="text-red-400 font-bold text-sm">
                    {item.value}
                    {item.unit}
                  </div>
                  <div className="text-[10px] text-slate-500">{item.threshold}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'profile': {
        const e = emp(currentSlide.empId!);
        if (!e) return null;
        const s = deptStats(e.dept, '90d');
        const eTeam = team(e.team);

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-700/60 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-extrabold text-indigo-300 text-lg">
                {e.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[11px] font-bold text-indigo-400 uppercase">
                  GƯƠNG MẶT TIÊU BIỂU · TOP {currentSlide.rank}
                </div>
                <h2 className="text-xl font-bold text-white">{e.name}</h2>
                <div className="text-xs text-slate-300">
                  {eTeam?.name} · {e.role}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                <span className="block text-[11px] text-slate-400">KPI 90 ngày</span>
                <b className="text-lg text-amber-400">{s.kpi || '–'}</b>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                <span className="block text-[11px] text-slate-400">Chuyên cần</span>
                <b className="text-lg text-emerald-400">{N.pctS(s.attendanceRate)}</b>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                <span className="block text-[11px] text-slate-400">Việc xong</span>
                <b className="text-lg text-sky-400">
                  {s.tasksDone}/{s.tasksAssigned}
                </b>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-between">
      {/* Top Floating Control Bar */}
      <div className="pointer-events-auto p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700 shadow-2xl">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-extrabold text-white text-xs shadow">
            3D
          </div>
          <div>
            <div className="font-extrabold text-sm text-white flex items-center gap-2">
              <span>{currentSlide.title}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({currentIdx + 1}/{slides.length})
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {db.company.name} · Nhấn phím mũi tên [← / →] để chuyển slide
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700 shadow-2xl">
          <button
            onClick={() => showSlide(currentIdx - 1)}
            title="Slide trước"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={() => showSlide(currentIdx + 1)}
            title="Slide tiếp"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenReports();
            }}
            title="Mở toàn bộ Báo cáo"
            className="p-2 rounded-xl text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 transition"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-slate-700 my-auto mx-0.5" />

          <button
            onClick={onClose}
            title="Đóng chế độ tham quan (Esc)"
            className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-800/80 z-50">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Bottom Main Presentation Card */}
      <div className="pointer-events-auto max-w-2xl w-full mx-auto p-4 mb-2">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl p-5 shadow-2xl text-slate-100 transition-all duration-300">
          {renderCardContent()}
        </div>
      </div>
    </div>
  );
};
