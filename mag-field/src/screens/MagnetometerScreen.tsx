import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Button, Dimensions } from 'react-native';
import { Magnetometer, MagnetometerMeasurement } from 'expo-sensors';
import * as Location from 'expo-location';
import type { LocationObject, LocationSubscription } from 'expo-location';
import type { Subscription } from 'expo-sensors/build/Subscription';
import type { MagneticData, LocationData } from '../types';

export default function MagnetometerScreen(): React.JSX.Element {
  const [magnetometerData, setMagnetometerData] = useState<MagneticData>({ x: 0, y: 0, z: 0 });
  const [location, setLocation] = useState<LocationData | null>(null);
  const [magnetometerSubscription, setMagnetometerSubscription] = useState<Subscription | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<LocationSubscription | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  useEffect(() => {
    requestPermissions();
    return () => {
      unsubscribe();
    };
  }, []);

  const requestPermissions = async (): Promise<void> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const subscribe = async (): Promise<void> => {
    // Subscribe to magnetometer
    setMagnetometerSubscription(
      Magnetometer.addListener((data: MagnetometerMeasurement) => {
        setMagnetometerData(data);
      })
    );

    // Subscribe to location updates
    const locationSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1
      },
      (locationObject: LocationObject) => {
        setLocation({
          latitude: locationObject.coords.latitude,
          longitude: locationObject.coords.longitude,
          accuracy: locationObject.coords.accuracy,
          altitude: locationObject.coords.altitude,
          altitudeAccuracy: locationObject.coords.altitudeAccuracy,
          heading: locationObject.coords.heading,
          speed: locationObject.coords.speed,
        });
      }
    );

    setLocationSubscription(locationSub);
    Magnetometer.setUpdateInterval(16); // ~60Hz
  };

  const unsubscribe = (): void => {
    if (magnetometerSubscription) {
      magnetometerSubscription.remove();
      setMagnetometerSubscription(null);
    }
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  };

  const toggleRecording = (): void => {
    if (isRecording) {
      unsubscribe();
    } else {
      subscribe();
    }
    setIsRecording(!isRecording);
  };

  const magnitude = Math.sqrt(
    magnetometerData.x ** 2 +
    magnetometerData.y ** 2 +
    magnetometerData.z ** 2
  );

  return (
    <View style={styles.container}>
      <View style={styles.dataContainer}>
        <Text style={styles.text}>Magnetic Field Components (μT):</Text>
        <Text style={styles.text}>X: {magnetometerData.x.toFixed(2)}</Text>
        <Text style={styles.text}>Y: {magnetometerData.y.toFixed(2)}</Text>
        <Text style={styles.text}>Z: {magnetometerData.z.toFixed(2)}</Text>
        <Text style={styles.text}>Magnitude: {magnitude.toFixed(2)}</Text>
      </View>

      {location && (
        <View style={styles.dataContainer}>
          <Text style={styles.text}>Location:</Text>
          <Text style={styles.text}>
            Lat: {location.latitude.toFixed(6)}
          </Text>
          <Text style={styles.text}>
            Lon: {location.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title={isRecording ? "Stop Recording" : "Start Recording"}
          onPress={toggleRecording}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  dataContainer: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  text: {
    fontSize: 16,
    marginVertical: 5,
  },
  buttonContainer: {
    marginTop: 20,
  },
});