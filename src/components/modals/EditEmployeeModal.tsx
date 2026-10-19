import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Employee } from '../../types';
import { D } from '../../utils/date';
import { X } from 'lucide-react';

interface EditEmployeeModalProps {
  empId?: string | null;
  onClose: () => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({ empId, onClose }) => {
  const { db, emp, saveEmployee } = useStore();
  const existing = empId ? emp(empId) : null;

  const [formData, setFormData] = useState({
    name: existing?.name || '',
    code: existing?.code || '',
    role: existing?.role || '',
    team: existing?.team || db.teams[0]?.id || '',
    gender: (existing?.gender || 'M') as 'M' | 'F',
    status: (existing?.status || 'active') as Employee['status'],
    email: existing?.email || '',
    phone: existing?.phone || '',
    salary: existing?.salary ?? 0,
    joinDate: existing?.joinDate || D.today(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveEmployee({
      ...(existing || {}),
      ...formData,
      id: existing?.id,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-white">
            {existing ? 'Sửa hồ sơ nhân sự' : 'Thêm nhân viên mới'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-slate-400 font-medium">Họ và tên *</span>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </label>

            <label className="space-y-1">
              <span className="text-slate-400 font-medium">Mã nhân viên</span>
              <input
                type="text"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                placeholder="V3M001"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-slate-400 font-medium">Chức vụ *</span>
              <input
                required
                type="text"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </label>

            <label className="space-y-1">
              <span className="text-slate-400 font-medium">Tổ công tác *</span>
              <select
                value={formData.team}
                onChange={e => setFormData({ ...formData, team: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              >
                {db.teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-slate-400 font-medium">Giới tính</span>
              <select
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value as 'M' | 'F' })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="M">Nam</option>
                <option value="F">Nữ</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-slate-400 font-medium">Trạng thái</span>
              <select
                value={formData.status}
                onChange={e =>
                  setFormData({ ...formData, status: e.target.value as Employee['status'] })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="active">Đang làm</option>
                <option value="probation">Thử việc</option>
                <option value="leave">Nghỉ dài hạn</option>
                <option value="resigned">Đã nghỉ</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-slate-400 font-medium">Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </label>

            <label className="space-y-1">
              <span className="text-slate-400 font-medium">Số điện thoại</span>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-slate-400 font-medium">Lương cơ bản (VND)</span>
              <input
                type="number"
                step="500000"
                value={formData.salary}
                onChange={e => setFormData({ ...formData, salary: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </label>

            <label className="space-y-1">
              <span className="text-slate-400 font-medium">Ngày vào làm</span>
              <input
                type="date"
                value={formData.joinDate}
                onChange={e => setFormData({ ...formData, joinDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/25 transition"
            >
              Lưu hồ sơ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
