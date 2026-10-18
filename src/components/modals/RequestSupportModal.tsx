import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { SupportTicket } from '../../types';
import {
  X,
  LifeBuoy,
  Laptop,
  Users,
  Building2,
  Coffee,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  MapPin,
  Sparkles,
  Check,
} from 'lucide-react';

interface RequestSupportModalProps {
  onClose: () => void;
  preselectedEmpId?: string | null;
}

export const RequestSupportModal: React.FC<RequestSupportModalProps> = ({
  onClose,
  preselectedEmpId,
}) => {
  const { db, activeEmps, team, addSupportTicket, resolveSupportTicket } = useStore();
  const employees = activeEmps();

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [category, setCategory] = useState<SupportTicket['category']>('it');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => {
    if (preselectedEmpId && employees.some(e => e.id === preselectedEmpId)) {
      return preselectedEmpId;
    }
    return employees[0]?.id || '';
  });

  const [priority, setPriority] = useState<SupportTicket['priority']>('normal');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');

  const currentEmp = employees.find(e => e.id === selectedEmpId);
  const currentTeam = currentEmp ? team(currentEmp.team) : null;
  const deskCoord = currentEmp?.desk ? `Bàn làm việc [${currentEmp.desk.x}, ${currentEmp.desk.y}]` : 'Văn phòng chính';

  const categories = [
    {
      id: 'it' as const,
      name: 'IT & Thiết bị',
      desc: 'Laptop, Wi-Fi, màn hình, tài khoản phần mềm',
      icon: Laptop,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      assignee: 'Đội IT Kỹ thuật',
    },
    {
      id: 'hr' as const,
      name: 'Nhân sự & Phúc lợi',
      desc: 'Chấm công, bảo hiểm, hợp đồng, đào tạo',
      icon: Users,
      color: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
      assignee: 'Chuyên viên Nhân sự',
    },
    {
      id: 'admin' as const,
      name: 'Hành chính & Văn phòng',
      desc: 'Bàn ghế, thẻ từ, văn phòng phẩm, phòng họp',
      icon: Building2,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      assignee: 'Bộ phận Hành chính',
    },
    {
      id: 'reception' as const,
      name: 'Lễ tân & Dịch vụ',
      desc: 'Tiếp đón khách, trà café, gửi nhận bưu phẩm',
      icon: Coffee,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      assignee: 'Quầy Lễ tân & Café',
    },
  ];

  const presets: Record<SupportTicket['category'], string[]> = {
    it: [
      'Màn hình phụ không nhận tín hiệu HDMI/Type-C',
      'Cấp lại mật khẩu mạng Wi-Fi nội bộ tốc độ cao',
      'Cài đặt chứng thư bảo mật VPN công ty',
      'Chuột / Bàn phím cơ bị liệt phím cần thay mới',
    ],
    hr: [
      'Tư vấn thủ tục bảo lãnh viện phí bảo hiểm VIP',
      'Đính chính giờ chấm công vân tay bị lỗi cảm biến',
      'Xin cấp giấy xác nhận nhân sự & công tác phí',
      'Đăng ký khóa đào tạo kỹ năng AI chuyên sâu',
    ],
    admin: [
      'Thẻ từ nhân viên bị trầy xước không mở được cửa',
      'Yêu cầu bổ sung tập note, bút ký và kẹp tài liệu',
      'Ghế công thái học bị kẹt piston điều chỉnh độ cao',
      'Đặt phòng họp riêng cho buổi trao đổi nội bộ',
    ],
    reception: [
      'Chuẩn bị 2 phần cà phê sữa đá tiếp khách tại sảnh',
      'Có đối tác doanh nghiệp đến làm việc lúc 10:30',
      'Nhờ quầy lễ tân giữ bưu phẩm chuyển phát nhanh',
      'Đăng ký vé gửi xe ô tô cho khách mời VIP',
    ],
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập nội dung yêu cầu hỗ trợ!');
      return;
    }

    const catObj = categories.find(c => c.id === category);

    addSupportTicket({
      category,
      empId: selectedEmpId,
      title: title.trim(),
      details: details.trim() || 'Yêu cầu hỗ trợ gửi từ Thao tác nhanh trên không gian 3D',
      priority,
      deskCoord,
      assignee: catObj?.assignee || 'Bộ phận chuyên trách',
    });

    setTitle('');
    setDetails('');
    setActiveTab('history');
  };

  const tickets = db.supportTickets || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Yêu Cầu Hỗ Trợ Nội Bộ (Request Support)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold uppercase">
                  Service Desk
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Gửi yêu cầu tới đội IT, HR, Hành chính hoặc Lễ tân với vị trí bàn làm việc 3D
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

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Tạo yêu cầu hỗ trợ mới</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Danh sách yêu cầu ({tickets.length})</span>
          </button>
        </div>

        {activeTab === 'create' ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Category Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Chọn bộ phận hỗ trợ:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/50'
                          : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className={`p-1.5 rounded-lg border ${cat.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                      </div>
                      <div className="font-bold text-[11px] text-white truncate">{cat.name}</div>
                      <div className="text-[9px] text-slate-400 truncate mt-0.5">{cat.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Employee Selector & Desk Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Người yêu cầu:
                </label>
                <select
                  value={selectedEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code}) - {emp.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>Vị trí trên bản đồ 3D:</span>
                </label>
                <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 font-mono text-[11px] flex items-center justify-between">
                  <span>{deskCoord}</span>
                  <span className="text-[10px] text-indigo-400 font-sans">
                    {currentTeam?.name || 'Tổ chuyên môn'}
                  </span>
                </div>
              </div>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Mức độ ưu tiên:
              </label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'high' as const, label: '🔴 Khẩn cấp (Cần xử lý ngay)', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
                  { id: 'normal' as const, label: '🟡 Bình thường', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                  { id: 'low' as const, label: '🟢 Thấp / Khi thuận tiện', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                      priority === p.id ? p.color : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Gợi ý mẫu yêu cầu nhanh:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presets[category].map((presetText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTitle(presetText)}
                    className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition active:scale-95 text-left"
                  >
                    + {presetText}
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Details */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Tiêu đề yêu cầu:
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Nhập ngắn gọn vấn đề cần hỗ trợ..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Chi tiết tình trạng (tùy chọn):
              </label>
              <textarea
                rows={2}
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Mô tả cụ thể hơn lỗi phát sinh, thời gian xuất hiện, thiết bị liên quan..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
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
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold shadow-lg shadow-amber-500/25 flex items-center gap-2 transition active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi Yêu Cầu Hỗ Trợ Ngay</span>
              </button>
            </div>
          </form>
        ) : (
          /* History / Tickets Queue */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Các yêu cầu hỗ trợ gần đây:</span>
              <span>{tickets.length} lượt gửi</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {tickets.length > 0 ? (
                tickets.map(t => {
                  const requester = employees.find(e => e.id === t.empId);
                  const isResolved = t.status === 'resolved';

                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{t.title}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase font-bold border ${
                                t.priority === 'high'
                                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                  : t.priority === 'normal'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              {t.priority === 'high' ? 'Khẩn cấp' : t.priority === 'normal' ? 'Bình thường' : 'Thấp'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{t.details}</p>
                        </div>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border flex-shrink-0 ${
                            isResolved
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : t.status === 'in-progress'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {isResolved ? '✓ Đã giải quyết' : t.status === 'in-progress' ? 'Đang xử lý' : 'Chờ tiếp nhận'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                        <div>
                          Người gửi: <span className="text-slate-300 font-semibold">{requester?.name || t.empId}</span> · {t.deskCoord || 'Bàn làm việc'}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{t.createdAt}</span>
                          {!isResolved && (
                            <button
                              type="button"
                              onClick={() => resolveSupportTicket(t.id)}
                              className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition font-medium"
                            >
                              Đánh dấu xong
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  Chưa có yêu cầu hỗ trợ nào.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="text-xs text-amber-400 hover:underline font-semibold"
              >
                + Tạo thêm yêu cầu mới
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
