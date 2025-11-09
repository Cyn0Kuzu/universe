import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  Image, 
  SafeAreaView, 
  FlatList, 
  ViewToken, 
  Animated,
  Platform,
  Modal,
  ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme, Checkbox } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { TermsOfService, PrivacyPolicy } from '../../components/legal';
import { CustomTheme } from '../../types/theme';

const { width, height } = Dimensions.get('window');

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

// Define the slide data type
interface SlideItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  image?: any; // Keeping this optional for future use if needed
  features: string[];
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const baseTheme = useTheme();
  const theme = baseTheme as unknown as CustomTheme;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Create animated values for elements
  const scrollX = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  
  // Viewability configuration for FlatList
  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  // Define slide data
  const slides: SlideItem[] = [
    {
      id: '1',
      title: 'Özel Profil',
      description: 'Kişiye özel profil sistemi ile kendinizi tanıtın',
      icon: 'account-circle',
      color: theme.colors.secondaryBlue,
      features: [
        'Profil fotoğrafı yükleme',
        'Üniversite bilgilerinizi girin',
        'Profil özelleştirme seçenekleri'
      ]
    },
    {
      id: '2',
      title: 'Kulüpler',
      description: 'Kulüp üyelik ve takip sistemi',
      icon: 'account-group',
      color: theme.colors.primary,
      features: [
        'Kulüplere üyelik başvurusu',
        'Kulüp takip sistemi',
        'Üyelik durumu takibi'
      ]
    },
    {
      id: '3',
      title: 'Etkinlikler',
      description: 'Kulüplerin paylaştığı tüm etkinlikleri görün',
      icon: 'calendar-month',
      color: theme.colors.accent,
      features: [
        'Etkinlikleri beğenme sistemi',
        'Etkinliklere yorum yapma',
        'Etkinliklere katılma sistemi',
        'Etkinlik detaylarını görüntüleme'
      ]
    },
    {
      id: '4',
      title: 'Lider Tablosu',
      description: 'İstatistiklere göre öğrenci, etkinlik ve kulüp sıralaması',
      icon: 'trophy-outline',
      color: '#FF6B35',
      features: [
        'Öğrenci sıralaması',
        'Kulüp sıralaması',
        'Etkinlik istatistikleri'
      ]
    },
    {
      id: '5',
      title: 'Sosyalleşme',
      description: 'Başka öğrencileri veya kulüpleri takip etme sistemi',
      icon: 'account-heart',
      color: '#9C27B0',
      features: [
        'Öğrencileri takip edin',
        'Kulüpleri takip edin',
        'Takip listesi yönetimi'
      ]
    }
  ];

  React.useEffect(() => {
    // Sequence the animations
    Animated.sequence([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true
      }),
      Animated.timing(cardsOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.timing(buttonsOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
    ]).start();
  }, []);

  // Handle dot press - scroll to the selected slide
  const scrollToIndex = (index: number) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true
      });
    }
  };

  // Render slide item
  const renderSlideItem = ({ item, index }: { item: SlideItem; index: number }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width
    ];
    
    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [20, 0, 20],
      extrapolate: 'clamp'
    });
    
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp'
    });
    
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.92, 1, 0.92],
      extrapolate: 'clamp'
    });
    
    return (
      <Animated.View 
        style={[
          styles.slide, 
          { 
            opacity,
            transform: [{ translateY }, { scale }] 
          }
        ]}
      >
        <View style={[styles.slideContent, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <MaterialCommunityIcons name={item.icon as any} size={35} color={item.color} />
          </View>
          
          <Text style={[styles.slideTitle, { color: theme.colors.text }]}>{item.title}</Text>
          
          <Text style={[styles.slideDescription, { color: theme.colors.placeholder }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
          
          {/* Removed image from slides */}
          
          <View style={styles.featuresList}>
            {item.features.map((feature, i) => (
              <View key={i} style={styles.featureItem}>
                <View style={[styles.checkIconContainer, { backgroundColor: item.color + '30' }]}>
                  <MaterialCommunityIcons name="check" size={12} color={item.color} />
                </View>
                <Text style={[styles.featureText, { color: theme.colors.text, opacity: 0.9 }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    );
  };

  // Render pagination dots
  const renderPaginationDots = () => {
    return (
      <View style={styles.paginationContainer}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width
          ];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [6, 16, 6],
            extrapolate: 'clamp'
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp'
          });
          
          const backgroundColor = slides[index].color;
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.dotButton}
              onPress={() => scrollToIndex(index)}
            >
              <Animated.View 
                style={[
                  styles.dot,
                  { 
                    width: dotWidth,
                    opacity,
                    backgroundColor
                  }
                ]} 
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="dark" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.content}>
          {/* Logo and title */}
          <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
            <Image 
              source={require('../../../assets/universe_logo2.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </Animated.View>
          
          <Animated.View style={{ opacity: titleOpacity }}>
            <Text style={[styles.title, { color: theme.colors.text }]}>UNIVERSE</Text>
            <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>
              ...Üniversite Evreni...
            </Text>
          </Animated.View>
          
          {/* Slides */}
          <Animated.View style={[styles.slidesContainer, { opacity: cardsOpacity }]}>
            <FlatList
              ref={flatListRef}
              data={slides}
              renderItem={renderSlideItem}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              decelerationRate="fast"
              snapToInterval={width}
              snapToAlignment="center"
              contentContainerStyle={{ paddingHorizontal: 5 }}
              showsHorizontalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
            />
            
            {renderPaginationDots()}
          </Animated.View>
          
          {/* Buttons */}
          <Animated.View style={[styles.buttonSection, { opacity: buttonsOpacity }]}>
            <TouchableOpacity 
              style={[
                styles.featuredButton, 
                { 
                  backgroundColor: agreedToTerms ? theme.colors.primary : '#cccccc',
                  opacity: agreedToTerms ? 1 : 0.6
                }
              ]}
              onPress={() => agreedToTerms && navigation.navigate('Register')}
              disabled={!agreedToTerms}
            >
              <MaterialCommunityIcons 
                name="account-plus" 
                size={20} 
                color={agreedToTerms ? "white" : "#999999"} 
                style={styles.buttonIcon} 
              />
              <Text style={[
                styles.featuredButtonText,
                { color: agreedToTerms ? "white" : "#999999" }
              ]}>
                Universe'e Katıl
              </Text>
            </TouchableOpacity>
            
            <View style={styles.buttonDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <TouchableOpacity 
              style={[
                styles.loginButton, 
                { 
                  backgroundColor: agreedToTerms ? theme.colors.secondaryBlue : '#cccccc',
                  opacity: agreedToTerms ? 1 : 0.6
                }
              ]}
              onPress={() => agreedToTerms && navigation.navigate('Login')}
              disabled={!agreedToTerms}
            >
              <MaterialCommunityIcons 
                name="login" 
                size={18} 
                color={agreedToTerms ? "white" : "#999999"} 
                style={styles.buttonIcon} 
              />
              <Text style={[
                styles.loginButtonText,
                { color: agreedToTerms ? "white" : "#999999" }
              ]}>
                Giriş Yap
              </Text>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Terms Approval */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              <Checkbox
                status={agreedToTerms ? 'checked' : 'unchecked'}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                color={theme.colors.primary}
              />
              <Text style={[styles.termsText, { color: theme.colors.placeholder }]}>
                <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                  <Text style={[styles.termsLink, { color: theme.colors.primary }]}>
                    Kullanım Şartları
                  </Text>
                </TouchableOpacity>
                {' '} ve {' '}
                <TouchableOpacity onPress={() => setShowPrivacyModal(true)}>
                  <Text style={[styles.termsLink, { color: theme.colors.primary }]}>
                    Gizlilik Politikası
                  </Text>
                </TouchableOpacity>
                nı okudum ve kabul ediyorum.
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
        </View>
      </ScrollView>

      {/* Terms of Service Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <TermsOfService onClose={() => setShowTermsModal(false)} />
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <PrivacyPolicy onClose={() => setShowPrivacyModal(false)} />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 15, // 20'den 15'e düşürüldü
  },
  content: {
    flex: 1,
    paddingHorizontal: 20, // 18'den 20'ye geri çıkarıldı (orijinal)
    paddingTop: Platform.OS === 'ios' ? 20 : 10, // Daha da azaltıldı
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 12, // 8'den 12'ye büyütüldü
  },
  headerLogo: {
    width: 80, // 70'ten 80'e büyütüldü (orijinal boyut)
    height: 80, // 70'ten 80'e büyütüldü (orijinal boyut)
  },
  title: {
    fontSize: 24, // 22'den 24'e büyütüldü
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5, // 4'ten 5'e çıkarıldı
  },
  subtitle: {
    fontSize: 15, // 14'ten 15'e büyütüldü
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 22, // 18'den 22'ye büyütüldü
    opacity: 0.8,
  },
  slidesContainer: {
    height: Math.min(400, height * 0.42), // 360'tan 400'e büyütüldü
    marginVertical: 12, // 10'dan 12'ye büyütüldü
  },
  slide: {
    width: width,
    paddingHorizontal: 15, // 20'den 15'e düşürüldü (sola yaklaştı)
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideContent: {
    width: '100%',
    padding: 16, // 14'ten 16'ya büyütüldü (orijinal)
    borderRadius: 18, // 16'dan 18'e büyütüldü (orijinal)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(230, 230, 230, 0.5)',
    minHeight: 350, // 310'dan 350'ye büyütüldü (orijinal)
  },
  iconContainer: {
    width: 80, // 70'ten 80'e büyütüldü (logo ile tam aynı boyut)
    height: 80, // 70'ten 80'e büyütüldü (logo ile tam aynı boyut)
    borderRadius: 40, // 35'ten 40'a büyütüldü
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15, // Aynı kaldı
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  slideTitle: {
    fontSize: 20, // 19'dan 20'ye büyütüldü (orijinal)
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8, // 7'den 8'e büyütüldü (orijinal)
  },
  slideDescription: {
    fontSize: 13.5, // 13'ten 13.5'e büyütüldü (orijinal)
    textAlign: 'center',
    lineHeight: 18, // 17'den 18'e büyütüldü (orijinal)
    marginBottom: 14, // 12'den 14'e büyütüldü (orijinal)
    paddingHorizontal: 5,
    opacity: 0.9,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    marginVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: '80%',
    height: '100%',
  },
  featuresList: {
    width: '100%',
    marginTop: 12, // 10'dan 12'ye büyütüldü (orijinal)
    paddingHorizontal: 8, // 7'den 8'e büyütüldü (orijinal)
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10, // 9'dan 10'a büyütüldü (orijinal)
    width: '100%',
  },
  featureText: {
    fontSize: 13, // 12.5'ten 13'e büyütüldü (orijinal)
    lineHeight: 17,
    flex: 1,
    flexWrap: 'wrap',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  dotButton: {
    padding: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 5,
  },
  featuredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 4,
  },
  featuredButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#95a5a6',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: 15,
    marginBottom: 10,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    flex: 1,
    marginLeft: 8,
  },
  termsLink: {
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  checkIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  copyrightContainer: {
    alignItems: 'center',
    marginTop: 15, // 12'den 15'e büyütüldü (orijinal)
    marginBottom: 20, // 18'den 20'ye büyütüldü (orijinal)
    paddingHorizontal: 20,
  },
  copyrightText: {
    fontSize: 12, // Aynı kaldı
    textAlign: 'center',
    opacity: 0.9, // 0.85'ten 0.9'a arttırıldı
    marginBottom: 4, // Aynı kaldı
    fontWeight: '500',
    color: '#333',
  },
  poweredByText: {
    fontSize: 12, // Aynı kaldı
    textAlign: 'center',
    opacity: 0.8, // 0.75'ten 0.8'e arttırıldı
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#666',
  },
});

export default WelcomeScreen;
