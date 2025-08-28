import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

interface ScoringResult {
  totalScore: number;
  breakdown: {
    likes: number;
    comments: number;
    participations: number;
    eventOrganizing: number;
    socialInteractions: number;
  };
}

class UnifiedScoringService {
  // Calculate user score based on various activities
  async calculateUserScore(userId: string): Promise<ScoringResult> {
    try {
      const [
        likesSnapshot,
        commentsSnapshot,
        participationsSnapshot,
        eventsSnapshot,
        followersSnapshot
      ] = await Promise.all([
        firebase.firestore().collection('eventLikes').where('userId', '==', userId).get(),
        firebase.firestore().collection('eventComments').where('userId', '==', userId).get(),
        firebase.firestore().collection('eventAttendees').where('userId', '==', userId).get(),
        firebase.firestore().collection('events').where('organizerId', '==', userId).get(),
        firebase.firestore().collection('userFollowers').where('followedUserId', '==', userId).get()
      ]);

      const likesScore = likesSnapshot.size * 1;
      const commentsScore = commentsSnapshot.size * 2;
      const participationsScore = participationsSnapshot.size * 3;
      const eventOrganizingScore = eventsSnapshot.size * 5;
      const socialInteractionsScore = followersSnapshot.size * 1;

      const totalScore = likesScore + commentsScore + participationsScore + eventOrganizingScore + socialInteractionsScore;

      return {
        totalScore,
        breakdown: {
          likes: likesScore,
          comments: commentsScore,
          participations: participationsScore,
          eventOrganizing: eventOrganizingScore,
          socialInteractions: socialInteractionsScore
        }
      };
    } catch (error) {
      console.error('Error calculating user score:', error);
      return {
        totalScore: 0,
        breakdown: {
          likes: 0,
          comments: 0,
          participations: 0,
          eventOrganizing: 0,
          socialInteractions: 0
        }
      };
    }
  }

  // Calculate club score
  async calculateClubScore(clubId: string): Promise<ScoringResult> {
    try {
      const [
        eventsSnapshot,
        membersSnapshot,
        followersSnapshot
      ] = await Promise.all([
        firebase.firestore().collection('events').where('organizerId', '==', clubId).get(),
        firebase.firestore().collection('clubMemberships').where('clubId', '==', clubId).where('status', '==', 'approved').get(),
        firebase.firestore().collection('clubFollowers').where('clubId', '==', clubId).get()
      ]);

      // Calculate total interactions on club events
      let totalLikes = 0;
      let totalComments = 0;
      let totalParticipations = 0;

      for (const eventDoc of eventsSnapshot.docs) {
        const [likesSnapshot, commentsSnapshot, attendeesSnapshot] = await Promise.all([
          firebase.firestore().collection('eventLikes').where('eventId', '==', eventDoc.id).get(),
          firebase.firestore().collection('eventComments').where('eventId', '==', eventDoc.id).get(),
          firebase.firestore().collection('eventAttendees').where('eventId', '==', eventDoc.id).get()
        ]);

        totalLikes += likesSnapshot.size;
        totalComments += commentsSnapshot.size;
        totalParticipations += attendeesSnapshot.size;
      }

      const likesScore = totalLikes * 1;
      const commentsScore = totalComments * 2;
      const participationsScore = totalParticipations * 3;
      const eventOrganizingScore = eventsSnapshot.size * 10;
      const socialInteractionsScore = (membersSnapshot.size * 2) + (followersSnapshot.size * 1);

      const totalScore = likesScore + commentsScore + participationsScore + eventOrganizingScore + socialInteractionsScore;

      return {
        totalScore,
        breakdown: {
          likes: likesScore,
          comments: commentsScore,
          participations: participationsScore,
          eventOrganizing: eventOrganizingScore,
          socialInteractions: socialInteractionsScore
        }
      };
    } catch (error) {
      console.error('Error calculating club score:', error);
      return {
        totalScore: 0,
        breakdown: {
          likes: 0,
          comments: 0,
          participations: 0,
          eventOrganizing: 0,
          socialInteractions: 0
        }
      };
    }
  }
}

export const unifiedScoringService = new UnifiedScoringService();
export default unifiedScoringService;
