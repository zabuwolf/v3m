import { esc } from './format';

const PRINT_CSS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #0f172a; font-family: "Segoe UI", "Plus Jakarta Sans", sans-serif; font-size: 12px; line-height: 1.45; }
  h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: -0.03em; }
  h2 { font-size: 14px; margin: 18px 0 8px; }
  p { margin: 0; color: #475569; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: #64748b; }
  .muted { color: #64748b; font-size: 11px; }
  .kpi { display: flex; gap: 8px; margin-top: 12px; }
  .kpi div { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; }
  .kpi b { display: block; font-size: 16px; margin-top: 2px; }
  .slip { break-inside: avoid; page-break-after: always; }
  .slip:last-child { page-break-after: auto; }
  .row { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; border-bottom: 1px solid #e2e8f0; }
  .total { font-size: 16px; font-weight: 700; }
`;

export function printHtml(title: string, body: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.left = '-10000px';
  frame.style.top = '0';
  frame.style.width = '900px';
  frame.style.height = '1200px';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return false;
  }

  doc.open();
  doc.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`);
  doc.close();

  const cleanup = () => frame.remove();
  win.onafterprint = cleanup;
  window.setTimeout(() => {
    win.focus();
    win.print();
  }, 180);
  window.setTimeout(cleanup, 60_000);
  return true;
}
