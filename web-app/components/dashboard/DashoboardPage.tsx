"use client"

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// TypeScript interfaces
interface MagneticData {
  x: number;
  y: number;
  z: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
}

interface DataPoint {
  timestamp: number;
  magnetic: MagneticData;
  location: LocationData;
}

const DashboardPage: React.FC = () => {
  // Mock data with correct typing
  const mockData: DataPoint[] = Array.from({ length: 100 }, (_, i) => ({
    timestamp: Date.now() + i * 1000,
    magnetic: {
      x: Math.sin(i * 0.1) * 10,
      y: Math.cos(i * 0.1) * 8,
      z: Math.sin(i * 0.05) * 15
    },
    location: {
      latitude: 0,
      longitude: 0
    }
  }));

  // Component for rendering individual charts
  const ChartComponent: React.FC<{
    title: string;
    dataKey: string;
    color: string;
    data: DataPoint[];
  }> = ({ title, dataKey, color, data }) => (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['auto', 'auto']}
              tick={{ fill: '#999' }}
              stroke="#666"
            />
            <YAxis tick={{ fill: '#999' }} stroke="#666" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: 'none' }}
              labelStyle={{ color: '#999' }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Magnetic Field Dashboard</h1>
        <div className="text-sm text-gray-400">Real-time magnetic field visualization</div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Time Series Charts */}
        <div className="space-y-4">
          <ChartComponent
            title="X Component"
            dataKey="magnetic.x"
            color="#ff4444"
            data={mockData}
          />
          <ChartComponent
            title="Y Component"
            dataKey="magnetic.y"
            color="#44ff44"
            data={mockData}
          />
          <ChartComponent
            title="Z Component"
            dataKey="magnetic.z"
            color="#4444ff"
            data={mockData}
          />
        </div>

        {/* Right Panel - placeholder for vector visualization */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Vector Field Visualization</h2>
          <div className="h-96 flex items-center justify-center border border-gray-700 rounded">
            <p className="text-gray-400">Vector visualization coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;