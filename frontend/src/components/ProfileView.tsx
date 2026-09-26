import React, { useEffect, useState } from 'react';
import type { ProfileResponse } from '../lib/types';
import { Activity, Thermometer, Droplets, Waves, Wind, Compass, Sparkles } from 'lucide-react';

interface ProfileViewProps {
  profileData: ProfileResponse | null;
  selectedLat: number;
  selectedLon: number;
  onSelectCoordinate: (lat: number, lon: number) => void;
  isDarkMode: boolean;
  isLoading: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profileData,
  selectedLat,
  selectedLon,
  onSelectCoordinate,
  isDarkMode,
  isLoading
}) => {
  const [latInput, setLatInput] = useState<number>(selectedLat);
  const [lonInput, setLonInput] = useState<number>(selectedLon);

  useEffect(() => {
    setLatInput(selectedLat);
    setLonInput(selectedLon);
  }, [selectedLat, selectedLon]);

  const handleApplyCoord = (e: React.FormEvent) => {
    e.preventDefault();
    onSelectCoordinate(latInput, lonInput);
  };

  const profile = profileData?.profile || [];
  const validPoints = profile.filter(p => p.temperature !== null);

  const svgWidth = 500;
  const svgHeight = 360;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const minTemp = 5.0;
  const maxTemp = 32.0;

  const getX = (t: number) => padLeft + ((t - minTemp) / (maxTemp - minTemp)) * plotW;
  const getY = (d: number) => padTop + (d / 1000.0) * plotH;

  const linePoints = validPoints.map(p => `${getX(p.temperature!)} ${getY(p.depth)}`).join(' L ');
  const pathD = linePoints.length > 0 ? `M ${linePoints}` : '';

  return (
    <div className={`p-4 rounded-lg border transition-colors space-y-4 ${
      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Vertical Temperature Profile (T-D Sounding Curve)
            {isLoading && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                updating...
              </span>
            )}
          </h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Direct vertical water column sounding from surface down to 1000 meters depth.
          </p>
        </div>

        {/* Coordinate Input Form */}
        <form onSubmit={handleApplyCoord} className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-500">Lat:</span>
            <input
              type="number"
              step="0.25"
              min="5"
              max="30"
              value={latInput}
              onChange={(e) => setLatInput(parseFloat(e.target.value))}
              className={`w-16 px-2 py-1 rounded border font-mono ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
            <span>°N</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-500">Lon:</span>
            <input
              type="number"
              step="0.25"
              min="45"
              max="105"
              value={lonInput}
              onChange={(e) => setLonInput(parseFloat(e.target.value))}
              className={`w-16 px-2 py-1 rounded border font-mono ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
            <span>°E</span>
          </div>

          <button
            type="submit"
            className="px-3 py-1 rounded bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
          >
            Probe
          </button>
        </form>
      </div>

      {/* Main Content Grid: Sounding Curve + Station Parameter Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* SVG Sounding Chart (7 cols) */}
        <div className={`lg:col-span-7 p-3 rounded-lg border relative ${
          isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-xs font-bold text-center mb-1 text-slate-600 dark:text-slate-300">
            Temperature (°C) vs Depth (meters)
          </div>

          <div className="relative aspect-[500/360] w-full">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
              {[5, 10, 15, 20, 25, 30].map(t => {
                const x = getX(t);
                return (
                  <g key={t}>
                    <line
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={svgHeight - padBottom}
                      stroke={isDarkMode ? '#334155' : '#cbd5e1'}
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={svgHeight - padBottom + 16}
                      fill={isDarkMode ? '#94a3b8' : '#64748b'}
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {t}°
                    </text>
                  </g>
                );
              })}

              {[0, 100, 200, 300, 500, 750, 1000].map(d => {
                const y = getY(d);
                return (
                  <g key={d}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke={isDarkMode ? '#334155' : '#cbd5e1'}
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 6}
                      y={y + 3}
                      fill={isDarkMode ? '#94a3b8' : '#64748b'}
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {d}m
                    </text>
                  </g>
                );
              })}

              {profileData?.thermocline_z20 && (
                <g>
                  <line
                    x1={padLeft}
                    y1={getY(profileData.thermocline_z20)}
                    x2={svgWidth - padRight}
                    y2={getY(profileData.thermocline_z20)}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  <text
                    x={svgWidth - padRight - 4}
                    y={getY(profileData.thermocline_z20) - 4}
                    fill="#f59e0b"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="end"
                  >
                    Z20 = {profileData.thermocline_z20}m
                  </text>
                </g>
              )}

              {profileData?.mixed_layer_depth && (
                <g>
                  <line
                    x1={padLeft}
                    y1={getY(profileData.mixed_layer_depth)}
                    x2={svgWidth - padRight}
                    y2={getY(profileData.mixed_layer_depth)}
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={padLeft + 6}
                    y={getY(profileData.mixed_layer_depth) - 4}
                    fill="#06b6d4"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    MLD = {profileData.mixed_layer_depth}m
                  </text>
                </g>
              )}

              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {validPoints.map(p => (
                <circle
                  key={p.depth}
                  cx={getX(p.temperature!)}
                  cy={getY(p.depth)}
                  r="3.5"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Station Parameters */}
        <div className="lg:col-span-5 space-y-3">
          <div className={`p-3 rounded-lg border ${
            isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-700 dark:text-slate-300">
              Station Parameters ({selectedLat.toFixed(2)}°N, {selectedLon.toFixed(2)}°E)
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-rose-500" /> Surface SST
                </div>
                <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                  {profileData?.surface_sst !== null ? `${profileData?.surface_sst}°C` : 'N/A'}
                </div>
              </div>

              <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-emerald-500" /> Salinity (SSS)
                </div>
                <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {profileData?.surface_sss !== null ? `${profileData?.surface_sss} PSU` : 'N/A'}
                </div>
              </div>

              <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Waves className="w-3 h-3 text-cyan-500" /> Sea Level (SLA)
                </div>
                <div className="text-base font-bold font-mono text-cyan-600 dark:text-cyan-400">
                  {profileData?.surface_ssh !== null ? `${profileData?.surface_ssh} m` : 'N/A'}
                </div>
              </div>

              <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Wind className="w-3 h-3 text-violet-500" /> Wind Speed (10m)
                </div>
                <div className="text-base font-bold font-mono text-violet-600 dark:text-violet-400">
                  {profileData?.wind_speed !== null ? `${profileData?.wind_speed} m/s` : 'N/A'}
                </div>
              </div>

              <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-blue-500" /> Surface Current
                </div>
                <div className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                  {profileData?.current_speed !== null ? `${profileData?.current_speed} m/s` : 'N/A'}
                </div>
              </div>

              <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Z20 Thermocline
                </div>
                <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                  {profileData?.thermocline_z20 !== null ? `${profileData?.thermocline_z20} m` : 'N/A'}
                </div>
              </div>

              <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Waves className="w-3 h-3 text-teal-500" /> Mixed Layer Depth
                </div>
                <div className="text-base font-bold font-mono text-teal-600 dark:text-teal-400">
                  {profileData?.mixed_layer_depth !== null ? `${profileData?.mixed_layer_depth} m` : 'N/A'}
                </div>
              </div>

              <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-indigo-500" /> Heat Content (100m)
                </div>
                <div className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {profileData?.ocean_heat_content !== null ? `${profileData?.ocean_heat_content} GJ/m²` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
