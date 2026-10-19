import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { D } from '../../utils/date';
import { N, esc } from '../../utils/format';
import { printHtml } from '../../utils/printHtml';
import {
  Trophy,
  Play,
  TrendingUp,
  AlertTriangle,
  Award,
  FileDown,
} from 'lucide-react';

interface ReportsViewProps {
  onStartTour: () => void;
  onSelectEmployee: (empId: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  onStartTour,
  onSelectEmployee,
}) => {
  const {
    db,
    overviewStats,
    ranking,
    champion,
    worst,
    profiles,
    redTeams,
    reminderTeams,
    teamWarnings,
    zone,
    shortName,
    activeEmps,
  } = useStore();

  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');

  const range = D.range(period);
  const ov = overviewStats(range);
  const rk = ranking(period);
  const ch = champion(period);
  const w = worst(period);

  // 14-day attendance trend data
  const trend = [];
  for (let i = 13; i >= 0; i--) {
    const d = D.addDays(D.today(), -i);
    const dayRows = db.attendance.filter(a => a.date === d);
    const present = dayRows.filter(a => a.status === 'present' || a.status === 'remote').length;
    const late = dayRows.filter(a => a.status === 'late').length;
    const working = present + late;
    trend.push({ date: d, working, late });
  }
  const maxWorking = Math.max(1, ...trend.map(t => t.working), activeEmps().length);

  return (
    <div className="v3m-workspace h-[calc(100vh-56px)] overflow-y-auto p-6 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="v3m-kicker">Hiệu suất</div>
            <h1 className="text-2xl font-semibold text-white mt-1">Báo cáo & vinh danh</h1>
            <p className="text-xs text-slate-400 mt-1">
              {range.label} ({range.sub}) · Chấm công, xếp hạng tổ và KPI
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-black/30 border border-white/10 p-1 rounded-xl">
              {(['today', 'yesterday', 'week', 'month'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    period === p ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {D.range(p).label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                const rows = rk
                  .map(
                    (x, i) =>
                      `<tr><td>${i + 1}</td><td>${esc(x.team.name)}</td><td>${esc(zone(x.team.dept)?.name || '')}</td><td>${x.stats.headcount}</td><td>${x.stats.working}</td><td>${x.stats.late}</td><td>${x.stats.tasksDone}/${x.stats.tasksAssigned}</td><td>${x.stats.kpi}</td></tr>`,
                  )
                  .join('');
                const people = profiles(6)
                  .map(
                    (item, i) =>
                      `<tr><td>${i + 1}</td><td>${esc(item.emp.name)}</td><td>${esc(item.emp.role)}</td><td>${item.stats.kpi}</td><td>${esc(N.pctS(item.stats.attendanceRate))}</td><td>${esc(N.pctS(item.stats.taskRate))}</td></tr>`,
                  )
                  .join('');
                printHtml(
                  `Bao cao ${range.label}`,
                  `
                    <p class="muted">${esc(db.company.name)}</p>
                    <h1>Báo cáo hiệu suất · ${esc(range.label)}</h1>
                    <p>${esc(range.sub)}</p>
                    <div class="kpi">
                      <div><span class="muted">Có mặt</span><b>${ov.working}/${ov.headcount}</b></div>
                      <div><span class="muted">Việc xong</span><b>${ov.tasksDone}/${ov.tasksAssigned}</b></div>
                      <div><span class="muted">KPI trung bình</span><b>${ov.kpi || '–'}</b></div>
                      <div><span class="muted">Đi muộn</span><b>${ov.late}</b></div>
                      <div><span class="muted">Tăng ca</span><b>${ov.overtime}h</b></div>
                    </div>
                    ${ch ? `<h2>Quán quân: ${esc(ch.team.name)}</h2><p>KPI ${ch.stats.kpi} · Việc ${ch.stats.tasksDone} · Chuyên cần ${esc(N.pctS(ch.stats.attendanceRate))}</p><p>Gương mặt: ${esc(ch.people.map(p => shortName(p.emp)).join(', '))}</p>` : ''}
                    <h2>Xếp hạng tổ</h2>
                    <table><thead><tr><th>#</th><th>Tổ</th><th>Phòng</th><th>Người</th><th>Có mặt</th><th>Muộn</th><th>Việc</th><th>KPI</th></tr></thead><tbody>${rows}</tbody></table>
                    <h2>Nhân sự nổi bật 90 ngày</h2>
                    <table><thead><tr><th>#</th><th>Họ tên</th><th>Vai trò</th><th>KPI</th><th>Chuyên cần</th><th>Việc</th></tr></thead><tbody>${people}</tbody></table>
                  `,
                );
              }}
              title="Mở hộp thoại in, chọn Lưu thành PDF"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/15 text-white text-xs font-semibold hover:bg-white/8 transition"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Xuất PDF</span>
            </button>

            <button
              onClick={onStartTour}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-950 text-xs font-semibold hover:bg-slate-100 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Trình chiếu</span>
            </button>
          </div>
        </div>

        {/* Top Cards: Overview & Champion */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Overview Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                TỔNG QUAN · {range.label.toUpperCase()}
              </span>
              <span className="text-xs text-slate-400">{D.nowHM()}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Có mặt</span>
                <b className="text-2xl text-emerald-400 block mt-0.5">{ov.working}</b>
                <small className="text-[10px] text-slate-500">/{ov.headcount} người</small>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Việc xong</span>
                <b className="text-2xl text-sky-400 block mt-0.5">{ov.tasksDone}</b>
                <small className="text-[10px] text-slate-500">
                  /{ov.tasksAssigned} ({N.pctS(ov.taskRate)})
                </small>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">KPI TB</span>
                <b className="text-2xl text-amber-400 block mt-0.5">{ov.kpi || '–'}</b>
                <small className="text-[10px] text-slate-500">điểm chuẩn</small>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Đi muộn</span>
                <b className="text-lg text-amber-400">{ov.late} lượt</b>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Nghỉ phép / vắng</span>
                <b className="text-lg text-rose-400">{ov.absent + ov.leave}</b>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Tăng ca (OT)</span>
                <b className="text-lg text-purple-400">{ov.overtime}h</b>
              </div>
            </div>
          </div>

          {/* Champion Card */}
          {ch ? (
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-xl shadow-amber-500/10">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" />
                  <span>QUÁN QUÂN · {range.label.toUpperCase()}</span>
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px]">
                  TOP 1 KPI
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{ch.team.name}</h3>
                  <div className="text-xs text-amber-200">
                    Cán bộ nổi bật: {ch.people.map(p => shortName(p.emp)).join(' & ')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950/80 p-3 rounded-2xl border border-amber-900/40">
                  <span className="text-[11px] text-slate-400 block">Điểm KPI</span>
                  <b className="text-2xl text-amber-400">{ch.stats.kpi}</b>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-2xl border border-amber-900/40">
                  <span className="text-[11px] text-slate-400 block">Việc hoàn thành</span>
                  <b className="text-2xl text-emerald-400">{ch.stats.tasksDone}</b>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-2xl border border-amber-900/40">
                  <span className="text-[11px] text-slate-400 block">Chuyên cần</span>
                  <b className="text-2xl text-sky-400">{N.pctS(ch.stats.attendanceRate)}</b>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex items-center justify-center text-slate-500 text-xs">
              Chưa đủ số liệu xếp hạng
            </div>
          )}
        </div>

        {/* Podium and Lowest Performing analysis */}
        {rk.length >= 2 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Podium */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
                🏆 BỤC VINH DANH TOP 3 TỔ XUẤT SẮC
              </span>

              <div className="grid grid-cols-3 items-end gap-3 pt-3 text-center">
                {/* 2nd */}
                {rk[1] && (
                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-700 flex flex-col items-center space-y-1">
                    <span className="w-6 h-6 rounded-full bg-slate-400 text-slate-900 font-extrabold text-xs flex items-center justify-center">
                      2
                    </span>
                    <b className="text-xs text-white truncate max-w-full">{rk[1].team.name}</b>
                    <span className="text-amber-400 font-bold text-sm">{rk[1].stats.kpi} đ</span>
                    <span className="text-[10px] text-slate-400">{rk[1].stats.tasksDone} việc</span>
                  </div>
                )}

                {/* 1st */}
                {rk[0] && (
                  <div className="bg-gradient-to-b from-amber-950/70 to-slate-950 p-4 rounded-2xl border-2 border-amber-400 flex flex-col items-center space-y-1.5 transform -translate-y-2 shadow-lg shadow-amber-500/10">
                    <span className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center">
                      👑 1
                    </span>
                    <b className="text-sm text-white font-extrabold truncate max-w-full">
                      {rk[0].team.name}
                    </b>
                    <span className="text-amber-300 font-black text-base">
                      {rk[0].stats.kpi} Điểm
                    </span>
                    <span className="text-xs text-emerald-400">{rk[0].stats.tasksDone} việc</span>
                  </div>
                )}

                {/* 3rd */}
                {rk[2] && (
                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-700 flex flex-col items-center space-y-1">
                    <span className="w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-extrabold text-xs flex items-center justify-center">
                      3
                    </span>
                    <b className="text-xs text-white truncate max-w-full">{rk[2].team.name}</b>
                    <span className="text-amber-400 font-bold text-sm">{rk[2].stats.kpi} đ</span>
                    <span className="text-[10px] text-slate-400">{rk[2].stats.tasksDone} việc</span>
                  </div>
                )}
              </div>
            </div>

            {/* Worst Performer Card */}
            {w && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
                  🟡 TỔ CẦN ĐẨY MẠNH HIỆU QUẢ CÔNG VIỆC
                </span>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {w.teams.map(t => t.name).join(' & ')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      So sánh giữa {rk.length} tổ chuyên môn trong kỳ {range.label.toLowerCase()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>{w.byPerHead.team.name} (Ít việc/người nhất):</span>
                    <b className="text-amber-400">
                      {w.byPerHead.stats.perHead} việc/người (Mức TB: {w.avgPerHead})
                    </b>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>{w.byKpi.team.name} (KPI thấp nhất):</span>
                    <b className="text-amber-400">
                      {w.byKpi.stats.kpi} điểm (Mức TB: {w.avgKpi})
                    </b>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  💡 Gợi ý: Hỗ trợ tháo gỡ vướng mắc quy trình, phân công lại khối lượng công việc
                  hoặc bổ sung nhân lực cho tổ.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 14-day Attendance Bar Chart */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Biểu đồ chuyên cần 14 ngày gần nhất</span>
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span>Có mặt đúng giờ</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span>Đi muộn</span>
              </span>
            </div>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
            {trend.map((t, idx) => {
              const heightPct = Math.round((t.working / maxWorking) * 100);
              const latePct = t.working ? Math.round((t.late / t.working) * 100) : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    title={`${D.fmtFull(t.date)}: ${t.working} có mặt, ${t.late} muộn`}
                    className="w-full max-w-[36px] rounded-t-lg bg-emerald-500 hover:brightness-110 transition relative overflow-hidden flex flex-col justify-end"
                    style={{ height: `${Math.max(8, heightPct)}%` }}
                  >
                    {t.late > 0 && (
                      <div className="w-full bg-amber-500" style={{ height: `${latePct}%` }} />
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{D.fmt(t.date)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ranking Table of all teams */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">
            Bảng xếp hạng chi tiết các tổ · {range.label}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Tổ</th>
                  <th className="py-2.5 px-3">Phòng ban</th>
                  <th className="py-2.5 px-3 text-center">Nhân sự</th>
                  <th className="py-2.5 px-3 text-center">Có mặt</th>
                  <th className="py-2.5 px-3 text-center">Đi muộn</th>
                  <th className="py-2.5 px-3 text-center">Việc xong</th>
                  <th className="py-2.5 px-3 text-center">Việc / người</th>
                  <th className="py-2.5 px-3 text-center font-bold text-white">KPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rk.map((x, i) => (
                  <tr key={x.team.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-slate-400">{i + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: x.team.color }}
                      />
                      <span>{x.team.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{zone(x.team.dept)?.name}</td>
                    <td className="py-2.5 px-3 text-center">{x.stats.headcount}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">{x.stats.working}</td>
                    <td className="py-2.5 px-3 text-center text-amber-400">{x.stats.late}</td>
                    <td className="py-2.5 px-3 text-center text-sky-400">
                      {x.stats.tasksDone}/{x.stats.tasksAssigned}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{x.stats.perHead}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-400 text-sm">
                      {x.stats.kpi}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 90-day employee spotlight cards */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-400" />
            <span>Top nhân sự xuất sắc 90 ngày</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {profiles(6).map((item, idx) => (
              <div
                key={item.emp.id}
                onClick={() => onSelectEmployee(item.emp.id)}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-300 font-black text-sm flex items-center justify-center border border-indigo-500/40">
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{item.emp.name}</h4>
                    <span className="text-[11px] text-slate-400">{item.emp.role}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">KPI</span>
                    <b className="text-amber-400">{item.stats.kpi}</b>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Chuyên cần</span>
                    <b className="text-emerald-400">{N.pctS(item.stats.attendanceRate)}</b>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Việc xong</span>
                    <b className="text-sky-400">{N.pctS(item.stats.taskRate)}</b>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
