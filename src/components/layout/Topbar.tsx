import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ViewTab } from '../../types';
import { Building2, Users, BarChart3, MessageSquare, Bell, Check, Search } from 'lucide-react';

interface TopbarProps {
  currentView: ViewTab;
  onSelectView: (view: ViewTab) => void;
  onOpenReceptionChat: () => void;
  onOpenAlerts: () => void;
  onOpenSearch: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentView,
  onSelectView,
  onOpenReceptionChat,
  onOpenAlerts,
  onOpenSearch,
}) => {
  const { db, savedFlash, redTeams, reminderTeams, sessionEmpId, emp, shortName, logout } = useStore();
  const me = sessionEmpId ? emp(sessionEmpId) : undefined;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const pendingLeaves = db.leaves.filter(l => l.status === 'pending').length;
  const openTickets = (db.supportTickets || []).filter(t => t.status !== 'resolved').length;
  const alertCount = redTeams().length + reminderTeams().length + pendingLeaves + openTickets;

  const clock = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateLabel = now.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });

  const tabs: { id: ViewTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'office', label: 'Văn phòng', icon: Building2 },
    { id: 'manage', label: 'Nhân sự', icon: Users },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
  ];

  return (
    <header className="h-14 shrink-0 relative z-40 flex items-center justify-between px-4 border-b border-white/8 bg-[#0b1220]/80 backdrop-blur-xl select-none">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white text-[11px] tracking-tight shadow-[0_8px_20px_-8px_rgba(99,102,241,0.9)] ring-1 ring-white/20">
          {db.company.short.slice(0, 3)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[13px] tracking-tight text-white truncate">
              {db.company.name}
            </span>
            <span className="hidden sm:inline text-[10px] px-1.5 py-px rounded-md bg-white/5 text-slate-300 font-medium border border-white/10">
              Office
            </span>
          </div>
          <div className="text-[10px] text-slate-500 truncate">{db.company.slogan}</div>
        </div>
      </div>

      <nav className="flex items-center gap-0.5 p-1 rounded-xl bg-black/25 border border-white/8">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectView(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                active
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-1.5">
        <div className="hidden md:flex flex-col items-end mr-2 leading-none">
          <span className="text-[13px] font-semibold text-white tabular-nums">{clock}</span>
          <span className="text-[10px] text-slate-500 capitalize mt-0.5">{dateLabel}</span>
        </div>

        <div
          className={`hidden lg:flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border transition-opacity ${
            savedFlash
              ? 'opacity-100 text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
              : 'opacity-70 text-slate-500 border-transparent'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>{savedFlash ? 'Đã lưu' : 'Tự lưu'}</span>
        </div>

        {me?.avatar?.chosen && (
          <button
            onClick={logout}
            title="Đăng xuất"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-200 bg-white/5 border border-white/10 text-[11px] max-w-[140px]"
          >
            <span className="truncate">{shortName(me)}</span>
            <span className="text-slate-500">Thoát</span>
          </button>
        )}

        <button
          onClick={onOpenSearch}
          title="Tìm nhanh"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 border border-white/10 text-[11px]"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Tìm</span>
          <span className="text-[10px] text-slate-500">Ctrl K</span>
        </button>

        <span title="Dữ liệu cục bộ đang hoạt động" className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

        <button
          onClick={onOpenReceptionChat}
          title="Lễ tân"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/10 transition"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenAlerts}
          title="Cần xử lý"
          className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/10 transition"
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-[#0b1220]">
              {alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
