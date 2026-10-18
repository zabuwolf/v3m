import { DateRangeInfo } from '../types';

export const D = {
  pad: (n: number) => String(n).padStart(2, '0'),
  
  iso(d: Date): string {
    return `${d.getFullYear()}-${D.pad(d.getMonth() + 1)}-${D.pad(d.getDate())}`;
  },

  today(): string {
    return D.iso(new Date());
  },

  addDays(iso: string, n: number): string {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return D.iso(d);
  },

  fmt(iso: string): string {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length < 3) return iso;
    return `${parts[2]}/${parts[1]}`;
  },

  fmtFull(iso: string): string {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length < 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },

  weekday(iso: string): string {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return days[new Date(iso + 'T00:00:00').getDay()];
  },

  nowHM(): string {
    const n = new Date();
    return `${D.pad(n.getHours())}:${D.pad(n.getMinutes())}`;
  },

  range(key: string): DateRangeInfo {
    const t = D.today();
    const dt = new Date(t + 'T00:00:00');
    if (key === 'today') {
      return { from: t, to: t, label: 'Hôm nay', sub: `${D.weekday(t)}, ${D.fmt(t)} · tạm tới ${D.nowHM()}` };
    }
    if (key === 'yesterday') {
      const y = D.addDays(t, -1);
      return { from: y, to: y, label: 'Hôm qua', sub: `${D.weekday(y)}, ${D.fmt(y)}` };
    }
    if (key === 'week') {
      const dow = (dt.getDay() + 6) % 7;
      const from = D.addDays(t, -dow);
      return { from, to: t, label: 'Tuần này', sub: `${D.fmt(from)} – ${D.fmt(t)} (gồm hôm nay tạm tới ${D.nowHM()})` };
    }
    if (key === 'month') {
      const from = t.slice(0, 8) + '01';
      return { from, to: t, label: 'Tháng này', sub: `${D.fmt(from)} – ${D.fmt(t)} (tạm tới ${D.nowHM()})` };
    }
    if (key === '90d') {
      const from = D.addDays(t, -89);
      return { from, to: t, label: '90 ngày', sub: `${D.fmt(from)} – ${D.fmt(t)}` };
    }
    if (key === '30d') {
      const from = D.addDays(t, -29);
      return { from, to: t, label: '30 ngày', sub: `${D.fmt(from)} – ${D.fmt(t)}` };
    }
    return { from: t, to: t, label: key, sub: '' };
  },
};
