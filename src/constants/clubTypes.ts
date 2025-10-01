// ──────────────────────────────────────────────────────────────────────────────
//  src/constants/clubTypes.ts
// ──────────────────────────────────────────────────────────────────────────────

/**
 * ClubType interface for club type data
 */
export interface ClubType {
  /** Unique identifier */
  id: string;
  /** Display name (Turkish) */
  name: string;
  /** Material Community Icons icon name */
  icon: string;
  /** Category group */
  category: string;
  /** Description */
  description?: string;
}

/* -------------------------------------------------------------------------- */
/*  1. Main Club Types Data Array                                            */
/* -------------------------------------------------------------------------- */

export const CLUB_TYPES_DATA: ClubType[] = [
  // Akademik / Bilimsel Kulüpler
  { id: 'computer-engineering', name: 'Bilgisayar Mühendisliği', icon: 'laptop', category: 'academic' },
  { id: 'electrical-electronics', name: 'Elektrik-Elektronik', icon: 'flash', category: 'academic' },
  { id: 'mechanical-engineering', name: 'Makine Mühendisliği', icon: 'engine', category: 'academic' },
  { id: 'civil-engineering', name: 'İnşaat Mühendisliği', icon: 'home-city', category: 'academic' },
  { id: 'industrial-engineering', name: 'Endüstri Mühendisliği', icon: 'factory', category: 'academic' },
  { id: 'chemistry', name: 'Kimya', icon: 'flask', category: 'academic' },
  { id: 'physics', name: 'Fizik', icon: 'atom', category: 'academic' },
  { id: 'mathematics', name: 'Matematik', icon: 'calculator-variant', category: 'academic' },
  { id: 'biology', name: 'Biyoloji', icon: 'dna', category: 'academic' },
  { id: 'medical', name: 'Tıp', icon: 'medical-bag', category: 'academic' },
  { id: 'law', name: 'Hukuk', icon: 'scale-balance', category: 'academic' },
  { id: 'economics', name: 'Ekonomi', icon: 'chart-line', category: 'academic' },
  { id: 'psychology', name: 'Psikoloji', icon: 'brain', category: 'academic' },
  { id: 'astronomy', name: 'Astronomi', icon: 'telescope', category: 'academic' },
  { id: 'archaeology', name: 'Arkeoloji', icon: 'shovel', category: 'academic' },

  // Teknoloji ve Yazılım Kulüpleri
  { id: 'software-development', name: 'Yazılım Geliştirme', icon: 'code-braces', category: 'technology' },
  { id: 'artificial-intelligence', name: 'Yapay Zeka', icon: 'robot', category: 'technology' },
  { id: 'cyber-security', name: 'Siber Güvenlik', icon: 'shield-lock', category: 'technology' },
  { id: 'game-development', name: 'Oyun Geliştirme', icon: 'gamepad-variant', category: 'technology' },
  { id: 'mobile-development', name: 'Mobil Yazılım', icon: 'cellphone', category: 'technology' },
  { id: 'web-development', name: 'Web Geliştirme', icon: 'web', category: 'technology' },
  { id: 'data-science', name: 'Veri Bilimi', icon: 'chart-scatter-plot', category: 'technology' },
  { id: 'blockchain', name: 'Blokzincir', icon: 'bitcoin', category: 'technology' },
  { id: 'robotics', name: 'Robotik', icon: 'robot-industrial', category: 'technology' },
  { id: 'hardware', name: 'Donanım', icon: 'chip', category: 'technology' },

  // Girişimcilik ve İş Dünyası Kulüpleri
  { id: 'entrepreneurship', name: 'Girişimcilik', icon: 'lightbulb-on', category: 'business' },
  { id: 'marketing', name: 'Pazarlama', icon: 'bullhorn', category: 'business' },
  { id: 'finance', name: 'Finans', icon: 'currency-usd', category: 'business' },
  { id: 'career', name: 'Kariyer', icon: 'briefcase', category: 'business' },
  { id: 'management', name: 'Yönetim', icon: 'account-group', category: 'business' },
  { id: 'business', name: 'İşletme', icon: 'domain', category: 'business' },
  { id: 'innovation', name: 'İnovasyon', icon: 'lightbulb', category: 'business' },

  // Sosyal Sorumluluk ve Topluluk Hizmeti
  { id: 'social-responsibility', name: 'Sosyal Sorumluluk', icon: 'hand-heart', category: 'social' },
  { id: 'community-service', name: 'Toplum Hizmeti', icon: 'account-group', category: 'social' },
  { id: 'children', name: 'Çocuk Yardım', icon: 'human-child', category: 'social' },
  { id: 'elderly', name: 'Yaşlı Yardım', icon: 'human-cane', category: 'social' },
  { id: 'animal-rights', name: 'Hayvan Hakları', icon: 'paw', category: 'social' },
  { id: 'disability-awareness', name: 'Engelli Farkındalık', icon: 'wheelchair-accessibility', category: 'social' },
  { id: 'health-awareness', name: 'Sağlık Bilinci', icon: 'heart-pulse', category: 'social' },
  { id: 'education-support', name: 'Eğitim Desteği', icon: 'school', category: 'social' },
  { id: 'environmental', name: 'Çevre', icon: 'leaf', category: 'social' },

  // Kültür ve Sanat Kulüpleri
  { id: 'visual-arts', name: 'Görsel Sanatlar', icon: 'palette', category: 'arts' },
  { id: 'photography', name: 'Fotoğrafçılık', icon: 'camera', category: 'arts' },
  { id: 'cinema', name: 'Sinema', icon: 'movie', category: 'arts' },
  { id: 'theater', name: 'Tiyatro', icon: 'drama-masks', category: 'arts' },
  { id: 'music', name: 'Müzik', icon: 'music', category: 'arts' },
  { id: 'dance', name: 'Dans', icon: 'dance-ballroom', category: 'arts' },
  { id: 'literature', name: 'Edebiyat', icon: 'book-open-page-variant', category: 'arts' },
  { id: 'poetry', name: 'Şiir', icon: 'text', category: 'arts' },
  { id: 'design', name: 'Tasarım', icon: 'brush', category: 'arts' },
  { id: 'handcrafts', name: 'El Sanatları', icon: 'scissors-cutting', category: 'arts' },
  { id: 'calligraphy', name: 'Kaligrafi', icon: 'fountain-pen', category: 'arts' },
  { id: 'sculpture', name: 'Heykel', icon: 'human-handsup', category: 'arts' },

  // Spor Kulüpleri
  { id: 'football', name: 'Futbol', icon: 'soccer', category: 'sports' },
  { id: 'basketball', name: 'Basketbol', icon: 'basketball', category: 'sports' },
  { id: 'volleyball', name: 'Voleybol', icon: 'volleyball', category: 'sports' },
  { id: 'tennis', name: 'Tenis', icon: 'tennis', category: 'sports' },
  { id: 'table-tennis', name: 'Masa Tenisi', icon: 'table-tennis', category: 'sports' },
  { id: 'swimming', name: 'Yüzme', icon: 'swim', category: 'sports' },
  { id: 'athletics', name: 'Atletizm', icon: 'run', category: 'sports' },
  { id: 'martial-arts', name: 'Dövüş Sanatları', icon: 'karate', category: 'sports' },
  { id: 'chess', name: 'Satranç', icon: 'chess-knight', category: 'sports' },
  { id: 'hiking', name: 'Doğa Yürüyüşü', icon: 'hiking', category: 'sports' },
  { id: 'cycling', name: 'Bisiklet', icon: 'bike', category: 'sports' },
  { id: 'winter-sports', name: 'Kış Sporları', icon: 'snowboard', category: 'sports' },
  { id: 'water-sports', name: 'Su Sporları', icon: 'sail-boat', category: 'sports' },
  { id: 'archery', name: 'Okçuluk', icon: 'bullseye-arrow', category: 'sports' },
  { id: 'rock-climbing', name: 'Kaya Tırmanışı', icon: 'hiking', category: 'sports' },

  // Fikir ve Tartışma Kulüpleri
  { id: 'debate', name: 'Münazara', icon: 'comment-text-multiple', category: 'ideas' },
  { id: 'philosophy', name: 'Felsefe', icon: 'head-question', category: 'ideas' },
  { id: 'political-science', name: 'Siyaset Bilimi', icon: 'gavel', category: 'ideas' },
  { id: 'sociology', name: 'Sosyoloji', icon: 'account-multiple', category: 'ideas' },
  { id: 'history', name: 'Tarih', icon: 'book-clock', category: 'ideas' },
  { id: 'model-un', name: 'Model Birleşmiş Milletler', icon: 'earth', category: 'ideas' },

  // Uluslararası ve Dil Kulüpleri
  { id: 'english', name: 'İngilizce', icon: 'translate', category: 'language' },
  { id: 'german', name: 'Almanca', icon: 'translate', category: 'language' },
  { id: 'french', name: 'Fransızca', icon: 'translate', category: 'language' },
  { id: 'spanish', name: 'İspanyolca', icon: 'translate', category: 'language' },
  { id: 'italian', name: 'İtalyanca', icon: 'translate', category: 'language' },
  { id: 'russian', name: 'Rusça', icon: 'translate', category: 'language' },
  { id: 'japanese', name: 'Japonca', icon: 'translate', category: 'language' },
  { id: 'chinese', name: 'Çince', icon: 'translate', category: 'language' },
  { id: 'korean', name: 'Korece', icon: 'translate', category: 'language' },
  { id: 'arabic', name: 'Arapça', icon: 'translate', category: 'language' },
  { id: 'international', name: 'Uluslararası', icon: 'earth', category: 'language' },
  { id: 'exchange', name: 'Öğrenci Değişimi', icon: 'airplane', category: 'language' },
  { id: 'erasmus', name: 'Erasmus', icon: 'flag-variant', category: 'language' },

  // Medya ve İletişim Kulüpleri
  { id: 'journalism', name: 'Gazetecilik', icon: 'newspaper', category: 'media' },
  { id: 'radio', name: 'Radyo', icon: 'radio', category: 'media' },
  { id: 'television', name: 'Televizyon', icon: 'television-classic', category: 'media' },
  { id: 'social-media', name: 'Sosyal Medya', icon: 'chat', category: 'media' },
  { id: 'public-relations', name: 'Halkla İlişkiler', icon: 'account-voice', category: 'media' },
  { id: 'communication', name: 'İletişim', icon: 'message-text', category: 'media' },
  { id: 'digital-media', name: 'Dijital Medya', icon: 'video', category: 'media' },

  // Kişisel Gelişim Kulüpleri
  { id: 'personal-development', name: 'Kişisel Gelişim', icon: 'account-star', category: 'personal' },
  { id: 'leadership', name: 'Liderlik', icon: 'account-star', category: 'personal' },
  { id: 'public-speaking', name: 'Topluluk Önünde Konuşma', icon: 'microphone', category: 'personal' },
  { id: 'mindfulness', name: 'Bilinçli Farkındalık', icon: 'meditation', category: 'personal' },
  { id: 'yoga', name: 'Yoga', icon: 'human-handsdown', category: 'personal' },
  { id: 'meditation', name: 'Meditasyon', icon: 'meditation', category: 'personal' },
  { id: 'nutrition', name: 'Beslenme', icon: 'food-apple', category: 'personal' },
  { id: 'health', name: 'Sağlıklı Yaşam', icon: 'heart', category: 'personal' },

  // Diğer
  { id: 'gastronomy', name: 'Gastronomi', icon: 'food-fork-drink', category: 'other' },
  { id: 'travel', name: 'Gezi', icon: 'map-marker', category: 'other' },
  { id: 'board-games', name: 'Kutu Oyunları', icon: 'cards', category: 'other' },
  { id: 'gaming', name: 'Oyun', icon: 'controller-classic', category: 'other' },
  { id: 'anime-manga', name: 'Anime & Manga', icon: 'emoticon-cool', category: 'other' },
  { id: 'fantasy-scifi', name: 'Fantastik & Bilim Kurgu', icon: 'rocket', category: 'other' },
  { id: 'astronomy-observation', name: 'Astronomi Gözlem', icon: 'star', category: 'other' },
  { id: 'folklore', name: 'Halk Bilimi', icon: 'music-circle', category: 'other' },
  { id: 'alumni', name: 'Mezunlar', icon: 'school', category: 'other' },
  { id: 'other', name: 'Diğer', icon: 'star-outline', category: 'other' },
];

