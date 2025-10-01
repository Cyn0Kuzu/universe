import React from 'react';
import { ScrollView, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PrivacyPolicyProps {
  onClose?: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose }) => {
  const theme = useTheme();

  const handleEmailPress = () => {
    Linking.openURL('mailto:gizlilik@universe-kampus.com');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>
          Gizlilik Politikası
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
            1. Giriş
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Universe Kampüs Hayatını Keşfet uygulaması ("Universe", "Uygulama", "biz" veya "bizim") 
            olarak, kullanıcılarımızın gizliliğini korumaya kararlıyız. Bu Gizlilik Politikası, 
            kişisel bilgilerinizi nasıl topladığımızı, kullandığımızı, sakladığımızı ve 
            koruduğumuzu açıklar.
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            2. Topladığımız Bilgiler
          </Text>
          
          <Text style={[styles.subTitle, { color: theme.colors.primary }]}>
            2.1 Hesap Bilgileri
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            • Ad ve soyad{'\n'}
            • E-posta adresi{'\n'}
            • Telefon numarası{'\n'}
            • Üniversite bilgileri (okul, bölüm, sınıf){'\n'}
            • Profil fotoğrafı{'\n'}
            • Kullanıcı adı
          </Text>

          <Text style={[styles.subTitle, { color: theme.colors.primary }]}>
            2.2 Kullanım Bilgileri
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            • Uygulama içi aktiviteleriniz{'\n'}
            • Katıldığınız etkinlikler{'\n'}
            • Üye olduğunuz kulüpler{'\n'}
            • Paylaştığınız içerikler{'\n'}
            • Mesajlaşma geçmişi{'\n'}
            • Konum bilgileri (izin verdiğiniz takdirde)
          </Text>

          <Text style={[styles.subTitle, { color: theme.colors.primary }]}>
            2.3 Teknik Bilgiler
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            • Cihaz türü ve işletim sistemi{'\n'}
            • IP adresi{'\n'}
            • Uygulama sürümü{'\n'}
            • Çökme raporları{'\n'}
            • Performans verileri
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            3. Bilgileri Nasıl Kullanırız
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Topladığımız bilgileri şu amaçlarla kullanırız:{'\n\n'}
            
            <Text style={styles.boldText}>🎯 Hizmet Sağlama:</Text>{'\n'}
            • Hesabınızı oluşturmak ve yönetmek{'\n'}
            • Kulüp ve etkinlik önerilerinde bulunmak{'\n'}
            • Kampüs arkadaşları bulmaya yardım etmek{'\n'}
            • Puanlama ve başarı sistemini işletmek{'\n\n'}
            
            <Text style={styles.boldText}>📱 Uygulama Geliştirme:</Text>{'\n'}
            • Uygulama performansını artırmak{'\n'}
            • Yeni özellikler geliştirmek{'\n'}
            • Hataları tespit etmek ve düzeltmek{'\n'}
            • Kullanıcı deneyimini iyileştirmek{'\n\n'}
            
            <Text style={styles.boldText}>🔔 İletişim:</Text>{'\n'}
            • Önemli bildirimleri göndermek{'\n'}
            • Etkinlik hatırlatmaları yapmak{'\n'}
            • Güvenlik uyarıları göndermek{'\n'}
            • Kullanıcı desteği sağlamak
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            4. Bilgi Paylaşımı
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Kişisel bilgilerinizi şu durumlar dışında üçüncü taraflarla paylaşmayız:{'\n\n'}
            
            <Text style={styles.boldText}>✅ İzin verdiğiniz durumlar:</Text>{'\n'}
            • Profil bilgilerinizi diğer kullanıcılarla paylaşmak{'\n'}
            • Kulüp üyeliklerinizi kulüp yöneticileriyle paylaşmak{'\n'}
            • Etkinlik katılımlarınızı organizatörlerle paylaşmak{'\n\n'}
            
            <Text style={styles.boldText}>⚖️ Yasal zorunluluklar:</Text>{'\n'}
            • Mahkeme kararı veya resmi talep{'\n'}
            • Ulusal güvenlik gereklilikleri{'\n'}
            • Suç önleme ve araştırma{'\n\n'}
            
            <Text style={styles.boldText}>🔒 Hizmet sağlayıcılar:</Text>{'\n'}
            • Firebase (Google) - veri depolama{'\n'}
            • Expo - uygulama geliştirme{'\n'}
            • Push bildirim servisleri
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            5. Veri Güvenliği
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Verilerinizi korumak için şu güvenlik önlemlerini alıyoruz:{'\n\n'}
            
            • 🔐 SSL/TLS şifreleme{'\n'}
            • 🛡️ Firebase güvenlik kuralları{'\n'}
            • 🔑 Güvenli kimlik doğrulama{'\n'}
            • 📊 Düzenli güvenlik denetimleri{'\n'}
            • 🚫 Erişim kontrolü ve yetkilendirme{'\n'}
            • 💾 Düzenli veri yedekleme{'\n\n'}
            
            Ancak, hiçbir internet iletişimi veya veri depolama yöntemi %100 güvenli değildir. 
            Bu nedenle, mutlak güvenlik garantisi veremeyiz.
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            6. Veri Saklama
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            • Aktif hesaplar: Hesap kapatılana kadar{'\n'}
            • Pasif hesaplar: 2 yıl süreyle{'\n'}
            • Mesajlar: 1 yıl süreyle{'\n'}
            • Etkinlik geçmişi: 3 yıl süreyle{'\n'}
            • Log kayıtları: 6 ay süreyle{'\n\n'}
            
            Yasal zorunluluklar gereği daha uzun süre saklamamız gereken veriler olabilir.
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            7. Kullanıcı Hakları (KVKK)
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Kişisel Verilerin Korunması Kanunu kapsamında aşağıdaki haklara sahipsiniz:{'\n\n'}
            
            • 📋 Kişisel verilerinizin işlenip işlenmediğini öğrenme{'\n'}
            • 📖 İşlenen kişisel verileriniz hakkında bilgi talep etme{'\n'}
            • 🎯 İşleme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme{'\n'}
            • 🌐 Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme{'\n'}
            • ✏️ Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme{'\n'}
            • 🗑️ Kişisel verilerin silinmesini veya yok edilmesini isteme{'\n'}
            • 📢 Düzeltme, silme ve yok etme işlemlerinin paylaşıldığı üçüncü kişilere bildirilmesini isteme{'\n'}
            • ⚖️ İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle kişinin aleyhine bir sonucun ortaya çıkmasına itiraz etme{'\n'}
            • 💸 Kişisel verilerin kanuna aykırı olarak işlenmesi sebebiyle zarara uğraması hâlinde zararın giderilmesini talep etme
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            8. Çerezler ve Takip Teknolojileri
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Uygulamamız aşağıdaki teknolojileri kullanır:{'\n\n'}
            
            • 📱 Uygulama içi analytics{'\n'}
            • 🔔 Push notification token'ları{'\n'}
            • 💾 Yerel veri depolama{'\n'}
            • 📊 Performans izleme{'\n'}
            • 🐛 Hata raporlama{'\n\n'}
            
            Bu teknolojiler hizmet kalitesini artırmak için kullanılır ve kişisel kimliğinizi 
            ifşa etmez.
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            9. Çocukların Gizliliği
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Uygulamamız 13 yaş altı çocuklar için tasarlanmamıştır. 13 yaş altı çocuklardan 
            bilerek kişisel bilgi toplamayız. Eğer bir çocuğun kişisel bilgilerini 
            topladığımızı fark edersek, bu bilgileri derhal sileriz.
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            10. Uluslararası Veri Transferi
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Verileriniz Firebase (Google Cloud) üzerinde saklanmaktadır. Bu veriler, 
            Google'ın küresel altyapısı nedeniyle farklı ülkelerde işlenebilir. 
            Tüm veri transferleri, uygun güvenlik önlemleri alınarak gerçekleştirilir.
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            11. Politika Değişiklikleri
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Bu Gizlilik Politikası zaman zaman güncellenebilir. Önemli değişiklikler 
            uygulama içi bildirimlerle ve e-posta ile duyurulacaktır. Son güncelleme 
            tarihi her zaman bu sayfanın altında yer alır.
          </Text>
        </Surface>

        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            12. İletişim Bilgileri
          </Text>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            Gizlilik Politikası, veri işleme uygulamalarımız veya haklarınız hakkında 
            sorularınız için bizimle iletişime geçebilirsiniz:
          </Text>
          <TouchableOpacity onPress={handleEmailPress} style={styles.contactButton}>
            <MaterialCommunityIcons name="email" size={20} color={theme.colors.primary} />
            <Text style={[styles.contactText, { color: theme.colors.primary }]}>
              gizlilik@universe-kampus.com
            </Text>
          </TouchableOpacity>
          <Text style={[styles.text, { color: theme.colors.onSurface }]}>
            {'\n'}Veri Sorumlusu: Universe{'\n'}
            Adres: [Şirket Adresi]{'\n'}
            Telefon: [İletişim Telefonu]
          </Text>
        </Surface>

        <Surface style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.footerText, { color: '#666666' }]}>
            Son güncelleme: 1 Ağustos 2025{'\n'}
            universe{'\n'}
            KVKK Uyumlu Gizlilik Politikası
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
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
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

export default PrivacyPolicy;
