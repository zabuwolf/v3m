import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { D } from '../../utils/date';
import { Employee, MeetingItem, Zone } from '../../types';
import {
  Calendar,
  Clock,
  Users,
  Video,
  X,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  CheckCircle2,
  Compass,
  Layers,
  ChevronRight,
  Search,
  Check,
  Flame,
} from 'lucide-react';

interface MeetingSchedulerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmpIds: string[];
  onToggleSelectEmp: (empId: string) => void;
  onClearSelectedEmps: () => void;
  onFocusZone?: (zoneId: string) => void;
  onSelectMeetingZone?: (zoneId: string) => void;
}

export const MeetingSchedulerDrawer: React.FC<MeetingSchedulerDrawerProps> = ({
  isOpen,
  onClose,
  selectedEmpIds,
  onToggleSelectEmp,
  onClearSelectedEmps,
  onFocusZone,
  onSelectMeetingZone,
}) => {
  const { db, createVirtualMeetingZone, activeEmps, team } = useStore();

  const allEmployees = activeEmps();

  // Attendees dropped/added into the "Schedule Meeting" slot
  const [slotAttendeeIds, setSlotAttendeeIds] = useState<string[]>([]);
  const [draggedEmpId, setDraggedEmpId] = useState<string | null>(null);
  const [isDragOverSlot, setIsDragOverSlot] = useState(false);

  // Form State
  const [title, setTitle] = useState('Họp Kế hoạch Sprint & Review 3D');
  const [date, setDate] = useState(() => D.today());
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [meetingType, setMeetingType] = useState<MeetingItem['type']>('sprint');
  const [roomName, setRoomName] = useState('Phòng Họp Ảo Alpha');
  const [auraColor, setAuraColor] = useState('#8b5cf6'); // Violet default
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  // Quick Preset Templates
  const templates = [
    {
      title: 'Daily Standup Đầu Ngày',
      type: 'standup' as const,
      durationMinutes: 20,
      room: 'Phòng Họp Nhanh Standup',
      color: '#38bdf8', // Cyan
      icon: '⚡',
    },
    {
      title: 'Họp Kế Hoạch Sprint & Review 3D',
      type: 'sprint' as const,
      durationMinutes: 60,
      room: 'Phòng Họp Ảo Alpha',
      color: '#8b5cf6', // Violet
      icon: '🚀',
    },
    {
      title: 'Townhall & All-Hands Ban Điều Hành',
      type: 'allhands' as const,
      durationMinutes: 90,
      room: 'Hội Trường Ảo V3M',
      color: '#ec4899', // Pink
      icon: '🎯',
    },
    {
      title: 'Demo Giải Pháp Khách Hàng & Đối Tác',
      type: 'client' as const,
      durationMinutes: 60,
      room: 'Sky Conference Room',
      color: '#10b981', // Emerald
      icon: '🤝',
    },
    {
      title: 'Brainstorm Đổi Mới Sáng Tạo & AI',
      type: 'review' as const,
      durationMinutes: 45,
      room: 'Hologram Studio 3D',
      color: '#f59e0b', // Amber
      icon: '💡',
    },
  ];

  const applyTemplate = (t: typeof templates[0]) => {
    setTitle(t.title);
    setMeetingType(t.type);
    setRoomName(t.room);
    setAuraColor(t.color);
    // Adjust end time based on duration
    const [h, m] = startTime.split(':').map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + t.durationMinutes;
    const endH = Math.floor(endMins / 60) % 24;
    const endM = endMins % 60;
    setEndTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
  };

  // Add all currently selected employees from canvas to slot
  const handleAddSelectedToSlot = () => {
    const combined = Array.from(new Set([...slotAttendeeIds, ...selectedEmpIds]));
    setSlotAttendeeIds(combined);
  };

  const handleRemoveFromSlot = (empId: string) => {
    setSlotAttendeeIds(prev => prev.filter(id => id !== empId));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, empId: string) => {
    e.dataTransfer.setData('text/plain', empId);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggedEmpId(empId);
  };

  const handleDragEnd = () => {
    setDraggedEmpId(null);
    setIsDragOverSlot(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOverSlot(true);
  };

  const handleDragLeave = () => {
    setIsDragOverSlot(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSlot(false);
    const empId = e.dataTransfer.getData('text/plain') || draggedEmpId;
    if (empId && !slotAttendeeIds.includes(empId)) {
      setSlotAttendeeIds(prev => [...prev, empId]);
    }
  };

  // Bulk add department members
  const handleAddDeptMembers = (deptId: string) => {
    const deptEmpIds = allEmployees.filter(e => e.dept === deptId).map(e => e.id);
    setSlotAttendeeIds(prev => Array.from(new Set([...prev, ...deptEmpIds])));
  };

  // Submit to create virtual meeting zone
  const handleCreateVirtualMeeting = () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tiêu đề cuộc họp!');
      return;
    }

    // Default to at least the creator / top active employees if slot is empty
    const finalAttendees = slotAttendeeIds.length > 0 ? slotAttendeeIds : allEmployees.slice(0, 3).map(e => e.id);

    const timeRange = `${startTime} - ${endTime}`;

    const { zone } = createVirtualMeetingZone(
      {
        title: title.trim(),
        date,
        time: timeRange,
        attendees: finalAttendees,
        type: meetingType,
        status: date === D.today() ? 'in-progress' : 'scheduled',
        notes: `Phòng họp ảo 3D được thiết lập từ Meeting Scheduler với ${finalAttendees.length} nhân sự tham gia.`,
      },
      {
        name: roomName.trim() || `Phòng Họp Ảo: ${title.slice(0, 20)}`,
        accent: auraColor,
        color: auraColor + '33', // 20% alpha
      }
    );

    // Focus camera onto newly created virtual zone
    if (onFocusZone && zone) {
      onFocusZone(zone.id);
    }
    if (onSelectMeetingZone && zone) {
      onSelectMeetingZone(zone.id);
    }

    // Reset slot or close
    setSlotAttendeeIds([]);
    onClearSelectedEmps();
    onClose();
  };

  if (!isOpen) return null;

  // Filtered employees for roster
  const filteredEmployees = allEmployees.filter(e => {
    const matchesDept = selectedDeptFilter === 'all' || e.dept === selectedDeptFilter;
    const matchesQuery =
      !searchQuery ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.role || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesQuery;
  });

  return (
    <div className="absolute inset-x-0 bottom-0 z-40 bg-slate-900/98 backdrop-blur-xl border-t border-slate-700/80 shadow-[0_-10px_35px_rgba(0,0,0,0.6)] text-slate-100 max-h-[85vh] sm:max-h-[75vh] flex flex-col transition-all duration-300 animate-slideUp">
      {/* Drawer Header */}
      <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                <span>Lên lịch họp 3D & Tạo Phòng Họp Ảo</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono uppercase tracking-wider">
                  Meeting Scheduler
                </span>
              </h2>
            </div>
            <p className="text-[11px] text-slate-400">
              Chọn nhân sự trên bản đồ 3D hoặc kéo thả vào ô lên lịch để tạo phòng họp ảo trên không gian làm việc
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedEmpIds.length > 0 && (
            <button
              onClick={handleAddSelectedToSlot}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-semibold shadow flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm {selectedEmpIds.length} người đang chọn vào ô họp</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Drawer Body: 2 Columns Layout */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (5 Cols): Employee Roster & Selection Tray */}
        <div className="lg:col-span-5 flex flex-col space-y-3 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Danh sách nhân sự ({allEmployees.length})</span>
            </div>
            <div className="text-[11px] text-slate-400">
              {selectedEmpIds.length > 0 ? (
                <span className="text-indigo-400 font-semibold">
                  Đang chọn {selectedEmpIds.length} trên 3D
                </span>
              ) : (
                'Kéo hoặc click để thêm'
              )}
            </div>
          </div>

          {/* Search & Dept Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên, mã, vai trò..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={selectedDeptFilter}
              onChange={e => setSelectedDeptFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả phòng ban</option>
              {db.zones.filter(z => !z.isVirtual).map(z => (
                <option key={z.id} value={z.id}>
                  {z.icon} {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Department Add Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
            {db.zones.filter(z => !z.isVirtual).slice(0, 5).map(z => (
              <button
                key={z.id}
                onClick={() => handleAddDeptMembers(z.id)}
                className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition whitespace-nowrap flex items-center gap-1"
                title={`Thêm tất cả nhân sự ${z.name} vào ô họp`}
              >
                <span>{z.icon}</span>
                <span>+ {z.name.replace('Phòng ', '')}</span>
              </button>
            ))}
          </div>

          {/* Employee Draggable Cards List */}
          <div className="flex-1 min-h-[170px] max-h-[260px] overflow-y-auto space-y-1.5 pr-1">
            {filteredEmployees.map(empItem => {
              const inSlot = slotAttendeeIds.includes(empItem.id);
              const isSelectedOnCanvas = selectedEmpIds.includes(empItem.id);
              const empTeam = team(empItem.team);

              return (
                <div
                  key={empItem.id}
                  draggable={!inSlot}
                  onDragStart={e => handleDragStart(e, empItem.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    if (inSlot) {
                      handleRemoveFromSlot(empItem.id);
                    } else {
                      setSlotAttendeeIds(prev => [...prev, empItem.id]);
                    }
                  }}
                  className={`flex items-center justify-between p-2 rounded-xl border transition cursor-grab active:cursor-grabbing select-none ${
                    inSlot
                      ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                      : isSelectedOnCanvas
                      ? 'bg-slate-800/90 border-indigo-400 text-white'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: empTeam?.color || '#6366f1' }}
                    >
                      {empItem.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate text-white">
                          {empItem.name}
                        </span>
                        {isSelectedOnCanvas && (
                          <span className="text-[9px] px-1 rounded bg-indigo-500/30 text-indigo-300 font-mono">
                            3D
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {empItem.role} · {empTeam?.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {inSlot ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-medium">
                        <Check className="w-2.5 h-2.5" />
                        <span>Đã thêm</span>
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 hover:text-white flex items-center gap-0.5">
                        <Plus className="w-2.5 h-2.5" />
                        <span>Kéo/Chọn</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (7 Cols): The "Schedule Meeting" Slot & Zone Form */}
        <div className="lg:col-span-7 flex flex-col space-y-3.5">
          {/* Quick Preset Buttons */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Mẫu cuộc họp nhanh (Presets):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs text-slate-200 hover:text-white transition flex items-center gap-1.5 active:scale-95"
                >
                  <span>{tpl.icon}</span>
                  <span className="font-medium">{tpl.title}</span>
                  <span className="text-[10px] font-mono text-slate-400">({tpl.durationMinutes}m)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive "Schedule Meeting" Drop Slot */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-3.5 rounded-2xl border-2 border-dashed transition-all duration-200 ${
              isDragOverSlot
                ? 'bg-indigo-950/60 border-indigo-400 shadow-lg shadow-indigo-500/20 scale-[1.01]'
                : slotAttendeeIds.length > 0
                ? 'bg-slate-950/80 border-indigo-500/50'
                : 'bg-slate-950/40 border-slate-700/80 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Ô Lên Lịch Cuộc Họp (Schedule Meeting Slot)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-400">
                  {slotAttendeeIds.length} người tham gia
                </span>
                {slotAttendeeIds.length > 0 && (
                  <button
                    onClick={() => setSlotAttendeeIds([])}
                    className="text-[11px] text-slate-400 hover:text-red-400 transition"
                  >
                    Xóa hết
                  </button>
                )}
              </div>
            </div>

            {/* Dropped Employees Chips */}
            {slotAttendeeIds.length > 0 ? (
              <div className="pt-2.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {slotAttendeeIds.map(empId => {
                  const empItem = allEmployees.find(e => e.id === empId);
                  if (!empItem) return null;
                  const empTeam = team(empItem.team);

                  return (
                    <div
                      key={empId}
                      className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs shadow-sm"
                    >
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: empTeam?.color || '#6366f1' }}
                      >
                        {empItem.name.slice(0, 1)}
                      </div>
                      <span className="font-medium text-slate-200">{empItem.name}</span>
                      <button
                        onClick={() => handleRemoveFromSlot(empId)}
                        className="w-4 h-4 rounded-full hover:bg-slate-850 flex items-center justify-center text-slate-400 hover:text-red-400 transition"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center">
                <div className="text-xs text-slate-400 font-medium">
                  {isDragOverSlot ? (
                    <span className="text-indigo-300 font-bold animate-pulse">
                      ✦ Thả nhân sự vào đây để thêm vào cuộc họp!
                    </span>
                  ) : (
                    <span>
                      📥 Kéo thả nhân sự từ danh sách hoặc click vào nhân sự trên bản đồ 3D để đưa vào ô họp
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  (Có thể chọn nhiều người cùng lúc hoặc bấm các nút phòng ban bên trái)
                </div>
              </div>
            )}
          </div>

          {/* Meeting Form Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Tiêu đề cuộc họp:
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                placeholder="Nhập tiêu đề cuộc họp..."
              />
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Ngày họp:
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Bắt đầu:
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Kết thúc:
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Virtual Room Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Tên Phòng Họp Ảo 3D:
              </label>
              <input
                type="text"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="Ví dụ: Phòng Họp Ảo Alpha"
              />
            </div>

            {/* Hologram Aura Color & Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Màu sắc Hologram 3D:
              </label>
              <div className="flex items-center gap-2">
                {[
                  { color: '#8b5cf6', label: 'Violet' },
                  { color: '#38bdf8', label: 'Cyan' },
                  { color: '#10b981', label: 'Emerald' },
                  { color: '#f59e0b', label: 'Amber' },
                  { color: '#ec4899', label: 'Pink' },
                ].map(c => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setAuraColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    className={`w-7 h-7 rounded-xl transition transform active:scale-95 flex items-center justify-center ${
                      auraColor === c.color ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {auraColor === c.color && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Create Button */}
          <button
            type="button"
            onClick={handleCreateVirtualMeeting}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-500 hover:via-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 border border-indigo-400/40 flex items-center justify-center gap-2 transition transform active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Khởi Tạo Phòng Họp Ảo 3D & Đưa Lên Bản Đồ</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
