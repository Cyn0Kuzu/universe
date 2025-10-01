// FollowerItem Component - Global state ile senkronize takip butonları
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UniversalAvatar } from './common';
import useGlobalFollowState from '../hooks/useGlobalFollowState';
import { useUserAvatar } from '../hooks/useUserAvatar';

interface FollowerItemProps {
  item: {
    id: string;
    name?: string;
    displayName?: string;
    email?: string;
    profileImage?: string;
    avatarIcon?: string;
    avatarColor?: string;
    university?: string;
    department?: string;
    bio?: string;
    userType?: 'student' | 'club';
  };
  currentUserId?: string;
  currentUserName?: string;
  isClubAccount: boolean;
  onViewProfile: (userId: string) => void;
  onRemoveFollower: (userId: string) => void;
  styles: any;
}

export const FollowerItem: React.FC<FollowerItemProps> = ({
  item,
  currentUserId,
  currentUserName,
  isClubAccount,
  onViewProfile,
  onRemoveFollower,
  styles
}) => {
  const {
    isFollowing,
    followUser,
    unfollowUser,
    loading
  } = useGlobalFollowState(currentUserId, item.id, currentUserName);

  // Live profile data for this user
  const { avatarData } = useUserAvatar(item.id);
  const liveName = avatarData?.displayName || item.displayName || item.name || 'İsimsiz Kullanıcı';
  const liveProfileImage = avatarData?.profileImage || item.profileImage;
  const liveUniversity = avatarData?.university || item.university;
  const liveDepartment = avatarData?.department || item.department;
  const liveUsername = avatarData?.userName || item.email?.split('@')[0] || liveName?.toLowerCase().replace(/\s/g, '') || 'kullanici';

  const getAvatarLabel = (user: any): string => {
    if (user.displayName && user.displayName.trim()) {
      return user.displayName.trim()[0].toUpperCase();
    }
    if (user.name && user.name.trim()) {
      return user.name.trim()[0].toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const handleToggleFollow = async () => {
    if (loading) return;
    
    if (isFollowing) {
      await unfollowUser();
    } else {
      await followUser();
    }
  };

  const handleRemove = () => {
    onRemoveFollower(item.id);
  };

  return (
    <View style={styles.followerItem}>
      <TouchableOpacity
        style={styles.followerInfo}
        onPress={() => onViewProfile(item.id)}
        activeOpacity={0.7}
      >
        <UniversalAvatar
          user={{
            ...item,
            name: liveName,
            profileImage: liveProfileImage
          }}
          size={50}
          style={styles.avatar}
        />

        <View style={styles.followerDetails}>
          <Text style={styles.followerName}>
            {liveName}
          </Text>
          <Text style={styles.followerUsername}>
            @{liveUsername}
          </Text>
          {(liveUniversity || liveDepartment) && (
            <Text style={styles.followerUniversity}>
              {liveUniversity}{liveDepartment ? `, ${liveDepartment}` : ''}
            </Text>
          )}
          {item.bio && (
            <Text
              style={styles.followerBio}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.bio}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {currentUserId && currentUserId !== item.id && !isClubAccount && (
        <View style={styles.buttonContainer}>
          <Button
            mode={isFollowing ? 'outlined' : 'contained'}
            style={styles.followButton}
            labelStyle={styles.followButtonLabel}
            onPress={handleToggleFollow}
            loading={loading}
            disabled={loading}
          >
            {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
          </Button>
          
          {/* Remove Follower X Button - always show for followers */}
          <TouchableOpacity
            style={styles.unfollowButton}
            onPress={handleRemove}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="close" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default FollowerItem;
