import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Employee } from '../../types';

function isLead(role: string) {
  return /giám đốc|ceo|coo|cto|cfo|trưởng|leader|head|quản lý|điều hành/i.test(role);
}

function sectionRank(name: string) {
  return /leader|trưởng|sáng lập/i.test(name) ? 0 : 1;
}

export const OrgChartPanel: React.FC<{ onSelectEmployee: (id: string) => void }> = ({ onSelectEmployee }) => {
  const { db, teamsOf, empsOfTeam, empsOfDept, activeEmps } = useStore();
  const depts = db.zones.filter(z => !z.isVirtual);
  const peopleOf = (deptId: string) =>
    deptId === 'nghi' ? db.employees.filter(e => e.dept === deptId) : empsOfDept(deptId);
  const teamPeople = (deptId: string, teamId: string) =>
    deptId === 'nghi' ? db.employees.filter(e => e.team === teamId) : empsOfTeam(teamId);
  const headcount = activeEmps().length;

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fadeIn">
      <div>
        <div className="v3m-kicker">Tổ chức</div>
        <h2 className="text-xl font-semibold text-white mt-1">Sơ đồ tổ chức</h2>
        <p className="text-xs text-slate-400 mt-1">
          {headcount} nhân sự đang làm · {depts.length} phòng ban · {db.teams.length} tổ
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-max flex flex-col items-center">
          <div className="px-5 py-3 rounded-2xl bg-white text-slate-950 text-center shadow-sm">
            <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-slate-500">Công ty</div>
            <div className="text-sm font-semibold">{db.company.name}</div>
          </div>
          <div className="w-px h-5 bg-white/20" />
          <div className="h-px bg-white/20 self-stretch mx-8" />
          <div className="flex items-start gap-3 px-2">
            {depts.map(z => {
              const teams = [...teamsOf(z.id)].sort((a, b) => sectionRank(a.name) - sectionRank(b.name) || a.name.localeCompare(b.name, 'vi'));
              const inDept = peopleOf(z.id);
              const unassigned = inDept.filter(e => !teams.some(t => t.id === e.team));
              return (
                <div key={z.id} className="w-60 flex flex-col items-center">
                  <div className="w-px h-4 bg-white/20" />
                  <div
                    className="w-full rounded-xl border bg-slate-900/90 px-3 py-2.5"
                    style={{ borderColor: z.accent || 'rgba(148,163,184,0.3)' }}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Phòng ban</div>
                    <div className="text-sm font-semibold text-white">{z.name}</div>
                    <div className="text-[10px] text-slate-500">{inDept.length} người</div>
                  </div>
                  <div className="w-full mt-2 space-y-2">
                    {teams.map(t => (
                      <TeamCard
                        key={t.id}
                        name={t.name}
                        color={t.color}
                        members={teamPeople(z.id, t.id)}
                        onSelect={onSelectEmployee}
                      />
                    ))}
                    {unassigned.length > 0 && (
                      <TeamCard name="Chưa vào tổ" color="#64748b" members={unassigned} onSelect={onSelectEmployee} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

function TeamCard({
  name,
  color,
  members,
  onSelect,
}: {
  name: string;
  color: string;
  members: Employee[];
  onSelect: (id: string) => void;
}) {
  const ordered = [...members].sort((a, b) => Number(isLead(b.role)) - Number(isLead(a.role)) || a.name.localeCompare(b.name, 'vi'));
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-[11px] font-semibold text-slate-200">{name}</span>
        <span className="ml-auto text-[10px] text-slate-500">{members.length}</span>
      </div>
      <div className="space-y-1">
        {ordered.map(e => (
          <button
            key={e.id}
            onClick={() => onSelect(e.id)}
            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/6 transition"
          >
            <div className="text-[12px] text-white font-medium leading-tight">{e.name}</div>
            <div className={`text-[10px] ${isLead(e.role) ? 'text-amber-300' : 'text-slate-500'}`}>{e.role}</div>
          </button>
        ))}
        {ordered.length === 0 && <div className="text-[10px] text-slate-600 px-2 py-1">Chưa có người</div>}
      </div>
    </div>
  );
}
