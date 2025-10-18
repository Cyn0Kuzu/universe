// Image Zoom Modal Component
import React, { useState } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ImageZoomModalProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  title?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  visible,
  imageUri,
  onClose,
  title
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent={true}
      >
        <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
        
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            {title && (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            )}
            <View style={styles.placeholder} />
          </View>

          {/* Image Container */}
          <View style={styles.imageContainer}>
            {imageLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Resim yükleniyor...</Text>
              </View>
            )}

            {imageError ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="image-broken" size={64} color="#666" />
                <Text style={styles.errorText}>Resim yüklenemedi</Text>
                <Text style={styles.errorSubText}>Lütfen internet bağlantınızı kontrol edin</Text>
              </View>
            ) : (
              <Image
                source={{ uri: imageUri }}
                style={styles.zoomImage}
                resizeMode="contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.actionButton} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
              <Text style={styles.actionText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 40,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  zoomImage: {
    width: screenWidth - 40,
    height: screenHeight * 0.7,
    maxWidth: '100%',
    maxHeight: '100%',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubText: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  actionText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ImageZoomModal;