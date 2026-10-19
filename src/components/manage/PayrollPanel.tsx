import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Employee, LeaveRequest } from '../../types';
import { D } from '../../utils/date';
import { esc } from '../../utils/format';
import { printHtml } from '../../utils/printHtml';
import { Printer } from 'lucide-react';

function vnd(n: number) {
  return `${Math.round(n).toLocaleString('vi-VN')} đ`;
}

function weekdaysInMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const days: string[] = [];
  const cursor = new Date(y, m - 1, 1);
  while (cursor.getMonth() === m - 1) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days.push(D.iso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function isPaidLeave(type: string) {
  return /phép|ốm|thai/i.test(type);
}

export interface Payslip {
  emp: Employee;
  standard: number;
  paidWork: number;
  paidLeave: number;
  unpaid: number;
  ot: number;
  base: number;
  earned: number;
  otPay: number;
  net: number;
}

function buildSlip(
  emp: Employee,
  ym: string,
  attendance: { emp: string; date: string; status: string; overtime?: number }[],
  leaves: LeaveRequest[],
): Payslip {
  const days = weekdaysInMonth(ym);
  const today = D.today();
  const att = new Map(
    attendance.filter(a => a.emp === emp.id && a.date.startsWith(ym)).map(a => [a.date, a]),
  );
  const approved = leaves.filter(l => l.emp === emp.id && l.status === 'approved');
  let paidWork = 0;
  let paidLeave = 0;
  let unpaid = 0;
  let ot = 0;

  for (const day of days) {
    if (day > today) continue;
    const row = att.get(day);
    if (row && (row.status === 'present' || row.status === 'late' || row.status === 'remote')) {
      paidWork += 1;
      ot += row.overtime || 0;
      continue;
    }
    const leave = approved.find(l => l.from <= day && l.to >= day);
    if (leave) {
      if (isPaidLeave(leave.type)) paidLeave += 1;
      else unpaid += 1;
      continue;
    }
    unpaid += 1;
  }

  ot = Math.round(ot * 10) / 10;

  const base = emp.salary || 0;
  const dayRate = days.length ? base / days.length : 0;
  const earned = Math.round(dayRate * (paidWork + paidLeave));
  const otPay = Math.round((dayRate / 8) * 1.5 * ot);
  return {
    emp,
    standard: days.length,
    paidWork,
    paidLeave,
    unpaid,
    ot,
    base,
    earned,
    otPay,
    net: earned + otPay,
  };
}

function slipHtml(company: string, ym: string, slip: Payslip, dept: string, teamName: string) {
  const [y, m] = ym.split('-');
  return `
    <section class="slip">
      <p class="muted">${esc(company)}</p>
      <h1>Phiếu lương tháng ${esc(m)}/${esc(y)}</h1>
      <p>${esc(slip.emp.name)} · ${esc(slip.emp.code || '')} · ${esc(slip.emp.role)}</p>
      <p class="muted">${esc(dept)} · ${esc(teamName)}</p>
      <div class="row"><span>Lương cơ bản trên hồ sơ</span><b>${esc(vnd(slip.base))}</b></div>
      <div class="row"><span>Ngày công chuẩn</span><b>${slip.standard}</b></div>
      <div class="row"><span>Ngày làm việc (có mặt, muộn, từ xa)</span><b>${slip.paidWork}</b></div>
      <div class="row"><span>Nghỉ có lương (phép, ốm, thai sản)</span><b>${slip.paidLeave}</b></div>
      <div class="row"><span>Ngày không lương</span><b>${slip.unpaid}</b></div>
      <div class="row"><span>Lương theo ngày công</span><b>${esc(vnd(slip.earned))}</b></div>
      <div class="row"><span>Tăng ca ${slip.ot} giờ × 150%</span><b>${esc(vnd(slip.otPay))}</b></div>
      <div class="row total"><span>Thực lĩnh ước tính</span><span>${esc(vnd(slip.net))}</span></div>
      <p class="muted" style="margin-top:12px">Phiếu nội bộ, tính từ lương hồ sơ và chấm công. Chưa khấu trừ thuế và bảo hiểm.</p>
    </section>
  `;
}

export const PayrollPanel: React.FC<{ onSelectEmployee: (id: string) => void }> = ({ onSelectEmployee }) => {
  const { db, activeEmps, zone, team, addToast } = useStore();
  const [ym, setYm] = useState(D.today().slice(0, 7));
  const [dept, setDept] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const slips = useMemo(() => {
    return activeEmps()
      .filter(e => !dept || e.dept === dept)
      .map(e => buildSlip(e, ym, db.attendance, db.leaves))
      .sort((a, b) => a.emp.name.localeCompare(b.emp.name, 'vi'));
  }, [activeEmps, db.attendance, db.leaves, dept, ym]);

  const selected = slips.find(s => s.emp.id === selectedId) || slips[0];
  const total = slips.reduce((sum, s) => sum + s.net, 0);
  const [y, m] = ym.split('-');

  const printOne = (slip: Payslip) => {
    const ok = printHtml(
      `Phieu luong ${slip.emp.code || slip.emp.name} ${ym}`,
      slipHtml(db.company.name, ym, slip, zone(slip.emp.dept)?.name || '', team(slip.emp.team)?.name || ''),
    );
    if (!ok) addToast('Không mở được hộp thoại in', 'warn');
  };

  const printAll = () => {
    const body = slips
      .map(s => slipHtml(db.company.name, ym, s, zone(s.emp.dept)?.name || '', team(s.emp.team)?.name || ''))
      .join('');
    const ok = printHtml(`Bang luong ${ym}`, body || '<p>Không có nhân sự.</p>');
    if (!ok) addToast('Không mở được hộp thoại in', 'warn');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fadeIn">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="v3m-kicker">Lương</div>
          <h2 className="text-xl font-semibold text-white mt-1">Phiếu lương tháng {m}/{y}</h2>
          <p className="text-xs text-slate-400 mt-1">
            Tính từ lương cơ bản trên hồ sơ, ngày công và tăng ca. Phép năm, ốm và thai sản được tính lương.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={ym}
            onChange={e => setYm(e.target.value || D.today().slice(0, 7))}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200"
          />
          <select
            value={dept}
            onChange={e => setDept(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200"
          >
            <option value="">Tất cả phòng ban</option>
            {db.zones.filter(z => !z.isVirtual).map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
          <button
            onClick={printAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-950 text-xs font-semibold"
          >
            <Printer className="w-3.5 h-3.5" />
            Xuất PDF cả kỳ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nhân sự</th>
                <th className="py-3 px-3 text-center">Công</th>
                <th className="py-3 px-3 text-center">OT</th>
                <th className="py-3 px-4 text-right">Thực lĩnh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {slips.map(s => (
                <tr
                  key={s.emp.id}
                  onClick={() => setSelectedId(s.emp.id)}
                  className={`cursor-pointer ${selected?.emp.id === s.emp.id ? 'bg-white/8' : 'hover:bg-slate-800/40'}`}
                >
                  <td className="py-2.5 px-4">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectEmployee(s.emp.id);
                      }}
                      className="font-semibold text-white hover:text-indigo-300"
                    >
                      {s.emp.name}
                    </button>
                    <div className="text-[10px] text-slate-500">{s.emp.role}</div>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-300">
                    {s.paidWork + s.paidLeave}/{s.standard}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400">{s.ot}h</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-emerald-300">{vnd(s.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs">
            <span className="text-slate-400">{slips.length} phiếu</span>
            <span className="text-white font-semibold">Tổng quỹ {vnd(total)}</span>
          </div>
        </div>

        {selected && (
          <aside className="xl:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-white">{selected.emp.name}</div>
                <div className="text-[11px] text-slate-400">
                  {selected.emp.code} · {zone(selected.emp.dept)?.name}
                </div>
              </div>
              <button
                onClick={() => printOne(selected)}
                className="px-2.5 py-1.5 rounded-lg bg-white text-slate-950 text-[11px] font-semibold"
              >
                Xuất PDF
              </button>
            </div>
            <SlipLine label="Lương cơ bản" value={vnd(selected.base)} />
            <SlipLine label="Ngày công chuẩn" value={String(selected.standard)} />
            <SlipLine label="Ngày làm việc" value={String(selected.paidWork)} />
            <SlipLine label="Nghỉ có lương" value={String(selected.paidLeave)} />
            <SlipLine label="Ngày không lương" value={String(selected.unpaid)} />
            <SlipLine label="Lương theo công" value={vnd(selected.earned)} />
            <SlipLine label={`Tăng ca ${selected.ot}h × 150%`} value={vnd(selected.otPay)} />
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-xs text-slate-300">Thực lĩnh ước tính</span>
              <b className="text-lg text-emerald-300">{vnd(selected.net)}</b>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Chưa trừ thuế thu nhập và bảo hiểm. Ngày chưa chấm trong tháng được tính là không lương.
            </p>
          </aside>
        )}
      </div>
    </div>
  );
};

function SlipLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs gap-3">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100 font-medium">{value}</span>
    </div>
  );
}
