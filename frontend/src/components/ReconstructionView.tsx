import React, { useRef, useEffect, useState } from 'react';
import type { ReconstructionResponse } from '../lib/types';
import type { ColormapType } from '../lib/colormaps';
import { interpolateColor } from '../lib/colormaps';
import { Cpu, Layers, Eye } from 'lucide-react';

interface ReconstructionViewProps {
  reconData: ReconstructionResponse | null;
  selectedDepth: number;
  onSelectDepth: (depth: number) => void;
  standardDepths: number[];
  isDarkMode: boolean;
  isLoading: boolean;
}

export const ReconstructionView: React.FC<ReconstructionViewProps> = ({
  reconData,
  selectedDepth,
  onSelectDepth,
  standardDepths,
  isDarkMode,
  isLoading
}) => {
  const [showErrorMap, setShowErrorMap] = useState<boolean>(true);

  const gtCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const reconCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const errCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawGrid = (
    canvas: HTMLCanvasElement | null,
    grid: (number | null)[][],
    minVal: number,
    maxVal: number,
    cmap: ColormapType
  ) => {
    if (!canvas || !grid) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const rows = grid.length;
    const cols = grid[0].length;

    const cellW = width / cols;
    const cellH = height / rows;
    const range = maxVal - minVal > 0.01 ? maxVal - minVal : 1.0;

    ctx.fillStyle = isDarkMode ? '#1e293b' : '#cbd5e1';
    ctx.fillRect(0, 0, width, height);

    for (let r = 0; r < rows; r++) {
      const drawY = height - (r + 1) * cellH;
      const rowData = grid[r];
      for (let c = 0; c < cols; c++) {
        const val = rowData[c];
        if (val !== null && !isNaN(val)) {
          const norm = (val - minVal) / range;
          const [red, green, blue] = interpolateColor(norm, cmap);
          ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
          ctx.fillRect(c * cellW, drawY, cellW + 0.5, cellH + 0.5);
        }
      }
    }
  };

  useEffect(() => {
    if (!reconData) return;

    const minT = reconData.min_val;
    const maxT = reconData.max_val;

    drawGrid(gtCanvasRef.current, reconData.ground_truth_grid, minT, maxT, 'turbo');
    drawGrid(reconCanvasRef.current, reconData.reconstructed_grid, minT, maxT, 'turbo');

    if (showErrorMap) {
      drawGrid(errCanvasRef.current, reconData.error_map_grid, -0.4, 0.4, 'coolwarm');
    }
  }, [reconData, showErrorMap, isDarkMode]);

  return (
    <div className={`p-4 rounded-lg border transition-colors space-y-4 ${
      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            AI Subsurface Temperature Reconstruction (Problem Statement 26066)
          </h3>
          {reconData?.split && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                reconData.split === 'train'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : reconData.split === 'val'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              }`}
            >
              {reconData.split === 'train'
                ? 'Train Partition (Jan - Aug)'
                : reconData.split === 'val'
                  ? 'Validation Partition (Sep - Oct)'
                  : 'Test Partition (Nov - Dec)'}
            </span>
          )}
        </div>

        {/* Error Map Toggle */}
        <button
          onClick={() => setShowErrorMap(!showErrorMap)}
          className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
            showErrorMap
              ? 'bg-blue-700 border-blue-700 text-white shadow-xs'
              : isDarkMode
                ? 'bg-slate-700 border-slate-600 text-slate-300'
                : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showErrorMap ? 'Hide Error Map (ΔT)' : 'Show Error Map (ΔT)'}</span>
        </button>
      </div>

      {/* Target Depth Selection */}
      <div className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs ${
        isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
      }`}>
        <span className="font-semibold flex items-center gap-1 text-blue-600 dark:text-blue-400">
          <Layers className="w-3.5 h-3.5" /> Evaluation Depth Level:
        </span>
        <div className="flex flex-wrap gap-1">
          {standardDepths.map((d) => (
            <button
              key={d}
              onClick={() => onSelectDepth(d)}
              className={`px-2.5 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                selectedDepth === d
                  ? 'bg-blue-700 text-white font-bold'
                  : isDarkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
              }`}
            >
              {d}m
            </button>
          ))}
        </div>
      </div>

      {/* Main Vertical Column Layout: Target & Predicted Stacked */}
      <div className="space-y-4 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center text-white text-xs font-semibold z-10 rounded-lg">
            Evaluating deep learning model...
          </div>
        )}

        {/* 1. Target (Ground Truth) */}
        <div className={`p-3 rounded-lg border space-y-2 ${
          isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
              1. Target Ground Truth (GLORYS Reanalysis)
            </span>
            <span className="font-mono text-slate-500">Depth: z = {selectedDepth}m</span>
          </div>
          <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 aspect-[241/101]">
            <canvas ref={gtCanvasRef} width={964} height={404} className="w-full h-full block" />
          </div>
        </div>

        {/* 2. Predicted (AI Reconstruction) */}
        <div className={`p-3 rounded-lg border space-y-2 ${
          isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
              2. Predicted Subsurface Temperature (AI Reconstruction)
            </span>
            <span className="font-mono text-slate-500">Depth: z = {selectedDepth}m</span>
          </div>
          <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 aspect-[241/101]">
            <canvas ref={reconCanvasRef} width={964} height={404} className="w-full h-full block" />
          </div>
        </div>

        {/* 3. Error Difference Map (Optional / Toggled) */}
        {showErrorMap && (
          <div className={`p-3 rounded-lg border space-y-2 ${
            isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">
                3. Residual Error Map: ΔT = T_predicted - T_target (°C)
              </span>
              <span className="font-mono text-slate-500">Scale: -0.4°C (Blue) to +0.4°C (Red)</span>
            </div>
            <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 aspect-[241/101]">
              <canvas ref={errCanvasRef} width={964} height={404} className="w-full h-full block" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
