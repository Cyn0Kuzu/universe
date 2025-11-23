import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import StudentNavigator from './StudentNavigator';
import ClubNavigator from './ClubNavigator';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from 'react-native-paper';

const AppNavigator: React.FC = () => {
  const { isClubAccount, userProfile, loading, currentUser } = useAuth();
  const theme = useTheme();

  // Debug bilgileri için
  useEffect(() => {
    if (currentUser && userProfile) {
      console.log('🏠 AppNavigator - User Type Routing:', {
        uid: currentUser.uid,
        userType: userProfile.userType,
        isClubAccount: isClubAccount,
        navigatingTo: isClubAccount ? '📋 ClubNavigator' : '🎓 StudentNavigator'
      });
    }
  }, [currentUser, userProfile, isClubAccount]);

  // Kullanıcı profili yüklenirken AuthNavigator'a geri dön (geçici yükleme ekranı gösterilsin)
  if (loading || !userProfile) {
    console.log('⏳ AppNavigator - Profile loading, returning to AuthNavigator');
    return null; // AuthNavigator geçici yükleme ekranını gösterecek
  }

  // Kullanıcı tipine göre doğru navigator'ı göster
  if (isClubAccount) {
    console.log('📋 Navigating to ClubNavigator');
    return <ClubNavigator />;
  } else {
    console.log('🎓 Navigating to StudentNavigator');
    return <StudentNavigator />;
  }
};

export default AppNavigator;
