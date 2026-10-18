/* ==========================================================================
   store.js – tải/lưu dữ liệu + tính toán số liệu (KPI, chuyên cần, xếp hạng)
   ========================================================================== */
(function () {
  const LS_KEY = 'v3m-hr-db';

  const Store = {
    db: null,
    online: false,
    _saveTimer: null,
    listeners: new Set(),

    async load() {
      try {
        const r = await fetch('/api/data', { cache: 'no-store' });
        if (!r.ok) throw new Error(r.status);
        this.db = await r.json();
        this.online = true;
      } catch (e) {
        this.online = false;
        try {
          const raw = localStorage.getItem(LS_KEY);
          this.db = raw ? JSON.parse(raw) : null;
        } catch (_) { this.db = null; }
        if (!this.db && window.SEED_DATA) this.db = JSON.parse(JSON.stringify(window.SEED_DATA));
      }
      if (!this.db) throw new Error('Không có dữ liệu');
      this.index();
      return this.db;
    },

    index() {
      const d = this.db;
      this.empById = Object.fromEntries(d.employees.map(e => [e.id, e]));
      this.teamById = Object.fromEntries(d.teams.map(t => [t.id, t]));
      this.zoneById = Object.fromEntries(d.zones.map(z => [z.id, z]));
      this.attByEmp = {};
      for (const a of d.attendance) (this.attByEmp[a.emp] = this.attByEmp[a.emp] || []).push(a);
    },

    onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },

    /** Gọi sau mỗi thay đổi dữ liệu: đánh chỉ mục lại, lưu và báo cho UI */
    commit(reason) {
      this.index();
      this.listeners.forEach(fn => { try { fn(reason); } catch (e) { console.error(e); } });
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this.save(), 400);
    },

    async save() {
      try { localStorage.setItem(LS_KEY, JSON.stringify(this.db)); } catch (_) { /* đầy bộ nhớ */ }
      if (!this.online) return;
      try {
        const r = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.db) });
        if (!r.ok) throw new Error(r.status);
        UI && UI.flashSaved && UI.flashSaved();
      } catch (e) {
        console.warn('Lưu thất bại', e);
        UI && UI.toast && UI.toast('Không lưu được lên máy chủ, dữ liệu tạm giữ trên trình duyệt', 'warn');
      }
    },

    async reset() {
      if (this.online) {
        await fetch('/api/reset', { method: 'POST' });
      } else {
        localStorage.removeItem(LS_KEY);
      }
      await this.load();
      this.listeners.forEach(fn => fn('reset'));
    },

    newId(prefix, list) {
      let n = list.length + 1;
      while (list.some(x => x.id === `${prefix}${String(n).padStart(3, '0')}`)) n++;
      return `${prefix}${String(n).padStart(3, '0')}`;
    },

    // --------------------------------------------------------- tiện ích
    emp(id) { return this.empById[id]; },
    team(id) { return this.teamById[id]; },
    zone(id) { return this.zoneById[id]; },
    teamsOf(deptId) { return this.db.teams.filter(t => t.dept === deptId); },
    empsOfTeam(teamId) { return this.db.employees.filter(e => e.team === teamId && e.status !== 'resigned'); },
    empsOfDept(deptId) { return this.db.employees.filter(e => e.dept === deptId && e.status !== 'resigned'); },
    activeEmps() { return this.db.employees.filter(e => e.status !== 'resigned'); },
    isLeader(e) { return /trưởng|lead|ceo|coo|giám đốc/i.test(e.role || ''); },
    shortName(e) { const p = e.name.trim().split(/\s+/); return p.slice(-2).join(' '); },
    deptHead(deptId) {
      const z = this.zone(deptId);
      if (!z) return null;
      return this.db.employees.find(e => e.team === 'leaders' && new RegExp(z.name.replace(/^Phòng /i, '').split(' ')[0], 'i').test(e.role)) || null;
    },
  };

  // ------------------------------------------------------------- ngày tháng
  const D = {
    pad: n => String(n).padStart(2, '0'),
    iso(d) { return `${d.getFullYear()}-${D.pad(d.getMonth() + 1)}-${D.pad(d.getDate())}`; },
    today() { return D.iso(new Date()); },
    addDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return D.iso(d); },
    fmt(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}`; },
    fmtFull(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; },
    weekday(iso) { return ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][new Date(iso + 'T00:00:00').getDay()]; },
    nowHM() { const n = new Date(); return `${D.pad(n.getHours())}:${D.pad(n.getMinutes())}`; },
    /** Khoảng thời gian theo kỳ */
    range(key) {
      const t = D.today();
      const dt = new Date(t + 'T00:00:00');
      if (key === 'today') return { from: t, to: t, label: 'Hôm nay', sub: `${D.weekday(t)}, ${D.fmt(t)} · tạm tới ${D.nowHM()}` };
      if (key === 'yesterday') { const y = D.addDays(t, -1); return { from: y, to: y, label: 'Hôm qua', sub: D.fmt(y) }; }
      if (key === 'week') {
        const dow = (dt.getDay() + 6) % 7; const from = D.addDays(t, -dow);
        return { from, to: t, label: 'Tuần này', sub: `${D.fmt(from)} – ${D.fmt(t)} (gồm hôm nay tạm tới ${D.nowHM()})` };
      }
      if (key === 'month') { const from = t.slice(0, 8) + '01'; return { from, to: t, label: 'Tháng này', sub: `${D.fmt(from)} – ${D.fmt(t)} (tạm tới ${D.nowHM()})` }; }
      if (key === '90d') return { from: D.addDays(t, -89), to: t, label: '90 ngày', sub: `${D.fmt(D.addDays(t, -89))} – ${D.fmt(t)}` };
      if (key === '30d') return { from: D.addDays(t, -29), to: t, label: '30 ngày', sub: `${D.fmt(D.addDays(t, -29))} – ${D.fmt(t)}` };
      return { from: t, to: t, label: key, sub: '' };
    },
  };

  // ------------------------------------------------------------- số liệu
  const N = {
    pct: (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0),
    avg: arr => (arr.length ? Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10 : 0),
    fmt: n => (n == null ? '–' : Number(n).toLocaleString('vi-VN')),
    pctS: n => (n == null ? '–' : `${Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`),
    money: n => (n == null ? '–' : `${(n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`),
  };

  const Metrics = {
    attendance(range, empIds) {
      const set = empIds ? new Set(empIds) : null;
      return Store.db.attendance.filter(a => a.date >= range.from && a.date <= range.to && (!set || set.has(a.emp)));
    },

    /** Thống kê chung cho một tập bản ghi chấm công */
    summarize(rows, headcount) {
      const s = { days: rows.length, present: 0, late: 0, absent: 0, leave: 0, remote: 0, tasksDone: 0, tasksAssigned: 0, overtime: 0, kpis: [] };
      for (const r of rows) {
        s[r.status] = (s[r.status] || 0) + 1;
        s.tasksDone += r.tasksDone || 0; s.tasksAssigned += r.tasksAssigned || 0; s.overtime += r.overtime || 0;
        if (r.kpi) s.kpis.push(r.kpi);
      }
      s.working = s.present + s.late + s.remote;
      s.attendanceRate = N.pct(s.working, s.days);
      s.lateRate = N.pct(s.late, s.days);
      s.taskRate = N.pct(s.tasksDone, s.tasksAssigned);
      s.kpi = N.avg(s.kpis);
      s.overtime = Math.round(s.overtime * 10) / 10;
      s.headcount = headcount;
      s.perHead = headcount ? Math.round((s.tasksDone / headcount) * 10) / 10 : 0;
      delete s.kpis;
      return s;
    },

    emp(empId, rangeKey) {
      const range = typeof rangeKey === 'string' ? D.range(rangeKey) : rangeKey;
      const rows = (Store.attByEmp[empId] || []).filter(a => a.date >= range.from && a.date <= range.to);
      const s = this.summarize(rows, 1);
      s.warnings = this.empWarnings(empId);
      return s;
    },

    team(teamId, rangeKey) {
      const range = typeof rangeKey === 'string' ? D.range(rangeKey) : rangeKey;
      const emps = Store.empsOfTeam(teamId);
      const s = this.summarize(this.attendance(range, emps.map(e => e.id)), emps.length);
      s.warnings = this.teamWarnings(teamId);
      return s;
    },

    dept(deptId, rangeKey) {
      const range = typeof rangeKey === 'string' ? D.range(rangeKey) : rangeKey;
      const emps = Store.empsOfDept(deptId);
      return this.summarize(this.attendance(range, emps.map(e => e.id)), emps.length);
    },

    overview(rangeKey) {
      const range = typeof rangeKey === 'string' ? D.range(rangeKey) : rangeKey;
      const emps = Store.activeEmps();
      const s = this.summarize(this.attendance(range, emps.map(e => e.id)), emps.length);
      s.pendingLeaves = Store.db.leaves.filter(l => l.status === 'pending').length;
      s.openTasks = Store.db.tasks.filter(t => t.status !== 'done').length;
      return s;
    },

    /** Cảnh báo theo quy tắc trong cửa sổ N ngày */
    _warn(stats) {
      const R = Store.db.rules; const w = [];
      if (stats.days === 0) return w;
      if (stats.lateRate > R.lateRate) w.push({ code: 'late', label: 'Đi muộn', value: stats.lateRate, unit: '%', threshold: `ngưỡng ≤ ${R.lateRate}%`, bad: true });
      if (stats.attendanceRate < R.attendanceRate) w.push({ code: 'att', label: 'Chuyên cần thấp', value: stats.attendanceRate, unit: '%', threshold: `ngưỡng ≥ ${R.attendanceRate}%`, bad: true });
      if (stats.tasksAssigned && stats.taskRate < R.taskRate) w.push({ code: 'task', label: 'Hoàn thành việc thấp', value: stats.taskRate, unit: '%', threshold: `ngưỡng ≥ ${R.taskRate}%`, bad: true });
      if (stats.kpi && stats.kpi < R.kpiMin) w.push({ code: 'kpi', label: 'KPI thấp', value: stats.kpi, unit: '', threshold: `ngưỡng ≥ ${R.kpiMin}`, bad: true });
      return w;
    },
    empWarnings(empId) {
      const range = D.range(`${Store.db.rules.windowDays}d`.replace('30d', '30d'));
      const rows = (Store.attByEmp[empId] || []).filter(a => a.date >= range.from && a.date <= range.to);
      return this._warn(this.summarize(rows, 1));
    },
    teamWarnings(teamId) {
      const range = D.range('30d');
      const emps = Store.empsOfTeam(teamId);
      return this._warn(this.summarize(this.attendance(range, emps.map(e => e.id)), emps.length));
    },

    /** Các tổ đủ điều kiện xếp hạng: ≥ 2 thành viên và không phải ban lãnh đạo */
    rankableTeams() {
      return Store.db.teams.filter(t => !['bgd', 'leaders', 'le-tan'].includes(t.id) && Store.empsOfTeam(t.id).length >= 2);
    },

    ranking(rangeKey) {
      const list = this.rankableTeams().map(t => ({ team: t, stats: this.team(t.id, rangeKey), members: Store.empsOfTeam(t.id) }))
        .filter(x => x.stats.days > 0);
      list.sort((a, b) => b.stats.kpi - a.stats.kpi || b.stats.taskRate - a.stats.taskRate);
      return list;
    },

    /** Trạng thái nhấp nháy của tổ: red (xử lý ngay) / yellow (kém nhất kỳ) / null */
    blink(teamId, rangeKey) {
      const R = Store.db.rules;
      if (this.teamWarnings(teamId).length >= R.redMinWarnings) return 'red';
      const rk = this.ranking(rangeKey || 'today');
      if (rk.length && rk[rk.length - 1].team.id === teamId) return 'yellow';
      return null;
    },

    redTeams() { return Store.db.teams.filter(t => this.teamWarnings(t.id).length >= Store.db.rules.redMinWarnings); },
    reminderTeams() { return Store.db.teams.filter(t => { const n = this.teamWarnings(t.id).length; return n > 0 && n < Store.db.rules.redMinWarnings; }); },

    champion(rangeKey) {
      const rk = this.ranking(rangeKey);
      if (!rk.length) return null;
      const top = rk[0];
      const people = top.members.map(e => ({ emp: e, stats: this.emp(e.id, rangeKey) })).sort((a, b) => b.stats.kpi - a.stats.kpi);
      return { team: top.team, stats: top.stats, people: people.slice(0, 2) };
    },

    worst(rangeKey) {
      const rk = this.ranking(rangeKey);
      if (rk.length < 2) return null;
      const byPerHead = [...rk].sort((a, b) => a.stats.perHead - b.stats.perHead)[0];
      const byKpi = rk[rk.length - 1];
      const avgPerHead = N.avg(rk.map(x => x.stats.perHead));
      const avgKpi = N.avg(rk.map(x => x.stats.kpi));
      return { byPerHead, byKpi, avgPerHead, avgKpi, teams: byPerHead.team.id === byKpi.team.id ? [byKpi.team] : [byPerHead.team, byKpi.team] };
    },

    /** Hồ sơ nổi bật 90 ngày */
    profiles(limit) {
      const list = Store.activeEmps().filter(e => !['bgd', 'leaders', 'le-tan'].includes(e.team))
        .map(e => ({ emp: e, stats: this.emp(e.id, '90d') })).filter(x => x.stats.days > 5)
        .sort((a, b) => b.stats.kpi - a.stats.kpi);
      return limit ? list.slice(0, limit) : list;
    },

    todayStatus(empId) {
      const t = D.today();
      const row = (Store.attByEmp[empId] || []).find(a => a.date === t);
      if (!row) return 'none';
      return row.status;
    },
  };

  window.Store = Store; window.D = D; window.N = N; window.Metrics = Metrics;
})();
