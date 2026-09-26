import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import type { ViewMode } from './components/Header';
import { TimelineBar } from './components/TimelineBar';
import { VariableControl } from './components/VariableControl';
import { Map2DView } from './components/Map2DView';
import { Ocean3DView } from './components/Ocean3DView';
import { TransectView } from './components/TransectView';
import { ProfileView } from './components/ProfileView';
import { ReconstructionView } from './components/ReconstructionView';
import { InfoModal } from './components/InfoModal';
import { ErrorBoundary } from './components/ErrorBoundary';

import { api } from './lib/api';
import type {
  SystemInfo,
  SurfaceDataResponse,
  Volume3DResponse,
  TransectResponse,
  ProfileResponse,
  ReconstructionResponse
} from './lib/types';
import type { ColormapType } from './lib/colormaps';

export function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('oceanembed_theme');
    return saved ? saved === 'dark' : false;
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('oceanembed_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const [activeView, setActiveView] = useState<ViewMode>('map2d');
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<string>('2018-01-01');

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const [selectedVariable, setSelectedVariable] = useState<string>('sst');
  const [selectedDepth, setSelectedDepth] = useState<number>(100);
  const [selectedColormap, setSelectedColormap] = useState<ColormapType>('turbo');

  const [selectedLat, setSelectedLat] = useState<number>(14.0);
  const [selectedLon, setSelectedLon] = useState<number>(88.0);

  const [sliceType, setSliceType] = useState<'zonal' | 'meridional'>('zonal');
  const [transectCoordVal, setTransectCoordVal] = useState<number>(14.0);

  const [surfaceData, setSurfaceData] = useState<SurfaceDataResponse | null>(null);
  const [volumeData, setVolumeData] = useState<Volume3DResponse | null>(null);
  const [transectData, setTransectData] = useState<TransectResponse | null>(null);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [reconData, setReconData] = useState<ReconstructionResponse | null>(null);

  const [isLoadingSurface, setIsLoadingSurface] = useState<boolean>(false);
  const [isLoading3D, setIsLoading3D] = useState<boolean>(false);
  const [isLoadingTransect, setIsLoadingTransect] = useState<boolean>(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [isLoadingRecon, setIsLoadingRecon] = useState<boolean>(false);

  // Abort controllers for in-flight active queries
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api.getSystemInfo()
      .then((info) => setSystemInfo(info))
      .catch((err) => console.error('Failed to load system info:', err));

    api.getDates()
      .then((res) => {
        setDates(res.dates);
        if (res.dates.length > 0 && !res.dates.includes(currentDate)) {
          setCurrentDate(res.dates[0]);
        }
      })
      .catch((err) => console.error('Failed to load dates:', err));
  }, []);

  useEffect(() => {
    if (selectedVariable === 'sst') setSelectedColormap('turbo');
    else if (selectedVariable === 'sss') setSelectedColormap('haline');
    else if (selectedVariable === 'ssh') setSelectedColormap('coolwarm');
    else if (selectedVariable === 'winds') setSelectedColormap('plasma');
    else if (selectedVariable === 'currents') setSelectedColormap('ocean');
    else if (selectedVariable === 'temp_depth') setSelectedColormap('thermal');
    else if (selectedVariable === 'z20' || selectedVariable === 'mld') setSelectedColormap('viridis');
  }, [selectedVariable]);

  // Main Data Fetching with in-flight cancellation
  useEffect(() => {
    if (!currentDate) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Trigger sliding window buffer (prefetches 2 days behind and 6 days ahead into memory)
    const curIdx = dates.indexOf(currentDate);
    if (curIdx >= 0) {
      api.preloadWindow(dates, curIdx, selectedVariable, selectedDepth, activeView, sliceType, transectCoordVal);
    }

    // 1. Fetch Surface Data (for 2D Map)
    setIsLoadingSurface(true);
    api.getSurfaceData(currentDate, selectedVariable, selectedDepth, controller.signal)
      .then((data) => {
        setSurfaceData(data);
        setIsLoadingSurface(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Surface data error:', err);
          setIsLoadingSurface(false);
        }
      });

    // 2. Fetch 3D Volume Data (if in 3D View)
    if (activeView === 'ocean3d') {
      setIsLoading3D(true);
      api.get3DVolume(currentDate, 2, controller.signal)
        .then((data) => {
          setVolumeData(data);
          setIsLoading3D(false);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('3D volume error:', err);
            setIsLoading3D(false);
          }
        });
    }

    // 3. Fetch Transect (if in Transect View)
    if (activeView === 'transect') {
      setIsLoadingTransect(true);
      api.getTransect(currentDate, sliceType, transectCoordVal, controller.signal)
        .then((data) => {
          setTransectData(data);
          setIsLoadingTransect(false);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('Transect error:', err);
            setIsLoadingTransect(false);
          }
        });
    }

    // 4. Fetch Profile (if in Profile View or Map View)
    setIsLoadingProfile(true);
    api.getProfile(currentDate, selectedLat, selectedLon, controller.signal)
      .then((data) => {
        setProfileData(data);
        setIsLoadingProfile(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Profile error:', err);
          setIsLoadingProfile(false);
        }
      });

    // 5. Fetch Reconstruction (if in Reconstruction View)
    if (activeView === 'reconstruction') {
      setIsLoadingRecon(true);
      api.getReconstruction(currentDate, selectedDepth, controller.signal)
        .then((data) => {
          setReconData(data);
          setIsLoadingRecon(false);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('Reconstruction error:', err);
            setIsLoadingRecon(false);
          }
        });
    }

    return () => {
      controller.abort();
    };
  }, [
    currentDate,
    selectedVariable,
    selectedDepth,
    activeView,
    sliceType,
    transectCoordVal,
    selectedLat,
    selectedLon,
    dates
  ]);

  const standardDepths = systemInfo?.standard_depths || [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000];

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors ${
      isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Top Header */}
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onOpenInfo={() => setIsInfoOpen(true)}
        currentDate={currentDate}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Sidebar: Parameter & Variable Controls (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {systemInfo && (
              <VariableControl
                variables={systemInfo.variables}
                selectedVariable={selectedVariable}
                onSelectVariable={setSelectedVariable}
                selectedDepth={selectedDepth}
                onSelectDepth={setSelectedDepth}
                standardDepths={standardDepths}
                selectedColormap={selectedColormap}
                onSelectColormap={setSelectedColormap}
                stats={
                  surfaceData
                    ? {
                        min: surfaceData.min,
                        max: surfaceData.max,
                        mean: surfaceData.mean,
                        unit: surfaceData.unit
                      }
                    : undefined
                }
                isDarkMode={isDarkMode}
              />
            )}
          </div>

          {/* Right Main Stage: Active View Module (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <ErrorBoundary key={activeView} fallbackTitle={`An error occurred in ${activeView} view`}>
              {activeView === 'map2d' && (
                <Map2DView
                  data={surfaceData}
                  colormap={selectedColormap}
                  selectedLat={selectedLat}
                  selectedLon={selectedLon}
                  onSelectCoordinate={(lat, lon) => {
                    setSelectedLat(lat);
                    setSelectedLon(lon);
                  }}
                  isDarkMode={isDarkMode}
                  isLoading={isLoadingSurface}
                />
              )}

              {activeView === 'ocean3d' && (
                <Ocean3DView
                  volumeData={volumeData}
                  colormap={selectedColormap}
                  selectedDepth={selectedDepth}
                  onSelectDepth={setSelectedDepth}
                  standardDepths={standardDepths}
                  isDarkMode={isDarkMode}
                  isLoading={isLoading3D}
                />
              )}

              {activeView === 'transect' && (
                <TransectView
                  transectData={transectData}
                  colormap={selectedColormap}
                  sliceType={sliceType}
                  onSliceTypeChange={setSliceType}
                  coordVal={transectCoordVal}
                  onCoordValChange={setTransectCoordVal}
                  isDarkMode={isDarkMode}
                  isLoading={isLoadingTransect}
                />
              )}

              {activeView === 'profile' && (
                <ProfileView
                  profileData={profileData}
                  selectedLat={selectedLat}
                  selectedLon={selectedLon}
                  onSelectCoordinate={(lat, lon) => {
                    setSelectedLat(lat);
                    setSelectedLon(lon);
                  }}
                  isDarkMode={isDarkMode}
                  isLoading={isLoadingProfile}
                />
              )}

              {activeView === 'reconstruction' && (
                <ReconstructionView
                  reconData={reconData}
                  selectedDepth={selectedDepth}
                  onSelectDepth={setSelectedDepth}
                  standardDepths={standardDepths}
                  isDarkMode={isDarkMode}
                  isLoading={isLoadingRecon}
                />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Timeline & Slideshow Controller Bar */}
      <footer className="sticky bottom-0 z-40">
        <TimelineBar
          dates={dates}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          selectedVariable={selectedVariable}
          selectedDepth={selectedDepth}
          activeView={activeView}
          sliceType={sliceType}
          transectCoordVal={transectCoordVal}
          isDarkMode={isDarkMode}
        />
      </footer>

      {/* Info / About Modal */}
      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

export default App;
