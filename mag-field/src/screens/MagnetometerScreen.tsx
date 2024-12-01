import React, {useState, useEffect, useRef} from "react";
import {
  StyleSheet,
  View,
  Text,
  Button,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import {Magnetometer, Accelerometer, Gyroscope} from "expo-sensors";
import * as Location from "expo-location";
import type {LocationObject, LocationSubscription} from "expo-location";
import type {Subscription} from "expo-sensors/build/Subscription";
import type {
  AccelerometerMeasurement,
  GyroscopeMeasurement,
} from "expo-sensors";

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export default function MagnetometerScreen(): React.JSX.Element {
  const [magnetometerData, setMagnetometerData] = useState<Vector3D>({
    x: 0,
    y: 0,
    z: 0,
  });
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [magnetometerSubscription, setMagnetometerSubscription] = useState<Subscription | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<LocationSubscription | null>(null);
  const [accelerometerSubscription, setAccelerometerSubscription] = useState<Subscription | null>(null);
  const [gyroscopeSubscription, setGyroscopeSubscription] = useState<Subscription | null>(null);
  const [accelerometerData, setAccelerometerData] = useState<AccelerometerMeasurement>({
    x: 0,
    y: 0,
    z: 0,
    timestamp: 0,
  });
  const [gyroscopeData, setGyroscopeData] = useState<GyroscopeMeasurement>({
    x: 0,
    y: 0,
    z: 0,
    timestamp: 0,
  });
  const [sessionName, setSessionName] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [dataBatch, setDataBatch] = useState<any[]>([]);

  // Refs for latest data
  const magnetometerDataRef = useRef<Vector3D>(magnetometerData);
  const accelerometerDataRef = useRef<AccelerometerMeasurement>(accelerometerData);
  const gyroscopeDataRef = useRef<GyroscopeMeasurement>(gyroscopeData);
  const locationDataRef = useRef<Location.LocationObjectCoords | null>(location);

  useEffect(() => {
    magnetometerDataRef.current = magnetometerData;
  }, [magnetometerData]);

  useEffect(() => {
    accelerometerDataRef.current = accelerometerData;
  }, [accelerometerData]);

  useEffect(() => {
    gyroscopeDataRef.current = gyroscopeData;
  }, [gyroscopeData]);

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
      }, 100);  // record data
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (dataBatch.length >= 10) {
      sendDataToServer(dataBatch);
      setDataBatch([]);
    }
  }, [dataBatch]);

  const requestPermissions = async (): Promise<void> => {
    try {
      const {status} = await Location.requestForegroundPermissionsAsync();
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
      Magnetometer.addListener((data) => {
        setMagnetometerData(data);
      })
    );
    Magnetometer.setUpdateInterval(100);
  };

  const subscribeToAccelerometer = (): void => {
    setAccelerometerSubscription(
      Accelerometer.addListener((data) => {
        setAccelerometerData(data);
      })
    );
    Accelerometer.setUpdateInterval(100);
  };

  const subscribeToGyroscope = (): void => {
    setGyroscopeSubscription(
      Gyroscope.addListener((data) => {
        setGyroscopeData(data);
      })
    );
    Gyroscope.setUpdateInterval(100);
  };

  const subscribeToLocation = async (): Promise<void> => {
    const locationSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 100,
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
    subscribeToGyroscope();
    await subscribeToLocation();
  };

  const unsubscribe = (): void => {
    magnetometerSubscription?.remove();
    setMagnetometerSubscription(null);
    locationSubscription?.remove();
    setLocationSubscription(null);
    accelerometerSubscription?.remove();
    setAccelerometerSubscription(null);
    gyroscopeSubscription?.remove();
    setGyroscopeSubscription(null);
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
    const currentLocationData = locationDataRef.current;
    const currentAccelerometerData = accelerometerDataRef.current;
    const currentGyroscopeData = gyroscopeDataRef.current;

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
        },
        location: {
          latitude: currentLocationData.latitude,
          longitude: currentLocationData.longitude,
          accuracy: currentLocationData.accuracy,
          altitude: currentLocationData.altitude,
          altitudeAccuracy: currentLocationData.altitudeAccuracy,
        },
        acceleration: {
          x: currentAccelerometerData.x,
          y: currentAccelerometerData.y,
          z: currentAccelerometerData.z,
        },
        orientation: {
          pitch: currentGyroscopeData.x,
          roll: currentGyroscopeData.y,
          yaw: currentGyroscopeData.z,
        }
      };
      setDataBatch((prevBatch) => [...prevBatch, batchItem]);
    }
  };

  // Calculate magnetic field magnitude
  const magnitude = Math.sqrt(
    magnetometerData.x ** 2 +
    magnetometerData.y ** 2 +
    magnetometerData.z ** 2
  );

  return (
    <ScrollView style={styles.container}>
      <KeyboardAvoidingView style={{flex: 1}} behavior="padding">
        <View style={styles.dataContainer}>
          <Text style={styles.heading}>Magnetic Field Components:</Text>
          <Text style={styles.text}>X: {magnetometerData.x.toFixed(2)}</Text>
          <Text style={styles.text}>Y: {magnetometerData.y.toFixed(2)}</Text>
          <Text style={styles.text}>Z: {magnetometerData.z.toFixed(2)}</Text>
          <Text style={styles.text}>Magnitude: {magnitude.toFixed(2)}</Text>
        </View>

        {location && (
          <View style={styles.dataContainer}>
            <Text style={styles.heading}>Location:</Text>
            <Text style={styles.text}>Latitude: {location.latitude.toFixed(6)}</Text>
            <Text style={styles.text}>Longitude: {location.longitude.toFixed(6)}</Text>
            <Text style={styles.text}>Accuracy: ±{location.accuracy} meters</Text>
            <Text style={styles.text}>Altitude: {location.altitude?.toFixed(2)} meters</Text>
            <Text style={styles.text}>
              Altitude Accuracy: ±{location.altitudeAccuracy} meters
            </Text>
          </View>
        )}

        <View style={styles.dataContainer}>
          <Text style={styles.heading}>Raw Acceleration:</Text>
          <Text style={styles.text}>X: {accelerometerData.x.toFixed(4)}</Text>
          <Text style={styles.text}>Y: {accelerometerData.y.toFixed(4)}</Text>
          <Text style={styles.text}>Z: {accelerometerData.z.toFixed(4)}</Text>
        </View>

        <View style={styles.dataContainer}>
          <Text style={styles.heading}>Orientation:</Text>
          <Text style={styles.text}>Pitch: {gyroscopeData.x.toFixed(4)}</Text>
          <Text style={styles.text}>Roll: {gyroscopeData.y.toFixed(4)}</Text>
          <Text style={styles.text}>Yaw: {gyroscopeData.z.toFixed(4)}</Text>
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