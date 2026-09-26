export interface SystemInfo {
  project: string;
  problem_statement_id: string;
  organization: string;
  domain: {
    name: string;
    lat_min: number;
    lat_max: number;
    lon_min: number;
    lon_max: number;
    resolution: number;
    grid_shape: [number, number];
  };
  temporal_range: {
    start_date: string;
    end_date: string;
    total_days: number;
  };
  standard_depths: number[];
  variables: Record<string, VariableMeta>;
}

export interface VariableMeta {
  name: string;
  short_name: string;
  unit: string;
  category: 'surface' | 'surface_vector' | 'subsurface' | 'diagnostic';
  source: string;
  colormap: string;
  min_val: number;
  max_val: number;
  description: string;
}

export interface DatesResponse {
  count: number;
  dates: string[];
  tagged_dates: { date: string; season: string }[];
  key_benchmarks: { date: string; name: string; focus: string }[];
}

export interface SurfaceDataResponse {
  date: string;
  variable: string;
  name: string;
  unit: string;
  depth: number;
  min: number;
  max: number;
  mean: number;
  latitudes: number[];
  longitudes: number[];
  grid: (number | null)[][];
  u?: (number | null)[][];
  v?: (number | null)[][];
}

export interface VolumeLayer {
  depth: number;
  grid: (number | null)[][];
}

export interface Volume3DResponse {
  date: string;
  depths: number[];
  latitudes: number[];
  longitudes: number[];
  shape: [number, number, number];
  min_temp: number;
  max_temp: number;
  layers: VolumeLayer[];
}

export interface TransectResponse {
  date: string;
  slice_type: 'zonal' | 'meridional';
  fixed_coord: string;
  fixed_value: number;
  x_coords: number[];
  x_label: string;
  depths: number[];
  grid: (number | null)[][];
  z20_profile: (number | null)[];
  mld_profile: (number | null)[];
  min: number;
  max: number;
}

export interface SoundingProfilePoint {
  depth: number;
  temperature: number | null;
}

export interface ProfileResponse {
  date: string;
  latitude: number;
  longitude: number;
  is_ocean: boolean;
  profile: SoundingProfilePoint[];
  surface_sst: number | null;
  surface_sss: number | null;
  surface_ssh: number | null;
  wind_speed: number | null;
  current_speed: number | null;
  u_wind: number | null;
  v_wind: number | null;
  u_curr: number | null;
  v_curr: number | null;
  thermocline_z20: number | null;
  mixed_layer_depth: number | null;
  ocean_heat_content: number | null;
}

export interface ReconstructionResponse {
  date: string;
  depth: number;
  split?: string;
  metrics: {
    rmse: number;
    mae: number;
    bias: number;
    correlation: number;
    skill_score: number;
    ocean_grid_points: number;
  };
  model_info: {
    architecture: string;
    latent_dim: number;
    input_channels: string[];
    sample_latent_vector: number[];
  };
  ground_truth_grid: (number | null)[][];
  reconstructed_grid: (number | null)[][];
  error_map_grid: (number | null)[][];
  min_val: number;
  max_val: number;
  latitudes: number[];
  longitudes: number[];
}
