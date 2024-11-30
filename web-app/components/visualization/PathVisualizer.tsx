// components/visualization/PathVisualizer.tsx
"use client"

import dynamic from 'next/dynamic';
import { PathData } from '@/lib/types';

const ThreeScene = dynamic(
  () => import('./ThreeScene'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading 3D visualization...</div>
      </div>
    )
  }
);

interface VisualizerProps {
  paths: PathData[];
  gridSize: number;
  radius: number;
}

export default function PathVisualizer({ paths, gridSize, radius }: VisualizerProps) {
  return (
    <div className="w-full h-screen">
      <ThreeScene paths={paths} gridSize={gridSize} radius={radius} />
    </div>
  );
}