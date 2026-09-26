"""
Synthetic / Mock Data Generator for Project ABYSS.
Generates realistic 0.25° NetCDF files for SST, SSS, SSH, Currents, Winds, and Target GLORYS
to test the end-to-end preprocessing, harmonization, and DL pipeline without waiting for large downloads.
"""

import os
import sys
from pathlib import Path
import yaml
import numpy as np
import pandas as pd
import xarray as xr

# Determine backend root directory dynamically
BACKEND_DIR = Path(__file__).resolve().parents[2]

def load_config(config_path: str = None) -> dict:
    if config_path is None:
        config_path = BACKEND_DIR / "configs" / "config.yaml"
    else:
        config_path = Path(config_path)
        if not config_path.is_absolute() and not config_path.exists():
            config_path = BACKEND_DIR / config_path

    with open(config_path, "r") as f:
        return yaml.safe_load(f)

def generate_mock_datasets(num_days: int = 7, output_base_dir: str = None):
    """
    Creates dummy NetCDF files matching the exact dimensions, coordinates, and variable names.
    """
    cfg = load_config()
    dom = cfg["domain"]
    lats = np.arange(dom["lat_min"], dom["lat_max"] + 0.01, dom["resolution"])
    lons = np.arange(dom["lon_min"], dom["lon_max"] + 0.01, dom["resolution"])
    depths = cfg["depths"]["standard_levels"]
    
    dates = pd.date_range("2021-01-01", periods=num_days, freq="D")
    
    if output_base_dir is None:
        raw_base = cfg["paths"].get("raw_data_dir", "data/raw")
        output_base_dir = str((BACKEND_DIR / raw_base).resolve())

    # 1. SST (OSTIA format)
    sst_dir = os.path.join(output_base_dir, "sst")
    os.makedirs(sst_dir, exist_ok=True)
    sst_data = 28.0 + 2.0 * np.sin(lats[:, None] * np.pi / 180) + np.random.randn(num_days, len(lats), len(lons)) * 0.5
    ds_sst = xr.Dataset(
        {"analysed_sst": (["time", "latitude", "longitude"], sst_data + 273.15)}, # In Kelvin
        coords={"time": dates, "latitude": lats, "longitude": lons}
    )
    ds_sst.to_netcdf(os.path.join(sst_dir, "mock_sst_ostia.nc"))

    # 2. SSS (SMOS/SMAP format)
    sss_dir = os.path.join(output_base_dir, "sss")
    os.makedirs(sss_dir, exist_ok=True)
    sss_data = 34.0 + np.random.randn(num_days, len(lats), len(lons)) * 0.8
    ds_sss = xr.Dataset(
        {"sos": (["time", "latitude", "longitude"], sss_data)},
        coords={"time": dates, "latitude": lats, "longitude": lons}
    )
    ds_sss.to_netcdf(os.path.join(sss_dir, "mock_sss.nc"))

    # 3. SSH (DUACS format)
    ssh_dir = os.path.join(output_base_dir, "ssh")
    os.makedirs(ssh_dir, exist_ok=True)
    sla_data = np.random.randn(num_days, len(lats), len(lons)) * 0.1
    ds_ssh = xr.Dataset(
        {
            "sla": (["time", "latitude", "longitude"], sla_data),
            "adt": (["time", "latitude", "longitude"], sla_data + 0.8),
            "ugos": (["time", "latitude", "longitude"], np.random.randn(num_days, len(lats), len(lons)) * 0.2),
            "vgos": (["time", "latitude", "longitude"], np.random.randn(num_days, len(lats), len(lons)) * 0.2),
        },
        coords={"time": dates, "latitude": lats, "longitude": lons}
    )
    ds_ssh.to_netcdf(os.path.join(ssh_dir, "mock_ssh_duacs.nc"))

    # 4. Target Subsurface Temperature (GLORYS12V1 format: 15 depths)
    glorys_dir = os.path.join(output_base_dir, "target_glorys")
    os.makedirs(glorys_dir, exist_ok=True)
    
    # Realistic vertical temperature profile: 28°C at surface decaying to ~4°C at 1000m
    temp_profile = 4.0 + 24.0 * np.exp(-np.array(depths) / 200.0)
    thetao_data = np.zeros((num_days, len(depths), len(lats), len(lons)))
    for d_idx, base_temp in enumerate(temp_profile):
        thetao_data[:, d_idx, :, :] = base_temp + np.random.randn(num_days, len(lats), len(lons)) * 0.3
        
    ds_glorys = xr.Dataset(
        {"thetao": (["time", "depth", "latitude", "longitude"], thetao_data)},
        coords={"time": dates, "depth": depths, "latitude": lats, "longitude": lons}
    )
    ds_glorys.to_netcdf(os.path.join(glorys_dir, "mock_glorys_thetao.nc"))

    # 5. Winds
    winds_dir = os.path.join(output_base_dir, "winds")
    os.makedirs(winds_dir, exist_ok=True)
    ds_winds = xr.Dataset(
        {
            "uwnd": (["time", "latitude", "longitude"], np.random.randn(num_days, len(lats), len(lons)) * 3.0),
            "vwnd": (["time", "latitude", "longitude"], np.random.randn(num_days, len(lats), len(lons)) * 3.0),
        },
        coords={"time": dates, "latitude": lats, "longitude": lons}
    )
    ds_winds.to_netcdf(os.path.join(winds_dir, "mock_winds.nc"))

    # 6. Currents
    curr_dir = os.path.join(output_base_dir, "currents")
    os.makedirs(curr_dir, exist_ok=True)
    ds_curr = xr.Dataset(
        {
            "u": (["time", "latitude", "longitude"], np.random.randn(num_days, len(lats), len(lons)) * 0.5),
            "v": (["time", "latitude", "longitude"], np.random.randn(num_days, len(lats), len(lons)) * 0.5),
        },
        coords={"time": dates, "latitude": lats, "longitude": lons}
    )
    ds_curr.to_netcdf(os.path.join(curr_dir, "mock_currents.nc"))

    print(f"[✓] Generated mock sample datasets for {num_days} days inside:\n    {output_base_dir}")

if __name__ == "__main__":
    generate_mock_datasets(num_days=7)
