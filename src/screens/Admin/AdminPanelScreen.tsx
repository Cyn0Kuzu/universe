import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  TextInput,
  Button,
  Card as PaperCard,
  Switch,
  HelperText,
  useTheme,
  Divider,
  Snackbar,
} from 'react-native-paper';
import AdminControlService, { AdminBannerConfig } from '../../services/adminControlService';

const AdminPanelScreen: React.FC = () => {
  const theme = useTheme();

  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerCtaLabel, setBannerCtaLabel] = useState('');
  const [bannerCtaUrl, setBannerCtaUrl] = useState('');
  const [bannerPersistent, setBannerPersistent] = useState(false);
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [activeBannerId, setActiveBannerId] = useState<string | undefined>(undefined);

  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushCtaLabel, setPushCtaLabel] = useState('');
  const [pushCtaUrl, setPushCtaUrl] = useState('');
  const [pushLoading, setPushLoading] = useState(false);
  const [pushAudience, setPushAudience] = useState<'all' | 'students' | 'clubs'>('all');
  const [pushLocalOnly, setPushLocalOnly] = useState(false);

  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [credLoading, setCredLoading] = useState(false);

  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      const creds = await AdminControlService.getAdminCredentials();
      setAdminUsername(creds.username);
      setAdminPassword(creds.password);
      setAdminPasswordConfirm(creds.password);

      const bannerConfig = await AdminControlService.getBannerConfig();
      applyBannerConfig(bannerConfig);

      unsubscribe = AdminControlService.subscribeToBanner(applyBannerConfig);
    })();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const applyBannerConfig = (banner: AdminBannerConfig | null) => {
    if (banner) {
      setBannerTitle(banner.title || '');
      setBannerMessage(banner.message || '');
      setBannerCtaLabel(banner.ctaLabel || '');
      setBannerCtaUrl(banner.ctaUrl || '');
      setBannerPersistent(Boolean(banner.persistent));
      setBannerEnabled(Boolean(banner.enabled));
      setActiveBannerId(banner.bannerId);
    } else {
      setBannerEnabled(false);
    }
  };

  const showToast = (message: string) => setSnackbar({ visible: true, message });

  const isValidActionUrl = (value: string) => {
    if (!value.trim()) {
      return true;
    }
    return /^https?:\/\/.+/i.test(value.trim());
  };

  const handlePublishBanner = async () => {
    if (!bannerTitle.trim() || !bannerMessage.trim()) {
      showToast('Lütfen banner başlığı ve mesajını girin.');
      return;
    }

    if (bannerCtaUrl.trim() && !isValidActionUrl(bannerCtaUrl)) {
      showToast('Banner linki http:// veya https:// ile başlamalıdır.');
      return;
    }

    setBannerLoading(true);
    try {
      console.log('📢 Publishing banner:', { enabled: bannerEnabled, title: bannerTitle.trim() });
      await AdminControlService.publishBanner({
        enabled: bannerEnabled,
        title: bannerTitle.trim(),
        message: bannerMessage.trim(),
        ctaLabel: bannerCtaLabel.trim(),
        ctaUrl: bannerCtaUrl.trim(),
        persistent: bannerPersistent,
        bannerId: activeBannerId,
      });
      console.log('✅ Banner published successfully');
      showToast('Banner ayarları güncellendi ve tüm cihazlarda gösterilecek.');
    } catch (error: any) {
      console.error('❌ Banner publish error:', error);
      console.error('❌ Error details:', { message: error?.message, code: error?.code });
      showToast(`Banner güncellenemedi: ${error?.message || 'Bilinmeyen hata'}`);
    } finally {
      setBannerLoading(false);
    }
  };

  const handleClearBanner = async () => {
    setBannerLoading(true);
    try {
      await AdminControlService.clearBanner();
      showToast('Banner temizlendi.');
    } catch (error) {
      console.error('❌ Banner clear error:', error);
      showToast('Banner temizlenemedi.');
    } finally {
      setBannerLoading(false);
    }
  };

  const handleSendPush = async () => {
    if (!pushTitle.trim() || !pushMessage.trim()) {
      showToast('Push bildirimi için başlık ve mesaj gereklidir.');
      return;
    }

    if (pushCtaUrl.trim() && !isValidActionUrl(pushCtaUrl)) {
      showToast('Push linki http:// veya https:// ile başlamalıdır.');
      return;
    }

    setPushLoading(true);
    try {
      const deliveryMode = pushLocalOnly ? 'localOnly' : 'global';
      console.log('📱 Sending push notification:', { 
        title: pushTitle.trim(), 
        audience: pushAudience,
        deliveryMode 
      });
      
      await AdminControlService.sendPushNotification({
        title: pushTitle.trim(),
        message: pushMessage.trim(),
        ctaLabel: pushCtaLabel.trim(),
        ctaUrl: pushCtaUrl.trim(),
        category: pushAudience === 'clubs' ? 'club' : 'announcement',
        audience: pushAudience,
        deliveryMode,
      });
      
      console.log('✅ Push notification queued successfully');
      setPushTitle('');
      setPushMessage('');
      setPushCtaLabel('');
      setPushCtaUrl('');
      setPushLocalOnly(false);
      
      if (deliveryMode === 'localOnly') {
        showToast('Push bildirimi sıraya alındı (sadece uygulama içi).');
      } else {
        showToast('Push bildirimi sıraya alındı ve tüm cihazlara gönderilecek.');
      }
    } catch (error: any) {
      console.error('❌ Push send error:', error);
      console.error('❌ Error details:', { message: error?.message, code: error?.code });
      showToast(`Push bildirimi gönderilemedi: ${error?.message || 'Bilinmeyen hata'}`);
    } finally {
      setPushLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!adminUsername.trim() || !adminPassword.trim()) {
      showToast('Kullanıcı adı ve şifre boş olamaz.');
      return;
    }
    if (adminPassword !== adminPasswordConfirm) {
      showToast('Şifreler eşleşmiyor.');
      return;
    }

    setCredLoading(true);
    try {
      await AdminControlService.updateAdminCredentials(adminUsername.trim(), adminPassword.trim());
      showToast('Admin giriş bilgileri güncellendi.');
    } catch (error) {
      console.error('❌ Admin credential update error:', error);
      showToast('Admin bilgileri güncellenemedi.');
    } finally {
      setCredLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>🛡️ Yönetim Paneli</Text>
        <Text style={styles.subheading}>
          Banner ve push bildirimleri tüm cihazlara anında iletilir. {'\n'}
          Bannerlar sadece uygulama içinde, push bildirimleri her yerde gösterilir.
        </Text>

        <PaperCard style={styles.card}>
          <Text style={styles.cardHeading}>Global Banner Yönetimi</Text>
            <View style={styles.rowBetween}>
              <Text>Banner Aktif</Text>
              <Switch value={bannerEnabled} onValueChange={setBannerEnabled} />
            </View>

            <TextInput
              label="Başlık"
              value={bannerTitle}
              onChangeText={setBannerTitle}
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="Mesaj"
              value={bannerMessage}
              onChangeText={setBannerMessage}
              style={styles.input}
              multiline
              mode="outlined"
            />
            <TextInput
              label="Buton Metni (opsiyonel)"
              value={bannerCtaLabel}
              onChangeText={setBannerCtaLabel}
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="Buton Linki (opsiyonel)"
              value={bannerCtaUrl}
              onChangeText={setBannerCtaUrl}
              style={styles.input}
              mode="outlined"
              autoCapitalize="none"
            />
            <View style={styles.rowBetween}>
              <Text>Kalıcı Banner</Text>
              <Switch value={bannerPersistent} onValueChange={setBannerPersistent} />
            </View>
            <HelperText type="info">
              💡 Kalıcı banner kullanıcı tarafından kapatılamaz. Güncelleme zorlamaları için idealdir.
              {'\n'}✅ Banner tüm cihazlarda uygulama açıldığında otomatik gösterilir.
            </HelperText>
            <Button
              mode="contained"
              onPress={handlePublishBanner}
              loading={bannerLoading}
              style={styles.button}
            >
              Bannerı Yayınla
            </Button>
            <Button
              mode="text"
              onPress={handleClearBanner}
              disabled={bannerLoading}
            >
              Bannerı Kaldır
            </Button>
          <Divider style={styles.cardDivider} />
        </PaperCard>

        <PaperCard style={styles.card}>
          <Text style={styles.cardHeading}>Push Bildirimi Gönder</Text>
            <TextInput
              label="Başlık"
              value={pushTitle}
              onChangeText={setPushTitle}
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="Mesaj"
              value={pushMessage}
              onChangeText={setPushMessage}
              style={styles.input}
              mode="outlined"
              multiline
            />
            <TextInput
              label="Buton Metni (opsiyonel)"
              value={pushCtaLabel}
              onChangeText={setPushCtaLabel}
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="Buton Linki (opsiyonel)"
              value={pushCtaUrl}
              onChangeText={setPushCtaUrl}
              style={styles.input}
              mode="outlined"
              autoCapitalize="none"
            />
            <Text style={styles.sectionLabel}>Hedef Kitle</Text>
            <View style={styles.audienceChips}>
              {(['all', 'students', 'clubs'] as Array<'all' | 'students' | 'clubs'>).map((value) => (
                <Button
                  key={value}
                  mode={pushAudience === value ? 'contained' : 'outlined'}
                  onPress={() => setPushAudience(value)}
                  compact
                  style={styles.audienceButton}
                >
                  {value === 'all' ? 'Tümü' : value === 'students' ? 'Öğrenciler' : 'Kulüpler'}
                </Button>
              ))}
            </View>
            <View style={styles.rowBetween}>
              <Text>Yalnızca uygulama içi duyuru</Text>
              <Switch value={pushLocalOnly} onValueChange={setPushLocalOnly} />
            </View>
            <HelperText type="info">
              💡 Global mod: Push bildirimi tüm cihazlara gönderilir (uygulama kapalıyken bile).
              {'\n'}📱 Yalnızca uygulama içi: Push bildirimi sadece uygulama açıkken gösterilir.
            </HelperText>
            <Button
              mode="contained"
              onPress={handleSendPush}
              loading={pushLoading}
              style={styles.button}
            >
              Push Bildirimi Gönder
            </Button>
          <Divider style={styles.cardDivider} />
        </PaperCard>

        <PaperCard style={styles.card}>
          <Text style={styles.cardHeading}>Admin Giriş Bilgileri</Text>
            <TextInput
              label="Admin Kullanıcı Adı"
              value={adminUsername}
              onChangeText={setAdminUsername}
              style={styles.input}
              mode="outlined"
              autoCapitalize="none"
            />
            <TextInput
              label="Yeni Şifre"
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="Şifreyi Doğrula"
              value={adminPasswordConfirm}
              onChangeText={setAdminPasswordConfirm}
              secureTextEntry
              style={styles.input}
              mode="outlined"
            />
            <Button
              mode="contained"
              onPress={handleSaveCredentials}
              loading={credLoading}
              style={styles.button}
            >
              Giriş Bilgilerini Güncelle
            </Button>
            <HelperText type="info">
              Varsayılan giriş ifadeleri ile admin paneline erişilebilir. Güvenlik için özel bilgiler belirleyin.
            </HelperText>
          <Divider style={styles.cardDivider} />
        </PaperCard>

        <Divider style={styles.divider} />
        <Text style={styles.footerText}>MeMoDe Admin Paneli</Text>
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={2500}
      >
        {snackbar.message}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardDivider: {
    marginTop: 12,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  divider: {
    marginVertical: 16,
  },
  footerText: {
    textAlign: 'center',
    color: '#9CA3AF',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  audienceChips: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  audienceButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default AdminPanelScreen;

