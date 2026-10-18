export const N = {
  pct: (a: number, b: number): number => (b ? Math.round((a / b) * 1000) / 10 : 0),
  
  avg: (arr: number[]): number => (arr.length ? Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10 : 0),
  
  fmt: (n: number | null | undefined): string => (n == null ? '–' : Number(n).toLocaleString('vi-VN')),
  
  pctS: (n: number | null | undefined): string =>
    n == null ? '–' : `${Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`,
    
  money: (n: number | null | undefined): string =>
    n == null ? '–' : `${(n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`,
};

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
