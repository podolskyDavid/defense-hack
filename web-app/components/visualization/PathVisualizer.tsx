"use client"

import { useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Stats } from '@react-three/drei';
import * as THREE from 'three';
import { PathData, Position } from '@/lib/types';
import { interpolateMagneticField } from "@/lib/interpolation";

const colors = [
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#ff00ff',
  '#00ffff',
];

interface PathLineProps {
  positions: Position[];
  color: string;
}

function PathLine({positions, color}: PathLineProps) {
  const points = positions.map(p => new THREE.Vector3(p.x, p.y, p.z));

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
    />
  );
}

interface HeatmapProps {
  interpolatedData: { x: number; y: number; value: number }[];
  minValue: number;
  maxValue: number;
}

function Heatmap({interpolatedData, minValue, maxValue}: HeatmapProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    const colorScale = new THREE.Color();

    interpolatedData.forEach(point => {
      vertices.push(point.x, point.y, 0);

      // Normalize value between 0 and 1
      const normalizedValue = (point.value - minValue) / (maxValue - minValue);
      colorScale.setHSL(0.7 - normalizedValue * 0.7, 1.0, 0.5);

      colors.push(colorScale.r, colorScale.g, colorScale.b);
    });

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    return geo;
  }, [interpolatedData, minValue, maxValue]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={5}
        vertexColors
        transparent
        opacity={0.6}
      />
    </points>
  );
}

interface VisualizerProps {
  paths: PathData[];
  gridSize: number;
  radius: number;
}

export default function Visualizer({ paths, gridSize, radius }: VisualizerProps) {
  const allPositions = paths.flatMap(path => path.positions);

  const interpolatedData = useMemo(() =>
      interpolateMagneticField(allPositions, gridSize, radius),
    [allPositions, gridSize, radius]
  );

  const minValue = Math.min(...interpolatedData.map(d => d.value));
  const maxValue = Math.max(...interpolatedData.map(d => d.value));

  return (
    <div className="w-full h-screen">
      <Canvas
        camera={{ position: [10, 10, 10], fov: 75 }}
        className="bg-gray-900"
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />

          {/* Paths */}
          {paths.map((path, index) => (
            <PathLine
              key={path.session_name}
              positions={path.positions}
              color={colors[index % colors.length]}
            />
          ))}

          {/* Heatmap */}
          <Heatmap
            interpolatedData={interpolatedData}
            minValue={minValue}
            maxValue={maxValue}
          />

          {/* Controls */}
          <OrbitControls />

          {/* Grid and axes helpers */}
          <gridHelper args={[20, 20]} />
          <axesHelper args={[5]} />
        </Suspense>
        <Stats />
      </Canvas>
    </div>
  );
}

