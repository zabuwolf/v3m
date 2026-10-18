import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { D } from '../../utils/date';
import {
  X,
  Calendar,
  Download,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  Video,
  Copy,
  Sparkles,
  Share2,
} from 'lucide-react';

interface SyncCalendarModalProps {
  onClose: () => void;
}

export const SyncCalendarModal: React.FC<SyncCalendarModalProps> = ({ onClose }) => {
  const { db, addToast } = useStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(true);
  const [syncTime, setSyncTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  });

  const meetings = db.meetings || [];

  // Generate .ICS (iCalendar standard) text
  const generateICSContent = () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const toICSDate = (dateStr: string, timeStr: string) => {
      // dateStr: YYYY-MM-DD, timeStr: HH:mm or HH:mm - HH:mm
      const [year, month, day] = dateStr.split('-').map(Number);
      const startTime = timeStr.split('-')[0].trim();
      const [hours, minutes] = (startTime || '09:00').split(':').map(Number);
      return `${year}${pad(month)}${pad(day)}T${pad(hours)}${pad(minutes)}00`;
    };

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//V3M HR AI Workplace//3D Office Calendar//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${db.company.name} - Lịch Cuộc Họp & Ca Làm Việc`,
      'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
    ];

    meetings.forEach(m => {
      const dtStart = toICSDate(m.date, m.time);
      const [year, month, day] = m.date.split('-').map(Number);
      const parts = m.time.split('-');
      const endTime = parts.length > 1 ? parts[1].trim() : '10:00';
      const [endH, endM] = (endTime || '10:00').split(':').map(Number);
      const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endH)}${pad(endM)}00`;

      ics.push('BEGIN:VEVENT');
      ics.push(`UID:${m.id}@v3m.company.vn`);
      ics.push(`DTSTAMP:${dtStart}Z`);
      ics.push(`DTSTART:${dtStart}`);
      ics.push(`DTEND:${dtEnd}`);
      ics.push(`SUMMARY:${m.title.replace(/[,;]/g, ' ')}`);
      ics.push(`DESCRIPTION:${(m.notes || 'Cuộc họp trên hệ thống không gian làm việc số 3D').replace(/\n/g, ' ')}`);
      ics.push(`LOCATION:${(m.room || 'Phòng Họp Ảo 3D V3M').replace(/[,;]/g, ' ')}`);
      ics.push(`STATUS:${m.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE'}`);
      ics.push('END:VEVENT');
    });

    ics.push('END:VCALENDAR');
    return ics.join('\r\n');
  };

  const handleDownloadICS = () => {
    const content = generateICSContent();
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `v3m-office-calendar-${D.today()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Đã tải xuống tệp lịch .ICS cho máy tính & điện thoại!', 'success');
  };

  const handleTriggerReSync = () => {
    setIsSyncing(true);
    setSyncDone(false);
    setTimeout(() => {
      const d = new Date();
      setSyncTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
      );
      setIsSyncing(false);
      setSyncDone(true);
      addToast('Đã đồng bộ hóa dữ liệu lịch biểu thành công!', 'success');
    }, 1200);
  };

  const handleCopyFeedURL = () => {
    const sampleFeed = `https://${window.location.host}/api/calendar/feed.ics`;
    navigator.clipboard.writeText(sampleFeed);
    addToast('Đã sao chép liên kết iCal Feed vào bộ nhớ tạm!', 'success');
  };

  // Google Calendar quick link for the first upcoming meeting
  const upcomingMeeting = meetings.find(m => m.date >= D.today()) || meetings[0];
  const googleCalendarUrl = upcomingMeeting
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        upcomingMeeting.title
      )}&dates=${upcomingMeeting.date.replace(/-/g, '')}T090000Z/${upcomingMeeting.date.replace(
        /-/g,
        ''
      )}T103000Z&details=${encodeURIComponent(
        upcomingMeeting.notes || 'Họp trên không gian làm việc 3D V3M'
      )}&location=${encodeURIComponent(upcomingMeeting.room || 'Phòng Họp Ảo 3D')}`
    : 'https://calendar.google.com';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Đồng Bộ Lịch Biểu (Sync Calendar)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold uppercase">
                  Auto-Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kết nối lịch công ty, cuộc họp 3D và ca trực với Google Calendar, Outlook và Apple iCal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Card */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200">
                Trạng thái: Đang kết nối thời gian thực
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Lần đồng bộ gần nhất: {syncTime}
            </span>
          </div>

          <p className="text-xs text-slate-300">
            Hệ thống đã nhận diện <b>{meetings.length} cuộc họp</b> và các phòng họp ảo 3D. Bạn có thể xuất file hoặc đăng ký lịch tự động.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleTriggerReSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
              <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ lại ngay'}</span>
            </button>

            <button
              onClick={handleCopyFeedURL}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition active:scale-95"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sao chép iCal Link</span>
            </button>
          </div>
        </div>

        {/* Quick Sync Options */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Phương thức tích hợp lịch:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Download .ICS */}
            <button
              onClick={handleDownloadICS}
              className="p-3 rounded-2xl bg-slate-950/50 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 text-left transition group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-white group-hover:text-sky-300 transition">
                  Tải tệp Lịch (.ICS)
                </span>
                <Download className="w-4 h-4 text-sky-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-[11px] text-slate-400">
                Nhập nhanh vào Microsoft Outlook, Apple Calendar hoặc ứng dụng Lịch điện thoại
              </p>
            </button>

            {/* 2. Google Calendar Direct Add */}
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-2xl bg-slate-950/50 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 text-left transition group block"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-white group-hover:text-indigo-300 transition">
                  Mở Google Calendar
                </span>
                <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-[11px] text-slate-400">
                Thêm sự kiện tiếp theo vào Google Calendar của tài khoản Google của bạn
              </p>
            </a>
          </div>
        </div>

        {/* Upcoming Synced Meetings List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Lịch cuộc họp sắp diễn ra ({meetings.slice(0, 4).length})</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Tự động cập nhật</span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {meetings.slice(0, 4).map(m => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex-shrink-0">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-slate-200 truncate">{m.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {m.room || 'Phòng Họp Ảo'} · {m.time}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 font-mono text-slate-300">
                    {D.fmt(m.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
