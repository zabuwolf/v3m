/* ==========================================================================
   office.js – vẽ văn phòng 3D isometric trên canvas: sàn, khu vực, bàn làm
   việc, nhân viên, trợ lý AI, đường kết nối, ngày/đêm, nhấp nháy, confetti.
   ========================================================================== */
(function () {
  const TW = 64, TH = 32;               // kích thước ô isometric
  const DESK_H = 13;

  const Office = {
    canvas: null, ctx: null, W: 0, H: 0, dpr: 1,
    cam: { x: 0, y: 0, zoom: 1 },
    anim: null,
    hover: null, selected: null,
    hits: [],
    bubbles: {},
    confetti: [],
    t: 0,
    world: { w: 42, h: 30 },
    props: [],
    highlightTeam: null,
    highlightZone: null,
    viewportInset: { top: 56, bottom: 0 },
    frozen: false,

    // ------------------------------------------------------------ khởi tạo
    init(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.resize(); window.addEventListener('resize', () => this.resize());
      this.bindEvents();
      this.rebuild();
      this.fitAll(false);
      requestAnimationFrame(ts => this.loop(ts));
    },

    resize() {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = this.canvas.getBoundingClientRect();
      this.W = r.width; this.H = r.height;
      this.canvas.width = Math.round(r.width * this.dpr); this.canvas.height = Math.round(r.height * this.dpr);
    },

    /** Dựng lại bố cục từ dữ liệu (gọi khi dữ liệu đổi) */
    rebuild() {
      const db = Store.db;
      const maxX = Math.max(...db.zones.map(z => z.x + z.w)) + 2;
      const maxY = Math.max(...db.zones.map(z => z.y + z.h)) + 2;
      this.world = { w: maxX, h: maxY };
      this.layoutDesks();
      this.buildProps();
    },

    /** Tự xếp bàn: nhân viên chưa có bàn (hoặc bàn nằm ngoài khu) sẽ được cấp chỗ trống */
    layoutDesks(force) {
      const db = Store.db;
      this.agentPos = {};
      for (const z of db.zones) {
        const slots = [];
        const cols = Math.max(1, Math.floor((z.w - 2) / 2)), rows = Math.max(1, Math.floor((z.h - 2) / 2));
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push({ x: z.x + 1 + c * 2 + 1, y: z.y + 1 + r * 2 + 1 });
        const inZone = p => p && p.x >= z.x && p.x < z.x + z.w && p.y >= z.y && p.y < z.y + z.h;
        const used = new Set();
        const emps = Store.empsOfDept(z.id);
        if (!force) for (const e of emps) if (inZone(e.desk)) used.add(`${e.desk.x},${e.desk.y}`);
        const free = () => slots.find(s => !used.has(`${s.x},${s.y}`));
        for (const e of emps) {
          if (!force && inZone(e.desk)) continue;
          const s = free();
          if (!s) { e.desk = { x: z.x + 1, y: z.y + 1 }; continue; }
          e.desk = { x: s.x, y: s.y }; used.add(`${s.x},${s.y}`);
        }
        // trợ lý AI xếp từ cuối khu lên
        const agents = db.agents.filter(a => a.dept === z.id);
        for (const a of agents) {
          const s = [...slots].reverse().find(s => !used.has(`${s.x},${s.y}`));
          if (!s) continue;
          used.add(`${s.x},${s.y}`); this.agentPos[a.id] = { x: s.x, y: s.y };
        }
      }
    },

    buildProps() {
      const db = Store.db; const P = [];
      const rnd = (s => () => { s = (s * 9301 + 49297) % 233280; return s / 233280; })(7);
      for (const z of db.zones) {
        // cây cảnh ở 2 góc trước
        P.push({ type: 'plant', x: z.x + z.w - 0.6, y: z.y + 0.4, v: rnd() });
        P.push({ type: 'plant', x: z.x + 0.4, y: z.y + z.h - 0.6, v: rnd() });
        if (z.id === 'dieu-hanh') { P.push({ type: 'shelf', x: z.x + 0.5, y: z.y + 3.5 }); P.push({ type: 'sofa', x: z.x + z.w - 2.5, y: z.y + z.h - 1.5 }); }
        if (z.id === 'leader-hub') P.push({ type: 'board', x: z.x + 0.5, y: z.y + 3.5 });
        if (z.id === 'le-tan') {
          P.push({ type: 'counter', x: z.x + 2, y: z.y + 1.2 });
          P.push({ type: 'cafe', x: z.x + z.w - 7, y: z.y + 1.2 });
          P.push({ type: 'sofa', x: z.x + 12, y: z.y + 4.5 }); P.push({ type: 'sofa', x: z.x + 16, y: z.y + 4.5 });
          P.push({ type: 'table', x: z.x + 14.3, y: z.y + 5.2 });
          P.push({ type: 'sofa', x: z.x + 22, y: z.y + 4.5 }); P.push({ type: 'sofa', x: z.x + 26, y: z.y + 4.5 });
          P.push({ type: 'table', x: z.x + 24.3, y: z.y + 5.2 });
        }
        if (z.id === 'ky-thuat') P.push({ type: 'rack', x: z.x + z.w - 1.5, y: z.y + z.h - 1.5 });
      }
      this.props = P;
    },

    // ------------------------------------------------------------ toạ độ
    iso(x, y) { return { x: (x - y) * (TW / 2), y: (x + y) * (TH / 2) }; },
    unIso(ix, iy) { return { x: (ix / (TW / 2) + iy / (TH / 2)) / 2, y: (iy / (TH / 2) - ix / (TW / 2)) / 2 }; },
    screenToIso(mx, my) { const c = this.cam; return { x: (mx - this.W / 2 - c.x) / c.zoom, y: (my - this.H / 2 - c.y) / c.zoom }; },
    screenToWorld(mx, my) { const p = this.screenToIso(mx, my); return this.unIso(p.x, p.y); },

    // ------------------------------------------------------------ camera
    focusWorld(wx, wy, zoom, ms = 900) {
      const p = this.iso(wx, wy);
      const inset = this.viewportInset;
      const cy = (inset.top - inset.bottom) / 2;      // dịch tâm nhìn khỏi phần bị che
      this.animateTo({ x: -p.x * zoom, y: -p.y * zoom + cy, zoom }, ms);
    },
    focusZone(z, ms = 900, pad = 1.08) {
      const corners = [this.iso(z.x, z.y), this.iso(z.x + z.w, z.y), this.iso(z.x, z.y + z.h), this.iso(z.x + z.w, z.y + z.h)];
      const minX = Math.min(...corners.map(c => c.x)), maxX = Math.max(...corners.map(c => c.x));
      const minY = Math.min(...corners.map(c => c.y)) - 60, maxY = Math.max(...corners.map(c => c.y));
      const availW = this.W, availH = this.H - this.viewportInset.top - this.viewportInset.bottom;
      const zoom = Math.max(0.35, Math.min(2.2, Math.min(availW / ((maxX - minX) * pad), availH / ((maxY - minY) * pad))));
      this.focusWorld(z.x + z.w / 2, z.y + z.h / 2 - 1, zoom, ms);
    },
    focusEmp(e, ms = 800) { if (e && e.desk) this.focusWorld(e.desk.x, e.desk.y, Math.max(this.cam.zoom, 1.6), ms); },
    fitAll(animate = true) {
      const z = { x: 0, y: 0, w: this.world.w, h: this.world.h };
      this.focusZone(z, animate ? 900 : 0, 1.02);
    },
    zoomBy(f) { const z = Math.max(0.3, Math.min(3, this.cam.zoom * f)); this.setZoomAround(z, this.W / 2, this.H / 2); },
    setZoomAround(z, mx, my) {
      const c = this.cam; const before = this.screenToIso(mx, my);
      c.zoom = z; const after = this.screenToIso(mx, my);
      c.x += (after.x - before.x) * z; c.y += (after.y - before.y) * z; this.anim = null;
    },
    animateTo(target, ms) {
      if (!ms) { Object.assign(this.cam, target); this.anim = null; return; }
      this.anim = { from: { ...this.cam }, to: target, t0: performance.now(), ms };
    },

    // ------------------------------------------------------------ sự kiện
    bindEvents() {
      const cv = this.canvas; const ptrs = new Map(); let drag = null, pinch = null, moved = false;
      cv.addEventListener('pointerdown', ev => {
        cv.setPointerCapture(ev.pointerId); ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        moved = false;
        if (ptrs.size === 1) drag = { x: ev.clientX, y: ev.clientY, cx: this.cam.x, cy: this.cam.y };
        if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: this.cam.zoom }; drag = null; }
      });
      cv.addEventListener('pointermove', ev => {
        const r = cv.getBoundingClientRect(); const mx = ev.clientX - r.left, my = ev.clientY - r.top;
        if (ptrs.has(ev.pointerId)) ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (pinch && ptrs.size === 2) {
          const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
          this.setZoomAround(Math.max(0.3, Math.min(3, pinch.z * d / pinch.d)), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
          moved = true; return;
        }
        if (drag) {
          const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
          if (Math.hypot(dx, dy) > 4) moved = true;
          if (moved) { this.cam.x = drag.cx + dx; this.cam.y = drag.cy + dy; this.anim = null; }
          return;
        }
        this.updateHover(mx, my);
      });
      const up = ev => {
        ptrs.delete(ev.pointerId);
        if (ptrs.size < 2) pinch = null;
        if (ptrs.size === 0) {
          if (!moved && drag) { const r = cv.getBoundingClientRect(); this.click(ev.clientX - r.left, ev.clientY - r.top); }
          drag = null;
        }
      };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', ev => { ev.preventDefault(); const r = cv.getBoundingClientRect(); this.setZoomAround(Math.max(0.3, Math.min(3, this.cam.zoom * (ev.deltaY < 0 ? 1.1 : 0.9))), ev.clientX - r.left, ev.clientY - r.top); }, { passive: false });
      cv.addEventListener('pointerleave', () => { this.hover = null; UI.hideHover(); });
    },

    hitAt(mx, my) {
      const p = this.screenToIso(mx, my);
      for (let i = this.hits.length - 1; i >= 0; i--) {
        const h = this.hits[i];
        if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h;
      }
      return null;
    },
    updateHover(mx, my) {
      const h = this.hitAt(mx, my);
      const key = h ? h.kind + ':' + h.id : null;
      if (key !== (this.hover && this.hover.kind + ':' + this.hover.id)) {
        this.hover = h; this.canvas.style.cursor = h ? 'pointer' : 'grab';
        if (h) UI.showHover(h, mx, my); else UI.hideHover();
      } else if (h) UI.moveHover(mx, my);
    },
    click(mx, my) {
      const h = this.hitAt(mx, my);
      if (h && h.kind === 'emp') { this.selected = h.id; UI.openEmployee(h.id); }
      else if (h && h.kind === 'agent') { UI.openAgent(h.id); }
      else if (h && h.kind === 'zone') { UI.openZone(h.id); }
      else { this.selected = null; UI.hideHover(); }
    },

    say(empId, text, ms = 3500) { this.bubbles[empId] = { text, until: performance.now() + ms }; },
    burstConfetti(n = 160) {
      for (let i = 0; i < n; i++) this.confetti.push({
        x: Math.random() * this.W, y: -20 - Math.random() * this.H * 0.5, vx: (Math.random() - 0.5) * 1.6, vy: 1.5 + Math.random() * 2.5,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.2, w: 6 + Math.random() * 6, h: 4 + Math.random() * 4,
        c: ['#ff5a5f', '#ffb400', '#2fbf71', '#2f7bd1', '#b06ce6', '#ff8a3d', '#1bc3b0'][i % 7],
      });
    },

    isNight() {
      const m = Store.db.settings.dayNight;
      if (m === 'day') return false; if (m === 'night') return true;
      const h = new Date().getHours(); return h < 6 || h >= 18;
    },

    // ------------------------------------------------------------ vòng lặp
    loop(ts) {
      this.t = ts;
      if (this.anim) {
        const a = this.anim; const k = Math.max(0, Math.min(1, (performance.now() - a.t0) / a.ms)); const e = 1 - Math.pow(1 - k, 3);
        this.cam.x = a.from.x + (a.to.x - a.from.x) * e; this.cam.y = a.from.y + (a.to.y - a.from.y) * e; this.cam.zoom = a.from.zoom + (a.to.zoom - a.from.zoom) * e;
        if (k >= 1) this.anim = null;
      }
      if (!this.frozen) this.draw();
      requestAnimationFrame(t => this.loop(t));
    },

    // ------------------------------------------------------------ vẽ
    draw() {
      const ctx = this.ctx, c = this.cam, db = Store.db, S = db.settings;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.W, this.H);
      ctx.setTransform(this.dpr * c.zoom, 0, 0, this.dpr * c.zoom, this.dpr * (this.W / 2 + c.x), this.dpr * (this.H / 2 + c.y));
      this.hits = [];

      this.drawFloor(ctx);
      for (const z of db.zones) this.drawZoneFloor(ctx, z);
      if (S.grid) this.drawGrid(ctx);
      if (S.connections) this.drawConnections(ctx);

      // --- thực thể sắp xếp theo chiều sâu
      const ents = [];
      for (const z of db.zones) this.wallSegments(z, ents);
      for (const p of this.props) ents.push({ depth: p.x + p.y, draw: () => this.drawProp(ctx, p) });
      for (const e of Store.activeEmps()) {
        if (!e.desk) continue;
        ents.push({ depth: e.desk.x + e.desk.y + 0.6, draw: () => this.drawDesk(ctx, e.desk.x, e.desk.y, Store.team(e.team)) });
        ents.push({ depth: e.desk.x + e.desk.y - 0.2, draw: () => this.drawEmployee(ctx, e) });
      }
      for (const a of db.agents) {
        const p = this.agentPos[a.id]; if (!p) continue;
        ents.push({ depth: p.x + p.y, draw: () => this.drawAgent(ctx, a, p) });
      }
      for (const v of (db.visitors || [])) { /* khách mời ngồi sảnh */ }
      this.drawVisitors(ents, ctx);
      ents.sort((a, b) => a.depth - b.depth);
      for (const e of ents) e.draw();

      // --- lớp trên cùng: nhãn khu, bong bóng
      for (const z of db.zones) this.drawZoneLabel(ctx, z);
      this.drawBubbles(ctx);

      // --- đêm / đèn
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (this.isNight()) this.drawNight(ctx);
      this.drawConfetti(ctx);
    },

    drawFloor(ctx) {
      const { w, h } = this.world;
      const poly = [this.iso(0, 0), this.iso(w, 0), this.iso(w, h), this.iso(0, h)];
      // khối sàn dày
      ctx.fillStyle = '#c9ccd3';
      ctx.beginPath(); ctx.moveTo(poly[3].x, poly[3].y); ctx.lineTo(poly[3].x, poly[3].y + 18); ctx.lineTo(poly[2].x, poly[2].y + 18); ctx.lineTo(poly[1].x, poly[1].y + 18); ctx.lineTo(poly[1].x, poly[1].y); ctx.lineTo(poly[2].x, poly[2].y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b3b7c0'; ctx.beginPath(); ctx.moveTo(poly[2].x, poly[2].y); ctx.lineTo(poly[2].x, poly[2].y + 18); ctx.lineTo(poly[1].x, poly[1].y + 18); ctx.lineTo(poly[1].x, poly[1].y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f2f3f6';
      ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d7dae0'; ctx.lineWidth = 1; ctx.stroke();
    },

    zonePoly(z) { return [this.iso(z.x, z.y), this.iso(z.x + z.w, z.y), this.iso(z.x + z.w, z.y + z.h), this.iso(z.x, z.y + z.h)]; },

    drawZoneFloor(ctx, z) {
      const poly = this.zonePoly(z);
      const hl = this.highlightZone === z.id;
      ctx.fillStyle = z.color; ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.setLineDash([6, 5]); ctx.lineWidth = hl ? 2.5 : 1.3; ctx.strokeStyle = z.accent; ctx.globalAlpha = hl ? 1 : 0.65; ctx.stroke(); ctx.restore();
      // chữ trên sàn dọc mép trước-trái
      const p = this.iso(z.x + 0.6, z.y + z.h - 0.35);
      ctx.save(); ctx.transform(1, 0.5, -1, 0.5, p.x, p.y);
      ctx.font = `800 ${Math.max(10, Math.min(16, z.w * 1.4))}px system-ui, sans-serif`; ctx.fillStyle = z.accent; ctx.globalAlpha = 0.5;
      ctx.fillText(z.name.toUpperCase(), 0, 0); ctx.restore();
      // vùng bấm chọn khu (mặt sàn)
      const xs = poly.map(q => q.x), ys = poly.map(q => q.y);
    },

    drawZoneLabel(ctx, z) {
      const p = this.iso(z.x + z.w / 2, z.y); const text = `${z.icon} ${z.name}`;
      ctx.font = '700 11px system-ui, sans-serif'; const w = ctx.measureText(text).width + 18;
      const x = p.x - w / 2, y = p.y - 44;
      const blink = this.zoneBlink(z.id);
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = blink ? (blink === 'red' ? '#e5484d' : '#f5b700') : z.accent; ctx.lineWidth = blink ? 2 : 1;
      this.rr(ctx, x, y, w, 22, 11); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1b1f27'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 9, y + 11); ctx.textBaseline = 'alphabetic';
      if (blink) { const a = 0.5 + 0.5 * Math.sin(this.t / 200); ctx.globalAlpha = a; ctx.fillStyle = blink === 'red' ? '#e5484d' : '#f5b700'; ctx.beginPath(); ctx.arc(x + w - 2, y + 2, 5, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1; }
      this.hits.push({ kind: 'zone', id: z.id, x, y, w, h: 22 });
    },

    zoneBlink(zoneId) {
      let worst = null;
      for (const t of Store.teamsOf(zoneId)) { const b = this.teamBlink(t.id); if (b === 'red') return 'red'; if (b) worst = b; }
      return worst;
    },
    teamBlink(teamId) {
      if (!this._blinkCache || this.t - this._blinkCache.t > 2000) this._blinkCache = { t: this.t, map: {} };
      const m = this._blinkCache.map; if (!(teamId in m)) m[teamId] = Metrics.blink(teamId, 'today'); return m[teamId];
    },

    drawGrid(ctx) {
      const { w, h } = this.world; ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 0.6; ctx.beginPath();
      for (let x = 0; x <= w; x++) { const a = this.iso(x, 0), b = this.iso(x, h); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      for (let y = 0; y <= h; y++) { const a = this.iso(0, y), b = this.iso(w, y); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      ctx.stroke(); ctx.restore();
    },

    wallSegments(z, ents) {
      // vách kính thấp dọc 2 mép sau của khu
      const H = 26;
      for (let i = 0; i < z.w; i++) ents.push({ depth: z.x + i + z.y - 0.9, draw: () => this.wallQuad(ctx => ctx, this.iso(z.x + i, z.y), this.iso(z.x + i + 1, z.y), H, z.accent) });
      for (let i = 0; i < z.h; i++) ents.push({ depth: z.x + z.y + i - 0.9, draw: () => this.wallQuad(ctx => ctx, this.iso(z.x, z.y + i), this.iso(z.x, z.y + i + 1), H, z.accent) });
    },
    wallQuad(_, a, b, H, color) {
      const ctx = this.ctx; ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x, b.y - H); ctx.lineTo(a.x, a.y - H); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = color; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(a.x, a.y - H); ctx.lineTo(b.x, b.y - H); ctx.stroke(); ctx.restore();
      if (Store.db.settings.theme === 'tet') { // đèn lồng
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - H };
        if (Math.round(a.x / 32) % 3 === 0) { ctx.fillStyle = '#e5323a'; ctx.beginPath(); ctx.ellipse(m.x, m.y + 6, 4, 5, 0, 0, 6.28); ctx.fill(); ctx.fillStyle = '#f5c518'; ctx.fillRect(m.x - 1, m.y + 11, 2, 4); }
      }
      if (Store.db.settings.theme === 'noel') {
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - H };
        if (Math.round(a.x / 32) % 3 === 0) { ctx.fillStyle = Math.round(a.x / 32) % 2 ? '#2fbf71' : '#e5323a'; ctx.beginPath(); ctx.arc(m.x, m.y + 6, 3.5, 0, 6.28); ctx.fill(); }
      }
    },

    drawConnections(ctx) {
      const db = Store.db; ctx.save(); ctx.lineWidth = 1.2;
      const center = e => { const p = this.iso(e.desk.x + 0.5, e.desk.y + 0.5); return p; };
      const dataHub = this.agentPos['ai-data'];
      for (const z of db.zones) {
        const head = Store.deptHead(z.id); const teams = Store.teamsOf(z.id);
        for (const t of teams) {
          if (t.id === 'leaders' || t.id === 'bgd') continue;
          const members = Store.empsOfTeam(t.id).filter(e => e.desk);
          const lead = members.find(e => Store.isLeader(e)) || members[0];
          if (!lead) continue;
          if (head && head.desk) { ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,120,40,0.75)'; const a = center(head), b = center(lead); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          for (const m of members) { if (m === lead) continue; ctx.setLineDash([2, 4]); ctx.strokeStyle = 'rgba(30,160,90,0.6)'; const a = center(m), b = center(lead); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        if (head && head.desk && dataHub) { ctx.setLineDash([1, 5]); ctx.strokeStyle = 'rgba(90,90,110,0.45)'; const a = center(head), b = this.iso(dataHub.x + 0.5, dataHub.y + 0.5); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      ctx.restore();
    },

    // ------------------------------------------------------------ vật thể
    rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); },

    /** hộp isometric: gốc tại ô (x,y), kích thước w×d ô, cao h px */
    box(ctx, x, y, w, d, h, top, left, right, lift = 0) {
      const p00 = this.iso(x, y), p10 = this.iso(x + w, y), p11 = this.iso(x + w, y + d), p01 = this.iso(x, y + d);
      const up = q => ({ x: q.x, y: q.y - h - lift });
      const t00 = up(p00), t10 = up(p10), t11 = up(p11), t01 = up(p01);
      ctx.fillStyle = left; ctx.beginPath(); ctx.moveTo(p01.x, p01.y - lift); ctx.lineTo(p11.x, p11.y - lift); ctx.lineTo(t11.x, t11.y); ctx.lineTo(t01.x, t01.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = right; ctx.beginPath(); ctx.moveTo(p11.x, p11.y - lift); ctx.lineTo(p10.x, p10.y - lift); ctx.lineTo(t10.x, t10.y); ctx.lineTo(t11.x, t11.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(t00.x, t00.y); ctx.lineTo(t10.x, t10.y); ctx.lineTo(t11.x, t11.y); ctx.lineTo(t01.x, t01.y); ctx.closePath(); ctx.fill();
      return { t00, t10, t11, t01 };
    },

    drawDesk(ctx, x, y, team) {
      // chân bàn + mặt bàn
      this.box(ctx, x + 0.1, y + 0.1, 0.8, 0.8, DESK_H, '#f7f3ec', '#d9d2c6', '#e8e1d5');
      // màn hình trên bàn
      const m = this.iso(x + 0.5, y + 0.5); const col = team ? team.color : '#555';
      ctx.fillStyle = '#2b2f3a'; this.rr(ctx, m.x - 7, m.y - DESK_H - 14, 14, 10, 1.5); ctx.fill();
      ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(m.x - 6, m.y - DESK_H - 13, 12, 8); ctx.globalAlpha = 1;
      ctx.fillStyle = '#2b2f3a'; ctx.fillRect(m.x - 1, m.y - DESK_H - 4, 2, 3);
    },

    drawEmployee(ctx, e) {
      const foot = this.iso(e.desk.x + 0.5 - 0.55, e.desk.y + 0.5 - 0.55);
      const st = Metrics.todayStatus(e.id);
      const team = Store.team(e.team); const col = team ? team.color : '#777';
      const away = st === 'absent' || st === 'leave' || st === 'none';
      const blink = this.teamBlink(e.team);
      const sel = this.selected === e.id || (this.hover && this.hover.kind === 'emp' && this.hover.id === e.id);
      const hlTeam = this.highlightTeam && this.highlightTeam === e.team;
      ctx.save();
      if (away) ctx.globalAlpha = 0.38;
      // vòng nhấp nháy
      if (blink && !away) { const a = 0.35 + 0.35 * Math.sin(this.t / 180 + e.desk.x); ctx.strokeStyle = blink === 'red' ? `rgba(229,72,77,${a})` : `rgba(245,183,0,${a})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(foot.x, foot.y, 16, 8, 0, 0, 6.28); ctx.stroke(); }
      if (sel || hlTeam) { ctx.strokeStyle = sel ? '#2f7bd1' : col; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(foot.x, foot.y, 15, 7.5, 0, 0, 6.28); ctx.stroke(); }
      this.drawPerson(ctx, foot.x, foot.y, e.avatar || {}, col, e.gender, this.t / 1000 + e.desk.x);
      ctx.restore();
      // thẻ tên
      if (Store.db.settings.nameTags) {
        const name = Store.shortName(e); ctx.font = '600 9.5px system-ui, sans-serif';
        const w = ctx.measureText(name).width + 18, x = foot.x - w / 2, y = foot.y - 50;
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; this.rr(ctx, x, y, w, 15, 7.5); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.8; ctx.stroke();
        const dot = st === 'present' ? '#2fbf71' : st === 'late' ? '#f5b700' : st === 'remote' ? '#2f7bd1' : '#9aa0ab';
        ctx.fillStyle = dot; ctx.beginPath(); ctx.arc(x + 7, y + 7.5, 3, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#1b1f27'; ctx.textBaseline = 'middle'; ctx.fillText(name, x + 13, y + 7.5); ctx.textBaseline = 'alphabetic';
        if (Store.isLeader(e)) { ctx.font = '9px system-ui'; ctx.fillText('👑', x + w - 2, y + 2); }
      }
      this.hits.push({ kind: 'emp', id: e.id, x: foot.x - 12, y: foot.y - 36, w: 24, h: 40 });
    },

    /** vẽ người nhỏ (pixel-ish) tại điểm chân (px,py) */
    drawPerson(ctx, px, py, av, shirt, gender, ph) {
      const bob = Math.sin(ph * 2) * 0.6; const skin = av.skin || '#f3cfae'; const hair = av.hairColor || '#2b1d14';
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(px, py, 9, 4, 0, 0, 6.28); ctx.fill();
      // chân
      ctx.fillStyle = '#3a3f4b'; ctx.fillRect(px - 5, py - 9, 4, 9); ctx.fillRect(px + 1, py - 9, 4, 9);
      // thân
      ctx.fillStyle = shirt; this.rr(ctx, px - 7, py - 24 + bob, 14, 16, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(px - 1, py - 22 + bob, 2, 10);
      // tay
      ctx.fillStyle = skin; ctx.fillRect(px - 9, py - 20 + bob, 3, 9); ctx.fillRect(px + 6, py - 20 + bob, 3, 9);
      // đầu
      const hy = py - 32 + bob;
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(px, hy, 7.5, 0, 6.28); ctx.fill();
      // tóc
      ctx.fillStyle = hair;
      const style = av.hair ?? 0;
      if (gender === 'F' && (style === 1 || style === 3)) { ctx.beginPath(); ctx.arc(px, hy - 1, 8, Math.PI, 0); ctx.fill(); ctx.fillRect(px - 8, hy - 1, 3.5, 11); ctx.fillRect(px + 4.5, hy - 1, 3.5, 11); }
      else if (gender === 'F' && style === 2) { ctx.beginPath(); ctx.arc(px, hy - 1, 8, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(px + 5, hy - 7, 3.5, 0, 6.28); ctx.fill(); }
      else if (style === 3) { ctx.beginPath(); ctx.arc(px, hy - 2, 8, Math.PI, 0); ctx.fill(); ctx.fillRect(px - 7, hy - 8, 2, 3); ctx.fillRect(px - 2, hy - 11, 2, 4); ctx.fillRect(px + 3, hy - 9, 2, 3); }
      else { ctx.beginPath(); ctx.arc(px, hy - 1.5, 8, Math.PI, 0); ctx.fill(); if (style === 1) ctx.fillRect(px - 8, hy - 1.5, 2.5, 4); }
      // mắt
      ctx.fillStyle = '#2b2b2b'; ctx.fillRect(px - 3, hy, 1.6, 2); ctx.fillRect(px + 1.6, hy, 1.6, 2);
      if (av.glasses) { ctx.strokeStyle = '#333'; ctx.lineWidth = 0.8; ctx.strokeRect(px - 4.5, hy - 1, 3.8, 3.5); ctx.strokeRect(px + 0.7, hy - 1, 3.8, 3.5); }
      ctx.fillStyle = 'rgba(220,90,90,0.5)'; ctx.fillRect(px - 1.5, hy + 4, 3, 1);
    },

    drawAgent(ctx, a, p) {
      const base = this.iso(p.x + 0.5, p.y + 0.5);
      // bệ / rack
      this.box(ctx, p.x + 0.2, p.y + 0.2, 0.6, 0.6, 8, '#e9ebf0', '#c9ccd5', '#d9dce3');
      const px = base.x, py = base.y - 8; const bob = Math.sin(this.t / 600 + p.x) * 1.2;
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(px, py, 9, 4, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#f4f6fa'; this.rr(ctx, px - 8, py - 20 + bob, 16, 16, 4); ctx.fill(); ctx.strokeStyle = '#b8bec9'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = '#1b1f27'; this.rr(ctx, px - 9, py - 36 + bob, 18, 14, 4); ctx.fill();
      const glow = 0.6 + 0.4 * Math.sin(this.t / 300 + p.y);
      ctx.fillStyle = `rgba(80,220,255,${glow})`; ctx.fillRect(px - 5, py - 31 + bob, 3, 3); ctx.fillRect(px + 2, py - 31 + bob, 3, 3);
      ctx.fillStyle = `rgba(80,220,255,${glow * 0.8})`; ctx.fillRect(px - 3, py - 26 + bob, 6, 1.5);
      ctx.strokeStyle = '#1b1f27'; ctx.beginPath(); ctx.moveTo(px, py - 36 + bob); ctx.lineTo(px, py - 41 + bob); ctx.stroke();
      ctx.fillStyle = '#ff5a5f'; ctx.beginPath(); ctx.arc(px, py - 42 + bob, 2, 0, 6.28); ctx.fill();
      // nhãn
      if (Store.db.settings.nameTags) {
        const txt = a.name; ctx.font = '600 9.5px system-ui, sans-serif'; const w = ctx.measureText(txt).width + 22, x = px - w / 2, y = py - 58;
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; this.rr(ctx, x, y, w, 15, 7.5); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.stroke();
        ctx.fillStyle = '#5b4fcf'; ctx.beginPath(); ctx.arc(x + 8, y + 7.5, 4, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 7px system-ui'; ctx.textBaseline = 'middle'; ctx.fillText('AI', x + 4.5, y + 8);
        ctx.fillStyle = '#1b1f27'; ctx.font = '600 9.5px system-ui, sans-serif'; ctx.fillText(txt, x + 16, y + 7.5); ctx.textBaseline = 'alphabetic';
      }
      this.hits.push({ kind: 'agent', id: a.id, x: px - 10, y: py - 42, w: 20, h: 44 });
    },

    drawVisitors(ents, ctx) {
      const z = Store.zone('le-tan'); if (!z) return;
      const vs = (Store.db.visitors || []).filter(v => v.date === D.today());
      vs.forEach((v, i) => {
        const x = z.x + 12.5 + (i % 4) * 4 + (i > 3 ? 1 : 0), y = z.y + 3.6 + (i > 3 ? 2.5 : 0);
        ents.push({ depth: x + y, draw: () => {
          const f = this.iso(x, y);
          this.drawPerson(ctx, f.x, f.y, { skin: '#f1c9a3', hair: i % 4, hairColor: '#3b2a20' }, ['#6c757d', '#495057', '#8d99ae', '#5c677d'][i % 4], i % 2 ? 'F' : 'M', this.t / 1000 + i);
          if (Store.db.settings.nameTags) { ctx.font = '600 9px system-ui'; const w = ctx.measureText(v.name).width + 12; ctx.fillStyle = 'rgba(40,40,50,0.85)'; this.rr(ctx, f.x - w / 2, f.y - 50, w, 14, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(v.name, f.x - w / 2 + 6, f.y - 43); ctx.textBaseline = 'alphabetic'; }
        } });
      });
    },

    drawProp(ctx, p) {
      const q = this.iso(p.x, p.y);
      switch (p.type) {
        case 'plant': {
          ctx.fillStyle = '#b5651d'; this.rr(ctx, q.x - 6, q.y - 10, 12, 10, 2); ctx.fill();
          ctx.fillStyle = p.v > 0.5 ? '#3f9d5a' : '#52b06f'; ctx.beginPath(); ctx.arc(q.x, q.y - 19, 10, 0, 6.28); ctx.fill();
          ctx.fillStyle = '#2f7f46'; ctx.beginPath(); ctx.arc(q.x - 4, q.y - 23, 6, 0, 6.28); ctx.fill();
          if (Store.db.settings.theme === 'tet') { ctx.fillStyle = '#ff8fb1'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(q.x - 8 + i * 4, q.y - 26 + (i % 2) * 5, 1.8, 0, 6.28); ctx.fill(); } }
          break;
        }
        case 'shelf': { const r = this.box(ctx, p.x, p.y, 0.8, 2.5, 34, '#8b5a2b', '#6e4522', '#7d4f27'); ctx.fillStyle = '#e9c46a'; ctx.fillRect(r.t01.x + 2, r.t01.y + 4, 3, 10); ctx.fillStyle = '#e76f51'; ctx.fillRect(r.t01.x + 6, r.t01.y + 2, 3, 10); ctx.fillStyle = '#2a9d8f'; ctx.fillRect(r.t01.x + 10, r.t01.y, 3, 10); break; }
        case 'board': { this.box(ctx, p.x, p.y, 0.3, 3, 30, '#1f2430', '#141821', '#1b1f2a'); const a = this.iso(p.x + 0.3, p.y + 0.4); ctx.strokeStyle = '#3ad29f'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 8; i++) { const x = a.x - i * 10, y = a.y - 26 + i * 5 + Math.sin(i * 1.7 + this.t / 500) * 4; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); break; }
        case 'sofa': { this.box(ctx, p.x, p.y, 2, 1, 9, '#c77d4f', '#9a5a33', '#b36d42'); this.box(ctx, p.x, p.y, 2, 0.3, 17, '#d08a5a', '#9a5a33', '#b36d42'); break; }
        case 'table': { this.box(ctx, p.x, p.y, 0.8, 0.8, 10, '#f3e9dc', '#cdbca8', '#e0d1bd'); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x + 10, q.y - 4, 2.5, 0, 6.28); ctx.fill(); break; }
        case 'counter': { const r = this.box(ctx, p.x, p.y, 4, 1, 16, '#f1e5d2', '#b89a7a', '#d4b995'); ctx.font = '700 7px system-ui'; ctx.fillStyle = '#7a4b25'; ctx.save(); ctx.translate(r.t01.x + 12, r.t01.y + 10); ctx.transform(1, -0.5, 0, 1, 0, 0); ctx.fillText('LỄ TÂN', 0, 0); ctx.restore(); break; }
        case 'cafe': { const r = this.box(ctx, p.x, p.y, 4, 1, 16, '#5a3e2b', '#3e2a1c', '#4a3324'); this.box(ctx, p.x + 1.2, p.y + 0.2, 0.6, 0.5, 10, '#eee', '#bbb', '#ccc', 16); ctx.font = '700 7px system-ui'; ctx.fillStyle = '#f5d7a1'; ctx.save(); ctx.translate(r.t01.x + 12, r.t01.y + 10); ctx.transform(1, -0.5, 0, 1, 0, 0); ctx.fillText(`${Store.db.company.short} CAFÉ`, 0, 0); ctx.restore(); break; }
        case 'rack': { this.box(ctx, p.x, p.y, 0.8, 0.8, 36, '#1b1f27', '#0f1218', '#161a22'); for (let i = 0; i < 6; i++) { ctx.fillStyle = (i + Math.floor(this.t / 400)) % 3 ? '#2fbf71' : '#ffb400'; ctx.fillRect(q.x + 4, q.y - 30 + i * 4.5, 2, 2); } break; }
      }
    },

    drawBubbles(ctx) {
      const now = performance.now();
      for (const id of Object.keys(this.bubbles)) {
        const b = this.bubbles[id]; if (b.until < now) { delete this.bubbles[id]; continue; }
        const e = Store.emp(id); if (!e || !e.desk) continue;
        const f = this.iso(e.desk.x - 0.05, e.desk.y - 0.05);
        ctx.font = '500 9.5px system-ui'; const w = Math.min(170, ctx.measureText(b.text).width + 16); const x = f.x - w / 2, y = f.y - 76;
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#e5e7eb'; this.rr(ctx, x, y, w, 18, 9); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(f.x - 3, y + 18); ctx.lineTo(f.x + 3, y + 18); ctx.lineTo(f.x, y + 23); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1b1f27'; ctx.textBaseline = 'middle'; ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, 18); ctx.clip(); ctx.fillText(b.text, x + 8, y + 9); ctx.restore(); ctx.textBaseline = 'alphabetic';
      }
    },

    drawNight(ctx) {
      ctx.fillStyle = 'rgba(18,24,48,0.5)'; ctx.fillRect(0, 0, this.W, this.H);
      if (!Store.db.settings.lights) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const c = this.cam; const toS = p => ({ x: this.W / 2 + c.x + p.x * c.zoom, y: this.H / 2 + c.y + p.y * c.zoom });
      for (const e of Store.activeEmps()) {
        if (!e.desk) continue; const s = toS(this.iso(e.desk.x + 0.5, e.desk.y + 0.5)); const r = 48 * c.zoom;
        const g = ctx.createRadialGradient(s.x, s.y - 10 * c.zoom, 0, s.x, s.y - 10 * c.zoom, r); g.addColorStop(0, 'rgba(255,214,140,0.35)'); g.addColorStop(1, 'rgba(255,214,140,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y - 10 * c.zoom, r, 0, 6.28); ctx.fill();
      }
      ctx.restore();
    },

    drawConfetti(ctx) {
      if (!this.confetti.length) return;
      this.confetti = this.confetti.filter(p => p.y < this.H + 20);
      for (const p of this.confetti) {
        p.x += p.vx + Math.sin(p.y / 30) * 0.5; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
    },
  };

  window.Office = Office;
})();
