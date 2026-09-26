import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { SurfaceDataResponse } from '../lib/types';
import type { ColormapType } from '../lib/colormaps';
import { interpolateColor } from '../lib/colormaps';
import { Crosshair, Wind, Compass, MapPin, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Map2DViewProps {
  data: SurfaceDataResponse | null;
  colormap: ColormapType;
  selectedLat: number;
  selectedLon: number;
  onSelectCoordinate: (lat: number, lon: number) => void;
  isDarkMode: boolean;
  isLoading: boolean;
}

const REGIONS = [
  { name: 'Full Basin', lat: 17.5, lon: 75.0, zoom: 1.0 },
  { name: 'Bay of Bengal', lat: 14.0, lon: 88.0, zoom: 2.2 },
  { name: 'Arabian Sea', lat: 15.0, lon: 65.0, zoom: 2.2 },
  { name: 'Equatorial Ocean', lat: 5.5, lon: 78.0, zoom: 2.0 },
  { name: 'Somali Upwelling', lat: 9.0, lon: 52.0, zoom: 2.5 },
  { name: 'Andaman Sea', lat: 11.0, lon: 95.0, zoom: 2.5 }
];

export const Map2DView: React.FC<Map2DViewProps> = ({
  data,
  colormap,
  selectedLat,
  selectedLon,
  onSelectCoordinate,
  isDarkMode,
  isLoading
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<{ x: number; y: number; age: number; maxAge: number }[]>([]);

  // Interactive Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1.0);
  const [centerLon, setCenterLon] = useState<number>(75.0); // 45 to 105
  const [centerLat, setCenterLat] = useState<number>(17.5); // 5 to 30

  const isDraggingRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number; centerLon: number; centerLat: number }>({
    x: 0,
    y: 0,
    centerLon: 75.0,
    centerLat: 17.5
  });
  const hasMovedRef = useRef<boolean>(false);

  const [hoverInfo, setHoverInfo] = useState<{ lat: number; lon: number; val: number | null } | null>(null);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Initialize animated vector particles
  useEffect(() => {
    const numParticles = 400;
    particlesRef.current = Array.from({ length: numParticles }, () => ({
      x: Math.random() * 240,
      y: Math.random() * 100,
      age: Math.floor(Math.random() * 40),
      maxAge: 30 + Math.floor(Math.random() * 30)
    }));
  }, []);

  // Helper to convert geographic (lat, lon) to canvas pixel (x, y) with current zoom and pan
  const geoToPixel = useCallback((lat: number, lon: number, width: number, height: number) => {
    const spanLon = 60.0 / zoom;
    const spanLat = 25.0 / zoom;

    const minLon = centerLon - spanLon / 2;
    const minLat = centerLat - spanLat / 2;

    const px = ((lon - minLon) / spanLon) * width;
    const py = height - ((lat - minLat) / spanLat) * height;

    return { px, py };
  }, [zoom, centerLon, centerLat]);

  // Helper to convert canvas pixel (x, y) to geographic (lat, lon)
  const pixelToGeo = useCallback((px: number, py: number, width: number, height: number) => {
    const spanLon = 60.0 / zoom;
    const spanLat = 25.0 / zoom;

    const minLon = centerLon - spanLon / 2;
    const minLat = centerLat - spanLat / 2;

    const lon = minLon + (px / width) * spanLon;
    const lat = minLat + (1.0 - py / height) * spanLat;

    return {
      lat: Math.round(lat * 4) / 4,
      lon: Math.round(lon * 4) / 4
    };
  }, [zoom, centerLon, centerLat]);

  // Main canvas draw loop
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const grid = data.grid;
    const rows = grid.length; // 101
    const cols = grid[0].length; // 241

    const min = data.min;
    const max = data.max;
    const range = max - min > 1e-5 ? max - min : 1.0;

    // Clear background (Land color)
    ctx.fillStyle = isDarkMode ? '#1e293b' : '#cbd5e1';
    ctx.fillRect(0, 0, width, height);

    const spanLon = 60.0 / zoom;
    const spanLat = 25.0 / zoom;
    const minLon = centerLon - spanLon / 2;
    const maxLon = centerLon + spanLon / 2;
    const minLat = centerLat - spanLat / 2;
    const maxLat = centerLat + spanLat / 2;

    // Determine grid index bounding box to render only visible cells efficiently
    const minC = Math.max(0, Math.floor(((minLon - 45.0) / 60.0) * (cols - 1)) - 1);
    const maxC = Math.min(cols - 1, Math.ceil(((maxLon - 45.0) / 60.0) * (cols - 1)) + 1);
    const minR = Math.max(0, Math.floor(((minLat - 5.0) / 25.0) * (rows - 1)) - 1);
    const maxR = Math.min(rows - 1, Math.ceil(((maxLat - 5.0) / 25.0) * (rows - 1)) + 1);

    const cellW = (0.25 / spanLon) * width;
    const cellH = (0.25 / spanLat) * height;

    // Render scalar color cells
    for (let r = minR; r <= maxR; r++) {
      const lat = 5.0 + (r / (rows - 1)) * 25.0;
      const { py } = geoToPixel(lat + 0.125, minLon, width, height);
      const rowData = grid[r];

      for (let c = minC; c <= maxC; c++) {
        const val = rowData[c];
        if (val !== null && !isNaN(val)) {
          const lon = 45.0 + (c / (cols - 1)) * 60.0;
          const { px } = geoToPixel(lat, lon - 0.125, width, height);

          const norm = (val - min) / range;
          const [red, green, blue] = interpolateColor(norm, colormap);
          ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
          ctx.fillRect(px, py, cellW + 1.0, cellH + 1.0);
        }
      }
    }

    // Grid lines & Coastline contours
    if (showGrid) {
      ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 0.6;

      for (let lat = 5; lat <= 30; lat += (zoom > 2.5 ? 2.5 : 5)) {
        if (lat >= minLat - 1 && lat <= maxLat + 1) {
          const { py } = geoToPixel(lat, minLon, width, height);
          ctx.beginPath();
          ctx.moveTo(0, py);
          ctx.lineTo(width, py);
          ctx.stroke();

          ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.75)';
          ctx.font = '11px monospace';
          ctx.fillText(`${lat.toFixed(1)}°N`, 8, py - 4);
        }
      }

      for (let lon = 45; lon <= 105; lon += (zoom > 2.5 ? 5 : 10)) {
        if (lon >= minLon - 1 && lon <= maxLon + 1) {
          const { px } = geoToPixel(minLat, lon, width, height);
          ctx.beginPath();
          ctx.moveTo(px, 0);
          ctx.lineTo(px, height);
          ctx.stroke();

          ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.75)';
          ctx.font = '11px monospace';
          ctx.fillText(`${lon.toFixed(1)}°E`, px + 4, height - 8);
        }
      }
    }

    // Draw vector particle streamflow if winds or currents
    if (showVectors && data.u && data.v) {
      const uGrid = data.u;
      const vGrid = data.v;
      const particles = particlesRef.current;

      ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.9)';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const rIdx = Math.max(0, Math.min(rows - 1, Math.floor(p.y)));
        const cIdx = Math.max(0, Math.min(cols - 1, Math.floor(p.x)));

        const uVal = uGrid[rIdx]?.[cIdx];
        const vVal = vGrid[rIdx]?.[cIdx];

        const lat = 5.0 + (p.y / rows) * 25.0;
        const lon = 45.0 + (p.x / cols) * 60.0;

        if (uVal !== null && vVal !== null && !isNaN(uVal) && !isNaN(vVal)) {
          const { px, py } = geoToPixel(lat, lon, width, height);

          if (px >= 0 && px <= width && py >= 0 && py <= height) {
            ctx.beginPath();
            ctx.arc(px, py, Math.min(3, 1.4 * Math.sqrt(zoom)), 0, Math.PI * 2);
            ctx.fill();
          }

          p.x += uVal * 0.18;
          p.y += vVal * 0.18;
          p.age += 1;

          if (p.age > p.maxAge || p.x < 0 || p.x >= cols || p.y < 0 || p.y >= rows) {
            p.x = Math.random() * cols;
            p.y = Math.random() * rows;
            p.age = 0;
          }
        } else {
          p.x = Math.random() * cols;
          p.y = Math.random() * rows;
          p.age = 0;
        }
      }
    }

    // Draw active selected coordinate marker
    if (selectedLat >= 5.0 && selectedLat <= 30.0 && selectedLon >= 45.0 && selectedLon <= 105.0) {
      const { px, py } = geoToPixel(selectedLat, selectedLon, width, height);

      if (px >= -20 && px <= width + 20 && py >= -20 && py <= height + 20) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(px - 16, py);
        ctx.lineTo(px + 16, py);
        ctx.moveTo(px, py - 16);
        ctx.lineTo(px, py + 16);
        ctx.stroke();
      }
    }
  }, [
    data,
    colormap,
    showGrid,
    showVectors,
    isDarkMode,
    selectedLat,
    selectedLon,
    zoom,
    centerLon,
    centerLat,
    geoToPixel
  ]);

  // Animation Loop
  useEffect(() => {
    let active = true;
    const loop = () => {
      if (active) {
        drawMap();
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };
    loop();
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawMap]);

  // Native smooth mouse wheel zoom on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const py = ((e.clientY - rect.top) / rect.height) * canvas.height;

      const cursorGeo = pixelToGeo(px, py, canvas.width, canvas.height);
      const zoomFactor = e.deltaY < 0 ? 1.2 : 0.83;
      const newZoom = Math.max(1.0, Math.min(6.0, zoom * zoomFactor));

      if (newZoom === 1.0) {
        setZoom(1.0);
        setCenterLon(75.0);
        setCenterLat(17.5);
      } else {
        // Zoom centered on cursor position
        const spanLon = 60.0 / newZoom;
        const spanLat = 25.0 / newZoom;
        const fracX = px / canvas.width;
        const fracY = 1.0 - py / canvas.height;

        const newCenterLon = Math.max(45.0 + spanLon / 2, Math.min(105.0 - spanLon / 2, cursorGeo.lon - (fracX - 0.5) * spanLon));
        const newCenterLat = Math.max(5.0 + spanLat / 2, Math.min(30.0 - spanLat / 2, cursorGeo.lat - (fracY - 0.5) * spanLat));

        setZoom(newZoom);
        setCenterLon(newCenterLon);
        setCenterLat(newCenterLat);
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [zoom, centerLon, centerLat, pixelToGeo]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      centerLon,
      centerLat
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const rect = canvas.getBoundingClientRect();

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }

      if (zoom > 1.0) {
        const spanLon = 60.0 / zoom;
        const spanLat = 25.0 / zoom;

        const dLon = -(dx / rect.width) * spanLon;
        const dLat = (dy / rect.height) * spanLat;

        const targetLon = Math.max(45.0 + spanLon / 2, Math.min(105.0 - spanLon / 2, dragStartPosRef.current.centerLon + dLon));
        const targetLat = Math.max(5.0 + spanLat / 2, Math.min(30.0 - spanLat / 2, dragStartPosRef.current.centerLat + dLat));

        setCenterLon(targetLon);
        setCenterLat(targetLat);
      }
    }

    // Hover Probe Calculation
    const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const { lat, lon } = pixelToGeo(px, py, canvas.width, canvas.height);

    if (lat >= 5.0 && lat <= 30.0 && lon >= 45.0 && lon <= 105.0) {
      const latIdx = Math.max(0, Math.min(100, Math.round((lat - 5.0) / 0.25)));
      const lonIdx = Math.max(0, Math.min(240, Math.round((lon - 45.0) / 0.25)));
      const val = data.grid[latIdx]?.[lonIdx] ?? null;
      setHoverInfo({ lat, lon, val });
    } else {
      setHoverInfo(null);
    }
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current && !hasMovedRef.current && hoverInfo) {
      onSelectCoordinate(hoverInfo.lat, hoverInfo.lon);
    }
    isDraggingRef.current = false;
  };

  const handleZoomIn = () => {
    const newZ = Math.min(6.0, zoom * 1.4);
    setZoom(newZ);
  };

  const handleZoomOut = () => {
    const newZ = Math.max(1.0, zoom / 1.4);
    setZoom(newZ);
    if (newZ === 1.0) {
      setCenterLon(75.0);
      setCenterLat(17.5);
    }
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setCenterLon(75.0);
    setCenterLat(17.5);
  };

  const handleSelectRegion = (r: { name: string; lat: number; lon: number; zoom: number }) => {
    onSelectCoordinate(r.lat, r.lon);
    setZoom(r.zoom);
    setCenterLon(r.lon);
    setCenterLat(r.lat);
  };

  return (
    <div className={`p-4 rounded-lg border transition-colors space-y-3 ${
      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Top Controls & Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            2D Geospatial Observation Field
          </h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Scroll to zoom in/out, drag to pan basin, click to probe depth profile sounding.
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-2">
          {data?.u && (
            <button
              onClick={() => setShowVectors(!showVectors)}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
                showVectors
                  ? 'bg-blue-700 border-blue-700 text-white'
                  : isDarkMode
                    ? 'bg-slate-700 border-slate-600 text-slate-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>Particle Flow</span>
            </button>
          )}

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
              showGrid
                ? 'bg-slate-700 text-white border-slate-700'
                : isDarkMode
                  ? 'bg-slate-900 border-slate-700 text-slate-400'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            Grid
          </button>
        </div>
      </div>

      {/* Region Presets */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`font-semibold flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Jump to Basin:
        </span>
        {REGIONS.map((r) => (
          <button
            key={r.name}
            onClick={() => handleSelectRegion(r)}
            className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
              Math.abs(selectedLat - r.lat) < 1.0 && Math.abs(selectedLon - r.lon) < 1.0
                ? 'bg-blue-700 border-blue-700 text-white font-bold'
                : isDarkMode
                  ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Main Canvas Container */}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 aspect-[241/101] select-none"
      >
        <canvas
          ref={canvasRef}
          width={964}
          height={404}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            isDraggingRef.current = false;
            setHoverInfo(null);
          }}
          className={`w-full h-full block ${zoom > 1.0 ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 pointer-events-none bg-slate-900/40 backdrop-blur-xs flex items-center justify-center text-white text-xs font-semibold z-20">
            Loading field data...
          </div>
        )}

        {/* Floating Tooltip Probe */}
        {hoverInfo && (
          <div className="absolute top-2 left-2 pointer-events-none bg-slate-900/90 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded shadow-md font-mono z-10">
            <div>
              Lat: <span className="text-blue-400">{hoverInfo.lat.toFixed(2)}°N</span> | Lon: <span className="text-blue-400">{hoverInfo.lon.toFixed(2)}°E</span>
            </div>
            <div className="font-bold text-emerald-400">
              {hoverInfo.val !== null ? `${hoverInfo.val} ${data?.unit || ''}` : 'Land Mask'}
            </div>
          </div>
        )}

        {/* Top-Right 2D Zoom Controls HUD */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900/90 border border-slate-700 text-white rounded p-1 shadow-md z-10">
          <button
            onClick={handleZoomIn}
            title="Zoom In (Scroll Up)"
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out (Scroll Down)"
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            title="Reset to Full Basin"
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-blue-400 bg-slate-950 rounded">
            {zoom.toFixed(1)}x
          </span>
        </div>

        {/* Selected Point Badge */}
        <div className="absolute bottom-2 right-2 bg-slate-900/90 border border-slate-700 text-white text-xs px-2.5 py-1 rounded shadow-md font-mono flex items-center gap-1.5 z-10">
          <Crosshair className="w-3.5 h-3.5 text-rose-400" />
          <span>Probe: {selectedLat.toFixed(2)}°N, {selectedLon.toFixed(2)}°E</span>
        </div>
      </div>
    </div>
  );
};
