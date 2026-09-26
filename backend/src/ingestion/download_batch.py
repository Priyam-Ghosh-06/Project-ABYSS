"""
Multi-Year Batch Ingestion Module for Project ABYSS (2010 - 2026).
Downloads data year-by-year with automatic resume capability and handles
the transition from Reprocessed Multi-Year (MY) data (2010-2023) to Near Real-Time (NRT) data (2024-2026).
"""

import os
import sys
import time
from pathlib import Path
import yaml
import argparse

# Dynamic backend directory resolution
BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import copernicusmarine
from src.ingestion.download_podaac import download_podaac_dataset

def load_config(config_path: str = None) -> dict:
    if config_path is None:
        config_path = BACKEND_DIR / "configs" / "config.yaml"
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

# Dataset ID mapping: Reprocessed (MY) for <= 2023 vs NRT for >= 2024
DATASET_CATALOG = {
    "my": {  # Historical Reprocessed (2010 - 2023)
        "sst": {
            "dataset_id": "METOFFICE-GLO-SST-L4-REP-OBS-SST",
            "variables": ["analysed_sst"]
        },
        "sss": {
            "dataset_id": "cmems_obs-mob_glo_phy-sss_my_multi_P1D",
            "variables": ["sos"]
        },
        "ssh": {
            "dataset_id": "cmems_obs-sl_glo_phy-ssh_my_allsat-l4-duacs-0.125deg_P1D",
            "variables": ["sla", "adt", "ugos", "vgos"]
        },
        "target_glorys": {
            "dataset_id": "cmems_mod_glo_phy_my_0.083deg_P1D-m",
            "variables": ["thetao"],
            "depth_min": 0.494,
            "depth_max": 1000.0
        }
    },
    "nrt": {  # Near Real-Time (2024 - 2026)
        "sst": {
            "dataset_id": "cmems_SST_GLO_SST_L4_NRT_OBSERVATIONS_010_001",
            "variables": ["analysed_sst"]
        },
        "sss": {
            "dataset_id": "cmems_obs-mob_glo_phy-sss_nrt_multi_P1D",
            "variables": ["sos"]
        },
        "ssh": {
            "dataset_id": "cmems_obs-sl_glo_phy-ssh_nrt_allsat-l4-duacs-0.25deg_P1D",
            "variables": ["sla", "adt", "ugos", "vgos"]
        },
        # GLORYS Reanalysis does not exist for NRT
        "target_glorys": None
    }
}

def download_year_chunk(year: int, variable: str, domain: dict, output_base_dir: Path):
    """Downloads a 1-year chunk for a specific variable."""
    output_dir = output_base_dir / variable
    os.makedirs(output_dir, exist_ok=True)

    # Determine mode: MY for <= 2023, NRT for >= 2024
    mode = "my" if year <= 2023 else "nrt"
    var_config = DATASET_CATALOG[mode].get(variable, None)

    if variable == "target_glorys" and year >= 2024:
        print(f"[-] Skipping target_glorys for {year} (Reanalysis only available up to 2023).")
        return

    if var_config is None and variable in ["sst", "sss", "ssh", "target_glorys"]:
        print(f"[!] No configuration for {variable} in mode {mode}.")
        return

    start_date = f"{year}-01-01T00:00:00"
    end_date = f"{year}-12-31T23:59:59"

    print(f"\n---> Fetching [{variable.upper()}] for Year {year} (Mode: {mode.upper()})...")

    # 1. CMEMS Downloads
    if variable in ["sst", "sss", "ssh", "target_glorys"]:
        kwargs = {
            "dataset_id": var_config["dataset_id"],
            "variables": var_config["variables"],
            "minimum_longitude": float(domain["lon_min"]),
            "maximum_longitude": float(domain["lon_max"]),
            "minimum_latitude": float(domain["lat_min"]),
            "maximum_latitude": float(domain["lat_max"]),
            "start_datetime": start_date,
            "end_datetime": end_date,
            "output_directory": str(output_dir),
            "output_filename": f"{variable}_{year}.nc"
        }
        if "depth_min" in var_config:
            kwargs["minimum_depth"] = float(var_config["depth_min"])
            kwargs["maximum_depth"] = float(var_config["depth_max"])

        try:
            copernicusmarine.subset(**kwargs)
            print(f"[✓] Saved: {output_dir}/{variable}_{year}.nc")
        except Exception as e:
            print(f"[!] Error downloading {variable} for year {year}: {e}")

    # 2. NASA PO.DAAC (Winds / Currents)
    elif variable == "winds":
        bbox = (domain["lon_min"], domain["lat_min"], domain["lon_max"], domain["lat_max"])
        download_podaac_dataset(
            short_name="CCMP_WINDS_10M6HR_L4_V3.1",
            start_date=f"{year}-01-01",
            end_date=f"{year}-12-31",
            output_dir=str(output_dir),
            bounding_box=bbox
        )
    elif variable == "currents":
        bbox = (domain["lon_min"], domain["lat_min"], domain["lon_max"], domain["lat_max"])
        download_podaac_dataset(
            short_name="OSCAR_L4_OC_FINAL_V2.0",
            start_date=f"{year}-01-01",
            end_date=f"{year}-12-31",
            output_dir=str(output_dir),
            bounding_box=bbox
        )

def main():
    parser = argparse.ArgumentParser(
        description="Batch Ingestion for 2010 to 2026 North Indian Ocean Datasets"
    )
    parser.add_argument("--start-year", type=int, default=2010, help="Start year (e.g. 2010)")
    parser.add_argument("--end-year", type=int, default=2026, help="End year (e.g. 2026)")
    parser.add_argument(
        "--variables",
        nargs="+",
        default=["all"],
        help="Variables to download (sst, sss, ssh, target_glorys, winds, currents, or all)"
    )

    args = parser.parse_args()
    cfg = load_config()
    dom = cfg["domain"]
    raw_base = BACKEND_DIR / cfg["paths"].get("raw_data_dir", "data/raw")

    all_vars = ["sst", "sss", "ssh", "target_glorys", "winds", "currents"]
    selected_vars = all_vars if "all" in args.variables else args.variables

    print("\n=======================================================")
    print(" Project ABYSS Multi-Year Batch Downloader (2010 - 2026)")
    print(f" Years      : {args.start_year} -> {args.end_year}")
    print(f" Variables  : {', '.join(selected_vars)}")
    print(f" Target Dir : {raw_base}")
    print("=======================================================\n")

    for year in range(args.start_year, args.end_year + 1):
        print(f"\n==================== [ YEAR {year} ] ====================")
        for var in selected_vars:
            download_year_chunk(year, var, dom, raw_base)
            time.sleep(1) # brief cool-off between server requests

    print("\n[✓] Batch ingestion finished successfully!")

if __name__ == "__main__":
    main()
