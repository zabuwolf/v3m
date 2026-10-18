import React, { useState, useRef, useEffect } from 'react';
import {
  Zap,
  Palmtree,
  Calendar,
  LifeBuoy,
  Clock,
  X,
  ChevronUp,
  Sparkles,
  ArrowRight,
  LogIn,
} from 'lucide-react';

interface QuickActionsMenuProps {
  onOpenLeaveRequest: () => void;
  onOpenSyncCalendar: () => void;
  onOpenRequestSupport: () => void;
  onOpenQuickCheckIn?: () => void;
  isDrawerOpen?: boolean;
}

export const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({
  onOpenLeaveRequest,
  onOpenSyncCalendar,
  onOpenRequestSupport,
  onOpenQuickCheckIn,
  isDrawerOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // If bottom drawer is open, push the button up slightly so it doesn't collide
  const bottomPositionClass = isDrawerOpen ? 'bottom-20 right-6' : 'bottom-6 right-6';

  const actions = [
    {
      id: 'leave',
      title: 'Xin Nghỉ Phép',
      subtitle: 'Leave Request · Nghỉ phép, WFH, việc riêng',
      icon: Palmtree,
      color: 'from-emerald-600 to-teal-600 text-emerald-400',
      badge: 'Đơn phép',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      onClick: () => {
        setIsOpen(false);
        onOpenLeaveRequest();
      },
    },
    {
      id: 'calendar',
      title: 'Đồng Bộ Lịch Biểu',
      subtitle: 'Sync Calendar · Xuất .ICS, Google & Outlook',
      icon: Calendar,
      color: 'from-sky-600 to-indigo-600 text-sky-400',
      badge: 'Tự động',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      onClick: () => {
        setIsOpen(false);
        onOpenSyncCalendar();
      },
    },
    {
      id: 'support',
      title: 'Yêu Cầu Hỗ Trợ',
      subtitle: 'Request Support · IT, HR, Hành chính & Lễ tân',
      icon: LifeBuoy,
      color: 'from-amber-600 to-orange-600 text-amber-400',
      badge: '15 phút',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      onClick: () => {
        setIsOpen(false);
        onOpenRequestSupport();
      },
    },
    {
      id: 'checkin',
      title: 'Chấm Công Nhanh',
      subtitle: 'Quick Attendance · Check-in / Check-out ca trực',
      icon: LogIn,
      color: 'from-violet-600 to-purple-600 text-violet-400',
      badge: 'Hôm nay',
      badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      onClick: () => {
        setIsOpen(false);
        onOpenQuickCheckIn?.();
      },
    },
  ];

  return (
    <div
      ref={menuRef}
      className={`fixed z-30 ${bottomPositionClass} transition-all duration-300 select-none`}
    >
      {/* Expanded Quick Actions Flyout */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-88 rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-[0_15px_40px_rgba(0,0,0,0.65)] p-4 text-slate-100 animate-slideUp space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Thao Tác Nhanh (Quick Actions)
                </h3>
                <p className="text-[10px] text-slate-400">Tiện ích 1-chạm cho nhân sự & điều hành</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action List */}
          <div className="space-y-1.5">
            {actions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className="w-full p-2.5 rounded-2xl bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between group text-left active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${action.color} flex items-center justify-center text-white shadow-md flex-shrink-0 group-hover:scale-105 transition`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white group-hover:text-amber-300 transition truncate">
                          {action.title}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full border font-mono ${action.badgeColor}`}
                        >
                          {action.badge}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {action.subtitle}
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition flex-shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Action Pill / Trigger Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs font-bold shadow-2xl border transition-all duration-300 transform active:scale-95 group ${
          isOpen
            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 text-white border-amber-300/40 shadow-amber-500/25 ring-2 ring-amber-400/30'
            : 'bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md text-slate-100 hover:text-white border-slate-700 shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-slate-600 hover:shadow-indigo-500/20'
        }`}
        title="Thao tác nhanh cho nhân sự (Leave Request, Sync Calendar, Request Support)"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-sm group-hover:rotate-12 transition">
          <Zap className="w-3.5 h-3.5 fill-current" />
        </div>
        <span className="tracking-wide">Thao Tác Nhanh</span>
        <ChevronUp
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
    </div>
  );
};
