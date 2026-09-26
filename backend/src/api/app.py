"""
FastAPI REST API Application for OceanEmbed.
Provides high-performance endpoints for 2D geospatial maps, 3D ocean volume slices,
vertical transects, vertical sounding profiles, and AI reconstruction validation.
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from ..config.settings import (
    LAT_MIN,
    LAT_MAX,
    LON_MIN,
    LON_MAX,
    RESOLUTION,
    TARGET_LATS,
    TARGET_LONS,
    STANDARD_DEPTHS,
    VARIABLES_METADATA
)
from ..core.cache_manager import CacheManager
from ..models.reconstruction_poc import ReconstructionEngine

app = FastAPI(
    title="OceanEmbed API",
    description="Satellite Embedding-Based Deep Learning Framework for Subsurface Ocean Temperature (PS 26066)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cache_mgr = CacheManager()
recon_engine = ReconstructionEngine()

@app.get("/api/info")
def get_system_info():
    """Returns domain bounding box, resolutions, depths, variables metadata."""
    dates = cache_mgr.loader.get_dates()
    return {
        "project": "OceanEmbed",
        "problem_statement_id": "26066",
        "organization": "Ministry of Earth Sciences (MoES) / INCOIS",
        "domain": {
            "name": "North Indian Ocean",
            "lat_min": LAT_MIN,
            "lat_max": LAT_MAX,
            "lon_min": LON_MIN,
            "lon_max": LON_MAX,
            "resolution": RESOLUTION,
            "grid_shape": [len(TARGET_LATS), len(TARGET_LONS)]
        },
        "temporal_range": {
            "start_date": dates[0] if dates else "2018-01-01",
            "end_date": dates[-1] if dates else "2018-12-31",
            "total_days": len(dates)
        },
        "standard_depths": STANDARD_DEPTHS.tolist(),
        "variables": VARIABLES_METADATA
    }


@app.get("/api/dates")
def get_available_dates():
    """Returns list of all available 365 dates with monsoon season classifications."""
    dates = cache_mgr.loader.get_dates()
    
    tagged_dates = []
    for d in dates:
        month = int(d.split("-")[1])
        if month in [12, 1, 2]:
            season = "Winter Monsoon (NE)"
        elif month in [3, 4, 5]:
            season = "Spring Pre-Monsoon"
        elif month in [6, 7, 8, 9]:
            season = "Summer Monsoon (SW Upwelling)"
        else:
            season = "Post-Monsoon Transition"
        tagged_dates.append({"date": d, "season": season})

    return {
        "count": len(dates),
        "dates": dates,
        "tagged_dates": tagged_dates,
        "key_benchmarks": [
            {"date": "2018-01-15", "name": "Winter Monsoon (NE Monsoon)", "focus": "Arabian Sea Cooling & Convection"},
            {"date": "2018-04-15", "name": "Pre-Monsoon Peak", "focus": "Tropical Warm Pool & High SST"},
            {"date": "2018-07-15", "name": "SW Summer Monsoon", "focus": "Somali Current & Coastal Upwelling"},
            {"date": "2018-10-15", "name": "Post-Monsoon Transition", "focus": "Bay of Bengal Freshwater Plume & Cyclogenesis"}
        ]
    }


@app.get("/api/data/surface")
def get_surface_data(
    date: str = Query("2018-01-01", description="Date in YYYY-MM-DD format"),
    variable: str = Query("sst", description="Variable: sst, sss, ssh, winds, currents, z20, mld, ohc, temp_depth"),
    depth: Optional[float] = Query(0.0, description="Depth in meters (if variable=temp_depth)")
):
    """Returns 2D grid matrix and metadata for the requested variable and date."""
    try:
        data = cache_mgr.get_2d_field(date, variable, depth)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/data/3d-volume")
def get_3d_volume(
    date: str = Query("2018-01-01", description="Date in YYYY-MM-DD format"),
    downsample: int = Query(2, description="Spatial stride (1 = 101x241, 2 = 51x121)")
):
    """Returns 3D temperature volume across all 15 depth layers."""
    try:
        data = cache_mgr.get_3d_volume(date, downsample=max(1, downsample))
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/data/transect")
def get_transect_slice(
    date: str = Query("2018-01-01", description="Date in YYYY-MM-DD format"),
    slice_type: str = Query("zonal", description="'zonal' (fixed Lat) or 'meridional' (fixed Lon)"),
    coord_val: float = Query(12.0, description="Latitude value for zonal, or Longitude value for meridional")
):
    """Returns vertical cross-section curtain slice (Depth vs Lon / Lat) and thermocline/MLD curves."""
    try:
        data = cache_mgr.get_transect(date, slice_type, coord_val)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/data/profile")
def get_point_profile(
    date: str = Query("2018-01-01", description="Date in YYYY-MM-DD format"),
    lat: float = Query(12.0, description="Latitude (°N)"),
    lon: float = Query(88.0, description="Longitude (°E)")
):
    """Returns vertical temperature sounding (T-D curve) and ocean parameters at (lat, lon)."""
    try:
        data = cache_mgr.get_point_profile(date, lat, lon)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/reconstruction")
def get_reconstruction_poc(
    date: str = Query("2018-01-01", description="Date in YYYY-MM-DD format"),
    depth: float = Query(100.0, description="Depth level in meters")
):
    """Executes AI Reconstruction framework simulation and returns ground truth vs prediction comparison and error metrics."""
    try:
        data = recon_engine.run_reconstruction_poc(date, depth)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
