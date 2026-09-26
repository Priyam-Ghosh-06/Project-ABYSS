import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import type { Volume3DResponse } from '../lib/types';
import type { ColormapType } from '../lib/colormaps';
import { interpolateColor } from '../lib/colormaps';
import { Box, RefreshCw, Sliders, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Ocean3DViewProps {
  volumeData: Volume3DResponse | null;
  colormap: ColormapType;
  selectedDepth: number;
  onSelectDepth: (depth: number) => void;
  standardDepths: number[];
  isDarkMode: boolean;
  isLoading: boolean;
}

type Mode3D = 'single_slice' | 'multi_layer' | 'transect_curtain' | 'point_cloud';

export const Ocean3DView: React.FC<Ocean3DViewProps> = ({
  volumeData,
  colormap,
  selectedDepth,
  onSelectDepth,
  standardDepths,
  isDarkMode,
  isLoading
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const planesGroupRef = useRef<THREE.Group | null>(null);
  const boxHeightRef = useRef<number>(48);

  const [mode3D, setMode3D] = useState<Mode3D>('single_slice');
  const [verticalExaggeration, setVerticalExaggeration] = useState<number>(3.0);
  const [transectLat, setTransectLat] = useState<number>(14.0);
  const [transectLon, setTransectLon] = useState<number>(88.0);
  const [opacity, setOpacity] = useState<number>(0.85);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [tempFilterMin, setTempFilterMin] = useState<number>(5.0);
  const [tempFilterMax, setTempFilterMax] = useState<number>(32.0);

  const autoRotateRef = useRef<boolean>(false);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const cameraRotationRef = useRef({ theta: 0.8, phi: 0.6, radius: 260 });

  // Generate 2D surface layer textures (Lon x Lat)
  const layerTextures = useMemo(() => {
    if (!volumeData || !volumeData.layers) return [];
    const minT = volumeData.min_temp;
    const maxT = volumeData.max_temp;
    const range = maxT - minT > 0.01 ? maxT - minT : 1.0;

    return volumeData.layers.map((layer) => {
      const grid = layer.grid;
      const rows = grid.length;
      const cols = grid[0].length;

      const canvas = document.createElement('canvas');
      canvas.width = cols;
      canvas.height = rows;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const imgData = ctx.createImageData(cols, rows);
      for (let r = 0; r < rows; r++) {
        const rowData = grid[rows - 1 - r];
        for (let c = 0; c < cols; c++) {
          const val = rowData[c];
          const pixelIdx = (r * cols + c) * 4;
          if (val !== null && !isNaN(val)) {
            const norm = (val - minT) / range;
            const [red, green, blue] = interpolateColor(norm, colormap);
            imgData.data[pixelIdx] = red;
            imgData.data[pixelIdx + 1] = green;
            imgData.data[pixelIdx + 2] = blue;
            imgData.data[pixelIdx + 3] = 255;
          } else {
            imgData.data[pixelIdx] = isDarkMode ? 30 : 200;
            imgData.data[pixelIdx + 1] = isDarkMode ? 41 : 210;
            imgData.data[pixelIdx + 2] = isDarkMode ? 59 : 220;
            imgData.data[pixelIdx + 3] = 180;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      return { depth: layer.depth, texture };
    });
  }, [volumeData, colormap, isDarkMode]);

  // Main Three.js Scene Setup & Wheel Event
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDarkMode ? 0x0f172a : 0xf8fafc);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1500);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(100, 200, 100);
    scene.add(dirLight);

    const planesGroup = new THREE.Group();
    scene.add(planesGroup);
    planesGroupRef.current = planesGroup;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (autoRotateRef.current) {
        cameraRotationRef.current.theta += 0.005;
      }

      const { theta, phi, radius } = cameraRotationRef.current;
      const targetY = -(boxHeightRef.current / 2);
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi) + targetY;
      const z = radius * Math.sin(phi) * Math.sin(theta);

      camera.position.set(x, y, z);
      camera.lookAt(0, targetY, 0);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Native smooth zoom wheel listener
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      cameraRotationRef.current.radius = Math.max(
        60,
        Math.min(550, cameraRotationRef.current.radius * zoomFactor)
      );
    };
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('wheel', onWheel);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isDarkMode]);

  // Update 3D Geometry when mode, exaggeration, or data changes
  useEffect(() => {
    const planesGroup = planesGroupRef.current;
    if (!planesGroup || !volumeData || !volumeData.layers || layerTextures.length === 0) return;

    while (planesGroup.children.length > 0) {
      const obj = planesGroup.children[0];
      planesGroup.remove(obj);
    }

    const boxWidth = 120;
    const boxDepth = 50;
    const boxHeight = 16 * verticalExaggeration;
    boxHeightRef.current = boxHeight;

    // 1. Dynamic Bounding Wireframe Box
    const boxGeo = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxMat = new THREE.LineBasicMaterial({
      color: isDarkMode ? 0x475569 : 0x94a3b8,
      linewidth: 1
    });
    const boundingBox = new THREE.LineSegments(boxEdges, boxMat);
    boundingBox.position.set(0, -boxHeight / 2, 0);
    planesGroup.add(boundingBox);

    const minT = volumeData.min_temp;
    const maxT = volumeData.max_temp;
    const range = maxT - minT > 0.01 ? maxT - minT : 1.0;
    const layers = volumeData.layers;
    const numDepths = layers.length;
    const numLats = layers[0].grid.length;
    const numLons = layers[0].grid[0].length;

    // 2. Mode: Single Depth Slice
    if (mode3D === 'single_slice') {
      const targetIdx = layerTextures.findIndex((lt) => lt?.depth === selectedDepth);
      const activeLT = targetIdx >= 0 ? layerTextures[targetIdx] : layerTextures[0];

      if (activeLT?.texture) {
        const yPos = -(activeLT.depth / 1000.0) * boxHeight;

        const planeGeo = new THREE.PlaneGeometry(boxWidth, boxDepth);
        const planeMat = new THREE.MeshBasicMaterial({
          map: activeLT.texture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: opacity
        });
        const mesh = new THREE.Mesh(planeGeo, planeMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(0, yPos, 0);
        planesGroup.add(mesh);

        const edges = new THREE.EdgesGeometry(planeGeo);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
        const line = new THREE.LineSegments(edges, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, yPos, 0);
        planesGroup.add(line);
      }
    }
    // 3. Mode: Multi-Layer Stack
    else if (mode3D === 'multi_layer') {
      layerTextures.forEach((lt) => {
        if (!lt?.texture) return;
        const yPos = -(lt.depth / 1000.0) * boxHeight;

        const planeGeo = new THREE.PlaneGeometry(boxWidth, boxDepth);
        const planeMat = new THREE.MeshBasicMaterial({
          map: lt.texture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: opacity * 0.75
        });
        const mesh = new THREE.Mesh(planeGeo, planeMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(0, yPos, 0);
        planesGroup.add(mesh);
      });
    }
    // 4. Mode: Transect Curtains (Zonal & Meridional Vertical 2D Cross Sections)
    else if (mode3D === 'transect_curtain') {
      // A. Surface Geography Context Layer (z = 0m)
      if (layerTextures[0]?.texture) {
        const surfGeo = new THREE.PlaneGeometry(boxWidth, boxDepth);
        const surfMat = new THREE.MeshBasicMaterial({
          map: layerTextures[0].texture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.35
        });
        const surfMesh = new THREE.Mesh(surfGeo, surfMat);
        surfMesh.rotation.x = -Math.PI / 2;
        surfMesh.position.set(0, 0, 0);
        planesGroup.add(surfMesh);
      }

      // B. Zonal Curtain (East-West slice across Longitudes at fixed Latitude)
      const latFrac = Math.max(0, Math.min(1, (transectLat - 5.0) / 25.0));
      const latIdx = Math.min(numLats - 1, Math.max(0, Math.floor(latFrac * (numLats - 1))));
      // +Z is South (5°N) and -Z is North (30°N), perfectly matching surface map and meridional slice
      const zPos = (0.5 - latFrac) * boxDepth;

      const zCanvas = document.createElement('canvas');
      zCanvas.width = numLons;
      zCanvas.height = numDepths;
      const zCtx = zCanvas.getContext('2d');
      if (zCtx) {
        const imgData = zCtx.createImageData(numLons, numDepths);
        for (let d = 0; d < numDepths; d++) {
          const row = layers[d].grid[latIdx];
          for (let c = 0; c < numLons; c++) {
            // c=0 is 45°E (West/-X), c=numLons-1 is 105°E (East/+X)
            const val = row[c];
            const pixelIdx = (d * numLons + c) * 4;
            if (val !== null && !isNaN(val)) {
              const norm = (val - minT) / range;
              const [r, g, b] = interpolateColor(norm, colormap);
              imgData.data[pixelIdx] = r;
              imgData.data[pixelIdx + 1] = g;
              imgData.data[pixelIdx + 2] = b;
              imgData.data[pixelIdx + 3] = Math.round(opacity * 255);
            } else {
              imgData.data[pixelIdx] = isDarkMode ? 30 : 200;
              imgData.data[pixelIdx + 1] = isDarkMode ? 41 : 210;
              imgData.data[pixelIdx + 2] = isDarkMode ? 59 : 220;
              imgData.data[pixelIdx + 3] = 160;
            }
          }
        }
        zCtx.putImageData(imgData, 0, 0);

        const zTexture = new THREE.CanvasTexture(zCanvas);
        zTexture.minFilter = THREE.LinearFilter;
        zTexture.magFilter = THREE.LinearFilter;

        const zGeo = new THREE.PlaneGeometry(boxWidth, boxHeight);
        const zMat = new THREE.MeshBasicMaterial({
          map: zTexture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: opacity
        });
        const zMesh = new THREE.Mesh(zGeo, zMat);
        zMesh.position.set(0, -boxHeight / 2, zPos);
        planesGroup.add(zMesh);

        // Zonal Outline Border
        const zEdges = new THREE.EdgesGeometry(zGeo);
        const zLine = new THREE.LineSegments(
          zEdges,
          new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 })
        );
        zLine.position.set(0, -boxHeight / 2, zPos);
        planesGroup.add(zLine);
      }

      // C. Meridional Curtain (North-South slice across Latitudes at fixed Longitude)
      const lonFrac = Math.max(0, Math.min(1, (transectLon - 45.0) / 60.0));
      const lonIdx = Math.min(numLons - 1, Math.max(0, Math.floor(lonFrac * (numLons - 1))));
      const xPos = (lonFrac - 0.5) * boxWidth;

      const mCanvas = document.createElement('canvas');
      mCanvas.width = numLats;
      mCanvas.height = numDepths;
      const mCtx = mCanvas.getContext('2d');
      if (mCtx) {
        const imgData = mCtx.createImageData(numLats, numDepths);
        for (let d = 0; d < numDepths; d++) {
          const grid = layers[d].grid;
          for (let r = 0; r < numLats; r++) {
            const val = grid[r][lonIdx];
            const pixelIdx = (d * numLats + r) * 4;
            if (val !== null && !isNaN(val)) {
              const norm = (val - minT) / range;
              const [rCol, gCol, bCol] = interpolateColor(norm, colormap);
              imgData.data[pixelIdx] = rCol;
              imgData.data[pixelIdx + 1] = gCol;
              imgData.data[pixelIdx + 2] = bCol;
              imgData.data[pixelIdx + 3] = Math.round(opacity * 255);
            } else {
              imgData.data[pixelIdx] = isDarkMode ? 30 : 200;
              imgData.data[pixelIdx + 1] = isDarkMode ? 41 : 210;
              imgData.data[pixelIdx + 2] = isDarkMode ? 59 : 220;
              imgData.data[pixelIdx + 3] = 160;
            }
          }
        }
        mCtx.putImageData(imgData, 0, 0);

        const mTexture = new THREE.CanvasTexture(mCanvas);
        mTexture.minFilter = THREE.LinearFilter;
        mTexture.magFilter = THREE.LinearFilter;

        const mGeo = new THREE.PlaneGeometry(boxDepth, boxHeight);
        const mMat = new THREE.MeshBasicMaterial({
          map: mTexture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: opacity
        });
        const mMesh = new THREE.Mesh(mGeo, mMat);
        mMesh.rotation.y = Math.PI / 2;
        mMesh.position.set(xPos, -boxHeight / 2, 0);
        planesGroup.add(mMesh);

        // Meridional Outline Border
        const mEdges = new THREE.EdgesGeometry(mGeo);
        const mLine = new THREE.LineSegments(
          mEdges,
          new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 })
        );
        mLine.rotation.y = Math.PI / 2;
        mLine.position.set(xPos, -boxHeight / 2, 0);
        planesGroup.add(mLine);
      }
    }
    // 5. Mode: 3D Point Cloud Voxels
    else if (mode3D === 'point_cloud') {
      const particlesGeo = new THREE.BufferGeometry();
      const positions: number[] = [];
      const colors: number[] = [];

      layers.forEach((layer) => {
        const yPos = -(layer.depth / 1000.0) * boxHeight;
        const grid = layer.grid;
        const rows = grid.length;
        const cols = grid[0].length;

        for (let r = 0; r < rows; r += 2) {
          const latNorm = r / rows;
          const zPos = (0.5 - latNorm) * boxDepth;
          for (let c = 0; c < cols; c += 2) {
            const val = grid[r][c];
            if (val !== null && !isNaN(val) && val >= tempFilterMin && val <= tempFilterMax) {
              const lonNorm = c / cols;
              const xPos = (lonNorm - 0.5) * boxWidth;

              positions.push(xPos, yPos, zPos);

              const norm = (val - minT) / range;
              const [red, green, blue] = interpolateColor(norm, colormap);
              colors.push(red / 255, green / 255, blue / 255);
            }
          }
        }
      });

      particlesGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      particlesGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const particleMat = new THREE.PointsMaterial({
        size: 2.4,
        vertexColors: true,
        transparent: true,
        opacity: opacity
      });

      const particleSystem = new THREE.Points(particlesGeo, particleMat);
      planesGroup.add(particleSystem);
    }
  }, [
    volumeData,
    layerTextures,
    mode3D,
    selectedDepth,
    verticalExaggeration,
    opacity,
    transectLat,
    transectLon,
    colormap,
    tempFilterMin,
    tempFilterMax,
    isDarkMode
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - prevMousePosRef.current.x;
    const deltaY = e.clientY - prevMousePosRef.current.y;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };

    cameraRotationRef.current.theta -= deltaX * 0.008;
    cameraRotationRef.current.phi = Math.max(
      0.1,
      Math.min(Math.PI / 2 - 0.05, cameraRotationRef.current.phi - deltaY * 0.008)
    );
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleZoomIn = () => {
    cameraRotationRef.current.radius = Math.max(60, cameraRotationRef.current.radius - 35);
  };

  const handleZoomOut = () => {
    cameraRotationRef.current.radius = Math.min(550, cameraRotationRef.current.radius + 35);
  };

  const handleResetCamera = () => {
    cameraRotationRef.current = { theta: 0.8, phi: 0.6, radius: 260 };
  };

  const setCameraPreset = (preset: 'iso' | 'top' | 'zonal' | 'merid') => {
    if (preset === 'iso') {
      cameraRotationRef.current = { theta: 0.8, phi: 0.6, radius: 260 };
    } else if (preset === 'top') {
      cameraRotationRef.current = { theta: 0.0, phi: 0.15, radius: 220 };
    } else if (preset === 'zonal') {
      cameraRotationRef.current = { theta: 0.0, phi: 1.4, radius: 250 };
    } else if (preset === 'merid') {
      cameraRotationRef.current = { theta: Math.PI / 2, phi: 1.4, radius: 250 };
    }
  };

  return (
    <div className={`p-4 rounded-lg border transition-colors space-y-3 ${
      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* 3D Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Box className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            3D Ocean Subsurface Volume Explorer
          </h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Interactive volumetric slicing across standard depths (0 to 1000m) in the North Indian Ocean basin.
          </p>
        </div>

        {/* 3D Modes */}
        <div className="flex items-center gap-1">
          {[
            { id: 'single_slice', label: 'Depth Slice' },
            { id: 'multi_layer', label: 'Multi-Layer Stack' },
            { id: 'transect_curtain', label: 'Transect Curtains' },
            { id: 'point_cloud', label: '3D Voxel Points' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode3D(m.id as Mode3D)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                mode3D === m.id
                  ? 'bg-blue-700 text-white shadow-xs'
                  : isDarkMode
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Viewport Area */}
      <div className="relative rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 w-full h-[480px] select-none">
        {/* Dedicated Canvas Mount Point */}
        <div
          ref={mountRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 pointer-events-none bg-slate-900/50 backdrop-blur-xs flex items-center justify-center text-white text-xs font-semibold z-20">
            Processing 3D ocean volume...
          </div>
        )}

        {/* Top-Right Camera Controls HUD */}
        <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700 text-white rounded p-2 text-xs space-y-2 backdrop-blur-xs z-10 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Camera Views</span>
            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                onClick={handleResetCamera}
                title="Reset View"
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setCameraPreset('iso')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] cursor-pointer"
            >
              3D Orbit
            </button>
            <button
              onClick={() => setCameraPreset('top')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] cursor-pointer"
            >
              Top-Down
            </button>
            <button
              onClick={() => setCameraPreset('zonal')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] cursor-pointer"
            >
              Zonal View
            </button>
            <button
              onClick={() => setCameraPreset('merid')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] cursor-pointer"
            >
              Meridional
            </button>
          </div>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`w-full text-center py-1 rounded text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer ${
              autoRotate ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <RefreshCw className="w-3 h-3" /> Auto-Rotate
          </button>
        </div>

        {/* Bottom-Left 3D Axis HUD */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700 text-white text-[11px] font-mono rounded px-2.5 py-1.5 backdrop-blur-xs z-10 pointer-events-none">
          <div>Lon: 45°E – 105°E (X)</div>
          <div>Lat: 5°N – 30°N (Z)</div>
          <div className="text-blue-400 font-bold">Depth: 0m – 1000m (Y: {verticalExaggeration}x Exaggerated)</div>
        </div>
      </div>

      {/* Interactive Slicing Controls Bar */}
      <div className={`p-3 rounded-lg border space-y-3 ${
        isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
      }`}>
        {/* Depth Slice Mode Slider */}
        {mode3D === 'single_slice' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Active Depth Slicing Plane:
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                z = {selectedDepth} meters
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {standardDepths.map((d) => (
                <button
                  key={d}
                  onClick={() => onSelectDepth(d)}
                  className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
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
        )}

        {/* Transect Curtains Sliders */}
        {mode3D === 'transect_curtain' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1 p-2 rounded bg-blue-950/20 border border-blue-900/30">
              <div className="flex justify-between">
                <span className="font-semibold text-blue-500">Zonal Slice (East-West Curtain):</span>
                <span className="font-mono font-bold">{transectLat.toFixed(1)}°N</span>
              </div>
              <input
                type="range"
                min="5.0"
                max="30.0"
                step="0.5"
                value={transectLat}
                onChange={(e) => setTransectLat(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded appearance-none cursor-pointer bg-slate-300 dark:bg-slate-700 accent-blue-600"
              />
            </div>

            <div className="space-y-1 p-2 rounded bg-emerald-950/20 border border-emerald-900/30">
              <div className="flex justify-between">
                <span className="font-semibold text-emerald-500">Meridional Slice (North-South Curtain):</span>
                <span className="font-mono font-bold">{transectLon.toFixed(1)}°E</span>
              </div>
              <input
                type="range"
                min="45.0"
                max="105.0"
                step="0.5"
                value={transectLon}
                onChange={(e) => setTransectLon(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded appearance-none cursor-pointer bg-slate-300 dark:bg-slate-700 accent-emerald-600"
              />
            </div>
          </div>
        )}

        {/* Voxel Filter Range */}
        {mode3D === 'point_cloud' && (
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Filter Min Temp:</span>
              <input
                type="number"
                min="5"
                max="30"
                value={tempFilterMin}
                onChange={(e) => setTempFilterMin(parseFloat(e.target.value))}
                className="w-16 px-2 py-0.5 rounded border bg-transparent font-mono"
              />
              <span>°C</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Filter Max Temp:</span>
              <input
                type="number"
                min="10"
                max="35"
                value={tempFilterMax}
                onChange={(e) => setTempFilterMax(parseFloat(e.target.value))}
                className="w-16 px-2 py-0.5 rounded border bg-transparent font-mono"
              />
              <span>°C</span>
            </div>
          </div>
        )}

        {/* Vertical Exaggeration & Opacity Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-200 dark:border-slate-700 text-xs">
          <div className="flex items-center gap-2">
            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500 font-medium'}>
              Vertical Exaggeration:
            </span>
            {[1, 2, 3, 5].map((ex) => (
              <button
                key={ex}
                onClick={() => setVerticalExaggeration(ex)}
                className={`px-2.5 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                  verticalExaggeration === ex
                    ? 'bg-blue-700 text-white font-bold shadow-xs'
                    : isDarkMode
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                {ex}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500 font-medium'}>Layer Opacity:</span>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-24 h-1.5 rounded appearance-none cursor-pointer bg-slate-300 dark:bg-slate-700 accent-blue-600"
            />
            <span className="font-mono text-[11px]">{Math.round(opacity * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
