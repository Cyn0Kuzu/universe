import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Modal, Portal, Button } from 'react-native-paper';

interface ActivityModalProps {
  visible: boolean;
  onDismiss: () => void;
  activity?: any;
}

const ActivityModal: React.FC<ActivityModalProps> = ({ visible, onDismiss, activity }) => {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Aktivite Detayları</Text>
          {activity && (
            <View style={styles.activityInfo}>
              <Text style={styles.text}>Aktivite: {activity.type}</Text>
              <Text style={styles.text}>Tarih: {activity.date}</Text>
              <Text style={styles.text}>Puan: {activity.points}</Text>
            </View>
          )}
          <Button mode="contained" onPress={onDismiss} style={styles.button}>
            Kapat
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  activityInfo: {
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 5,
  },
  button: {
    marginTop: 10,
  },
});

export default ActivityModal;











