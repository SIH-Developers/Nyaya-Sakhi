import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import RoleSelector from './src/screens/RoleSelector';
import CounselorLogin from './src/screens/CounselorLogin';
import AlertFeed from './src/screens/AlertFeed';
import AlertDetail from './src/screens/AlertDetail';
import SOSHome from './src/screens/SOSHome';
import EmergencyInfo from './src/screens/EmergencyInfo';

import { OFFICER_KEY_STORE_KEY } from './src/config/api';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null); // null = loading
  const [officerKey, setOfficerKey] = useState(null);

  // Boot-time session check
  useEffect(() => {
    const checkSession = async () => {
      try {
        const key = await SecureStore.getItemAsync(OFFICER_KEY_STORE_KEY);
        if (key && key.trim()) {
          setOfficerKey(key.trim());
          setInitialRoute('AlertFeed');
        } else {
          setInitialRoute('RoleSelector');
        }
      } catch {
        // Fail-safe: go to RoleSelector on any error
        setInitialRoute('RoleSelector');
      }
    };
    checkSession();
  }, []);

  if (!initialRoute) {
    // Splash / loading
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        >
          <Stack.Screen name="RoleSelector" component={RoleSelector} />
          <Stack.Screen name="CounselorLogin" component={CounselorLogin} />
          <Stack.Screen
            name="AlertFeed"
            component={AlertFeed}
            initialParams={officerKey ? { officerKey } : undefined}
          />
          <Stack.Screen name="AlertDetail" component={AlertDetail} />
          <Stack.Screen name="SOSHome" component={SOSHome} />
          <Stack.Screen name="EmergencyInfo" component={EmergencyInfo} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#022448',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
