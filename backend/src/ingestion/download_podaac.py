"""
NASA PO.DAAC / Earthdata Data Ingestion Module.
Downloads Surface Winds (CCMP / ASCAT) and Surface Currents (OSCAR).
"""

import os
import sys
from pathlib import Path
import yaml
import earthaccess

# Determine backend root directory dynamically
BACKEND_DIR = Path(__file__).resolve().parents[2]

def load_config(config_path: str = None) -> dict:
    """Loads configuration file with robust fallback paths."""
    if config_path is None:
        config_path = BACKEND_DIR / "configs" / "config.yaml"
    else:
        config_path = Path(config_path)
        if not config_path.is_absolute() and not config_path.exists():
            config_path = BACKEND_DIR / config_path

    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found at: {config_path}")

    with open(config_path, "r") as f:
        return yaml.safe_load(f)

def authenticate_earthdata():
    """Authenticates with NASA Earthdata Login."""
    print("[*] Authenticating with NASA Earthdata...")
    try:
        auth = earthaccess.login(strategy="interactive", persist=True)
        if not auth.authenticated:
            print("[!] Warning: Not authenticated with Earthdata.")
        return auth
    except Exception as e:
        print(f"[!] Earthdata login error: {e}")
        return None

def download_podaac_dataset(
    short_name: str,
    start_date: str,
    end_date: str,
    output_dir: str = None,
    bounding_box: tuple = (45.0, 5.0, 105.0, 30.0) # (lon_min, lat_min, lon_max, lat_max)
):
    """
    Searches and downloads granules for a specific PO.DAAC short_name / concept_id.
    
    Args:
        short_name: NASA dataset short name (e.g. 'CCMP_WINDS_10M6HR_L4_V3.1' or 'OSCAR_L4_OC_FINAL_V2.0')
        start_date: Start date string 'YYYY-MM-DD'
        end_date: End date string 'YYYY-MM-DD'
        output_dir: Local directory to save downloaded NetCDF files
        bounding_box: (lon_min, lat_min, lon_max, lat_max)
    """
    if output_dir is None:
        output_dir = str((BACKEND_DIR / "data" / "raw" / short_name.lower()).resolve())

    os.makedirs(output_dir, exist_ok=True)
    auth = authenticate_earthdata()

    print(f"\n=======================================================")
    print(f"[*] Searching NASA Earthdata for: {short_name}")
    print(f"    Time range   : {start_date} to {end_date}")
    print(f"    Bounding box : {bounding_box}")
    print(f"    Output dir   : {output_dir}")
    print(f"=======================================================")

    results = earthaccess.search_data(
        short_name=short_name,
        temporal=(start_date, end_date),
        bounding_box=bounding_box
    )

    print(f"[+] Found {len(results)} granules matching criteria.")
    if len(results) > 0:
        downloaded_files = earthaccess.download(results, output_dir)
        print(f"[✓] Downloaded {len(downloaded_files)} files into {output_dir}")
        return downloaded_files
    else:
        print(f"[!] No granules found for {short_name} within the given range.")
        return []

if __name__ == "__main__":
    cfg = load_config()
    start = cfg["time_range"]["default_start_date"]
    end = cfg["time_range"]["default_end_date"]
    dom = cfg["domain"]
    bbox = (dom["lon_min"], dom["lat_min"], dom["lon_max"], dom["lat_max"])
