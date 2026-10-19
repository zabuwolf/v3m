import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Avatar } from '../../types';
import { drawPerson } from '../office/drawPerson';

const HAIR_COLORS = ['#111827', '#4a3728', '#92400e', '#d6a35c', '#9f1239', '#1e3a8a'];
const SKIN_TONES = ['#fde2cc', '#e0b08a', '#c68642', '#8d5524'];

const STYLES: Record<'M' | 'F', string[]> = {
  F: ['Bob', 'Tóc dài', 'Búi cao', 'Tóc lửng'],
  M: ['Side part', 'Quiff', 'Mái rèm', 'Crop'],
};

function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function paintAvatar(
  canvas: HTMLCanvasElement,
  avatar: Avatar,
  gender: 'M' | 'F',
  w: number,
  h: number,
  scale: number,
  phase: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = 2;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#eef2ff');
  bg.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h - 18);
  ctx.scale(scale, scale);
  drawPerson(ctx, 0, 0, avatar, '#4f46e5', gender, phase, false, 'digital', '', 'present', true);
  ctx.restore();
}

function AvatarPreview({ avatar, gender }: { avatar: Avatar; gender: 'M' | 'F' }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      paintAvatar(canvas, avatar, gender, 168, 196, 2.35, (now - start) / 700);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [avatar, gender]);

  return <canvas ref={ref} className="w-[168px] h-[196px] rounded-2xl shadow-inner" />;
}

function StyleCard({
  label,
  selected,
  avatar,
  gender,
  onClick,
}: {
  label: string;
  selected: boolean;
  avatar: Avatar;
  gender: 'M' | 'F';
  onClick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    paintAvatar(canvas, avatar, gender, 76, 88, 1.15, 1.2);
  }, [avatar, gender]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border overflow-hidden text-left ${
        selected
          ? 'border-indigo-400 ring-2 ring-indigo-400/70'
          : 'border-slate-700 hover:border-slate-500'
      }`}
    >
      <canvas ref={ref} className="w-full h-[88px] block" />
      <span className={`block px-2 py-1 text-[11px] font-medium ${selected ? 'text-white bg-indigo-600' : 'text-slate-300 bg-slate-950'}`}>
        {label}
      </span>
    </button>
  );
}

export const FirstLogin: React.FC = () => {
  const { db, emp, zone, activeEmps, sessionEmpId, login, logout, saveEmployee } = useStore();
  const me = sessionEmpId ? emp(sessionEmpId) : undefined;
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Avatar | null>(null);

  useEffect(() => {
    if (sessionEmpId && !me) logout();
  }, [sessionEmpId, me, logout]);

  useEffect(() => {
    if (!me || me.avatar?.chosen) {
      setDraft(null);
      return;
    }
    setDraft({
      skin: me.avatar?.skin || (me.gender === 'F' ? '#fde2cc' : '#f8d5b8'),
      hair: me.avatar?.hair ?? 0,
      hairColor: me.avatar?.hairColor || '#23160e',
      glasses: !!me.avatar?.glasses,
    });
  }, [me]);

  const matches = useMemo(() => {
    const q = fold(query.trim());
    if (q.length < 1) return [];
    return activeEmps()
      .filter(e => {
        const hay = [e.name, e.code, e.alias, e.email, e.vicEmail, e.role].filter(Boolean).join(' ');
        return fold(hay).includes(q);
      })
      .slice(0, 8);
  }, [query, activeEmps]);

  if (new URLSearchParams(window.location.search).get('tour') === '1') return null;
  if (me?.avatar?.chosen) return null;
  if (!me && !sessionEmpId) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl text-slate-100">
          <div className="text-[11px] font-bold tracking-wide text-indigo-400 uppercase">VIC E-commerce</div>
          <h2 className="mt-1 text-xl font-bold text-white">Đăng nhập</h2>
          <p className="mt-1 text-xs text-slate-400">Chọn hồ sơ của bạn để vào văn phòng.</p>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tên, mã nhân viên hoặc email"
            className="mt-4 w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
          <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
            {query.trim() && matches.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-slate-500">Không thấy nhân sự khớp.</div>
            )}
            {!query.trim() && (
              <div className="px-3 py-6 text-center text-xs text-slate-500">Gõ tên để tìm hồ sơ của bạn.</div>
            )}
            {matches.map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => login(e.id)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/60 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold text-white">{e.name}</span>
                  <span className="block text-[11px] text-slate-400">
                    {e.role} · {zone(e.dept)?.name || e.dept}
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 shrink-0">{e.code || e.alias}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 text-[11px] text-slate-500">{db.company.name}</div>
        </div>
      </div>
    );
  }

  if (!me || !draft) return null;

  const styles = STYLES[me.gender] || STYLES.M;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="text-[11px] font-bold tracking-wide text-indigo-400 uppercase">Lần đăng nhập đầu</div>
        <h2 className="mt-1 text-xl font-bold text-white">Chọn avatar</h2>
        <p className="mt-1 text-xs text-slate-400">
          {me.name}, chọn diện mạo của bạn trên sàn văn phòng. Lần sau sẽ không hỏi lại.
        </p>

        <div className="mt-4 space-y-3 text-xs">
          <div className="flex justify-center">
            <AvatarPreview avatar={draft} gender={me.gender} />
          </div>
          <div className="space-y-3 min-w-0">
            <div>
              <div className="text-slate-400 font-medium mb-1.5">Kiểu tóc</div>
              <div className="grid grid-cols-4 gap-1.5">
                {styles.map((label, hair) => (
                  <StyleCard
                    key={label}
                    label={label}
                    selected={draft.hair === hair}
                    gender={me.gender}
                    avatar={{ ...draft, hair }}
                    onClick={() => setDraft({ ...draft, hair })}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-medium mb-1.5">Màu tóc</div>
              <div className="flex gap-1.5">
                {HAIR_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => setDraft({ ...draft, hairColor: color })}
                    className={`w-7 h-7 rounded-full border-2 ${
                      draft.hairColor === color ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-medium mb-1.5">Màu da</div>
              <div className="flex gap-1.5">
                {SKIN_TONES.map(color => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => setDraft({ ...draft, skin: color })}
                    className={`w-7 h-7 rounded-full border-2 ${
                      draft.skin === color ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={!!draft.glasses}
                onChange={e => setDraft({ ...draft, glasses: e.target.checked })}
              />
              Đeo kính
            </label>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(null);
              logout();
            }}
            className="px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Đổi người
          </button>
          <button
            type="button"
            onClick={() =>
              saveEmployee({
                ...me,
                avatar: { ...me.avatar, ...draft, chosen: true },
              })
            }
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
          >
            Dùng avatar này
          </button>
        </div>
      </div>
    </div>
  );
};
