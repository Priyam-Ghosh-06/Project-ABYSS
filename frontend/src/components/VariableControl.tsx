import React from 'react';
import type { VariableMeta } from '../lib/types';
import type { ColormapType } from '../lib/colormaps';
import { getCssGradient } from '../lib/colormaps';
import { Thermometer, Droplets, Waves, Wind, Compass, Sparkles, Activity } from 'lucide-react';

interface VariableControlProps {
  variables: Record<string, VariableMeta>;
  selectedVariable: string;
  onSelectVariable: (varKey: string) => void;
  selectedDepth: number;
  onSelectDepth: (depth: number) => void;
  standardDepths: number[];
  selectedColormap: ColormapType;
  onSelectColormap: (cmap: ColormapType) => void;
  stats?: { min: number; max: number; mean: number; unit: string };
  isDarkMode: boolean;
}

const COLORMAPS: { id: ColormapType; label: string }[] = [
  { id: 'turbo', label: 'Turbo (Rainbow)' },
  { id: 'thermal', label: 'Thermal / Magma' },
  { id: 'haline', label: 'Haline (Salinity)' },
  { id: 'coolwarm', label: 'Coolwarm (Anomaly)' },
  { id: 'viridis', label: 'Viridis' },
  { id: 'ocean', label: 'Ocean Blue' },
  { id: 'plasma', label: 'Plasma' }
];

export const VariableControl: React.FC<VariableControlProps> = ({
  variables,
  selectedVariable,
  onSelectVariable,
  selectedDepth,
  onSelectDepth,
  standardDepths,
  selectedColormap,
  onSelectColormap,
  stats,
  isDarkMode
}) => {
  const currentVarMeta = variables[selectedVariable];

  const getVarIcon = (key: string) => {
    switch (key) {
      case 'sst': return <Thermometer className="w-3.5 h-3.5 text-rose-500" />;
      case 'sss': return <Droplets className="w-3.5 h-3.5 text-emerald-500" />;
      case 'ssh': return <Waves className="w-3.5 h-3.5 text-cyan-500" />;
      case 'winds': return <Wind className="w-3.5 h-3.5 text-violet-500" />;
      case 'currents': return <Compass className="w-3.5 h-3.5 text-blue-500" />;
      case 'temp_depth': return <Activity className="w-3.5 h-3.5 text-amber-500" />;
      case 'z20': return <Sparkles className="w-3.5 h-3.5 text-indigo-500" />;
      case 'mld': return <Waves className="w-3.5 h-3.5 text-teal-500" />;
      default: return <Activity className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  const surfaceVars = ['sst', 'sss', 'ssh', 'winds', 'currents'];
  const subsurfaceVars = ['temp_depth'];
  const diagnosticVars = ['z20', 'mld', 'ohc'];

  return (
    <div className={`p-4 rounded-lg border transition-colors space-y-4 ${
      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-bold uppercase tracking-wide">Data Parameter Selection</h2>
        <span className={`text-xs px-2 py-0.5 rounded font-mono ${
          isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
        }`}>
          0.25° Daily
        </span>
      </div>

      {/* Surface Inputs */}
      <div className="space-y-1.5">
        <label className={`text-xs font-semibold uppercase tracking-wider block ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          1. Satellite Surface Inputs (Inputs):
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {surfaceVars.map((key) => {
            const meta = variables[key];
            if (!meta) return null;
            const isSelected = selectedVariable === key;
            return (
              <button
                key={key}
                onClick={() => onSelectVariable(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-700 border-blue-700 text-white font-bold shadow-xs'
                    : isDarkMode
                      ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {getVarIcon(key)}
                <span className="truncate">{meta.short_name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subsurface Ocean Target */}
      <div className="space-y-1.5">
        <label className={`text-xs font-semibold uppercase tracking-wider block ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          2. Subsurface Reanalysis (Target):
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {subsurfaceVars.map((key) => {
            const meta = variables[key];
            if (!meta) return null;
            const isSelected = selectedVariable === key;
            return (
              <button
                key={key}
                onClick={() => onSelectVariable(key)}
                className={`flex items-center justify-between px-3 py-1.5 rounded border text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-700 border-blue-700 text-white font-bold shadow-xs'
                    : isDarkMode
                      ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {getVarIcon(key)}
                  <span>{meta.name} (GLORYS12V1)</span>
                </div>
                <span className="font-mono text-[11px] opacity-85">z = {selectedDepth}m</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Standard Depth Level Selector (Active if temp_depth is selected) */}
      {selectedVariable === 'temp_depth' && (
        <div className={`p-2.5 rounded-md border space-y-2 ${
          isDarkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-blue-50/50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-blue-600 dark:text-blue-400">Depth Level Slicing (m):</span>
            <span className="font-mono font-bold text-sm text-blue-700 dark:text-blue-300">{selectedDepth} meters</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {standardDepths.map((d) => {
              const isDepSelected = selectedDepth === d;
              return (
                <button
                  key={d}
                  onClick={() => onSelectDepth(d)}
                  className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                    isDepSelected
                      ? 'bg-blue-700 text-white font-bold'
                      : isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {d}m
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Oceanographic Diagnostics */}
      <div className="space-y-1.5">
        <label className={`text-xs font-semibold uppercase tracking-wider block ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          3. Ocean Physics Diagnostics:
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {diagnosticVars.map((key) => {
            const meta = variables[key];
            if (!meta) return null;
            const isSelected = selectedVariable === key;
            return (
              <button
                key={key}
                onClick={() => onSelectVariable(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-700 border-blue-700 text-white font-bold shadow-xs'
                    : isDarkMode
                      ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {getVarIcon(key)}
                <span className="truncate">{meta.short_name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Colormap Selector & Colorbar Legend */}
      <div className="space-y-2 border-t pt-3 border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-xs">
          <label className={`font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Colormap Palette:
          </label>
          <select
            value={selectedColormap}
            onChange={(e) => onSelectColormap(e.target.value as ColormapType)}
            className={`text-xs px-2 py-1 rounded border font-medium cursor-pointer ${
              isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            {COLORMAPS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Colorbar Scale Preview */}
        <div className="space-y-1">
          <div
            className="w-full h-3 rounded shadow-inner border border-slate-300 dark:border-slate-700"
            style={{ background: getCssGradient(selectedColormap) }}
          />
          {stats && (
            <div className="flex justify-between text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400">
              <span>Min: {stats.min} {stats.unit}</span>
              <span>Mean: {stats.mean} {stats.unit}</span>
              <span>Max: {stats.max} {stats.unit}</span>
            </div>
          )}
        </div>
      </div>

      {/* Variable Description Box */}
      {currentVarMeta && (
        <div className={`p-2.5 rounded text-xs border ${
          isDarkMode ? 'bg-slate-900/50 border-slate-700/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div className="font-semibold text-slate-900 dark:text-slate-200 mb-0.5">
            {currentVarMeta.name} ({currentVarMeta.unit})
          </div>
          <div>{currentVarMeta.description}</div>
          <div className="mt-1 text-[10px] text-blue-600 dark:text-blue-400">
            Source: {currentVarMeta.source}
          </div>
        </div>
      )}
    </div>
  );
};
