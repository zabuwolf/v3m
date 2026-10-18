/* ==========================================================================
   reports.js – trang Báo cáo: tổng quan theo kỳ, vinh danh, kém nhất, biểu đồ
   ========================================================================== */
(function () {
  const $ = s => document.querySelector(s);
  const Reports = {
    period: 'today',
    render() {
      const root = $('#view-reports'); const p = this.period; const r = D.range(p); const rk = Metrics.ranking(p);
      const trend = []; for (let i = 13; i >= 0; i--) { const d = D.addDays(D.today(), -i); const s = Metrics.summarize(Store.db.attendance.filter(a => a.date === d), Store.activeEmps().length); trend.push({ d, s }); }
      const maxW = Math.max(1, ...trend.map(t => t.s.working));
      root.innerHTML = `<div class="content wide"><div class="row between wrap"><h2>Báo cáo</h2><div class="seg">${['today', 'yesterday', 'week', 'month'].map(k => `<button class="${k === p ? 'active' : ''}" data-p="${k}">${D.range(k).label}</button>`).join('')}<button class="ghost" onclick="Tour.start()">🎬 Trình chiếu</button></div></div>
        <div class="cols">${UI.overviewCard(p)}${rk.length >= 2 ? UI.championCard(p) : ''}</div>
        <div class="cols">${rk.length >= 2 ? `<div class="card podium-host">${UI.podium(rk, p)}</div>` : ''}${rk.length >= 2 ? UI.worstCard(p) : ''}</div>
        <div class="panel"><h3>Có mặt 14 ngày gần nhất</h3><div class="bars">${trend.map(t => `<div class="bar" title="${D.fmtFull(t.d)}: ${t.s.working} có mặt, ${t.s.late} muộn"><div class="b" style="height:${(t.s.working / maxW) * 100}%"><div class="l" style="height:${t.s.working ? (t.s.late / t.s.working) * 100 : 0}%"></div></div><small>${D.fmt(t.d).slice(0, 2)}</small></div>`).join('')}</div><p class="muted small">Cột = số người có mặt · phần vàng = đi muộn</p></div>
        <div class="panel"><h3>Bảng xếp hạng tổ · ${r.label}</h3><table class="tbl"><thead><tr><th>#</th><th>Tổ</th><th>Phòng</th><th>Nhân sự</th><th>Có mặt</th><th>Muộn</th><th>Việc xong</th><th>Việc/người</th><th>KPI</th><th>Nhấp nháy</th></tr></thead><tbody>${rk.map((x, i) => { const b = Metrics.blink(x.team.id, p); return `<tr><td>${i + 1}</td><td><span class="sw" style="background:${x.team.color}"></span><b>${esc(x.team.name)}</b></td><td>${esc(Store.zone(x.team.dept)?.name || '')}</td><td>${x.stats.headcount}</td><td>${x.stats.working}</td><td>${x.stats.late}</td><td>${x.stats.tasksDone}/${x.stats.tasksAssigned}</td><td>${x.stats.perHead}</td><td><b>${x.stats.kpi}</b></td><td>${b ? `<span class="ball ${b} sm"></span> ${b === 'red' ? 'đỏ' : 'vàng'}` : '–'}</td></tr>`; }).join('')}</tbody></table></div>
        <div class="panel"><h3>Top nhân sự 90 ngày</h3><div class="grid3">${Metrics.profiles(6).map((x, i) => UI.profileCard(x.emp, i + 1)).join('')}</div></div>
        <div class="panel"><h3>Cảnh báo</h3>${UI.rulesCard()}<div class="grid3">${[...Metrics.redTeams(), ...Metrics.reminderTeams()].map(t => UI.reminderCard(t)).join('') || '<p class="ok">✓ Không có tổ nào bị cảnh báo</p>'}</div></div></div>`;
      root.querySelectorAll('[data-p]').forEach(b => (b.onclick = () => { this.period = b.dataset.p; this.render(); }));
    },
  };
  window.Reports = Reports;
})();
