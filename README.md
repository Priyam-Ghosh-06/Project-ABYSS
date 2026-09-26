# OceanEmbed (SIH Problem Statement 26066)

> **Satellite Embedding-Based Deep Learning Framework for Reconstruction of Subsurface Ocean Temperature from Surface Satellite Observations**  
> **Ministry of Earth Sciences (MoES), Indian National Centre for Ocean Information Services (INCOIS)**

---

## Overview

Direct vertical ocean temperature observations (from ARGO floats, mooring buoys, and gliders) are spatially and temporally sparse. Conversely, remote sensing satellites provide continuous daily surface observations at high spatial resolution.

**OceanEmbed** addresses this gap by bridging surface satellite observations with deep ocean thermal structure over the **North Indian Ocean ($5^\circ\text{N} - 30^\circ\text{N}, 45^\circ\text{E} - 105^\circ\text{E}$)** at **$0.25^\circ \times 0.25^\circ$ spatial resolution** across **15 standard vertical depth levels ($0 - 1000\,\text{m}$)**.

---

## 🚀 Key Platform Features

### 1. 🗺️ 2D Geospatial Observation Field

- **Multi-Source Satellite Variables:**
  - **SST:** Sea Surface Temperature (OSTIA, $0.05^\circ$)
  - **SSS:** Sea Surface Salinity (SMAP/SMOS, $0.125^\circ$)
  - **SSH / SLA:** Sea Level Anomaly (DUACS, $0.25^\circ$)
  - **Surface Winds ($U, V$):** CCMP Vector Winds ($0.25^\circ$)
  - **Surface Currents ($U, V$):** OSCAR Ocean Currents ($0.25^\circ$)
  - **Derived Physics:** $Z_{20}$ Thermocline Depth, Mixed Layer Depth (MLD), and Ocean Heat Content (OHC).
- **Interactive Particle Streamflow:** Animated vector streamflow particles for wind and ocean surface current vectors.
- **Smooth Zoom & Pan:** Mouse wheel zoom ($1.0\times - 6.0\times$), click-and-drag panning, and one-click basin jump presets (*Bay of Bengal*, *Arabian Sea*, *Somali Upwelling*, *Equatorial Ocean*, *Andaman Sea*).

### 2. 🧊 3D Ocean Subsurface Volume Explorer (Three.js WebGL)
- **Depth Slicing Plane:** Smooth horizontal slicing across the 15 standard depths ($0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000\,\text{m}$).
- **Multi-Layer Stack:** Volumetric 15-layer semi-transparent thermal water column stack.
- **Dynamic Transect Curtains:** Real-time vertical 2D cross-section curtains intersecting in 3D:
  - **Zonal Curtain (East-West):** Slices longitudes at any chosen latitude with glowing blue boundary contours.
  - **Meridional Curtain (North-South):** Slices latitudes at any chosen longitude with glowing emerald boundary contours.
  - **Geographic Reference Surface:** Faint semi-transparent surface layer ($z = 0\,\text{m}$) providing geographic orientation beneath the Indian subcontinent.
- **3D Voxel Points:** Point cloud voxels filtered by temperature thresholds.
- **Vertical Exaggeration:** Interactive height scaling ($1\times, 2\times, 3\times, 5\times$) with dynamically resizing wireframe bounding box.
- **3D Camera Orbit & HUD:** 3D Orbit, Top-Down, Zonal, and Meridional camera presets, Auto-Rotate toggle, and zoom in/out controls.

### 3. Vertical Sounding Profile (T-D Curve)

- Direct water column sounding graph plotting **Temperature (°C) vs Depth (0 to 1000m)** with $Z_{20}$ thermocline and MLD marker lines.
- Complete station ocean parameters: Surface SST, SSS, SLA, Wind Speed, Surface Current, Thermocline Depth, Mixed Layer Depth, and Ocean Heat Content.

### 4. AI Model Inference & Ground Truth Verification

- Side-by-side vertical column comparison of **Target Ground Truth (GLORYS Reanalysis)** vs. **Predicted Subsurface Temperature (OceanEmbed Deep Learning Model)**.
- **Residual Anomaly Map ($\Delta T$):** Real-time spatial error difference mapping ($\Delta T = T_{\text{pred}} - T_{\text{target}}$) with symmetric coolwarm colormap ($[-0.4^\circ\text{C}, +0.4^\circ\text{C}]$).
- **Dataset Partition Indicators:** Clear visual badges for *Train Partition (Jan – Aug)*, *Validation Partition (Sep – Oct)*, and *Test Partition (Nov – Dec)*.

