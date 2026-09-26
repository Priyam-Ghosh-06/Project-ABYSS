import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { TransectResponse } from '../lib/types';
import type { ColormapType } from '../lib/colormaps';
import { interpolateColor } from '../lib/colormaps';
import { Sliders, Sparkles, Waves } from 'lucide-react';

interface TransectViewProps {
  transectData: TransectResponse | null;
  colormap: ColormapType;
  sliceType: 'zonal' | 'meridional';
  onSliceTypeChange: (type: 'zonal' | 'meridional') => void;
  coordVal: number;
  onCoordValChange: (val: number) => void;
  isDarkMode: boolean;
  isLoading: boolean;
}

export const TransectView: React.FC<TransectViewProps> = ({
  transectData,
  colormap,
  sliceType,
  onSliceTypeChange,
  coordVal,
  onCoordValChange,
  isDarkMode,
  isLoading
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showZ20, setShowZ20] = useState<boolean>(true);
  const [showMLD, setShowMLD] = useState<boolean>(true);
  const [hoverData, setHoverData] = useState<{ xCoord: number; depth: number; temp: number | null; z20: number | null; mld: number | null } | null>(null);

  const drawTransect = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !transectData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const grid = transectData.grid;
    const depths = transectData.depths;
    const xCoords = transectData.x_coords;

    const numDepths = depths.length;
    const numX = xCoords.length;

    const minT = transectData.min;
    const maxT = transectData.max;
    const range = maxT - minT > 0.01 ? maxT - minT : 1.0;

    ctx.fillStyle = isDarkMode ? '#0f172a' : '#e2e8f0';
    ctx.fillRect(0, 0, width, height);

    const padLeft = 45;
    const padBottom = 30;
    const padTop = 15;
    const padRight = 15;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    for (let d = 0; d < numDepths - 1; d++) {
      const zTop = depths[d];
      const zBot = depths[d + 1];
      const y1 = padTop + (zTop / 1000.0) * plotH;
      const y2 = padTop + (zBot / 1000.0) * plotH;
      const cellH = Math.max(1, y2 - y1);

      for (let x = 0; x < numX; x++) {
        const val = grid[d]?.[x];
        const x1 = padLeft + (x / numX) * plotW;
        const cellW = (1.0 / numX) * plotW;

        if (val !== null && !isNaN(val)) {
          const norm = (val - minT) / range;
          const [r, g, b] = interpolateColor(norm, colormap);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x1, y1, cellW + 0.5, cellH + 0.5);
        } else {
          ctx.fillStyle = isDarkMode ? '#1e293b' : '#94a3b8';
          ctx.fillRect(x1, y1, cellW + 0.5, cellH + 0.5);
        }
      }
    }

    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 0.5;
    const standardTickDepths = [0, 100, 200, 500, 750, 1000];

    standardTickDepths.forEach((d) => {
      const y = padTop + (d / 1000.0) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${d}m`, padLeft - 6, y + 3);
    });

    const xStep = sliceType === 'zonal' ? 10 : 5;
    const xMin = xCoords[0];
    const xMax = xCoords[xCoords.length - 1];

    for (let v = Math.ceil(xMin / xStep) * xStep; v <= xMax; v += xStep) {
      const norm = (v - xMin) / (xMax - xMin);
      const x = padLeft + norm * plotW;

      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();

      ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${v}°`, x, height - padBottom + 14);
    }

    if (showZ20 && transectData.z20_profile) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      let started = false;

      for (let x = 0; x < numX; x++) {
        const z20Val = transectData.z20_profile[x];
        const px = padLeft + (x / numX) * plotW;
        if (z20Val !== null && !isNaN(z20Val)) {
          const py = padTop + (z20Val / 1000.0) * plotH;
          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (showMLD && transectData.mld_profile) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      let started = false;

      for (let x = 0; x < numX; x++) {
        const mldVal = transectData.mld_profile[x];
        const px = padLeft + (x / numX) * plotW;
        if (mldVal !== null && !isNaN(mldVal)) {
          const py = padTop + (mldVal / 1000.0) * plotH;
          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [transectData, colormap, showZ20, showMLD, isDarkMode, sliceType]);

  useEffect(() => {
    drawTransect();
  }, [drawTransect]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !transectData) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const padLeft = 45;
    const padBottom = 30;
    const padTop = 15;
    const padRight = 15;

    const plotW = canvas.width - padLeft - padRight;
    const plotH = canvas.height - padTop - padBottom;

    if (x < padLeft || x > canvas.width - padRight || y < padTop || y > canvas.height - padBottom) {
      setHoverData(null);
      return;
    }

    const normX = (x - padLeft) / plotW;
    const depth = Math.round(((y - padTop) / plotH) * 1000);

    const xCoords = transectData.x_coords;
    const xIdx = Math.max(0, Math.min(xCoords.length - 1, Math.floor(normX * xCoords.length)));
    const actualX = xCoords[xIdx];

    const dIdx = transectData.depths.reduce((prev, curr, idx) => {
      const prevDiff = Math.abs(transectData.depths[prev] - depth);
      const currDiff = Math.abs(curr - depth);
      return currDiff < prevDiff ? idx : prev;
    }, 0);

    const temp = transectData.grid[dIdx]?.[xIdx] ?? null;
    const z20 = transectData.z20_profile?.[xIdx] ?? null;
    const mld = transectData.mld_profile?.[xIdx] ?? null;

    setHoverData({ xCoord: actualX, depth, temp, z20, mld });
  };

  return (
    <div className={`p-4 rounded-lg border transition-colors space-y-3 ${
      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Vertical Ocean Transect Curtain (0 – 1000m)
          </h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Cross-sectional subsurface thermal stratification, thermocline slope, and mixed layer depth.
          </p>
        </div>

        {/* Slice Type Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onSliceTypeChange('zonal');
              onCoordValChange(12.0);
            }}
            className={`px-3 py-1 rounded text-xs font-semibold border transition-colors cursor-pointer ${
              sliceType === 'zonal'
                ? 'bg-blue-700 border-blue-700 text-white shadow-xs'
                : isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-slate-300'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            Zonal (East-West Curtain)
          </button>
          <button
            onClick={() => {
              onSliceTypeChange('meridional');
              onCoordValChange(88.0);
            }}
            className={`px-3 py-1 rounded text-xs font-semibold border transition-colors cursor-pointer ${
              sliceType === 'meridional'
                ? 'bg-blue-700 border-blue-700 text-white shadow-xs'
                : isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-slate-300'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            Meridional (North-South Curtain)
          </button>
        </div>
      </div>

      {/* Coordinate Slider Bar */}
      <div className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-4 text-xs ${
        isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <span className="font-semibold whitespace-nowrap">
            {sliceType === 'zonal' ? 'Fixed Latitude:' : 'Fixed Longitude:'}
          </span>
          <input
            type="range"
            min={sliceType === 'zonal' ? '5.0' : '45.0'}
            max={sliceType === 'zonal' ? '30.0' : '105.0'}
            step="0.25"
            value={coordVal}
            onChange={(e) => onCoordValChange(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded appearance-none cursor-pointer bg-slate-300 dark:bg-slate-700 accent-blue-600"
          />
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm whitespace-nowrap">
            {coordVal.toFixed(2)}{sliceType === 'zonal' ? '°N' : '°E'}
          </span>
        </div>

        {/* Physics Line Overlays */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs">
            <input
              type="checkbox"
              checked={showZ20}
              onChange={(e) => setShowZ20(e.target.checked)}
              className="rounded accent-amber-500"
            />
            <span className="text-amber-500 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Z20 Thermocline
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs">
            <input
              type="checkbox"
              checked={showMLD}
              onChange={(e) => setShowMLD(e.target.checked)}
              className="rounded accent-cyan-500"
            />
            <span className="text-cyan-500 font-semibold flex items-center gap-1">
              <Waves className="w-3 h-3" /> MLD
            </span>
          </label>
        </div>
      </div>

      {/* Main Canvas Chart */}
      <div className="relative rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 aspect-[16/7]">
        <canvas
          ref={canvasRef}
          width={900}
          height={380}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverData(null)}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center text-white text-xs font-semibold">
            Loading transect curtain...
          </div>
        )}

        {/* Floating Probe HUD */}
        {hoverData && (
          <div className="absolute top-3 left-12 bg-slate-900/90 border border-slate-700 text-white text-xs px-3 py-2 rounded shadow-md font-mono space-y-1">
            <div className="text-slate-300">
              {sliceType === 'zonal' ? 'Longitude' : 'Latitude'}: <span className="font-bold text-white">{hoverData.xCoord.toFixed(2)}°</span> | Depth: <span className="font-bold text-white">{hoverData.depth}m</span>
            </div>
            <div className="font-bold text-emerald-400">
              Temperature: {hoverData.temp !== null ? `${hoverData.temp}°C` : 'N/A (Seafloor)'}
            </div>
            {hoverData.z20 !== null && (
              <div className="text-amber-400 text-[11px]">
                Z20 Thermocline: {hoverData.z20}m
              </div>
            )}
            {hoverData.mld !== null && (
              <div className="text-cyan-400 text-[11px]">
                Mixed Layer Depth: {hoverData.mld}m
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
