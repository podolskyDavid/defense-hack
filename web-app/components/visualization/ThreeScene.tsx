// components/visualization/ThreeScene.tsx
"use client"

import { useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
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

function PathLine({positions, color}: {positions: Position[]; color: string}) {
  const points = positions.map(p => new THREE.Vector3(p.x, p.y, p.z));
  return <Line points={points} color={color} lineWidth={2} />;
}

function Heatmap({
                   interpolatedData,
                   minValue,
                   maxValue
                 }: {
  interpolatedData: { x: number; y: number; value: number }[];
  minValue: number;
  maxValue: number;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    const colorScale = new THREE.Color();

    interpolatedData.forEach(point => {
      vertices.push(point.x, point.y, 0);
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
      <pointsMaterial size={5} vertexColors transparent opacity={0.6} />
    </points>
  );
}

export default function ThreeScene({
                                     paths,
                                     gridSize,
                                     radius
                                   }: {
  paths: PathData[];
  gridSize: number;
  radius: number;
}) {
  const allPositions = paths.flatMap(path => path.positions);
  const interpolatedData = useMemo(
    () => interpolateMagneticField(allPositions, gridSize, radius),
    [allPositions, gridSize, radius]
  );

  const minValue = Math.min(...interpolatedData.map(d => d.value));
  const maxValue = Math.max(...interpolatedData.map(d => d.value));

  return (
    <Canvas
      camera={{ position: [10, 10, 10], fov: 75 }}
      style={{ background: 'rgb(17, 24, 39)' }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

      {paths.map((path, index) => (
        <PathLine
          key={path.session_name}
          positions={path.positions}
          color={colors[index % colors.length]}
        />
      ))}

      <Heatmap
        interpolatedData={interpolatedData}
        minValue={minValue}
        maxValue={maxValue}
      />

      <OrbitControls />
      <gridHelper args={[20, 20]} />
      <axesHelper args={[5]} />
    </Canvas>
  );
}