import React from 'react';
import { Layers, Box, Activity, Sliders, Cpu, Sun, Moon, Info, ShieldCheck } from 'lucide-react';

export type ViewMode = 'map2d' | 'ocean3d' | 'transect' | 'profile' | 'reconstruction';

interface HeaderProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenInfo: () => void;
  currentDate: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  isDarkMode,
  onToggleDarkMode,
  onOpenInfo,
  currentDate
}) => {
  const tabs: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'map2d', label: '2D Surface & Depth Map', icon: <Layers className="w-4 h-4" /> },
    { id: 'ocean3d', label: '3D Ocean Volume', icon: <Box className="w-4 h-4" /> },
    { id: 'transect', label: 'Vertical Transect', icon: <Sliders className="w-4 h-4" /> },
    { id: 'profile', label: 'Point Sounding (T-D)', icon: <Activity className="w-4 h-4" /> },
    { id: 'reconstruction', label: 'AI Reconstruction PoC', icon: <Cpu className="w-4 h-4" /> }
  ];

  return (
    <header className={`border-b transition-colors ${
      isDarkMode 
        ? 'bg-slate-800 border-slate-700 text-white' 
        : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Top Banner with Gov / INCOIS styling */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center text-white font-black text-[11px] tracking-wider uppercase shadow-sm">
            ABYSS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">Project ABYSS</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                isDarkMode ? 'bg-blue-900 text-blue-200 border border-blue-700' : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                <ShieldCheck className="w-3 h-3" /> PS 26066 • INCOIS / MoES
              </span>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Subsurface Ocean Temperature Reconstruction • North Indian Ocean (5°–30°N, 45°–105°E)
            </p>
          </div>
        </div>

        {/* Right side utilities */}
        <div className="flex items-center gap-2">
          {/* Active Date Badge */}
          <div className={`text-xs px-3 py-1.5 rounded border font-mono font-medium ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            Date: <span className="font-bold text-blue-600 dark:text-blue-400">{currentDate}</span>
          </div>

          {/* About / Info Modal Button */}
          <button
            onClick={onOpenInfo}
            className={`p-2 rounded border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDarkMode 
                ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200' 
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
            }`}
            title="System Documentation & Specifications"
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">About</span>
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded border transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
              isDarkMode 
                ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-amber-300' 
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className={`border-t px-4 max-w-7xl mx-auto flex overflow-x-auto gap-1 py-1.5 ${
        isDarkMode ? 'border-slate-700' : 'border-slate-200'
      }`}>
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-700 text-white shadow-sm'
                  : isDarkMode
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
