"use client"

import React, { useState, useEffect } from 'react';
import { Compass } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MagnetometerDemo = () => {
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      setError('Your device does not support orientation detection');
      return;
    }

    if (isListening) {
      window.addEventListener('deviceorientation', handleOrientation);

      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    }
  }, [isListening]);

  const handleOrientation = (event: DeviceOrientationEvent) => {
    const alpha = event.alpha;
    if (alpha !== null) {
      setHeading(Math.round(alpha));
    }
  };

  const handlePermissionRequest = async () => {
    try {
      const DeviceOrientationEventIOS = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      };

      if (typeof DeviceOrientationEventIOS.requestPermission === 'function') {
        const permissionResult = await DeviceOrientationEventIOS.requestPermission();
        if (permissionResult === 'granted') {
          setIsListening(true);
        } else {
          setError('Permission denied. Please enable compass access to use this feature.');
        }
      } else {
        // For non-iOS devices, just start listening
        setIsListening(true);
      }
    } catch (err) {
      setError('Failed to get permission: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const getDirectionText = (degrees: number): string => {
    if (degrees >= 337.5 || degrees < 22.5) return 'North';
    if (degrees >= 22.5 && degrees < 67.5) return 'Northeast';
    if (degrees >= 67.5 && degrees < 112.5) return 'East';
    if (degrees >= 112.5 && degrees < 157.5) return 'Southeast';
    if (degrees >= 157.5 && degrees < 202.5) return 'South';
    if (degrees >= 202.5 && degrees < 247.5) return 'Southwest';
    if (degrees >= 247.5 && degrees < 292.5) return 'West';
    return 'Northwest';
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="h-6 w-6" />
          Compass
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="text-center space-y-4">
            {heading !== null ? (
              <>
                <div className="text-4xl font-bold">{heading}°</div>
                <div className="text-xl text-gray-600">
                  {getDirectionText(heading)}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">
                  {isListening
                    ? 'Waiting for sensor data...'
                    : 'Click the button below to enable compass access'}
                </p>
                {!isListening && (
                  <button
                    onClick={handlePermissionRequest}
                    className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Enable Compass
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MagnetometerDemo;