/* ==========================================================================
   ui.js – thẻ thông tin, popup hồ sơ, bảng cài đặt, toast, chuyển view
   ========================================================================== */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CHATTER = ['Em đang chốt báo cáo tuần ạ', 'Anh ơi duyệt giúp em đơn nghỉ', 'Task này em xong trước 5h', 'Có khách đến phòng họp 2', 'Đang review PR cho Khoa', 'Cafe ai không, em đi pha?', 'Mai họp sáng 9h nhé', 'Em check-in rồi ạ', 'Ứng viên 14h đã đến', 'Số liệu đã lên Data Hub'];
  const RECEPTION_LINES = [
    (v, s) => `Dạ em chào ${v.map(x => x.name).join(', ')}! Chúc các anh chị buổi chiều tốt lành, chào mừng đến ${s.name} ạ 🌸`,
    (v, s) => ({ from: v[0], text: 'Chào em! Hôm nay văn phòng có gì nổi bật thế?' }),
    (v, s, m) => `Dạ hôm nay có ${m.working}/${m.headcount} người đi làm, ${m.tasksDone} việc đã xong. Tổ ${m.topTeam} đang dẫn đầu KPI ${m.topKpi} điểm ạ 🏆`,
    (v, s) => ({ from: v[1], text: 'Tuyệt quá! Cho anh một ly cafe sữa nhé.' }),
    (v, s) => ({ from: v[2], text: 'Anh cafe đá, ít đá thôi em.' }),
    (v, s) => ({ from: v[3], text: 'Trà sữa cho chị, còn ' + (v[4] ? v[4].name : 'anh Tiến') + ' thì trà đào!' }),
    (v, s) => ({ from: v[5] || v[0], text: 'Anh cần gặp phòng Nhân sự để phỏng vấn ạ.' }),
    (v, s) => `Dạ có ngay ạ! Mời các anh chị ngồi sofa nghỉ ngơi, ${s.short} CAFÉ phục vụ trong 3 phút ☕`,
  ];

  const UI = {
    view: 'office',
    avatarCache: {},

    init() {
      $('#tabs').addEventListener('click', ev => { const b = ev.target.closest('[data-view]'); if (b) this.setView(b.dataset.view); });
      $('#btn-settings').addEventListener('click', () => this.toggleSettings());
      $('#zoom-in').addEventListener('click', () => Office.zoomBy(1.25));
      $('#zoom-out').addEventListener('click', () => Office.zoomBy(0.8));
      $('#zoom-fit').addEventListener('click', () => Office.fitAll());
      $('#btn-tour').addEventListener('click', () => Tour.start());
      $('#btn-bell').addEventListener('click', () => this.openAlerts());
      $('#btn-chat').addEventListener('click', () => this.openReceptionChat());
      $('#modal').addEventListener('click', ev => { if (ev.target.id === 'modal' || ev.target.closest('[data-close]')) this.closeModal(); });
      document.addEventListener('keydown', ev => { if (ev.key === 'Escape') { this.closeModal(); $('#settings-panel').hidden = true; } });
      this.renderTopbar();
      this.renderSettings();
      this.startChatter();
      setInterval(() => this.renderTopbar(), 30000);
    },

    setView(v) {
      this.view = v;
      document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v));
      $('#view-office').hidden = v !== 'office'; $('#view-manage').hidden = v !== 'manage'; $('#view-reports').hidden = v !== 'reports';
      Office.frozen = v !== 'office';
      if (v === 'manage') Manage.render();
      if (v === 'reports') Reports.render();
      if (v === 'office') { Office.resize(); }
      this.hideHover();
    },

    renderTopbar() {
      const c = Store.db.company; $('#logo-text').textContent = c.short; $('#logo-sub').textContent = 'HR OFFICE';
      const red = Metrics.redTeams().length + Metrics.reminderTeams().length + Store.db.leaves.filter(l => l.status === 'pending').length;
      $('#bell-count').textContent = red; $('#bell-count').hidden = !red;
      $('#conn-dot').className = 'dot ' + (Store.online ? 'on' : 'off'); $('#conn-dot').title = Store.online ? 'Đã kết nối máy chủ' : 'Chế độ ngoại tuyến (lưu trên trình duyệt)';
    },

    toast(msg, type = 'info') {
      const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = msg; $('#toasts').appendChild(el);
      setTimeout(() => el.classList.add('show'), 10); setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2600);
    },
    flashSaved() { const d = $('#saved-dot'); d.classList.add('show'); setTimeout(() => d.classList.remove('show'), 1200); },

    // -------------------------------------------------------------- modal
    openModal(html, cls = '') { const m = $('#modal'); m.querySelector('.modal-box').className = 'modal-box ' + cls; m.querySelector('.modal-box').innerHTML = html; m.hidden = false; },
    closeModal() { $('#modal').hidden = true; },

    // -------------------------------------------------------------- avatar
    avatar(e, size = 44) {
      const key = e.id + size + JSON.stringify(e.avatar || {}) + e.team;
      if (!this.avatarCache[key]) {
        const cv = document.createElement('canvas'); const s = size / 44; cv.width = size; cv.height = size;
        const ctx = cv.getContext('2d'); const team = Store.team(e.team);
        ctx.fillStyle = team ? team.color + '33' : '#eee'; ctx.fillRect(0, 0, size, size);
        ctx.save(); ctx.scale(s * 1.15, s * 1.15); Office.drawPerson(ctx, 19, 41, e.avatar || {}, team ? team.color : '#777', e.gender, 0); ctx.restore();
        this.avatarCache[key] = cv.toDataURL();
      }
      return `<img class="av" src="${this.avatarCache[key]}" width="${size}" height="${size}" alt="">`;
    },

    // -------------------------------------------------------------- hover card
    showHover(h, mx, my) {
      const el = $('#hover-card');
      if (h.kind === 'emp') el.innerHTML = this.empHoverHTML(Store.emp(h.id));
      else if (h.kind === 'agent') { const a = Store.db.agents.find(x => x.id === h.id); el.innerHTML = `<div class="hc-head"><b>${esc(a.name)}</b><span class="tag ai">AI</span></div><div class="muted">${esc(a.desc)}</div><div class="hc-foot">${esc(Store.zone(a.dept).name)} · đang chạy</div>`; }
      else if (h.kind === 'zone') { const z = Store.zone(h.id); const s = Metrics.dept(z.id, 'today'); el.innerHTML = `<div class="hc-head"><b>${z.icon} ${esc(z.name)}</b></div><div class="muted">${esc(z.sub)}</div><div class="hc-grid"><div><i>Nhân sự</i><b>${s.headcount}</b></div><div><i>Có mặt</i><b>${s.working}</b></div><div><i>KPI TB</i><b>${s.kpi || '–'}</b></div></div><div class="hc-foot">Bấm để xem thẻ khu vực</div>`; }
      el.hidden = false; this.moveHover(mx, my);
    },
    moveHover(mx, my) { const el = $('#hover-card'); const r = $('#view-office').getBoundingClientRect(); let x = mx + 14, y = my + 14; if (x + el.offsetWidth > r.width - 8) x = mx - el.offsetWidth - 14; if (y + el.offsetHeight > r.height - 8) y = my - el.offsetHeight - 14; el.style.left = Math.max(4, x) + 'px'; el.style.top = Math.max(4, y) + 'px'; },
    hideHover() { $('#hover-card').hidden = true; },

    empHoverHTML(e) {
      const s = Metrics.emp(e.id, '90d'); const team = Store.team(e.team); const w = s.warnings;
      const level = w.length >= Store.db.rules.redMinWarnings ? 'red' : w.length ? 'yellow' : 'ok';
      return `<div class="hc-head">${this.avatar(e, 30)}<div><b>${esc(e.name)}</b><div class="muted">${esc(team ? team.name : '')} · ${esc(e.role)}</div></div>${Store.isLeader(e) ? '<span class="tag gold">LEAD</span>' : ''}</div>
        <div class="hc-grid">
          <div><i>KPI · 90 ngày</i><b>${s.kpi || '–'}</b></div><div><i>Chuyên cần</i><b>${N.pctS(s.attendanceRate)}</b></div><div><i>Đi muộn</i><b>${s.late} lần</b></div>
          <div><i>Việc xong</i><b>${s.tasksDone}/${s.tasksAssigned}</b></div><div><i>Tỉ lệ việc</i><b>${N.pctS(s.taskRate)}</b></div><div><i>OT</i><b>${s.overtime}h</b></div>
        </div>
        ${level !== 'ok' ? `<div class="hc-warn ${level}"><b>${level === 'red' ? '🔴 XỬ LÝ NGAY' : '🟡 CẦN CHÚ Ý'} · ${w.length} vấn đề</b>${w.map(x => `<div>${esc(x.label)} <b>${x.value}${x.unit}</b> <span class="muted">${esc(x.threshold)}</span></div>`).join('')}</div>` : '<div class="hc-ok">✓ Không có cảnh báo 30 ngày</div>'}
        <div class="hc-foot">Số liệu 90 ngày · ${esc(Store.db.company.short)} HR · bấm để mở hồ sơ</div>`;
    },

    // -------------------------------------------------------------- các loại thẻ (dùng chung với Tour & Reports)
    tile(label, value, sub) { return `<div class="tile"><i>${esc(label)}</i><b>${value}</b>${sub ? `<s>${esc(sub)}</s>` : ''}</div>`; },

    zoneCard(z, idx, total) {
      const s = Metrics.dept(z.id, 'today'); const agents = Store.db.agents.filter(a => a.dept === z.id).length;
      let tiles = '';
      if (z.id === 'dieu-hanh') {
        const ceo = Store.db.employees.find(e => e.team === 'bgd');
        tiles = this.tile('Người vận hành', ceo ? esc(ceo.role) : '–', ceo ? Store.shortName(ceo) : '') + this.tile('Phiếu chờ duyệt', Store.db.leaves.filter(l => l.status === 'pending').length, 'đơn nghỉ phép')
          + this.tile('Chờ chốt', Store.db.tasks.filter(t => t.status !== 'done' && t.priority === 'high').length, 'việc ưu tiên cao') + this.tile('Chiếu tiếp', Store.db.settings.slideshowAt, 'lịch tự chiếu');
      } else if (z.id === 'leader-hub') {
        tiles = this.tile('Trưởng phòng', s.headcount, 'người thật') + this.tile('Việc đang chạy', Store.db.tasks.filter(t => t.status === 'doing').length, 'toàn công ty')
          + this.tile('Số liệu lúc', D.nowHM(), 'mốc chụp') + this.tile('Trợ lý AI', agents, 'đang chạy');
      } else if (z.id === 'le-tan') {
        const vs = Store.db.visitors.filter(v => v.date === D.today());
        tiles = this.tile('Khách mời', vs.length, vs.map(v => v.name.split(' ').pop()).join(' · ')) + this.tile('Lễ tân', s.headcount, '"Các anh dùng gì ạ?"') + this.tile('Có mặt', s.working, 'ca hôm nay');
      } else {
        tiles = this.tile('Nhân sự', s.headcount, `${Store.teamsOf(z.id).length} tổ`) + this.tile('Có mặt hôm nay', s.working, `${s.remote} làm từ xa`) + this.tile('Đi muộn', s.late, 'lượt hôm nay')
          + this.tile('Việc xong hôm nay', s.tasksDone, `/${s.tasksAssigned} giao`) + this.tile('KPI TB', s.kpi || '–', 'điểm') + this.tile('Trợ lý AI', agents, agents ? 'đang chạy' : 'chưa gắn');
        if (z.id === 'nhan-su') tiles += this.tile('Đơn nghỉ chờ', Store.db.leaves.filter(l => l.status === 'pending').length, 'cần duyệt') + this.tile('Ứng viên', Store.db.candidates.length, 'đang xử lý');
      }
      return `<div class="card zone-card" style="--ac:${z.accent}"><div class="card-kicker">KHU VỰC ${idx}/${total}</div><div class="card-title"><span class="ico">${z.icon}</span><div><h3>${esc(z.name)}</h3><p>${esc(z.sub)}</p></div></div><div class="tiles">${tiles}</div></div>`;
    },

    overviewCard(period) {
      const r = D.range(period); const s = Metrics.overview(r);
      return `<div class="card"><div class="card-kicker">TỔNG QUAN · ${r.label.toUpperCase()}</div><div class="muted small">${esc(r.sub)}</div><div class="tiles t3">
        ${this.tile('Đi làm', `${s.working}`, `/${s.headcount} người`)}${this.tile('Đi muộn', s.late, 'lượt')}${this.tile('Nghỉ', s.absent + s.leave, `${s.leave} có phép`)}
        ${this.tile('Việc xong', s.tasksDone, `/${s.tasksAssigned} · ${N.pctS(s.taskRate)}`)}${this.tile('KPI TB', s.kpi || '–', 'điểm')}${this.tile('OT', `${s.overtime}h`, 'tăng ca')}
      </div></div>`;
    },

    rulesCard() {
      const R = Store.db.rules; const red = Metrics.redTeams(), rk = Metrics.ranking('today'); const worst = rk[rk.length - 1];
      return `<div class="card"><div class="card-kicker">▦ QUY TẮC NHẤP NHÁY TRONG VĂN PHÒNG</div>
        <div class="rule"><span class="ball red"></span><div><b>NHÁY ĐỎ · XỬ LÝ NGAY</b><p>Tổ có từ ${R.redMinWarnings} cảnh báo trở lên trong ${R.windowDays} ngày: Đi muộn > ${R.lateRate}% · Chuyên cần < ${R.attendanceRate}% · Hoàn thành việc < ${R.taskRate}% · KPI < ${R.kpiMin}</p><p class="hl red">Đang đỏ: ${red.length ? red.map(t => esc(t.name)).join(' · ') : 'không có tổ nào'}</p></div></div>
        <div class="rule"><span class="ball yellow"></span><div><b>NHÁY VÀNG · KÉM NHẤT KỲ</b><p>Ít việc / người nhất · KPI thấp nhất — so giữa các tổ trong kỳ đang chiếu</p><p class="hl yellow">Hôm nay: ${worst ? esc(worst.team.name) : '–'}</p></div></div></div>`;
    },

    podium(rk, period) {
      const r = D.range(period); const order = [rk[1], rk[0], rk[2]];
      return `<div class="podium-wrap"><div class="podium-kicker">🏆 VINH DANH · ${r.label.toUpperCase()}</div><div class="podium">${order.map((x, i) => {
        if (!x) return '<div class="pod empty"></div>';
        const rank = i === 1 ? 1 : i === 0 ? 2 : 3; const m = x.members.slice(0, 2);
        return `<div class="pod r${rank}"><span class="rank">${rank}</span><div class="avs">${m.map(e => this.avatar(e, 34)).join('')}</div><b>${esc(x.team.name)}</b><small>${m.map(e => Store.shortName(e)).join(' · ')}</small><em>${x.stats.kpi} điểm</em><small>${x.stats.tasksDone} việc · chuyên cần ${N.pctS(x.stats.attendanceRate)}</small><div class="base">${rank}</div></div>`;
      }).join('')}</div></div>`;
    },

    championCard(period) {
      const c = Metrics.champion(period); const r = D.range(period); if (!c) return '<div class="card">Chưa đủ dữ liệu</div>';
      return `<div class="card gold"><div class="card-kicker">👑 QUÁN QUÂN · ${r.label.toUpperCase()}</div><div class="card-title"><div class="avs">${c.people.map(p => this.avatar(p.emp, 48)).join('')}</div><div><h3>${c.people.map(p => Store.shortName(p.emp)).join(' & ')}</h3><p>${esc(c.team.name)}</p></div></div>
        <div class="tiles t3">${this.tile('KPI tổ', c.stats.kpi, 'điểm')}${this.tile('Việc xong', c.stats.tasksDone, `/${c.stats.tasksAssigned}`)}${this.tile('Chuyên cần', N.pctS(c.stats.attendanceRate), `${c.stats.late} lượt muộn`)}</div></div>`;
    },

    worstCard(period) {
      const w = Metrics.worst(period); const r = D.range(period); if (!w) return '<div class="card">Chưa đủ dữ liệu</div>';
      const members = w.teams.flatMap(t => Store.empsOfTeam(t.id)).slice(0, 3);
      return `<div class="card yellow"><div class="card-title"><div class="avs">${members.map(e => this.avatar(e, 44)).join('')}</div><div><div class="card-kicker">🟡 KÉM NHẤT · ${r.label.toUpperCase()}</div><h3>${w.teams.map(t => esc(t.name)).join(' & ')}</h3><p>${esc(r.sub)} · so ${Metrics.rankableTeams().length} tổ</p></div></div>
        <div class="reason"><span class="ball yellow">↓</span><span>${esc(w.byPerHead.team.name)} · ít việc / người nhất</span><b>${w.byPerHead.stats.perHead}</b><small>TB ${w.avgPerHead} việc/người</small></div>
        <div class="reason"><span class="ball yellow">$</span><span>${esc(w.byKpi.team.name)} · KPI thấp nhất</span><b>${w.byKpi.stats.kpi}</b><small>TB ${w.avgKpi}</small></div>
        <p class="why">Vì sao nháy vàng: thấp nhất trong các tổ ở kỳ ${r.label.toLowerCase()} — cần đẩy việc / cải thiện chuyên cần</p></div>`;
    },

    reminderCard(team) {
      const w = Metrics.teamWarnings(team.id); const red = w.length >= Store.db.rules.redMinWarnings; const members = Store.empsOfTeam(team.id).slice(0, 3);
      return `<div class="card ${red ? 'red' : 'yellow'}"><div class="card-title"><div class="avs">${members.map(e => this.avatar(e, 44)).join('')}</div><div><div class="card-kicker">${red ? '🔴 XỬ LÝ NGAY' : '⚠ NHẮC NHỞ'} · ${w.length} vấn đề</div><h3>${members.length <= 2 ? members.map(e => Store.shortName(e)).join(' & ') : esc(team.name)}</h3><p>${esc(team.name)} · số ${Store.db.rules.windowDays} ngày ${esc(Store.db.company.short)} HR</p></div></div>
        ${w.map(x => `<div class="reason"><span class="ball ${red ? 'red' : 'yellow'}">!</span><span>${esc(x.label)}</span><b>${x.value}${x.unit}</b><small>${esc(x.threshold)}</small></div>`).join('')}
        <p class="why">${red ? `Vì sao nháy đỏ: ${w.length} cảnh báo cùng lúc — từ ${Store.db.rules.redMinWarnings} cảnh báo trở lên là xử lý ngay` : `Vì sao nhắc: 1 cảnh báo — theo dõi, chưa tới mức nháy đỏ (từ ${Store.db.rules.redMinWarnings} cảnh báo)`}</p></div>`;
    },

    profileCard(e, rank) {
      const s = Metrics.emp(e.id, '90d'); const team = Store.team(e.team);
      return `<div class="card"><div class="card-title">${this.avatar(e, 52)}<div><div class="card-kicker">HỒ SƠ NHÂN SỰ</div><h3>${esc(Store.shortName(e))}</h3><p>${esc(team ? team.name : '')} · ${rank ? `Top ${rank} 90 ngày` : esc(e.role)}</p></div></div>
        <div class="tiles t3">${this.tile('KPI 90 ngày', s.kpi || '–', 'điểm')}${this.tile('Chuyên cần', N.pctS(s.attendanceRate), `${s.late} lượt muộn`)}${this.tile('Việc xong', N.pctS(s.taskRate), `${s.tasksDone}/${s.tasksAssigned}`)}</div>
        <p class="${s.warnings.length ? 'why warn' : 'ok'}">${s.warnings.length ? '⚠ ' + s.warnings.map(x => `${x.label} ${x.value}${x.unit}`).join(' · ') : '✓ Không có cảnh báo'}</p></div>`;
    },

    receptionMessages() {
      const vs = Store.db.visitors.filter(v => v.date === D.today()); const c = Store.db.company;
      const ov = Metrics.overview('today'); const rk = Metrics.ranking('today');
      const m = { ...ov, topTeam: rk[0] ? rk[0].team.name.replace(/^Tổ /, '') : '–', topKpi: rk[0] ? rk[0].stats.kpi : '–' };
      const rec = Store.empsOfTeam('le-tan')[0];
      const pad = [...vs]; while (pad.length < 6) pad.push({ name: 'Khách ' + (pad.length + 1), org: '' });
      return RECEPTION_LINES.map(fn => { const r = fn(pad, c, m); return typeof r === 'string' ? { from: rec, text: r, me: true } : { ...r, visitor: true }; }).filter(x => x.from);
    },
    receptionCard(count) {
      const vs = Store.db.visitors.filter(v => v.date === D.today()); const c = Store.db.company; const t = D.today();
      const msgs = this.receptionMessages().slice(0, count == null ? 99 : count);
      const rec = Store.empsOfTeam('le-tan')[0];
      return `<div class="card recep"><div class="card-title">${rec ? this.avatar(rec, 40) : ''}<div><div class="card-kicker">☕ ${esc(c.short)} CAFÉ · ĐÓN KHÁCH</div><h3>Lễ tân ${esc(c.short)}</h3><p>Hôm nay ${vs.length} khách mời · ${D.weekday(t)}, ${D.fmt(t)}</p></div></div>
        <div class="visitors">${vs.map((v, i) => `<div class="vis"><span class="vav" style="background:${['#2f7bd1', '#8a4bd3', '#f5b700', '#1f9d55', '#9aa0ab', '#e5484d'][i % 6]}">${esc(v.name.split(' ').pop()[0])}</span><small>${esc(v.name.split(' ').pop())}</small></div>`).join('') || '<span class="muted">Chưa có khách hôm nay</span>'}</div>
        <div class="chat">${msgs.slice(-4).map(m => `<div class="msg ${m.me ? 'me' : 'them'}"><small>${esc(m.me ? 'Lễ tân' : m.from.name)}</small><div>${esc(m.text)}</div></div>`).join('')}</div></div>`;
    },

    // -------------------------------------------------------------- popup theo đối tượng
    openZone(id) {
      const z = Store.zone(id); const idx = Store.db.zones.indexOf(z) + 1;
      const teams = Store.teamsOf(id).map(t => { const s = Metrics.team(t.id, 'today'); const b = Metrics.blink(t.id, 'today'); return `<tr><td><span class="sw" style="background:${t.color}"></span>${esc(t.name)} ${b ? `<span class="ball ${b} sm"></span>` : ''}</td><td>${s.headcount}</td><td>${s.working}</td><td>${s.late}</td><td>${s.tasksDone}/${s.tasksAssigned}</td><td>${s.kpi || '–'}</td></tr>`; }).join('');
      this.openModal(`${this.zoneCard(z, idx, Store.db.zones.length)}<table class="tbl"><thead><tr><th>Tổ</th><th>Nhân sự</th><th>Có mặt</th><th>Muộn</th><th>Việc</th><th>KPI</th></tr></thead><tbody>${teams || '<tr><td colspan=6 class="muted">Chưa có tổ</td></tr>'}</tbody></table>
        <div class="row gap"><button class="btn" onclick="Office.focusZone(Store.zone('${id}'));UI.closeModal()">🎯 Tới khu</button><button class="btn ghost" onclick="UI.setView('manage');Manage.render('teams')">Quản lý tổ</button><button class="btn ghost" data-close>Đóng</button></div>`, 'wide');
    },
    openAgent(id) { const a = Store.db.agents.find(x => x.id === id); this.openModal(`<div class="card"><div class="card-kicker">TRỢ LÝ AI</div><div class="card-title"><span class="ico">🤖</span><div><h3>${esc(a.name)}</h3><p>${esc(a.desc)}</p></div></div><div class="tiles t3">${this.tile('Khu vực', esc(Store.zone(a.dept).name), '')}${this.tile('Trạng thái', 'Đang chạy', 'tự động')}${this.tile('Model', 'Claude Sonnet 5.5', 'mặc định')}</div></div><div class="row gap"><button class="btn ghost" data-close>Đóng</button></div>`); },

    openEmployee(id) {
      const e = Store.emp(id); if (!e) return; const team = Store.team(e.team); const z = Store.zone(e.dept);
      const today = (Store.attByEmp[id] || []).find(a => a.date === D.today());
      const stats = ['today', 'week', 'month', '90d'].map(k => ({ k, r: D.range(k), s: Metrics.emp(id, k) }));
      const tasks = Store.db.tasks.filter(t => t.emp === id).sort((a, b) => (a.status === 'done') - (b.status === 'done'));
      const leaves = Store.db.leaves.filter(l => l.emp === id);
      const stLabel = { present: 'Có mặt', late: 'Đi muộn', remote: 'Từ xa', absent: 'Vắng', leave: 'Nghỉ phép', none: 'Chưa chấm công' };
      this.openModal(`<div class="emp-head">${this.avatar(e, 64)}<div><h2>${esc(e.name)}</h2><p>${esc(e.role)} · <span class="sw" style="background:${team ? team.color : '#999'}"></span>${esc(team ? team.name : '')} · ${esc(z ? z.name : '')}</p><p class="muted small">${esc(e.code)} · ${esc(e.email)} · ${esc(e.phone)} · vào làm ${D.fmtFull(e.joinDate)}</p></div></div>
        <div class="row gap wrap">
          <div class="chip">Hôm nay: <b>${stLabel[today ? today.status : 'none']}</b>${today && today.checkIn ? ` · vào ${today.checkIn}${today.checkOut ? ' · ra ' + today.checkOut : ''}` : ''}</div>
          ${!today || !today.checkIn ? `<button class="btn sm" onclick="Manage.checkIn('${id}')">⏱ Check-in</button>` : !today.checkOut ? `<button class="btn sm" onclick="Manage.checkOut('${id}')">⏱ Check-out</button>` : ''}
          <button class="btn sm ghost" onclick="UI.closeModal();UI.setView('office');Office.selected='${id}';Office.focusEmp(Store.emp('${id}'))">🎯 Tới bàn</button>
          <button class="btn sm ghost" onclick="Manage.editEmployee('${id}')">✏️ Sửa hồ sơ</button>
        </div>
        <table class="tbl"><thead><tr><th>Kỳ</th><th>Ngày công</th><th>Có mặt</th><th>Muộn</th><th>Việc xong</th><th>KPI</th><th>OT</th></tr></thead><tbody>
          ${stats.map(x => `<tr><td>${x.r.label}</td><td>${x.s.days}</td><td>${x.s.working}</td><td>${x.s.late}</td><td>${x.s.tasksDone}/${x.s.tasksAssigned}</td><td>${x.s.kpi || '–'}</td><td>${x.s.overtime}h</td></tr>`).join('')}</tbody></table>
        ${stats[3].s.warnings.length ? `<div class="hc-warn red">${stats[3].s.warnings.map(x => `<div>⚠ ${esc(x.label)} <b>${x.value}${x.unit}</b> <span class="muted">${esc(x.threshold)}</span></div>`).join('')}</div>` : '<div class="hc-ok">✓ Không có cảnh báo trong 30 ngày</div>'}
        <div class="cols"><div><h4>Công việc (${tasks.filter(t => t.status !== 'done').length} đang mở)</h4><ul class="list">${tasks.slice(0, 6).map(t => `<li class="${t.status}"><label><input type="checkbox" ${t.status === 'done' ? 'checked' : ''} onchange="Manage.toggleTask('${t.id}')"> ${esc(t.title)}</label><small>${t.priority === 'high' ? '🔥 ' : ''}hạn ${D.fmt(t.due)}</small></li>`).join('') || '<li class="muted">Chưa có việc</li>'}</ul><button class="btn sm ghost" onclick="Manage.addTask('${id}')">+ Giao việc</button></div>
        <div><h4>Nghỉ phép</h4><ul class="list">${leaves.map(l => `<li><span>${esc(l.type)} ${D.fmt(l.from)}–${D.fmt(l.to)}</span><small class="st ${l.status}">${{ pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' }[l.status]}</small></li>`).join('') || '<li class="muted">Không có đơn</li>'}</ul><button class="btn sm ghost" onclick="Manage.addLeave('${id}')">+ Tạo đơn nghỉ</button></div></div>
        <div class="row gap end"><button class="btn ghost" data-close>Đóng</button></div>`, 'wide');
    },

    openAlerts() {
      const red = Metrics.redTeams(), rem = Metrics.reminderTeams(); const leaves = Store.db.leaves.filter(l => l.status === 'pending');
      this.openModal(`<h2>🔔 Cần xử lý</h2>${red.map(t => this.reminderCard(t)).join('')}${rem.map(t => this.reminderCard(t)).join('')}
        ${leaves.length ? `<div class="card"><div class="card-kicker">ĐƠN NGHỈ CHỜ DUYỆT · ${leaves.length}</div>${leaves.map(l => `<div class="reason"><span>${esc(Store.emp(l.emp)?.name || '?')} · ${esc(l.type)} ${D.fmt(l.from)}–${D.fmt(l.to)}</span><button class="btn sm" onclick="Manage.setLeave('${l.id}','approved')">Duyệt</button><button class="btn sm ghost" onclick="Manage.setLeave('${l.id}','rejected')">Từ chối</button></div>`).join('')}</div>` : ''}
        ${!red.length && !rem.length && !leaves.length ? '<p class="ok">✓ Không có gì cần xử lý</p>' : ''}<div class="row gap end"><button class="btn ghost" data-close>Đóng</button></div>`, 'wide');
    },

    openReceptionChat() { this.openModal(`${this.receptionCard()}<div class="row gap end"><button class="btn ghost" onclick="UI.setView('manage');Manage.render('visitors');UI.closeModal()">Quản lý khách mời</button><button class="btn ghost" data-close>Đóng</button></div>`); },

    // -------------------------------------------------------------- cài đặt văn phòng
    toggleSettings() { const p = $('#settings-panel'); p.hidden = !p.hidden; if (!p.hidden) this.renderSettings(); },
    renderSettings() {
      const S = Store.db.settings; const p = $('#settings-panel');
      const tog = (key, label, icon) => `<button class="opt ${S[key] ? 'on' : ''}" data-set="${key}"><span>${S[key] ? '☑' : '☐'}</span> ${icon} ${label}</button>`;
      p.innerHTML = `<div class="sp-head"><b>Cài đặt văn phòng</b><button class="btn sm ghost" id="sp-close">Xong</button></div>
        <div class="row gap"><input id="sp-search" list="emp-list" placeholder="🔍 Tìm nhân viên..."><datalist id="emp-list">${Store.activeEmps().map(e => `<option value="${esc(e.name)}">`).join('')}</datalist><button class="btn sm" id="sp-add">+ Thêm bàn</button></div>
        <div class="opts">
          <button class="opt" id="sp-arrange">✦ Sắp xếp bàn</button>${tog('grid', 'Lưới chỉ thị', '▦')}${tog('connections', 'Kết nối', '⟟')}${tog('nameTags', 'Bảng tên', '▭')}
          <label class="opt">🌗 Theo giờ thực: <select data-set="dayNight"><option value="auto" ${S.dayNight === 'auto' ? 'selected' : ''}>tự động</option><option value="day" ${S.dayNight === 'day' ? 'selected' : ''}>ngày</option><option value="night" ${S.dayNight === 'night' ? 'selected' : ''}>đêm</option></select></label>
          ${tog('lights', 'Đèn', '💡')}
          <label class="opt">🎎 Theme: <select data-set="theme"><option value="tet" ${S.theme === 'tet' ? 'selected' : ''}>Tết</option><option value="none" ${S.theme === 'none' ? 'selected' : ''}>Thường</option><option value="noel" ${S.theme === 'noel' ? 'selected' : ''}>Noel</option></select></label>
          <button class="opt" id="sp-tour">🎬 Trình chiếu</button>
          <label class="opt">🗓 Lịch chiếu: <input type="time" data-set="slideshowAt" value="${S.slideshowAt}"></label>
          <label class="opt">⏱ Giây/slide: <input type="number" min="3" max="60" data-set="slideSeconds" value="${S.slideSeconds}" style="width:52px"></label>
          <button class="opt" id="sp-link">🔗 Link chiếu</button><button class="opt" id="sp-overview">📊 Tổng quan</button>
        </div>
        <div class="legend"><b>Đọc sơ đồ</b>
          <div><span class="ln orange"></span>Ra lệnh / giao phiếu việc<span class="muted">hiện</span></div><div><span class="ln green"></span>Báo cáo lên<span class="muted">hiện</span></div><div><span class="ln gray"></span>Kết nối dữ liệu (Data Hub)<span class="muted">hiện</span></div>
          <div><span class="ball red sm"></span>Nháy đỏ: từ ${Store.db.rules.redMinWarnings} cảnh báo · xử lý ngay</div><div><span class="ball yellow sm"></span>Nháy vàng: tổ kém nhất kỳ</div>
          <div>👑 Tổ trưởng / trưởng phòng · <span class="dotl g"></span>có mặt <span class="dotl y"></span>muộn <span class="dotl b"></span>từ xa <span class="dotl n"></span>nghỉ</div>
          <p class="muted">Bấm nhân vật để xem hồ sơ · kéo nền để di chuyển · cuộn / chụm để phóng to</p></div>`;
      p.querySelector('#sp-close').onclick = () => (p.hidden = true);
      p.querySelectorAll('[data-set]').forEach(el => {
        if (el.tagName === 'BUTTON') el.onclick = () => { S[el.dataset.set] = !S[el.dataset.set]; Store.commit('settings'); this.renderSettings(); };
        else el.onchange = () => { S[el.dataset.set] = el.type === 'number' ? Number(el.value) : el.value; Store.commit('settings'); };
      });
      p.querySelector('#sp-arrange').onclick = () => { Office.layoutDesks(true); Store.commit('layout'); this.toast('Đã sắp xếp lại bàn'); };
      p.querySelector('#sp-add').onclick = () => Manage.editEmployee(null);
      p.querySelector('#sp-tour').onclick = () => { p.hidden = true; Tour.start(); };
      p.querySelector('#sp-overview').onclick = () => { p.hidden = true; this.setView('reports'); };
      p.querySelector('#sp-link').onclick = () => { const u = location.origin + location.pathname + '?tour=1'; navigator.clipboard?.writeText(u); this.toast('Đã chép link trình chiếu: ' + u); };
      p.querySelector('#sp-search').onchange = ev => { const e = Store.activeEmps().find(x => x.name === ev.target.value); if (e) { Office.selected = e.id; Office.focusEmp(e); } };
    },

    startChatter() {
      setInterval(() => {
        if (Office.frozen || Tour.active) return;
        const emps = Store.activeEmps().filter(e => e.desk && ['present', 'late', 'remote'].includes(Metrics.todayStatus(e.id)));
        if (!emps.length) return; const e = emps[Math.floor(Math.random() * emps.length)];
        const txt = e.team === 'le-tan' ? 'Các anh dùng gì, em phục vụ ạ?' : CHATTER[Math.floor(Math.random() * CHATTER.length)];
        Office.say(e.id, txt);
      }, 3500);
    },
  };

  window.UI = UI; window.esc = esc;
})();
