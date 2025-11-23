import React from 'react';
import { ScrollView, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Text, useTheme, Surface, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TermsOfServiceProps {
  onClose?: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onClose }) => {
  const theme = useTheme();

  const handleEmailPress = () => {
    Linking.openURL('mailto:destek@universe-kampus.com');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>
          Kullanım Şartları
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </Surface>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            1. Kabul ve Onay
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Universe Kampüs Hayatını Keşfet uygulamasını (bundan sonra "Uygulama" olarak anılacaktır) 
            kullanarak, bu kullanım şartlarını kabul etmiş sayılırsınız. Bu şartları kabul etmiyorsanız, 
            lütfen uygulamayı kullanmayın.
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            2. Uygulama Hakkında
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Universe, üniversite öğrencilerinin kampüs hayatını keşfetmelerine yardımcı olan bir 
            sosyal platform uygulamasıdır. Öğrenciler kulüpleri keşfedebilir, etkinliklere katılabilir, 
            yeni arkadaşlıklar kurabilir ve kampüs yaşamına aktif olarak katılabilirler.
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            3. Kullanıcı Hesapları ve Sorumluluklar
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            • Hesap oluştururken doğru ve güncel bilgiler vermelisiniz{'\n'}
            • Hesap güvenliğinizden siz sorumlusunuz{'\n'}
            • Hesabınızı başkalarıyla paylaşmamalısınız{'\n'}
            • Şifrenizi güvenli tutmalı ve düzenli olarak değiştirmelisiniz{'\n'}
            • Hesabınızda gerçekleşen tüm aktivitelerden sorumlusunuz
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            4. Kabul Edilebilir Kullanım
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Uygulamayı kullanırken aşağıdaki kurallara uymalısınız:{'\n\n'}
            
            <Text style={styles.boldText}>✅ İzin verilen:</Text>{'\n'}
            • Saygılı ve yapıcı iletişim kurmak{'\n'}
            • Gerçek kimliğinizle hesap oluşturmak{'\n'}
            • Kulüp etkinliklerine katılmak{'\n'}
            • Üniversite topluluğuna katkı sağlamak{'\n'}
            • Eğitici ve sosyal içerikler paylaşmak{'\n\n'}
            
            <Text style={styles.boldText}>❌ Yasak olan:</Text>{'\n'}
            • Nefret söylemi, taciz veya zorbalık{'\n'}
            • Sahte hesap oluşturmak{'\n'}
            • Spam veya istenmeyen içerik göndermek{'\n'}
            • Telif hakkı ihlali yapan içerikler{'\n'}
            • Pornografik, şiddet içeren veya uygunsuz içerikler{'\n'}
            • Diğer kullanıcıların kişisel bilgilerini paylaşmak{'\n'}
            • Uygulamanın güvenliğini tehdit edecek faaliyetler
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            5. İçerik ve Telif Hakları
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            • Paylaştığınız içeriklerin telif haklarına sahip olmalısınız{'\n'}
            • Universe, paylaştığınız içerikleri platform içinde kullanma hakkına sahiptir{'\n'}
            • Başkalarının telif haklarını ihlal eden içerikler derhal kaldırılır{'\n'}
            • Uygunsuz içerikleri bildirme hakkınız vardır
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            6. Gizlilik ve Veri Koruma
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Kişisel verilerinizin nasıl toplandığı, kullanıldığı ve korunduğu hakkında detaylı 
            bilgi için lütfen Gizlilik Politikamızı inceleyin. Uygulamayı kullanarak, 
            Gizlilik Politikamızda belirtilen veri işleme uygulamalarını kabul etmiş olursunuz.
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            7. Puanlama ve Ödül Sistemi
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            • Etkinliklere katılım, kulüp üyeliği gibi aktivitelerle puan kazanabilirsiniz{'\n'}
            • Puanlar sadece uygulama içi kullanım içindir{'\n'}
            • Puan manipülasyonu yasaktır{'\n'}
            • Universe, puan sistemini değiştirme hakkını saklı tutar
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            8. Hesap Askıya Alma ve Sonlandırma
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Universe, kullanım şartlarını ihlal eden hesapları uyarı vermeksizin askıya alma 
            veya sonlandırma hakkını saklı tutar. Ciddi ihlaller durumunda hesabınız kalıcı 
            olarak kapatılabilir.
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            9. Sorumluluk Reddi
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            • Uygulama "olduğu gibi" sunulmaktadır{'\n'}
            • Kesintisiz hizmet garantisi verilmez{'\n'}
            • Kullanıcılar arası etkileşimlerden sorumluluk kabul edilmez{'\n'}
            • Üçüncü taraf bağlantılardan sorumlu değiliz
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            10. Değişiklikler
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Bu kullanım şartları zaman zaman güncellenebilir. Önemli değişiklikler 
            uygulama içi bildirimlerle duyurulacaktır. Değişikliklerden sonra uygulamayı 
            kullanmaya devam etmeniz, yeni şartları kabul ettiğiniz anlamına gelir.
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            11. İletişim
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Kullanım şartları hakkında sorularınız için bizimle iletişime geçebilirsiniz:
          </Text>
          <TouchableOpacity onPress={handleEmailPress} style={styles.contactButton}>
            <MaterialCommunityIcons name="email" size={20} color={theme.colors.primary} />
            <Text style={[styles.contactText, { color: theme.colors.primary }]}>
              destek@universe-kampus.com
            </Text>
          </TouchableOpacity>
        </Surface>

        <Surface style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.footerText, { color: '#666666' }]}>
            Son güncelleme: 1 Ağustos 2025{'\n'}
            universe
          </Text>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: 'bold',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  contactText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default TermsOfService;
