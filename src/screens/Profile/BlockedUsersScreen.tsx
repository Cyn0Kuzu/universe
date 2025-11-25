import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { UniversalAvatar } from '../../components/common';
import { userBlockService } from '../../services/userBlockService';

interface BlockedUser {
  id: string;
  displayName?: string;
  username?: string;
  email?: string;
  profileImage?: string;
  avatarIcon?: string;
  avatarColor?: string;
  university?: string;
}

const chunkArray = <T,>(items: T[], size: number) => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

const BlockedUsersScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockLoading, setUnblockLoading] = useState<string | null>(null);

  const blockedIds = useMemo(() => {
    return Array.isArray(userProfile?.blockedUsers) ? userProfile!.blockedUsers : [];
  }, [userProfile?.blockedUsers]);

  const fetchBlockedUsers = useCallback(async () => {
    if (!currentUser?.uid) {
      setBlockedUsers([]);
      setLoading(false);
      return;
    }

    if (blockedIds.length === 0) {
      setBlockedUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const firebase = getFirebaseCompatSync();
      const db = firebase.firestore();
      const batches = chunkArray(blockedIds, 10);
      const snapshots = await Promise.all(
        batches.map((batch) =>
          db
            .collection('users')
            .where((firebase.firestore as any).FieldPath.documentId(), 'in', batch)
            .get()
        )
      );

      const users: BlockedUser[] = [];
      snapshots.forEach((snap) => {
        snap.forEach((doc) => {
          const data = doc.data() || {};
          users.push({
            id: doc.id,
            displayName: data.displayName || data.name,
            username: data.username,
            email: data.email,
            profileImage: data.profileImage || data.photoURL,
            avatarIcon: data.avatarIcon,
            avatarColor: data.avatarColor,
            university: data.university,
          });
        });
      });

      // Preserve the original order
      const sortedUsers = blockedIds
        .map((id) => users.find((user) => user.id === id))
        .filter((user): user is BlockedUser => Boolean(user));

      setBlockedUsers(sortedUsers);
    } catch (error) {
      console.error('❌ Failed to load blocked users:', error);
      setBlockedUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [blockedIds, currentUser?.uid]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(
      'Engeli Kaldır',
      `${user.displayName || user.username || 'Bu kullanıcı'} engelini kaldırmak istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Engeli Kaldır',
          style: 'destructive',
          onPress: async () => {
            if (!user.id) return;
            try {
              setUnblockLoading(user.id);
              await userBlockService.unblockUser(user.id);
              await refreshUserProfile();
              setBlockedUsers((prev) => prev.filter((item) => item.id !== user.id));
            } catch (error) {
              console.error('❌ Failed to unblock user:', error);
              Alert.alert('Hata', 'Engel kaldırılırken bir sorun oluştu.');
            } finally {
              setUnblockLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBlockedUsers();
  };

  const emptyState = (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="shield-check-outline" size={56} color="#cbd5f5" />
      <Text style={styles.emptyTitle}>Engellenmiş kullanıcı yok</Text>
      <Text style={styles.emptyText}>
        Engellediğiniz kullanıcılar burada listelenir. Bir kullanıcıyı engellediğinizde içeriklerini görmezsiniz.
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userRow}>
      <View style={styles.userInfo}>
        <UniversalAvatar user={item} size={48} />
        <View style={styles.userMeta}>
          <Text style={styles.userName}>{item.displayName || 'İsimsiz Kullanıcı'}</Text>
          {item.username && <Text style={styles.userHandle}>@{item.username}</Text>}
          {item.university && <Text style={styles.userUniversity}>{item.university}</Text>}
        </View>
      </View>
      <Button
        mode="outlined"
        onPress={() => handleUnblock(item)}
        loading={unblockLoading === item.id}
        disabled={unblockLoading === item.id}
        style={styles.unblockButton}
        labelStyle={styles.unblockButtonLabel}
      >
        Engeli Kaldır
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Button
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          mode="text"
          labelStyle={styles.backButtonLabel}
        >
          Geri
        </Button>
        <Text style={styles.headerTitle}>Engellediklerim</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Engelli kullanıcılar yükleniyor...</Text>
        </View>
      ) : blockedUsers.length === 0 ? (
        emptyState
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButtonLabel: {
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerPlaceholder: {
    width: 64,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userMeta: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userHandle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  userUniversity: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  unblockButton: {
    borderRadius: 20,
    borderColor: '#ef4444',
    marginLeft: 12,
  },
  unblockButtonLabel: {
    color: '#ef4444',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
});

export default BlockedUsersScreen;

