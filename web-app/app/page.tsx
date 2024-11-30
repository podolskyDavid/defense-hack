'use client';

import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { PathData } from '@/lib/types';

// Dynamically import the 3D visualization component to avoid SSR issues
const Visualizer = dynamic(
  () => import('@/components/visualization/PathVisualizer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading 3D visualization...</div>
      </div>
    ),
  }
);
import { ControlPanel } from '@/components/visualization/ControlPanel';

export default function Home() {
  const [paths, setPaths] = useState<PathData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState(50);
  const [radius, setRadius] = useState(1.0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/measurements');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        setPaths(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading visualization data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-red-500 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <main className="relative h-screen w-full">
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-2xl font-bold text-white mb-2">
          Sensor Data Visualization
        </h1>
        <div className="text-white/70 text-sm">
          {paths.length} measurement sessions loaded
        </div>
      </div>

      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-gray-900">
          <div className="text-white text-xl">Loading visualization...</div>
        </div>
      }>
        <Visualizer
          paths={paths}
          gridSize={gridSize}
          radius={radius}
        />
      </Suspense>

      <ControlPanel
        gridSize={gridSize}
        setGridSize={setGridSize}
        radius={radius}
        setRadius={setRadius}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-md p-4 rounded-lg">
        <h3 className="text-white font-medium mb-2">Sessions</h3>
        <div className="space-y-2">
          {paths.map((path, index) => (
            <div key={path.session_name} className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded"
                style={{
                  backgroundColor: [
                    '#ff0000',
                    '#00ff00',
                    '#0000ff',
                    '#ffff00',
                    '#ff00ff',
                    '#00ffff',
                  ][index % 6],
                }}
              />
              <span className="text-white text-sm">
                {path.session_name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}