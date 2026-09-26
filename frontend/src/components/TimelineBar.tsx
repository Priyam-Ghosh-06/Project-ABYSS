import React, { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Calendar, HardDrive } from 'lucide-react';
import { api } from '../lib/api';

interface TimelineBarProps {
  dates: string[];
  currentDate: string;
  onDateChange: (date: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  selectedVariable: string;
  selectedDepth: number;
  activeView: string;
  sliceType: 'zonal' | 'meridional';
  transectCoordVal: number;
  isDarkMode: boolean;
}

const BENCHMARKS = [
  { date: '2018-01-15', label: 'Winter NE Monsoon', tag: 'Cooling / Convection' },
  { date: '2018-04-15', label: 'Pre-Monsoon Peak', tag: 'Warm Pool > 30°C' },
  { date: '2018-07-15', label: 'Summer SW Monsoon', tag: 'Somali Upwelling & Z20 Rise' },
  { date: '2018-10-15', label: 'Post-Monsoon', tag: 'Freshwater Plume & Cyclones' }
];

export const TimelineBar: React.FC<TimelineBarProps> = ({
  dates,
  currentDate,
  onDateChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
  selectedVariable,
  selectedDepth,
  activeView,
  sliceType,
  transectCoordVal,
  isDarkMode
}) => {
  const currentIndex = dates.indexOf(currentDate);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const timerRef = useRef<number | null>(null);

  // Playback timer loop
  useEffect(() => {
    if (isPlaying && dates.length > 0) {
      const intervalMs = Math.max(120, Math.floor(1000 / playbackSpeed));
      timerRef.current = window.setInterval(() => {
        const nextIdx = (safeIndex + 1) % dates.length;
        onDateChange(dates[nextIdx]);
      }, intervalMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, safeIndex, dates, playbackSpeed, onDateChange]);

  const handleStep = (delta: number) => {
    if (dates.length === 0) return;
    const nextIdx = Math.max(0, Math.min(dates.length - 1, safeIndex + delta));
    onDateChange(dates[nextIdx]);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (dates[idx]) {
      onDateChange(dates[idx]);
    }
  };

  // Check how many frames ahead/behind are buffered in memory
  let bufferedCount = 0;
  for (let i = Math.max(0, safeIndex - 3); i <= Math.min(dates.length - 1, safeIndex + 8); i++) {
    if (api.isDateBuffered(dates[i], selectedVariable, selectedDepth, activeView, sliceType, transectCoordVal)) {
      bufferedCount++;
    }
  }

  return (
    <div className={`border-t transition-colors ${
      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
        {/* Main Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Player controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleStep(-1)}
              className={`p-2 rounded border transition-colors cursor-pointer ${
                isDarkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
              }`}
              title="Previous Day"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={onTogglePlay}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold text-xs transition-colors shadow-sm cursor-pointer ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-blue-700 hover:bg-blue-800 text-white'
              }`}
              title={isPlaying ? 'Pause Slideshow' : 'Play Slideshow (Auto-advance with Pre-buffered frames)'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
            </button>

            <button
              onClick={() => handleStep(1)}
              className={`p-2 rounded border transition-colors cursor-pointer ${
                isDarkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
              }`}
              title="Next Day"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 ml-2 text-xs font-medium">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Speed:</span>
              {[1, 2, 5, 10].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onSpeedChange(spd)}
                  className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-blue-700 text-white font-bold'
                      : isDarkMode
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Buffer Status & Date Picker */}
          <div className="flex items-center gap-3">
            {/* Sliding Window Buffer Pill */}
            <div className={`hidden sm:flex items-center gap-1 text-[11px] px-2.5 py-1 rounded border font-mono ${
              isDarkMode ? 'bg-slate-900 border-slate-700 text-emerald-400' : 'bg-slate-50 border-slate-200 text-emerald-700'
            }`} title="Sliding window pre-buffer keeps upcoming frames in memory for smooth playback">
              <HardDrive className="w-3 h-3 text-emerald-500" />
              <span>Buffer: {bufferedCount} ready</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <input
                type="date"
                min="2018-01-01"
                max="2018-12-31"
                value={currentDate || '2018-01-01'}
                onChange={(e) => e.target.value && onDateChange(e.target.value)}
                className={`text-xs font-mono px-2 py-1 rounded border font-medium cursor-pointer ${
                  isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Day {safeIndex + 1} / {dates.length || 365}
            </span>
          </div>
        </div>

        {/* Scrub Slider */}
        <div className="w-full flex items-center gap-3">
          <input
            type="range"
            min="0"
            max={Math.max(0, dates.length - 1)}
            value={safeIndex}
            onChange={handleSliderChange}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-blue-600"
          />
        </div>

        {/* Seasonal Benchmark Jump Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Monsoon Seasons:
          </span>
          {BENCHMARKS.map((bm) => {
            const isSelected = currentDate === bm.date;
            return (
              <button
                key={bm.date}
                onClick={() => onDateChange(bm.date)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-700 border-blue-700 text-white font-semibold shadow-xs'
                    : isDarkMode
                      ? 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="font-medium">{bm.label}</span>
                <span className="ml-1 text-[10px] opacity-75">({bm.tag})</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
