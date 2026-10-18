import React, { useState, useEffect } from 'react';
import { useStore, StoreProvider } from './context/StoreContext';
import { ViewTab } from './types';
import { Topbar } from './components/layout/Topbar';
import { OfficeCanvas } from './components/office/OfficeCanvas';
import { OfficeSettings } from './components/office/OfficeSettings';
import { TourOverlay } from './components/office/TourOverlay';
import { ManageView } from './components/manage/ManageView';
import { ReportsView } from './components/reports/ReportsView';
import { EmployeeModal } from './components/modals/EmployeeModal';
import { EditEmployeeModal } from './components/modals/EditEmployeeModal';
import { ZoneModal } from './components/modals/ZoneModal';
import { AgentModal } from './components/modals/AgentModal';
import { AlertsModal } from './components/modals/AlertsModal';
import { ReceptionChatModal } from './components/modals/ReceptionChatModal';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const { toasts, removeToast } = useStore();

  const [currentView, setCurrentView] = useState<ViewTab>('office');

  // Modals & Drawers state
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [editEmpId, setEditEmpId] = useState<{ id?: string | null } | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const [receptionChatOpen, setReceptionChatOpen] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);

  // Focus and Highlight coordinates for 3D Office Canvas
  const [highlightZoneId, setHighlightZoneId] = useState<string | null>(null);
  const [highlightTeamId, setHighlightTeamId] = useState<string | null>(null);
  const [focusedEmpId, setFocusedEmpId] = useState<string | null>(null);
  const [focusedZoneId, setFocusedZoneId] = useState<string | null>(null);

  // Auto-launch tour if ?tour=1 in query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tour') === '1') {
      setIsTouring(true);
      setCurrentView('office');
    }
  }, []);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Top Navigation Bar */}
      <Topbar
        currentView={currentView}
        onSelectView={v => {
          setCurrentView(v);
          setIsTouring(false);
        }}
        onOpenReceptionChat={() => setReceptionChatOpen(true)}
        onOpenAlerts={() => setAlertsModalOpen(true)}
      />

      {/* Main View Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* 1. Office 3D View (Always keep canvas mounted for instant smooth tab switching) */}
        <div className={`w-full h-full ${currentView === 'office' ? 'block' : 'hidden'}`}>
          <OfficeCanvas
            onSelectEmployee={id => setSelectedEmpId(id)}
            onSelectZone={id => setSelectedZoneId(id)}
            onSelectAgent={id => setSelectedAgentId(id)}
            onOpenSettings={() => setSettingsOpen(prev => !prev)}
            onStartTour={() => setIsTouring(true)}
            highlightZoneId={highlightZoneId}
            highlightTeamId={highlightTeamId}
            focusedEmpId={focusedEmpId}
            focusedZoneId={focusedZoneId}
            isTouring={isTouring}
          />
        </div>

        {/* 2. HR Management View */}
        {currentView === 'manage' && (
          <div className="w-full h-full">
            <ManageView
              onSelectEmployee={id => setSelectedEmpId(id)}
              onEditEmployee={id => setEditEmpId({ id })}
            />
          </div>
        )}

        {/* 3. Reports & Honors View */}
        {currentView === 'reports' && (
          <div className="w-full h-full">
            <ReportsView
              onStartTour={() => {
                setCurrentView('office');
                setIsTouring(true);
              }}
              onSelectEmployee={id => setSelectedEmpId(id)}
            />
          </div>
        )}

        {/* Settings Drawer */}
        {settingsOpen && currentView === 'office' && (
          <OfficeSettings
            onClose={() => setSettingsOpen(false)}
            onSelectEmployee={id => {
              setFocusedEmpId(id);
              setSelectedEmpId(id);
            }}
            onStartTour={() => setIsTouring(true)}
          />
        )}

        {/* 3D Tour Overlay */}
        {isTouring && currentView === 'office' && (
          <TourOverlay
            onClose={() => {
              setIsTouring(false);
              setHighlightZoneId(null);
              setHighlightTeamId(null);
              setFocusedEmpId(null);
              setFocusedZoneId(null);
            }}
            onOpenReports={() => {
              setIsTouring(false);
              setCurrentView('reports');
            }}
            onHighlightZone={setHighlightZoneId}
            onHighlightTeam={setHighlightTeamId}
            onFocusZone={setFocusedZoneId}
            onFocusEmployee={setFocusedEmpId}
          />
        )}
      </div>

      {/* Modals */}
      {selectedEmpId && (
        <EmployeeModal
          empId={selectedEmpId}
          onClose={() => setSelectedEmpId(null)}
          onEdit={id => {
            setSelectedEmpId(null);
            setEditEmpId({ id });
          }}
          onFocusDesk={id => {
            setCurrentView('office');
            setFocusedEmpId(id);
          }}
        />
      )}

      {editEmpId && (
        <EditEmployeeModal
          empId={editEmpId.id}
          onClose={() => setEditEmpId(null)}
        />
      )}

      {selectedZoneId && (
        <ZoneModal
          zoneId={selectedZoneId}
          onClose={() => setSelectedZoneId(null)}
          onFocusZone={zid => {
            setCurrentView('office');
            setFocusedZoneId(zid);
          }}
          onGoToTeamsManage={() => setCurrentView('manage')}
        />
      )}

      {selectedAgentId && (
        <AgentModal
          agentId={selectedAgentId}
          onClose={() => setSelectedAgentId(null)}
        />
      )}

      {alertsModalOpen && (
        <AlertsModal
          onClose={() => setAlertsModalOpen(false)}
          onFocusTeam={deptId => {
            setAlertsModalOpen(false);
            setCurrentView('office');
            setFocusedZoneId(deptId);
          }}
        />
      )}

      {receptionChatOpen && (
        <ReceptionChatModal
          onClose={() => setReceptionChatOpen(false)}
          onOpenManageVisitors={() => {
            setReceptionChatOpen(false);
            setCurrentView('manage');
          }}
        />
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold backdrop-blur-xl animate-fadeIn ${
              t.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
                : t.type === 'warn'
                ? 'bg-amber-950/90 border-amber-800 text-amber-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-100'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : t.type === 'warn' ? (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <span>{t.msg}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 p-0.5 rounded text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;
