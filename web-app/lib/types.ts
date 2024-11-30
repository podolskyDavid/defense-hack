export interface Measurement {
  id: number;
  timestamp: number;
  session_name: string;
  magnetic_x: number;
  magnetic_y: number;
  magnetic_z: number;
  magnetic_magnitude: number;
  pitch: number;
  roll: number;
  acceleration_x: number;
  acceleration_y: number;
  acceleration_z: number;
}

export interface Position {
  x: number;
  y: number;
  z: number;
  timestamp: number;
  session_name: string;
  magnetic_magnitude: number;
}

export interface PathData {
  positions: Position[];
  session_name: string;
}