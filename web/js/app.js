/* ==========================================================================
   app.js – khởi động ứng dụng
   ========================================================================== */
(async function () {
  const $ = s => document.querySelector(s);
  try {
    await Store.load();
  } catch (e) {
    document.body.innerHTML = `<div style="padding:40px;font-family:system-ui"><h2>Không tải được dữ liệu</h2><p>${e.message}. Hãy chạy <code>python3 server.py</code> rồi mở lại.</p></div>`;
    return;
  }
  document.title = Store.db.company.name;
  Office.init($('#office'));
  UI.init();
  Tour.bind();
  Store.onChange(reason => {
    Office.rebuild();
    UI.renderTopbar();
    if (UI.view === 'manage') Manage.render();
    if (UI.view === 'reports') Reports.render();
    if (!$('#settings-panel').hidden && reason === 'settings') { /* panel tự vẽ lại */ }
    Office._blinkCache = null;
  });
  if (!Store.online) UI.toast('Đang chạy ngoại tuyến: dữ liệu lưu trong trình duyệt. Chạy server.py để lưu tập trung.', 'warn');

  // Tự động trình chiếu đúng giờ đã đặt (ví dụ 16:30) nếu đang ở màn văn phòng
  let lastFired = '';
  setInterval(() => {
    const hm = D.nowHM();
    if (hm === Store.db.settings.slideshowAt && lastFired !== hm && !Tour.active && UI.view === 'office') { lastFired = hm; Tour.start(); }
  }, 15000);

  if (new URLSearchParams(location.search).get('debug')) setInterval(() => { document.body.dataset.cam = JSON.stringify({ cam: Office.cam, W: Office.W, H: Office.H, slide: Tour.i, n: Tour.slides.length, anim: !!Office.anim, hits: Office.hits.length, frozen: Office.frozen, png: Office.canvas.toDataURL().length, cw: Office.canvas.width, ch: Office.canvas.height, cls: document.body.className }); }, 300);
  // Tham số URL: ?tour=1 (trình chiếu lên TV) · ?slide=12 · ?view=manage&tab=attendance · ?emp=nv011 · ?night=1
  const q = new URLSearchParams(location.search);
  if (q.get('night')) Store.db.settings.dayNight = 'night';
  if (q.get('view')) { UI.setView(q.get('view')); if (q.get('tab')) Manage.render(q.get('tab')); if (q.get('period')) { Reports.period = q.get('period'); Reports.render(); } }
  if (q.get('emp')) setTimeout(() => UI.openEmployee(q.get('emp')), 300);
  if (q.get('zone')) setTimeout(() => UI.openZone(q.get('zone')), 300);
  if (q.get('settings')) setTimeout(() => UI.toggleSettings(), 300);
  if (q.get('tour') || q.get('slide')) setTimeout(() => Tour.start(Number(q.get('slide') || 0)), 600);
})();
