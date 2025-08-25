import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import WelcomeScreen from '../screens/Auth/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import EmailVerificationScreen from '../screens/Auth/EmailVerificationScreen';
import SplashScreen from '../screens/Auth/SplashScreen';
import { useAuth } from '../contexts/AuthContext';
import AppNavigator from './AppNavigator';
import { useTheme } from 'react-native-paper';

// Define types for our authentication stack
export type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  EmailVerification: undefined;
};

// Custom theme type
interface CustomTheme {
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
    placeholder: string;
    cardBorder: string;
    lightGray: string;
    secondaryBlue: string;
    darkBlue: string;
  }
}

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  const { currentUser, loading, isEmailVerified, userProfile } = useAuth();
  const theme = useTheme() as CustomTheme;
  const [showSplash, setShowSplash] = useState(true);

  // Debug bilgileri
  useEffect(() => {
    console.log('🔐 AuthNavigator - Auth state:', {
      hasUser: !!currentUser,
      isEmailVerified,
      hasProfile: !!userProfile,
      loading,
      showSplash
    });
  }, [currentUser, isEmailVerified, userProfile, loading, showSplash]);

  // Her zaman önce splash screen göster
  if (showSplash) {
    return (
      <SplashScreen 
        onFinish={() => setShowSplash(false)} 
      />
    );
  }

  // Auth durumu kontrolü
  // Kullanıcı login ve email verified ise AppNavigator'a git
  // Ancak userProfile yüklenmeyi bekle
  if (currentUser && isEmailVerified) {
    console.log('✅ User authenticated and verified - routing to AppNavigator');
    return <AppNavigator />;
  }

  // Kullanıcı login ama email verified değilse EmailVerification'a git
  if (currentUser && !isEmailVerified) {
    console.log('⚠️ User authenticated but not verified - routing to EmailVerification');
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      </Stack.Navigator>
    );
  }

  // Kullanıcı login değilse normal auth flow'u göster
  console.log('🔓 User not authenticated - showing auth flow');

  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
