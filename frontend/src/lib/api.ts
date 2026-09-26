import type {
  SystemInfo,
  DatesResponse,
  SurfaceDataResponse,
  Volume3DResponse,
  TransectResponse,
  ProfileResponse,
  ReconstructionResponse
} from './types';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:8000/api'
    : '/api');

// In-memory response cache
const cache = new Map<string, any>();

// In-flight request tracker to prevent duplicate concurrent network requests
const inFlight = new Map<string, Promise<any>>();

// Queue for background prefetch requests (max 2 parallel to avoid overloading backend)
let activePrefetches = 0;
const prefetchQueue: (() => void)[] = [];

function pumpPrefetchQueue() {
  while (activePrefetches < 2 && prefetchQueue.length > 0) {
    const task = prefetchQueue.shift();
    if (task) {
      activePrefetches++;
      task();
    }
  }
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  if (cache.has(url)) {
    return cache.get(url) as T;
  }
  if (inFlight.has(url)) {
    return inFlight.get(url) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API Error ${res.status}: ${errorText}`);
      }
      const data = await res.json();
      cache.set(url, data);
      return data as T;
    } finally {
      inFlight.delete(url);
    }
  })();

  inFlight.set(url, promise);
  return promise;
}

export const api = {
  getSystemInfo: () => fetchJson<SystemInfo>(`${API_BASE}/info`),

  getDates: () => fetchJson<DatesResponse>(`${API_BASE}/dates`),

  getSurfaceData: (date: string, variable: string, depth: number = 0, signal?: AbortSignal) =>
    fetchJson<SurfaceDataResponse>(`${API_BASE}/data/surface?date=${date}&variable=${variable}&depth=${depth}`, signal),

  get3DVolume: (date: string, downsample: number = 2, signal?: AbortSignal) =>
    fetchJson<Volume3DResponse>(`${API_BASE}/data/3d-volume?date=${date}&downsample=${downsample}`, signal),

  getTransect: (date: string, sliceType: 'zonal' | 'meridional', coordVal: number, signal?: AbortSignal) =>
    fetchJson<TransectResponse>(`${API_BASE}/data/transect?date=${date}&slice_type=${sliceType}&coord_val=${coordVal}`, signal),

  getProfile: (date: string, lat: number, lon: number, signal?: AbortSignal) =>
    fetchJson<ProfileResponse>(`${API_BASE}/data/profile?date=${date}&lat=${lat}&lon=${lon}`, signal),

  getReconstruction: (date: string, depth: number = 100, signal?: AbortSignal) =>
    fetchJson<ReconstructionResponse>(`${API_BASE}/reconstruction?date=${date}&depth=${depth}`, signal),

  // Check if a specific date & view payload is already in client memory
  isDateBuffered: (date: string, variable: string, depth: number, view: string, sliceType: string = 'zonal', coordVal: number = 12.0): boolean => {
    let url = '';
    if (view === 'map2d') {
      url = `${API_BASE}/data/surface?date=${date}&variable=${variable}&depth=${depth}`;
    } else if (view === 'ocean3d') {
      url = `${API_BASE}/data/3d-volume?date=${date}&downsample=2`;
    } else if (view === 'transect') {
      url = `${API_BASE}/data/transect?date=${date}&slice_type=${sliceType}&coord_val=${coordVal}`;
    } else if (view === 'reconstruction') {
      url = `${API_BASE}/reconstruction?date=${date}&depth=${depth}`;
    } else {
      url = `${API_BASE}/data/surface?date=${date}&variable=${variable}&depth=${depth}`;
    }
    return cache.has(url);
  },

  // Sliding window background pre-buffer (buffers 2 days behind and 6 days ahead)
  preloadWindow: (
    dates: string[],
    currentIndex: number,
    variable: string,
    depth: number,
    view: string,
    sliceType: 'zonal' | 'meridional' = 'zonal',
    coordVal: number = 12.0
  ) => {
    if (dates.length === 0 || currentIndex < 0) return;

    // Buffer window: 2 behind, 6 ahead
    const lookBehind = 2;
    const lookAhead = 6;
    const startIdx = Math.max(0, currentIndex - lookBehind);
    const endIdx = Math.min(dates.length - 1, currentIndex + lookAhead);

    for (let i = startIdx; i <= endIdx; i++) {
      if (i === currentIndex) continue;
      const targetDate = dates[i];

      let url = '';
      if (view === 'map2d') {
        url = `${API_BASE}/data/surface?date=${targetDate}&variable=${variable}&depth=${depth}`;
      } else if (view === 'ocean3d') {
        url = `${API_BASE}/data/3d-volume?date=${targetDate}&downsample=2`;
      } else if (view === 'transect') {
        url = `${API_BASE}/data/transect?date=${targetDate}&slice_type=${sliceType}&coord_val=${coordVal}`;
      } else if (view === 'reconstruction') {
        url = `${API_BASE}/reconstruction?date=${targetDate}&depth=${depth}`;
      } else {
        url = `${API_BASE}/data/surface?date=${targetDate}&variable=${variable}&depth=${depth}`;
      }

      if (!cache.has(url) && !inFlight.has(url)) {
        prefetchQueue.push(() => {
          fetchJson(url)
            .catch(() => {})
            .finally(() => {
              activePrefetches--;
              pumpPrefetchQueue();
            });
        });
      }
    }
    pumpPrefetchQueue();
  }
};
