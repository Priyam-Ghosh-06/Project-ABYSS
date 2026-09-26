"""
Ocean Physics module for Project ABYSS.
Computes oceanographic diagnostics from 3D subsurface temperature fields:
- Z20: Depth of the 20°C isotherm (thermocline indicator)
- MLD: Mixed Layer Depth (temperature drop criterion)
- OHC: Upper Ocean Heat Content (top 100m / 300m)
Fully vectorized in NumPy for maximum execution speed.
"""

import numpy as np

def compute_z20(temp_3d: np.ndarray, depths: np.ndarray) -> np.ndarray:
    """
    Computes depth of the 20°C isotherm (Z20) in meters using vectorized vertical interpolation.
    temp_3d: shape (D, H, W)
    depths: 1D array of depth values in meters
    Returns: shape (H, W) array of Z20 depths (NaN over land)
    """
    D, H, W = temp_3d.shape
    t_upper = temp_3d[:-1, :, :]
    t_lower = temp_3d[1:, :, :]
    z_upper = depths[:-1, None, None]
    z_lower = depths[1:, None, None]

    crossing = (t_upper >= 20.0) & (t_lower < 20.0) & (~np.isnan(t_upper)) & (~np.isnan(t_lower))
    
    delta_t = t_upper - t_lower
    delta_t = np.where(delta_t == 0, 1e-6, delta_t)
    interp = z_upper + ((t_upper - 20.0) / delta_t) * (z_lower - z_upper)

    has_cross = crossing.any(axis=0)
    first_idx = np.argmax(crossing, axis=0) # First true index along depth axis
    z20 = np.where(has_cross, np.take_along_axis(interp, first_idx[None, :, :], axis=0)[0], np.nan)

    # Fallback for surface < 20°C
    surf = temp_3d[0, :, :]
    z20 = np.where(np.isnan(z20) & (~np.isnan(surf)) & (surf < 20.0), depths[0], z20)
    return np.round(z20.astype(np.float32), 1)


def compute_mld(temp_3d: np.ndarray, depths: np.ndarray, delta_t_crit: float = 0.5) -> np.ndarray:
    """
    Computes Mixed Layer Depth (MLD) in meters where T(z) = T(surface) - delta_t_crit.
    Vectorized along depth axis.
    """
    D, H, W = temp_3d.shape
    surf_temp = temp_3d[0:1, :, :]
    threshold = surf_temp - delta_t_crit

    t_upper = temp_3d[:-1, :, :]
    t_lower = temp_3d[1:, :, :]
    z_upper = depths[:-1, None, None]
    z_lower = depths[1:, None, None]

    crossing = (t_upper >= threshold) & (t_lower < threshold) & (~np.isnan(t_upper)) & (~np.isnan(t_lower))

    delta_t = t_upper - t_lower
    delta_t = np.where(delta_t == 0, 1e-6, delta_t)
    interp_mld = z_upper + ((t_upper - threshold) / delta_t) * (z_lower - z_upper)

    has_cross = crossing.any(axis=0)
    first_idx = np.argmax(crossing, axis=0)
    mld = np.where(has_cross, np.take_along_axis(interp_mld, first_idx[None, :, :], axis=0)[0], depths[-1])
    
    # Over land mask
    mld = np.where(np.isnan(surf_temp[0, :, :]), np.nan, mld)
    return np.round(mld.astype(np.float32), 1)


def compute_ohc(temp_3d: np.ndarray, depths: np.ndarray, max_depth: float = 100.0) -> np.ndarray:
    """
    Computes Upper Ocean Heat Content in top max_depth meters (GJ/m²).
    rho = 1025 kg/m3, Cp = 3985 J/(kg K)
    """
    D, H, W = temp_3d.shape
    ohc = np.zeros((H, W), dtype=np.float32)
    rho_cp = 1025.0 * 3985.0 / 1e9 # in GJ / (°C * m³)

    valid_mask = ~np.isnan(temp_3d[0, :, :])

    for i in range(D - 1):
        if depths[i] >= max_depth:
            break
        z_top = depths[i]
        z_bot = min(depths[i + 1], max_depth)
        dz = z_bot - z_top
        layer_temp = (temp_3d[i, :, :] + temp_3d[i + 1, :, :]) * 0.5
        
        ohc += np.where(~np.isnan(layer_temp), layer_temp * dz * rho_cp, 0.0)

    ohc = np.where(valid_mask, np.round(ohc, 2), np.nan)
    return ohc.astype(np.float32)