/* -------------------------------------------------------------------------- */
/*  2. Helper Functions                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Get all club types formatted for pickers/selectors
 * @param withPlaceholder - Add placeholder option at the top
 * @returns Array of club type options
 */
export const getClubTypeOptions = (withPlaceholder: boolean = false): ClubType[] => {
  const options = [...CLUB_TYPES_DATA];

  if (withPlaceholder) {
    return [
      { id: '', name: 'Kulüp Türü Seçiniz...', icon: 'chevron-down', category: '' },
      ...options
    ];
  }

  return options;
};

/**
 * Get club types by category
 * @param category - Category to filter by
 * @returns Array of club types in the specified category
 */
export const getClubTypesByCategory = (category: string): ClubType[] => {
  return CLUB_TYPES_DATA.filter(type => type.category === category);
};

/**
 * Get all available categories
 * @returns Array of unique category values
 */
export const getClubCategories = (): {id: string, name: string}[] => {
  const categories = [
    { id: 'academic', name: 'Akademik / Bilimsel' },
    { id: 'technology', name: 'Teknoloji ve Yazılım' },
    { id: 'business', name: 'Girişimcilik ve İş' },
    { id: 'social', name: 'Sosyal Sorumluluk' },
    { id: 'arts', name: 'Kültür ve Sanat' },
    { id: 'sports', name: 'Spor' },
    { id: 'ideas', name: 'Fikir ve Tartışma' },
    { id: 'language', name: 'Dil ve Uluslararası' },
    { id: 'media', name: 'Medya ve İletişim' },
    { id: 'personal', name: 'Kişisel Gelişim' },
    { id: 'other', name: 'Diğer' }
  ];
  
  return categories;
};

/**
 * Get club type by ID
 * @param id - Club type ID
 * @returns Club type object or null
 */
export const getClubTypeById = (id: string): ClubType | null => {
  return CLUB_TYPES_DATA.find(type => type.id === id) || null;
};

/**
 * Get multiple club types by IDs
 * @param ids - Array of club type IDs
 * @returns Array of club types
 */
export const getClubTypesByIds = (ids: string[]): ClubType[] => {
  return CLUB_TYPES_DATA.filter(type => ids.includes(type.id));
};

/**
 * Search club types by name
 * @param searchTerm - Search term
 * @param limit - Maximum results to return
 * @returns Filtered club types array
 */
export const searchClubTypes = (searchTerm: string, limit: number = 20): ClubType[] => {
  if (!searchTerm || searchTerm.trim() === '') {
    return CLUB_TYPES_DATA.slice(0, limit);
  }

  const filtered = CLUB_TYPES_DATA.filter(type =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return filtered.slice(0, limit);
};

/* -------------------------------------------------------------------------- */
/*  3. Default Export (backwards compatibility)                              */
/* -------------------------------------------------------------------------- */
export default CLUB_TYPES_DATA;
