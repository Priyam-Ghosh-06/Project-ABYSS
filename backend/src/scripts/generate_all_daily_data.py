"""
Batch Harmonization & Dataset Generator for OceanEmbed (PS 26066).
Processes all 365 daily steps in 2018 from raw NetCDF into standardized,
pre-computed, compressed daily packages in backend/data/processed/daily_025/.
"""

import os
import sys
import time
from pathlib import Path
import numpy as np
from tqdm import tqdm

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.config.settings import (
    PROCESSED_DATA_DIR,
    STANDARD_DEPTHS,
    TARGET_LATS,
    TARGET_LONS
)
from src.core.data_loader import DataLoader
from src.core.ocean_physics import compute_z20, compute_mld, compute_ohc

DAILY_DIR = PROCESSED_DATA_DIR / "daily_025"
DAILY_DIR.mkdir(parents=True, exist_ok=True)

def generate_all_days():
    print(f"=== OceanEmbed Batch Harmonizer ===")
    print(f"Target Output Directory: {DAILY_DIR}")
    print(f"Grid: {len(TARGET_LATS)} Latitudes x {len(TARGET_LONS)} Longitudes (0.25° resolution)")
    print(f"Depths: {len(STANDARD_DEPTHS)} Standard Levels ({STANDARD_DEPTHS.tolist()})")

    loader = DataLoader()
    dates = loader.get_dates()
    print(f"Total Dates to Process: {len(dates)} (2018-01-01 to 2018-12-31)\n")

    t_start = time.time()
    skipped = 0
    processed = 0

    for date_str in tqdm(dates, desc="Generating Harmonized Daily Packages"):
        target_file = DAILY_DIR / f"day_{date_str}.npz"
        
        # Skip if already exists and valid
        if target_file.exists():
            try:
                with np.load(target_file) as test_npz:
                    if "temp_3d" in test_npz and "sst" in test_npz:
                        skipped += 1
                        continue
            except Exception:
                pass

        # Extract multi-modal day
        raw = loader.load_day_raw(date_str)
        temp_3d = raw["temp_3d"]

        # Vectorized diagnostics
        z20 = compute_z20(temp_3d, STANDARD_DEPTHS)
        mld = compute_mld(temp_3d, STANDARD_DEPTHS)
        ohc = compute_ohc(temp_3d, STANDARD_DEPTHS)

        # Save compressed package
        np.savez_compressed(
            target_file,
            sst=raw["sst"],
            sss=raw["sss"],
            ssh=raw["ssh"],
            u_wind=raw["u_wind"],
            v_wind=raw["v_wind"],
            wind_speed=raw["wind_speed"],
            u_curr=raw["u_curr"],
            v_curr=raw["v_curr"],
            curr_speed=raw["curr_speed"],
            temp_3d=temp_3d,
            z20=z20,
            mld=mld,
            ohc=ohc
        )
        processed += 1

    total_time = time.time() - t_start
    print(f"\n Harmonization Complete!")
    print(f"Processed: {processed} days, Skipped (already generated): {skipped} days")
    print(f"Total time: {total_time:.2f}s ({total_time / len(dates):.3f}s per day)")
    
    # Calculate folder size
    total_size = sum(os.path.getsize(DAILY_DIR / f) for f in os.listdir(DAILY_DIR))
    print(f"Final Pre-computed Dataset Size: {total_size / (1024 * 1024):.1f} MB (vs ~32 GB raw)")

if __name__ == "__main__":
    generate_all_days()
