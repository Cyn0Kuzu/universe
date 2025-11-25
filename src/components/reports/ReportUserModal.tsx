import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Portal, Dialog, Text, TextInput, Button, HelperText, Chip, useTheme } from 'react-native-paper';
import { reportSubmissionService } from '../../services/reportSubmissionService';

interface ReportUserModalProps {
  visible: boolean;
  onDismiss: () => void;
  reportedUser?: {
    id: string;
    displayName?: string;
    email?: string;
  };
  reporterEmail?: string;
  onSubmitted?: () => void;
}

const DEFAULT_TOPICS = [
  'Taciz / Rahatsız Etme',
  'Spam veya Sahte Hesap',
  'Uygunsuz İçerik',
  'Güvenlik İhlali',
  'Diğer'
] as const;

const ReportUserModal: React.FC<ReportUserModalProps> = ({
  visible,
  onDismiss,
  reportedUser,
  reporterEmail,
  onSubmitted,
}) => {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState<typeof DEFAULT_TOPICS[number]>(DEFAULT_TOPICS[0]);
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState(reporterEmail || '');
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setContactEmail(reporterEmail || '');
  }, [reporterEmail]);

  useEffect(() => {
    if (!visible) {
      setTitle('');
      setDescription('');
      setLink('');
      setTopic(DEFAULT_TOPICS[0]);
      setError(null);
      setSubmitting(false);
    }
  }, [visible]);

  const isFormValid = useMemo(() => {
    return Boolean(title.trim()) && Boolean(description.trim()) && Boolean(reportedUser?.id);
  }, [title, description, reportedUser?.id]);

  const handleSubmit = async () => {
    if (!reportedUser?.id) {
      setError('Bildiri gönderilemedi. Kullanıcı bilgisi eksik.');
      return;
    }

    if (!isFormValid) {
      setError('Lütfen gerekli alanları doldurun.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await reportSubmissionService.submitUserReport({
        reportedUserId: reportedUser.id,
        reportedUserName: reportedUser.displayName,
        reportedUserEmail: reportedUser.email,
        title: title.trim(),
        topic,
        description: description.trim(),
        attachmentUrl: link.trim() || undefined,
        contactEmail: contactEmail?.trim() || undefined,
      });

      Alert.alert('Teşekkürler', 'Bildiriminiz güvenlik ekibine iletildi.');
      onSubmitted?.();
      onDismiss();
    } catch (submitError: any) {
      console.error('❌ Report submission error:', submitError);
      const message = submitError?.message || submitError?.code || 'Bildiriminiz gönderilemedi. Lütfen tekrar deneyin.';
      setError(message);
      Alert.alert('Hata', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Profili Bildir</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.descriptionText}>
            Bildirimler doğrudan güvenlik ekibimize iletilir ve memodee@gmail.com adresine e-posta gönderilir. Uygulamadan çıkmanıza gerek yoktur.
          </Text>

          <TextInput
            label="Başlık"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.input}
            placeholder="Kısa bir başlık yazın"
          />

          <Text style={styles.sectionLabel}>Konu Başlığı</Text>
          <View style={styles.chipContainer}>
            {DEFAULT_TOPICS.map((item) => (
              <Chip
                key={item}
                style={[
                  styles.topicChip,
                  topic === item && { backgroundColor: theme.colors.secondaryContainer },
                ]}
                selected={topic === item}
                onPress={() => setTopic(item)}
                textStyle={styles.topicChipText}
              >
                {item}
              </Chip>
            ))}
          </View>

          <TextInput
            label="Ayrıntılı Açıklama"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            style={styles.multilineInput}
            placeholder="Neler olduğunu anlatın. Ekran görüntüsü, tarih ve saat detayları ekleyebilirsiniz."
            multiline
            numberOfLines={4}
          />

          <TextInput
            label="Kanıt Bağlantısı (Opsiyonel)"
            value={link}
            onChangeText={setLink}
            mode="outlined"
            style={styles.input}
            placeholder="Dosya veya ekran görüntüsü bağlantısı"
            autoCapitalize="none"
          />

          <TextInput
            label="İletişim E-postası (Opsiyonel)"
            value={contactEmail}
            onChangeText={setContactEmail}
            mode="outlined"
            style={styles.input}
            placeholder="Size ulaşmamız gerekirse"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {error && (
            <HelperText type="error" visible style={styles.helperText}>
              {error}
            </HelperText>
          )}
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <Button onPress={onDismiss} disabled={submitting}>
            İptal
          </Button>
          <Button mode="contained" onPress={handleSubmit} loading={submitting} disabled={!isFormValid || submitting}>
            Gönder
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 18,
  },
  descriptionText: {
    fontSize: 13,
    marginBottom: 12,
    color: '#555',
  },
  input: {
    marginBottom: 12,
  },
  multilineInput: {
    marginBottom: 12,
    minHeight: 100,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  topicChip: {
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 18,
    backgroundColor: '#f0f2f5',
  },
  topicChipText: {
    fontSize: 12,
  },
  helperText: {
    marginBottom: 4,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});

export default ReportUserModal;

