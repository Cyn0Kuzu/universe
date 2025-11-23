// ──────────────────────────────────────────────────────────────────────────────
//  src/constants/departments.ts
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Department interface for department data
 */
export interface Department {
  /** Unique identifier for picker/selection */
  value: string;
  /** Display name for UI (Turkish) */
  label: string;
  /** Slug identifier */
  id: string;
  /** English name */
  en: string;
}

/* -------------------------------------------------------------------------- */
/*  1. Main Departments Data Array                                           */
/* -------------------------------------------------------------------------- */
export const DEPARTMENTS_DATA: Department[] = [
  { value: '1', label: 'Bilgisayar Mühendisliği', id: 'bilgisayar-muhendisligi', en: 'Computer Engineering' },
  { value: '2', label: 'Endüstri Mühendisliği', id: 'endustri-muhendisligi', en: 'Industrial Engineering' },
  { value: '3', label: 'Elektrik-Elektronik Mühendisliği', id: 'elektrik-elektronik-muhendisligi', en: 'Electrical and Electronics Engineering' },
  { value: '4', label: 'Makine Mühendisliği', id: 'makine-muhendisligi', en: 'Mechanical Engineering' },
  { value: '5', label: 'İnşaat Mühendisliği', id: 'insaat-muhendisligi', en: 'Civil Engineering' },
  { value: '6', label: 'Kimya Mühendisliği', id: 'kimya-muhendisligi', en: 'Chemical Engineering' },
  { value: '7', label: 'Çevre Mühendisliği', id: 'cevre-muhendisligi', en: 'Environmental Engineering' },
  { value: '8', label: 'Gıda Mühendisliği', id: 'gida-muhendisligi', en: 'Food Engineering' },
  { value: '9', label: 'Biyomedikal Mühendisliği', id: 'biyomedikal-muhendisligi', en: 'Biomedical Engineering' },
  { value: '10', label: 'Yazılım Mühendisliği', id: 'yazilim-muhendisligi', en: 'Software Engineering' },
  { value: '11', label: 'Jeoloji Mühendisliği', id: 'jeoloji-muhendisligi', en: 'Geological Engineering' },
  { value: '12', label: 'Maden Mühendisliği', id: 'maden-muhendisligi', en: 'Mining Engineering' },
  { value: '13', label: 'Metalurji ve Malzeme Mühendisliği', id: 'metalurji-malzeme-muhendisligi', en: 'Metallurgical and Materials Engineering' },
  { value: '14', label: 'Tekstil Mühendisliği', id: 'tekstil-muhendisligi', en: 'Textile Engineering' },
  { value: '15', label: 'Ziraat Mühendisliği', id: 'ziraat-muhendisligi', en: 'Agricultural Engineering' },
  { value: '16', label: 'Orman Mühendisliği', id: 'orman-muhendisligi', en: 'Forest Engineering' },
  { value: '17', label: 'Yapay Zeka Mühendisliği', id: 'yapay-zeka-muhendisligi', en: 'Artificial Intelligence Engineering' },
  { value: '18', label: 'Siber Güvenlik', id: 'siber-guvenlik', en: 'Cyber Security' },
  { value: '19', label: 'Bilişim Sistemleri Mühendisliği', id: 'bilisim-sistemleri-muhendisligi', en: 'Information Systems Engineering' },
  { value: '20', label: 'İktisat', id: 'iktisat', en: 'Economics' },
  { value: '21', label: 'İşletme', id: 'isletme', en: 'Business Administration' },
  { value: '22', label: 'Maliye', id: 'maliye', en: 'Public Finance' },
  { value: '23', label: 'Bankacılık ve Finans', id: 'bankacilik-finans', en: 'Banking and Finance' },
  { value: '24', label: 'Muhasebe', id: 'muhasebe', en: 'Accounting' },
  { value: '25', label: 'İnsan Kaynakları Yönetimi', id: 'insan-kaynaklari-yonetimi', en: 'Human Resources Management' },
  { value: '26', label: 'Pazarlama', id: 'pazarlama', en: 'Marketing' },
  { value: '27', label: 'Lojistik', id: 'lojistik', en: 'Logistics' },
  { value: '28', label: 'Uluslararası İlişkiler', id: 'uluslararasi-iliskiler', en: 'International Relations' },
  { value: '29', label: 'Siyaset Bilimi ve Kamu Yönetimi', id: 'siyaset-bilimi-kamu-yonetimi', en: 'Political Science and Public Administration' },
  { value: '30', label: 'Kamu Yönetimi', id: 'kamu-yonetimi', en: 'Public Administration' },
  { value: '31', label: 'Çalışma Ekonomisi ve Endüstri İlişkileri', id: 'calisma-ekonomisi-endustri-iliskileri', en: 'Labor Economics and Industrial Relations' },
  { value: '32', label: 'Matematik', id: 'matematik', en: 'Mathematics' },
  { value: '33', label: 'Fizik', id: 'fizik', en: 'Physics' },
  { value: '34', label: 'Kimya', id: 'kimya', en: 'Chemistry' },
  { value: '35', label: 'Biyoloji', id: 'biyoloji', en: 'Biology' },
  { value: '36', label: 'İstatistik', id: 'istatistik', en: 'Statistics' },
  { value: '37', label: 'Astronomi ve Uzay Bilimleri', id: 'astronomi-uzay-bilimleri', en: 'Astronomy and Space Sciences' },
  { value: '38', label: 'Bilgisayar Bilimleri', id: 'bilgisayar-bilimleri', en: 'Computer Science' },
  { value: '39', label: 'Veri Bilimi', id: 'veri-bilimi', en: 'Data Science' },
  { value: '40', label: 'Biyoinformatik', id: 'biyoinformatik', en: 'Bioinformatics' },
  { value: '41', label: 'Tıp', id: 'tip', en: 'Medicine' },
  { value: '42', label: 'Diş Hekimliği', id: 'dis-hekimligi', en: 'Dentistry' },
  { value: '43', label: 'Eczacılık', id: 'eczacilik', en: 'Pharmacy' },
  { value: '44', label: 'Veteriner Hekimliği', id: 'veteriner-hekimligi', en: 'Veterinary Medicine' },
  { value: '45', label: 'Hemşirelik', id: 'hemsirelik', en: 'Nursing' },
  { value: '46', label: 'Beslenme ve Diyetetik', id: 'beslenme-diyetetik', en: 'Nutrition and Dietetics' },
  { value: '47', label: 'Fizyoterapi ve Rehabilitasyon', id: 'fizyoterapi-rehabilitasyon', en: 'Physiotherapy and Rehabilitation' },
  { value: '48', label: 'Ebelik', id: 'ebelik', en: 'Midwifery' },
  { value: '49', label: 'Sağlık Yönetimi', id: 'saglik-yonetimi', en: 'Health Management' },
  { value: '50', label: 'Tıbbi Sekreterlik', id: 'tibbi-sekreterlik', en: 'Medical Secretarial' },
  { value: '51', label: 'Anestezi', id: 'anestezi', en: 'Anesthesia' },
  { value: '52', label: 'Tıbbi Görüntüleme Teknikleri', id: 'tibbi-goruntuleme-teknikleri', en: 'Medical Imaging Techniques' },
  { value: '53', label: 'Psikoloji', id: 'psikoloji', en: 'Psychology' },
  { value: '54', label: 'Sosyoloji', id: 'sosyoloji', en: 'Sociology' },
  { value: '55', label: 'Tarih', id: 'tarih', en: 'History' },
  { value: '56', label: 'Coğrafya', id: 'cografya', en: 'Geography' },
  { value: '57', label: 'Felsefe', id: 'felsefe', en: 'Philosophy' },
  { value: '58', label: 'Antropoloji', id: 'antropoloji', en: 'Anthropology' },
  { value: '59', label: 'Arkeoloji', id: 'arkeoloji', en: 'Archaeology' },
  { value: '60', label: 'Sanat Tarihi', id: 'sanat-tarihi', en: 'Art History' },
  { value: '61', label: 'Türk Dili ve Edebiyatı', id: 'turk-dili-edebiyati', en: 'Turkish Language and Literature' },
  { value: '62', label: 'İngiliz Dili ve Edebiyatı', id: 'ingiliz-dili-edebiyati', en: 'English Language and Literature' },
  { value: '63', label: 'Alman Dili ve Edebiyatı', id: 'alman-dili-edebiyati', en: 'German Language and Literature' },
  { value: '64', label: 'Fransız Dili ve Edebiyatı', id: 'fransiz-dili-edebiyati', en: 'French Language and Literature' },
  { value: '65', label: 'Rus Dili ve Edebiyatı', id: 'rus-dili-edebiyati', en: 'Russian Language and Literature' },
  { value: '66', label: 'Çeviribilim', id: 'ceviribilim', en: 'Translation Studies' },
  { value: '67', label: 'Dilbilim', id: 'dilbilim', en: 'Linguistics' },
  { value: '68', label: 'Hukuk', id: 'hukuk', en: 'Law' },
  { value: '69', label: 'Sınıf Öğretmenliği', id: 'sinif-ogretmenligi', en: 'Primary School Teaching' },
  { value: '70', label: 'Okul Öncesi Öğretmenliği', id: 'okul-oncesi-ogretmenligi', en: 'Preschool Teaching' },
  { value: '71', label: 'Matematik Öğretmenliği', id: 'matematik-ogretmenligi', en: 'Mathematics Teaching' },
  { value: '72', label: 'Fizik Öğretmenliği', id: 'fizik-ogretmenligi', en: 'Physics Teaching' },
  { value: '73', label: 'Kimya Öğretmenliği', id: 'kimya-ogretmenligi', en: 'Chemistry Teaching' },
  { value: '74', label: 'Biyoloji Öğretmenliği', id: 'biyoloji-ogretmenligi', en: 'Biology Teaching' },
  { value: '75', label: 'Türkçe Öğretmenliği', id: 'turkce-ogretmenligi', en: 'Turkish Teaching' },
  { value: '76', label: 'İngilizce Öğretmenliği', id: 'ingilizce-ogretmenligi', en: 'English Teaching' },
  { value: '77', label: 'Almanca Öğretmenliği', id: 'almanca-ogretmenligi', en: 'German Teaching' },
  { value: '78', label: 'Fransızca Öğretmenliği', id: 'fransizca-ogretmenligi', en: 'French Teaching' },
  { value: '79', label: 'Tarih Öğretmenliği', id: 'tarih-ogretmenligi', en: 'History Teaching' },
  { value: '80', label: 'Coğrafya Öğretmenliği', id: 'cografya-ogretmenligi', en: 'Geography Teaching' },
  { value: '81', label: 'Beden Eğitimi ve Spor Öğretmenliği', id: 'beden-egitimi-spor-ogretmenligi', en: 'Physical Education and Sports Teaching' },
  { value: '82', label: 'Müzik Öğretmenliği', id: 'muzik-ogretmenligi', en: 'Music Teaching' },
  { value: '83', label: 'Resim Öğretmenliği', id: 'resim-ogretmenligi', en: 'Art Teaching' },
  { value: '84', label: 'Özel Eğitim Öğretmenliği', id: 'ozel-egitim-ogretmenligi', en: 'Special Education Teaching' },
  { value: '85', label: 'Rehberlik ve Psikolojik Danışmanlık', id: 'rehberlik-psikolojik-danismanlık', en: 'Guidance and Psychological Counseling' },
  { value: '86', label: 'Bilgisayar ve Öğretim Teknolojileri', id: 'bilgisayar-ogretim-teknolojileri', en: 'Computer and Instructional Technologies' },
  { value: '87', label: 'Mimarlık', id: 'mimarlik', en: 'Architecture' },
  { value: '88', label: 'İç Mimarlık', id: 'ic-mimarlik', en: 'Interior Architecture' },
  { value: '89', label: 'Peyzaj Mimarlığı', id: 'peyzaj-mimarligi', en: 'Landscape Architecture' },
  { value: '90', label: 'Şehir ve Bölge Planlama', id: 'sehir-bolge-planlama', en: 'City and Regional Planning' },
  { value: '91', label: 'Endüstri Tasarımı', id: 'endustri-tasarimi', en: 'Industrial Design' },
  { value: '92', label: 'Grafik Tasarım', id: 'grafik-tasarim', en: 'Graphic Design' },
  { value: '93', label: 'Moda Tasarımı', id: 'moda-tasarimi', en: 'Fashion Design' },
  { value: '94', label: 'Seramik', id: 'seramik', en: 'Ceramics' },
  { value: '95', label: 'Heykel', id: 'heykel', en: 'Sculpture' },
  { value: '96', label: 'Resim', id: 'resim', en: 'Painting' },
  { value: '97', label: 'Müzik', id: 'muzik', en: 'Music' },
  { value: '98', label: 'Müzikoloji', id: 'muzikoloji', en: 'Musicology' },
  { value: '99', label: 'Kompozisyon', id: 'kompozisyon', en: 'Composition' },
  { value: '100', label: 'Sahne Sanatları', id: 'sahne-sanatlari', en: 'Performing Arts' },
  { value: '101', label: 'Tiyatro', id: 'tiyatro', en: 'Theatre' },
  { value: '102', label: 'Sinema-TV', id: 'sinema-tv', en: 'Cinema-TV' },
  { value: '103', label: 'Radyo-TV ve Sinema', id: 'radyo-tv-sinema', en: 'Radio-TV and Cinema' },
  { value: '104', label: 'Gazetecilik', id: 'gazetecilik', en: 'Journalism' },
  { value: '105', label: 'Halkla İlişkiler ve Tanıtım', id: 'halkla-iliskiler-tanitim', en: 'Public Relations and Publicity' },
  { value: '106', label: 'Reklamcılık', id: 'reklamcilik', en: 'Advertising' },
  { value: '107', label: 'İletişim', id: 'iletisim', en: 'Communication' },
  { value: '108', label: 'Medya ve Görsel Sanatlar', id: 'medya-gorsel-sanatlar', en: 'Media and Visual Arts' },
  { value: '109', label: 'Yeni Medya', id: 'yeni-medya', en: 'New Media' },
  { value: '110', label: 'Turizm İşletmeciliği', id: 'turizm-isletmeciligi', en: 'Tourism Management' },
  { value: '111', label: 'Otel İşletmeciliği', id: 'otel-isletmeciligi', en: 'Hotel Management' },
  { value: '112', label: 'Gastronomi ve Mutfak Sanatları', id: 'gastronomi-mutfak-sanatlari', en: 'Gastronomy and Culinary Arts' },
  { value: '113', label: 'Rekreasyon', id: 'rekreasyon', en: 'Recreation' },
  { value: '114', label: 'Spor Bilimleri', id: 'spor-bilimleri', en: 'Sports Sciences' },
  { value: '115', label: 'Antrenörlük Eğitimi', id: 'antrenorluk-egitimi', en: 'Coaching Education' },
  { value: '116', label: 'Spor Yöneticiliği', id: 'spor-yoneticiligi', en: 'Sports Management' },
  { value: '117', label: 'Hareket ve Antrenman Bilimleri', id: 'hareket-antrenman-bilimleri', en: 'Movement and Training Sciences' },
  { value: '118', label: 'Çocuk Gelişimi', id: 'cocuk-gelisimi', en: 'Child Development' },
  { value: '119', label: 'Aile ve Tüketici Bilimleri', id: 'aile-tuketici-bilimleri', en: 'Family and Consumer Sciences' },
  { value: '120', label: 'Sosyal Hizmet', id: 'sosyal-hizmet', en: 'Social Work' }
];

