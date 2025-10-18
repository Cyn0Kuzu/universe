import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Text, Card, Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UniversalAvatar } from './UniversalAvatar';
import { User } from '../../types';
import { clubDataSyncService } from '../../services/clubDataSyncService';

const { width } = Dimensions.get('window');

interface EnhancedSearchResultCardProps {
  user: User;
  onPress: (userId: string) => void;
  searchQuery?: string;
}

export const EnhancedSearchResultCard: React.FC<EnhancedSearchResultCardProps> = ({
  user,
  onPress,
  searchQuery = ''
}) => {
  const theme = useTheme();

  const getDisplayName = () => {
    if (user.userType === 'club') {
      return clubDataSyncService.getClubDisplayName(user);
    }
    return user.displayName || 
           `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
           user.name || 
           'İsimsiz Kullanıcı';
  };

  const getUsername = () => {
    if (user.userName) {
      return `@${user.userName}`;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return '';
  };

  const getUniversityInfo = () => {
    const parts = [];
    if (user.university) {
      parts.push(user.university);
    }
    if (user.department) {
      parts.push(user.department);
    }
    return parts.join(' • ');
  };

  const highlightSearchTerm = (text: string, query: string) => {
    if (!query.trim()) {
      return text;
    }
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <Text key={index} style={styles.highlightedText}>
            {part}
          </Text>
        );
      }
      return part;
    });
  };

  return (
    <Card 
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      elevation={2}
    >
      <TouchableOpacity 
        style={styles.container}
        onPress={() => {
          console.log('🎯 EnhancedSearchResultCard pressed for user:', {
            id: user.id,
            displayName: user.displayName,
            name: user.name,
            userType: user.userType
          });
          console.log('🎯 onPress function:', onPress);
          console.log('🎯 Calling onPress with userId:', user.id);
          if (user.id) {
            onPress(user.id);
          } else {
            console.error('❌ User ID is undefined or null');
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <UniversalAvatar
            user={user}
            size={60}
            style={styles.avatar}
          />
          {user.userType === 'club' && (
            <View style={[styles.userTypeBadge, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="account-group" size={12} color="white" />
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.displayName, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {highlightSearchTerm(getDisplayName(), searchQuery)}
            </Text>
            {user.userType === 'club' && (
              <Chip 
                mode="outlined" 
                style={styles.clubChip}
                textStyle={styles.clubChipText}
              >
                Kulüp
              </Chip>
            )}
          </View>

          {getUsername() && (
            <Text style={[styles.username, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {highlightSearchTerm(getUsername(), searchQuery)}
            </Text>
          )}

          {getUniversityInfo() && (
            <Text style={[styles.universityInfo, { color: theme.colors.onSurface }]} numberOfLines={2}>
              {highlightSearchTerm(getUniversityInfo(), searchQuery)}
            </Text>
          )}

          {user.bio && (
            <Text style={[styles.bio, { color: theme.colors.onSurface }]} numberOfLines={2}>
              {user.bio}
            </Text>
          )}

          <View style={styles.footer}>
            {user.classLevel && (
              <Chip 
                mode="outlined" 
                style={styles.classChip}
                textStyle={styles.classChipText}
              >
                {user.classLevel}
              </Chip>
            )}
            
            {(user as any).followerCount && (user as any).followerCount > 0 && (
              <View style={styles.statsContainer}>
                <MaterialCommunityIcons 
                  name="account-group" 
                  size={14} 
                  color={theme.colors.onSurface} 
                />
                <Text style={[styles.statsText, { color: theme.colors.onSurface }]}>
                  {(user as any).followerCount} takipçi
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionContainer}>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={24} 
            color={theme.colors.onSurface} 
          />
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    borderRadius: 30,
  },
  userTypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  clubChip: {
    marginLeft: 8,
    height: 24,
  },
  clubChipText: {
    fontSize: 10,
  },
  username: {
    fontSize: 14,
    marginBottom: 2,
  },
  universityInfo: {
    fontSize: 13,
    marginBottom: 4,
  },
  bio: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  classChip: {
    height: 24,
  },
  classChipText: {
    fontSize: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    marginLeft: 4,
  },
  actionContainer: {
    marginLeft: 8,
  },
  highlightedText: {
    backgroundColor: '#FFE082',
    fontWeight: 'bold',
  },
});

export default EnhancedSearchResultCard;
