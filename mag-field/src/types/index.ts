export interface MagneticData {
  x: number;
  y: number;
  z: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface MagneticSample {
  timestamp: number;
  magnetic: MagneticData;
  location: LocationData;
}