/* -------------------------------------------------------------------------- */
/*  2. Helper Functions                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Get all departments formatted for pickers/selectors
 * @param withPlaceholder - Add placeholder option at the top
 * @returns Array of department options
 */
export const getDepartmentOptions = (withPlaceholder: boolean = false): Department[] => {
  const options = DEPARTMENTS_DATA.map(dept => ({
    value: dept.value,
    label: dept.label,
    id: dept.id,
    en: dept.en
  }));

  if (withPlaceholder) {
    return [
      { value: '', label: 'Bölüm Seçiniz...', id: '', en: '' },
      ...options
    ];
  }

  return options;
};

/**
 * Search departments by name/label
 * @param searchTerm - Search term
 * @param limit - Maximum results to return
 * @returns Filtered department array
 */
export const searchDepartments = (searchTerm: string, limit: number = 20): Department[] => {
  if (!searchTerm || searchTerm.trim() === '') {
    return DEPARTMENTS_DATA.slice(0, limit);
  }

  const filtered = DEPARTMENTS_DATA.filter(dept =>
    dept.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.en.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return filtered.slice(0, limit);
};

/**
 * Get department by ID
 * @param id - Department ID
 * @returns Department object or null
 */
export const getDepartmentById = (id: string): Department | null => {
  return DEPARTMENTS_DATA.find(dept => dept.id === id) || null;
};

/**
 * Get department by value
 * @param value - Department value
 * @returns Department object or null
 */
export const getDepartmentByValue = (value: string | number): Department | null => {
  return DEPARTMENTS_DATA.find(dept => dept.value === value?.toString()) || null;
};

/**
 * Get engineering departments only
 * @returns Array of engineering departments
 */
export const getEngineeringDepartments = (): Department[] => {
  return DEPARTMENTS_DATA.filter(dept => dept.label.includes('Mühendisliği'));
};

/**
 * Get teaching departments only
 * @returns Array of teaching departments
 */
export const getTeachingDepartments = (): Department[] => {
  return DEPARTMENTS_DATA.filter(dept => dept.label.includes('Öğretmenliği'));
};

/**
 * Get health science departments only
 * @returns Array of health science departments
 */
export const getHealthScienceDepartments = (): Department[] => {
  const healthKeywords = ['Tıp', 'Hekimliği', 'Hemşirelik', 'Sağlık', 'Eczacılık', 'Fizyoterapi', 'Beslenme', 'Ebelik'];
  return DEPARTMENTS_DATA.filter(dept => 
    healthKeywords.some(keyword => dept.label.includes(keyword))
  );
};

/**
 * Get social science departments only
 * @returns Array of social science departments
 */
export const getSocialScienceDepartments = (): Department[] => {
  const socialKeywords = ['Psikoloji', 'Sosyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'Antropoloji', 'Arkeoloji', 'İktisat', 'İşletme', 'Siyaset', 'Uluslararası', 'Hukuk'];
  return DEPARTMENTS_DATA.filter(dept => 
    socialKeywords.some(keyword => dept.label.includes(keyword))
  );
};

/**
 * Get department name by ID
 */
export const getDepartmentName = (departmentId: string): string => {
  const department = DEPARTMENTS_DATA.find(dept => dept.id === departmentId || dept.value === departmentId);
  return department?.label || department?.en || departmentId;
};

/* -------------------------------------------------------------------------- */
/*  3. Default Export (backwards compatibility)                              */
/* -------------------------------------------------------------------------- */
export default DEPARTMENTS_DATA;
