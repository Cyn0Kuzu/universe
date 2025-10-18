import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { TextInput, Text, Button, useTheme, HelperText, Dialog, Portal, Checkbox } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { sendEmailVerification, resetPasswordWithValidation } from '../../firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { CustomTheme } from '../../types/theme';

const { width } = Dimensions.get('window');

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const theme = useTheme() as unknown as CustomTheme;
  const { signIn } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [secureTextEntry, setSecureTextEntry] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showVerificationDialog, setShowVerificationDialog] = useState<boolean>(false);
  const [resendingEmail, setResendingEmail] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Lütfen e-posta ve şifre giriniz.');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      console.log('🔐 Starting login with Remember Me:', rememberMe);
      const result = await signIn(email.trim(), password, rememberMe);
      
      if (!result.success) {
        setErrorMessage(result.error || 'Giriş başarısız oldu.');
      } else {
        console.log('✅ Login successful');
        // AuthContext will handle navigation automatically
      }
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setErrorMessage('Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResendVerification = async () => {
    setResendingEmail(true);
    
    try {
      // Temporarily sign in to get the user
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      if (user) {
        await user.sendEmailVerification();
        Alert.alert(
          "Doğrulama E-postası Gönderildi",
          `${email} adresine doğrulama e-postası başarıyla gönderildi. Lütfen e-postanızı kontrol edin ve bağlantıya tıklayın.`
        );
      }
      
      // Sign out after sending verification email
      await firebase.auth().signOut();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Doğrulama e-postası gönderilemedi.';
      Alert.alert("Hata", errorMsg);
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons 
              name="arrow-left" 
              size={24} 
              color={theme.colors.text} 
            />
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Logo */}
          <Animated.View style={[styles.logoContainer, { opacity: logoAnim }]}>
            <MaterialCommunityIcons 
              name="earth" 
              size={60} 
              color={theme.colors.primary} 
            />
          </Animated.View>
          
          {/* Form Container */}
          <Animated.View 
            style={[
              styles.formContainer,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Merhaba,
              <Text style={{ color: theme.colors.primary }}> Tekrar Hoşgeldin!</Text>
            </Text>
            <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>
            
            <TextInput
              label="E-posta Adresiniz"
              value={email}
              onChangeText={text => setEmail(text)}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              theme={{ colors: { primary: theme.colors.primary } }}
              left={<TextInput.Icon icon="email" color={theme.colors.secondaryBlue} />}
            />

            <TextInput
              label="Şifreniz"
              value={password}
              onChangeText={text => setPassword(text)}
              style={styles.input}
              mode="outlined"
              secureTextEntry={secureTextEntry}
              theme={{ colors: { primary: theme.colors.primary } }}
              left={<TextInput.Icon icon="lock" color={theme.colors.secondaryBlue} />}
              right={
                <TextInput.Icon
                  icon={secureTextEntry ? 'eye' : 'eye-off'}
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                  color="#666"
                />
              }
            />
            
            <TouchableOpacity 
              style={styles.forgotPasswordContainer} 
              onPress={async () => {
                if (!email) {
                  setErrorMessage('Şifre sıfırlama bağlantısı için e-posta adresinizi giriniz.');
                  return;
                }
                
                try {
                  setIsLoading(true);
                  setErrorMessage('');
                  
                  // Use validation function to check email existence
                  await resetPasswordWithValidation(email.trim());
                  
                  Alert.alert(
                    "Şifre Sıfırlama", 
                    "E-posta adresinize bir şifre sıfırlama bağlantısı gönderildi. E-posta kutunuzu kontrol ediniz."
                  );
                } catch (error) {
                  let errorMsg = 'Şifre sıfırlama başarısız oldu.';
                  
                  if (error instanceof Error) {
                    if (error.message.includes('kayıtlı değil')) {
                      errorMsg = 'Bu e-posta adresi sistemimizde kayıtlı değil. Lütfen kayıt olduğunuz e-posta adresini giriniz.';
                    } else if (error.message.includes('user-not-found')) {
                      errorMsg = 'Bu e-posta adresi sistemimizde kayıtlı değil.';
                    } else if (error.message.includes('invalid-email')) {
                      errorMsg = 'Geçerli bir e-posta adresi giriniz.';
                    } else if (error.message.includes('too-many-requests')) {
                      errorMsg = 'Çok fazla deneme yaptınız. Lütfen bir süre bekleyiniz.';
                    } else {
                      errorMsg = error.message;
                    }
                  }
                  
                  setErrorMessage(errorMsg);
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              <Text style={[styles.forgotPassword, { color: theme.colors.secondaryBlue }]}>
                Şifrenizi mi unuttunuz?
              </Text>
            </TouchableOpacity>

            {/* Remember Me Checkbox */}
            <TouchableOpacity 
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <Checkbox
                status={rememberMe ? 'checked' : 'unchecked'}
                color={theme.colors.primary}
                uncheckedColor="#666"
              />
              <Text style={styles.rememberMeText}>
                Beni hatırla
              </Text>
            </TouchableOpacity>

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={24} color="#f44336" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
            
            <TouchableOpacity 
              style={[styles.loginButton, { backgroundColor: theme.colors.primary }]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="login" size={24} color="white" style={styles.buttonIcon} />
                  <Text style={styles.loginButtonText}>Giriş Yap</Text>
                </>
              )}
            </TouchableOpacity>
            
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Hesabınız yok mu? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.registerLink, { color: theme.colors.primary }]}>
                  Hemen Kayıt Olun
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Copyright Footer */}
            <View style={styles.copyrightContainer}>
              <Text style={[styles.copyrightText, { color: theme.colors.text }]}>
                © 2025 Universe App
              </Text>
              <Text style={[styles.poweredByText, { color: theme.colors.text }]}>
                Powered by MeMoDe
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Email Verification Dialog */}
      <Portal>
        <Dialog
          visible={showVerificationDialog}
          onDismiss={() => setShowVerificationDialog(false)}
          style={{ borderRadius: 10 }}
        >
          <Dialog.Title>E-posta Doğrulama Gerekli</Dialog.Title>
          <Dialog.Content>
            <View style={styles.verificationIcon}>
              <MaterialCommunityIcons name="email-check" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.verificationText}>
              E-posta adresiniz henüz doğrulanmamış. 
              {currentUserEmail ? `\n\n${currentUserEmail}` : ''} adresine gönderilen doğrulama bağlantısını kontrol edin ve tıklayın.
              {'\n\n'}E-posta adresinizi doğruladıktan sonra tekrar giriş yapabilirsiniz.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setShowVerificationDialog(false)}
              color={theme.colors.secondaryBlue}
            >
              Tamam
            </Button>
            <Button
              onPress={handleResendVerification}
              color={theme.colors.primary}
              loading={resendingEmail}
              disabled={resendingEmail}
            >
              Yeniden Gönder
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPassword: {
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    marginBottom: 16,
  },
  errorText: {
    color: '#f44336',
    marginLeft: 10,
    flex: 1,
  },
  loginButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  verificationIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  verificationText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  copyrightContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  copyrightText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 4,
    fontWeight: '500',
    color: '#333',
  },
  poweredByText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#666',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  rememberMeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});

export default LoginScreen;
