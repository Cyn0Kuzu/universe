import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, firestore } from '../../firebase/config';
import { userActivityService } from '../../services/enhancedUserActivityService';
import { centralizedRankingService } from '../../services/centralizedRankingService';
import { usernameValidationService } from '../../services/usernameValidationService';
import { University, UNIVERSITIES_DATA } from '../../constants/universities';
import { Department, DEPARTMENTS_DATA } from '../../constants/departments';
import { ClassLevel, CLASS_LEVELS_DATA } from '../../constants/classLevels';
import { ClubType, CLUB_TYPES_DATA } from '../../constants/clubTypes';
import { EventCategory } from '../../constants/eventCategories';

export interface ProfileEditModalProps {
  visible: boolean;
  onDismiss: () => void;
  onUpdate: (field: string, value: string | string[]) => void;
  field: string;
  currentValue: string | string[];
  label: string;
  userType?: string; // Kullanıcı tipini kontrol etmek için
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  visible,
  onDismiss,
  onUpdate,
  field,
  currentValue,
  label,
  userType,
}) => {
  const [value, setValue] = useState<string | string[]>(currentValue);
  const [loading, setLoading] = useState(false);
  const [showListSelection, setShowListSelection] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    setValue(currentValue);
    
    // Kategoriler için özel durum
    if (field === 'categories') {
      if (Array.isArray(currentValue)) {
        setSelectedCategories(currentValue);
      } else if (currentValue) {
        // Tek değer varsa array'e çevir
        setSelectedCategories([currentValue]);
      } else {
        setSelectedCategories([]);
      }
    }
    
    // Only log when meaningful state changes occur
    if (visible && field) {
      console.log('🟢 ProfileEditModal props changed:', { field, currentValue, label });
    }
  }, [currentValue, visible, field]);

  const handleSave = async () => {
    console.log('💾 handleSave started:', { field, value, currentValue, userType });
    
    // Hassas alanları kontrol et
    const restrictedFields = ['userType', 'email', 'role', 'uid'];
    if (restrictedFields.includes(field)) {
      console.log('❌ Restricted field detected:', field);
      Alert.alert('Hata', 'Bu alan güvenlik nedenleriyle düzenlenemez');
      return;
    }
    
    // Kulüp kullanıcıları için ek kısıtlamalar
    const isClubUser = userType === 'club';
    const clubRestrictedFields = ['email', 'userType'];
    
    if (isClubUser && clubRestrictedFields.includes(field)) {
      console.log('❌ Club user trying to edit restricted field:', field);
      Alert.alert('Kısıtlama', 'Kulüp hesapları bu alanı düzenleyemez');
      return;
    }
    
    if (typeof value === 'string' && !value.trim() && field !== 'categories') {
      console.log('❌ Empty value detected');
      Alert.alert('Hata', 'Bu alan boş bırakılamaz');
      return;
    }

    // Kategoriler için özel kontrol
    if (field === 'categories' && selectedCategories.length === 0) {
      Alert.alert('Hata', 'En az bir kategori seçmelisiniz');
      return;
    }

    const finalValue = field === 'categories' ? selectedCategories : value;
    
    if (JSON.stringify(finalValue) === JSON.stringify(currentValue)) {
      console.log('🔄 No changes detected, closing modal');
      onDismiss();
      return;
    }

    console.log('🚀 Starting database update process...');
    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      console.log('👤 User ID:', userId);
      
      if (!userId) {
        console.log('❌ No user ID found');
        throw new Error('Kullanıcı bulunamadı');
      }

      // Username kontrolü
      if (field === 'username' && typeof value === 'string') {
        console.log('🔍 Checking username format for:', value.toLowerCase());
        
        const validationResult = await usernameValidationService.checkUsernameAvailability(
          value, 
          userId
        );
        
        if (!validationResult.isAvailable) {
          console.log('❌ Username validation failed:', validationResult.error);
          Alert.alert('Hata', validationResult.error || 'Username formatı geçersiz');
          setLoading(false);
          return;
        }
        console.log('✅ Username validation passed');
      }

      // Database güncelleme
      let updateData: any;
      
      if (field === 'categories') {
        updateData = {
          clubTypes: selectedCategories,
          updatedAt: new Date(),
        };
      } else {
        updateData = {
          [field]: field === 'username' && typeof value === 'string' ? value.toLowerCase() : value,
          updatedAt: new Date(),
        };
      }
      
      console.log('📝 Updating database with:', updateData);
      
      // Username güncellemesi için transaction işlemi
      if (field === 'username' && typeof value === 'string') {
        await firestore.runTransaction(async (transaction) => {
          // Yeni username'in mevcut olup olmadığını kontrol et
          const newUsernameRef = firestore.collection('usernames').doc(value.toLowerCase());
          const newUsernameDoc = await transaction.get(newUsernameRef);
          
          // Eğer username başka bir kullanıcıya aitse hata ver
          if (newUsernameDoc.exists) {
            const existingData = newUsernameDoc.data();
            if (existingData?.userId !== userId) {
              throw new Error('Bu kullanıcı adı zaten kullanılıyor');
            }
          }
          
          // Users collection'ı güncelle
          const userRef = firestore.collection('users').doc(userId);
          transaction.update(userRef, updateData);
          
          // Yeni username'i kaydet
          transaction.set(newUsernameRef, {
            userId: userId,
            createdAt: new Date(),
          });
          
          // Eski username'i varsa sil (eğer farklıysa)
          if (currentValue && typeof currentValue === 'string' && currentValue !== value.toLowerCase()) {
            const oldUsernameRef = firestore.collection('usernames').doc(currentValue);
            transaction.delete(oldUsernameRef);
          }
        });
        
        console.log('✅ Username transaction update successful');
      } else {
        // Normal güncelleme
        await firestore.collection('users').doc(userId).update(updateData);
        console.log('✅ Database update successful');
      }
      console.log('🔄 Calling onUpdate callback');
      
      onUpdate(field, finalValue);
      // Log profile update activity (followers_only visibility handled in service)
      try {
        const userDoc = await firestore.collection('users').doc(userId).get();
        const userData = userDoc.data();
        await userActivityService.logProfileUpdate(
          userId,
          userData?.displayName || userData?.name || 'Kullanıcı',
          { field, value: finalValue }
        );
      } catch (activityErr) {
        console.warn('Profile update activity logging failed:', activityErr);
      }
      onDismiss();
      
      console.log('🎉 Profile update completed successfully');
      Alert.alert('Başarılı', 'Bilginiz güncellendi');
    } catch (error) {
      console.error('❌ Update error details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      console.error('❌ Error message:', errorMessage);
      
      // Username duplicate error kontrolü
      if (errorMessage.includes('kullanıcı adı zaten kullanılıyor')) {
        Alert.alert('Kullanıcı Adı Hatası', 'Bu kullanıcı adı zaten kullanılıyor. Lütfen farklı bir kullanıcı adı seçin.');
      } else {
        Alert.alert('Hata', 'Güncelleme sırasında bir hata oluştu: ' + errorMessage);
      }
    } finally {
      console.log('🏁 handleSave completed, setting loading to false');
      setLoading(false);
    }
  };

  const getDisplayValue = (field: string, value: string | string[]): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    switch (field) {
      case 'university':
        const university = UNIVERSITIES_DATA.find(u => u.id === value || u.label === value);
        return university ? university.label : value;
      case 'department':
        const department = DEPARTMENTS_DATA.find(d => d.id === value || d.label === value);
        return department ? department.label : value;
      case 'classLevel':
        const classLevel = CLASS_LEVELS_DATA.find(c => c.id === value || c.label === value);
        return classLevel ? classLevel.label : value;
      case 'clubType':
        const clubType = CLUB_TYPES_DATA.find(c => c.id === value || c.name === value);
        return clubType ? clubType.name : value;
      case 'categories':
        if (Array.isArray(value)) {
          return value.map(id => {
            const category = CLUB_TYPES_DATA.find(c => c.id === id);
            return category ? category.name : id;
          }).join(', ');
        }
        return value;
      default:
        return value;
    }
  };

  const getPlaceholder = () => {
    switch (field) {
      case 'username':
        return 'Kullanıcı adınızı girin';
      case 'bio':
        return 'Biyografinizi yazın';
      case 'displayName':
        return 'Görünen adınızı girin';
      case 'department':
        return 'Bölümünüzü seçin';
      case 'university':
        return 'Üniversitenizi seçin';
      case 'classLevel':
        return 'Sınıf seviyenizi seçin';
      case 'clubType':
        return 'Kulüp tipini seçin';
      case 'categories':
        return 'Kulüp kategorilerini seçin';
      default:
        return 'Değeri girin';
    }
  };

  const isSelectableField = () => {
    return ['university', 'department', 'classLevel', 'clubType', 'categories'].includes(field);
  };

  const getListData = () => {
    switch (field) {
      case 'university':
        return UNIVERSITIES_DATA;
      case 'department':
        return DEPARTMENTS_DATA;
      case 'classLevel':
        return CLASS_LEVELS_DATA;
      case 'clubType':
        return CLUB_TYPES_DATA;
      case 'categories':
        return CLUB_TYPES_DATA;
      default:
        return [];
    }
  };

  const handleItemSelect = (item: any) => {
    // Label'ı değer olarak kullan (kullanıcı dostu görünüm için)
    setValue(item.label || item.value);
    setShowListSelection(false);
  };

  const renderListItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => handleItemSelect(item)}
    >
      <Text style={styles.listItemText}>{item.label}</Text>
    </TouchableOpacity>
  );

  const isMultiline = field === 'bio';

  // Reduce excessive logging - only log when modal opens with meaningful field
  useEffect(() => {
    if (visible && field) {
      console.log('🟢 ProfileEditModal opened:', { field, value });
    }
  }, [visible, field]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onDismiss} style={styles.cancelButton}>
            <Text style={styles.cancelText}>İptal</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>{label} Düzenle</Text>
          
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            disabled={loading}
          >
            <Text style={styles.saveText}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            
            {field === 'categories' ? (
              // Çoklu kategori seçimi
              <View style={styles.categoriesContainer}>
                <ScrollView style={styles.categoriesScrollView} showsVerticalScrollIndicator={false}>
                  {CLUB_TYPES_DATA.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryItem,
                        selectedCategories.includes(category.id) && styles.selectedCategoryItem
                      ]}
                      onPress={() => {
                        if (selectedCategories.includes(category.id)) {
                          setSelectedCategories(prev => prev.filter(id => id !== category.id));
                        } else {
                          setSelectedCategories(prev => [...prev, category.id]);
                        }
                      }}
                    >
                      <View style={styles.categoryContent}>
                        <Text style={[
                          styles.categoryLabel,
                          selectedCategories.includes(category.id) && styles.selectedCategoryLabel
                        ]}>
                          {category.name}
                        </Text>
                        {selectedCategories.includes(category.id) && (
                          <MaterialCommunityIcons 
                            name="check" 
                            size={20} 
                            color="#fff" 
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.selectedCount}>
                  {selectedCategories.length} kategori seçildi
                </Text>
              </View>
            ) : isSelectableField() ? (
              // Seçilebilir alanlar için liste
              showListSelection ? (
                <View style={styles.listContainer}>
                  <FlatList
                    data={getListData()}
                    keyExtractor={(item, index) => item.value || index.toString()}
                    renderItem={renderListItem}
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                  />
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setShowListSelection(false)}
                  >
                    <Text style={styles.backButtonText}>Geri</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.input, styles.selectableInput]}
                  onPress={() => setShowListSelection(true)}
                >
                  <Text style={[styles.inputText, !value && styles.placeholderText]}>
                    {value ? getDisplayValue(field, value) : getPlaceholder()}
                  </Text>
                </TouchableOpacity>
              )
            ) : (
              // Normal text input
              <TextInput
                style={[
                  styles.input,
                  isMultiline && styles.multilineInput,
                ]}
                value={typeof value === 'string' ? value : ''}
                onChangeText={setValue}
                placeholder={getPlaceholder()}
                placeholderTextColor="#999"
                multiline={isMultiline}
                numberOfLines={isMultiline ? 4 : 1}
                autoFocus={true}
                maxLength={field === 'bio' ? 500 : 100}
              />
            )}
            
            {field === 'bio' && typeof value === 'string' && (
              <Text style={styles.charCount}>
                {value.length}/500 karakter
              </Text>
            )}
          </View>
        </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '95%',
    height: '75%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cancelButton: {
    padding: 12,
  },
  cancelText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  saveButton: {
    padding: 12,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 20,
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 50,
  },
  multilineInput: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
    minHeight: 400,
  },
  list: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 350,
  },
  listItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  listItemText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  selectableInput: {
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  inputText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#999',
  },
  backButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  categoriesContainer: {
    flex: 1,
    paddingTop: 10,
  },
  categoriesScrollView: {
    flex: 1,
    maxHeight: 400,
  },
  categoryItem: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCategoryItem: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedCategoryLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  selectedCount: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginTop: 15,
    fontWeight: '500',
  },
});

export default ProfileEditModal;
