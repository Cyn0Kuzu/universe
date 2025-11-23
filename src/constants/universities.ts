// ──────────────────────────────────────────────────────────────────────────────
//  src/constants/universities.ts
// ──────────────────────────────────────────────────────────────────────────────

/**
 * University interface for university data
 */
export interface University {
  /** Unique identifier for picker/selection */
  value: string;
  /** Display name for UI */
  label: string;
  /** Slug identifier */
  id: string;
  /** Full name (Turkish) */
  name: string;
}

/* -------------------------------------------------------------------------- */
/*  1. Main University Data Array                                            */
/* -------------------------------------------------------------------------- */
export const UNIVERSITIES_DATA: University[] = [
  { value: '1', label: 'Abdullah Gül Üniversitesi', id: 'agu', name: 'Abdullah Gül Üniversitesi' },
  { value: '2', label: 'Acıbadem Mehmet Ali Aydınlar Üniversitesi', id: 'acibadem', name: 'Acıbadem Mehmet Ali Aydınlar Üniversitesi' },
  { value: '3', label: 'Adana Alparslan Türkeş Bilim ve Teknoloji Üniversitesi', id: 'adana-alparslan-turkes', name: 'Adana Alparslan Türkeş Bilim ve Teknoloji Üniversitesi' },
  { value: '4', label: 'Adıyaman Üniversitesi', id: 'adiyaman', name: 'Adıyaman Üniversitesi' },
  { value: '5', label: 'Afyon Kocatepe Üniversitesi', id: 'afyon-kocatepe', name: 'Afyon Kocatepe Üniversitesi' },
  { value: '6', label: 'Afyonkarahisar Sağlık Bilimleri Üniversitesi', id: 'afyonkarahisar-saglik', name: 'Afyonkarahisar Sağlık Bilimleri Üniversitesi' },
  { value: '7', label: 'Ağrı İbrahim Çeçen Üniversitesi', id: 'agri-ibrahim-cecen', name: 'Ağrı İbrahim Çeçen Üniversitesi' },
  { value: '8', label: 'Ahi Evran Üniversitesi', id: 'ahi-evran', name: 'Ahi Evran Üniversitesi' },
  { value: '9', label: 'Aksaray Üniversitesi', id: 'aksaray', name: 'Aksaray Üniversitesi' },
  { value: '10', label: 'Alanya Alaaddin Keykubat Üniversitesi', id: 'alanya-alaaddin-keykubat', name: 'Alanya Alaaddin Keykubat Üniversitesi' },
  { value: '11', label: 'Alanya Hamdullah Emin Paşa Üniversitesi', id: 'alanya-hamdullah-emin-pasa', name: 'Alanya Hamdullah Emin Paşa Üniversitesi' },
  { value: '12', label: 'Altınbaş Üniversitesi', id: 'altinbas', name: 'Altınbaş Üniversitesi' },
  { value: '13', label: 'Anadolu Üniversitesi', id: 'anadolu', name: 'Anadolu Üniversitesi' },
  { value: '14', label: 'Ankara Hacı Bayram Veli Üniversitesi', id: 'ankara-haci-bayram-veli', name: 'Ankara Hacı Bayram Veli Üniversitesi' },
  { value: '15', label: 'Ankara Medipol Üniversitesi', id: 'ankara-medipol', name: 'Ankara Medipol Üniversitesi' },
  { value: '16', label: 'Ankara Müzik ve Güzel Sanatlar Üniversitesi', id: 'ankara-muzik-guzel-sanatlar', name: 'Ankara Müzik ve Güzel Sanatlar Üniversitesi' },
  { value: '17', label: 'Ankara Sosyal Bilimler Üniversitesi', id: 'ankara-sosyal-bilimler', name: 'Ankara Sosyal Bilimler Üniversitesi' },
  { value: '18', label: 'Ankara Üniversitesi', id: 'ankara', name: 'Ankara Üniversitesi' },
  { value: '19', label: 'Ankara Yıldırım Beyazıt Üniversitesi', id: 'ankara-yildirim-beyazit', name: 'Ankara Yıldırım Beyazıt Üniversitesi' },
  { value: '20', label: 'Antalya Akev Üniversitesi', id: 'antalya-akev', name: 'Antalya Akev Üniversitesi' },
  { value: '21', label: 'Antalya Bilim Üniversitesi', id: 'antalya-bilim', name: 'Antalya Bilim Üniversitesi' },
  { value: '22', label: 'Ardahan Üniversitesi', id: 'ardahan', name: 'Ardahan Üniversitesi' },
  { value: '23', label: 'Artvin Çoruh Üniversitesi', id: 'artvin-coruh', name: 'Artvin Çoruh Üniversitesi' },
  { value: '24', label: 'Atatürk Üniversitesi', id: 'ataturk', name: 'Atatürk Üniversitesi' },
  { value: '25', label: 'Atılım Üniversitesi', id: 'atilim', name: 'Atılım Üniversitesi' },
  { value: '26', label: 'Avrasya Üniversitesi', id: 'avrasya', name: 'Avrasya Üniversitesi' },
  { value: '27', label: 'Bahçeşehir Üniversitesi', id: 'bahcesehir', name: 'Bahçeşehir Üniversitesi' },
  { value: '28', label: 'Bandırma Onyedi Eylül Üniversitesi', id: 'bandirma-onyedi-eylul', name: 'Bandırma Onyedi Eylül Üniversitesi' },
  { value: '29', label: 'Başkent Üniversitesi', id: 'baskent', name: 'Başkent Üniversitesi' },
  { value: '30', label: 'Batman Üniversitesi', id: 'batman', name: 'Batman Üniversitesi' },
  { value: '31', label: 'Bayburt Üniversitesi', id: 'bayburt', name: 'Bayburt Üniversitesi' },
  { value: '32', label: 'Beykent Üniversitesi', id: 'beykent', name: 'Beykent Üniversitesi' },
  { value: '33', label: 'Bezmialem Vakıf Üniversitesi', id: 'bezmialem-vakif', name: 'Bezmialem Vakıf Üniversitesi' },
  { value: '34', label: 'Bilecik Şeyh Edebali Üniversitesi', id: 'bilecik-seyh-edebali', name: 'Bilecik Şeyh Edebali Üniversitesi' },
  { value: '35', label: 'Bilkent Üniversitesi', id: 'bilkent', name: 'Bilkent Üniversitesi' },
  { value: '36', label: 'Bingöl Üniversitesi', id: 'bingol', name: 'Bingöl Üniversitesi' },
  { value: '37', label: 'Bitlis Eren Üniversitesi', id: 'bitlis-eren', name: 'Bitlis Eren Üniversitesi' },
  { value: '38', label: 'Boğaziçi Üniversitesi', id: 'bogazici', name: 'Boğaziçi Üniversitesi' },
  { value: '39', label: 'Bolu Abant İzzet Baysal Üniversitesi', id: 'bolu-abant-izzet-baysal', name: 'Bolu Abant İzzet Baysal Üniversitesi' },
  { value: '40', label: 'Burdur Mehmet Akif Ersoy Üniversitesi', id: 'burdur-mehmet-akif-ersoy', name: 'Burdur Mehmet Akif Ersoy Üniversitesi' },
  { value: '41', label: 'Bursa Teknik Üniversitesi', id: 'bursa-teknik', name: 'Bursa Teknik Üniversitesi' },
  { value: '42', label: 'Bursa Uludağ Üniversitesi', id: 'bursa-uludag', name: 'Bursa Uludağ Üniversitesi' },
  { value: '43', label: 'Çağ Üniversitesi', id: 'cag', name: 'Çağ Üniversitesi' },
  { value: '44', label: 'Çanakkale Onsekiz Mart Üniversitesi', id: 'canakkale-onsekiz-mart', name: 'Çanakkale Onsekiz Mart Üniversitesi' },
  { value: '45', label: 'Çankaya Üniversitesi', id: 'cankaya', name: 'Çankaya Üniversitesi' },
  { value: '46', label: 'Çankırı Karatekin Üniversitesi', id: 'cankiri-karatekin', name: 'Çankırı Karatekin Üniversitesi' },
  { value: '47', label: 'Çukurova Üniversitesi', id: 'cukurova', name: 'Çukurova Üniversitesi' },
  { value: '48', label: 'Dicle Üniversitesi', id: 'dicle', name: 'Dicle Üniversitesi' },
  { value: '49', label: 'Doğuş Üniversitesi', id: 'dogus', name: 'Doğuş Üniversitesi' },
  { value: '50', label: 'Dokuz Eylül Üniversitesi', id: 'dokuz-eylul', name: 'Dokuz Eylül Üniversitesi' },
  { value: '51', label: 'Düzce Üniversitesi', id: 'duzce', name: 'Düzce Üniversitesi' },
  { value: '52', label: 'Ege Üniversitesi', id: 'ege', name: 'Ege Üniversitesi' },
  { value: '53', label: 'Erciyes Üniversitesi', id: 'erciyes', name: 'Erciyes Üniversitesi' },
  { value: '54', label: 'Erzincan Binali Yıldırım Üniversitesi', id: 'erzincan-binali-yildirim', name: 'Erzincan Binali Yıldırım Üniversitesi' },
  { value: '55', label: 'Erzurum Teknik Üniversitesi', id: 'erzurum-teknik', name: 'Erzurum Teknik Üniversitesi' },
  { value: '56', label: 'Eskişehir Osmangazi Üniversitesi', id: 'eskisehir-osmangazi', name: 'Eskişehir Osmangazi Üniversitesi' },
  { value: '57', label: 'Eskişehir Teknik Üniversitesi', id: 'eskisehir-teknik', name: 'Eskişehir Teknik Üniversitesi' },
  { value: '58', label: 'Fatih Sultan Mehmet Vakıf Üniversitesi', id: 'fatih-sultan-mehmet-vakif', name: 'Fatih Sultan Mehmet Vakıf Üniversitesi' },
  { value: '59', label: 'Fırat Üniversitesi', id: 'firat', name: 'Fırat Üniversitesi' },
  { value: '60', label: 'Galatasaray Üniversitesi', id: 'galatasaray', name: 'Galatasaray Üniversitesi' },
  { value: '61', label: 'Gazi Üniversitesi', id: 'gazi', name: 'Gazi Üniversitesi' },
  { value: '62', label: 'Gaziantep Üniversitesi', id: 'gaziantep', name: 'Gaziantep Üniversitesi' },
  { value: '63', label: 'Gebze Teknik Üniversitesi', id: 'gebze-teknik', name: 'Gebze Teknik Üniversitesi' },
  { value: '64', label: 'Giresun Üniversitesi', id: 'giresun', name: 'Giresun Üniversitesi' },
  { value: '65', label: 'Gümüşhane Üniversitesi', id: 'gumushane', name: 'Gümüşhane Üniversitesi' },
  { value: '66', label: 'Hacettepe Üniversitesi', id: 'hacettepe', name: 'Hacettepe Üniversitesi' },
  { value: '67', label: 'Hakkari Üniversitesi', id: 'hakkari', name: 'Hakkari Üniversitesi' },
  { value: '68', label: 'Harran Üniversitesi', id: 'harran', name: 'Harran Üniversitesi' },
  { value: '69', label: 'Hatay Mustafa Kemal Üniversitesi', id: 'hatay-mustafa-kemal', name: 'Hatay Mustafa Kemal Üniversitesi' },
  { value: '70', label: 'Hitit Üniversitesi', id: 'hitit', name: 'Hitit Üniversitesi' },
  { value: '71', label: 'İbn Haldun Üniversitesi', id: 'ibn-haldun', name: 'İbn Haldun Üniversitesi' },
  { value: '72', label: 'İğdır Üniversitesi', id: 'igdir', name: 'İğdır Üniversitesi' },
  { value: '73', label: 'İnönü Üniversitesi', id: 'inonu', name: 'İnönü Üniversitesi' },
  { value: '74', label: 'İskenderun Teknik Üniversitesi', id: 'iskenderun-teknik', name: 'İskenderun Teknik Üniversitesi' },
  { value: '75', label: 'İstanbul 29 Mayıs Üniversitesi', id: 'istanbul-29-mayis', name: 'İstanbul 29 Mayıs Üniversitesi' },
  { value: '76', label: 'İstanbul Arel Üniversitesi', id: 'istanbul-arel', name: 'İstanbul Arel Üniversitesi' },
  { value: '77', label: 'İstanbul Aydın Üniversitesi', id: 'istanbul-aydin', name: 'İstanbul Aydın Üniversitesi' },
  { value: '78', label: 'İstanbul Bilgi Üniversitesi', id: 'istanbul-bilgi', name: 'İstanbul Bilgi Üniversitesi' },
  { value: '79', label: 'İstanbul Cerrahpaşa Üniversitesi', id: 'istanbul-cerrahpasa', name: 'İstanbul Cerrahpaşa Üniversitesi' },
  { value: '80', label: 'İstanbul Galata Üniversitesi', id: 'istanbul-galata', name: 'İstanbul Galata Üniversitesi' },
  { value: '81', label: 'İstanbul Gedik Üniversitesi', id: 'istanbul-gedik', name: 'İstanbul Gedik Üniversitesi' },
  { value: '82', label: 'İstanbul Gelişim Üniversitesi', id: 'istanbul-gelisim', name: 'İstanbul Gelişim Üniversitesi' },
  { value: '83', label: 'İstanbul Kültür Üniversitesi', id: 'istanbul-kultur', name: 'İstanbul Kültür Üniversitesi' },
  { value: '84', label: 'İstanbul Medeniyet Üniversitesi', id: 'istanbul-medeniyet', name: 'İstanbul Medeniyet Üniversitesi' },
  { value: '85', label: 'İstanbul Medipol Üniversitesi', id: 'istanbul-medipol', name: 'İstanbul Medipol Üniversitesi' },
  { value: '86', label: 'İstanbul Okan Üniversitesi', id: 'istanbul-okan', name: 'İstanbul Okan Üniversitesi' },
  { value: '87', label: 'İstanbul Rumeli Üniversitesi', id: 'istanbul-rumeli', name: 'İstanbul Rumeli Üniversitesi' },
  { value: '88', label: 'İstanbul Sabahattin Zaim Üniversitesi', id: 'istanbul-sabahattin-zaim', name: 'İstanbul Sabahattin Zaim Üniversitesi' },
  { value: '89', label: 'İstanbul Şehir Üniversitesi', id: 'istanbul-sehir', name: 'İstanbul Şehir Üniversitesi' },
  { value: '90', label: 'İstanbul Şişli Üniversitesi', id: 'istanbul-sisli', name: 'İstanbul Şişli Üniversitesi' },
  { value: '91', label: 'İstanbul Teknik Üniversitesi', id: 'istanbul-teknik', name: 'İstanbul Teknik Üniversitesi' },
  { value: '92', label: 'İstanbul Ticaret Üniversitesi', id: 'istanbul-ticaret', name: 'İstanbul Ticaret Üniversitesi' },
  { value: '93', label: 'İstanbul Üniversitesi', id: 'istanbul', name: 'İstanbul Üniversitesi' },
  { value: '94', label: 'İstanbul Yeni Yüzyıl Üniversitesi', id: 'istanbul-yeni-yuzyil', name: 'İstanbul Yeni Yüzyıl Üniversitesi' },
  { value: '95', label: 'İzmir Bakırçay Üniversitesi', id: 'izmir-bakircay', name: 'İzmir Bakırçay Üniversitesi' },
  { value: '96', label: 'İzmir Demokrasi Üniversitesi', id: 'izmir-demokrasi', name: 'İzmir Demokrasi Üniversitesi' },
  { value: '97', label: 'İzmir Ekonomi Üniversitesi', id: 'izmir-ekonomi', name: 'İzmir Ekonomi Üniversitesi' },
  { value: '98', label: 'İzmir Katip Çelebi Üniversitesi', id: 'izmir-katip-celebi', name: 'İzmir Katip Çelebi Üniversitesi' },
  { value: '99', label: 'İzmir Yüksek Teknoloji Enstitüsü', id: 'izmir-yuksek-teknoloji', name: 'İzmir Yüksek Teknoloji Enstitüsü' },
  { value: '100', label: 'Kadir Has Üniversitesi', id: 'kadir-has', name: 'Kadir Has Üniversitesi' },
  { value: '101', label: 'Kafkas Üniversitesi', id: 'kafkas', name: 'Kafkas Üniversitesi' },
  { value: '102', label: 'Kahramanmaraş Sütçü İmam Üniversitesi', id: 'kahramanmaras-sutcu-imam', name: 'Kahramanmaraş Sütçü İmam Üniversitesi' },
  { value: '103', label: 'Karabük Üniversitesi', id: 'karabuk', name: 'Karabük Üniversitesi' },
  { value: '104', label: 'Karadeniz Teknik Üniversitesi', id: 'karadeniz-teknik', name: 'Karadeniz Teknik Üniversitesi' },
  { value: '105', label: 'Karamanoğlu Mehmetbey Üniversitesi', id: 'karamanoglu-mehmetbey', name: 'Karamanoğlu Mehmetbey Üniversitesi' },
  { value: '106', label: 'Kastamonu Üniversitesi', id: 'kastamonu', name: 'Kastamonu Üniversitesi' },
  { value: '107', label: 'Kayseri Üniversitesi', id: 'kayseri', name: 'Kayseri Üniversitesi' },
  { value: '108', label: 'Kırıkkale Üniversitesi', id: 'kirikkale', name: 'Kırıkkale Üniversitesi' },
  { value: '109', label: 'Kırklareli Üniversitesi', id: 'kirklareli', name: 'Kırklareli Üniversitesi' },
  { value: '110', label: 'Kırşehir Ahi Evran Üniversitesi', id: 'kirsehir-ahi-evran', name: 'Kırşehir Ahi Evran Üniversitesi' },
  { value: '111', label: 'Kilis 7 Aralık Üniversitesi', id: 'kilis-7-aralik', name: 'Kilis 7 Aralık Üniversitesi' },
  { value: '112', label: 'Koç Üniversitesi', id: 'koc', name: 'Koç Üniversitesi' },
  { value: '113', label: 'Kocaeli Üniversitesi', id: 'kocaeli', name: 'Kocaeli Üniversitesi' },
  { value: '114', label: 'Konya Gıda ve Tarım Üniversitesi', id: 'konya-gida-tarim', name: 'Konya Gıda ve Tarım Üniversitesi' },
  { value: '115', label: 'Konya Teknik Üniversitesi', id: 'konya-teknik', name: 'Konya Teknik Üniversitesi' },
  { value: '116', label: 'Kütahya Dumlupınar Üniversitesi', id: 'kutahya-dumlupinar', name: 'Kütahya Dumlupınar Üniversitesi' },
  { value: '117', label: 'Kütahya Sağlık Bilimleri Üniversitesi', id: 'kutahya-saglik', name: 'Kütahya Sağlık Bilimleri Üniversitesi' },
  { value: '118', label: 'Maltepe Üniversitesi', id: 'maltepe', name: 'Maltepe Üniversitesi' },
  { value: '119', label: 'Manisa Celal Bayar Üniversitesi', id: 'manisa-celal-bayar', name: 'Manisa Celal Bayar Üniversitesi' },
  { value: '120', label: 'Marmara Üniversitesi', id: 'marmara', name: 'Marmara Üniversitesi' },
  { value: '121', label: 'Mardin Artuklu Üniversitesi', id: 'mardin-artuklu', name: 'Mardin Artuklu Üniversitesi' },
  { value: '122', label: 'Mersin Üniversitesi', id: 'mersin', name: 'Mersin Üniversitesi' },
  { value: '123', label: 'Mimar Sinan Güzel Sanatlar Üniversitesi', id: 'mimar-sinan', name: 'Mimar Sinan Güzel Sanatlar Üniversitesi' },
  { value: '124', label: 'Muğla Sıtkı Koçman Üniversitesi', id: 'mugla-sitki-kocman', name: 'Muğla Sıtkı Koçman Üniversitesi' },
  { value: '125', label: 'Muş Alparslan Üniversitesi', id: 'mus-alparslan', name: 'Muş Alparslan Üniversitesi' },
  { value: '126', label: 'Necmettin Erbakan Üniversitesi', id: 'necmettin-erbakan', name: 'Necmettin Erbakan Üniversitesi' },
  { value: '127', label: 'Nevşehir Hacı Bektaş Veli Üniversitesi', id: 'nevsehir-haci-bektas-veli', name: 'Nevşehir Hacı Bektaş Veli Üniversitesi' },
  { value: '128', label: 'Niğde Ömer Halisdemir Üniversitesi', id: 'nigde-omer-halisdemir', name: 'Niğde Ömer Halisdemir Üniversitesi' },
  { value: '129', label: 'Ordu Üniversitesi', id: 'ordu', name: 'Ordu Üniversitesi' },
  { value: '130', label: 'Orta Doğu Teknik Üniversitesi', id: 'odtu', name: 'Orta Doğu Teknik Üniversitesi' },
  { value: '131', label: 'Özyeğin Üniversitesi', id: 'ozyegin', name: 'Özyeğin Üniversitesi' },
  { value: '132', label: 'Pamukkale Üniversitesi', id: 'pamukkale', name: 'Pamukkale Üniversitesi' },
  { value: '133', label: 'Recep Tayyip Erdoğan Üniversitesi', id: 'recep-tayyip-erdogan', name: 'Recep Tayyip Erdoğan Üniversitesi' },
  { value: '134', label: 'Sabancı Üniversitesi', id: 'sabanci', name: 'Sabancı Üniversitesi' },
  { value: '135', label: 'Sakarya Uygulamalı Bilimler Üniversitesi', id: 'sakarya-uygulamali', name: 'Sakarya Uygulamalı Bilimler Üniversitesi' },
  { value: '136', label: 'Sakarya Üniversitesi', id: 'sakarya', name: 'Sakarya Üniversitesi' },
  { value: '137', label: 'Selçuk Üniversitesi', id: 'selcuk', name: 'Selçuk Üniversitesi' },
  { value: '138', label: 'Siirt Üniversitesi', id: 'siirt', name: 'Siirt Üniversitesi' },
  { value: '139', label: 'Sinop Üniversitesi', id: 'sinop', name: 'Sinop Üniversitesi' },
  { value: '140', label: 'Sivas Cumhuriyet Üniversitesi', id: 'sivas-cumhuriyet', name: 'Sivas Cumhuriyet Üniversitesi' },
  { value: '141', label: 'Süleyman Demirel Üniversitesi', id: 'suleyman-demirel', name: 'Süleyman Demirel Üniversitesi' },
  { value: '142', label: 'Şırnak Üniversitesi', id: 'sirnak', name: 'Şırnak Üniversitesi' },
  { value: '143', label: 'Tekirdağ Namık Kemal Üniversitesi', id: 'tekirdag-namik-kemal', name: 'Tekirdağ Namık Kemal Üniversitesi' },
  { value: '144', label: 'TOBB Ekonomi ve Teknoloji Üniversitesi', id: 'tobb-ekonomi-teknoloji', name: 'TOBB Ekonomi ve Teknoloji Üniversitesi' },
  { value: '145', label: 'Tokat Gaziosmanpaşa Üniversitesi', id: 'tokat-gaziosmanpasa', name: 'Tokat Gaziosmanpaşa Üniversitesi' },
  { value: '146', label: 'Trabzon Üniversitesi', id: 'trabzon', name: 'Trabzon Üniversitesi' },
  { value: '147', label: 'Trakya Üniversitesi', id: 'trakya', name: 'Trakya Üniversitesi' },
  { value: '148', label: 'Tunceli Üniversitesi', id: 'tunceli', name: 'Tunceli Üniversitesi' },
  { value: '149', label: 'Türk Hava Kurumu Üniversitesi', id: 'turk-hava-kurumu', name: 'Türk Hava Kurumu Üniversitesi' },
  { value: '150', label: 'Uşak Üniversitesi', id: 'usak', name: 'Uşak Üniversitesi' },
  { value: '151', label: 'Van Yüzüncü Yıl Üniversitesi', id: 'van-yuzuncu-yil', name: 'Van Yüzüncü Yıl Üniversitesi' },
  { value: '152', label: 'Yalova Üniversitesi', id: 'yalova', name: 'Yalova Üniversitesi' },
  { value: '153', label: 'Yaşar Üniversitesi', id: 'yasar', name: 'Yaşar Üniversitesi' },
  { value: '154', label: 'Yeditepe Üniversitesi', id: 'yeditepe', name: 'Yeditepe Üniversitesi' },
  { value: '155', label: 'Yıldız Teknik Üniversitesi', id: 'yildiz-teknik', name: 'Yıldız Teknik Üniversitesi' },
  { value: '156', label: 'Yozgat Bozok Üniversitesi', id: 'yozgat-bozok', name: 'Yozgat Bozok Üniversitesi' },
  { value: '157', label: 'Zonguldak Bülent Ecevit Üniversitesi', id: 'zonguldak-bulent-ecevit', name: 'Zonguldak Bülent Ecevit Üniversitesi' }
];

