import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { firestore } from '../firebase/config';
import firebase from 'firebase/compat/app';

interface JoinClubModalProps {
  visible: boolean;
  onClose: () => void;
  club: {
    id: string;
    name: string;
    description?: string;
    memberCount?: number;
  };
  onJoinSuccess?: () => void;
}

export const JoinClubModal: React.FC<JoinClubModalProps> = ({
  visible,
  onClose,
  club,
  onJoinSuccess,
}) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    if (!currentUser?.uid) {
      Alert.alert('Hata', 'Giriş yapmanız gerekiyor.');
      return;
    }

    if (!club?.id) {
      Alert.alert('Hata', 'Kulüp bilgisi eksik.');
      return;
    }

    setIsLoading(true);

    try {
      // Check if already a member
      const memberDoc = await firestore
        .collection('clubs')
        .doc(club.id)
        .collection('members')
        .doc(currentUser.uid)
        .get();

      if (memberDoc.exists) {
        Alert.alert('Bilgi', 'Zaten bu kulübün üyesisiniz.');
        setIsLoading(false);
        onClose();
        return;
      }

      // Join the club
      await firestore
        .collection('clubs')
        .doc(club.id)
        .collection('members')
        .doc(currentUser.uid)
        .set({
          userId: currentUser.uid,
          joinedAt: firebase.firestore.Timestamp.now(),
          status: 'active',
        });

      // Update club member count
      await firestore
        .collection('clubs')
        .doc(club.id)
        .update({
          memberCount: firebase.firestore.FieldValue.increment(1),
        });

      Alert.alert(
        'Başarılı! 🎉',
        `${club.name} kulübüne katıldınız!`,
        [
          {
            text: 'Tamam',
            onPress: () => {
              onClose();
              onJoinSuccess?.();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error joining club:', error);
      Alert.alert('Hata', 'Kulübe katılırken bir sorun oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Kulübe Katıl</Text>
          
          <Text style={styles.clubName}>{club.name}</Text>
          
          {club.description && (
            <Text style={styles.description}>{club.description}</Text>
          )}
          
          <Text style={styles.memberInfo}>
            👥 {club.memberCount || 0} üye
          </Text>

          <Text style={styles.scoringInfo}>
            🎯 Enhanced Scoring System v3.0 ile puan kazanın!
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.joinButton]}
              onPress={handleJoin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.joinButtonText}>Katıl</Text>
              )}
            </TouchableOpacity>
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
  modal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  clubName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2196F3',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
    lineHeight: 20,
  },
  memberInfo: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    color: '#666',
  },
  scoringInfo: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    color: '#4CAF50',
    fontWeight: '500',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: '#2196F3',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});