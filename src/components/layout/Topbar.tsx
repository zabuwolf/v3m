import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ViewTab } from '../../types';
import { Building2, Users, BarChart3, MessageSquare, Bell, Check, Wifi } from 'lucide-react';

interface TopbarProps {
  currentView: ViewTab;
  onSelectView: (view: ViewTab) => void;
  onOpenReceptionChat: () => void;
  onOpenAlerts: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentView,
  onSelectView,
  onOpenReceptionChat,
  onOpenAlerts,
}) => {
  const { db, savedFlash, redTeams, reminderTeams } = useStore();

  const pendingLeaves = db.leaves.filter(l => l.status === 'pending').length;
  const alertCount = redTeams().length + reminderTeams().length + pendingLeaves;

  return (
    <header className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 z-40 select-none">
      {/* Brand logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center font-extrabold text-white text-sm shadow-md shadow-indigo-500/20">
            {db.company.short.slice(0, 3)}
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>{db.company.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 font-mono font-semibold border border-indigo-500/30">
                PRO 3D
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {db.company.slogan}
            </div>
          </div>
        </div>
      </div>

      {/* Center Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => onSelectView('office')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            currentView === 'office'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Văn phòng 3D</span>
        </button>

        <button
          onClick={() => onSelectView('manage')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            currentView === 'manage'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Quản lý nhân sự</span>
        </button>

        <button
          onClick={() => onSelectView('reports')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            currentView === 'reports'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Báo cáo</span>
        </button>
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Save indicator */}
        <div
          className={`flex items-center gap-1 text-[11px] font-medium transition-opacity duration-300 ${
            savedFlash ? 'opacity-100 text-emerald-400' : 'opacity-40 text-slate-400'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>{savedFlash ? 'Đã lưu' : 'Tự lưu'}</span>
        </div>

        {/* Online dot */}
        <div title="Máy chủ trực tuyến" className="flex items-center gap-1 text-[11px] text-slate-400 px-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Receptionist chat button */}
        <button
          onClick={onOpenReceptionChat}
          title="Lễ tân & Sảnh Café"
          className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 transition shadow-sm"
        >
          <MessageSquare className="w-4 h-4 text-amber-400" />
        </button>

        {/* Alert Bell */}
        <button
          onClick={onOpenAlerts}
          title="Cần xử lý & Đơn nghỉ chờ duyệt"
          className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 transition shadow-sm"
        >
          <Bell className="w-4 h-4 text-slate-300" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center animate-bounce">
              {alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
