import { firestore } from './config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  arrayUnion, 
  arrayRemove, 
  serverTimestamp, 
  FieldPath,
  documentId,
  Timestamp 
} from 'firebase/firestore';

// Export firestore instance
export { firestore };

// Type alias for Timestamp
type FirestoreTimestamp = Timestamp;

// Types
export interface PostData {
  id?: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt?: FirestoreTimestamp;
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
  createdAt?: FirestoreTimestamp;
}

export interface EventData {
  id?: string;
  title: string;
  description: string;
  location: string;
  startDate: FirestoreTimestamp;
  endDate: FirestoreTimestamp;
  organizerId: string;
  organizerName: string;
  university: string;
  createdAt?: FirestoreTimestamp;
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
      createdAt: serverTimestamp(),
      likes: 0,
      comments: 0
    };
    return await addDoc(collection(firestore, 'posts'), newPost);
  } catch (error) {
    throw error;
  }
};

export const getUniversityPosts = async (universityId: string, limitCount = 20) => {
  try {
    const q = query(
      collection(firestore, 'posts'),
      where('university', '==', universityId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
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
    const likeRef = doc(firestore, 'likes', `${postId}_${userId}`);
    const likeDoc = await getDoc(likeRef);
    
    if (!likeDoc.exists()) {
      // Add like document
      await addDoc(collection(firestore, 'likes'), {
        postId,
        userId,
        createdAt: serverTimestamp()
      });
      
      // Update post like count
      const postRef = doc(firestore, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (postDoc.exists()) {
        const postData = postDoc.data();
        const currentLikes = postData?.likes || 0;
        await updateDoc(postRef, {
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
      createdAt: serverTimestamp(),
      attendees: 0
    };
    return await addDoc(collection(firestore, 'events'), newEvent);
  } catch (error) {
    throw error;
  }
};

export const getUniversityEvents = async (universityId: string, limitCount = 20) => {
  try {
    const q = query(
      collection(firestore, 'events'),
      where('university', '==', universityId),
      orderBy('startDate', 'asc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
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
    const attendeeRef = doc(firestore, 'attendees', `${eventId}_${userId}`);
    const attendeeDoc = await getDoc(attendeeRef);
    
    if (!attendeeDoc.exists()) {
      // Add attendee document
      await addDoc(collection(firestore, 'attendees'), {
        eventId,
        userId,
        createdAt: serverTimestamp()
      });
      
      // Update event attendee count
      const eventRef = doc(firestore, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        const currentAttendees = eventData?.attendees || 0;
        await updateDoc(eventRef, {
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
    // First check if already following
    const currentUserDoc = await getDoc(doc(firestore, 'users', currentUserId));
    const userData = currentUserDoc.data() || {};
    const following = userData.following || [];
    
    if (following.includes(targetUserId)) {
      console.log('User already follows this target');
      return true;
    }
    
    // Update current user's following list and count
    const currentUserRef = doc(firestore, 'users', currentUserId);
    await updateDoc(currentUserRef, {
      following: arrayUnion(targetUserId),
      followingCount: increment(1)
    });
    
    // Update target user's followers list and count
    const targetUserRef = doc(firestore, 'users', targetUserId);
    await updateDoc(targetUserRef, {
      followers: arrayUnion(currentUserId),
      followerCount: increment(1)
    });
    
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
    // First check if actually following
    const currentUserDoc = await getDoc(doc(firestore, 'users', currentUserId));
    const userData = currentUserDoc.data() || {};
    const following = userData.following || [];
    
    if (!following.includes(targetUserId)) {
      console.log('User does not follow this target');
      return true;
    }
    
    // Update current user's following list and count
    const currentUserRef = doc(firestore, 'users', currentUserId);
    await updateDoc(currentUserRef, {
      following: arrayRemove(targetUserId),
      followingCount: increment(-1)
    });
    
    // Update target user's followers list and count
    const targetUserRef = doc(firestore, 'users', targetUserId);
    await updateDoc(targetUserRef, {
      followers: arrayRemove(currentUserId),
      followerCount: increment(-1)
    });
    
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
    const userDoc = await getDoc(doc(firestore, 'users', userId));
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
      const q = query(
        collection(firestore, 'users'),
        where(documentId(), 'in', batch)
      );
      const querySnapshot = await getDocs(q);
      
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
    const userDoc = await getDoc(doc(firestore, 'users', userId));
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
      const q = query(
        collection(firestore, 'users'),
        where(documentId(), 'in', batch)
      );
      const querySnapshot = await getDocs(q);
      
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
    const userDoc = await getDoc(doc(firestore, 'users', userId));
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
      const q = query(
        collection(firestore, 'users'),
        where(documentId(), 'in', batch)
      );
      const querySnapshot = await getDocs(q);
      
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