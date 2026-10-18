import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  X,
  Sparkles,
  Grid,
  GitBranch,
  Tag,
  SunMoon,
  Lightbulb,
  Palette,
  Layers,
  Play,
  Copy,
  Search,
  Check,
  HelpCircle,
} from 'lucide-react';

interface OfficeSettingsProps {
  onClose: () => void;
  onSelectEmployee: (empId: string) => void;
  onStartTour: () => void;
}

export const OfficeSettings: React.FC<OfficeSettingsProps> = ({
  onClose,
  onSelectEmployee,
  onStartTour,
}) => {
  const { db, activeEmps, updateSettings, rearrangeDesks, addToast } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const S = db.settings;
  const filteredEmps = searchQuery.trim()
    ? activeEmps().filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleCopyLink = () => {
    const url = window.location.origin + window.location.pathname + '?tour=1';
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    addToast('Đã sao chép liên kết trình chiếu!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="absolute top-16 right-4 z-40 w-84 max-h-[calc(100vh-80px)] overflow-y-auto rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl p-4 text-slate-200 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">⚙️</span>
          <b className="text-sm font-bold text-white">Cài đặt văn phòng 3D</b>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Search Employee */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-400">🔍 Tìm nhân viên trên sơ đồ</label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Nhập tên nhân viên..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
        </div>

        {filteredEmps.length > 0 && (
          <div className="max-h-36 overflow-y-auto bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-800/60">
            {filteredEmps.slice(0, 5).map(e => (
              <button
                key={e.id}
                onClick={() => {
                  onSelectEmployee(e.id);
                  setSearchQuery('');
                  onClose();
                }}
                className="w-full px-3 py-2 text-left text-xs hover:bg-slate-800/80 flex items-center justify-between text-slate-300 hover:text-white transition"
              >
                <span>{e.name}</span>
                <span className="text-[10px] text-slate-500">{e.role}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Visual Display Toggles */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-400">Hiển thị & Bố cục</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => rearrangeDesks(true)}
            className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 font-semibold text-xs border border-indigo-500/30 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tự động sắp xếp bàn</span>
          </button>

          <button
            onClick={() => updateSettings({ grid: !S.grid })}
            className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border transition ${
              S.grid
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Lưới chỉ thị</span>
          </button>

          <button
            onClick={() => updateSettings({ connections: !S.connections })}
            className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border transition ${
              S.connections
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Đường kết nối</span>
          </button>

          <button
            onClick={() => updateSettings({ nameTags: !S.nameTags })}
            className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border transition ${
              S.nameTags
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Bảng tên nhân sự</span>
          </button>
        </div>
      </div>

      {/* Floor Texture Selection */}
      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Chất liệu sàn 3D (Floor Texture)</span>
          </span>
          <span className="text-[10px] font-mono text-indigo-400 uppercase">
            {S.floorTexture === 'wood'
              ? 'Warm Wood'
              : S.floorTexture === 'tile'
              ? 'Minimalist Tile'
              : 'Modern Concrete'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* 1. Modern Concrete */}
          <button
            onClick={() => {
              updateSettings({ floorTexture: 'concrete' });
              addToast('Đã đổi sàn sang: Bê tông hiện đại', 'info');
            }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl text-center border transition ${
              (!S.floorTexture || S.floorTexture === 'concrete')
                ? 'bg-slate-800 border-indigo-500 shadow-md shadow-indigo-500/20 text-white font-bold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <div className="w-full h-7 rounded-lg bg-slate-300 border border-slate-400/50 flex items-center justify-center relative overflow-hidden">
              <span className="text-xs">🏢</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
            <span className="text-[10px] leading-tight">Bê tông hiện đại</span>
          </button>

          {/* 2. Warm Wood */}
          <button
            onClick={() => {
              updateSettings({ floorTexture: 'wood' });
              addToast('Đã đổi sàn sang: Gỗ sồi ấm cúng', 'info');
            }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl text-center border transition ${
              S.floorTexture === 'wood'
                ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/20 text-amber-200 font-bold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <div className="w-full h-7 rounded-lg bg-[#d5be9f] border border-[#b89a74] flex items-center justify-center relative overflow-hidden">
              <span className="text-xs">🪵</span>
              <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 to-transparent" />
            </div>
            <span className="text-[10px] leading-tight">Gỗ sồi ấm cúng</span>
          </button>

          {/* 3. Minimalist Tile */}
          <button
            onClick={() => {
              updateSettings({ floorTexture: 'tile' });
              addToast('Đã đổi sàn sang: Gạch men tối giản', 'info');
            }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl text-center border transition ${
              S.floorTexture === 'tile'
                ? 'bg-sky-950/40 border-sky-400 shadow-md shadow-sky-500/20 text-sky-200 font-bold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <div className="w-full h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center relative overflow-hidden">
              <span className="text-xs">◻️</span>
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[1px] bg-slate-300 opacity-60" />
            </div>
            <span className="text-[10px] leading-tight">Gạch men tối giản</span>
          </button>
        </div>
      </div>

      {/* Lighting & Festive Theme */}
      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="text-xs font-semibold text-slate-400">Ánh sáng & Chủ đề</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <SunMoon className="w-3.5 h-3.5" /> Chế độ ngày/đêm
            </span>
            <select
              value={S.dayNight}
              onChange={e => updateSettings({ dayNight: e.target.value as 'auto' | 'day' | 'night' })}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none"
            >
              <option value="auto">Tự động theo giờ</option>
              <option value="day">Ban ngày (Sáng)</option>
              <option value="night">Ban đêm (Đèn vàng)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> Trang trí văn phòng
            </span>
            <select
              value={S.theme}
              onChange={e => updateSettings({ theme: e.target.value as 'tet' | 'none' | 'noel' })}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none"
            >
              <option value="tet">🧧 Tết cổ truyền (Hoa đào/Lồng đèn)</option>
              <option value="none">🏢 Tiêu chuẩn hiện đại</option>
              <option value="noel">🎄 Giáng sinh (Chuông/Cây thông)</option>
            </select>
          </label>
        </div>
      </div>

      {/* Tour & Slideshow settings */}
      <div className="space-y-2 border-t border-slate-800 pt-3">
        <div className="text-xs font-semibold text-slate-400">Trình chiếu & Tham quan</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onClose();
              onStartTour();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Bắt đầu tham quan</span>
          </button>
          <button
            onClick={handleCopyLink}
            title="Sao chép link trình chiếu"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-400">Thời gian mỗi slide:</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={3}
              max={60}
              value={S.slideSeconds}
              onChange={e => updateSettings({ slideSeconds: Number(e.target.value) })}
              className="w-14 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-center text-xs"
            />
            <span className="text-slate-400 text-[11px]">giây</span>
          </div>
        </div>
      </div>

      {/* Diagram Legend */}
      <div className="border-t border-slate-800 pt-3 space-y-1.5 text-[11px] text-slate-400">
        <div className="font-semibold text-slate-300 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Quy ước sơ đồ</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-orange-500 border-dashed" />
          <span>Giao phiếu việc / điều hành</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-emerald-500 border-dashed" />
          <span>Báo cáo cấp quản lý</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span>Nháy đỏ: tổ có từ {db.rules.redMinWarnings} cảnh báo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Nháy vàng: tổ cần đẩy mạnh KPI</span>
        </div>
      </div>
    </div>
  );
};
