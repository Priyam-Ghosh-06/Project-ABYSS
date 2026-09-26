import React from 'react';
import { X, Database, Globe } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  isDarkMode
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border shadow-xl p-6 space-y-5 transition-colors ${
        isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-700 text-white font-bold flex items-center justify-center text-base shadow-sm">
              OE
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">OceanEmbed Framework</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-semibold">
                  PS ID: 26066
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ministry of Earth Sciences (MoES) • INCOIS Ocean Valley
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Problem Statement Summary */}
        <div className="space-y-2 text-xs leading-relaxed">
          <h3 className="font-bold text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Globe className="w-4 h-4" /> Problem Statement & Objective
          </h3>
          <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
            Subsurface ocean temperature is a fundamental variable for understanding ocean circulation,
            marine heatwaves, upper-ocean heat content, tropical cyclogenesis, and fisheries. While direct measurements
            (ARGO floats, buoys) are sparse in space and time, satellite observations provide continuous, large-scale
            surface monitoring.
          </p>
          <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
            <strong>OceanEmbed</strong> reconstructs depth-wise 3D subsurface temperature from daily surface satellite
            observations at 0.25° spatial resolution across the North Indian Ocean domain (5°N to 30°N and 45°E to 105°E).
          </p>
        </div>

        {/* Harmonized Data Sources Table */}
        <div className="space-y-2 text-xs">
          <h3 className="font-bold text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Database className="w-4 h-4" /> Harmonized Datasets & Resolution
          </h3>
          <div className="border rounded-lg overflow-hidden border-slate-200 dark:border-slate-700">
            <table className="w-full text-left">
              <thead className={`text-[11px] font-bold uppercase ${
                isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}>
                <tr>
                  <th className="p-2">Variable</th>
                  <th className="p-2">Satellite Product</th>
                  <th className="p-2">Native Res.</th>
                  <th className="p-2">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-mono text-[11px]">
                <tr>
                  <td className="p-2 font-semibold">SST</td>
                  <td className="p-2">OSTIA (UK Met Office)</td>
                  <td className="p-2">0.05°, Daily</td>
                  <td className="p-2 text-emerald-600 dark:text-emerald-400">Input</td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold">SSS</td>
                  <td className="p-2">SMAP / SMOS Multi-Mission</td>
                  <td className="p-2">0.125°, Daily</td>
                  <td className="p-2 text-emerald-600 dark:text-emerald-400">Input</td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold">SSH / SLA</td>
                  <td className="p-2">DUACS Altimetry</td>
                  <td className="p-2">0.25°, Daily</td>
                  <td className="p-2 text-emerald-600 dark:text-emerald-400">Input</td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold">Winds</td>
                  <td className="p-2">CCMP V3.1 10m Winds</td>
                  <td className="p-2">0.25°, Daily</td>
                  <td className="p-2 text-emerald-600 dark:text-emerald-400">Input</td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold">Currents</td>
                  <td className="p-2">OSCAR Ocean Currents</td>
                  <td className="p-2">0.25°, Daily</td>
                  <td className="p-2 text-emerald-600 dark:text-emerald-400">Input</td>
                </tr>
                <tr className="bg-blue-50/50 dark:bg-blue-950/30">
                  <td className="p-2 font-bold text-blue-600 dark:text-blue-400">Target T(z)</td>
                  <td className="p-2 font-bold">GLORYS12V1 Reanalysis</td>
                  <td className="p-2 font-bold">0.083°, 35 Depths</td>
                  <td className="p-2 font-bold text-blue-600 dark:text-blue-400">Target (0–1000m)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Standard Depth Levels */}
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-slate-700 dark:text-slate-300">
            Standard Output Depth Levels (15 levels):
          </h4>
          <div className="p-2 rounded bg-slate-100 dark:bg-slate-900 font-mono text-[11px] text-blue-600 dark:text-blue-400">
            0m, 5m, 10m, 20m, 30m, 50m, 75m, 100m, 125m, 150m, 200m, 300m, 500m, 700m, 1000m
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
