import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ManageTab, ViewTab } from '../../types';
import { Search } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewTab, tab?: ManageTab) => void;
  onOpenEmployee: (id: string) => void;
}

interface Hit {
  key: string;
  kind: string;
  title: string;
  sub: string;
  run: () => void;
}

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function matches(text: string, query: string) {
  const hay = fold(text);
  const needle = fold(query).trim();
  if (!needle) return false;
  const words = hay.split(/[^a-z0-9]+/).filter(Boolean);
  if (words.some(word => word.startsWith(needle))) return true;
  return needle.length >= 4 && hay.includes(needle);
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  onNavigate,
  onOpenEmployee,
}) => {
  const { db, zone } = useStore();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setCursor(0);
    }
  }, [open]);

  const hits = useMemo(() => {
    const q = fold(query.trim());
    if (q.length < 1) return [];
    const list: Hit[] = [];
    const take = (text: string) => matches(text, q);

    db.employees.forEach(e => {
      if (take(`${e.name} ${e.code || ''} ${e.role} ${e.email || ''}`)) {
        list.push({
          key: `e-${e.id}`,
          kind: 'Nhân sự',
          title: e.name,
          sub: `${e.code || ''} · ${e.role}`,
          run: () => onOpenEmployee(e.id),
        });
      }
    });
    db.zones.filter(z => !z.isVirtual).forEach(z => {
      if (take(z.name)) {
        list.push({
          key: `z-${z.id}`,
          kind: 'Phòng ban',
          title: z.name,
          sub: 'Sơ đồ tổ chức',
          run: () => onNavigate('manage', 'org'),
        });
      }
    });
    db.teams.forEach(t => {
      if (take(t.name)) {
        list.push({
          key: `t-${t.id}`,
          kind: 'Tổ',
          title: t.name,
          sub: zone(t.dept)?.name || '',
          run: () => onNavigate('manage', 'teams'),
        });
      }
    });
    (db.meetings || []).forEach(m => {
      if (take(`${m.title} ${m.notes || ''}`)) {
        list.push({
          key: `m-${m.id}`,
          kind: 'Cuộc họp',
          title: m.title,
          sub: m.notes || m.time,
          run: () => onNavigate('manage', 'meetings'),
        });
      }
    });
    db.tasks.forEach(task => {
      if (take(task.title)) {
        list.push({
          key: `task-${task.id}`,
          kind: 'Công việc',
          title: task.title,
          sub: task.status,
          run: () => onNavigate('manage', 'tasks'),
        });
      }
    });
    db.candidates.forEach(c => {
      if (take(`${c.name} ${c.role}`)) {
        list.push({
          key: `c-${c.id}`,
          kind: 'Ứng viên',
          title: c.name,
          sub: c.role,
          run: () => onNavigate('manage', 'candidates'),
        });
      }
    });
    db.visitors.forEach((v, i) => {
      if (take(`${v.name} ${v.org || ''}`)) {
        list.push({
          key: `v-${i}-${v.name}`,
          kind: 'Khách',
          title: v.name,
          sub: v.org || v.date,
          run: () => onNavigate('manage', 'visitors'),
        });
      }
    });
    return list.slice(0, 12);
  }, [db, onNavigate, onOpenEmployee, query, zone]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor(i => Math.min(i + 1, Math.max(hits.length - 1, 0)));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && hits[cursor]) {
        e.preventDefault();
        hits[cursor].run();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hits, cursor, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4 bg-slate-950/70 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d1424] shadow-2xl overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 border-b border-white/8">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm nhân sự, họp, việc, phòng ban..."
            className="flex-1 bg-transparent py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:shadow-none border-0"
          />
          <span className="text-[10px] text-slate-500 border border-white/10 rounded px-1.5 py-0.5">Esc</span>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {hits.map((hit, i) => (
            <button
              key={hit.key}
              onClick={() => {
                hit.run();
                onClose();
              }}
              className={`w-full px-3 py-2.5 flex items-center gap-3 text-left ${i === cursor ? 'bg-white/8' : 'hover:bg-white/5'}`}
            >
              <span className="text-[10px] uppercase tracking-wide text-slate-500 w-16 shrink-0">{hit.kind}</span>
              <span className="min-w-0">
                <span className="block text-sm text-white truncate">{hit.title}</span>
                <span className="block text-[11px] text-slate-500 truncate">{hit.sub}</span>
              </span>
            </button>
          ))}
          {query.trim() && hits.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">Không thấy kết quả.</div>
          )}
          {!query.trim() && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">Gõ tên, mã nhân sự, tiêu đề họp hoặc việc.</div>
          )}
        </div>
      </div>
    </div>
  );
};
