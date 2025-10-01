import React, { useState, useRef, useEffect } from 'react';
import { ImageUploadService } from '../../services/imageUploadService';
import { usernameValidationService } from '../../services/usernameValidationService';
import { emailValidationService } from '../../services/emailValidationService';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions, 
  Animated, 
  Platform, 
  KeyboardAvoidingView, 
  Image, 
  Alert,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import { 
  TextInput, 
  Text, 
  Chip, 
  useTheme, 
  Button, 
  HelperText, 
  Menu, 
  Divider, 
  Checkbox, 
  Avatar,
  Dialog,
  Portal
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { DEPARTMENTS_DATA as departments } from '../../constants/departments';
import { CLASS_LEVELS_DATA as classLevels } from '../../constants/classLevels';
import { UNIVERSITIES_DATA as universities } from '../../constants/universities';
import { CLUB_TYPES_DATA as clubTypes } from '../../constants/clubTypes';
import * as ImagePicker from 'expo-image-picker';
import { firebase, auth, firestore, storage } from '../../firebase/config';
import { getUserProfile } from '../../firebase/auth';
import { CustomTheme } from '../../types/theme';
import { SecureStorage } from '../../utils/secureStorage';

// Default avatar and cover image options - using valid Material Community Icons
const defaultAvatars = [
  // Yırtıcı Hayvanlar (Predators)
  { id: 'avatar1', name: 'Aslan', category: 'predator', icon: 'alpha-l-circle', color: '#FF9800' },
  { id: 'avatar2', name: 'Kaplan', category: 'predator', icon: 'alpha-t-circle', color: '#FF6F00' },
  { id: 'avatar3', name: 'Kartal', category: 'predator', icon: 'bird', color: '#795548' },
  { id: 'avatar16', name: 'Kurt', category: 'predator', icon: 'alpha-w-circle', color: '#607D8B' },
  { id: 'avatar17', name: 'Ayı', category: 'predator', icon: 'teddy-bear', color: '#5D4037' },
  { id: 'avatar23', name: 'Şahin', category: 'predator', icon: 'bird', color: '#8D6E63' },
  { id: 'avatar58', name: 'Şah', category: 'predator', icon: 'chess-king', color: '#FFD700' },
  
  // Ev Hayvanları (Pets)
  { id: 'avatar4', name: 'Kedi', category: 'pet', icon: 'cat', color: '#9E9E9E' },
  { id: 'avatar5', name: 'Köpek', category: 'pet', icon: 'dog', color: '#795548' },
  { id: 'avatar25', name: 'Hamster', category: 'pet', icon: 'rodent', color: '#FFB74D' },
  { id: 'avatar26', name: 'Tavşan', category: 'pet', icon: 'rabbit', color: '#E0E0E0' },
  { id: 'avatar41', name: 'Balık', category: 'pet', icon: 'fish', color: '#03A9F4' },
  { id: 'avatar42', name: 'Kaplumbağa', category: 'pet', icon: 'turtle', color: '#4CAF50' },
  
  // Kuşlar (Birds)
  { id: 'avatar6', name: 'Baykuş', category: 'bird', icon: 'owl', color: '#795548' },
  { id: 'avatar27', name: 'Papağan', category: 'bird', icon: 'bird', color: '#4CAF50' },
  { id: 'avatar8', name: 'Penguen', category: 'bird', icon: 'penguin', color: '#000000' },
  { id: 'avatar43', name: 'Kartal', category: 'bird', icon: 'bird', color: '#8D6E63' },
  { id: 'avatar44', name: 'Güvercin', category: 'bird', icon: 'bird', color: '#9E9E9E' },
  { id: 'avatar59', name: 'Karga', category: 'bird', icon: 'bird', color: '#000000' },
  
  // Vahşi Hayvanlar (Wild Animals)
  { id: 'avatar7', name: 'Tilki', category: 'wild', icon: 'alpha-f-circle', color: '#FF5722' },
  { id: 'avatar9', name: 'Yunus', category: 'wild', icon: 'dolphin', color: '#03A9F4' },
  { id: 'avatar18', name: 'Panda', category: 'wild', icon: 'panda', color: '#000000' },
  { id: 'avatar45', name: 'Fil', category: 'wild', icon: 'elephant', color: '#9E9E9E' },
  { id: 'avatar46', name: 'Zürafa', category: 'wild', icon: 'alpha-z-circle', color: '#FFB74D' },
  { id: 'avatar47', name: 'Maymun', category: 'wild', icon: 'alpha-m-circle', color: '#8D6E63' },
  
  // Fantastik (Fantasy)
  { id: 'avatar33', name: 'Ejderha', category: 'fantasy', icon: 'auto-fix', color: '#F44336' },
  { id: 'avatar35', name: 'Sihirbaz', category: 'fantasy', icon: 'hat-fedora', color: '#673AB7' },
  { id: 'avatar36', name: 'Melek', category: 'fantasy', icon: 'account-star', color: '#FFC107' },
  { id: 'avatar48', name: 'Unicorn', category: 'fantasy', icon: 'horse', color: '#E91E63' },
  { id: 'avatar49', name: 'Phoenix', category: 'fantasy', icon: 'fire', color: '#FF5722' },
  
  // Meme
  { id: 'avatar37', name: 'Doge', category: 'meme', icon: 'dog-side', color: '#FFC107' },
  { id: 'avatar39', name: 'Troll', category: 'meme', icon: 'emoticon-devil', color: '#4CAF50' },
  { id: 'avatar40', name: 'Stonks', category: 'meme', icon: 'trending-up', color: '#2196F3' },
  { id: 'avatar50', name: 'Robot', category: 'meme', icon: 'robot', color: '#607D8B' },
  { id: 'avatar51', name: 'Alien', category: 'meme', icon: 'alien', color: '#4CAF50' },
  
  // Renkli (Colorful)
  { id: 'avatar52', name: 'Kalp', category: 'colorful', icon: 'heart', color: '#E91E63' },
  { id: 'avatar53', name: 'Yıldız', category: 'colorful', icon: 'star', color: '#FFC107' },
  { id: 'avatar54', name: 'Elmas', category: 'colorful', icon: 'diamond', color: '#9C27B0' },
  { id: 'avatar55', name: 'Çiçek', category: 'colorful', icon: 'flower', color: '#E91E63' },
  { id: 'avatar56', name: 'Güneş', category: 'colorful', icon: 'weather-sunny', color: '#FFC107' },
  { id: 'avatar57', name: 'Ay', category: 'colorful', icon: 'moon-waning-crescent', color: '#607D8B' },
  
  // Ek Avatarlar
  { id: 'avatar60', name: 'Müzik', category: 'meme', icon: 'music', color: '#9C27B0' },
  { id: 'avatar61', name: 'Oyun', category: 'meme', icon: 'gamepad-variant', color: '#4CAF50' },
  { id: 'avatar62', name: 'Kahve', category: 'colorful', icon: 'coffee', color: '#8D6E63' },
  { id: 'avatar63', name: 'Pizza', category: 'meme', icon: 'pizza', color: '#FF9800' },
  { id: 'avatar64', name: 'Bisiklet', category: 'colorful', icon: 'bike', color: '#4CAF50' },
  { id: 'avatar65', name: 'Kitap', category: 'colorful', icon: 'book', color: '#3F51B5' },
];

const defaultCovers = [
  // Doğa Manzaraları (Nature Landscapes)
  { id: 'cover1', name: 'Savana', category: 'nature', icon: 'tree', color: '#FFA000' },
  { id: 'cover2', name: 'Orman', category: 'nature', icon: 'forest', color: '#388E3C' },
  { id: 'cover3', name: 'Dağ', category: 'nature', icon: 'image-filter-hdr', color: '#5D4037' },
  { id: 'cover9', name: 'Orman İçi', category: 'nature', icon: 'pine-tree', color: '#2E7D32' },
  { id: 'cover15', name: 'Vadi', category: 'nature', icon: 'terrain', color: '#689F38' },
  { id: 'cover16', name: 'Kanyon', category: 'nature', icon: 'image-filter-hdr', color: '#BF360C' },
  { id: 'cover31', name: 'Çayır', category: 'nature', icon: 'grass', color: '#8BC34A' },
  { id: 'cover32', name: 'Çiçek Bahçesi', category: 'nature', icon: 'flower-tulip', color: '#E91E63' },
  
  // Su Manzaraları (Water Landscapes)
  { id: 'cover4', name: 'Deniz', category: 'water', icon: 'waves', color: '#0288D1' },
  { id: 'cover10', name: 'Plaj', category: 'water', icon: 'beach', color: '#FFA000' },
  { id: 'cover12', name: 'Şelale', category: 'water', icon: 'water', color: '#00BCD4' },
  { id: 'cover13', name: 'Göl', category: 'water', icon: 'water', color: '#1976D2' },
  { id: 'cover17', name: 'Nehir', category: 'water', icon: 'water', color: '#1976D2' },
  { id: 'cover18', name: 'Lagün', category: 'water', icon: 'island', color: '#00BCD4' },
  { id: 'cover33', name: 'Okyanus', category: 'water', icon: 'sail-boat', color: '#0277BD' },
  { id: 'cover34', name: 'Buz Dağı', category: 'water', icon: 'snowflake', color: '#B3E5FC' },
  
  // İklim Manzaraları (Climate Landscapes)
  { id: 'cover5', name: 'Çöl', category: 'climate', icon: 'cactus', color: '#FF8F00' },
  { id: 'cover6', name: 'Kutup', category: 'climate', icon: 'snowflake', color: '#B3E5FC' },
  { id: 'cover19', name: 'Yağmur Ormanı', category: 'climate', icon: 'weather-rainy', color: '#1B5E20' },
  { id: 'cover35', name: 'Kar Fırtınası', category: 'climate', icon: 'weather-snowy', color: '#E1F5FE' },
  { id: 'cover36', name: 'Tropik İklim', category: 'climate', icon: 'palm-tree', color: '#4CAF50' },
  
  // Şehir (City)
  { id: 'cover20', name: 'Gökdelenler', category: 'city', icon: 'city', color: '#546E7A' },
  { id: 'cover21', name: 'Köprü', category: 'city', icon: 'bridge', color: '#455A64' },
  { id: 'cover22', name: 'Gece Şehri', category: 'city', icon: 'city-variant', color: '#263238' },
  { id: 'cover23', name: 'Tarihi Kent', category: 'city', icon: 'castle', color: '#5D4037' },
  { id: 'cover37', name: 'Modern Şehir', category: 'city', icon: 'office-building', color: '#607D8B' },
  { id: 'cover38', name: 'İstanbul', category: 'city', icon: 'mosque', color: '#795548' },
  { id: 'cover39', name: 'Paris', category: 'city', icon: 'city', color: '#9E9E9E' },
  { id: 'cover40', name: 'Tokyo', category: 'city', icon: 'home-city', color: '#F44336' },
  
  // Uzay (Space)
  { id: 'cover24', name: 'Galaksi', category: 'space', icon: 'star-face', color: '#311B92' },
  { id: 'cover25', name: 'Gezegen', category: 'space', icon: 'earth', color: '#1A237E' },
  { id: 'cover26', name: 'Kuzey Işıkları', category: 'space', icon: 'weather-lightning', color: '#4A148C' },
  { id: 'cover27', name: 'Yıldızlar', category: 'space', icon: 'star', color: '#212121' },
  { id: 'cover41', name: 'Ay', category: 'space', icon: 'moon-waning-crescent', color: '#37474F' },
  { id: 'cover42', name: 'Mars', category: 'space', icon: 'circle', color: '#BF360C' },
  { id: 'cover43', name: 'Satürn', category: 'space', icon: 'orbit', color: '#FFA000' },
  { id: 'cover44', name: 'Uzay İstasyonu', category: 'space', icon: 'rocket', color: '#424242' },
  
  // Gün Batımı (Sunset)
  { id: 'cover14', name: 'Gün Batımı', category: 'sunset', icon: 'weather-sunset', color: '#E65100' },
  { id: 'cover28', name: 'Gün Doğumu', category: 'sunset', icon: 'weather-sunset-up', color: '#FB8C00' },
  { id: 'cover45', name: 'Alacakaranlık', category: 'sunset', icon: 'weather-night', color: '#673AB7' },
  { id: 'cover46', name: 'Şafak', category: 'sunset', icon: 'brightness-7', color: '#FFC107' },
  
  // Soyut (Abstract)
  { id: 'cover47', name: 'Geometrik', category: 'abstract', icon: 'hexagon', color: '#9C27B0' },
  { id: 'cover48', name: 'Dalga', category: 'abstract', icon: 'sine-wave', color: '#00BCD4' },
  { id: 'cover49', name: 'Spiral', category: 'abstract', icon: 'reload', color: '#FF5722' },
  { id: 'cover50', name: 'Mandala', category: 'abstract', icon: 'octagram', color: '#E91E63' },
  
  // Ek Kapak Resimleri
  { id: 'cover51', name: 'Teknoloji', category: 'abstract', icon: 'chip', color: '#2196F3' },
  { id: 'cover52', name: 'Müzik Dalga', category: 'abstract', icon: 'waveform', color: '#FF5722' },
  { id: 'cover53', name: 'DNA', category: 'abstract', icon: 'dna', color: '#4CAF50' },
  { id: 'cover54', name: 'Çiçek Deseni', category: 'nature', icon: 'flower-outline', color: '#E91E63' },
  { id: 'cover55', name: 'Kuş Sürüsü', category: 'nature', icon: 'bird', color: '#607D8B' },
  { id: 'cover56', name: 'Şehir Silüeti', category: 'city', icon: 'city-variant', color: '#424242' },
];

const { width } = Dimensions.get('window');

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

type UserType = 'student' | 'club';

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const theme = useTheme() as unknown as CustomTheme;
  
  // Common fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [userType, setUserType] = useState<UserType>('student');
  const [bio, setBio] = useState<string>('');
  const [secureTextEntry, setSecureTextEntry] = useState<boolean>(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  // Default image selection state - only avatars, no profile/cover image uploads
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<string | null>(null);
  const [selectedDefaultCover, setSelectedDefaultCover] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState<boolean>(false);
  const [showCoverModal, setShowCoverModal] = useState<boolean>(false);
  const [selectedAvatarCategory, setSelectedAvatarCategory] = useState<string | null>(null);
  const [selectedCoverCategory, setSelectedCoverCategory] = useState<string | null>(null);
  const [avatarSearch, setAvatarSearch] = useState<string>('');
  const [coverSearch, setCoverSearch] = useState<string>('');
  
  // Student specific fields
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [university, setUniversity] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [classLevel, setClassLevel] = useState<string>('');
  
  // Club specific fields
  const [clubName, setClubName] = useState<string>('');
  const [clubType, setClubType] = useState<string>(''); // Keep for backwards compatibility
  const [selectedClubTypes, setSelectedClubTypes] = useState<string[]>([]);
  
  // UI state
  const [isUniversityMenuVisible, setIsUniversityMenuVisible] = useState<boolean>(false);
  const [isDepartmentMenuVisible, setIsDepartmentMenuVisible] = useState<boolean>(false);
  const [isClassLevelMenuVisible, setIsClassLevelMenuVisible] = useState<boolean>(false);
  const [isClubTypeMenuVisible, setIsClubTypeMenuVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isVerificationDialogVisible, setIsVerificationDialogVisible] = useState<boolean>(false);
  
  // Search state
  const [universitySearch, setUniversitySearch] = useState<string>('');
  const [departmentSearch, setDepartmentSearch] = useState<string>('');
  const [classLevelSearch, setClassLevelSearch] = useState<string>('');
  const [clubTypeSearch, setClubTypeSearch] = useState<string>('');
  
  // Filtered data
  const filteredUniversities = universities.filter(uni => 
    uni.label.toLowerCase().includes(universitySearch.toLowerCase())
  );
  const filteredDepartments = departments.filter(dept => 
    dept.label.toLowerCase().includes(departmentSearch.toLowerCase())
  );
  const filteredClassLevels = classLevels.filter(cl => 
    cl.label.toLowerCase().includes(classLevelSearch.toLowerCase())
  );
  const filteredClubTypes = clubTypes.filter(ct => 
    ct.name.toLowerCase().includes(clubTypeSearch.toLowerCase())
  );
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  
  // Username validation
  const validateUsername = () => {
    const validation = usernameValidationService.validateUsernameFormat(username);
    return validation.isValid;
  };
  
  const isUsernameValid = username.length === 0 || validateUsername();
  
  // Check username uniqueness
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);
  const [usernameExists, setUsernameExists] = useState<boolean>(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState<boolean>(false);
  const [emailExists, setEmailExists] = useState<boolean>(false);
  
  const checkEmailAvailability = async (emailToCheck: string) => {
    if (!emailToCheck.trim()) {
      setEmailExists(false);
      return;
    }
    
    setIsCheckingEmail(true);
    try {
      console.log('🔍 Checking email availability:', emailToCheck);
      
      // Gerçek email availability kontrolü yap
      const result = await emailValidationService.checkEmailAvailability(emailToCheck);
      
      if (!result.isAvailable) {
        setEmailExists(true);
        console.log('❌ Email not available:', result.error);
      } else {
        setEmailExists(false);
        console.log('✅ Email available:', emailToCheck);
      }
      
    } catch (error) {
      console.error('Email kontrolünde hata:', error);
      setEmailExists(false); // Hata durumunda optimistic approach
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (!usernameToCheck.trim()) {
      setUsernameExists(false);
      return;
    }
    
    setIsCheckingUsername(true);
    try {
      console.log('🔍 Checking username availability:', usernameToCheck);
      
      // Gerçek username availability kontrolü yap (artık public access var)
      const result = await usernameValidationService.checkUsernameAvailability(usernameToCheck);
      
      if (!result.isAvailable) {
        setUsernameExists(true);
        console.log('❌ Username not available:', result.error);
      } else {
        setUsernameExists(false);
        console.log('✅ Username available:', usernameToCheck);
      }
      
    } catch (error) {
      console.error('Username kontrolünde hata:', error);
      setUsernameExists(false); // Hata durumunda optimistic approach
    } finally {
      setIsCheckingUsername(false);
    }
  };
  
  // Debounce username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.trim()) {
        checkUsernameAvailability(username);
      } else {
        setUsernameExists(false);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [username]);
  
  // Debounce email check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email.trim()) {
        checkEmailAvailability(email);
      } else {
        setEmailExists(false);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [email]);
  
    // Email validation - check if email has gmail.com or edu.tr or other valid domains
  const validateEmail = () => {
    if (email.toLowerCase().includes('@gmail.com')) {
      return true;
    }
    if (email.toLowerCase().endsWith('.edu.tr')) {
      return true; 
    }
    // Allow any other .com emails
    if (email.includes('@') && email.toLowerCase().endsWith('.com')) {
      return true;
    }
    return false;
  };
  
  const isEmailValid = email.length === 0 || validateEmail();
  
  // Avatar and cover filtering
  const getAvatarCategories = () => {
    const categories = defaultAvatars.map(avatar => avatar.category);
    return [...new Set(categories)];
  };
  
  const getCoverCategories = () => {
    const categories = defaultCovers.map(cover => cover.category);
    return [...new Set(categories)];
  };
  
  // Category labels in Turkish
  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      'predator': 'Yırtıcı Hayvanlar',
      'pet': 'Ev Hayvanları',
      'bird': 'Kuşlar',
      'wild': 'Vahşi Hayvanlar',
      'fantasy': 'Fantastik',
      'meme': 'Meme',
      'colorful': 'Renkli',
      'nature': 'Doğa',
      'water': 'Su Manzaraları',
      'climate': 'İklim',
      'city': 'Şehir',
      'space': 'Uzay',
      'sunset': 'Gün Batımı',
      'abstract': 'Soyut'
    };
    return labels[category] || category;
  };
  
  const getFilteredAvatars = () => {
    let filtered = defaultAvatars;
    
    if (selectedAvatarCategory) {
      filtered = filtered.filter(avatar => avatar.category === selectedAvatarCategory);
    }
    
    if (avatarSearch) {
      filtered = filtered.filter(avatar => 
        avatar.name.toLowerCase().includes(avatarSearch.toLowerCase())
      );
    }
    
    return filtered;
  };
  
  const getFilteredCovers = () => {
    let filtered = defaultCovers;
    
    if (selectedCoverCategory) {
      filtered = filtered.filter(cover => cover.category === selectedCoverCategory);
    }
    
    if (coverSearch) {
      filtered = filtered.filter(cover => 
        cover.name.toLowerCase().includes(coverSearch.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Password validation
  const isPasswordValid = password.length === 0 || password.length >= 8;
  const doPasswordsMatch = password === confirmPassword || confirmPassword.length === 0;
  
  // Next step validation
  // Email verification check function
  const checkEmailVerification = async () => {
    try {
      setIsLoading(true);
      
      // Get current user from auth
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setErrorMessage('Kullanıcı bulunamadı. Lütfen tekrar giriş yapmayı deneyin.');
        setIsLoading(false);
        return;
      }
      
      // Reload user to get fresh email verification status
      await currentUser.reload();
      
      if (currentUser.emailVerified) {
        // Email is verified - show success message
        Alert.alert(
          'Tebrikler! 🎉',
          'E-posta adresiniz başarıyla doğrulandı. Artık giriş yapabilirsiniz.',
          [
            {
              text: 'Giriş Yap',
              onPress: async () => {
                try {
                  setIsVerificationDialogVisible(false);
                  setIsLoading(true);
                  
                  // Kullanıcıyı çıkış yaptır ki temiz bir Login ekranı gösterelim
                  await auth.signOut();
                  console.log('✅ User signed out after email verification, will show Login screen');
                  
                  setIsLoading(false);
                } catch (error) {
                  console.error('❌ Logout error after verification:', error);
                  setIsLoading(false);
                }
              }
            }
          ]
        );
      } else {
        // Email is not verified yet
        Alert.alert(
          'E-posta Onaylanmadı',
          'E-posta adresiniz henüz onaylanmamış. Lütfen e-posta kutunuzu kontrol edin ve doğrulama bağlantısına tıklayın.\n\nSpam klasörünüzü de kontrol etmeyi unutmayın.',
          [
            {
              text: 'Tekrar Kontrol Et',
              onPress: () => checkEmailVerification()
            },
            {
              text: 'Tamam',
              style: 'cancel'
            }
          ]
        );
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Email verification check error:', error);
      setIsLoading(false);
      setErrorMessage('Doğrulama durumu kontrol edilirken hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  // Resend verification email function
  const resendVerificationEmail = async () => {
    try {
      setIsLoading(true);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setErrorMessage('Kullanıcı bulunamadı.');
        setIsLoading(false);
        return;
      }
      
      await currentUser.sendEmailVerification();
      
      Alert.alert(
        'E-posta Gönderildi',
        'Doğrulama e-postası tekrar gönderildi. Lütfen e-posta kutunuzu kontrol edin.',
        [{ text: 'Tamam' }]
      );
      
      setIsLoading(false);
    } catch (error) {
      console.error('Resend verification email error:', error);
      setIsLoading(false);
      setErrorMessage('E-posta gönderilirken hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const canProceedToNextStep = () => {
    if (currentStep === 1) {
      return userType === 'student' ? firstName.trim() !== '' && lastName.trim() !== '' : clubName.trim() !== '';
    } else if (currentStep === 2) {
      return username.trim() !== '' && validateUsername() && !usernameExists && !isCheckingUsername && 
             email.trim() !== '' && validateEmail() && !emailExists && !isCheckingEmail &&
             password.trim() !== '' && password.length >= 8 && password === confirmPassword;
    } else if (currentStep === 3) {
      if (userType === 'student') {
        return university.trim() !== '' && department.trim() !== '' && classLevel.trim() !== '';
      } else {
        return selectedClubTypes.length > 0;
      }
    } else if (currentStep === 4) {
      // Photos are optional, so we can proceed
      return true;
    }
    return false;
  };
  
  const handleNextStep = () => {
    if (currentStep < 4 && canProceedToNextStep()) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 4) {
      handleRegister();
    }
  };
  
  const handleRegister = async () => {
    // Prevent multiple simultaneous registration attempts
    if (isLoading) {
      console.log('⚠️ Registration already in progress, ignoring duplicate call');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // Test storage connectivity before proceeding (temporarily disabled)
      console.log('🔍 Skipping storage connectivity test, proceeding directly...');
      // const storageTest = await ImageUploadService.testStorageConnection();
      // if (!storageTest.success) {
      //   console.error('⚠️ Storage connectivity test failed:', storageTest.error);
      //   setErrorMessage('Storage service is currently unavailable. Please try again later.');
      //   setIsLoading(false);
      //   return;
      // }
      console.log('✅ Proceeding with registration');
      
      // Pre-cache minimal pending profile to avoid race conditions on first profile creation
      try {
        const preDisplayName = userType === 'student' ? `${firstName} ${lastName}` : clubName;
        await SecureStorage.setCache('pending_profile', {
          userType,
          accountType: userType,
          email,
          username: username?.toLowerCase?.() || username,
          displayName: preDisplayName,
          bio,
          university,
          department: userType === 'student' ? department : '',
          classLevel: userType === 'student' ? classLevel : '',
          clubName: userType === 'club' ? clubName : '',
          clubTypes: userType === 'club' ? selectedClubTypes : [],
        }, 60);
        await SecureStorage.setCache('pending_user_type', userType, 60);
        console.log('💾 Pending profile cached');
      } catch (e) {
        console.warn('⚠️ Failed to cache pending profile (non-fatal):', e);
      }

      // Create user in Firebase Auth
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      
      if (userCredential.user) {
        const userId = userCredential.user.uid;
        
        try {
          // Update display name in Firebase Auth
          const displayName = userType === 'student' 
            ? `${firstName} ${lastName}` 
            : clubName;
            
          console.log('🔧 Updating Firebase Auth profile with displayName:', displayName);
            
          await userCredential.user.updateProfile({
            displayName
          });
          
          // Force reload the user to ensure we have the latest data
          await userCredential.user.reload();
          
          console.log('✅ Firebase Auth profile updated successfully');
          
          // Send email verification with better error handling
          try {
            await userCredential.user.sendEmailVerification();
            console.log("Verification email sent successfully");
          } catch (verificationError) {
            console.error("Error sending verification email:", verificationError);
            // Continue with registration even if email verification fails
            // We'll handle this gracefully
          }
          
          // Set avatar from selection (no profile image upload during registration)
          let avatarIcon = '';
          let avatarColor = '';
          
          if (selectedDefaultAvatar) {
            // Kullanıcı varsayılan avatar seçti
            const selectedAvatar = defaultAvatars.find(a => a.id === selectedDefaultAvatar);
            avatarIcon = selectedAvatar?.icon || 'account';
            avatarColor = selectedAvatar?.color || '#1E88E5';
          } else {
            // Varsayılan avatar
            const defaultAvatar = defaultAvatars[0];
            avatarIcon = defaultAvatar.icon;
            avatarColor = defaultAvatar.color;
          }
          
          // Set cover from selection (no cover image upload during registration)
          let coverIcon = '';
          let coverColor = '';
          
          if (selectedDefaultCover) {
            // Kullanıcı varsayılan cover seçti
            const selectedCover = defaultCovers.find(c => c.id === selectedDefaultCover);
            coverIcon = selectedCover?.icon || 'school';
            coverColor = selectedCover?.color || '#1E88E5';
          } else {
            // Varsayılan cover
            const defaultCover = defaultCovers[0];
            coverIcon = defaultCover.icon;
            coverColor = defaultCover.color;
          }
          
          // Prepare the user data
          const normalizedUsername = (username || '').toLowerCase();
          const computedFullName = userType === 'student' ? `${firstName} ${lastName}` : clubName;
          
          // Ensure we have valid username - fallback to email prefix if empty
          const finalUsername = normalizedUsername || email.split('@')[0].toLowerCase();
          
          console.log('🔍 Username processing:', {
            originalUsername: username,
            normalizedUsername,
            finalUsername,
            email: email.split('@')[0]
          });
          
          console.log('🔍 Form field values before processing:', {
            userType,
            firstName: firstName.trim(),
            lastName: lastName.trim(), 
            clubName: clubName.trim(),
            email: email.trim(),
            username: username.trim(),
            bio: bio.trim()
          });
          
          const userData = {
            uid: userId,
            email,
            username: finalUsername,
            userType,
            accountType: userType, // keep both for compatibility across services
            bio,
            displayName: computedFullName,
            fullName: computedFullName,
            // Some legacy modules read `name`, so keep it in sync
            name: computedFullName,
            firstName: userType === 'student' ? firstName : '',
            lastName: userType === 'student' ? lastName : '',
            university: university, // Üniversite bilgisi her iki kullanıcı tipi için de kaydedilmelidir
            department: userType === 'student' ? department : '',
            classLevel: userType === 'student' ? classLevel : '',
            clubName: userType === 'club' ? clubName : '',
            clubType: userType === 'club' ? (selectedClubTypes.length > 0 ? selectedClubTypes[0] : '') : '', // For backwards compatibility
            clubTypes: userType === 'club' ? selectedClubTypes : [],
            // Avatar ve cover icon bilgileri
            avatarIcon,
            avatarColor,
            coverIcon,
            coverColor,
            emailVerified: false,
            createdAt: new Date(), // Use actual Date instead of serverTimestamp
            // Ensure these critical fields are preserved
            _preserveUsername: finalUsername,
            _preserveClubName: userType === 'club' ? clubName : '',
            _preserveDisplayName: computedFullName,
          };

          // Username benzersizlik kontrolü VE rezervasyonu - Registration öncesi
          if (finalUsername) {
            console.log('🔍 Final username validation and reservation before registration:', finalUsername);
            const usernameValidationResult = await usernameValidationService.validateAndReserveUsername(finalUsername, userId);
            
            if (!usernameValidationResult.success) {
              // User'ı sil çünkü username rezervasyonu başarısız
              if (userCredential.user) {
                try {
                  await userCredential.user.delete();
                  console.log('🗑️ User account deleted due to username reservation failure');
                } catch (deleteError) {
                  console.error("Error deleting user:", deleteError);
                }
              }
              
              setIsLoading(false);
              Alert.alert(
                'Username Hatası',
                usernameValidationResult.error || 'Bu kullanıcı adı kullanılamaz',
                [
                  {
                    text: 'Tamam',
                    onPress: () => {
                      // Username field'ına focus yap
                      console.log('User needs to change username');
                    }
                  }
                ]
              );
              return;
            }
            console.log('✅ Username validation and reservation passed for registration');
          }

          // Debug: Log user data before saving
          console.log('🔍 Kullanıcı verisi kaydedilmeden önce:', {
            userType,
            username,
            email,
            clubName: userType === 'club' ? clubName : 'N/A',
            userData
          });
          
          // Add user data to Firestore (username already reserved above)
          try {
            // Email duplicate kontrolü için transaction kullan
            await firestore.runTransaction(async (transaction) => {
              
              // ÖNEMLİ: Firestore transaction kuralları gereği önce TÜM okuma işlemleri yapılmalı
              const emailRef = email ? firestore.collection('emails').doc(email.toLowerCase()) : null;
              const userRef = firestore.collection('users').doc(userId);
              
              // Email duplicate kontrolü yap
              const emailDoc = emailRef ? await transaction.get(emailRef) : null;
              
              // Kontrolleri yap
              if (emailDoc && emailDoc.exists) {
                throw new Error('Bu e-posta adresi zaten kullanılıyor');
              }
              
              // Şimdi TÜM yazma işlemlerini yap
              if (emailRef) {
                transaction.set(emailRef, {
                  userId: userId,
                  createdAt: new Date(),
                });
              }
              
              // User data'yı kaydet (username zaten yukarıda rezerve edildi)
              console.log('🔍 Actual userData being saved to Firestore:', JSON.stringify(userData, null, 2));
              transaction.set(userRef, userData);
              console.log('✅ Transaction set operation completed for user document');
            }).then(() => {
              console.log('✅ Firestore transaction committed successfully');
            }).catch((error) => {
              console.error('❌ Firestore transaction failed:', error);
              throw error;
            });
            
            console.log("✅ User document and username created successfully in Firestore");
            console.log("📝 Saved data:", {
              uid: userData.uid,
              email: userData.email,
              username: userData.username,
              displayName: userData.displayName,
              fullName: userData.fullName,
              name: userData.name,
              userType: userData.userType,
              clubName: userData.clubName,
              firstName: userData.firstName,
              lastName: userData.lastName
            });

            // Verify the data was actually saved - use getUserProfile to get correct data
            try {
              const savedProfile = await getUserProfile(userId);
              if (savedProfile) {
                console.log("🔍 Verification - Data actually saved:", {
                  displayName: savedProfile.displayName,
                  fullName: savedProfile.fullName,
                  name: savedProfile.name,
                  username: savedProfile.username,
                  clubName: savedProfile.clubName
                });
              } else {
                console.error("❌ User profile was not found!");
              }
            } catch (verifyError) {
              console.warn("⚠️ Could not verify saved data:", verifyError);
            }

            // Clear pending cache since profile is persisted
            try {
              await SecureStorage.setCache('pending_profile', null as any, 1);
              await SecureStorage.setCache('pending_user_type', null as any, 1);
              console.log('🧹 Cleared pending profile cache');
            } catch {}
          } catch (firestoreError: any) {
            console.error("❌ Error creating Firestore document:", firestoreError);
            
            // Username ve email duplicate error kontrolü
            if (firestoreError.message && firestoreError.message.includes('kullanıcı adı zaten kullanılıyor')) {
              // User'ı sil çünkü registration başarısız
              if (userCredential.user) {
                try {
                  await userCredential.user.delete();
                  console.log('🗑️ User account deleted due to username conflict');
                } catch (deleteError) {
                  console.error("Error deleting user:", deleteError);
                }
              }
              
              setIsLoading(false);
              setErrorMessage('Bu kullanıcı adı zaten kullanılıyor. Lütfen farklı bir kullanıcı adı seçin.');
              return;
            }
            
            if (firestoreError.message && firestoreError.message.includes('e-posta adresi zaten kullanılıyor')) {
              // User'ı sil çünkü registration başarısız
              if (userCredential.user) {
                try {
                  await userCredential.user.delete();
                  console.log('🗑️ User account deleted due to email conflict');
                } catch (deleteError) {
                  console.error("Error deleting user:", deleteError);
                }
              }
              
              setIsLoading(false);
              setErrorMessage('Bu e-posta adresi zaten kullanılıyor. Lütfen farklı bir e-posta adresi kullanın.');
              return;
            }
            
            // Diğer Firestore hatalar için genel mesaj
            console.log("⚠️ Continuing with auth user despite Firestore error");
          }
          
          setIsLoading(false);
          
          // Email verification gerekiyor ama kullanıcıyı çıkış yaptırmayalım
          // AuthNavigator isEmailVerified=false olduğu için EmailVerificationScreen'e yönlendirecek
          console.log('📧 Registration completed, email verification required');
          
          // Show verification dialog
          setIsVerificationDialogVisible(true);
        } catch (generalError) {
          console.error("Registration error: ", generalError);
          
          // Try to delete the created user if registration fails
          if (userCredential.user) {
            try {
              await userCredential.user.delete();
              console.log('🗑️ Created user account deleted due to registration failure');
            } catch (deleteError) {
              console.error("Error deleting user after registration failure:", deleteError);
            }
          }
          
          setIsLoading(false);
          
          // Handle specific error types
          let errorMsg = 'Kayıt sırasında bir hata oluştu.';
          
          if (generalError instanceof Error) {
            if (generalError.message.includes('storage')) {
              errorMsg = 'Profil resmi yüklenirken hata oluştu. Lütfen tekrar deneyin.';
            } else if (generalError.message.includes('network')) {
              errorMsg = 'Ağ bağlantısı sorunu. Lütfen internetinizi kontrol edin.';
            } else {
              errorMsg = generalError.message;
            }
          }
          
          setErrorMessage(errorMsg);
          Alert.alert("Kayıt Hatası", errorMsg);
        }
      } else {
        setIsLoading(false);
        setErrorMessage("Kullanıcı oluşturulamadı.");
        Alert.alert("Kayıt Hatası", "Kullanıcı oluşturulamadı.");
      }
    } catch (error) {
      setIsLoading(false);
      const errorMsg = error instanceof Error ? error.message : 'Kayıt işlemi başarısız oldu.';
      setErrorMessage(errorMsg);
      Alert.alert("Kayıt Hatası", errorMsg);
    }
  };
  
  // Image picker functions
  const pickImage = async (setImageFunction: React.Dispatch<React.SetStateAction<ImagePicker.ImagePickerAsset | null>>) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageFunction(result.assets[0]);
    }
  };
  
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <Text style={styles.title}>Hesap Oluştur</Text>
            <Text style={styles.subtitle}>Hesap türünüzü seçin</Text>
            
            <View style={styles.userTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'student' && [styles.activeUserType, { backgroundColor: theme.colors.primary }]
                ]}
                onPress={() => setUserType('student')}
              >
                <MaterialCommunityIcons 
                  name="school" 
                  size={30} 
                  color={userType === 'student' ? '#fff' : theme.colors.primary} 
                />
                <Text style={[
                  styles.userTypeText,
                  userType === 'student' && styles.activeUserTypeText,
                  { color: userType === 'student' ? '#fff' : theme.colors.primary }
                ]}>Öğrenci</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'club' && [styles.activeUserType, { backgroundColor: theme.colors.primary }]
                ]}
                onPress={() => setUserType('club')}
              >
                <MaterialCommunityIcons 
                  name="account-group" 
                  size={30} 
                  color={userType === 'club' ? '#fff' : theme.colors.primary} 
                />
                <Text style={[
                  styles.userTypeText,
                  userType === 'club' && styles.activeUserTypeText,
                  { color: userType === 'club' ? '#fff' : theme.colors.primary }
                ]}>Kulüp</Text>
              </TouchableOpacity>
            </View>

            {userType === 'student' ? (
              <>
                <TextInput
                  label="İsim"
                  value={firstName}
                  onChangeText={setFirstName}
                  style={styles.input}
                  mode="outlined"
                  theme={{ colors: { primary: theme.colors.primary } }}
                  left={<TextInput.Icon icon="account" color={theme.colors.secondaryBlue} />}
                />

                <TextInput
                  label="Soyisim"
                  value={lastName}
                  onChangeText={setLastName}
                  style={styles.input}
                  mode="outlined"
                  theme={{ colors: { primary: theme.colors.primary } }}
                  left={<TextInput.Icon icon="account" color={theme.colors.secondaryBlue} />}
                />
              </>
            ) : (
              <TextInput
                label="Kulüp Adı"
                value={clubName}
                onChangeText={setClubName}
                style={styles.input}
                mode="outlined"
                theme={{ colors: { primary: theme.colors.primary } }}
                left={<TextInput.Icon icon="office-building" color={theme.colors.secondaryBlue} />}
              />
            )}
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.title}>Hesap Bilgileri</Text>
            <Text style={styles.subtitle}>Giriş bilgilerinizi oluşturun</Text>
            
            <TextInput
              label="Kullanıcı Adı"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              mode="outlined"
              theme={{ colors: { primary: theme.colors.primary } }}
              left={<TextInput.Icon icon="at" color={theme.colors.secondaryBlue} />}
              right={
                isCheckingUsername ? (
                  <TextInput.Icon icon="loading" color="#666" />
                ) : usernameExists ? (
                  <TextInput.Icon icon="close-circle" color="#f44336" />
                ) : username.length > 0 && isUsernameValid ? (
                  <TextInput.Icon icon="check-circle" color="#4caf50" />
                ) : null
              }
              error={!isUsernameValid || usernameExists}
            />
            {!isUsernameValid && username.length > 0 && (
              <HelperText type="error">
                Kullanıcı adı 3-20 karakter olmalı, harf ile başlamalı ve sadece harf, rakam ve alt çizgi içermelidir
              </HelperText>
            )}
            {usernameExists && (
              <HelperText type="error">
                Bu kullanıcı adı zaten kullanılıyor
              </HelperText>
            )}
            {isCheckingUsername && (
              <HelperText type="info">
                Kullanılabilirlik kontrol ediliyor...
              </HelperText>
            )}
            {username.length > 0 && isUsernameValid && !usernameExists && !isCheckingUsername && (
              <HelperText type="info">
                ✓ Kullanıcı adı kullanılabilir
              </HelperText>
            )}

            <TextInput
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              theme={{ colors: { primary: theme.colors.primary } }}
              left={<TextInput.Icon icon="email" color={theme.colors.secondaryBlue} />}
              error={!isEmailValid || emailExists}
            />
            {!isEmailValid && email.length > 0 && (
              <HelperText type="error">
                Lütfen geçerli bir e-posta adresi girin (.edu.tr veya gmail.com uzantılı)
              </HelperText>
            )}
            {emailExists && (
              <HelperText type="error">
                Bu e-posta adresi zaten kullanılıyor
              </HelperText>
            )}
            {isCheckingEmail && (
              <HelperText type="info">
                E-posta kullanılabilirliği kontrol ediliyor...
              </HelperText>
            )}
            {email.length > 0 && isEmailValid && !emailExists && !isCheckingEmail && (
              <HelperText type="info">
                ✓ E-posta adresi kullanılabilir
              </HelperText>
            )}

            <TextInput
              label="Şifre"
              value={password}
              onChangeText={setPassword}
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
              error={!isPasswordValid && password.length > 0}
            />
            {!isPasswordValid && password.length > 0 && (
              <HelperText type="error">
                Şifreniz en az 8 karakter olmalıdır
              </HelperText>
            )}

            <TextInput
              label="Şifre Tekrar"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry={secureConfirmTextEntry}
              theme={{ colors: { primary: theme.colors.primary } }}
              left={<TextInput.Icon icon="lock-check" color={theme.colors.secondaryBlue} />}
              right={
                <TextInput.Icon
                  icon={secureConfirmTextEntry ? 'eye' : 'eye-off'}
                  onPress={() => setSecureConfirmTextEntry(!secureConfirmTextEntry)}
                  color="#666"
                />
              }
              error={!doPasswordsMatch && confirmPassword.length > 0}
            />
            {!doPasswordsMatch && confirmPassword.length > 0 && (
              <HelperText type="error">
                Şifreler eşleşmiyor
              </HelperText>
            )}
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.title}>Profil Detayları</Text>
            <Text style={styles.subtitle}>{userType === 'student' ? 'Eğitim bilgilerinizi girin' : 'Kulüp detaylarını girin'}</Text>
            
            {userType === 'student' ? (
              <>
                <View>
                  <TouchableOpacity 
                    style={[styles.dropdownField, university ? { borderColor: theme.colors.primary } : {}]}
                    onPress={() => setIsUniversityMenuVisible(true)}
                  >
                    <MaterialCommunityIcons name="school" size={24} color={theme.colors.secondaryBlue} style={styles.dropdownIcon} />
                    <Text style={[styles.dropdownText, university ? { color: theme.colors.text } : {}]}>
                      {university ? universities.find(u => u.id === university)?.label : "Üniversite Seçin"}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={24} color={university ? theme.colors.primary : "#666"} />
                  </TouchableOpacity>
                  
                  <Modal
                    visible={isUniversityMenuVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setIsUniversityMenuVisible(false)}
                  >
                    <TouchableOpacity 
                      style={styles.modalOverlay} 
                      activeOpacity={1} 
                      onPress={() => setIsUniversityMenuVisible(false)}
                    >
                      <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Üniversite Seçin</Text>
                          <TouchableOpacity onPress={() => setIsUniversityMenuVisible(false)}>
                            <MaterialCommunityIcons name="close" size={24} color="#666" />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.searchContainer}>
                          <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
                          <TextInput
                            value={universitySearch}
                            onChangeText={setUniversitySearch}
                            placeholder="Üniversite ara..."
                            style={styles.searchInput}
                            autoCapitalize="none"
                          />
                          {universitySearch.length > 0 && (
                            <TouchableOpacity onPress={() => setUniversitySearch('')}>
                              <MaterialCommunityIcons name="close-circle" size={18} color="#666" />
                            </TouchableOpacity>
                          )}
                        </View>
                        
                        <ScrollView style={styles.optionsContainer}>
                          {filteredUniversities.map((uni) => (
                            <TouchableOpacity
                              key={uni.id}
                              style={[
                                styles.optionItem,
                                uni.id === university && styles.selectedOption
                              ]}
                              onPress={() => {
                                setUniversity(uni.id);
                                setIsUniversityMenuVisible(false);
                              }}
                            >
                              <Text style={[
                                styles.optionText,
                                uni.id === university && styles.selectedOptionText
                              ]}>
                                {uni.label}
                              </Text>
                              {uni.id === university && (
                                <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                              )}
                            </TouchableOpacity>
                          ))}
                          {filteredUniversities.length === 0 && (
                            <View style={styles.noResultsContainer}>
                              <Text style={styles.noResultsText}>Sonuç bulunamadı</Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    </TouchableOpacity>
                  </Modal>
                </View>

                <View>
                  <TouchableOpacity 
                    style={[styles.dropdownField, department ? { borderColor: theme.colors.primary } : {}]}
                    onPress={() => setIsDepartmentMenuVisible(true)}
                  >
                    <MaterialCommunityIcons name="book-open-variant" size={24} color={theme.colors.secondaryBlue} style={styles.dropdownIcon} />
                    <Text style={[styles.dropdownText, department ? { color: theme.colors.text } : {}]}>
                      {department ? departments.find(d => d.id === department)?.label : "Bölüm Seçin"}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={24} color={department ? theme.colors.primary : "#666"} />
                  </TouchableOpacity>
                  
                  <Modal
                    visible={isDepartmentMenuVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setIsDepartmentMenuVisible(false)}
                  >
                    <TouchableOpacity 
                      style={styles.modalOverlay} 
                      activeOpacity={1} 
                      onPress={() => setIsDepartmentMenuVisible(false)}
                    >
                      <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Bölüm Seçin</Text>
                          <TouchableOpacity onPress={() => setIsDepartmentMenuVisible(false)}>
                            <MaterialCommunityIcons name="close" size={24} color="#666" />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.searchContainer}>
                          <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
                          <TextInput
                            value={departmentSearch}
                            onChangeText={setDepartmentSearch}
                            placeholder="Bölüm ara..."
                            style={styles.searchInput}
                            autoCapitalize="none"
                          />
                          {departmentSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setDepartmentSearch('')}>
                              <MaterialCommunityIcons name="close-circle" size={18} color="#666" />
                            </TouchableOpacity>
                          )}
                        </View>
                        
                        <ScrollView style={styles.optionsContainer}>
                          {filteredDepartments.map((dept) => (
                            <TouchableOpacity
                              key={dept.id}
                              style={[
                                styles.optionItem,
                                dept.id === department && styles.selectedOption
                              ]}
                              onPress={() => {
                                setDepartment(dept.id);
                                setIsDepartmentMenuVisible(false);
                              }}
                            >
                              <Text style={[
                                styles.optionText,
                                dept.id === department && styles.selectedOptionText
                              ]}>
                                {dept.label}
                              </Text>
                              {dept.id === department && (
                                <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                              )}
                            </TouchableOpacity>
                          ))}
                          {filteredDepartments.length === 0 && (
                            <View style={styles.noResultsContainer}>
                              <Text style={styles.noResultsText}>Sonuç bulunamadı</Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    </TouchableOpacity>
                  </Modal>
                </View>

                <View>
                  <TouchableOpacity 
                    style={[styles.dropdownField, classLevel ? { borderColor: theme.colors.primary } : {}]}
                    onPress={() => setIsClassLevelMenuVisible(true)}
                  >
                    <MaterialCommunityIcons name="numeric" size={24} color={theme.colors.secondaryBlue} style={styles.dropdownIcon} />
                    <Text style={[styles.dropdownText, classLevel ? { color: theme.colors.text } : {}]}>
                      {classLevel ? classLevels.find(cl => cl.id === classLevel)?.label : "Sınıf Seçin"}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={24} color={classLevel ? theme.colors.primary : "#666"} />
                  </TouchableOpacity>
                  
                  <Modal
                    visible={isClassLevelMenuVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setIsClassLevelMenuVisible(false)}
                  >
                    <TouchableOpacity 
                      style={styles.modalOverlay} 
                      activeOpacity={1} 
                      onPress={() => setIsClassLevelMenuVisible(false)}
                    >
                      <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Sınıf Seçin</Text>
                          <TouchableOpacity onPress={() => setIsClassLevelMenuVisible(false)}>
                            <MaterialCommunityIcons name="close" size={24} color="#666" />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.searchContainer}>
                          <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
                          <TextInput
                            value={classLevelSearch}
                            onChangeText={setClassLevelSearch}
                            placeholder="Sınıf ara..."
                            style={styles.searchInput}
                            autoCapitalize="none"
                          />
                          {classLevelSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setClassLevelSearch('')}>
                              <MaterialCommunityIcons name="close-circle" size={18} color="#666" />
                            </TouchableOpacity>
                          )}
                        </View>
                        
                        <ScrollView style={styles.optionsContainer}>
                          {filteredClassLevels.map((cl) => (
                            <TouchableOpacity
                              key={cl.id}
                              style={[
                                styles.optionItem,
                                cl.id === classLevel && styles.selectedOption
                              ]}
                              onPress={() => {
                                setClassLevel(cl.id);
                                setIsClassLevelMenuVisible(false);
                              }}
                            >
                              <Text style={[
                                styles.optionText,
                                cl.id === classLevel && styles.selectedOptionText
                              ]}>
                                {cl.label}
                              </Text>
                              {cl.id === classLevel && (
                                <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                              )}
                            </TouchableOpacity>
                          ))}
                          {filteredClassLevels.length === 0 && (
                            <View style={styles.noResultsContainer}>
                              <Text style={styles.noResultsText}>Sonuç bulunamadı</Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    </TouchableOpacity>
                  </Modal>
                </View>
              </>
            ) : (
              <>
                <View>
                  <TouchableOpacity 
                    style={[styles.dropdownField, university ? { borderColor: theme.colors.primary } : {}]}
                    onPress={() => setIsUniversityMenuVisible(true)}
                  >
                    <MaterialCommunityIcons name="school" size={24} color={theme.colors.secondaryBlue} style={styles.dropdownIcon} />
                    <Text style={[styles.dropdownText, university ? { color: theme.colors.text } : {}]}>
                      {university ? universities.find(u => u.id === university)?.label : "Üniversite Seçin"}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={24} color={university ? theme.colors.primary : "#666"} />
                  </TouchableOpacity>
                  
                  <Modal
                    visible={isUniversityMenuVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setIsUniversityMenuVisible(false)}
                  >
                    <TouchableOpacity 
                      style={styles.modalOverlay} 
                      activeOpacity={1} 
                      onPress={() => setIsUniversityMenuVisible(false)}
                    >
                      <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Üniversite Seçin</Text>
                          <TouchableOpacity onPress={() => setIsUniversityMenuVisible(false)}>
                            <MaterialCommunityIcons name="close" size={24} color="#666" />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.searchContainer}>
                          <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
                          <TextInput
                            value={universitySearch}
                            onChangeText={setUniversitySearch}
                            placeholder="Üniversite ara..."
                            style={styles.searchInput}
                            autoCapitalize="none"
                          />
                          {universitySearch.length > 0 && (
                            <TouchableOpacity onPress={() => setUniversitySearch('')}>
                              <MaterialCommunityIcons name="close-circle" size={18} color="#666" />
                            </TouchableOpacity>
                          )}
                        </View>
                        
                        <ScrollView style={styles.optionsContainer}>
                          {filteredUniversities.map((uni) => (
                            <TouchableOpacity
                              key={uni.id}
                              style={[
                                styles.optionItem,
                                uni.id === university && styles.selectedOption
                              ]}
                              onPress={() => {
                                setUniversity(uni.id);
                                setIsUniversityMenuVisible(false);
                              }}
                            >
                              <Text style={[
                                styles.optionText,
                                uni.id === university && styles.selectedOptionText
                              ]}>
                                {uni.label}
                              </Text>
                              {uni.id === university && (
                                <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                              )}
                            </TouchableOpacity>
                          ))}
                          {filteredUniversities.length === 0 && (
                            <View style={styles.noResultsContainer}>
                              <Text style={styles.noResultsText}>Sonuç bulunamadı</Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    </TouchableOpacity>
                  </Modal>
                </View>
                
                <View>
                  <TouchableOpacity 
                    style={[styles.dropdownField, selectedClubTypes.length > 0 ? { borderColor: theme.colors.primary } : {}]}
                    onPress={() => setIsClubTypeMenuVisible(true)}
                  >
                    <MaterialCommunityIcons name="shape" size={24} color={theme.colors.secondaryBlue} style={styles.dropdownIcon} />
                    <Text style={[styles.dropdownText, selectedClubTypes.length > 0 ? { color: theme.colors.text } : {}]}>
                      {selectedClubTypes.length > 0 
                        ? `${selectedClubTypes.length} Kategori Seçildi` 
                        : "Kulüp ileri Seçin (Birden fazla seçilebilir)"}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={24} color={selectedClubTypes.length > 0 ? theme.colors.primary : "#666"} />
                  </TouchableOpacity>
                  
                  {selectedClubTypes.length > 0 && (
                    <View style={styles.selectedChipsContainer}>
                      {selectedClubTypes.map(typeId => {
                        const clubTypeInfo = clubTypes.find(ct => ct.id === typeId);
                        return (
                          <Chip 
                            key={typeId}
                            icon={() => <MaterialCommunityIcons name={clubTypeInfo?.icon as any || 'shape'} size={18} color="#FFF" />}
                            style={styles.selectedChip}
                            textStyle={{ color: '#FFF' }}
                            onClose={() => setSelectedClubTypes(prev => prev.filter(id => id !== typeId))}
                          >
                            {clubTypeInfo?.name || typeId}
                          </Chip>
                        );
                      })}
                    </View>
                  )}
                </View>
                
                <Modal
                  visible={isClubTypeMenuVisible}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setIsClubTypeMenuVisible(false)}
                >
                  <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setIsClubTypeMenuVisible(false)}
                  >
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Kulüp Kategorileri Seçin</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Button 
                            mode="text" 
                            compact 
                            onPress={() => {
                              setIsClubTypeMenuVisible(false);
                            }}
                            style={{ marginRight: 5 }}
                            color={theme.colors.primary}
                          >
                            Tamam ({selectedClubTypes.length})
                          </Button>
                          <TouchableOpacity onPress={() => setIsClubTypeMenuVisible(false)}>
                            <MaterialCommunityIcons name="close" size={24} color="#666" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <View style={styles.searchContainer}>
                        <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
                        <TextInput
                          value={clubTypeSearch}
                          onChangeText={setClubTypeSearch}
                          placeholder="Kulüp türü ara..."
                          style={styles.searchInput}
                          autoCapitalize="none"
                        />
                        {clubTypeSearch.length > 0 && (
                          <TouchableOpacity onPress={() => setClubTypeSearch('')}>
                            <MaterialCommunityIcons name="close-circle" size={18} color="#666" />
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      <ScrollView style={styles.optionsContainer}>
                        {filteredClubTypes.map((ct) => (
                          <TouchableOpacity
                            key={ct.id}
                            style={[
                              styles.optionItem,
                              selectedClubTypes.includes(ct.id) && styles.selectedOption
                            ]}
                            onPress={() => {
                              // Toggle selection
                              if (selectedClubTypes.includes(ct.id)) {
                                setSelectedClubTypes(prev => prev.filter(id => id !== ct.id));
                                // If this was the only/main clubType, clear it
                                if (clubType === ct.id) {
                                  const newTypes = selectedClubTypes.filter(id => id !== ct.id);
                                  setClubType(newTypes.length > 0 ? newTypes[0] : '');
                                }
                              } else {
                                setSelectedClubTypes(prev => [...prev, ct.id]);
                                // Set the first selected type as the main clubType for backwards compatibility
                                if (!clubType) {
                                  setClubType(ct.id);
                                }
                              }
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <MaterialCommunityIcons 
                                name={ct.icon as any} 
                                size={20} 
                                color={selectedClubTypes.includes(ct.id) ? theme.colors.primary : "#666"}
                                style={{ marginRight: 8 }}
                              />
                              <Text style={[
                                styles.optionText,
                                selectedClubTypes.includes(ct.id) && styles.selectedOptionText
                              ]}>
                                {ct.name}
                              </Text>
                            </View>
                            {selectedClubTypes.includes(ct.id) && (
                              <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                            )}
                          </TouchableOpacity>
                        ))}
                        {filteredClubTypes.length === 0 && (
                          <View style={styles.noResultsContainer}>
                            <Text style={styles.noResultsText}>Sonuç bulunamadı</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  </TouchableOpacity>
                </Modal>
              </>
            )}
            
            <TextInput
              label={userType === 'student' ? "Biyografi" : "Açıklama"}
              value={bio}
              onChangeText={setBio}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={4}
              theme={{ colors: { primary: theme.colors.primary } }}
              left={<TextInput.Icon icon="card-text-outline" color={theme.colors.secondaryBlue} />}
            />
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.title}>Profil Önizleme</Text>
            <Text style={styles.subtitle}>Profiliniz nasıl görünecek? (isteğe bağlı)</Text>
            
            {/* Profile Preview Container - Simplified */}
            <View style={styles.profilePreviewContainer}>
              {/* Cover Background */}
              <View style={styles.previewCoverContainer}>
                {selectedDefaultCover ? (
                  <View 
                    style={[
                      styles.previewCover, 
                      {backgroundColor: defaultCovers.find(c => c.id === selectedDefaultCover)?.color || '#E3F2FD'}
                    ]}
                  >
                    <MaterialCommunityIcons 
                      name={(defaultCovers.find(c => c.id === selectedDefaultCover)?.icon as any) || 'image'} 
                      size={40} 
                      color="#FFFFFF" 
                    />
                  </View>
                ) : (
                  <View style={[styles.previewCover, styles.defaultPreviewCover]}>
                    <MaterialCommunityIcons name="image" size={40} color="#FFFFFF" />
                  </View>
                )}
              </View>
              
              {/* Avatar - Centered on Cover */}
              <View style={styles.previewAvatarContainer}>
                <TouchableOpacity 
                  style={styles.previewAvatarButton}
                  onPress={() => setShowAvatarModal(true)}
                >
                  {selectedDefaultAvatar ? (
                    <View 
                      style={[
                        styles.previewAvatar, 
                        {backgroundColor: defaultAvatars.find(a => a.id === selectedDefaultAvatar)?.color || '#E3F2FD'}
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name={(defaultAvatars.find(a => a.id === selectedDefaultAvatar)?.icon as any) || 'account'} 
                        size={35} 
                        color="#FFFFFF" 
                      />
                    </View>
                  ) : (
                    <View style={[styles.previewAvatar, styles.defaultPreviewAvatar]}>
                      <MaterialCommunityIcons name="account" size={35} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.photoActionButtons}>
              <TouchableOpacity 
                style={styles.photoActionButton}
                onPress={() => setShowAvatarModal(true)}
              >
                <MaterialCommunityIcons name="account-circle-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.photoActionButtonText}>Avatar Seç</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.photoActionButton}
                onPress={() => setShowCoverModal(true)}
              >
                <MaterialCommunityIcons name="image-area" size={24} color={theme.colors.primary} />
                <Text style={styles.photoActionButtonText}>Kapak Seç</Text>
              </TouchableOpacity>
            </View>

            {/* Informational Message */}
            <View style={styles.infoMessageContainer}>
              <MaterialCommunityIcons name="information-outline" size={20} color="#4A90E2" />
              <Text style={styles.infoMessageText}>
                <Text style={styles.infoMessageTitle}>📸 Profil Fotoğrafınız Hakkında{'\n'}</Text>
                Şu an sadece hazır avatarlar seçebilirsiniz. Hesabınızı oluşturduktan sonra profil ayarlarından gerçek fotoğraflarınızı yükleyebilir ve kişiselleştirebilirsiniz.
              </Text>
            </View>
            
            <View style={styles.termsContainer}>
              <Text style={[styles.termsText, { color: theme.colors.placeholder }]}>
                Kullanım şartları ve gizlilik politikasını ana ekranda kabul ettiniz.
              </Text>
            </View>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (currentStep > 1) {
                setCurrentStep(currentStep - 1);
              } else {
                navigation.goBack();
              }
            }}
          >
            <MaterialCommunityIcons 
              name="arrow-left" 
              size={24} 
              color={theme.colors.text} 
            />
          </TouchableOpacity
          >
          
          <View style={styles.progressIndicatorContainer}>
            {[1, 2, 3, 4].map((step) => (
              <View 
                key={step} 
                style={[
                  styles.progressStep,
                  {
                    backgroundColor: step <= currentStep 
                      ? theme.colors.primary 
                      : theme.colors.lightGray
                  }
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Logo */}
          <Animated.View style={[styles.logoContainer, { opacity: logoAnim }]}>
            <MaterialCommunityIcons 
              name="earth" 
              size={50} 
              color={theme.colors.primary} 
            />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.formContainer,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={24} color="#f44336" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
            
            {renderStepContent()}
            
            <Button
              mode="contained"
              onPress={handleNextStep}
              style={[
                styles.nextButton,
                { backgroundColor: theme.colors.primary }
              ]}
              loading={isLoading}
              disabled={!canProceedToNextStep()}
            >
              {currentStep < 4 ? "İlerle" : "Kayıt Ol"}
            </Button>

            {currentStep === 2 && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={[styles.loginText, { color: theme.colors.primary }]}>Giriş Yap</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* Copyright Footer */}
          <View style={styles.copyrightContainer}>
            <Text style={[styles.copyrightText, { color: theme.colors.text }]}>
              © 2025 Universe App
            </Text>
            <Text style={[styles.poweredByText, { color: theme.colors.text }]}>
              Powered by MeMoDe
            </Text>
          </View>
        </ScrollView>

        <Portal>
          <Dialog
            visible={isVerificationDialogVisible}
            onDismiss={() => setIsVerificationDialogVisible(false)}
            style={styles.verificationDialog}
          >
            <Dialog.Content style={styles.verificationContent}>
              {/* Email icon */}
              <View style={styles.emailIconContainer}>
                <MaterialCommunityIcons 
                  name="email-check" 
                  size={80} 
                  color={theme.colors.primary} 
                />
              </View>
              
              {/* Title */}
              <Text style={[styles.verificationTitle, { color: theme.colors.text }]}>
                E-posta Doğrulaması Gerekli
              </Text>
              
              {/* Description */}
              <Text style={[styles.verificationDescription, { color: theme.colors.text }]}>
                Hesabınıza erişmek için lütfen e-posta adresinizi doğrulayın.
              </Text>
              
              {/* Email address */}
              <Text style={[styles.verificationEmail, { color: theme.colors.primary }]}>
                {email} adresine gönderilen doğrulama bağlantısını kontrol edin ve tıklayın.
              </Text>
              
              {/* Main action button */}
              <Button
                mode="contained"
                onPress={resendVerificationEmail}
                style={[styles.verificationMainButton, { backgroundColor: theme.colors.primary }]}
                labelStyle={styles.verificationMainButtonText}
                disabled={isLoading}
                loading={isLoading}
              >
                DOĞRULAMA E-POSTASINI YENİDEN GÖNDER
              </Button>
              
              {/* Check verification button */}
              <Button
                mode="outlined"
                onPress={checkEmailVerification}
                style={[styles.verificationCheckButton, { borderColor: theme.colors.primary }]}
                labelStyle={[styles.verificationCheckButtonText, { color: theme.colors.primary }]}
                disabled={isLoading}
              >
                DOĞRULAMA DURUMUNU KONTROL ET
              </Button>
              
              {/* Back to home button */}
              <Button
                mode="text"
                onPress={() => {
                  setIsVerificationDialogVisible(false);
                  console.log('🏠 Dialog closed, AuthNavigator will handle navigation based on user state');
                  // AuthNavigator otomatik olarak kullanıcı durumuna göre yönlendirecek:
                  // - Email verified ise: AppNavigator (Home)
                  // - Email verified değilse: EmailVerificationScreen
                }}
                style={styles.verificationBackButton}
                labelStyle={[styles.verificationBackButtonText, { color: theme.colors.primary }]}
              >
                Ana sayfaya dön
              </Button>
              
              {/* Spam folder note */}
              <Text style={[styles.spamNote, { color: theme.colors.text }]}>
                E-posta alamadınız mı? Spam klasörünüzü kontrol edin veya yukarıdaki butonu kullanarak yeniden göndermeyi deneyin.
              </Text>
            </Dialog.Content>
          </Dialog>
        </Portal>

        {/* Avatar Selection Modal */}
        <Modal
          visible={showAvatarModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAvatarModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowAvatarModal(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Avatar Seç</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.modalContent}>
              {/* Search bar */}
              <View style={styles.imageSearchContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  value={avatarSearch}
                  onChangeText={setAvatarSearch}
                  placeholder="Avatar ara..."
                  placeholderTextColor="#666"
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor="#1976D2"
                />
                {avatarSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setAvatarSearch('')}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Category selector - Updated */}
              <View style={{
                backgroundColor: '#f8f8f8',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#ddd',
                marginBottom: 10,
                marginTop: 5,
                paddingVertical: 3,
              }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  paddingHorizontal: 15,
                  paddingTop: 5,
                  color: '#666',
                }}>
                  Filtreleme:
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={true}
                  style={styles.categoryContainer}
                  contentContainerStyle={styles.categoryContentContainer}
                  persistentScrollbar={true}
                >
                  <TouchableOpacity 
                    style={[
                      styles.categoryChip,
                      selectedAvatarCategory === null && styles.selectedCategoryChip,
                      { backgroundColor: selectedAvatarCategory === null ? '#1976D2' : '#e0e0e0' }
                    ]}
                    onPress={() => setSelectedAvatarCategory(null)}
                    activeOpacity={0.7}
                  >
                    <Text 
                      style={{
                        fontSize: 16,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: selectedAvatarCategory === null ? '#ffffff' : '#000000',
                        textShadowColor: selectedAvatarCategory === null ? 'rgba(0,0,0,0.2)' : 'transparent',
                        textShadowOffset: {width: 0, height: 1},
                        textShadowRadius: 1
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      allowFontScaling={false}
                    >
                      Tümü
                    </Text>
                  </TouchableOpacity>
                  
                  {getAvatarCategories().map((category) => (
                    <TouchableOpacity 
                      key={category}
                      style={[
                        styles.categoryChip,
                        selectedAvatarCategory === category && styles.selectedCategoryChip,
                        { backgroundColor: selectedAvatarCategory === category ? '#1976D2' : '#e0e0e0' }
                      ]}
                      onPress={() => setSelectedAvatarCategory(category)}
                      activeOpacity={0.7}
                    >
                      <Text 
                        style={{
                          fontSize: 16,
                          fontWeight: 'bold',
                          textAlign: 'center',
                          color: selectedAvatarCategory === category ? '#ffffff' : '#000000',
                          textShadowColor: selectedAvatarCategory === category ? 'rgba(0,0,0,0.2)' : 'transparent',
                          textShadowOffset: {width: 0, height: 1},
                          textShadowRadius: 1
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        allowFontScaling={false}
                      >
                        {getCategoryLabel(category)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {/* Avatar grid */}
              <FlatList
                data={getFilteredAvatars()}
                numColumns={3}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.modalGridContainer}
                ListEmptyComponent={() => (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>Sonuç bulunamadı</Text>
                  </View>
                )}
                renderItem={({item}) => (
                  <TouchableOpacity 
                    style={[
                      styles.modalGridItem,
                      selectedDefaultAvatar === item.id && styles.selectedModalItem
                    ]}
                    onPress={() => {
                      setSelectedDefaultAvatar(item.id);
                      setShowAvatarModal(false);
                    }}
                  >
                    <View style={[styles.modalItemThumb, {backgroundColor: item.color}]}>
                      <MaterialCommunityIcons name={item.icon as any} size={36} color="#FFFFFF" />
                    </View>
                    <Text style={styles.modalItemName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </SafeAreaView>
        </Modal>

        {/* Cover Selection Modal */}
        <Modal
          visible={showCoverModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCoverModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowCoverModal(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Kapak Seç</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.modalContent}>
              {/* Search bar */}
              <View style={styles.imageSearchContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  value={coverSearch}
                  onChangeText={setCoverSearch}
                  placeholder="Kapak ara..."
                  placeholderTextColor="#666"
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor="#1976D2"
                />
                {coverSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setCoverSearch('')}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Category selector - Updated */}
              <View style={{
                backgroundColor: '#f8f8f8',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#ddd',
                marginBottom: 10,
                marginTop: 5,
                paddingVertical: 3,
              }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  paddingHorizontal: 15,
                  paddingTop: 5,
                  color: '#666',
                }}>
                  Filtreleme:
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={true}
                  style={styles.categoryContainer}
                  contentContainerStyle={styles.categoryContentContainer}
                  persistentScrollbar={true}
                >
                  <TouchableOpacity 
                    style={[
                      styles.categoryChip,
                      selectedCoverCategory === null && styles.selectedCategoryChip,
                      { backgroundColor: selectedCoverCategory === null ? '#1976D2' : '#e0e0e0' }
                    ]}
                    onPress={() => setSelectedCoverCategory(null)}
                    activeOpacity={0.7}
                  >
                    <Text 
                      style={{
                        fontSize: 16,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        color: selectedCoverCategory === null ? '#ffffff' : '#000000',
                        textShadowColor: selectedCoverCategory === null ? 'rgba(0,0,0,0.2)' : 'transparent',
                        textShadowOffset: {width: 0, height: 1},
                        textShadowRadius: 1
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      allowFontScaling={false}
                    >
                      Tümü
                    </Text>
                  </TouchableOpacity>
                  
                  {getCoverCategories().map((category) => (
                    <TouchableOpacity 
                      key={category}
                      style={[
                        styles.categoryChip,
                        selectedCoverCategory === category && styles.selectedCategoryChip,
                        { backgroundColor: selectedCoverCategory === category ? '#1976D2' : '#e0e0e0' }
                      ]}
                      onPress={() => setSelectedCoverCategory(category)}
                      activeOpacity={0.7}
                    >
                      <Text 
                        style={{
                          fontSize: 16,
                          fontWeight: 'bold',
                          textAlign: 'center',
                          color: selectedCoverCategory === category ? '#ffffff' : '#000000',
                          textShadowColor: selectedCoverCategory === category ? 'rgba(0,0,0,0.2)' : 'transparent',
                          textShadowOffset: {width: 0, height: 1},
                          textShadowRadius: 1
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        allowFontScaling={false}
                      >
                        {getCategoryLabel(category)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {/* Cover grid */}
              <FlatList
                data={getFilteredCovers()}
                numColumns={2}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.modalGridContainer}
                ListEmptyComponent={() => (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>Sonuç bulunamadı</Text>
                  </View>
                )}
                renderItem={({item}) => (
                  <TouchableOpacity 
                    style={[
                      styles.modalGridItem,
                      styles.modalCoverItem,
                      selectedDefaultCover === item.id && styles.selectedModalItem
                    ]}
                    onPress={() => {
                      setSelectedDefaultCover(item.id);
                      setShowCoverModal(false);
                    }}
                  >
                    <View style={[styles.modalCoverThumb, {backgroundColor: item.color}]}>
                      <MaterialCommunityIcons name={item.icon as any} size={36} color="#FFFFFF" />
                    </View>
                    <Text style={styles.modalItemName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  progressIndicatorContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 40,
  },
  progressStep: {
    width: 35,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 3,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  userTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  userTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeUserType: {
    borderWidth: 0,
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  activeUserTypeText: {
    color: '#fff',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 2,
  },
  dropdownIcon: {
    marginRight: 10,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: '#444',
  },
  menu: {
    width: '80%',
  },
  menuScrollView: {
    maxHeight: 200,
  },
  nextButton: {
    marginTop: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },
  imagePickerContainer: {
    marginBottom: 20,
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  imagePicker: {
    height: 120,
    borderRadius: 60,
    width: 120,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  coverImagePicker: {
    height: 100,
    borderRadius: 10,
    width: '100%',
  },
  imagePickerText: {
    marginTop: 8,
    color: '#666',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCoverImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsContainer: {
    marginTop: 15,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    flex: 1,
    marginLeft: 5,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#666',
  },
  loginText: {
    fontWeight: 'bold',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingVertical: 10,
    paddingHorizontal:   15,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#d32f2f',
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  verificationDialog: {
    padding: 0,
    borderRadius: 12,
    maxWidth: 400,
    alignSelf: 'center',
  },
  verificationContent: {
    padding: 30,
    alignItems: 'center',
  },
  emailIconContainer: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 50,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
  },
  verificationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  verificationDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    opacity: 0.8,
  },
  verificationEmail: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '500',
  },
  verificationMainButton: {
    width: '100%',
    marginBottom: 15,
    paddingVertical: 5,
    borderRadius: 8,
  },
  verificationMainButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  verificationCheckButton: {
    width: '100%',
    marginBottom: 15,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  verificationCheckButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  verificationBackButton: {
    marginBottom: 20,
  },
  verificationBackButtonText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  spamNote: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    paddingHorizontal: 5,
    borderBottomWidth: 1.5,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    paddingTop: 10,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 40,
    color: '#000000', // Daha koyu renk
    backgroundColor: 'transparent',
    fontWeight: '500', // Yazıyı biraz daha kalın yapma
    padding: 8,
    marginLeft: 5,
    borderRadius: 8,
  },
  optionsContainer: {
    maxHeight: 350,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOption: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  optionText: {
    fontSize: 16,
    color: '#444',
  },
  selectedOptionText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
  },
  imagePickerOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  imagePickerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
    flexDirection: 'row',
  },
  activePickerOption: {
    borderColor: '#2196F3',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  imagePickerButtonText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#555',
  },
  defaultImagesContainer: {
    marginBottom: 15,
  },
  defaultImageItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 80,
  },
  defaultCoverItem: {
    width: 120,
  },
  defaultImageThumb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultCoverThumb: {
    width: 120,
    height: 60,
    borderRadius: 6,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultImageName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  selectedDefaultImage: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingVertical: 5,
    borderRadius: 8,
  },
  selectedImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedCoverContainer: {
    width: '100%',
    height: 120,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderCover: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  // Yeni eklenen stiller
  imageSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    borderWidth: 1.5, // Daha kalın kenarlık
    borderColor: '#1976D2', // Mavi kenarlık
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3
  },
  categoryContainer: {
    marginVertical: 12,
    height: 50, // Daha yüksek bir konteyner
    backgroundColor: '#f5f5f5', // Hafif arka plan
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryContentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignItems: 'center', // Yatay hizalama
    height: 50, // Sabit yükseklik
    flexDirection: 'row',
  },
  categoryChip: {
    margin: 4,
    borderRadius: 20,
    backgroundColor: '#e0e0e0', // Daha koyu arka plan rengi
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#9e9e9e', // Daha belirgin kenarlık
    elevation: 3, // Daha yüksek gölge
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    minWidth: 100, // Minimum genişlik artırıldı
    alignItems: 'center',
    justifyContent: 'center',
    height: 40, // Sabit yükseklik
    marginHorizontal: 5, // Kategoriler arası boşluk
  },
  selectedCategoryChip: {
    backgroundColor: '#1976D2', // Daha koyu mavi
    borderColor: '#1565C0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    borderWidth: 1.5,
  },
  categoryChipText: {
    fontSize: 16, // Daha büyük yazı
    color: '#000000', // Siyah yazı rengi
    fontWeight: 'bold', // Kalın yazı
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: {width: 0, height: 0.5},
    textShadowRadius: 1,
    includeFontPadding: false,
    marginTop: 1, // Metin yukarı kaydırma
  },
  selectedCategoryChipText: {
    color: 'white',
    fontWeight: '900', // Extra kalın yazı
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 1,
  },
  emptyListContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Profile Preview Styles
  profilePreviewContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: 220, // Profil önizleme konteynerinin yüksekliğini artırdık (220'den 240'a)
  },
  previewCoverContainer: {
    position: 'relative',
    height: 140, // Kapak alanı yüksekliğini artırdık (140'tan 160'a)
  },
  previewCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultPreviewCover: {
    backgroundColor: '#E3F2FD',
  },
  previewAvatarContainer: {
    position: 'absolute',
    top: 100, // Avatarı daha aşağıya kaydırmak için 80'den 100'e çıkardık
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarButton: {
    position: 'relative',
  },
  previewAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultPreviewAvatar: {
    backgroundColor: '#E3F2FD',
  },
  previewInfoContainer: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  previewName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  previewUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  previewBio: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  photoActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  photoActionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  infoMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    marginHorizontal: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  infoMessageText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    flex: 1,
  },
  infoMessageTitle: {
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
  },
  
  // Modal Styles (Additional)
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  modalCloseButton: {
    padding: 5,
  },
  modalActionButton: {
    padding: 5,
  },
  modalGridContainer: {
    paddingBottom: 20,
  },
  modalGridItem: {
    flex: 1,
    margin: 8,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modalCoverItem: {
    minWidth: '45%',
  },
  selectedModalItem: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  modalItemThumb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginHorizontal: -2,
  },
  selectedChip: {
    margin: 2,
    backgroundColor: '#1E88E5',
  },
  modalCoverThumb: {
    width: 60,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalItemName: {
    fontSize: 14, // Daha büyük yazı
    textAlign: 'center',
    color: '#000', // Daha koyu renk
    fontWeight: '600', // Daha kalın
    letterSpacing: 0.3, // Harfler arası mesafe
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 0.1 },
    textShadowRadius: 0.1,
  },
  copyrightContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
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
});

export default RegisterScreen;
