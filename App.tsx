import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ChatScreen from './src/screens/ChatScreen';
import TodayScreen from './src/screens/TodayScreen';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.paper,
    primary: colors.indigoContainer,
    card: colors.surface,
    border: 'rgba(232,213,167,0.7)',
    text: colors.ink,
  },
};

/** Splash dwell: lets the bundled Sri Yantra film (6s) play through once. */
const SPLASH_MIN_MS = 5900;

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={{ flex: 1, backgroundColor: colors.paper }}>
          {/* Splash is parchment like the website hero; inner screens too */}
          {showSplash ? <StatusBar style="dark" /> : <LightStatusBarOnInnerScreens />}
          {showSplash ? (
            <SplashScreen />
          ) : (
            <NavigationContainer theme={navTheme}>
              <RootNav />
            </NavigationContainer>
          )}
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Android draws status-bar icons light-on-dark; parchment screens need dark
 * icons. iOS handles this automatically via the navigation theme.
 */
function LightStatusBarOnInnerScreens() {
  if (Platform.OS === 'android') {
    return <StatusBar style="dark" />;
  }
  return <StatusBar style="auto" />;
}

function RootNav() {
  const { booting, isAuthenticated } = useAuth();

  if (booting) {
    // Session restore is fast; keep a minimal parchment blank while restoring
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        animationDuration: 320,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Today" component={TodayScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
