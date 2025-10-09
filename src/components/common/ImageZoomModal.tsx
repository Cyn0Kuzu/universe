/**
 * Image Zoom Modal Component
 * Fotoğrafları yakınlaştırma ve uzaklaştırma özelliği
 */

import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
  SafeAreaView,
  Text,
  Image,
} from 'react-native';
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ImageZoomModalProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  title?: string;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  visible,
  imageUri,
  onClose,
  title = 'Fotoğraf'
}) => {
  const theme = useTheme();
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  
  const scaleValue = useRef(new Animated.Value(1)).current;
  const translateXValue = useRef(new Animated.Value(0)).current;
  const translateYValue = useRef(new Animated.Value(0)).current;
  
  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);

  const resetImage = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    lastScale.current = 1;
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
    
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(translateXValue, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(translateYValue, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePinchGesture = (event: any) => {
    const newScale = Math.max(0.5, Math.min(3, lastScale.current * event.nativeEvent.scale));
    setScale(newScale);
    scaleValue.setValue(newScale);
  };

  const handlePinchGestureEnd = (event: any) => {
    lastScale.current = scale;
  };

  const handlePanGesture = (event: any) => {
    if (scale > 1) {
      const newTranslateX = lastTranslateX.current + event.nativeEvent.translationX;
      const newTranslateY = lastTranslateY.current + event.nativeEvent.translationY;
      
      // Limit panning to prevent image from going too far off screen
      const maxTranslateX = (screenWidth * (scale - 1)) / 2;
      const maxTranslateY = (screenHeight * (scale - 1)) / 2;
      
      setTranslateX(Math.max(-maxTranslateX, Math.min(maxTranslateX, newTranslateX)));
      setTranslateY(Math.max(-maxTranslateY, Math.min(maxTranslateY, newTranslateY)));
      
      translateXValue.setValue(translateX);
      translateYValue.setValue(translateY);
    }
  };

  const handlePanGestureEnd = (event: any) => {
    lastTranslateX.current = translateX;
    lastTranslateY.current = translateY;
  };

  const handleDoubleTap = () => {
    if (scale > 1) {
      resetImage();
    } else {
      const newScale = 2;
      setScale(newScale);
      lastScale.current = newScale;
      
      Animated.spring(scaleValue, {
        toValue: newScale,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleClose = () => {
    resetImage();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <MaterialCommunityIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons name="image" size={20} color="#FFF" />
            <Text style={styles.title}>{title}</Text>
          </View>
          <TouchableOpacity style={styles.resetButton} onPress={resetImage}>
            <MaterialCommunityIcons name="refresh" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Image Container */}
        <View style={styles.imageContainer}>
          <PinchGestureHandler
            onGestureEvent={handlePinchGesture}
            onHandlerStateChange={(event) => {
              if (event.nativeEvent.state === State.END) {
                handlePinchGestureEnd(event);
              }
            }}
          >
            <Animated.View>
              <PanGestureHandler
                onGestureEvent={handlePanGesture}
                onHandlerStateChange={(event) => {
                  if (event.nativeEvent.state === State.END) {
                    handlePanGestureEnd(event);
                  }
                }}
                minPointers={1}
                maxPointers={1}
              >
                <Animated.View
                  style={[
                    styles.imageWrapper,
                    {
                      transform: [
                        { scale: scaleValue },
                        { translateX: translateXValue },
                        { translateY: translateYValue },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleDoubleTap}
                    style={styles.imageTouchable}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.image}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </Animated.View>
              </PanGestureHandler>
            </Animated.View>
          </PinchGestureHandler>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => {
                const newScale = Math.max(0.5, scale - 0.5);
                setScale(newScale);
                lastScale.current = newScale;
                Animated.spring(scaleValue, {
                  toValue: newScale,
                  useNativeDriver: true,
                }).start();
              }}
            >
              <MaterialCommunityIcons name="minus" size={20} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.scaleIndicator}>
              <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>
            </View>
            
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => {
                const newScale = Math.min(3, scale + 0.5);
                setScale(newScale);
                lastScale.current = newScale;
                Animated.spring(scaleValue, {
                  toValue: newScale,
                  useNativeDriver: true,
                }).start();
              }}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              • Çift dokunarak yakınlaştır/uzaklaştır
            </Text>
            <Text style={styles.instructionText}>
              • İki parmakla yakınlaştır/uzaklaştır
            </Text>
            <Text style={styles.instructionText}>
              • Tek parmakla kaydır
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  closeButton: {
    padding: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resetButton: {
    padding: 8,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  controls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  scaleIndicator: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  scaleText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  instructions: {
    alignItems: 'center',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginVertical: 1,
  },
});

export default ImageZoomModal;
