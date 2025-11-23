import React, { useState, useEffect, useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/Auth/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import EmailVerificationScreen from '../screens/Auth/EmailVerificationScreen';
import AdminPanelScreen from '../screens/Admin/AdminPanelScreen';
import { useAuth } from '../contexts/AuthContext';
import AppNavigator from './AppNavigator';
import { useTheme } from 'react-native-paper';

// Define types for our authentication stack
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  EmailVerification: undefined;
  AdminPanel: undefined;
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

  // Debug bilgileri
  useEffect(() => {
    console.log('🔐 AuthNavigator - Auth state:', {
      hasUser: !!currentUser,
      isEmailVerified,
      hasProfile: !!userProfile,
      loading
    });
  }, [currentUser, isEmailVerified, userProfile, loading]);

  // Kullanıcı login ve email verified ise direkt AppNavigator'a git
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
      <Stack.Screen
        name="AdminPanel"
        component={AdminPanelScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
