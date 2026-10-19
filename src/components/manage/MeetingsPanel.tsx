import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { MeetingItem } from '../../types';
import { D } from '../../utils/date';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TYPE_LABEL: Record<NonNullable<MeetingItem['type']>, string> = {
  internal: 'Nội bộ',
  client: 'Khách hàng',
  sprint: 'Sprint',
  standup: 'Giao ban',
  allhands: 'Toàn thể',
  review: 'Review',
};

function weekStartOf(iso: string) {
  const dt = new Date(iso + 'T00:00:00');
  const dow = (dt.getDay() + 6) % 7;
  return D.addDays(iso, -dow);
}

export const MeetingsPanel: React.FC<{ onSelectEmployee: (id: string) => void }> = ({ onSelectEmployee }) => {
  const { db, emp, zone, updateMeeting } = useStore();
  const [anchor, setAnchor] = useState(D.today());
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const start = weekStartOf(anchor);
  const days = Array.from({ length: 7 }, (_, i) => D.addDays(start, i));
  const q = query.trim().toLowerCase();

  const meetings = useMemo(() => {
    return (db.meetings || [])
      .filter(m => m.date >= start && m.date <= days[6])
      .filter(m => !q || m.title.toLowerCase().includes(q) || (m.notes || '').toLowerCase().includes(q))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [db.meetings, start, days, q]);

  const selected = (db.meetings || []).find(m => m.id === selectedId) || null;

  const openMeeting = (m: MeetingItem) => {
    setSelectedId(m.id);
    setTitle(m.title);
    setNotes(m.notes || '');
  };

  const save = () => {
    if (!selected || !title.trim()) return;
    updateMeeting(selected.id, { title: title.trim(), notes: notes.trim() });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fadeIn">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="v3m-kicker">Lịch</div>
          <h2 className="text-xl font-semibold text-white mt-1">Lịch họp</h2>
          <p className="text-xs text-slate-400 mt-1">
            Cùng dữ liệu với phòng họp trên bản đồ 3D. Sửa tiêu đề và tóm tắt tại đây.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAnchor(D.addDays(start, -7))}
            className="p-2 rounded-lg text-slate-300 hover:bg-white/8"
            title="Tuần trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAnchor(D.today())}
            className="px-3 py-1.5 rounded-lg bg-white text-slate-950 text-xs font-semibold"
          >
            Tuần này
          </button>
          <button
            onClick={() => setAnchor(D.addDays(start, 7))}
            className="p-2 rounded-lg text-slate-300 hover:bg-white/8"
            title="Tuần sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm tiêu đề hoặc tóm tắt"
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 w-52"
          />
        </div>
      </div>

      <div className="text-[11px] text-slate-500">
        {D.fmtFull(start)} – {D.fmtFull(days[6])} · {meetings.length} cuộc họp
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {days.map(day => {
            const items = meetings.filter(m => m.date === day);
            const isToday = day === D.today();
            return (
              <section key={day} className={`rounded-2xl border p-3 ${isToday ? 'border-indigo-400/40 bg-indigo-500/5' : 'border-slate-800 bg-slate-900/70'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-white">{D.weekday(day)}</div>
                  <div className="text-[10px] text-slate-500">{D.fmtFull(day)}</div>
                </div>
                <div className="space-y-1.5">
                  {items.map(m => (
                    <button
                      key={m.id}
                      onClick={() => openMeeting(m)}
                      className={`w-full text-left rounded-xl px-2.5 py-2 border transition ${
                        selectedId === m.id ? 'border-white/30 bg-white/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-[10px] text-slate-500">{m.time}{m.room ? ` · ${m.room}` : ''}</div>
                      <div className="text-[12px] font-semibold text-white leading-snug mt-0.5">{m.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">{m.notes || 'Chưa có tóm tắt'}</div>
                    </button>
                  ))}
                  {items.length === 0 && <div className="text-[11px] text-slate-600 py-2">Không có họp</div>}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="xl:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 h-fit xl:sticky xl:top-0">
          {selected ? (
            <>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10">
                  {selected.type ? TYPE_LABEL[selected.type] : 'Họp'}
                </span>
                <span>{D.weekday(selected.date)}, {D.fmtFull(selected.date)}</span>
                <span>{selected.time}</span>
              </div>
              <label className="block text-[11px] text-slate-400">Tiêu đề cuộc họp</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              />
              <label className="block text-[11px] text-slate-400">Tóm tắt cuộc họp</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={5}
                placeholder="Nội dung đã thống nhất, việc cần làm, người phụ trách..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500"
              />
              <div className="text-[11px] text-slate-500">
                {selected.room || 'Chưa gán phòng'}
                {selected.dept ? ` · ${zone(selected.dept)?.name || ''}` : ''}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selected.attendees.slice(0, 8).map(id => {
                  const person = emp(id);
                  if (!person) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => onSelectEmployee(id)}
                      className="px-2 py-1 rounded-lg bg-white/5 text-[11px] text-slate-200 hover:bg-white/10"
                    >
                      {person.name}
                    </button>
                  );
                })}
                {selected.attendees.length > 8 && (
                  <span className="px-2 py-1 text-[11px] text-slate-500">+{selected.attendees.length - 8}</span>
                )}
              </div>
              <button
                onClick={save}
                disabled={!title.trim() || (title.trim() === selected.title && notes.trim() === (selected.notes || ''))}
                className="px-3 py-2 rounded-xl bg-white text-slate-950 text-xs font-semibold disabled:opacity-40"
              >
                Lưu tiêu đề và tóm tắt
              </button>
            </>
          ) : (
            <div className="py-10 text-center text-sm text-slate-500">Chọn một cuộc họp để xem và sửa tóm tắt.</div>
          )}
        </aside>
      </div>
    </div>
  );
};
