"use client"

import React, { useState, useEffect } from 'react';
import { Compass } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define the type for iOS DeviceOrientationEvent
interface IOSDeviceOrientationEvent extends DeviceOrientationEvent {
  requestPermission?: () => Promise<PermissionState>;
}

const MagnetometerDemo = () => {
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      setError('Your device does not support orientation detection');
      return;
    }

    const requestPermission = async () => {
      // Cast to our custom interface that includes requestPermission
      const DeviceOrientationEventIOS = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      };

      if (typeof DeviceOrientationEventIOS.requestPermission === 'function') {
        try {
          const permissionState = await DeviceOrientationEventIOS.requestPermission();
          setPermission(permissionState);

          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        } catch (err) {
          setError('Failed to get permission: ' + (err instanceof Error ? err.message : String(err)));
        }
      } else {
        // Non-iOS devices don't need explicit permission
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // alpha is the compass direction the device is facing
      const alpha = event.alpha;
      if (alpha !== null) {
        setHeading(Math.round(alpha));
      }
    };

    requestPermission();

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const requestPermissionButton = () => {
    const DeviceOrientationEventIOS = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };

    if (permission === 'prompt' || permission === 'denied') {
      return (
        <button
          onClick={async () => {
            if (DeviceOrientationEventIOS.requestPermission) {
              const newPermission = await DeviceOrientationEventIOS.requestPermission();
              setPermission(newPermission);
            }
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Enable Magnetometer Access
        </button>
      );
    }
    return null;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="h-6 w-6" />
          Magnetometer Reading
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="text-center">
            {heading !== null ? (
              <div className="space-y-4">
                <div className="text-4xl font-bold">{heading}°</div>
                <div className="text-gray-600">
                  Device is pointing {heading} degrees from magnetic north
                </div>
              </div>
            ) : (
              <div className="text-gray-600">
                Waiting for sensor data...
                {requestPermissionButton()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MagnetometerDemo;