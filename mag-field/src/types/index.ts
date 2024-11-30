export interface MagneticData {
  x: number;
  y: number;
  z: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
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

// simplified subscription type that matches what we need
export interface SensorSubscription {
  remove: () => void;
}