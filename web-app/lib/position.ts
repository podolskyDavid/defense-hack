import {Measurement, Position} from "@/lib/types";

export function getPositionFromAcceleration(
  measurements: Measurement[]
): Position[] {
  const positions: Position[] = [];
  let vx = 0, vy = 0, vz = 0;
  let px = 0, py = 0, pz = 0;
  let lastTimestamp = measurements[0].timestamp;

  measurements.forEach((measurement, index) => {
    if (index === 0) return;

    const dt = (measurement.timestamp - lastTimestamp) / 1000; // Convert to seconds

    // Simple double integration
    // v = v0 + a*t
    vx += measurement.acceleration_x * dt;
    vy += measurement.acceleration_y * dt;
    vz += measurement.acceleration_z * dt;

    // p = p0 + v*t
    px += vx * dt;
    py += vy * dt;
    pz += vz * dt;

    positions.push({
      x: px,
      y: py,
      z: pz,
      timestamp: measurement.timestamp,
      session_name: measurement.session_name,
      magnetic_magnitude: measurement.magnetic_magnitude
    });

    lastTimestamp = measurement.timestamp;
  });

  return positions;
}
