import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Network,
  Zap,
  BrainCircuit,
  Radio,
  FileCheck2,
  HardHat,
  Cable,
  Signpost,
  Navigation
} from 'lucide-react';

export type TabType = 'dashboard' | 'tasks' | 'optimizer' | 'coordination' | 'simulation' | 'ml';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingTasksCount: number;
  criticalAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingTasksCount,
  criticalAlertsCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Executive Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      badge: null,
    },
    {
      id: 'tasks' as TabType,
      label: 'Maintenance Tasks',
      icon: <ClipboardList className="w-5 h-5" />,
      badge: pendingTasksCount > 0 ? `${pendingTasksCount} pending` : null,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      id: 'optimizer' as TabType,
      label: 'Schedule Optimizer',
      icon: <CalendarDays className="w-5 h-5" />,
      badge: 'OR-Tools',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'coordination' as TabType,
      label: 'Cross-Dept Coordination',
      icon: <Network className="w-5 h-5" />,
      badge: criticalAlertsCount > 0 ? `${criticalAlertsCount} alerts` : null,
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse',
    },
    {
      id: 'simulation' as TabType,
      label: 'What-If Simulation',
      icon: <Zap className="w-5 h-5" />,
      badge: 'Live',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'ml' as TabType,
      label: 'ML Delay Prediction',
      icon: <BrainCircuit className="w-5 h-5" />,
      badge: 'Random Forest',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        {/* Navigation list */}
        <div className="space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Railway Management Core
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-blue-400' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                      item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Coordinated Departments Guide */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2.5">
          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            <span>Connected Departments</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Track Eng</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Elect / OHE</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>S&T Signals</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Operations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/80">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          <span>Hackathon Release v1.0</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Synthetic railway operational demo.
        </p>
      </div>
    </aside>
  );
};
