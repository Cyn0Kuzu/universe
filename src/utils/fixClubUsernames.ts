import { firestore } from '../firebase/config';

/**
 * Kulüp kullanıcı adlarını düzeltme migration scripti
 */
export const fixClubUsernames = async () => {
  try {
    console.log('🔧 Kulüp kullanıcı adları düzeltme işlemi başlıyor...');
    
    const clubsSnapshot = await firestore
      .collection('users')
      .where('userType', '==', 'club')
      .get();

    if (clubsSnapshot.empty) {
      console.log('❌ Hiç kulüp kullanıcısı bulunamadı');
      return;
    }

    console.log(`📊 ${clubsSnapshot.size} kulüp kullanıcısı kontrol ediliyor...`);
    
    const batch = firestore.batch();
    let fixedCount = 0;
    let skippedCount = 0;

    clubsSnapshot.forEach((doc) => {
      const data = doc.data();
      const hasUsername = data.username && data.username.trim() !== '';
      
      if (!hasUsername && data.clubName) {
        // Generate username from club name
        const generatedUsername = generateUsernameFromClubName(data.clubName);
        
        console.log(`🔧 Düzeltiliyor - Kulüp: ${data.clubName}`);
        console.log(`   Yeni kullanıcı adı: ${generatedUsername}`);
        
        batch.update(doc.ref, { 
          username: generatedUsername,
          updatedAt: new Date()
        });
        
        fixedCount++;
      } else if (hasUsername) {
        console.log(`✅ OK - ${data.clubName}: ${data.username}`);
        skippedCount++;
      } else {
        console.log(`⚠️ Atlandı - ${data.clubName}: Kulüp adı yok`);
        skippedCount++;
      }
    });

    if (fixedCount > 0) {
      await batch.commit();
      console.log(`✅ ${fixedCount} kulübün kullanıcı adı başarıyla düzeltildi!`);
    } else {
      console.log('ℹ️ Düzeltilecek kulüp bulunamadı.');
    }
    
    console.log(`📈 Özet: ${fixedCount} düzeltildi, ${skippedCount} atlandı`);

  } catch (error) {
    console.error('❌ Kulüp kullanıcı adlarını düzeltirken hata:', error);
  }
};

/**
 * Kulüp adından kullanıcı adı oluşturur
 */
const generateUsernameFromClubName = (clubName: string): string => {
  return clubName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Özel karakterleri kaldır
    .replace(/\s+/g, '_') // Boşlukları alt çizgi ile değiştir
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .substring(0, 18) // Max 18 karakter
    .replace(/_+/g, '_') // Çoklu alt çizgileri tek yap
    .replace(/^_|_$/g, ''); // Baştan ve sondan alt çizgi kaldır
};

/**
 * Kullanıcı adı benzersizliğini kontrol eder
 */
export const checkUsernameUniqueness = async () => {
  try {
    console.log('🔍 Kullanıcı adı benzersizliği kontrol ediliyor...');
    
    const usersSnapshot = await firestore
      .collection('users')
      .get();

    const usernames = new Map();
    const duplicates: Array<{
      username: string;
      users: Array<{
        id: string;
        displayName: string;
        userType: string;
      }>;
    }> = [];

    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.username) {
        const username = data.username.toLowerCase();
        if (usernames.has(username)) {
          duplicates.push({
            username: data.username,
            users: [
              usernames.get(username),
              {
                id: doc.id,
                displayName: data.displayName || data.clubName || data.firstName,
                userType: data.userType
              }
            ]
          });
        } else {
          usernames.set(username, {
            id: doc.id,
            displayName: data.displayName || data.clubName || data.firstName,
            userType: data.userType
          });
        }
      }
    });

    if (duplicates.length > 0) {
      console.log('🚨 Mükerrer kullanıcı adları bulundu:');
      console.table(duplicates);
    } else {
      console.log('✅ Tüm kullanıcı adları benzersiz!');
    }

    return duplicates;

  } catch (error) {
    console.error('❌ Kullanıcı adı benzersizliği kontrolünde hata:', error);
  }
};

/**
 * Test için kullanıcı adı oluşturma fonksiyonu
 */
export const testUsernameGeneration = () => {
  const testNames = [
    'Yazılım Kulübü',
    'Müzik & Sanat Topluluğu',
    'Spor Kulübü',
    'Bilim İnsanları Derneği',
    'Tiyatro Topluluğu',
    'Fotoğrafçılık Kulübü'
  ];

  console.log('🧪 Kullanıcı adı oluşturma testi:');
  testNames.forEach(name => {
    const username = generateUsernameFromClubName(name);
    console.log(`${name} → ${username}`);
  });
};
