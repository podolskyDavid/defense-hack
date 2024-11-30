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
import type { AccelerometerMeasurement } from "expo-sensors";

export default function MagnetometerScreen(): React.JSX.Element {
  const [magnetometerData, setMagnetometerData] = useState({
    x: 0,
    y: 0,
    z: 0,
  });
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(
    null
  );
  const [magnetometerSubscription, setMagnetometerSubscription] =
    useState<Subscription | null>(null);
  const [locationSubscription, setLocationSubscription] =
    useState<LocationSubscription | null>(null);
  const [accelerometerSubscription, setAccelerometerSubscription] =
    useState<Subscription | null>(null);
  const [accelerometerData, setAccelerometerData] =
    useState<AccelerometerMeasurement | null>({
      timestamp: 0,
      x: 0,
      y: 0,
      z: 0
    });
  const [sessionName, setSessionName] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [dataBatch, setDataBatch] = useState<any[]>([]);

  const magnetometerDataRef = useRef(magnetometerData);
  const accelerometerDataRef = useRef(accelerometerData);
  const locationDataRef = useRef(location);
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
      }, 500); // Record data every 500 milliseconds
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

  const calculateTilt = (
    data: AccelerometerMeasurement | null
  ): { pitch: number; roll: number } => {
    if (!data) return { pitch: 0, roll: 0 };

    const { x, y, z } = data;
    // Calculate pitch and roll in radians
    const pitch = Math.atan2(y, Math.sqrt(x * x + z * z));
    const roll = Math.atan2(-x, z);

    // Convert to degrees for display
    return {
      pitch: pitch * (180 / Math.PI),
      roll: roll * (180 / Math.PI)
    };
  };

  const removeGravity = (
    data: AccelerometerMeasurement,
    pitch: number,
    roll: number
  ): { x: number; y: number; z: number } => {
    // Convert angles back to radians for calculations
    const pitchRad = pitch * (Math.PI / 180);
    const rollRad = roll * (Math.PI / 180);

    // Calculate gravity components on each axis based on device orientation
    const g = 9.81; // gravitational acceleration in m/s²
    const gX = g * Math.sin(rollRad);
    const gY = -g * Math.sin(pitchRad) * Math.cos(rollRad);
    const gZ = -g * Math.cos(pitchRad) * Math.cos(rollRad);

    // Remove gravity components from raw acceleration
    return {
      x: data.x - gX / g, // Convert back to g units by dividing by g
      y: data.y - gY / g,
      z: data.z - gZ / g
    };
  };

  const subscribeToMagnetometer = (): void => {
    setMagnetometerSubscription(
      Magnetometer.addListener((data) => {
        setMagnetometerData(data);
      })
    );
    Magnetometer.setUpdateInterval(16); // ~60Hz
  };

  const subscribeToAccelerometer = (): void => {
    setAccelerometerSubscription(
      Accelerometer.addListener((data) => {
        setAccelerometerData(data);
      })
    );
    Accelerometer.setUpdateInterval(16); // ~60Hz
  };

  const subscribeToLocation = async (): Promise<void> => {
    const locationSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 500,
        distanceInterval: 0.5,
      },
      (locationObject: LocationObject) => {
        setLocation(locationObject.coords);
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

    if (currentMagnetometerData && currentLocationData && currentAccelerometerData) {
      const { pitch, roll } = calculateTilt(currentAccelerometerData);
      const gravityCompensatedAccel = removeGravity(currentAccelerometerData, pitch, roll);

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
          pitch,
          roll,
        },
        location: {
          latitude: currentLocationData.latitude,
          longitude: currentLocationData.longitude,
          accuracy: currentLocationData.accuracy,
          altitude: currentLocationData.altitude,
          altitudeAccuracy: currentLocationData.altitudeAccuracy,
        },
        acceleration: {
          x: gravityCompensatedAccel.x,
          y: gravityCompensatedAccel.y,
          z: gravityCompensatedAccel.z,
        },
      };
      setDataBatch((prevBatch) => [...prevBatch, batchItem]);
    }
  };

  const magnitude = Math.sqrt(
    magnetometerData.x ** 2 +
    magnetometerData.y ** 2 +
    magnetometerData.z ** 2
  );

  const { pitch, roll } = calculateTilt(accelerometerData);

  return (
    <ScrollView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.dataContainer}>
          <Text style={styles.heading}>Magnetic Field Components (μT):</Text>
          <Text style={styles.text}>
            X: {magnetometerData.x.toFixed(2)}
          </Text>
          <Text style={styles.text}>
            Y: {magnetometerData.y.toFixed(2)}
          </Text>
          <Text style={styles.text}>
            Z: {magnetometerData.z.toFixed(2)}
          </Text>
          <Text style={styles.text}>
            Magnitude: {magnitude.toFixed(2)}
          </Text>
        </View>

        {location && (
          <View style={styles.dataContainer}>
            <Text style={styles.heading}>Location:</Text>
            <Text style={styles.text}>
              Latitude: {location.latitude.toFixed(6)}
            </Text>
            <Text style={styles.text}>
              Longitude: {location.longitude.toFixed(6)}
            </Text>
            <Text style={styles.text}>
              Accuracy: ±{location.accuracy} meters
            </Text>
            <Text style={styles.text}>
              Altitude: {location.altitude?.toFixed(2)} meters
            </Text>
            <Text style={styles.text}>
              Altitude Accuracy: ±{location.altitudeAccuracy} meters
            </Text>
          </View>
        )}

        <View style={styles.dataContainer}>
          <Text style={styles.heading}>Device Tilt:</Text>
          <Text style={styles.text}>Pitch: {pitch.toFixed(2)}°</Text>
          <Text style={styles.text}>Roll: {roll.toFixed(2)}°</Text>
        </View>

        <View style={styles.dataContainer}>
          <Text style={styles.heading}>Linear Acceleration (g):</Text>
          <Text style={styles.text}>
            X: {accelerometerData ?
            removeGravity(accelerometerData, pitch, roll).x.toFixed(4) : "0.0000"}
          </Text>
          <Text style={styles.text}>
            Y: {accelerometerData ?
            removeGravity(accelerometerData, pitch, roll).y.toFixed(4) : "0.0000"}
          </Text>
          <Text style={styles.text}>
            Z: {accelerometerData ?
            removeGravity(accelerometerData, pitch, roll).z.toFixed(4) : "0.0000"}
          </Text>
        </View>

        <View style={styles.dataContainer}>
          <Text style={styles.heading}>Session Name:</Text>
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
    backgroundColor: "#fff",
  },
  dataContainer: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    marginVertical: 2,
  },
  textInput: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    paddingHorizontal: 10,
    marginVertical: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  buttonContainer: {
    marginTop: 20,
  },
});