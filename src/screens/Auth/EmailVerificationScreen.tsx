import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { auth } from '../../firebase/config';
import { sendEmailVerification } from '../../firebase/auth';
import { useAuth } from '../../contexts/AuthContext';

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

type EmailVerificationScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'EmailVerification'>;
};

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ navigation }) => {
  const theme = useTheme() as CustomTheme;
  const { currentUser, checkVerification, signOut } = useAuth();
  const [sending, setSending] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const navigateToWelcome = async () => {
    try {
      console.log('🏠 Navigating based on verification status...');
      
      // Check current verification status first
      const isVerified = await checkVerification();
      
      if (isVerified) {
        console.log('✅ Email verified, staying logged in');
        // Email verified, AuthNavigator will handle navigation to AppNavigator
        return;
      } else {
        console.log('⚠️ Email not verified, initiating logout sequence...');
        
        // Step 1: Use AuthContext signOut for proper cleanup
        await signOut();
        console.log('✅ AuthContext signOut completed');
        
        // Step 2: Force immediate navigation reset
        // This will override AuthNavigator's automatic handling
        setTimeout(() => {
          try {
            console.log('🔄 Force resetting navigation to Welcome');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Welcome' }],
            });
          } catch (navError) {
            console.error('❌ Navigation reset failed:', navError);
            // Last resort: navigate to Welcome
            navigation.navigate('Welcome');
          }
        }, 50); // Small delay to ensure signOut completes
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Emergency fallback: immediate force navigation
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
        console.log('🚨 Emergency navigation to Welcome');
      } catch (emergencyError) {
        console.error('❌ Emergency navigation also failed:', emergencyError);
      }
    }
  };

  const navigateToLogin = async () => {
    try {
      // Use AuthContext signOut to properly clear state and navigate
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      // Fallback: navigate to welcome using auth.signOut
      await navigateToWelcome();
    }
  };

  const handleSendVerification = async () => {
    if (!currentUser) {
      // No user is logged in, redirect to login with message
      Alert.alert(
        "Hesap Doğrulama",
        "Güvenlik nedeniyle oturumunuz sonlandırıldı. Email adresinizi doğruladıktan sonra normal şekilde giriş yapabilirsiniz.",
        [
          { 
            text: "Ana Sayfaya Dön", 
            onPress: async () => await navigateToWelcome()
          }
        ]
      );
      return;
    }

    setSending(true);
    setHasError(false);
    
    try {
      await sendEmailVerification();
      Alert.alert(
        "E-posta Gönderildi", 
        `Doğrulama e-postası ${currentUser.email} adresine gönderildi. Lütfen gelen kutunuzu kontrol edin ve bağlantıya tıklayın.`
      );
    } catch (error) {
      setHasError(true);
      const errorMsg = error instanceof Error ? error.message : 'Doğrulama e-postası gönderilemedi.';
      Alert.alert("Hata", errorMsg);
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!currentUser) {
      Alert.alert(
        "Hesap Doğrulama",
        "Güvenlik nedeniyle oturumunuz sonlandırıldı. Email adresinizi doğruladıktan sonra normal şekilde giriş yapabilirsiniz.",
        [
          { 
            text: "Ana Sayfaya Dön", 
            onPress: async () => await navigateToWelcome()
          }
        ]
      );
      return;
    }
    
    setChecking(true);
    
    try {
      console.log('🔄 User initiated verification check...');
      
      // Force reload the current user from Firebase
      await currentUser.reload();
      console.log('✅ User reloaded, checking verification...');
      
      // Get fresh user instance after reload
      const freshUser = auth.currentUser;
      if (!freshUser) {
        console.log('❌ No current user found after reload');
        Alert.alert(
          "Oturum Süresi Doldu",
          "Güvenlik nedeniyle oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.",
          [
            { text: "Giriş Yap", onPress: navigateToLogin }
          ]
        );
        return;
      }
      
      console.log('📧 Current verification status:', freshUser.emailVerified);
      
      // Check directly from Firebase user instead of using AuthContext to avoid loops
      if (freshUser.emailVerified) {
        Alert.alert(
          "Email Doğrulandı! 🎉",
          "E-posta adresiniz başarıyla doğrulandı. Artık giriş yapabilirsiniz.",
          [
            { 
              text: "Giriş Yap", 
              onPress: () => {
                console.log('✅ Email verified, redirecting to login...');
                navigateToLogin();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          "Doğrulama Bekleniyor ⏳",
          "E-posta adresiniz henüz doğrulanmamış.\n\n1. E-posta kutunuzu kontrol edin\n2. Spam/gereksiz klasörünü kontrol edin\n3. Doğrulama bağlantısına tıklayın\n4. Bu butona tekrar basın",
          [
            { text: "Yeni E-posta Gönder", onPress: handleSendVerification },
            { text: "Tamam", style: "cancel" }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error checking verification:', error);
      const errorMsg = error instanceof Error ? error.message : 'Doğrulama durumu kontrol edilemedi.';
      
      // Handle session expired specifically
      if (errorMsg.includes('session') || errorMsg.includes('expired') || errorMsg.includes('auth')) {
        Alert.alert(
          "Oturum Hatası",
          "Oturumunuzda bir sorun oluştu. Lütfen tekrar giriş yapın.",
          [
            { text: "Giriş Yap", onPress: navigateToLogin }
          ]
        );
      } else {
        Alert.alert(
          "Kontrol Hatası",
          "Doğrulama durumu kontrol edilirken bir hata oluştu. Lütfen tekrar deneyin."
        );
      }
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Starting forced logout from EmailVerificationScreen...');
      
      // Step 1: Use AuthContext signOut for proper cleanup
      await signOut();
      console.log('✅ AuthContext signOut completed');
      
      // Step 2: Force immediate navigation with aggressive reset
      // This bypasses AuthNavigator's conditional rendering
      setTimeout(() => {
        try {
          console.log('🔄 Executing forced navigation reset...');
          
          // Reset the entire navigation stack to Welcome
          navigation.getParent()?.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],
          });
          
          console.log('✅ Navigation reset to Welcome completed');
        } catch (navError) {
          console.error('❌ Navigation reset failed, trying alternative:', navError);
          
          // Alternative: try navigate with replace
          try {
            navigation.replace('Welcome');
            console.log('✅ Navigate replace to Welcome completed');
          } catch (replaceError) {
            console.error('❌ All navigation methods failed:', replaceError);
          }
        }
      }, 100); // Longer delay to ensure signOut state update
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Emergency fallback: Force navigation even if signOut fails
      try {
        navigation.getParent()?.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
        console.log('🚨 Emergency navigation to Welcome');
      } catch (emergencyError) {
        console.error('❌ Emergency navigation also failed:', emergencyError);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="dark" />
      
      <View style={styles.content}>
        <MaterialCommunityIcons 
          name="email-check" 
          size={100} 
          color={theme.colors.primary} 
          style={styles.icon}
        />
        
        <Text style={[styles.title, { color: theme.colors.text }]}>E-posta Doğrulaması Gerekli</Text>
        
        <Text style={[styles.description, { color: theme.colors.placeholder }]}>
          {currentUser ? (
            <>
              Hesabınıza erişmek için lütfen e-posta adresinizi doğrulayın. 
              {'\n\n'}{currentUser.email} adresine gönderilen doğrulama bağlantısını kontrol edin ve tıklayın.
            </>
          ) : (
            <>
              Kayıt işleminiz tamamlandı! 🎉
              {'\n\n'}Güvenlik nedeniyle oturumunuz sonlandırıldı. 
              E-posta kutunuzu kontrol edin, doğrulama bağlantısına tıklayın ve ardından normal şekilde giriş yapın.
            </>
          )}
        </Text>
        
        <View style={styles.buttonGroup}>
          {currentUser ? (
            <>
              <Button
                mode="contained"
                onPress={handleSendVerification}
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                loading={sending}
                disabled={sending}
              >
                Doğrulama E-postasını Yeniden Gönder
              </Button>
              
              <Button
                mode="outlined"
                onPress={handleCheckVerification}
                style={[styles.button, { borderColor: theme.colors.primary, marginTop: 12 }]}
                loading={checking}
                disabled={checking}
              >
                Doğrulama Durumunu Kontrol Et
              </Button>
              
              <TouchableOpacity 
                style={styles.backLink}
                onPress={handleLogout}
              >
                <Text style={{ color: theme.colors.secondaryBlue }}>
                  Ana sayfaya dön
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Button
              mode="contained"
              onPress={async () => await navigateToWelcome()}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
            >
              Ana Sayfaya Dön
            </Button>
          )}
        </View>
        
        <View style={styles.helpContainer}>
          <Text style={[styles.helpText, { color: theme.colors.placeholder }]}>
            E-posta almadınız mı? Spam klasörünüzü kontrol edin veya 
            yukarıdaki butonu kullanarak yeniden göndermeyi deneyin.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    paddingVertical: 8,
  },
  backLink: {
    marginTop: 24,
    padding: 8,
  },
  helpContainer: {
    marginTop: 48,
    paddingHorizontal: 16,
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  }
});

export default EmailVerificationScreen;