/* -------------------------------------------------------------------------- */
/*  2. Helper Functions                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Get all universities formatted for pickers/selectors
 * @param withPlaceholder - Add placeholder option at the top
 * @returns Array of university options
 */
export const getUniversityOptions = (withPlaceholder: boolean = false): University[] => {
  const options = UNIVERSITIES_DATA.map(uni => ({
    value: uni.value,
    label: uni.label,
    id: uni.id,
    name: uni.name
  }));

  if (withPlaceholder) {
    return [
      { value: '', label: 'Üniversite Seçiniz...', id: '', name: '' },
      ...options
    ];
  }

  return options;
};

/**
 * Search universities by name/label
 * @param searchTerm - Search term
 * @param limit - Maximum results to return
 * @returns Filtered university array
 */
export const searchUniversities = (searchTerm: string, limit: number = 20): University[] => {
  if (!searchTerm || searchTerm.trim() === '') {
    return UNIVERSITIES_DATA.slice(0, limit);
  }

  const filtered = UNIVERSITIES_DATA.filter(uni =>
    uni.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    uni.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return filtered.slice(0, limit);
};

/**
 * Get university by ID
 * @param id - University ID
 * @returns University object or null
 */
export const getUniversityById = (id: string): University | null => {
  return UNIVERSITIES_DATA.find(uni => uni.id === id) || null;
};

/**
 * Get university by value
 * @param value - University value
 * @returns University object or null
 */
export const getUniversityByValue = (value: string | number): University | null => {
  return UNIVERSITIES_DATA.find(uni => uni.value === value?.toString()) || null;
};

/**
 * Get popular universities (for quick selection)
 * @returns Array of popular universities
 */
export const getPopularUniversities = (): University[] => {
  const popularIds = [
    'ankara', 'istanbul', 'hacettepe', 'gazi', 'ege', 'anadolu', 'marmara', 
    'bogazici', 'odtu', 'istanbul-teknik', 'bilkent', 'sabanci', 'koc'
  ];

  return UNIVERSITIES_DATA.filter(uni => popularIds.includes(uni.id));
};

/**
 * Get university name by ID
 */
export const getUniversityName = (universityId: string): string => {
  const university = UNIVERSITIES_DATA.find(uni => uni.id === universityId || uni.value === universityId);
  return university?.name || university?.label || universityId;
};

/* -------------------------------------------------------------------------- */
/*  3. Default Export (backwards compatibility)                              */
/* -------------------------------------------------------------------------- */
export default UNIVERSITIES_DATA;
