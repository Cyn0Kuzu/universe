import React from 'react';
import FastImage, { FastImageProps, ResizeMode } from 'react-native-fast-image';
import { View, ActivityIndicator, StyleSheet, ImageProps } from 'react-native';

interface OptimizedImageProps extends Omit<FastImageProps, 'source'> {
  uri: string;
  fallbackSource?: any;
  showLoader?: boolean;
  loaderSize?: 'small' | 'large';
  loaderColor?: string;
  resizeMode?: ResizeMode;
  priority?: 'low' | 'normal' | 'high';
  cache?: 'immutable' | 'web' | 'cacheOnly';
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  uri,
  fallbackSource,
  showLoader = true,
  loaderSize = 'small',
  loaderColor = '#007AFF',
  resizeMode = FastImage.resizeMode.cover,
  priority = FastImage.priority.normal,
  cache = FastImage.cacheControl.immutable,
  style,
  ...props
}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const imageSource = React.useMemo(() => ({
    uri,
    priority,
    cache,
  }), [uri, priority, cache]);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <View style={[styles.container, style]}>
      <FastImage
        style={StyleSheet.absoluteFillObject}
        source={error && fallbackSource ? fallbackSource : imageSource}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...props}
      />
      {loading && showLoader && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator
            size={loaderSize}
            color={loaderColor}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default OptimizedImage;










