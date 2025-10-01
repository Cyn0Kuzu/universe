import { firebase, firestore } from './config';
// Modern scoring system available globally

// Export firestore instance
export { firestore };

// Type alias for Timestamp
type Timestamp = firebase.firestore.Timestamp;

// Types
export interface PostData {
  id?: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt?: Timestamp;
  likes?: number;
  comments?: number;
  media?: string[];
  university?: string;
}

export interface CommentData {
  id?: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt?: Timestamp;
}

export interface EventData {
  id?: string;
  title: string;
  description: string;
  location: string;
  startDate: Timestamp;
  endDate: Timestamp;
  organizerId: string;
  organizerName: string;
  university: string;
  createdAt?: Timestamp;
  attendees?: number;
  coverImage?: string;
}

export interface UserData {
  id?: string;
  email: string;
  fullName: string;
  displayName?: string;
  profileImage?: string;
  bio?: string;
  university?: string;
  department?: string;
  classLevel?: string;
  userType: 'student' | 'club';
  followers?: string[];
  followerCount?: number;
  following?: string[];
  followedClubs?: string[];
}

// Posts
export const createPost = async (postData: PostData) => {
  try {
    const newPost = {
      ...postData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      likes: 0,
      comments: 0
    };
    return await firestore.collection('posts').add(newPost);
  } catch (error) {
    throw error;
  }
};

