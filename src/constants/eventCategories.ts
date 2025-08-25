// Event categories that can be selected for events
export const eventCategories = [
  // Akademik Etkinlikler
  { id: 'seminar', label: 'Seminer', icon: 'presentation' },
  { id: 'conference', label: 'Konferans', icon: 'microphone-variant' },
  { id: 'panel', label: 'Panel', icon: 'account-group' },
  { id: 'debate', label: 'Münazara', icon: 'message-processing' },
  { id: 'case_study', label: 'Vaka Analizi', icon: 'file-document-outline' },
  { id: 'research', label: 'Araştırma Sunumu', icon: 'chart-bar' },
  { id: 'academic_talk', label: 'Akademik Söyleşi', icon: 'account-voice' },
  { id: 'journal_club', label: 'Makale Tartışması', icon: 'newspaper-variant-outline' },
  { id: 'thesis_defense', label: 'Tez Savunması', icon: 'school-outline' },

  // Teknik Etkinlikler
  { id: 'workshop', label: 'Workshop', icon: 'hammer-screwdriver' },
  { id: 'hackathon', label: 'Hackathon', icon: 'code-array' },
  { id: 'coding_challenge', label: 'Kodlama Yarışması', icon: 'code-tags' },
  { id: 'tech_talk', label: 'Teknoloji Söyleşisi', icon: 'laptop' },
  { id: 'ai_ml', label: 'Yapay Zeka/ML', icon: 'brain' },
  { id: 'game_dev', label: 'Oyun Geliştirme', icon: 'gamepad-variant' },
  { id: 'mobile_dev', label: 'Mobil Uygulama', icon: 'cellphone' },
  { id: 'web_dev', label: 'Web Geliştirme', icon: 'web' },
  { id: 'robotics', label: 'Robotik', icon: 'robot' },
  { id: 'iot', label: 'Nesnelerin İnterneti', icon: 'chip' },

  // Kariyer Etkinlikleri
  { id: 'career_fair', label: 'Kariyer Fuarı', icon: 'briefcase-outline' },
  { id: 'networking', label: 'Networking', icon: 'account-group' },
  { id: 'company_visit', label: 'Şirket Gezisi', icon: 'office-building' },
  { id: 'interview_prep', label: 'Mülakat Hazırlık', icon: 'clipboard-text-outline' },
  { id: 'cv_workshop', label: 'CV Hazırlama', icon: 'file-document-edit' },
  { id: 'internship', label: 'Staj Bilgilendirme', icon: 'badge-account-horizontal' },
  { id: 'job_shadowing', label: 'Job Shadowing', icon: 'account-multiple' },
  { id: 'mentorship', label: 'Mentorluk', icon: 'account-switch' },

  // Sosyal ve Kültürel
  { id: 'cultural', label: 'Kültürel Etkinlik', icon: 'palette' },
  { id: 'social', label: 'Sosyal Buluşma', icon: 'party-popper' },
  { id: 'movie_screening', label: 'Film Gösterimi', icon: 'movie-open' },
  { id: 'book_club', label: 'Kitap Kulübü', icon: 'book-open-variant' },
  { id: 'art_exhibition', label: 'Sanat Sergisi', icon: 'image-multiple' },
  { id: 'music_event', label: 'Müzik Etkinliği', icon: 'music' },
  { id: 'theater', label: 'Tiyatro', icon: 'theater' },
  { id: 'dance', label: 'Dans', icon: 'human-handsup' },
  { id: 'poetry', label: 'Şiir Dinletisi', icon: 'text' },
  { id: 'cooking', label: 'Yemek Atölyesi', icon: 'food-variant' },
  
  // Spor ve Wellness
  { id: 'sport_tournament', label: 'Spor Turnuvası', icon: 'trophy-outline' },
  { id: 'sports_training', label: 'Spor Eğitimi', icon: 'basketball' },
  { id: 'fitness', label: 'Fitness Etkinliği', icon: 'arm-flex' },
  { id: 'yoga', label: 'Yoga', icon: 'meditation' },
  { id: 'esports', label: 'E-Spor', icon: 'controller-classic' },
  { id: 'hiking', label: 'Doğa Yürüyüşü', icon: 'hiking' },
  { id: 'cycling', label: 'Bisiklet Turu', icon: 'bike' },
  { id: 'mental_health', label: 'Mental Sağlık', icon: 'heart-pulse' },

  // Seyahat ve Gezi
  { id: 'field_trip', label: 'Teknik Gezi', icon: 'map-marker-radius' },
  { id: 'cultural_trip', label: 'Kültürel Gezi', icon: 'bus' },
  { id: 'museum_visit', label: 'Müze Gezisi', icon: 'bank' },
  { id: 'city_tour', label: 'Şehir Turu', icon: 'city' },
  { id: 'camping', label: 'Kamp', icon: 'tent' },
  { id: 'abroad_trip', label: 'Yurtdışı Gezisi', icon: 'airplane' },

  // Sosyal Sorumluluk
  { id: 'volunteering', label: 'Gönüllülük', icon: 'hand-heart' },
  { id: 'charity', label: 'Yardım Kampanyası', icon: 'gift' },
  { id: 'environment', label: 'Çevre Etkinliği', icon: 'leaf' },
  { id: 'blood_donation', label: 'Kan Bağışı', icon: 'water' },
  { id: 'community_service', label: 'Toplum Hizmeti', icon: 'home-heart' },
  { id: 'awareness', label: 'Farkındalık', icon: 'lightbulb-on' },
  
  // Yarışmalar
  { id: 'competition', label: 'Yarışma', icon: 'trophy-variant' },
  { id: 'quiz', label: 'Bilgi Yarışması', icon: 'help-circle-outline' },
  { id: 'design_comp', label: 'Tasarım Yarışması', icon: 'pen' },
  { id: 'project_comp', label: 'Proje Yarışması', icon: 'lightbulb-outline' },
  { id: 'case_comp', label: 'Vaka Yarışması', icon: 'clipboard-check-outline' },
  { id: 'pitch', label: 'Pitch Yarışması', icon: 'presentation-play' },
  
  // Eğitim ve Gelişim
  { id: 'training', label: 'Eğitim', icon: 'school' },
  { id: 'certification', label: 'Sertifika Programı', icon: 'certificate' },
  { id: 'language', label: 'Dil Pratiği', icon: 'translate' },
  { id: 'personal_dev', label: 'Kişisel Gelişim', icon: 'account-star' },
  { id: 'leadership', label: 'Liderlik Eğitimi', icon: 'account-group' },
  { id: 'soft_skills', label: 'Soft Skills', icon: 'handshake' },

  // Diğer
  { id: 'orientation', label: 'Oryantasyon', icon: 'compass' },
  { id: 'alumni', label: 'Mezun Buluşması', icon: 'school' },
  { id: 'celebration', label: 'Kutlama', icon: 'cake-variant' },
  { id: 'meeting', label: 'Toplantı', icon: 'account-multiple-check' },
  { id: 'other', label: 'Diğer', icon: 'dots-horizontal-circle' },
];

export type EventCategory = typeof eventCategories[number];
