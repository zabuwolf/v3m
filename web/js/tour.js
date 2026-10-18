/* ==========================================================================
   tour.js – chế độ "Tham quan khu" / trình chiếu tự động (như video)
   ========================================================================== */
(function () {
  const $ = s => document.querySelector(s);

  const Tour = {
    active: false, slides: [], i: 0, timer: null, sub: null, sound: true, paused: false,

    build() {
      const Z = Store.db.zones; const S = [];
      S.push({ type: 'intro', title: 'Mở màn', ms: 5000 });
      Z.forEach((z, k) => S.push({ type: 'zone', zone: z, idx: k + 1, title: `Tham quan khu · ${z.name}` }));
      S.push({ type: 'reception', title: 'Khách mời', zone: Store.zone('le-tan'), ms: 14000 });
      S.push({ type: 'rules', title: 'Quy tắc nhấp nháy' });
      for (const p of ['today', 'yesterday', 'week', 'month']) {
        const r = D.range(p);
        S.push({ type: 'overview', period: p, title: `Tổng quan · ${r.label}` });
        if (Metrics.ranking(p).length >= 2) {
          S.push({ type: 'honor', period: p, title: `Vinh danh · ${r.label}` });
          S.push({ type: 'champion', period: p, title: `Quán quân · ${r.label}`, zone: Store.zone(Metrics.champion(p).team.dept) });
          S.push({ type: 'worst', period: p, title: `Kém nhất · ${r.label}`, zone: Store.zone(Metrics.worst(p).byKpi.team.dept) });
        }
      }
      for (const t of Metrics.redTeams()) S.push({ type: 'reminder', team: t, title: `Nhắc nhở · ${t.name}`, zone: Store.zone(t.dept) });
      for (const t of Metrics.reminderTeams()) S.push({ type: 'reminder', team: t, title: `Nhắc nhở · ${t.name}`, zone: Store.zone(t.dept) });
      Metrics.profiles(3).forEach((p, k) => S.push({ type: 'profile', emp: p.emp, rank: k + 1, title: `Hồ sơ nhân sự · ${Store.shortName(p.emp)}`, zone: Store.zone(p.emp.dept) }));
      this.slides = S;
    },

    start(at = 0) {
      UI.setView('office'); $('#settings-panel').hidden = true; UI.closeModal(); UI.hideHover();
      this.build(); this.active = true; this.paused = false; $('#tour-overlay').hidden = false; document.body.classList.add('touring');
      Office.viewportInset = { top: 60, bottom: Math.min(300, window.innerHeight * 0.42) };
      this.show(at);
      this.key = ev => { if (ev.key === 'ArrowRight' || ev.key === ' ') this.next(); else if (ev.key === 'ArrowLeft') this.prev(); else if (ev.key === 'Escape') this.stop(); };
      document.addEventListener('keydown', this.key);
    },
    stop() {
      this.active = false; clearTimeout(this.timer); clearInterval(this.sub); $('#tour-overlay').hidden = true; document.body.classList.remove('touring');
      Office.viewportInset = { top: 56, bottom: 0 }; Office.highlightTeam = null; Office.highlightZone = null; Office.fitAll();
      document.removeEventListener('keydown', this.key);
    },
    next() { this.show((this.i + 1) % this.slides.length); },
    prev() { this.show((this.i - 1 + this.slides.length) % this.slides.length); },
    togglePause() { this.paused = !this.paused; $('#tour-pause').textContent = this.paused ? '▶' : '⏸'; if (!this.paused) this.schedule(this.slides[this.i]); else clearTimeout(this.timer); },

    schedule(s) { clearTimeout(this.timer); if (this.paused) return; this.timer = setTimeout(() => this.next(), s.ms || Store.db.settings.slideSeconds * 1000); },

    show(i) {
      const n0 = this.slides.length; i = ((i % n0) + n0) % n0; this.i = i; const s = this.slides[i]; clearInterval(this.sub);
      const n = this.slides.length; const c = Store.db.company;
      $('#tour-title').textContent = s.title; $('#tour-sub').textContent = `${c.name} · ${i + 1}/${n} · ${D.nowHM()}`;
      $('#tour-progress').style.width = `${((i + 1) / n) * 100}%`;
      const card = $('#tour-card'); card.className = 'tour-card'; Office.highlightTeam = null; Office.highlightZone = null;
      const world = { x: 0, y: 0, w: Office.world.w, h: Office.world.h };
      switch (s.type) {
        case 'intro':
          card.innerHTML = `<div class="intro"><h1>${esc(c.name.toUpperCase())}</h1><p class="slogan">${esc(c.slogan).replace(/·/g, '<span>·</span>')}</p><p class="muted">${D.weekday(D.today())}, ${D.fmtFull(D.today())} · số ${esc(c.short)} HR ${D.nowHM()}</p></div>`;
          card.classList.add('center'); Office.fitAll(); break;
        case 'zone':
          card.innerHTML = UI.zoneCard(s.zone, s.idx, Store.db.zones.length); Office.highlightZone = s.zone.id; Office.focusZone(s.zone, 1100); break;
        case 'reception': {
          const msgs = UI.receptionMessages(); let k = 1; card.innerHTML = UI.receptionCard(k); Office.focusZone(s.zone, 1100);
          const rec = Store.empsOfTeam('le-tan')[0];
          this.sub = setInterval(() => { k++; if (k > msgs.length) { clearInterval(this.sub); return; } card.innerHTML = UI.receptionCard(k); const m = msgs[k - 1]; if (m.me && rec) Office.say(rec.id, m.text.slice(0, 40) + '…', 1600); }, 1500);
          break;
        }
        case 'rules': card.innerHTML = UI.rulesCard(); Office.fitAll(); break;
        case 'overview': card.innerHTML = UI.overviewCard(s.period); Office.fitAll(); break;
        case 'honor': { const rk = Metrics.ranking(s.period); card.innerHTML = UI.podium(rk, s.period); card.classList.add('podium-slide'); Office.fitAll(); Office.burstConfetti(180); if (this.sound) this.ding(); break; }
        case 'champion': { const ch = Metrics.champion(s.period); card.innerHTML = UI.championCard(s.period); Office.highlightTeam = ch.team.id; Office.focusZone(s.zone, 1100); Office.burstConfetti(60); break; }
        case 'worst': { const w = Metrics.worst(s.period); card.innerHTML = UI.worstCard(s.period); Office.highlightTeam = w.byKpi.team.id; Office.focusZone(s.zone, 1100); break; }
        case 'reminder': card.innerHTML = UI.reminderCard(s.team); Office.highlightTeam = s.team.id; Office.focusZone(s.zone, 1100); break;
        case 'profile': card.innerHTML = UI.profileCard(s.emp, s.rank); Office.selected = s.emp.id; Office.focusEmp(s.emp, 1100); break;
      }
      card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
      this.schedule(s);
    },

    ding() {
      try {
        const ac = this.ac || (this.ac = new (window.AudioContext || window.webkitAudioContext)());
        [523, 659, 784].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; o.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(0.0001, ac.currentTime + i * 0.12); g.gain.exponentialRampToValueAtTime(0.08, ac.currentTime + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + i * 0.12 + 0.5); o.start(ac.currentTime + i * 0.12); o.stop(ac.currentTime + i * 0.12 + 0.5); });
      } catch (_) { /* không có audio */ }
    },

    bind() {
      $('#tour-close').onclick = () => this.stop();
      $('#tour-next').onclick = () => this.next(); $('#tour-prev').onclick = () => this.prev(); $('#tour-pause').onclick = () => this.togglePause();
      $('#tour-sound').onclick = () => { this.sound = !this.sound; $('#tour-sound').textContent = this.sound ? '🔊' : '🔇'; };
      $('#tour-report').onclick = () => { this.stop(); UI.setView('reports'); };
      let sx = 0; const ov = $('#tour-overlay');
      ov.addEventListener('touchstart', e => (sx = e.touches[0].clientX), { passive: true });
      ov.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60) (dx < 0 ? this.next() : this.prev()); }, { passive: true });
    },
  };
  window.Tour = Tour;
})();