### 5. 365-Day Timeline & Slideshow Controller

- Continuous scrubbing across all 365 days of 2018.
- Multi-speed slideshow playback ($1\times, 2\times, 5\times, 10\times$) with zero-latency in-memory RAM serving.
- **Monsoon Presets:** Quick benchmarks for *Winter Monsoon (NE)*, *Spring Pre-Monsoon*, *SW Summer Monsoon*, and *Post-Monsoon Transition*.

### 6. Government-Grade Accessible UI

- Designed for high legibility, clean data visualization, and accessibility.
- Instant **Light / Dark Mode** toggle with persisted theme state.

---

## Running with Docker

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/) installed on your machine.

### Quick Start

```bash
# Clone the repository
git clone https://github.com/AkshatRai07/SIH26.git
cd SIH26

# Build and launch both Backend and Frontend containers
docker compose up --build -d
```

### Access URLs

- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **Backend API Documentation (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **API System Info:** [http://localhost:8000/api/info](http://localhost:8000/api/info)

### Docker Management Commands

```bash
# View container status and health
docker compose ps

# View real-time logs
docker compose logs -f

# Stop and remove containers
docker compose down
```

---

## Manual Local Development (Without Docker)

### 1. Backend (FastAPI + Python 3.12)

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server (runs on port 8000)
python -m src.server
```

### 2. Frontend (React + Vite + Bun)

```bash
cd frontend

# Install dependencies
bun install

# Start development server (runs on port 5173)
bun run dev
```

---

## 🏗️ Project Architecture

```text
SIH26/
├── docker-compose.yml              # Multi-container orchestration
├── .dockerignore                   # Build context exclusions
├── README.md                       # Documentation
│
├── backend/
│   ├── Dockerfile                  # Python 3.12-slim + NetCDF/HDF5 + Uvicorn ASGI
│   ├── requirements.txt            # Backend dependencies
│   ├── src/
│   │   ├── api/                    # FastAPI REST endpoints
│   │   │   └── app.py
│   │   ├── config/                 # Domain, depth, and variable settings
│   │   │   └── settings.py
│   │   ├── core/                   # In-memory RAM cache & DataLoader
│   │   │   ├── cache_manager.py
│   │   │   ├── data_loader.py
│   │   │   └── ocean_physics.py
│   │   ├── models/                 # AI Inference & Validation Engine
│   │   │   └── reconstruction_poc.py
│   │   ├── scripts/                # Dataset precomputation scripts
│   │   │   ├── generate_all_daily_data.py
│   │   │   └── generate_ai_predictions.py
│   │   └── server.py               # Uvicorn entrypoint
│   └── data/
│       └── processed/
│           ├── daily_025/          # Pre-computed 365-day satellite observations (317 MB)
│           └── ai_predictions_025/ # Pre-computed 365-day AI model predictions (119 MB)
│
└── frontend/
    ├── Dockerfile                  # Multi-stage Bun Builder -> Nginx Alpine
    ├── nginx.conf                  # Production SPA router & /api/ reverse proxy
    ├── package.json
    ├── bun.lock
    └── src/
        ├── App.tsx                 # Master state & view router
        ├── components/
        │   ├── Header.tsx          # Navigation, title, and theme toggle
        │   ├── TimelineBar.tsx     # 365-day scrubber & playback controller
        │   ├── VariableControl.tsx # Variable picker, depth picker, and legends
        │   ├── Map2DView.tsx       # 2D Canvas map with particle flow & zoom/pan
        │   ├── Ocean3DView.tsx     # Three.js 3D volume, depth slicer & transect curtains
        │   ├── TransectView.tsx    # Vertical 2D cross-section curtains (Z20, MLD)
        │   ├── ProfileView.tsx     # T-D Sounding Curve & station metrics
        │   ├── ReconstructionView.tsx # AI Model prediction vs Ground Truth
        │   └── ErrorBoundary.tsx   # React error boundary
        └── lib/
            ├── api.ts              # High-performance API client
            ├── colormaps.ts        # Scientific ocean colormaps
            └── types.ts            # TypeScript interfaces
```
