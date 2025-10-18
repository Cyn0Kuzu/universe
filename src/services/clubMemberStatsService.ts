import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { performanceOptimizer } from '../utils/performanceOptimizer';
import { optimizedFirebase } from './optimizedFirebaseService';

export interface MemberStats {
  id: string;
  userId: string;
  userName: string;
  firstName?: string;          // Ad
  lastName?: string;           // Soyad
  username?: string;           // Kullanıcı adı
  userAvatar?: string;
  userHandle?: string;         // Kullanıcı adı (@username) - geriye uyumluluk için
  university?: string;         // Üniversite bilgisi
  totalParticipation: number;  // Katılım
  totalLikes: number;          // Beğeni
  totalComments: number;       // Yorum
  lastActivity: firebase.firestore.Timestamp;
  rank: number;
}

export interface ClubMemberStatsFilter {
  limit?: number;
  orderBy?: 'totalScore' | 'totalParticipation' | 'totalLikes' | 'totalComments';
  searchQuery?: string;
}

export class ClubMemberStatsService {
  private static instance: ClubMemberStatsService;

  static getInstance(): ClubMemberStatsService {
    if (!ClubMemberStatsService.instance) {
      ClubMemberStatsService.instance = new ClubMemberStatsService();
    }
    return ClubMemberStatsService.instance;
  }

