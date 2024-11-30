import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MagnetometerScreen from './src/screens/MagnetometerScreen';

type RootStackParamList = {
  Magnetometer: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Magnetometer"
          component={MagnetometerScreen}
          options={{ title: 'Magnetic Field Mapper' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}