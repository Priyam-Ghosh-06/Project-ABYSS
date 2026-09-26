"""
Unified Command-Line Interface for Downloading Project ABYSS Datasets.
"""

import argparse
import sys
import os
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from src.ingestion.download_cmems import download_cmems_variable, load_config
from src.ingestion.download_podaac import download_podaac_dataset

def main():
    parser = argparse.ArgumentParser(
        description="Project ABYSS (PS 26066) - Data Ingestion Tool for North Indian Ocean"
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help="Path to YAML configuration file (defaults to backend/configs/config.yaml)."
    )
    parser.add_argument(
        "--start-date",
        type=str,
        default=None,
        help="Start date in YYYY-MM-DD format (e.g. 2021-01-01)."
    )
    parser.add_argument(
        "--end-date",
        type=str,
        default=None,
        help="End date in YYYY-MM-DD format (e.g. 2021-01-15)."
    )
    parser.add_argument(
        "--variables",
        nargs="+",
        default=["all"],
        help="Variables to download. Options: sst, sss, ssh, target_glorys, winds, currents, or all."
    )

    args = parser.parse_args()
    config = load_config(args.config)

    start_date = args.start_date or config["time_range"]["default_start_date"]
    end_date = args.end_date or config["time_range"]["default_end_date"]
    
    dom = config["domain"]
    bbox = (dom["lon_min"], dom["lat_min"], dom["lon_max"], dom["lat_max"])
    raw_dir = str((BACKEND_DIR / config["paths"].get("raw_data_dir", "data/raw")).resolve())

    selected_vars = args.variables
    if "all" in selected_vars:
        selected_vars = ["sst", "sss", "ssh", "target_glorys", "winds", "currents"]

    print("\n=======================================================")
    print(" Project ABYSS Data Ingestion Pipeline")
    print(f" Region     : {dom['name']} (Lat: {dom['lat_min']} to {dom['lat_max']}, Lon: {dom['lon_min']} to {dom['lon_max']})")
    print(f" Period     : {start_date} to {end_date}")
    print(f" Variables  : {', '.join(selected_vars)}")
    print(f" Output Dir : {raw_dir}")
    print("=======================================================\n")

    # 1. Download CMEMS Products
    for var in ["sst", "sss", "ssh", "target_glorys"]:
        if var in selected_vars:
            try:
                download_cmems_variable(var, start_date, end_date, config=config)
            except Exception as e:
                print(f"[!] Skipping {var} due to error: {e}")

    # 2. Download NASA Earthdata / PO.DAAC Products
    if "winds" in selected_vars:
        try:
            download_podaac_dataset(
                short_name="CCMP_WINDS_10M6HR_L4_V3.1",
                start_date=start_date,
                end_date=end_date,
                output_dir=os.path.join(raw_dir, "winds"),
                bounding_box=bbox
            )
        except Exception as e:
            print(f"[!] Winds download error: {e}")

    if "currents" in selected_vars:
        try:
            download_podaac_dataset(
                short_name="OSCAR_L4_OC_FINAL_V2.0",
                start_date=start_date,
                end_date=end_date,
                output_dir=os.path.join(raw_dir, "currents"),
                bounding_box=bbox
            )
        except Exception as e:
            print(f"[!] Currents download error: {e}")

    print("\n[✓] Ingestion process finished. Downloaded files are in:", raw_dir)

if __name__ == "__main__":
    main()
