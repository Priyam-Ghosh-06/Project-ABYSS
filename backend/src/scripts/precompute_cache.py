"""
Cache pre-computation script for OceanEmbed.
Pre-caches key seasonal benchmark days and initial dates into compressed .npz format.
"""

import sys
from pathlib import Path
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from src.core.cache_manager import CacheManager

def precompute():
    mgr = CacheManager()
    dates = mgr.loader.get_dates()
    
    priority_dates = set(dates[:15])
    for d in dates:
        day_num = d.split("-")[2]
        if day_num in ["01", "15"]:
            priority_dates.add(d)

    sorted_priority = sorted(list(priority_dates))
    print(f"Pre-caching {len(sorted_priority)} priority benchmark dates into {mgr.cache_dir}...")

    for d in tqdm(sorted_priority):
        mgr.get_day(d)

    print("Pre-caching completed successfully!")

if __name__ == "__main__":
    precompute()
