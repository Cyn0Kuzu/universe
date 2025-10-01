import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

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
   * Bir üyenin kulüp içindeki aktivite istatistiklerini hesapla - GERÇEKZAMANLİ
   */
  private async calculateMemberStats(clubId: string, userId: string) {
    const db = firebase.firestore();
    
    let totalParticipation = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let lastActivity = firebase.firestore.Timestamp.now();

    console.log(`📊 Real-time calculating stats for user ${userId} in club ${clubId}`);

    try {
      // 1. Kulübün tüm etkinliklerini getir
      const eventsSnapshot = await db
        .collection('events')
        .where('clubId', '==', clubId)
        .get();

      console.log(`📅 Found ${eventsSnapshot.size} events for club ${clubId}`);

      for (const eventDoc of eventsSnapshot.docs) {
        const eventId = eventDoc.id;
        
        // 2. KATILIM - eventAttendees koleksiyonundan gerçek zamanlı kontrol
        const attendeeSnapshot = await db
          .collection('eventAttendees')
          .where('eventId', '==', eventId)
          .where('userId', '==', userId)
          .get();
        
        if (!attendeeSnapshot.empty) {
          totalParticipation++;
          console.log(`✅ User ${userId} participated in event ${eventId}`);
          
          // Son aktivite güncelle
          const attendeeData = attendeeSnapshot.docs[0]?.data();
          if (attendeeData?.joinedAt && attendeeData.joinedAt > lastActivity) {
            lastActivity = attendeeData.joinedAt;
          }
        }

        // 3. BEĞENİ - eventLikes koleksiyonundan gerçek zamanlı kontrol
        const likeSnapshot = await db
          .collection('eventLikes')
          .where('eventId', '==', eventId)
          .where('userId', '==', userId)
          .get();
        
        if (!likeSnapshot.empty) {
          totalLikes++;
          console.log(`❤️ User ${userId} liked event ${eventId}`);
          
          // Son aktivite güncelle
          const likeData = likeSnapshot.docs[0]?.data();
          if (likeData?.timestamp && likeData.timestamp > lastActivity) {
            lastActivity = likeData.timestamp;
          }
        }

        // 4. YORUM - events/{eventId}/comments alt koleksiyonundan gerçek zamanlı kontrol
        const commentsSnapshot = await db
          .collection('events')
          .doc(eventId)
          .collection('comments')
          .where('userId', '==', userId)
          .get();
        
        if (!commentsSnapshot.empty) {
          totalComments += commentsSnapshot.size;
          console.log(`💬 User ${userId} has ${commentsSnapshot.size} comments in event ${eventId}`);
          
          // Son aktivite güncelle - en son yorumu al
          const sortedComments = commentsSnapshot.docs.sort((a, b) => {
            const aTime = a.data()?.createdAt || firebase.firestore.Timestamp.now();
            const bTime = b.data()?.createdAt || firebase.firestore.Timestamp.now();
            return bTime.seconds - aTime.seconds;
          });
          
          if (sortedComments.length > 0) {
            const latestComment = sortedComments[0]?.data();
            if (latestComment?.createdAt && latestComment.createdAt > lastActivity) {
              lastActivity = latestComment.createdAt;
            }
          }
        }
      }

      console.log(`📊 Final stats for user ${userId}:`, {
        totalParticipation,
        totalLikes,
        totalComments,
        lastActivity: lastActivity.toDate()
      });

    } catch (error) {
      console.error(`❌ Error calculating real-time stats for user ${userId} in club ${clubId}:`, error);
    }

    return {
      totalParticipation,
      totalLikes,
      totalComments,
      lastActivity
    };
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
