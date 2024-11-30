import * as turf from '@turf/turf';
import type { Feature, Point, FeatureCollection } from 'geojson';
import {Position} from "@/lib/types";

export function interpolateMagneticField(
  positions: Position[],
  gridSize: number,
  radius: number
): { x: number; y: number; value: number }[] {
  const points = positions.map(pos => turf.point(
    [pos.x, pos.y],
    { magnitude: pos.magnetic_magnitude }
  ));

  const pointsCollection: FeatureCollection<Point, { magnitude: number }> = turf.featureCollection(points);
  const bounds = turf.bbox(pointsCollection);
  const cellSize = (bounds[2] - bounds[0]) / gridSize;

  const grid: { x: number; y: number; value: number }[] = [];

  for (let x = bounds[0]; x <= bounds[2]; x += cellSize) {
    for (let y = bounds[1]; y <= bounds[3]; y += cellSize) {
      const nearbyPoints = points.filter((point: Feature<Point, { magnitude: number }>) => {
        const distance = turf.distance(
          turf.point([x, y]),
          point,
          { units: 'meters' }
        );
        return distance <= radius;
      });

      if (nearbyPoints.length > 0) {
        const avgMagnitude = nearbyPoints.reduce(
          (sum, point) => sum + point.properties.magnitude,
          0
        ) / nearbyPoints.length;

        grid.push({ x, y, value: avgMagnitude });
      }
    }
  }

  return grid;
}