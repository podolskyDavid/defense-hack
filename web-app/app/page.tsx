"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

const SensorDisplay = () => {
  const [sensorData, setSensorData] = useState({
    acc: { x: 'N/A', y: 'N/A', z: 'N/A' },
    accG: { x: 'N/A', y: 'N/A', z: 'N/A' },
    mag: { x: 'N/A', y: 'N/A', z: 'N/A' }
  });
  const [error, setError] = useState<string | null>(null);

  const setupSensors = async () => {
    try {
      // Request motion permission on iOS
      const DeviceMotionEvent = window.DeviceMotionEvent as any;
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Motion permission denied');
        }
      }

      // Set up motion listener
      window.addEventListener('devicemotion', (event: DeviceMotionEvent) => {
        const acceleration = event.acceleration;
        const accelerationWithG = event.accelerationIncludingGravity;

        setSensorData(prev => ({
          ...prev,
          acc: {
            x: acceleration?.x?.toFixed(3) || 'N/A',
            y: acceleration?.y?.toFixed(3) || 'N/A',
            z: acceleration?.z?.toFixed(3) || 'N/A'
          },
          accG: {
            x: accelerationWithG?.x?.toFixed(3) || 'N/A',
            y: accelerationWithG?.y?.toFixed(3) || 'N/A',
            z: accelerationWithG?.z?.toFixed(3) || 'N/A'
          }
        }));
      });

      // Try to set up magnetometer
      // @ts-ignore
      if ('Magnetometer' in window) {
        try {
          // @ts-ignore
          const sensor = new Magnetometer({ frequency: 60 });

          sensor.addEventListener('reading', () => {
            setSensorData(prev => ({
              ...prev,
              mag: {
                x: sensor.x.toFixed(3),
                y: sensor.y.toFixed(3),
                z: sensor.z.toFixed(3)
              }
            }));
          });

          sensor.addEventListener('error', (error: Error) => {
            setError('Magnetometer error: ' + error.message);
          });

          await sensor.start();
        } catch (e) {
          setError('Magnetometer initialization failed: ' + (e as Error).message);
        }
      } else {
        // Try alternative approach using deviceorientation event
        window.addEventListener('deviceorientation', (event: DeviceOrientationEvent) => {
          const alpha = event.alpha; // z-axis rotation
          const beta = event.beta;   // x-axis rotation
          const gamma = event.gamma; // y-axis rotation

          if (alpha !== null && beta !== null && gamma !== null) {
            setSensorData(prev => ({
              ...prev,
              mag: {
                x: beta.toFixed(3),
                y: gamma.toFixed(3),
                z: alpha.toFixed(3)
              }
            }));
          }
        });
      }
    } catch (error) {
      setError('Sensor initialization failed: ' + (error as Error).message);
    }
  };

  useEffect(() => {
    // Initial setup
    setupSensors();

    return () => {
      window.removeEventListener('devicemotion', () => {});
      window.removeEventListener('deviceorientation', () => {});
    };
  }, []);

  const DataSection = ({ title, data }: { title: string; data: { x: string; y: string; z: string } }) => (
    <div className="space-y-2">
      <h2 className="font-mono font-bold">{title}</h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 font-mono">
        <div>X:</div><div>{data.x}</div>
        <div>Y:</div><div>{data.y}</div>
        <div>Z:</div><div>{data.z}</div>
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6 space-y-6">
        <DataSection title="ACCELERATION (M/S²)" data={sensorData.acc} />
        <DataSection title="ACCELERATION + G (M/S²)" data={sensorData.accG} />
        <DataSection title="MAGNETIC FIELD (µT)" data={sensorData.mag} />

        {error && (
          <div className="text-red-500 font-mono text-sm mt-4">
            {error}
          </div>
        )}

        <button
          onClick={setupSensors}
          className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded font-mono hover:bg-blue-600 transition-colors"
        >
          REINITIALIZE SENSORS
        </button>
      </CardContent>
    </Card>
  );
};

export default SensorDisplay;