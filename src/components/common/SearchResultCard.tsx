import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { Text, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SearchResult } from '../../services/searchService';
import { UniversalAvatar } from './UniversalAvatar';
import moment from 'moment';
import 'moment/locale/tr';

const { width } = Dimensions.get('window');
moment.locale('tr');

interface SearchResultCardProps {
  result: SearchResult;
  onPress: () => void;
  style?: any;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({
  result,
  onPress,
  style
}) => {
  const theme = useTheme();

  const renderIcon = () => {
    switch (result.type) {
      case 'event':
        return (
          <MaterialCommunityIcons
            name="calendar"
            size={24}
            color={theme.colors.primary}
          />
        );
      case 'club':
        return (
          <MaterialCommunityIcons
            name="account-group"
            size={24}
            color="#FF6B35"
          />
        );
      case 'user':
        return (
          <MaterialCommunityIcons
            name="account"
            size={24}
            color="#4CAF50"
          />
        );
      default:
        return null;
    }
  };

  const renderTypeChip = () => {
    const typeMap = {
      event: 'Etkinlik',
      club: 'Kulüp',
      user: 'Kullanıcı'
    };

    const colorMap = {
      event: theme.colors.primary,
      club: "#FF6B35",
      user: '#4CAF50'
    };

    return (
      <Chip
        mode="outlined"
        style={[
          styles.typeChip,
          { borderColor: colorMap[result.type] }
        ]}
        textStyle={[
          styles.typeChipText,
          { color: colorMap[result.type] }
        ]}
      >
        {typeMap[result.type]}
      </Chip>
    );
  };

  const renderMetadata = () => {
    const metadata: string[] = [];

    if (result.type === 'event') {
      if (result.date) {
        metadata.push(moment(result.date).format('DD MMM YYYY'));
      }
      if (result.location) {
        metadata.push(result.location);
      }
      if (result.participantCount) {
        metadata.push(`${result.participantCount} katılımcı`);
      }
    } else if (result.type === 'club') {
      if (result.memberCount) {
        metadata.push(`${result.memberCount} üye`);
      }
      if (result.followerCount) {
        metadata.push(`${result.followerCount} takipçi`);
      }
    } else if (result.type === 'user') {
      if (result.followerCount) {
        metadata.push(`${result.followerCount} takipçi`);
      }
    }

    if (result.university) {
      metadata.push(result.university);
    }

    return metadata.join(' • ');
  };

  const renderImage = () => {
    if (result.imageUrl) {
      return (
        <Image
          source={{ uri: result.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      );
    } else if (result.avatarIcon && result.avatarColor) {
      return (
        <UniversalAvatar
          userId={result.id}
          userName={result.title}
          profileImage={result.imageUrl}
          avatarIcon={result.avatarIcon}
          avatarColor={result.avatarColor}
          size={60}
          style={styles.avatar}
        />
      );
    } else {
      return (
        <View style={[styles.placeholderImage, { backgroundColor: theme.colors.surface }]}>
          {renderIcon()}
        </View>
      );
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: theme.colors.surface,
          borderColor: '#E0E0E0'
        },
        style
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {renderImage()}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text
            style={[styles.title, { color: theme.colors.onSurface }]}
            numberOfLines={2}
          >
            {result.title}
          </Text>
          {result.isVerified && (
            <MaterialCommunityIcons
              name="check-decagram"
              size={16}
              color={theme.colors.primary}
              style={styles.verifiedIcon}
            />
          )}
        </View>

        {result.subtitle && (
          <Text
            style={[styles.subtitle, { color: theme.colors.onSurface + '80' }]}
            numberOfLines={1}
          >
            {result.subtitle}
          </Text>
        )}

        {result.description && (
          <Text
            style={[styles.description, { color: theme.colors.onSurface + '60' }]}
            numberOfLines={2}
          >
            {result.description}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.metadataContainer}>
            {renderTypeChip()}
            <Text
              style={[styles.metadata, { color: theme.colors.onSurface + '80' }]}
              numberOfLines={1}
            >
              {renderMetadata()}
            </Text>
          </View>

          {result.category && (
            <Chip
              mode="outlined"
              style={styles.categoryChip}
              textStyle={styles.categoryChipText}
            >
              {result.category}
            </Chip>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  imageContainer: {
    marginRight: 16,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  avatar: {
    width: 60,
    height: 60,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  verifiedIcon: {
    marginLeft: 8,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  metadataContainer: {
    flex: 1,
    marginRight: 8,
  },
  typeChip: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    height: 24,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metadata: {
    fontSize: 12,
  },
  categoryChip: {
    height: 28,
  },
  categoryChipText: {
    fontSize: 11,
  },
});

export default SearchResultCard;
