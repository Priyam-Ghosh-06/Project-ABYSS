"""
Configuration and settings module for Project ABYSS Backend.
Defines domain parameters, depth levels, variable definitions, and file paths.
"""

from pathlib import Path
import numpy as np

# Base paths
BACKEND_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
CACHE_DIR = PROCESSED_DATA_DIR / "cache"
DAILY_DATA_DIR = PROCESSED_DATA_DIR / "daily_025"
AI_PREDICTIONS_DIR = PROCESSED_DATA_DIR / "ai_predictions_025"

# Ensure directories exist
CACHE_DIR.mkdir(parents=True, exist_ok=True)
DAILY_DATA_DIR.mkdir(parents=True, exist_ok=True)
AI_PREDICTIONS_DIR.mkdir(parents=True, exist_ok=True)

# North Indian Ocean Domain (PS 26066 Specification)
LAT_MIN = 5.0
LAT_MAX = 30.0
LON_MIN = 45.0
LON_MAX = 105.0
RESOLUTION = 0.25 # 0.25° spatial resolution

# Standard Target Grid (101 lat points x 241 lon points)
TARGET_LATS = np.round(np.arange(LAT_MIN, LAT_MAX + 0.001, RESOLUTION), 2)
TARGET_LONS = np.round(np.arange(LON_MIN, LON_MAX + 0.001, RESOLUTION), 2)

# Standard Problem Statement Depth Levels in meters (15 levels)
STANDARD_DEPTHS = np.array([0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000], dtype=np.float32)

# Variable Metadata
VARIABLES_METADATA = {
    # Surface Observations (Inputs)
    "sst": {
        "name": "Sea Surface Temperature",
        "short_name": "SST",
        "unit": "°C",
        "category": "surface",
        "source": "OSTIA L4 (0.05°)",
        "colormap": "turbo",
        "min_val": 15.0,
        "max_val": 33.0,
        "description": "Satellite infrared and microwave blended foundation sea surface temperature."
    },
    "sss": {
        "name": "Sea Surface Salinity",
        "short_name": "SSS",
        "unit": "PSU",
        "category": "surface",
        "source": "SMAP/SMOS L4 (0.125°)",
        "colormap": "haline",
        "min_val": 28.0,
        "max_val": 38.0,
        "description": "Multi-satellite blended ocean surface salinity, revealing freshwater runoff and evaporation regimes."
    },
    "ssh": {
        "name": "Sea Level Anomaly (SLA)",
        "short_name": "SLA / SSH",
        "unit": "m",
        "category": "surface",
        "source": "DUACS Multi-Mission Altimetry (0.25°)",
        "colormap": "coolwarm",
        "min_val": -0.3,
        "max_val": 0.3,
        "description": "Altimeter sea level anomaly relative to mean sea surface, reflecting mesoscale eddies and thermocline pumping."
    },
    "winds": {
        "name": "Surface Winds (10m)",
        "short_name": "Winds",
        "unit": "m/s",
        "category": "surface_vector",
        "source": "CCMP V3.1 L4 (0.25°)",
        "colormap": "plasma",
        "min_val": 0.0,
        "max_val": 16.0,
        "description": "Cross-Calibrated Multi-Platform ocean surface wind speed and vector components (u, v)."
    },
    "currents": {
        "name": "Surface Ocean Currents",
        "short_name": "Currents",
        "unit": "m/s",
        "category": "surface_vector",
        "source": "OSCAR L4 (0.25°)",
        "colormap": "speed",
        "min_val": 0.0,
        "max_val": 1.8,
        "description": "Surface ocean geostrophic and wind-driven currents (u, v) and velocity magnitude."
    },
    # Subsurface Target
    "temp_depth": {
        "name": "Subsurface Ocean Temperature",
        "short_name": "T(z)",
        "unit": "°C",
        "category": "subsurface",
        "source": "GLORYS12V1 Reanalysis Target",
        "colormap": "thermal",
        "min_val": 5.0,
        "max_val": 32.0,
        "description": "3D vertical ocean temperature profile reconstructed across standard depth levels (0 - 1000m)."
    },
    # Oceanographic Diagnostics
    "z20": {
        "name": "Thermocline Depth (20°C Isotherm)",
        "short_name": "Z20",
        "unit": "m",
        "category": "diagnostic",
        "source": "Derived Ocean Physics",
        "colormap": "viridis_r",
        "min_val": 20.0,
        "max_val": 200.0,
        "description": "Depth of the 20°C isotherm indicator of upper-ocean thermocline displacement and upwelling."
    },
    "mld": {
        "name": "Mixed Layer Depth",
        "short_name": "MLD",
        "unit": "m",
        "category": "diagnostic",
        "source": "Derived Ocean Physics",
        "colormap": "inferno_r",
        "min_val": 10.0,
        "max_val": 120.0,
        "description": "Depth where temperature drops by 0.5°C from surface SST, delineating the turbulent surface layer."
    }
}