  /**
   * Kulübün üye istatistiklerini getir - GERÇEKZAMANLİ VERİLER
   */
  async getClubMemberStats(
    clubId: string, 
    filter: ClubMemberStatsFilter = {}
  ): Promise<MemberStats[]> {
    console.log(`🔄 Getting REAL-TIME club member stats for club ${clubId}`, filter);
    
    try {
      const db = firebase.firestore();
      const { limit = 7, orderBy = 'totalParticipation' } = filter;

      // ✅ FIXED: Sadece onaylı kulüp üyelerinin istatistiklerini göster
      // Followers veya event participants değil, sadece approved club members
      const membersSnapshot = await db
        .collection('clubMembers')
        .where('clubId', '==', clubId)
        .where('status', '==', 'approved')
        .get();
      
      // Sadece onaylı üyelerin ID'lerini al
      const approvedMemberIds = new Set<string>();
      
      membersSnapshot.docs.forEach(doc => {
        const memberData = doc.data();
        if (memberData.userId) {
          approvedMemberIds.add(memberData.userId);
        }
      });

      if (approvedMemberIds.size === 0) {
        console.log(`ℹ️ No approved members found for club ${clubId}`);
        return [];
      }

      console.log(`� Found ${approvedMemberIds.size} approved members for club ${clubId}`);

      // Sadece approved member'lar için GERÇEK ZAMANLI istatistik hesapla
      const memberPromises = Array.from(approvedMemberIds).map(async (userId) => {
        try {
          // Kullanıcı bilgilerini al
          const userDoc = await db.collection('users').doc(userId).get();
          const userData = userDoc.data();

          if (!userData) {
            console.warn(`⚠️ User data not found for approved member: ${userId}`);
            return null;
          }

          // GERÇEK ZAMANLI istatistikleri hesapla
          const stats = await this.calculateMemberStats(clubId, userId);
          
          // İsim bilgilerini düzenle
          const firstName = userData?.firstName || '';
          const lastName = userData?.lastName || '';
          const fullName = firstName && lastName ? `${firstName} ${lastName}` : 
                          userData?.displayName || userData?.username || userData?.name || 'İsimsiz Kullanıcı';
          
          return {
            id: userId,
            userId: userId,
            userName: fullName,
            firstName: firstName,
            lastName: lastName,
            username: userData?.username || userData?.userName || userData?.email?.split('@')[0] || '',
            university: userData?.university || 'Üniversite Belirtilmemiş',
            userAvatar: userData?.photoURL || userData?.profileImage || userData?.profilePicture,
            userHandle: userData?.username || userData?.userName || userData?.email?.split('@')[0],
            totalParticipation: stats.totalParticipation,
            totalLikes: stats.totalLikes,
            totalComments: stats.totalComments,
            lastActivity: stats.lastActivity,
            rank: 0 // Will be calculated after sorting
          } as MemberStats;

        } catch (memberError) {
          console.error(`❌ Error processing approved member ${userId}:`, memberError);
          return null;
        }
      });

      // Tüm üye işlemlerini paralel olarak çalıştır
      const resolvedMembers = await Promise.all(memberPromises);
      
      // Null değerleri filtrele
      const validMembers = resolvedMembers.filter(member => member !== null) as MemberStats[];

      if (validMembers.length === 0) {
        console.log(`ℹ️ No valid member stats calculated for club ${clubId}`);
        return [];
      }

      console.log(`📊 Calculated real-time stats for ${validMembers.length} members`);

      // Sıralama yap - gerçek zamanlı verilerle
      validMembers.sort((a, b) => {
        switch (orderBy) {
          case 'totalParticipation':
            return b.totalParticipation - a.totalParticipation;
          case 'totalLikes':
            return b.totalLikes - a.totalLikes;
          case 'totalComments':
            return b.totalComments - a.totalComments;
          default:
            // Toplam aktivite ile sırala (katılım + beğeni + yorum)
            const aTotal = a.totalParticipation + a.totalLikes + a.totalComments;
            const bTotal = b.totalParticipation + b.totalLikes + b.totalComments;
            return bTotal - aTotal;
        }
      });

      // Rank'leri ata
      validMembers.forEach((member, index) => {
        member.rank = index + 1;
      });

      // Arama filtresi uygula
      let filteredStats = validMembers;
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        filteredStats = validMembers.filter(member =>
          member.userName.toLowerCase().includes(query) ||
          (member.username && member.username.toLowerCase().includes(query)) ||
          (member.university && member.university.toLowerCase().includes(query))
        );
      }

      // Limit uygula
      const limitedStats = filteredStats.slice(0, limit);

      console.log(`✅ Club member stats loaded: ${limitedStats.length} approved members for club ${clubId}`);
      return limitedStats;

    } catch (error) {
      console.error('Error loading club member stats:', error);
      return [];
    }
  }

  /**
   * Bir üyenin kulüp içindeki aktivite istatistiklerini hesapla - OPTIMIZED
   */
  private async calculateMemberStats(clubId: string, userId: string) {
    return performanceOptimizer.executeAsync(async () => {
      const db = firebase.firestore();
      
      let totalParticipation = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let lastActivity = firebase.firestore.Timestamp.now();

      console.log(`📊 Real-time calculating stats for user ${userId} in club ${clubId}`);

      try {
        // 1. Kulübün tüm etkinliklerini getir - optimized
        const eventsResult = await optimizedFirebase.readCollection('events', {
          where: [{ field: 'clubId', operator: '==', value: clubId }],
          limit: 50 // Limit to prevent excessive queries
        });

        console.log(`📅 Found ${eventsResult.data.length} events for club ${clubId}`);

        // Batch process events to prevent main thread blocking
        const eventIds = eventsResult.data.map(event => event.id);
        
        // Process events in batches
        const batchSize = 10;
        for (let i = 0; i < eventIds.length; i += batchSize) {
          const batch = eventIds.slice(i, i + batchSize);
          
          // Process batch in parallel
          const batchPromises = batch.map(async (eventId) => {
            // 2. KATILIM - eventAttendees koleksiyonundan gerçek zamanlı kontrol
            const attendeeResult = await optimizedFirebase.readCollection('eventAttendees', {
              where: [
                { field: 'eventId', operator: '==', value: eventId },
                { field: 'userId', operator: '==', value: userId }
              ],
              limit: 1
            });
            
            if (attendeeResult.data.length > 0) {
              totalParticipation++;
              console.log(`✅ User ${userId} participated in event ${eventId}`);
              
              // Son aktivite güncelle
              const attendeeData = attendeeResult.data[0];
              if (attendeeData?.joinedAt && attendeeData.joinedAt > lastActivity) {
                lastActivity = attendeeData.joinedAt;
              }
            }

            // 3. BEĞENİ - eventLikes koleksiyonundan gerçek zamanlı kontrol
            const likeResult = await optimizedFirebase.readCollection('eventLikes', {
              where: [
                { field: 'eventId', operator: '==', value: eventId },
                { field: 'userId', operator: '==', value: userId }
              ],
              limit: 1
            });
            
            if (likeResult.data.length > 0) {
              totalLikes++;
              console.log(`❤️ User ${userId} liked event ${eventId}`);
              
              // Son aktivite güncelle
              const likeData = likeResult.data[0];
              if (likeData?.timestamp && likeData.timestamp > lastActivity) {
                lastActivity = likeData.timestamp;
              }
            }

            // 4. YORUM - events/{eventId}/comments alt koleksiyonundan gerçek zamanlı kontrol
            const commentsResult = await optimizedFirebase.readCollection(`events/${eventId}/comments`, {
              where: [{ field: 'userId', operator: '==', value: userId }],
              limit: 10
            });
            
            if (commentsResult.data.length > 0) {
              totalComments += commentsResult.data.length;
              console.log(`💬 User ${userId} has ${commentsResult.data.length} comments in event ${eventId}`);
              
              // Son aktivite güncelle - en son yorumu al
              const sortedComments = commentsResult.data.sort((a, b) => {
                const aTime = a.createdAt || firebase.firestore.Timestamp.now();
                const bTime = b.createdAt || firebase.firestore.Timestamp.now();
                return bTime.seconds - aTime.seconds;
              });
              
              if (sortedComments.length > 0) {
                const latestComment = sortedComments[0];
                if (latestComment?.createdAt && latestComment.createdAt > lastActivity) {
                  lastActivity = latestComment.createdAt;
                }
              }
            }
          });

          // Wait for batch to complete
          await Promise.all(batchPromises);
          
          // Small delay to prevent main thread blocking
          if (i + batchSize < eventIds.length) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }

        console.log(`📊 Final stats for user ${userId}:`, {
          totalParticipation,
          totalLikes,
          totalComments,
          lastActivity: lastActivity.toDate()
        });

        return {
          totalParticipation,
          totalLikes,
          totalComments,
          lastActivity
        };

      } catch (error) {
        console.error(`❌ Error calculating real-time stats for user ${userId} in club ${clubId}:`, error);
        return {
          totalParticipation: 0,
          totalLikes: 0,
          totalComments: 0,
          lastActivity: firebase.firestore.Timestamp.now()
        };
      }
    }, 'low');
  }

  /**
   * Kulüp üyelerinde arama yap
   */
  async searchClubMembers(
    clubId: string,
    searchQuery: string,
    limit: number = 50
  ): Promise<MemberStats[]> {
    return this.getClubMemberStats(clubId, {
      searchQuery,
      limit
    });
  }
}

export const clubMemberStatsService = ClubMemberStatsService.getInstance();
