"""
CMEMS (Copernicus Marine Service) Data Ingestion Module.
Downloads SST, SSS, SSH/SLA, and Target GLORYS Subsurface Temperature.
Automatically detects whether to use Reprocessed Multi-Year (MY) for <= 2023 or Near Real-Time (NRT) for >= 2024.
"""

import os
import sys
from pathlib import Path
import yaml
import copernicusmarine

BACKEND_DIR = Path(__file__).resolve().parents[2]

# Central Dataset Catalog for MY (<=2023) and NRT (>=2024)
CMEMS_CATALOG = {
    "my": {  # Historical Reprocessed (2010 - 2023)
        "sst": {
            "dataset_id": "METOFFICE-GLO-SST-L4-REP-OBS-SST",
            "alt_dataset_id": "cmems_obs-sst_glo_phy-sst_my_0.05deg_P1D-m",
            "variables": ["analysed_sst"],
            "description": "OSTIA Global SST L4 Reprocessed (DOI: 10.48670/moi-00168)"
        },
        "sss": {
            "dataset_id": "cmems_obs-mob_glo_phy-sss_my_multi_P1D",
            "alt_dataset_id": "MULTIOBS_GLO_PHY_S_SURFACE_MYNRT_015_013",
            "variables": ["sos"],
            "description": "Global SSS L4 Multi-Year Reprocessed (DOI: 10.48670/moi-00051)"
        },
        "ssh": {
            "dataset_id": "cmems_obs-sl_glo_phy-ssh_my_allsat-l4-duacs-0.125deg_P1D",
            "alt_dataset_id": "c3s_obs-sl_glo_phy-ssh_my_two-sat-l4-duacs-0.25deg_P1D",
            "variables": ["sla", "adt", "ugos", "vgos"],
            "description": "DUACS Sea Level Anomaly Multi-Year (DOI: 10.48670/moi-00145)"
        },
        "target_glorys": {
            "dataset_id": "cmems_mod_glo_phy_my_0.083deg_P1D-m",
            "variables": ["thetao"],
            "depth_min": 0.494,
            "depth_max": 1000.0,
            "description": "GLORYS12V1 Daily Subsurface Temperature Reanalysis (DOI: 10.48670/moi-00021)"
        }
    },
    "nrt": {  # Near Real-Time (2024 - Present)
        "sst": {
            "dataset_id": "cmems_SST_GLO_SST_L4_NRT_OBSERVATIONS_010_001",
            "variables": ["analysed_sst"],
            "description": "OSTIA Global SST L4 Near Real-Time"
        },
        "sss": {
            "dataset_id": "cmems_obs-mob_glo_phy-sss_nrt_multi_P1D",
            "variables": ["sos"],
            "description": "Global SSS L4 Near Real-Time"
        },
        "ssh": {
            "dataset_id": "cmems_obs-sl_glo_phy-ssh_nrt_allsat-l4-duacs-0.25deg_P1D",
            "variables": ["sla", "adt", "ugos", "vgos"],
            "description": "DUACS Sea Level Anomaly Near Real-Time"
        },
        "target_glorys": None
    }
}

def load_config(config_path: str = None) -> dict:
    """Loads configuration file with fallback paths."""
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

def download_cmems_variable(
    var_key: str,
    start_date: str,
    end_date: str,
    config: dict = None,
    output_dir: str = None
) -> None:
    """
    Subsets and downloads a specific ocean variable from Copernicus Marine Service,
    automatically selecting MY vs NRT mode based on the start_date year.
    """
    if config is None:
        config = load_config()

    domain = config["domain"]
    year = int(start_date.split("-")[0])
    mode = "my" if year <= 2023 else "nrt"

    if var_key == "target_glorys" and mode == "nrt":
        print(f"[-] Skipping target_glorys for {year}: Reanalysis target ground truth only exists up to 2023.")
        return

    catalog = CMEMS_CATALOG[mode]
    if var_key not in catalog or catalog[var_key] is None:
        raise ValueError(f"Unknown variable '{var_key}' for mode '{mode}'.")

    dataset_info = catalog[var_key]
    primary_id = dataset_info["dataset_id"]
    alt_id = dataset_info.get("alt_dataset_id", None)
    variables = dataset_info["variables"]

    if output_dir is None:
        raw_base = config["paths"].get("raw_data_dir", "data/raw")
        output_dir = str((BACKEND_DIR / raw_base / var_key).resolve())

    os.makedirs(output_dir, exist_ok=True)

    print(f"\n=======================================================")
    print(f"[*] Starting download for: {dataset_info['description']} [{var_key}]")
    print(f"    Mode         : {mode.upper()} ({'Historical Reanalysis' if mode == 'my' else 'Operational Near Real-Time'})")
    print(f"    Dataset ID   : {primary_id}")
    print(f"    Variables    : {variables}")
    print(f"    Time range   : {start_date} to {end_date}")
    print(f"    Bounding box : Lat [{domain['lat_min']}, {domain['lat_max']}], Lon [{domain['lon_min']}, {domain['lon_max']}]")
    print(f"    Output dir   : {output_dir}")
    print(f"=======================================================")

    dataset_candidates = [primary_id]
    if alt_id:
        dataset_candidates.append(alt_id)

    last_error = None
    for candidate_id in dataset_candidates:
        kwargs = {
            "dataset_id": candidate_id,
            "variables": variables,
            "minimum_longitude": float(domain["lon_min"]),
            "maximum_longitude": float(domain["lon_max"]),
            "minimum_latitude": float(domain["lat_min"]),
            "maximum_latitude": float(domain["lat_max"]),
            "start_datetime": f"{start_date}T00:00:00",
            "end_datetime": f"{end_date}T23:59:59",
            "output_directory": output_dir,
        }

        if "depth_min" in dataset_info and "depth_max" in dataset_info:
            kwargs["minimum_depth"] = float(dataset_info["depth_min"])
            kwargs["maximum_depth"] = float(dataset_info["depth_max"])

        try:
            print(f"[i] Querying CMEMS with dataset ID: {candidate_id}...")
            copernicusmarine.subset(**kwargs)
            print(f"[✓] Successfully downloaded {var_key} into {output_dir}")
            return
        except Exception as e:
            last_error = e
            print(f"[!] Attempt with dataset ID '{candidate_id}' failed: {e}", file=sys.stderr)

    print(f"[X] Failed to download {var_key} with candidate IDs: {dataset_candidates}", file=sys.stderr)
    raise last_error
