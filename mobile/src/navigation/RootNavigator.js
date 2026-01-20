import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import CustomerNavigator from './CustomerNavigator';
import VendorNavigator from './VendorNavigator';
import PublicNavigator from './PublicNavigator';
import SplashScreen from '../screens/SplashScreen';
import SlideMenu from '../components/SlideMenu';

// Using Stack Navigator instead of Drawer to avoid Reanimated v4 compatibility issues
// Drawer can be re-enabled once @react-navigation/drawer fully supports Reanimated v4
const Stack = createStackNavigator();

const RootNavigator = () => {
  const { isAuthenticated, user } = useAuth();

  const MainNavigator = !isAuthenticated
    ? PublicNavigator
    : user?.role === 'vendor'
      ? VendorNavigator
      : CustomerNavigator;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
      <SlideMenu />
    </NavigationContainer>
  );
};

export default RootNavigator;
