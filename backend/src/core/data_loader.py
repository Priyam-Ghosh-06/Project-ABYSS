"""
Data Loader & Harmonization Engine for OceanEmbed.
Loads and regrids multi-source satellite observations and subsurface reanalysis data
to the standardized 0.25° North Indian Ocean grid (101 lat x 241 lon) and 15 standard depth levels.
Optimized for high-speed integer array indexing.
"""

import os
import glob
from pathlib import Path
import numpy as np
import xarray as xr
from typing import Dict, Any, List

from ..config.settings import (
    RAW_DATA_DIR,
    TARGET_LATS,
    TARGET_LONS,
    STANDARD_DEPTHS
)

class DataLoader:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataLoader, cls).__new__(cls)
            cls._instance._init_loader()
        return cls._instance

    def _init_loader(self):
        print("Initializing OceanEmbed Data Loader...")
        self.raw_dir = RAW_DATA_DIR
        self.sst_path = self.raw_dir / "sst" / "sst_2018.nc"
        self.sss_path = self.raw_dir / "sss" / "sss_2018.nc"
        self.ssh_path = self.raw_dir / "ssh" / "ssh_2018.nc"
        self.glorys_path = self.raw_dir / "target_glorys" / "target_glorys_2018.nc"

        self.winds_files = sorted(glob.glob(str(self.raw_dir / "winds" / "*.nc")))
        self.currents_files = sorted(glob.glob(str(self.raw_dir / "currents" / "*.nc")))

        # Map dates to wind and currents files
        self.winds_by_date = {}
        for f in self.winds_files:
            basename = os.path.basename(f)
            parts = basename.split("_")
            for p in parts:
                if len(p) == 8 and p.isdigit() and p.startswith("2018"):
                    d_str = f"{p[:4]}-{p[4:6]}-{p[6:8]}"
                    self.winds_by_date[d_str] = f

        self.currents_by_date = {}
        for f in self.currents_files:
            basename = os.path.basename(f)
            parts = basename.replace(".nc", "").split("_")
            for p in parts:
                if len(p) == 8 and p.isdigit() and p.startswith("2018"):
                    d_str = f"{p[:4]}-{p[4:6]}-{p[6:8]}"
                    self.currents_by_date[d_str] = f

        # Open year-long datasets
        self.ds_sst = xr.open_dataset(self.sst_path)
        self.ds_sss = xr.open_dataset(self.sss_path)
        self.ds_ssh = xr.open_dataset(self.ssh_path)
        self.ds_glorys = xr.open_dataset(self.glorys_path)

        # Parse date index mapping (2018-01-01 to 2018-12-31)
        self.available_dates = []
        for t in self.ds_sst.time.values:
            dt = np.datetime64(t, 'D').astype(str)
            self.available_dates.append(dt)
        self.date_to_idx = {d: i for i, d in enumerate(self.available_dates)}

        # Precompute coordinate indices for 0.25 target grid
        self._precompute_spatial_indices()
        print(f"DataLoader initialized successfully with {len(self.available_dates)} dates.")

    def _precompute_spatial_indices(self):
        # SST Indices
        sst_lats = self.ds_sst.latitude.values
        sst_lons = self.ds_sst.longitude.values
        self.sst_lat_idx = np.array([int(np.abs(sst_lats - lat).argmin()) for lat in TARGET_LATS])
        self.sst_lon_idx = np.array([int(np.abs(sst_lons - lon).argmin()) for lon in TARGET_LONS])

        # SSS Indices
        sss_lats = self.ds_sss.latitude.values
        sss_lons = self.ds_sss.longitude.values
        self.sss_lat_idx = np.array([int(np.abs(sss_lats - lat).argmin()) for lat in TARGET_LATS])
        self.sss_lon_idx = np.array([int(np.abs(sss_lons - lon).argmin()) for lon in TARGET_LONS])

        # SSH Indices
        ssh_lats = self.ds_ssh.latitude.values
        ssh_lons = self.ds_ssh.longitude.values
        self.ssh_lat_idx = np.array([int(np.abs(ssh_lats - lat).argmin()) for lat in TARGET_LATS])
        self.ssh_lon_idx = np.array([int(np.abs(ssh_lons - lon).argmin()) for lon in TARGET_LONS])

        # GLORYS Indices
        glo_lats = self.ds_glorys.latitude.values
        glo_lons = self.ds_glorys.longitude.values
        glo_depths = self.ds_glorys.depth.values

        self.glo_lat_idx = np.array([int(np.abs(glo_lats - lat).argmin()) for lat in TARGET_LATS])
        self.glo_lon_idx = np.array([int(np.abs(glo_lons - lon).argmin()) for lon in TARGET_LONS])
        self.glo_depth_idx = np.array([int(np.abs(glo_depths - d).argmin()) for d in STANDARD_DEPTHS])
        self.glo_all_depths = glo_depths

        # Winds Indices (from first file)
        if self.winds_files:
            with xr.open_dataset(self.winds_files[0]) as ds_w:
                w_lats = ds_w.latitude.values
                w_lons = ds_w.longitude.values
                self.w_lat_idx = np.array([int(np.abs(w_lats - lat).argmin()) for lat in TARGET_LATS])
                self.w_lon_idx = np.array([int(np.abs(w_lons - lon).argmin()) for lon in TARGET_LONS])

        # Currents Indices (from first file)
        if self.currents_files:
            with xr.open_dataset(self.currents_files[0]) as ds_c:
                c_lats = ds_c.lat.values
                c_lons = ds_c.lon.values
                self.c_lat_idx = np.array([int(np.abs(c_lats - lat).argmin()) for lat in TARGET_LATS])
                self.c_lon_idx = np.array([int(np.abs(c_lons - lon).argmin()) for lon in TARGET_LONS])

    def get_dates(self) -> List[str]:
        return self.available_dates

    def load_day_raw(self, date_str: str) -> Dict[str, np.ndarray]:
        """
        Extracts all surface observations and subsurface temperature for the given date.
        Uses fast single-time NumPy slicing.
        """
        if date_str not in self.date_to_idx:
            raise ValueError(f"Date {date_str} not found in available dataset range (2018-01-01 to 2018-12-31)")

        t_idx = self.date_to_idx[date_str]

        # 1. SST (°C)
        raw_sst = self.ds_sst['analysed_sst'].isel(time=t_idx).values
        sst_grid = raw_sst[self.sst_lat_idx, :][:, self.sst_lon_idx].astype(np.float32)
        if np.nanmean(sst_grid) > 200.0:
            sst_grid = sst_grid - 273.15 # Kelvin to Celsius

        # 2. SSS (PSU)
        raw_sss = self.ds_sss['sos'].isel(time=t_idx, depth=0).values
        sss_grid = raw_sss[self.sss_lat_idx, :][:, self.sss_lon_idx].astype(np.float32)

        # 3. SSH / SLA (m)
        raw_ssh = self.ds_ssh['sla'].isel(time=t_idx).values
        ssh_grid = raw_ssh[self.ssh_lat_idx, :][:, self.ssh_lon_idx].astype(np.float32)

        # 4. GLORYS Subsurface Temperature (°C) - 15 Depths
        raw_glo = self.ds_glorys['thetao'].isel(time=t_idx).values
        temp_3d = raw_glo[self.glo_depth_idx, :, :][:, self.glo_lat_idx, :][:, :, self.glo_lon_idx].astype(np.float32)

        # 5. Winds (u, v, speed in m/s)
        u_wind = np.zeros_like(sst_grid, dtype=np.float32)
        v_wind = np.zeros_like(sst_grid, dtype=np.float32)
        wind_speed = np.zeros_like(sst_grid, dtype=np.float32)

        if date_str in self.winds_by_date:
            w_file = self.winds_by_date[date_str]
            with xr.open_dataset(w_file) as ds_w:
                uw = ds_w['uwnd'].mean(dim='time').values[self.w_lat_idx, :][:, self.w_lon_idx]
                vw = ds_w['vwnd'].mean(dim='time').values[self.w_lat_idx, :][:, self.w_lon_idx]
                u_wind = uw.astype(np.float32)
                v_wind = vw.astype(np.float32)
                wind_speed = np.sqrt(u_wind**2 + v_wind**2)

        # 6. Currents (u, v, speed in m/s)
        u_curr = np.zeros_like(sst_grid, dtype=np.float32)
        v_curr = np.zeros_like(sst_grid, dtype=np.float32)
        curr_speed = np.zeros_like(sst_grid, dtype=np.float32)

        if date_str in self.currents_by_date:
            c_file = self.currents_by_date[date_str]
            with xr.open_dataset(c_file) as ds_c:
                uc = ds_c['u'].isel(time=0).values[self.c_lon_idx, :][:, self.c_lat_idx].T
                vc = ds_c['v'].isel(time=0).values[self.c_lon_idx, :][:, self.c_lat_idx].T
                u_curr = uc.astype(np.float32)
                v_curr = vc.astype(np.float32)
                curr_speed = np.sqrt(u_curr**2 + v_curr**2)

        # Ocean mask consistency
        ocean_mask = ~np.isnan(sst_grid)
        sss_grid = np.where(ocean_mask, sss_grid, np.nan)
        ssh_grid = np.where(ocean_mask, ssh_grid, np.nan)
        u_wind = np.where(ocean_mask, u_wind, np.nan)
        v_wind = np.where(ocean_mask, v_wind, np.nan)
        wind_speed = np.where(ocean_mask, wind_speed, np.nan)
        u_curr = np.where(ocean_mask, u_curr, np.nan)
        v_curr = np.where(ocean_mask, v_curr, np.nan)
        curr_speed = np.where(ocean_mask, curr_speed, np.nan)

        return {
            "date": date_str,
            "sst": sst_grid,
            "sss": sss_grid,
            "ssh": ssh_grid,
            "u_wind": u_wind,
            "v_wind": v_wind,
            "wind_speed": wind_speed,
            "u_curr": u_curr,
            "v_curr": v_curr,
            "curr_speed": curr_speed,
            "temp_3d": temp_3d,
        }