export const getUniversityPosts = async (universityId: string, limitCount = 20) => {
  try {
    const querySnapshot = await firestore.collection('posts')
      .where('university', '==', universityId)
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

export const likePost = async (postId: string, userId: string) => {
  try {
    // First check if user already liked the post
    const likeRef = firestore.collection('likes').doc(`${postId}_${userId}`);
    const likeDoc = await likeRef.get();
    
    if (!likeDoc.exists) {
      // Add like document
      await firestore.collection('likes').add({
        postId,
        userId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update post like count
      const postRef = firestore.collection('posts').doc(postId);
      const postDoc = await postRef.get();
      
      if (postDoc.exists) {
        const postData = postDoc.data();
        const currentLikes = postData?.likes || 0;
        await postRef.update({
          likes: currentLikes + 1
        });
      }
      
      return true;
    }
    return false;
  } catch (error) {
    throw error;
  }
};

// Events
export const createEvent = async (eventData: EventData) => {
  try {
    const newEvent = {
      ...eventData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      attendees: 0
    };
    return await firestore.collection('events').add(newEvent);
  } catch (error) {
    throw error;
  }
};

export const getUniversityEvents = async (universityId: string, limitCount = 20) => {
  try {
    const querySnapshot = await firestore.collection('events')
      .where('university', '==', universityId)
      .orderBy('startDate', 'asc')
      .limit(limitCount)
      .get();
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

export const attendEvent = async (eventId: string, userId: string) => {
  try {
    // First check if user already attending the event
    const attendeeRef = firestore.collection('attendees').doc(`${eventId}_${userId}`);
    const attendeeDoc = await attendeeRef.get();
    
    if (!attendeeDoc.exists) {
      // Add attendee document
      await firestore.collection('attendees').add({
        eventId,
        userId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update event attendee count
      const eventRef = firestore.collection('events').doc(eventId);
      const eventDoc = await eventRef.get();
      
      if (eventDoc.exists) {
        const eventData = eventDoc.data();
        const currentAttendees = eventData?.attendees || 0;
        await eventRef.update({
          attendees: currentAttendees + 1
        });
      }
      
      return true;
    }
    return false;
  } catch (error) {
    throw error;
  }
};

// Follow/Unfollow functions
export const followUser = async (currentUserId: string, targetUserId: string) => {
  if (currentUserId === targetUserId) return;
  
  try {
    const db = firebase.firestore();
    
    // First check if already following
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    const userData = currentUserDoc.data() || {};
    const following = userData.following || [];
    
    if (following.includes(targetUserId)) {
      console.log('User already follows this target');
      return true;
    }
    
    const batch = db.batch();
    
    // Update current user's following list and count
    const currentUserRef = db.collection('users').doc(currentUserId);
    batch.update(currentUserRef, {
      following: firebase.firestore.FieldValue.arrayUnion(targetUserId),
      followingCount: firebase.firestore.FieldValue.increment(1)
    });
    
    // Update target user's followers list and count
    const targetUserRef = db.collection('users').doc(targetUserId);
    batch.update(targetUserRef, {
      followers: firebase.firestore.FieldValue.arrayUnion(currentUserId),
      followerCount: firebase.firestore.FieldValue.increment(1)
    });
    
    await batch.commit();
    console.log('Successfully followed user - updated both users');
    return true;
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  if (currentUserId === targetUserId) return;
  
  try {
    const db = firebase.firestore();
    
    // First check if actually following
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    const userData = currentUserDoc.data() || {};
    const following = userData.following || [];
    
    if (!following.includes(targetUserId)) {
      console.log('User does not follow this target');
      return true;
    }
    
    const batch = db.batch();
    
    // Update current user's following list and count
    const currentUserRef = db.collection('users').doc(currentUserId);
    batch.update(currentUserRef, {
      following: firebase.firestore.FieldValue.arrayRemove(targetUserId),
      followingCount: firebase.firestore.FieldValue.increment(-1)
    });
    
    // Update target user's followers list and count
    const targetUserRef = db.collection('users').doc(targetUserId);
    batch.update(targetUserRef, {
      followers: firebase.firestore.FieldValue.arrayRemove(currentUserId),
      followerCount: firebase.firestore.FieldValue.increment(-1)
    });
    
    await batch.commit();
    console.log('Successfully unfollowed user - updated both users');
    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
};

export const followClub = async (userId: string, clubId: string) => {
  if (userId === clubId) return;
  
  try {
    console.log('SIMPLIFIED: Follow club functionality - local state only');
    console.log(`User ${userId} following club ${clubId}`);
    
    // For now, just return success to update UI state
    // Database operations are disabled to avoid permission issues
    // When permissions are properly configured, enable full database sync
    
    console.log('Follow club completed (local state only)');
    return true;
    
    // TEMPORARILY DISABLED: Puanlama sistemi entegrasyonu - follow club
    // try {
    //   const clubDoc = await clubRef.get();
    //   const clubData = clubDoc.data();
    //   await unifiedScoringService.followClub(userId, clubId, {
    //     clubName: clubData?.clubName || clubData?.displayName
    //   });
    // } catch (scoringError) {
    //   console.warn('Follow club scoring failed:', scoringError);
    // }
    
    console.log('Follow club completed (local state only)');
    return true;
  } catch (error) {
    console.error('Error following club:', error);
    throw error;
  }
};

export const unfollowClub = async (userId: string, clubId: string) => {
  if (userId === clubId) return;
  
  try {
    console.log('SIMPLIFIED: Unfollow club functionality - local state only');
    console.log(`User ${userId} unfollowing club ${clubId}`);
    
    // For now, just return success to update UI state
    // Database operations are disabled to avoid permission issues
    // When permissions are properly configured, enable full database sync
    
    console.log('Unfollow club completed (local state only)');
    return true;
  } catch (error) {
    console.error('Error unfollowing club:', error);
    throw error;
  }
};

// Get followers list
export const getFollowers = async (userId: string) => {
  try {
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData || !userData.followers || !Array.isArray(userData.followers)) {
      return [];
    }
    
    const followerIds = userData.followers;
    
    if (followerIds.length === 0) {
      return [];
    }
    
    // Get followers in batches (Firestore allows max 10 items in 'in' queries)
    const batchSize = 10;
    let allFollowers: any[] = [];
    
    for (let i = 0; i < followerIds.length; i += batchSize) {
      const batch = followerIds.slice(i, i + batchSize);
      const querySnapshot = await firestore.collection('users')
        .where(firebase.firestore.FieldPath.documentId(), 'in', batch)
        .get();
      
      const batchFollowers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      allFollowers = [...allFollowers, ...batchFollowers];
    }
    
    return allFollowers;
  } catch (error) {
    console.error('Error getting followers:', error);
    throw error;
  }
};

// Get following list
export const getFollowing = async (userId: string) => {
  try {
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData || !userData.following || !Array.isArray(userData.following)) {
      return [];
    }
    
    const followingIds = userData.following;
    
    if (followingIds.length === 0) {
      return [];
    }
    
    // Get following in batches (Firestore allows max 10 items in 'in' queries)
    const batchSize = 10;
    let allFollowing: any[] = [];
    
    for (let i = 0; i < followingIds.length; i += batchSize) {
      const batch = followingIds.slice(i, i + batchSize);
      const querySnapshot = await firestore.collection('users')
        .where(firebase.firestore.FieldPath.documentId(), 'in', batch)
        .get();
      
      const batchFollowing = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      allFollowing = [...allFollowing, ...batchFollowing];
    }
    
    return allFollowing;
  } catch (error) {
    console.error('Error getting following:', error);
    throw error;
  }
};

// Get followed clubs
export const getFollowedClubs = async (userId: string) => {
  try {
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData || !userData.followedClubs || !Array.isArray(userData.followedClubs)) {
      return [];
    }
    
    const clubIds = userData.followedClubs;
    
    if (clubIds.length === 0) {
      return [];
    }
    
    // Get clubs in batches
    const batchSize = 10;
    let allClubs: any[] = [];
    
    for (let i = 0; i < clubIds.length; i += batchSize) {
      const batch = clubIds.slice(i, i + batchSize);
      const querySnapshot = await firestore.collection('users')
        .where(firebase.firestore.FieldPath.documentId(), 'in', batch)
        .get();
      
      const batchClubs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      allClubs = [...allClubs, ...batchClubs];
    }
    
    return allClubs;
  } catch (error) {
    console.error('Error getting followed clubs:', error);
    throw error;
  }
};
