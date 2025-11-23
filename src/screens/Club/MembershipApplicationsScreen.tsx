import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Text,
  useTheme,
  Button,
  Avatar,
  Card,
  ActivityIndicator,
  Surface,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { useAuth } from '../../contexts/AuthContext';
import { ClubStatsService } from '../../services/clubStatsService';
import { approveMembershipRequest, rejectMembershipRequest } from '../../firebase/membership';
import { UNIVERSITIES_DATA } from '../../constants';
import moment from 'moment';
import 'moment/locale/tr';
import { UniversalAvatar } from '../../components/common';
import { clubActivityService } from '../../services/enhancedClubActivityService';

const firebase = getFirebaseCompatSync();
moment.locale('tr');

// Status'a göre renk döndür
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return '#FF9800';
    case 'approved': return '#4CAF50';
    case 'rejected': return '#F44336';
    default: return '#757575';
  }
};

// Status'a göre metin döndür
const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'Bekliyor';
    case 'approved': return 'Onaylandı';
    case 'rejected': return 'Reddedildi';
    default: return 'Bilinmiyor';
  }
};

interface MembershipRequest {
  id: string;
  userId: string;
  clubId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: any;
  message?: string;
  userInfo?: {
    displayName: string;
    email: string;
    profileImage?: string;
    university?: string;
    department?: string;
    classLevel?: string;
  };
}

const MembershipApplicationsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState<MembershipRequest[]>([]);
  const [clubData, setClubData] = useState<any>(null);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  // Kulüp bilgilerini ve başvuruları getir
  const fetchApplications = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const db = getFirebaseCompatSync().firestore();
      
      // Kulüp bilgilerini getir
      const clubSnapshot = await db
        .collection('clubs')
        .where('leaderId', '==', currentUser.uid)
        .limit(1)
        .get();
      
      if (clubSnapshot.empty) {
        Alert.alert('Hata', 'Kulüp bulunamadı.');
        navigation.goBack();
        return;
      }
      
      const clubDoc = clubSnapshot.docs[0];
      const clubInfo = { id: clubDoc.id, ...clubDoc.data() };
      setClubData(clubInfo);
      
      // Başvuruları getir
      console.log('Fetching applications for clubId:', clubInfo.id);
      const applicationsSnapshot = await db
        .collection('membershipRequests')
        .where('clubId', '==', clubInfo.id)
        .orderBy('requestDate', 'desc')
        .get();
      
      console.log('Applications found:', applicationsSnapshot.docs.length);
      
      const applicationsData = applicationsSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Application data:', { id: doc.id, status: data.status, userId: data.userId });
        return {
          id: doc.id,
          ...data
        };
      }) as MembershipRequest[];
      
      console.log('Total applications loaded:', applicationsData.length);
      setApplications(applicationsData);
    } catch (error) {
      console.error('Başvurular getirilemedi:', error);
      Alert.alert('Hata', 'Başvurular yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchApplications();
    }, [fetchApplications])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplications();
  }, [fetchApplications]);

  // Başvuruyu onaylama
  const approveApplication = async (applicationId: string, userId: string) => {
    if (!clubData || !currentUser) return;
    
    setProcessingRequests(prev => new Set(prev).add(applicationId));
    
    try {
      console.log('Approving membership request:', applicationId);
      
      // Yeni membership.ts dosyasındaki approveMembershipRequest fonksiyonunu kullan
      const result = await approveMembershipRequest(
        applicationId,
        clubData.id,
        currentUser.uid
      );
      
      if (result.success) {
        // Local state'i güncelle
        setApplications(prev => 
          prev.map(app => 
            app.id === applicationId 
              ? { ...app, status: 'approved' as const }
              : app
          )
        );
        
        Alert.alert('Başarılı', 'Üyelik başvurusu onaylandı.');
        
        // Kulüp verilerini yenile
        await fetchApplications();
      } else {
        Alert.alert('Hata', result.error || 'Başvuru onaylanırken bir sorun oluştu.');
      }
      
    } catch (error) {
      console.error('Başvuru onaylanırken hata:', error);
      Alert.alert('Hata', 'Başvuru onaylanırken bir sorun oluştu.');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(applicationId);
        return newSet;
      });
    }
  };

  // Başvuruyu reddetme
  const rejectApplication = async (applicationId: string, userId: string) => {
    if (!clubData || !currentUser) return;
    
    Alert.alert(
      'Başvuruyu Reddet',
      'Bu başvuruyu reddetmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            setProcessingRequests(prev => new Set(prev).add(applicationId));
            
            try {
              console.log('Rejecting membership request:', applicationId);
              
              // Yeni membership.ts dosyasındaki rejectMembershipRequest fonksiyonunu kullan
              const result = await rejectMembershipRequest(
                applicationId,
                currentUser.uid,
                'Kulüp yöneticisi tarafından reddedildi'
              );
              
              if (result.success) {
                // Local state'i güncelle
                setApplications(prev => 
                  prev.map(app => 
                    app.id === applicationId 
                      ? { ...app, status: 'rejected' as const }
                      : app
                  )
                );
                
                Alert.alert('Başarılı', 'Üyelik başvurusu reddedildi.');
                
                // Kulüp verilerini yenile
                await fetchApplications();
              } else {
                Alert.alert('Hata', result.error || 'Başvuru reddedilirken bir sorun oluştu.');
              }
              
            } catch (error) {
              console.error('Başvuru reddedilirken hata:', error);
              Alert.alert('Hata', 'Başvuru reddedilirken bir sorun oluştu.');
            } finally {
              setProcessingRequests(prev => {
                const newSet = new Set(prev);
                newSet.delete(applicationId);
                return newSet;
              });
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Başvurular yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const processedApplications = applications.filter(app => app.status !== 'pending');

  console.log('Render - Total applications:', applications.length);
  console.log('Render - Pending applications:', pendingApplications.length);
  console.log('Render - Processed applications:', processedApplications.length);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Üyelik Başvuruları</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Debug Info */}
        <View style={{ padding: 16, backgroundColor: '#f0f0f0', margin: 16, borderRadius: 8 }}>
          <Text>Debug: Total applications: {applications.length}</Text>
          <Text>Debug: Pending: {pendingApplications.length}</Text>
          <Text>Debug: Processed: {processedApplications.length}</Text>
        </View>
        
        {/* Bekleyen Başvurular */}
        {pendingApplications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#FF9800" />
              <Text style={styles.sectionTitle}>Bekleyen Başvurular ({pendingApplications.length})</Text>
            </View>
            
            {pendingApplications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onApprove={() => approveApplication(application.id, application.userId)}
                onReject={() => rejectApplication(application.id, application.userId)}
                isProcessing={processingRequests.has(application.id)}
              />
            ))}
          </View>
        )}

        {/* İşlenmiş Başvurular */}
        {processedApplications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Geçmiş Başvurular ({processedApplications.length})</Text>
            </View>
            
            {processedApplications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                isProcessed={true}
              />
            ))}
          </View>
        )}

        {applications.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>Henüz başvuru bulunmuyor</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

interface ApplicationCardProps {
  application: MembershipRequest;
  onApprove?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
  isProcessed?: boolean;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onApprove,
  onReject,
  isProcessing = false,
  isProcessed = false,
}) => {
  const theme = useTheme();
  const userInfo = application.userInfo;
  
  const getUniversityName = (universityCode?: string) => {
    if (!universityCode) return 'Üniversite belirtilmemiş';
    const university = UNIVERSITIES_DATA.find(u => u.value === universityCode);
    return university ? university.label : universityCode;
  };

  return (
    <Surface style={styles.applicationCard}>
      <View style={styles.applicationHeader}>
        <UniversalAvatar
          userId={application.userId}
          userName={userInfo?.displayName}
          profileImage={userInfo?.profileImage}
          size={50}
          fallbackIcon="account"
        />
        
        <View style={styles.applicationInfo}>
          <Text style={styles.applicantName}>
            {userInfo?.displayName || 'İsimsiz Kullanıcı'}
          </Text>
          <Text style={styles.applicantEmail}>{userInfo?.email}</Text>
          <Text style={styles.applicantUniversity}>
            {getUniversityName(userInfo?.university)}
          </Text>
          {userInfo?.department && (
            <Text style={styles.applicantDepartment}>{userInfo.department}</Text>
          )}
        </View>
        
        <View style={styles.applicationStatus}>
          <Chip 
            mode="outlined"
            style={{ 
              backgroundColor: isProcessed ? 'transparent' : '#FFF3E0',
              borderColor: getStatusColor(application.status)
            }}
            textStyle={{ 
              color: getStatusColor(application.status),
              fontSize: 12 
            }}
          >
            {getStatusText(application.status)}
          </Chip>
        </View>
      </View>

      <View style={styles.applicationDetails}>
        <Text style={styles.requestDate}>
          {moment(application.requestDate?.toDate()).format('DD MMMM YYYY, HH:mm')}
        </Text>
        
        {application.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Mesaj:</Text>
            <Text style={styles.messageText}>{application.message}</Text>
          </View>
        )}
      </View>

      {!isProcessed && application.status === 'pending' && (
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            icon="close"
            onPress={onReject}
            disabled={isProcessing}
            style={[styles.actionButton, styles.rejectButton]}
            labelStyle={{ color: '#F44336' }}
          >
            Reddet
          </Button>
          
          <Button
            mode="contained"
            icon="check"
            onPress={onApprove}
            loading={isProcessing}
            disabled={isProcessing}
            style={[styles.actionButton, styles.approveButton]}
          >
            Onayla
          </Button>
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  applicationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  applicationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  applicationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  applicantEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  applicantUniversity: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  applicantDepartment: {
    fontSize: 13,
    color: '#888',
  },
  applicationStatus: {
    marginLeft: 8,
  },
  applicationDetails: {
    marginBottom: 16,
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  messageContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  rejectButton: {
    borderColor: '#F44336',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default MembershipApplicationsScreen;
