# Backend Dockerfile for Project ABYSS FastAPI Service
FROM python:3.12-slim

# Prevent Python from writing .pyc files & enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies for NetCDF/HDF5/GCC/curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libhdf5-dev \
    libnetcdf-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip & packaging tools
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY . .

# Expose backend port
EXPOSE 8000

# Healthcheck to verify FastAPI service availability
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/info || exit 1

# Start Uvicorn ASGI server
CMD ["python", "-m", "src.server"]
