/* ==========================================================================
   manage.js – trang Quản lý nhân sự: nhân viên, phòng ban/tổ, chấm công,
   nghỉ phép, công việc, tuyển dụng, khách mời, dữ liệu.
   ========================================================================== */
(function () {
  const $ = s => document.querySelector(s);
  const TABS = [
    ['dashboard', '📊 Tổng quan'], ['employees', '👥 Nhân sự'], ['teams', '🏢 Phòng ban & Tổ'], ['attendance', '⏱ Chấm công'],
    ['leaves', '🌴 Nghỉ phép'], ['tasks', '✅ Công việc'], ['candidates', '🧲 Tuyển dụng'], ['visitors', '☕ Khách mời'], ['data', '⚙️ Dữ liệu & quy tắc'],
  ];
  const ST = { present: 'Có mặt', late: 'Đi muộn', remote: 'Từ xa', absent: 'Vắng', leave: 'Nghỉ phép' };
  const LEAVE_ST = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };

  const Manage = {
    tab: 'dashboard', q: '', attDate: D.today(), filterDept: '',

    render(tab) {
      if (tab) this.tab = tab; UI.view = 'manage';
      const root = $('#view-manage');
      root.innerHTML = `<aside class="side">${TABS.map(([k, l]) => `<button class="${k === this.tab ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}</aside><div class="content" id="mg-content"></div>`;
      root.querySelectorAll('[data-tab]').forEach(b => (b.onclick = () => this.render(b.dataset.tab)));
      this['r_' + this.tab]($('#mg-content'));
    },
    refresh() { if (UI.view === 'manage') this.render(); },

    // --------------------------------------------------------- form chung
    form(title, fields, values, onSubmit, extra = '') {
      const f = fields.map(fd => {
        const v = values[fd.key] ?? fd.default ?? '';
        let input;
        if (fd.type === 'select') input = `<select name="${fd.key}" ${fd.required ? 'required' : ''}>${fd.options.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(v) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
        else if (fd.type === 'textarea') input = `<textarea name="${fd.key}" rows="2">${esc(v)}</textarea>`;
        else input = `<input name="${fd.key}" type="${fd.type || 'text'}" value="${esc(v)}" ${fd.required ? 'required' : ''} ${fd.step ? `step="${fd.step}"` : ''} placeholder="${esc(fd.placeholder || '')}">`;
        return `<label class="fld ${fd.full ? 'full' : ''}"><span>${esc(fd.label)}</span>${input}</label>`;
      }).join('');
      UI.openModal(`<h2>${esc(title)}</h2><form id="mg-form" class="form">${f}${extra}<div class="row gap end full"><button type="button" class="btn ghost" data-close>Huỷ</button><button class="btn" type="submit">Lưu</button></div></form>`, 'wide');
      $('#mg-form').onsubmit = ev => { ev.preventDefault(); const data = Object.fromEntries(new FormData(ev.target).entries()); fields.forEach(fd => { if (fd.type === 'number') data[fd.key] = Number(data[fd.key]); }); onSubmit(data); UI.closeModal(); };
    },
    confirm(msg, fn) { if (window.confirm(msg)) fn(); },

    // --------------------------------------------------------- tổng quan
    r_dashboard(el) {
      const ov = Metrics.overview('today'), wk = Metrics.overview('week'), mo = Metrics.overview('month');
      const rk = Metrics.ranking('month'); const red = Metrics.redTeams(); const pend = Store.db.leaves.filter(l => l.status === 'pending');
      const todayAtt = Store.db.attendance.filter(a => a.date === D.today());
      const notIn = Store.activeEmps().filter(e => !todayAtt.find(a => a.emp === e.id && a.checkIn));
      el.innerHTML = `<h2>Tổng quan nhân sự</h2>
        <div class="kpis"><div class="kpi"><i>Tổng nhân sự</i><b>${ov.headcount}</b><s>${Store.db.teams.length} tổ · ${Store.db.zones.length} khu</s></div><div class="kpi"><i>Có mặt hôm nay</i><b>${ov.working}</b><s>${ov.late} muộn · ${ov.remote} từ xa</s></div><div class="kpi"><i>Nghỉ hôm nay</i><b>${ov.absent + ov.leave}</b><s>${ov.leave} có phép</s></div><div class="kpi"><i>Việc xong hôm nay</i><b>${ov.tasksDone}</b><s>/${ov.tasksAssigned} · ${N.pctS(ov.taskRate)}</s></div><div class="kpi"><i>KPI TB tháng</i><b>${mo.kpi || '–'}</b><s>tuần: ${wk.kpi || '–'}</s></div><div class="kpi warn"><i>Chờ duyệt nghỉ</i><b>${pend.length}</b><s>${red.length} tổ nháy đỏ</s></div></div>
        <div class="cols">
          <div class="panel"><h3>Xếp hạng tổ · tháng này</h3><table class="tbl"><thead><tr><th>#</th><th>Tổ</th><th>KPI</th><th>Việc</th><th>Chuyên cần</th><th>Trạng thái</th></tr></thead><tbody>${rk.map((x, i) => { const b = Metrics.blink(x.team.id, 'month'); return `<tr><td>${i + 1}</td><td><span class="sw" style="background:${x.team.color}"></span>${esc(x.team.name)}</td><td><b>${x.stats.kpi}</b></td><td>${N.pctS(x.stats.taskRate)}</td><td>${N.pctS(x.stats.attendanceRate)}</td><td>${b ? `<span class="ball ${b} sm"></span> ${b === 'red' ? 'Xử lý ngay' : 'Kém nhất'}` : '<span class="ok">ổn</span>'}</td></tr>`; }).join('')}</tbody></table></div>
          <div class="panel"><h3>Chưa check-in hôm nay (${notIn.length})</h3><ul class="list">${notIn.slice(0, 12).map(e => `<li>${UI.avatar(e, 24)} ${esc(e.name)}<small>${esc(Store.team(e.team)?.name || '')}</small><button class="btn sm" onclick="Manage.checkIn('${e.id}')">Check-in</button></li>`).join('') || '<li class="ok">Tất cả đã check-in</li>'}${notIn.length > 12 ? `<li class="muted">… và ${notIn.length - 12} người khác</li>` : ''}</ul></div>
        </div>
        <div class="cols"><div class="panel"><h3>Đơn nghỉ chờ duyệt</h3><ul class="list">${pend.map(l => `<li><span>${esc(Store.emp(l.emp)?.name)} · ${esc(l.type)} ${D.fmt(l.from)}–${D.fmt(l.to)} (${l.days} ngày)</span><span class="row gap"><button class="btn sm" onclick="Manage.setLeave('${l.id}','approved')">Duyệt</button><button class="btn sm ghost" onclick="Manage.setLeave('${l.id}','rejected')">Từ chối</button></span></li>`).join('') || '<li class="ok">Không có đơn chờ</li>'}</ul></div>
          <div class="panel"><h3>Cảnh báo tổ (30 ngày)</h3>${[...red, ...Metrics.reminderTeams()].map(t => UI.reminderCard(t)).join('') || '<p class="ok">✓ Không có tổ nào bị cảnh báo</p>'}</div></div>`;
    },

    // --------------------------------------------------------- nhân sự
    r_employees(el) {
      const q = this.q.toLowerCase(); const list = Store.db.employees.filter(e => (!this.filterDept || e.dept === this.filterDept) && (!q || e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)));
      el.innerHTML = `<div class="row between wrap"><h2>Nhân sự (${list.length})</h2><div class="row gap"><input id="mg-q" placeholder="🔍 Tìm tên, mã, chức vụ" value="${esc(this.q)}"><select id="mg-dept"><option value="">Tất cả phòng</option>${Store.db.zones.map(z => `<option value="${z.id}" ${this.filterDept === z.id ? 'selected' : ''}>${esc(z.name)}</option>`).join('')}</select><button class="btn" onclick="Manage.editEmployee(null)">+ Thêm nhân viên</button><button class="btn ghost" onclick="Manage.exportCSV()">⬇ CSV</button></div></div>
        <table class="tbl"><thead><tr><th></th><th>Mã</th><th>Họ tên</th><th>Chức vụ</th><th>Phòng</th><th>Tổ</th><th>Hôm nay</th><th>KPI 30n</th><th>Chuyên cần</th><th>Trạng thái</th><th></th></tr></thead><tbody>
        ${list.map(e => { const s = Metrics.emp(e.id, '30d'); const st = Metrics.todayStatus(e.id); return `<tr class="${e.status === 'resigned' ? 'dim' : ''}"><td>${UI.avatar(e, 28)}</td><td>${esc(e.code)}</td><td><a href="#" onclick="UI.openEmployee('${e.id}');return false"><b>${esc(e.name)}</b></a></td><td>${esc(e.role)}</td><td>${esc(Store.zone(e.dept)?.name || '')}</td><td><span class="sw" style="background:${Store.team(e.team)?.color || '#999'}"></span>${esc(Store.team(e.team)?.name || '')}</td><td><span class="st ${st}">${ST[st] || 'Chưa chấm'}</span></td><td>${s.kpi || '–'}</td><td>${N.pctS(s.attendanceRate)}</td><td>${{ active: 'Đang làm', probation: 'Thử việc', leave: 'Nghỉ dài hạn', resigned: 'Đã nghỉ' }[e.status] || e.status}</td><td class="acts"><button class="btn sm ghost" onclick="Manage.editEmployee('${e.id}')">✏️</button><button class="btn sm ghost" onclick="Manage.deleteEmployee('${e.id}')">🗑</button></td></tr>`; }).join('')}</tbody></table>`;
      $('#mg-q').oninput = ev => { this.q = ev.target.value; this.r_employees(el); setTimeout(() => { const i = $('#mg-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 0); };
      $('#mg-dept').onchange = ev => { this.filterDept = ev.target.value; this.r_employees(el); };
    },
    empFields() {
      return [
        { key: 'name', label: 'Họ tên', required: true }, { key: 'code', label: 'Mã NV' },
        { key: 'role', label: 'Chức vụ', required: true }, { key: 'gender', label: 'Giới tính', type: 'select', options: [['M', 'Nam'], ['F', 'Nữ']] },
        { key: 'team', label: 'Tổ', type: 'select', options: Store.db.teams.map(t => [t.id, `${t.name} (${Store.zone(t.dept)?.name})`]), required: true },
        { key: 'status', label: 'Trạng thái', type: 'select', options: [['active', 'Đang làm'], ['probation', 'Thử việc'], ['leave', 'Nghỉ dài hạn'], ['resigned', 'Đã nghỉ việc']] },
        { key: 'email', label: 'Email', type: 'email' }, { key: 'phone', label: 'Điện thoại' },
        { key: 'dob', label: 'Ngày sinh', type: 'date' }, { key: 'joinDate', label: 'Ngày vào làm', type: 'date', default: D.today() },
        { key: 'salary', label: 'Lương cơ bản (VND)', type: 'number', step: 100000 }, { key: 'hair', label: 'Kiểu tóc avatar', type: 'select', options: [[0, 'Ngắn'], [1, 'Dài / mai'], [2, 'Búi'], [3, 'Dựng / xoã']] },
      ];
    },
    editEmployee(id) {
      const e = id ? Store.emp(id) : { gender: 'M', status: 'active', avatar: { hair: 0 } };
      const vals = { ...e, hair: e.avatar?.hair ?? 0 };
      this.form(id ? 'Sửa hồ sơ nhân viên' : 'Thêm nhân viên mới', this.empFields(), vals, data => {
        const team = Store.team(data.team); const hair = Number(data.hair); delete data.hair;
        if (id) { Object.assign(e, data, { dept: team.dept }); e.avatar = { ...(e.avatar || {}), hair }; if (e.team !== data.team) e.desk = null; e.team = data.team; }
        else {
          const ne = { id: Store.newId('nv', Store.db.employees), ...data, dept: team.dept, desk: null, avatar: { skin: ['#f6d7b8', '#f1c9a3', '#e8b58d'][Math.floor(Math.random() * 3)], hair, hairColor: '#2b1d14', glasses: Math.random() < 0.2 } };
          if (!ne.code) ne.code = Store.db.company.short + String(Store.db.employees.length + 1).padStart(3, '0');
          Store.db.employees.push(ne); UI.toast(`Đã thêm ${ne.name}`);
        }
        Store.commit('employees');
      });
    },
    deleteEmployee(id) { const e = Store.emp(id); this.confirm(`Xoá hồ sơ ${e.name}? (chấm công, công việc, đơn nghỉ của người này cũng bị xoá)`, () => { const db = Store.db; db.employees = db.employees.filter(x => x.id !== id); db.attendance = db.attendance.filter(x => x.emp !== id); db.tasks = db.tasks.filter(x => x.emp !== id); db.leaves = db.leaves.filter(x => x.emp !== id); Store.commit('employees'); UI.toast('Đã xoá'); }); },
    exportCSV() {
      const rows = [['Mã', 'Họ tên', 'Chức vụ', 'Phòng', 'Tổ', 'Giới tính', 'Email', 'Điện thoại', 'Ngày vào', 'Trạng thái', 'KPI 30 ngày', 'Chuyên cần 30 ngày']];
      for (const e of Store.db.employees) { const s = Metrics.emp(e.id, '30d'); rows.push([e.code, e.name, e.role, Store.zone(e.dept)?.name, Store.team(e.team)?.name, e.gender, e.email, e.phone, e.joinDate, e.status, s.kpi, s.attendanceRate]); }
      const csv = '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `nhan-su-${D.today()}.csv`; a.click();
    },

    // --------------------------------------------------------- phòng ban & tổ
    r_teams(el) {
      el.innerHTML = `<div class="row between"><h2>Phòng ban & Tổ</h2><button class="btn" onclick="Manage.editTeam(null)">+ Thêm tổ</button></div>
        ${Store.db.zones.map(z => { const teams = Store.teamsOf(z.id); const s = Metrics.dept(z.id, 'today'); return `<div class="panel" style="border-left:4px solid ${z.accent}"><div class="row between"><h3>${z.icon} ${esc(z.name)} <small class="muted">${esc(z.sub)}</small></h3><span class="muted">${s.headcount} người · ${s.working} có mặt</span><button class="btn sm ghost" onclick="Manage.editZone('${z.id}')">✏️ Sửa khu</button></div>
          <table class="tbl"><thead><tr><th>Tổ</th><th>Trưởng tổ</th><th>Thành viên</th><th>KPI tháng</th><th>Cảnh báo</th><th></th></tr></thead><tbody>${teams.map(t => { const m = Store.empsOfTeam(t.id); const lead = m.find(e => Store.isLeader(e)); const st = Metrics.team(t.id, 'month'); const w = Metrics.teamWarnings(t.id); return `<tr><td><span class="sw" style="background:${t.color}"></span><b>${esc(t.name)}</b></td><td>${lead ? esc(lead.name) : '<span class="muted">–</span>'}</td><td>${m.map(e => `<span class="chip sm">${esc(Store.shortName(e))}</span>`).join(' ')}</td><td>${st.kpi || '–'}</td><td>${w.length ? `<span class="ball ${w.length >= Store.db.rules.redMinWarnings ? 'red' : 'yellow'} sm"></span> ${w.map(x => x.label).join(', ')}` : '<span class="ok">ổn</span>'}</td><td class="acts"><button class="btn sm ghost" onclick="Manage.editTeam('${t.id}')">✏️</button><button class="btn sm ghost" onclick="Manage.deleteTeam('${t.id}')">🗑</button></td></tr>`; }).join('') || '<tr><td colspan=6 class="muted">Chưa có tổ</td></tr>'}</tbody></table></div>`; }).join('')}`;
    },
    editTeam(id) {
      const t = id ? Store.team(id) : { color: '#2f7bd1' };
      this.form(id ? 'Sửa tổ' : 'Thêm tổ', [{ key: 'name', label: 'Tên tổ', required: true }, { key: 'dept', label: 'Phòng / khu', type: 'select', options: Store.db.zones.map(z => [z.id, z.name]) }, { key: 'color', label: 'Màu', type: 'color' }], t, data => {
        if (id) { const moved = t.dept !== data.dept; Object.assign(t, data); if (moved) Store.empsOfTeam(id).forEach(e => { e.dept = data.dept; e.desk = null; }); }
        else Store.db.teams.push({ id: 'team-' + Date.now().toString(36), ...data });
        Store.commit('teams');
      });
    },
    deleteTeam(id) { if (Store.empsOfTeam(id).length) return UI.toast('Tổ còn thành viên, hãy chuyển họ sang tổ khác trước', 'warn'); this.confirm('Xoá tổ này?', () => { Store.db.teams = Store.db.teams.filter(t => t.id !== id); Store.commit('teams'); }); },
    editZone(id) { const z = Store.zone(id); this.form('Sửa khu vực', [{ key: 'name', label: 'Tên khu', required: true }, { key: 'sub', label: 'Mô tả', full: true }, { key: 'icon', label: 'Biểu tượng (emoji)' }, { key: 'accent', label: 'Màu nhấn', type: 'color' }, { key: 'color', label: 'Màu sàn', type: 'color' }], z, data => { Object.assign(z, data); Store.commit('zones'); }); },

    // --------------------------------------------------------- chấm công
    r_attendance(el) {
      const date = this.attDate; const emps = Store.activeEmps(); const rows = emps.map(e => ({ e, a: (Store.attByEmp[e.id] || []).find(x => x.date === date) }));
      const sum = Metrics.summarize(rows.filter(r => r.a).map(r => r.a), emps.length);
      el.innerHTML = `<div class="row between wrap"><h2>Chấm công</h2><div class="row gap"><button class="btn sm ghost" onclick="Manage.attDate=D.addDays(Manage.attDate,-1);Manage.render()">‹</button><input type="date" id="mg-date" value="${date}"><button class="btn sm ghost" onclick="Manage.attDate=D.addDays(Manage.attDate,1);Manage.render()">›</button><button class="btn sm ghost" onclick="Manage.attDate=D.today();Manage.render()">Hôm nay</button><button class="btn" onclick="Manage.markAllPresent()">✓ Tất cả có mặt</button></div></div>
        <div class="kpis small"><div class="kpi"><i>Có mặt</i><b>${sum.working}</b><s>/${emps.length}</s></div><div class="kpi"><i>Đi muộn</i><b>${sum.late}</b></div><div class="kpi"><i>Từ xa</i><b>${sum.remote}</b></div><div class="kpi"><i>Nghỉ phép</i><b>${sum.leave}</b></div><div class="kpi"><i>Vắng</i><b>${sum.absent}</b></div><div class="kpi"><i>OT</i><b>${sum.overtime}h</b></div><div class="kpi"><i>KPI TB</i><b>${sum.kpi || '–'}</b></div></div>
        <table class="tbl"><thead><tr><th></th><th>Họ tên</th><th>Tổ</th><th>Trạng thái</th><th>Vào</th><th>Ra</th><th>OT (h)</th><th>Việc xong/giao</th><th>KPI ngày</th><th></th></tr></thead><tbody>
        ${rows.map(({ e, a }) => `<tr><td>${UI.avatar(e, 26)}</td><td><b>${esc(e.name)}</b></td><td>${esc(Store.team(e.team)?.name || '')}</td>
          <td><select onchange="Manage.setAtt('${e.id}','${date}','status',this.value)"><option value="">– chưa chấm –</option>${Object.entries(ST).map(([k, v]) => `<option value="${k}" ${a && a.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
          <td><input type="time" value="${a?.checkIn || ''}" onchange="Manage.setAtt('${e.id}','${date}','checkIn',this.value)"></td><td><input type="time" value="${a?.checkOut || ''}" onchange="Manage.setAtt('${e.id}','${date}','checkOut',this.value)"></td>
          <td><input type="number" step="0.5" min="0" style="width:60px" value="${a?.overtime ?? 0}" onchange="Manage.setAtt('${e.id}','${date}','overtime',Number(this.value))"></td>
          <td><input type="number" min="0" style="width:48px" value="${a?.tasksDone ?? 0}" onchange="Manage.setAtt('${e.id}','${date}','tasksDone',Number(this.value))"> / <input type="number" min="0" style="width:48px" value="${a?.tasksAssigned ?? 0}" onchange="Manage.setAtt('${e.id}','${date}','tasksAssigned',Number(this.value))"></td>
          <td><input type="number" min="0" max="100" style="width:60px" value="${a?.kpi ?? ''}" onchange="Manage.setAtt('${e.id}','${date}','kpi',Number(this.value))"></td>
          <td class="acts">${!a || !a.checkIn ? `<button class="btn sm" onclick="Manage.checkIn('${e.id}','${date}')">Vào</button>` : !a.checkOut ? `<button class="btn sm" onclick="Manage.checkOut('${e.id}','${date}')">Ra</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
      $('#mg-date').onchange = ev => { this.attDate = ev.target.value; this.render(); };
    },
    attRow(empId, date) {
      let a = (Store.attByEmp[empId] || []).find(x => x.date === date);
      if (!a) { a = { id: `att-${empId}-${date}`, emp: empId, date, status: 'present', checkIn: null, checkOut: null, overtime: 0, tasksDone: 0, tasksAssigned: 0, kpi: 0 }; Store.db.attendance.push(a); }
      return a;
    },
    setAtt(empId, date, key, val) {
      if (key === 'status' && !val) { Store.db.attendance = Store.db.attendance.filter(a => !(a.emp === empId && a.date === date)); Store.commit('attendance'); return; }
      const a = this.attRow(empId, date); a[key] = val;
      if (key === 'checkIn' && val) { a.status = val > '08:40' ? 'late' : (a.status === 'absent' || a.status === 'leave' ? 'present' : a.status); }
      if (key === 'checkOut' && val && a.checkOut > '17:30') { const [h, m] = val.split(':').map(Number); a.overtime = Math.max(0, Math.round(((h * 60 + m) - 1050) / 6) / 10); }
      Store.commit('attendance');
    },
    checkIn(empId, date = D.today()) { const a = this.attRow(empId, date); const hm = date === D.today() ? D.nowHM() : '08:30'; a.checkIn = hm; a.status = hm > '08:40' ? 'late' : 'present'; if (!a.tasksAssigned) a.tasksAssigned = 4; Store.commit('attendance'); UI.toast(`${Store.emp(empId).name} đã check-in ${hm}`); if ($('#modal') && !$('#modal').hidden) UI.openEmployee(empId); },
    checkOut(empId, date = D.today()) { const a = this.attRow(empId, date); const hm = date === D.today() ? D.nowHM() : '17:30'; a.checkOut = hm; const [h, m] = hm.split(':').map(Number); a.overtime = Math.max(0, Math.round(((h * 60 + m) - 1050) / 6) / 10); if (!a.kpi) a.kpi = 70 + Math.round(Math.random() * 25); Store.commit('attendance'); UI.toast(`${Store.emp(empId).name} đã check-out ${hm}`); if ($('#modal') && !$('#modal').hidden) UI.openEmployee(empId); },
    markAllPresent() { for (const e of Store.activeEmps()) { const a = this.attRow(e.id, this.attDate); if (!a.checkIn) { a.checkIn = '08:25'; a.status = 'present'; } } Store.commit('attendance'); },

    // --------------------------------------------------------- nghỉ phép
    r_leaves(el) {
      const list = [...Store.db.leaves].sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1) || b.from.localeCompare(a.from));
      el.innerHTML = `<div class="row between"><h2>Nghỉ phép (${list.filter(l => l.status === 'pending').length} chờ duyệt)</h2><button class="btn" onclick="Manage.addLeave()">+ Tạo đơn</button></div>
        <table class="tbl"><thead><tr><th>Nhân viên</th><th>Loại</th><th>Từ</th><th>Đến</th><th>Ngày</th><th>Lý do</th><th>Trạng thái</th><th></th></tr></thead><tbody>${list.map(l => `<tr><td><b>${esc(Store.emp(l.emp)?.name || '?')}</b><br><small class="muted">${esc(Store.team(Store.emp(l.emp)?.team)?.name || '')}</small></td><td>${esc(l.type)}</td><td>${D.fmtFull(l.from)}</td><td>${D.fmtFull(l.to)}</td><td>${l.days}</td><td>${esc(l.reason)}</td><td><span class="st ${l.status}">${LEAVE_ST[l.status]}</span></td><td class="acts">${l.status === 'pending' ? `<button class="btn sm" onclick="Manage.setLeave('${l.id}','approved')">Duyệt</button><button class="btn sm ghost" onclick="Manage.setLeave('${l.id}','rejected')">Từ chối</button>` : `<button class="btn sm ghost" onclick="Manage.setLeave('${l.id}','pending')">↺</button>`}<button class="btn sm ghost" onclick="Manage.deleteLeave('${l.id}')">🗑</button></td></tr>`).join('')}</tbody></table>`;
    },
    addLeave(empId) {
      this.form('Tạo đơn nghỉ phép', [{ key: 'emp', label: 'Nhân viên', type: 'select', options: Store.activeEmps().map(e => [e.id, e.name]) }, { key: 'type', label: 'Loại', type: 'select', options: ['Nghỉ phép năm', 'Nghỉ ốm', 'Việc riêng', 'Nghỉ không lương', 'Nghỉ thai sản'].map(x => [x, x]) }, { key: 'from', label: 'Từ ngày', type: 'date', default: D.today(), required: true }, { key: 'to', label: 'Đến ngày', type: 'date', default: D.today(), required: true }, { key: 'reason', label: 'Lý do', full: true }], { emp: empId }, data => {
        const days = Math.max(1, Math.round((new Date(data.to) - new Date(data.from)) / 86400000) + 1);
        Store.db.leaves.push({ id: Store.newId('leave', Store.db.leaves), ...data, days, status: 'pending', created: D.today() }); Store.commit('leaves'); UI.toast('Đã tạo đơn nghỉ');
      });
    },
    setLeave(id, status) {
      const l = Store.db.leaves.find(x => x.id === id); l.status = status;
      if (status === 'approved') { for (let d = l.from; d <= l.to; d = D.addDays(d, 1)) { if (d > D.today()) continue; const a = this.attRow(l.emp, d); Object.assign(a, { status: 'leave', checkIn: null, checkOut: null, overtime: 0, tasksDone: 0, tasksAssigned: 0, kpi: 0 }); } }
      Store.commit('leaves'); UI.toast(status === 'approved' ? 'Đã duyệt đơn' : status === 'rejected' ? 'Đã từ chối' : 'Đã mở lại đơn');
      if (!$('#modal').hidden) UI.openAlerts();
    },
    deleteLeave(id) { Store.db.leaves = Store.db.leaves.filter(x => x.id !== id); Store.commit('leaves'); },

    // --------------------------------------------------------- công việc
    r_tasks(el) {
      const by = { todo: 'Cần làm', doing: 'Đang làm', done: 'Hoàn thành' };
      el.innerHTML = `<div class="row between"><h2>Công việc</h2><button class="btn" onclick="Manage.addTask()">+ Giao việc</button></div><div class="kanban">${Object.entries(by).map(([k, label]) => { const ts = Store.db.tasks.filter(t => t.status === k).sort((a, b) => a.due.localeCompare(b.due)); return `<div class="col"><h3>${label} <small>${ts.length}</small></h3>${ts.map(t => { const e = Store.emp(t.emp); const late = t.status !== 'done' && t.due < D.today(); return `<div class="task ${t.priority} ${late ? 'late' : ''}"><b>${esc(t.title)}</b><div class="row between"><span>${e ? UI.avatar(e, 20) + ' ' + esc(Store.shortName(e)) : '–'}</span><small>${late ? '⚠ quá hạn ' : 'hạn '}${D.fmt(t.due)}</small></div><div class="row gap">${k !== 'todo' ? `<button class="btn sm ghost" onclick="Manage.moveTask('${t.id}','${k === 'done' ? 'doing' : 'todo'}')">‹</button>` : ''}${k !== 'done' ? `<button class="btn sm" onclick="Manage.moveTask('${t.id}','${k === 'todo' ? 'doing' : 'done'}')">${k === 'todo' ? 'Bắt đầu' : 'Xong ✓'}</button>` : ''}<button class="btn sm ghost" onclick="Manage.deleteTask('${t.id}')">🗑</button></div></div>`; }).join('')}</div>`; }).join('')}</div>`;
    },
    addTask(empId) {
      this.form('Giao việc', [{ key: 'title', label: 'Tiêu đề', required: true, full: true }, { key: 'emp', label: 'Giao cho', type: 'select', options: Store.activeEmps().map(e => [e.id, e.name]) }, { key: 'priority', label: 'Ưu tiên', type: 'select', options: [['low', 'Thấp'], ['normal', 'Bình thường'], ['high', 'Cao']] }, { key: 'due', label: 'Hạn', type: 'date', default: D.addDays(D.today(), 3) }], { emp: empId, priority: 'normal' }, data => {
        Store.db.tasks.push({ id: Store.newId('task', Store.db.tasks), ...data, status: 'todo', created: D.today() });
        const a = this.attRow(data.emp, D.today()); a.tasksAssigned = (a.tasksAssigned || 0) + 1; if (!a.checkIn) a.status = a.status || 'present';
        Store.commit('tasks'); UI.toast('Đã giao việc');
      });
    },
    moveTask(id, status) { const t = Store.db.tasks.find(x => x.id === id); const was = t.status; t.status = status; if (status === 'done' && was !== 'done') { const a = this.attRow(t.emp, D.today()); a.tasksDone = (a.tasksDone || 0) + 1; if (a.tasksAssigned < a.tasksDone) a.tasksAssigned = a.tasksDone; } Store.commit('tasks'); },
    toggleTask(id) { const t = Store.db.tasks.find(x => x.id === id); this.moveTask(id, t.status === 'done' ? 'doing' : 'done'); UI.openEmployee(t.emp); },
    deleteTask(id) { Store.db.tasks = Store.db.tasks.filter(x => x.id !== id); Store.commit('tasks'); },

    // --------------------------------------------------------- tuyển dụng
    r_candidates(el) {
      const stages = ['Mới nộp', 'Sàng lọc', 'Phỏng vấn 1', 'Phỏng vấn 2', 'Đề nghị', 'Từ chối', 'Đã nhận'];
      el.innerHTML = `<div class="row between"><h2>Tuyển dụng (${Store.db.candidates.length} ứng viên)</h2><button class="btn" onclick="Manage.editCandidate(null)">+ Thêm ứng viên</button></div>
        <table class="tbl"><thead><tr><th>Ứng viên</th><th>Vị trí</th><th>Nguồn</th><th>Nộp ngày</th><th>Giai đoạn</th><th></th></tr></thead><tbody>${Store.db.candidates.map(c => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.role)}</td><td>${esc(c.source)}</td><td>${D.fmtFull(c.applied)}</td><td><select onchange="Manage.setCandidate('${c.id}',this.value)">${stages.map(s => `<option ${c.stage === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td><td class="acts">${c.stage === 'Đề nghị' || c.stage === 'Đã nhận' ? `<button class="btn sm" onclick="Manage.hire('${c.id}')">→ Nhận việc</button>` : ''}<button class="btn sm ghost" onclick="Manage.editCandidate('${c.id}')">✏️</button><button class="btn sm ghost" onclick="Manage.deleteCandidate('${c.id}')">🗑</button></td></tr>`).join('')}</tbody></table>`;
    },
    editCandidate(id) { const c = id ? Store.db.candidates.find(x => x.id === id) : { applied: D.today(), stage: 'Mới nộp' }; this.form(id ? 'Sửa ứng viên' : 'Thêm ứng viên', [{ key: 'name', label: 'Họ tên', required: true }, { key: 'role', label: 'Vị trí', required: true }, { key: 'source', label: 'Nguồn' }, { key: 'applied', label: 'Ngày nộp', type: 'date' }], c, data => { if (id) Object.assign(c, data); else Store.db.candidates.push({ id: Store.newId('cand', Store.db.candidates), stage: 'Mới nộp', ...data }); Store.commit('candidates'); }); },
    setCandidate(id, stage) { Store.db.candidates.find(x => x.id === id).stage = stage; Store.commit('candidates'); },
    deleteCandidate(id) { Store.db.candidates = Store.db.candidates.filter(x => x.id !== id); Store.commit('candidates'); },
    hire(id) { const c = Store.db.candidates.find(x => x.id === id); this.form('Nhận việc: tạo hồ sơ nhân viên', this.empFields(), { name: c.name, role: c.role, gender: 'M', status: 'probation', joinDate: D.today(), hair: 0 }, data => { const team = Store.team(data.team); const hair = Number(data.hair); delete data.hair; Store.db.employees.push({ id: Store.newId('nv', Store.db.employees), ...data, code: data.code || Store.db.company.short + String(Store.db.employees.length + 1).padStart(3, '0'), dept: team.dept, desk: null, avatar: { skin: '#f1c9a3', hair, hairColor: '#2b1d14', glasses: false } }); Store.db.candidates = Store.db.candidates.filter(x => x.id !== id); Store.commit('employees'); UI.toast(`${data.name} đã gia nhập ${team.name}`); }); },

    // --------------------------------------------------------- khách mời
    r_visitors(el) {
      const vs = [...Store.db.visitors].sort((a, b) => b.date.localeCompare(a.date));
      el.innerHTML = `<div class="row between"><h2>Khách mời</h2><button class="btn" onclick="Manage.editVisitor(null)">+ Thêm khách</button></div><table class="tbl"><thead><tr><th>Tên</th><th>Đơn vị</th><th>Ngày</th><th></th></tr></thead><tbody>${vs.map((v, i) => `<tr class="${v.date === D.today() ? '' : 'dim'}"><td><b>${esc(v.name)}</b></td><td>${esc(v.org)}</td><td>${D.fmtFull(v.date)}${v.date === D.today() ? ' <span class="st present">hôm nay</span>' : ''}</td><td class="acts"><button class="btn sm ghost" onclick="Manage.editVisitor(${Store.db.visitors.indexOf(v)})">✏️</button><button class="btn sm ghost" onclick="Manage.deleteVisitor(${Store.db.visitors.indexOf(v)})">🗑</button></td></tr>`).join('')}</tbody></table>`;
    },
    editVisitor(i) { const v = i == null ? { date: D.today() } : Store.db.visitors[i]; this.form(i == null ? 'Thêm khách mời' : 'Sửa khách mời', [{ key: 'name', label: 'Tên (vd: Anh Khải)', required: true }, { key: 'org', label: 'Đơn vị' }, { key: 'date', label: 'Ngày đến', type: 'date' }], v, data => { if (i == null) Store.db.visitors.push(data); else Object.assign(v, data); Store.commit('visitors'); }); },
    deleteVisitor(i) { Store.db.visitors.splice(i, 1); Store.commit('visitors'); },

    // --------------------------------------------------------- dữ liệu & quy tắc
    r_data(el) {
      const R = Store.db.rules; const c = Store.db.company;
      el.innerHTML = `<h2>Dữ liệu & quy tắc</h2><div class="cols">
        <div class="panel"><h3>Công ty</h3><form id="f-company" class="form"><label class="fld"><span>Tên</span><input name="name" value="${esc(c.name)}"></label><label class="fld"><span>Viết tắt</span><input name="short" value="${esc(c.short)}"></label><label class="fld full"><span>Slogan</span><input name="slogan" value="${esc(c.slogan)}"></label><div class="full"><button class="btn">Lưu</button></div></form></div>
        <div class="panel"><h3>Quy tắc nhấp nháy (cửa sổ ${R.windowDays} ngày)</h3><form id="f-rules" class="form">
          <label class="fld"><span>Đi muộn tối đa (%)</span><input type="number" name="lateRate" value="${R.lateRate}"></label><label class="fld"><span>Chuyên cần tối thiểu (%)</span><input type="number" name="attendanceRate" value="${R.attendanceRate}"></label>
          <label class="fld"><span>Hoàn thành việc tối thiểu (%)</span><input type="number" name="taskRate" value="${R.taskRate}"></label><label class="fld"><span>KPI tối thiểu</span><input type="number" name="kpiMin" value="${R.kpiMin}"></label>
          <label class="fld"><span>Số cảnh báo để nháy đỏ</span><input type="number" name="redMinWarnings" value="${R.redMinWarnings}"></label><label class="fld"><span>Cửa sổ (ngày)</span><input type="number" name="windowDays" value="${R.windowDays}"></label>
          <div class="full"><button class="btn">Lưu quy tắc</button></div></form></div></div>
        <div class="panel"><h3>Sao lưu</h3><p class="muted">Trạng thái: ${Store.online ? '🟢 đang lưu lên máy chủ (data/db.json)' : '🟠 ngoại tuyến – lưu trong trình duyệt'}</p><div class="row gap wrap"><button class="btn ghost" onclick="Manage.exportJSON()">⬇ Xuất JSON</button><label class="btn ghost">⬆ Nhập JSON<input type="file" accept=".json" hidden onchange="Manage.importJSON(this.files[0])"></label><button class="btn danger" onclick="Manage.resetData()">↺ Sinh lại dữ liệu mẫu</button></div></div>`;
      $('#f-company').onsubmit = ev => { ev.preventDefault(); Object.assign(c, Object.fromEntries(new FormData(ev.target))); Store.commit('company'); UI.renderTopbar(); UI.toast('Đã lưu'); };
      $('#f-rules').onsubmit = ev => { ev.preventDefault(); for (const [k, v] of new FormData(ev.target)) R[k] = Number(v); Store.commit('rules'); UI.toast('Đã lưu quy tắc'); };
    },
    exportJSON() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(Store.db, null, 1)], { type: 'application/json' })); a.download = `v3m-hr-${D.today()}.json`; a.click(); },
    importJSON(file) { if (!file) return; file.text().then(t => { const obj = JSON.parse(t); if (!obj.employees) throw new Error('thiếu employees'); Store.db = obj; Store.commit('import'); UI.toast('Đã nhập dữ liệu'); }).catch(e => UI.toast('File không hợp lệ: ' + e.message, 'warn')); },
    resetData() { this.confirm('Sinh lại toàn bộ dữ liệu mẫu? Mọi thay đổi sẽ mất.', async () => { await Store.reset(); UI.toast('Đã sinh lại dữ liệu mẫu'); }); },
  };
  window.Manage = Manage;
})();
