# SIH 2026

## Download Data

```bash
cd backend
python -m venv venv
source ./venv/bin/activate
cd ..
```

Make account at [https://marine.copernicus.eu/](https://marine.copernicus.eu/)

Make account at [https://urs.earthdata.nasa.gov/](https://urs.earthdata.nasa.gov/)

Run `copernicusmarine login`

```bash
python backend/src/ingestion/download_batch.py --start-year 2018 --end-year 2021
python backend/src/ingestion/download_all.py --start-date 2025-01-01 --end-date 2025-01-21
```
