import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Portal, Surface, Text, Button, IconButton, useTheme } from 'react-native-paper';
import AdminControlService, { AdminBannerConfig } from '../../services/adminControlService';

const DISMISS_STORAGE_KEY = 'admin_banner_last_dismissed_id';

const GlobalAdminBanner: React.FC = () => {
  const theme = useTheme();
  const [banner, setBanner] = useState<AdminBannerConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_STORAGE_KEY).then((value) => setDismissedId(value));
    const unsubscribe = AdminControlService.subscribeToBanner((config) => {
      setBanner(config);
      setReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (banner && banner.enabled) {
      if (!banner.persistent && banner.bannerId && banner.bannerId === dismissedId) {
        setVisible(false);
        return;
      }
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [banner, dismissedId, ready]);

  if (!visible || !banner) {
    return null;
  }

  const handleDismiss = async () => {
    if (banner.bannerId && !banner.persistent) {
      await AsyncStorage.setItem(DISMISS_STORAGE_KEY, banner.bannerId);
      setDismissedId(banner.bannerId);
    }
    setVisible(false);
  };

  const handleAction = () => {
    if (banner.ctaUrl && /^https?:\/\//i.test(banner.ctaUrl)) {
      Linking.openURL(banner.ctaUrl).catch((error) => console.warn('⚠️ Banner link açılamadı:', error));
    } else {
      console.warn('⚠️ Geçersiz banner linki engellendi');
    }
  };

  return (
    <Portal>
      <Surface style={[styles.banner, { borderColor: theme.colors.primary }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{banner.title}</Text>
          {!banner.persistent && (
            <IconButton icon="close" size={20} onPress={handleDismiss} accessibilityLabel="Bannerı kapat" />
          )}
        </View>
        <Text style={styles.message}>{banner.message}</Text>
        {banner.ctaLabel && banner.ctaUrl ? (
          <Button mode="contained" onPress={handleAction} style={styles.actionButton}>
            {banner.ctaLabel}
          </Button>
        ) : null}
        {banner.persistent && (
          <Text style={styles.persistentText}>Bu banner kalıcıdır ve kapatılamaz.</Text>
        )}
      </Surface>
    </Portal>
  );
};

const styles = StyleSheet.create({
  banner: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#fff',
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  message: {
    marginTop: 8,
    fontSize: 15,
    color: '#374151',
  },
  actionButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  persistentText: {
    marginTop: 8,
    fontSize: 12,
    color: '#B45309',
  },
});

export default GlobalAdminBanner;

