import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Avatar, Button, Modal, Portal, useTheme, Divider, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { firebase } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { UniversalAvatar } from './common';
import { ClubNotificationService } from '../services/clubNotificationService';
import { userActivityService } from '../services/enhancedUserActivityService';
import { NotificationManagement } from '../firebase/notificationManagement';
import { useUserAvatar } from '../hooks/useUserAvatar';

interface User {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  profileImage?: string;
  university?: string;
  department?: string;
  bio?: string;
  classLevel?: string;
  userType?: string;
  followerCount?: number;
  followingCount?: number;
  eventCount?: number;
  attendedEvents?: string[];
}

interface UserProfileModalProps {
  visible: boolean;
  onDismiss: () => void;
  userId: string;
  onViewProfile?: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  visible,
  onDismiss,
  userId,
  onViewProfile
}) => {
  const theme = useTheme();
  const { currentUser, isClubAccount } = useAuth();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Live profile data for real-time updates
  const { avatarData } = useUserAvatar(userId);
  const liveName = avatarData?.displayName || user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'İsimsiz Kullanıcı';
  const liveProfileImage = avatarData?.profileImage || user?.profileImage;
  const liveUniversity = avatarData?.university || user?.university;
  const liveDepartment = avatarData?.department || user?.department;

  useEffect(() => {
    if (visible && userId) {
      fetchUserData();
    }
  }, [visible, userId]);

  const fetchUserData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const db = firebase.firestore();
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        setUser({
          id: userId,
          name: userData?.name,
          firstName: userData?.firstName,
          lastName: userData?.lastName,
          displayName: userData?.displayName,
          email: userData?.email,
          profileImage: userData?.profileImage || userData?.photoURL,
          university: userData?.university,
          department: userData?.department,
          bio: userData?.bio,
          classLevel: userData?.classLevel,
          userType: userData?.userType,
          followerCount: userData?.followerCount || 0,
          followingCount: userData?.followingCount || 0,
          eventCount: userData?.eventCount || 0,
          attendedEvents: userData?.attendedEvents || []
        });
        
        // Check if current user follows this user
        if (currentUser?.uid) {
          const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
          const currentUserData = currentUserDoc.data();
          const following = currentUserData?.following || [];
          setIsFollowing(following.includes(userId));
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser?.uid || !userId || followLoading || isClubAccount) return;
    
    setFollowLoading(true);
    try {
      const db = firebase.firestore();
      const batch = db.batch();
      
      const currentUserRef = db.collection('users').doc(currentUser.uid);
      const targetUserRef = db.collection('users').doc(userId);
      
      if (isFollowing) {
        // Unfollow
        batch.update(currentUserRef, {
          following: firebase.firestore.FieldValue.arrayRemove(userId),
          followingCount: firebase.firestore.FieldValue.increment(-1)
        });
        batch.update(targetUserRef, {
          followers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid),
          followerCount: firebase.firestore.FieldValue.increment(-1)
        });

        // Log user unfollow activity
        try {
          await userActivityService.logUserUnfollow(
            currentUser.uid,
            currentUser.displayName || 'Bilinmeyen Kullanıcı',
            userId,
            user?.displayName || user?.firstName || 'Bilinmeyen Kullanıcı'
          );
        } catch (error: any) {
          console.warn('User unfollow activity logging failed:', error);
        }
      } else {
        // Follow
        batch.update(currentUserRef, {
          following: firebase.firestore.FieldValue.arrayUnion(userId),
          followingCount: firebase.firestore.FieldValue.increment(1)
        });
        batch.update(targetUserRef, {
          followers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
          followerCount: firebase.firestore.FieldValue.increment(1)
        });
        
        // Send follow notification to target user
        try {
          const FirebaseFunctionsService = require('../services/firebaseFunctionsService').default;
          const currentUserName = currentUser.displayName || currentUser.email || 'Anonim Kullanıcı';
          
          await FirebaseFunctionsService.sendFollowNotification(
            currentUser.uid,
            userId,
            currentUserName
          );
          console.log('✅ Follow notification sent to:', userId);
        } catch (error: any) {
          console.warn('Follow notification failed:', error);
        }

        // Log user activity
        try {
          await userActivityService.logUserFollow(
            currentUser.uid,
            currentUser.displayName || 'Bilinmeyen Kullanıcı',
            userId,
            user?.displayName || user?.firstName || 'Bilinmeyen Kullanıcı'
          );
        } catch (error: any) {
          console.warn('User activity logging failed:', error);
        }
      }
      
      await batch.commit();
      setIsFollowing(!isFollowing);
      
      // Update local follower count
      if (user) {
        setUser({
          ...user,
          followerCount: (user.followerCount || 0) + (isFollowing ? -1 : 1)
        });
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleViewFullProfile = () => {
    onDismiss();
    if (onViewProfile) {
      onViewProfile();
    }
  };

  if (!user && !loading) {
    return null;
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Kullanıcı bilgileri yükleniyor...</Text>
          </View>
        ) : user ? (
          <ScrollView 
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Kullanıcı Profili</Text>
            </View>

            {/* Profile Section */}
            <View style={styles.profileSection}>
              <UniversalAvatar 
                user={{
                  id: user.id,
                  name: liveName,
                  profileImage: liveProfileImage,
                  avatarIcon: (user as any).avatarIcon,
                  avatarColor: (user as any).avatarColor
                }}
                size={80}
                style={styles.profileImage}
                fallbackIcon="account"
              />
              
              <Text style={styles.userName}>
                {liveName}
              </Text>
              
              {liveUniversity && (
                <Text style={styles.university}>{liveUniversity}</Text>
              )}
              
              {liveDepartment && (
                <Text style={styles.department}>{liveDepartment}</Text>
              )}
              
              {user.classLevel && (
                <Chip style={styles.classChip} textStyle={styles.classChipText}>
                  {user.classLevel}
                </Chip>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{user.followerCount || 0}</Text>
                <Text style={styles.statLabel}>Takipçi</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{user.followingCount || 0}</Text>
                <Text style={styles.statLabel}>Takip Edilen</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{user.attendedEvents?.length || 0}</Text>
                <Text style={styles.statLabel}>Etkinlik</Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Bio */}
            <View style={styles.bioSection}>
              <Text style={styles.sectionTitle}>Profil Bilgileri</Text>
              
              {/* Compact Info Grid */}
              <View style={styles.infoGrid}>
                {user.email && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="email" size={18} color="#666" />
                    <Text style={styles.infoText} numberOfLines={1}>{user.email}</Text>
                  </View>
                )}
                
                {user.university && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="school" size={18} color="#666" />
                    <Text style={styles.infoText} numberOfLines={1}>{user.university}</Text>
                  </View>
                )}
                
                {user.department && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="book-education" size={18} color="#666" />
                    <Text style={styles.infoText} numberOfLines={1}>{user.department}</Text>
                  </View>
                )}
                
                {user.classLevel && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="account-child" size={18} color="#666" />
                    <Text style={styles.infoText} numberOfLines={1}>{user.classLevel}</Text>
                  </View>
                )}
                
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="account-circle" size={18} color="#666" />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {user.userType === 'student' ? 'Öğrenci' : user.userType === 'club' ? 'Kulüp' : 'Kullanıcı'}
                  </Text>
                </View>
                
                {user.bio && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="information" size={18} color="#666" />
                    <Text style={styles.infoText} numberOfLines={2}>{user.bio}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {currentUser?.uid !== userId && !isClubAccount && (
                <Button
                  mode={isFollowing ? "outlined" : "contained"}
                  onPress={handleFollow}
                  loading={followLoading}
                  style={styles.followButton}
                  labelStyle={styles.buttonLabel}
                >
                  {isFollowing ? 'Takibi Bırak' : 'Takip Et'}
                </Button>
              )}
              
              <Button
                mode="outlined"
                onPress={handleViewFullProfile}
                style={styles.viewProfileButton}
                labelStyle={styles.buttonLabel}
              >
                Profili Görüntüle
              </Button>
            </View>
          </ScrollView>
        ) : null}
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 16,
    borderRadius: 12,
    padding: 0,
    maxHeight: '85%',
    minHeight: '70%',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: '#1E88E5',
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  university: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  department: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  classChip: {
    backgroundColor: '#E3F2FD',
  },
  classChipText: {
    color: '#1976D2',
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    marginHorizontal: 20,
  },
  bioSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  followButton: {
    borderRadius: 8,
  },
  viewProfileButton: {
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  infoGrid: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});

export default UserProfileModal;