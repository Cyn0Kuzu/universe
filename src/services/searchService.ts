import { firebase } from '../firebase/config';
import { NetworkManager } from '../utils/networkManager';
import { SecureStorage } from '../utils/secureStorage';

export interface SearchResult {
  id: string;
  type: 'event' | 'club' | 'user';
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  avatarIcon?: string;
  avatarColor?: string;
  university?: string;
  category?: string;
  date?: Date;
  clubName?: string;
  location?: string;
  participantCount?: number;
  followerCount?: number;
  memberCount?: number;
  userType?: string;
  isVerified?: boolean;
  relevanceScore?: number;
}

export interface SearchFilters {
  type?: 'all' | 'event' | 'club' | 'user';
  university?: string;
  category?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  location?: string;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'alphabetical';
  limit?: number;
}

export class SearchService {
  private static instance: SearchService;
  private searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Ana arama fonksiyonu
   */
  async search(query: string, filters: SearchFilters = {}): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const cacheKey = this.generateCacheKey(query, filters);
    
    // Cache kontrolü
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('🔍 Returning cached search results');
      return cached.results;
    }

    try {
      console.log('🔍 Performing new search:', { query, filters });
      
      const results = await NetworkManager.handleApiCall(
        () => this.performSearch(query, filters),
        {
          cacheKey: `search_${cacheKey}`,
          offlineMessage: 'Arama özelliği offline modda çalışmıyor',
          retryCount: 2
        }
      );

      if (results.success && results.data) {
        // Cache'e kaydet
        this.searchCache.set(cacheKey, {
          results: results.data,
          timestamp: Date.now()
        });

        return results.data;
      }

      return [];
    } catch (error) {
      console.error('❌ Search error:', error);
      return [];
    }
  }

  /**
   * Gerçek arama işlemini yapar
   */
  private async performSearch(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    const searchTerms = this.prepareSearchTerms(query);
    const allResults: SearchResult[] = [];

    // Paralel arama yapalım
    const searchPromises: Promise<SearchResult[]>[] = [];

    if (filters.type === 'all' || filters.type === 'event' || !filters.type) {
      searchPromises.push(this.searchEvents(searchTerms, filters));
    }

    if (filters.type === 'all' || filters.type === 'club' || !filters.type) {
      searchPromises.push(this.searchClubs(searchTerms, filters));
    }

    if (filters.type === 'all' || filters.type === 'user' || !filters.type) {
      searchPromises.push(this.searchUsers(searchTerms, filters));
    }

    const results = await Promise.allSettled(searchPromises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      }
    });

    // Sonuçları sırala ve filtrele
    return this.sortAndFilterResults(allResults, filters);
  }

  /**
   * Etkinlik arama
   */
  private async searchEvents(searchTerms: string[], filters: SearchFilters): Promise<SearchResult[]> {
    const db = firebase.firestore();
    let query = db.collection('events').where('isActive', '==', true);

    // Üniversite filtresi
    if (filters.university) {
      query = query.where('university', '==', filters.university);
    }

    // Kategori filtresi
    if (filters.category) {
      query = query.where('category', '==', filters.category);
    }

    // Tarih filtresi
    if (filters.dateRange?.start) {
      query = query.where('date', '>=', filters.dateRange.start);
    }
    if (filters.dateRange?.end) {
      query = query.where('date', '<=', filters.dateRange.end);
    }

    const snapshot = await query.limit(filters.limit || 50).get();
    const results: SearchResult[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const relevanceScore = this.calculateRelevance(searchTerms, [
        data.title,
        data.description,
        data.clubName,
        data.location,
        data.category
      ]);

      if (relevanceScore > 0) {
        results.push({
          id: doc.id,
          type: 'event',
          title: data.title,
          subtitle: data.clubName,
          description: data.description,
          imageUrl: data.imageUrl,
          university: data.university,
          category: data.category,
          date: data.date?.toDate(),
          location: data.location,
          participantCount: data.participantCount || 0,
          relevanceScore
        });
      }
    });

    return results;
  }

  /**
   * Kulüp arama
   */
  private async searchClubs(searchTerms: string[], filters: SearchFilters): Promise<SearchResult[]> {
    const db = firebase.firestore();
    let query = db.collection('users').where('userType', '==', 'club');

    if (filters.university) {
      query = query.where('university', '==', filters.university);
    }

    const snapshot = await query.limit(filters.limit || 50).get();
    const results: SearchResult[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const relevanceScore = this.calculateRelevance(searchTerms, [
        data.displayName,
        data.clubName,
        data.bio,
        data.description,
        data.clubTypes?.join(' '),
        data.university
      ]);

      if (relevanceScore > 0) {
        results.push({
          id: doc.id,
          type: 'club',
          title: data.displayName || data.clubName,
          subtitle: data.university,
          description: data.bio || data.description,
          imageUrl: data.profileImage,
          avatarIcon: data.avatarIcon,
          avatarColor: data.avatarColor,
          university: data.university,
          memberCount: data.memberCount || 0,
          followerCount: data.followerCount || 0,
          isVerified: data.isVerified,
          relevanceScore
        });
      }
    });

    return results;
  }

  /**
   * Kullanıcı arama
   */
  private async searchUsers(searchTerms: string[], filters: SearchFilters): Promise<SearchResult[]> {
    const db = firebase.firestore();
    let query = db.collection('users').where('userType', '==', 'student');

    if (filters.university) {
      query = query.where('university', '==', filters.university);
    }

    const snapshot = await query.limit(filters.limit || 50).get();
    const results: SearchResult[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const relevanceScore = this.calculateRelevance(searchTerms, [
        data.displayName,
        data.firstName,
        data.lastName,
        data.username,
        data.email,
        data.university,
        data.department,
        data.bio
      ]);

      if (relevanceScore > 0) {
        results.push({
          id: doc.id,
          type: 'user',
          title: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.username || 'Kullanıcı',
          subtitle: `${data.university || ''}${data.university && data.department ? ' • ' : ''}${data.department || ''}`,
          description: data.bio || '',
          imageUrl: data.profileImage,
          avatarIcon: data.avatarIcon,
          avatarColor: data.avatarColor,
          university: data.university,
          userType: data.userType,
          followerCount: data.followerCount || 0,
          relevanceScore
        });
      }
    });

    return results;
  }

  /**
   * Arama terimlerini hazırla
   */
  private prepareSearchTerms(query: string): string[] {
    return query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(term => term.length > 1);
  }

  /**
   * İlgililik skoru hesapla
   */
  private calculateRelevance(searchTerms: string[], fields: (string | undefined)[]): number {
    let score = 0;
    const content = fields.filter(field => field).join(' ').toLowerCase();

    searchTerms.forEach(term => {
      if (content.includes(term)) {
        // Tam eşleşme için bonus
        if (content.includes(` ${term} `) || content.startsWith(term) || content.endsWith(term)) {
          score += 2;
        } else {
          score += 1;
        }
      }
    });

    return score;
  }

  /**
   * Sonuçları sırala ve filtrele
   */
  private sortAndFilterResults(results: SearchResult[], filters: SearchFilters): SearchResult[] {
    // Önce alakasız sonuçları filtrele
    let filteredResults = results.filter(result => (result.relevanceScore || 0) > 0);

    // Sıralama
    switch (filters.sortBy) {
      case 'date':
        filteredResults.sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return b.date.getTime() - a.date.getTime();
        });
        break;
      case 'popularity':
        filteredResults.sort((a, b) => {
          const aPopularity = (a.participantCount || 0) + (a.followerCount || 0) + (a.memberCount || 0);
          const bPopularity = (b.participantCount || 0) + (b.followerCount || 0) + (b.memberCount || 0);
          return bPopularity - aPopularity;
        });
        break;
      case 'alphabetical':
        filteredResults.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
        break;
      case 'relevance':
      default:
        filteredResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        break;
    }

    // Limit uygula
    return filteredResults.slice(0, filters.limit || 20);
  }

  /**
   * Cache key oluştur
   */
  private generateCacheKey(query: string, filters: SearchFilters): string {
    return `${query}_${JSON.stringify(filters)}`;
  }

  /**
   * Cache'i temizle
   */
  clearCache(): void {
    this.searchCache.clear();
    console.log('🗑️ Search cache cleared');
  }

  /**
   * Popüler arama önerilerini getir
   */
  async getPopularSuggestions(limit: number = 10): Promise<string[]> {
    // Bu gerçek bir implementasyon için popüler arama terimlerini
    // veritabanından çekebilirsiniz
    return [
      'teknoloji etkinlikleri',
      'spor kulüpleri',
      'sanat atölyeleri',
      'kodlama',
      'müzik',
      'dans',
      'fotoğrafçılık',
      'tiyatro',
      'bilim',
      'edebiyat'
    ].slice(0, limit);
  }

  /**
   * Son aramaları getir
   */
  async getRecentSearches(): Promise<string[]> {
    try {
      const recent = await SecureStorage.getCache('recent_searches') || [];
      return Array.isArray(recent) ? recent : [];
    } catch (error) {
      console.error('❌ Failed to get recent searches:', error);
      return [];
    }
  }

  /**
   * Popüler aramaları getir
   */
  async getPopularSearches(): Promise<string[]> {
    try {
      // Bu gerçek implementasyonda analytics'den gelecek
      const popular = [
        'teknoloji', 'müzik', 'spor', 'sanat', 'bilim',
        'yazılım', 'etkinlik', 'konser', 'workshop'
      ];
      return popular;
    } catch (error) {
      console.error('❌ Failed to get popular searches:', error);
      return [];
    }
  }

  /**
   * Son arama ekle
   */
  async addRecentSearch(query: string): Promise<void> {
    try {
      if (!query.trim()) return;
      
      const recent = await this.getRecentSearches();
      const filtered = recent.filter(item => item !== query);
      const updated = [query, ...filtered].slice(0, 10); // Son 10 arama
      
      await SecureStorage.setCache('recent_searches', updated, 24 * 60); // 24 saat
    } catch (error) {
      console.error('❌ Failed to add recent search:', error);
    }
  }

  /**
   * Son aramaları temizle
   */
  async clearRecentSearches(): Promise<void> {
    try {
      await SecureStorage.setCache('recent_searches', [], 1);
    } catch (error) {
      console.error('❌ Failed to clear recent searches:', error);
    }
  }
}

export default SearchService.getInstance();
