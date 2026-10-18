import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { D } from '../../utils/date';
import {
  X,
  Palmtree,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Send,
  FileText,
  Briefcase,
  Phone,
} from 'lucide-react';

interface LeaveRequestModalProps {
  onClose: () => void;
  preselectedEmpId?: string | null;
}

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  onClose,
  preselectedEmpId,
}) => {
  const { db, activeEmps, team, addLeave } = useStore();
  const employees = activeEmps();

  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => {
    if (preselectedEmpId && employees.some(e => e.id === preselectedEmpId)) {
      return preselectedEmpId;
    }
    return employees[0]?.id || '';
  });

  const [leaveType, setLeaveType] = useState<string>('annual');
  const [fromDate, setFromDate] = useState<string>(() => D.addDays(D.today(), 1));
  const [toDate, setToDate] = useState<string>(() => D.addDays(D.today(), 1));
  const [reason, setReason] = useState<string>('');
  const [handoverEmpId, setHandoverEmpId] = useState<string>('');
  const [emergencyPhone, setEmergencyPhone] = useState<string>('');

  const currentEmp = employees.find(e => e.id === selectedEmpId);
  const currentTeam = currentEmp ? team(currentEmp.team) : null;

  // Calculate day difference
  const daysDiff = Math.max(
    1,
    Math.round(
      (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  );

  const leaveTypes = [
    { id: 'annual', label: 'Nghỉ phép năm', desc: 'Hưởng 100% lương theo chế độ', badge: '12 ngày/năm' },
    { id: 'sick', label: 'Nghỉ ốm / Khám bệnh', desc: 'Có giấy chỉ định y tế hoặc toa thuốc', badge: 'Bảo hiểm XH' },
    { id: 'remote', label: 'Làm việc từ xa (WFH)', desc: 'Làm online tại nhà hoặc ngoài văn phòng', badge: 'Lương đủ' },
    { id: 'unpaid', label: 'Nghỉ không hưởng lương', desc: 'Giải quyết việc cá nhân dài hạn', badge: 'Thỏa thuận' },
    { id: 'urgent', label: 'Việc gia đình khẩn cấp', desc: 'Nghỉ hiếu hỉ, việc riêng đột xuất', badge: 'Khẩn cấp' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      alert('Vui lòng chọn nhân sự tạo đơn!');
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      alert('Ngày kết thúc không thể trước ngày bắt đầu!');
      return;
    }

    const typeObj = leaveTypes.find(t => t.id === leaveType);
    const handoverEmp = employees.find(e => e.id === handoverEmpId);
    const handoverText = handoverEmp ? ` (Bàn giao cho: ${handoverEmp.name})` : '';
    const fullReason = (reason.trim() || typeObj?.label || 'Nghỉ phép theo nguyện vọng cá nhân') + handoverText;

    addLeave({
      emp: selectedEmpId,
      type: typeObj?.label || leaveType,
      from: fromDate,
      to: toDate,
      days: daysDiff,
      reason: fullReason,
      status: 'pending',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <Palmtree className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Tạo Đơn Xin Nghỉ Phép (Leave Request)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase">
                  Quick Action
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Gửi yêu cầu nghỉ phép, làm từ xa hoặc việc riêng tới quản lý trực tiếp
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Employee Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nhân sự đề xuất nghỉ:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedEmpId}
                onChange={e => setSelectedEmpId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.code}) - {emp.role}
                  </option>
                ))}
              </select>

              {currentEmp && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                    style={{ backgroundColor: currentTeam?.color || '#10b981' }}
                  >
                    {currentEmp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-slate-200 truncate">{currentEmp.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {currentEmp.role} · {currentTeam?.name}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Leave Type Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hình thức nghỉ:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {leaveTypes.map(t => {
                const isSelected = leaveType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setLeaveType(t.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-start justify-between ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-100">{t.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono flex-shrink-0">
                      {t.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range & Total Days */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" />
                <span>Từ ngày:</span>
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" />
                <span>Đến ngày:</span>
              </label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex flex-col justify-end">
              <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Tổng cộng:</span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono">
                  {daysDiff} ngày
                </span>
              </div>
            </div>
          </div>

          {/* Handover & Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-emerald-400" />
                <span>Người nhận bàn giao công việc:</span>
              </label>
              <select
                value={handoverEmpId}
                onChange={e => setHandoverEmpId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Chọn đồng nghiệp hỗ trợ (tùy chọn) --</option>
                {employees
                  .filter(e => e.id !== selectedEmpId)
                  .map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-400" />
                <span>SĐT liên hệ khẩn cấp:</span>
              </label>
              <input
                type="text"
                placeholder={currentEmp?.phone || '0988 123 456'}
                value={emergencyPhone}
                onChange={e => setEmergencyPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Lý do xin nghỉ & Kế hoạch bàn giao:
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ghi rõ lý do xin nghỉ và các công việc đang chạy đã được sắp xếp..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi Đơn Xin Nghỉ Phép</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
