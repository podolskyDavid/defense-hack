import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Button,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { Magnetometer, Accelerometer } from "expo-sensors";
import * as Location from "expo-location";
import type { LocationObject, LocationSubscription } from "expo-location";
import type { Subscription } from "expo-sensors/build/Subscription";
import type { MagneticData, LocationData } from "../types";

export default function MagnetometerScreen(): React.JSX.Element {
  const [magnetometerData, setMagnetometerData] = useState<MagneticData>({
    x: 0,
    y: 0,
    z: 0,
  });
  const [location, setLocation] = useState<LocationData | null>(null);
  const [magnetometerSubscription, setMagnetometerSubscription] =
    useState<Subscription | null>(null);
  const [locationSubscription, setLocationSubscription] =
    useState<LocationSubscription | null>(null);
  const [accelerometerSubscription, setAccelerometerSubscription] =
    useState<Subscription | null>(null);
  const [accelerometerData, setAccelerometerData] =
    useState<AccelerometerMeasurement | null>({
      x: 0,
      y: 0,
      z: 0,
    });
  const [sessionName, setSessionName] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [dataBatch, setDataBatch] = useState<any[]>([]);

  const magnetometerDataRef = useRef<MagneticData>(magnetometerData);
  const accelerometerDataRef = useRef<AccelerometerMeasurement | null>(
    accelerometerData
  );
  const locationDataRef = useRef<LocationData | null>(location);
  const pitchRef = useRef<number>(0);
  const rollRef = useRef<number>(0);

  useEffect(() => {
    magnetometerDataRef.current = magnetometerData;
  }, [magnetometerData]);

  useEffect(() => {
    accelerometerDataRef.current = accelerometerData;
    if (accelerometerData) {
      const { pitch, roll } = calculateTilt(accelerometerData);
      pitchRef.current = pitch;
      rollRef.current = roll;
    }
  }, [accelerometerData]);

  useEffect(() => {
    locationDataRef.current = location;
  }, [location]);

  useEffect(() => {
    requestPermissions();
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        recordDataBatch();
      }, 500); // Record data every second
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (dataBatch.length >= 5) {
      sendDataToServer(dataBatch);
      setDataBatch([]);
    }
  }, [dataBatch]);

  const requestPermissions = async (): Promise<void> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);
    }
  };

  const sendDataToServer = async (dataBatch: any[]): Promise<void> => {
    try {
      const response = await fetch(
        "https://2251-195-154-25-110.ngrok-free.app/api/measurements/batch",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataBatch),
        }
      );
      if (!response.ok) {
        console.error("Failed to send data to server:", response.statusText);
      }
      console.log("Data sent to server:", dataBatch);
    } catch (error) {
      console.error("Error sending data to server:", error);
    }
  };

  const subscribeToMagnetometer = (): void => {
    setMagnetometerSubscription(
      Magnetometer.addListener((data: MagnetometerMeasurement) => {
        setMagnetometerData(data);
      })
    );
    Magnetometer.setUpdateInterval(16); // ~60Hz
  };

  const subscribeToAccelerometer = (): void => {
    setAccelerometerSubscription(
      Accelerometer.addListener((data: AccelerometerMeasurement) => {
        setAccelerometerData(data);
      })
    );
    Accelerometer.setUpdateInterval(16); // ~60Hz
  };

  const subscribeToLocation = async (): Promise<void> => {
    const locationSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (locationObject: LocationObject) => {
        const locationData = {
          latitude: locationObject.coords.latitude,
          longitude: locationObject.coords.longitude,
          accuracy: locationObject.coords.accuracy,
          altitude: locationObject.coords.altitude,
          altitudeAccuracy: locationObject.coords.altitudeAccuracy,
          heading: locationObject.coords.heading,
          speed: locationObject.coords.speed,
        };
        setLocation(locationData);
      }
    );

    setLocationSubscription(locationSub);
  };

  const subscribe = async (): Promise<void> => {
    subscribeToMagnetometer();
    subscribeToAccelerometer();
    await subscribeToLocation();
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
    if (accelerometerSubscription) {
      accelerometerSubscription.remove();
      setAccelerometerSubscription(null);
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

  const recordDataBatch = (): void => {
    const currentMagnetometerData = magnetometerDataRef.current;
    const currentAccelerometerData = accelerometerDataRef.current;
    const currentLocationData = locationDataRef.current;

    if (currentMagnetometerData && currentLocationData) {
      const batchItem = {
        timestamp: Date.now(),
        session_name: sessionName,
        magnetic: {
          x: currentMagnetometerData.x,
          y: currentMagnetometerData.y,
          z: currentMagnetometerData.z,
          magnitude: Math.sqrt(
            currentMagnetometerData.x ** 2 +
              currentMagnetometerData.y ** 2 +
              currentMagnetometerData.z ** 2
          ),
          pitch: pitchRef.current,
          roll: rollRef.current,
        },
        location: {
          latitude: currentLocationData.latitude,
          longitude: currentLocationData.longitude,
          accuracy: currentLocationData.accuracy,
          altitude: currentLocationData.altitude,
          altitudeAccuracy: currentLocationData.altitudeAccuracy,
        },
        acceleration: {
          x: currentAccelerometerData?.x || 0,
          y: currentAccelerometerData?.y || 0,
          z: currentAccelerometerData?.z || 0,
        },
      };
      setDataBatch((prevBatch) => [...prevBatch, batchItem]);
    }
  };

  const magnitude = Math.sqrt(
    magnetometerData.x ** 2 + magnetometerData.y ** 2 + magnetometerData.z ** 2
  );

  const calculateTilt = (data: AccelerometerMeasurement | null) => {
    if (!data) return { pitch: 0, roll: 0 };

    const { x, y, z } = data;
    const pitch = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
    const roll = Math.atan2(x, Math.sqrt(y * y + z * z)) * (180 / Math.PI);

    return { pitch, roll };
  };

  const { pitch, roll } = calculateTilt(accelerometerData);

  return (
    <ScrollView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
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
            <Text style={styles.text}>Lat: {location.latitude.toFixed(6)}</Text>
            <Text style={styles.text}>
              Lon: {location.longitude.toFixed(6)}
            </Text>
            <Text style={styles.text}>
              Radius of uncertainty for the location: {location.accuracy}m
            </Text>
          </View>
        )}

        <View style={styles.dataContainer}>
          <Text style={styles.text}>Device Tilt:</Text>
          <Text style={styles.text}>Pitch: {pitch.toFixed(2)}°</Text>
          <Text style={styles.text}>Roll: {roll.toFixed(2)}°</Text>
        </View>

        <View style={styles.dataContainer}>
          <Text style={styles.text}>
            Acceleration X: {(accelerometerData?.x * 9.81).toFixed(4)} m/s²
          </Text>
          <Text style={styles.text}>
            Acceleration Y: {(accelerometerData?.y * 9.81).toFixed(4)} m/s²
          </Text>
          <Text style={styles.text}>
            Acceleration Z: {(accelerometerData?.z * 9.81).toFixed(4)} m/s²
          </Text>
        </View>

        <View style={styles.dataContainer}>
          <Text style={styles.text}>Session Name:</Text>
          <TextInput
            style={styles.textInput}
            value={sessionName}
            onChangeText={setSessionName}
            placeholder="Enter session name"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={isRecording ? "Stop Recording" : "Start Recording"}
            onPress={toggleRecording}
            disabled={!sessionName}
          />
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 60,
    marginBottom: 60,
    backgroundColor: "#fff",
  },
  dataContainer: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  text: {
    fontSize: 16,
    marginVertical: 5,
  },
  textInput: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    paddingHorizontal: 10,
    marginVertical: 10,
    borderRadius: 5,
  },
  buttonContainer: {
    marginTop: 20,
  },
});
