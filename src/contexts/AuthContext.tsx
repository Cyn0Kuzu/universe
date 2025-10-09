import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { firebase, auth, getUserProfile, checkEmailVerification } from '../firebase';
import { refreshUserProfileCounts } from '../firebase/userProfile';
// Modern scoring system will handle user scoring
import FirebaseAuthPersistenceManager from '../firebase/authPersistenceManager';
import { SecureStorage } from '../utils/secureStorage';
import { NetworkManager } from '../utils/networkManager';
import 'firebase/compat/auth';

interface AuthContextType {
  currentUser: firebase.User | null;
  userProfile: any | null;
  loading: boolean;
  isEmailVerified: boolean;
  checkVerification: () => Promise<boolean>;
  isClubAccount: boolean;
  refreshUserProfile: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  isEmailVerified: false,
  checkVerification: async () => false,
  isClubAccount: false,
  refreshUserProfile: async () => {},
  refreshUserData: async () => {},
  signIn: async () => ({ success: false, error: 'Context not initialized' }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Helper function to normalize date fields in profile data
const normalizeProfileDates = (profile: any) => {
  if (!profile) return profile;
  
  // Convert createdAt to proper Date object if it's not already
  if (profile.createdAt) {
    // Handle Firestore Timestamp
    if (profile.createdAt.seconds) {
      profile.createdAt = new Date(profile.createdAt.seconds * 1000);
    } else if (typeof profile.createdAt === 'string') {
      profile.createdAt = new Date(profile.createdAt);
    }
  }
  
  return profile;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<firebase.User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const userDocUnsubRef = React.useRef<null | (() => void)>(null);

  // Track if auth has been initialized to prevent multiple initialization attempts
  let authInitialized = false;

  const checkVerification = useCallback(async (): Promise<boolean> => {
    if (currentUser) {
      try {
        const isVerified = await checkEmailVerification();
        setIsEmailVerified(isVerified);
        return isVerified;
      } catch (error) {
        console.error('Error checking email verification:', error);
        return false;
      }
    }
    return false;
  }, [currentUser]);

  const refreshUserProfile = useCallback(async () => {
    if (currentUser?.uid) {
      try {
  const profile = await getUserProfile(currentUser.uid);
        if (profile) {
          const normalizedProfile = normalizeProfileDates(profile);
          setUserProfile(normalizedProfile);
        }
      } catch (error) {
        console.error('Error refreshing user profile:', error);
      }
    }
  }, [currentUser]);

  const refreshUserData = useCallback(async () => {
    if (currentUser?.uid) {
      try {
        // First refresh the basic profile
        await refreshUserProfile();
        
        // Then refresh user counts and statistics
        await refreshUserProfileCounts(currentUser.uid);
        
        // Re-fetch the updated profile to get the new counts
        const updatedProfile = await getUserProfile(currentUser.uid);
        if (updatedProfile) {
          const normalizedProfile = normalizeProfileDates(updatedProfile);
          setUserProfile(normalizedProfile);
        }
        
        console.log('✅ User data refresh completed');
      } catch (error) {
        console.error('❌ Error refreshing user data:', error);
      }
    }
  }, [currentUser, refreshUserProfile]);

  // Defensive repair: if user has club fields but userType != 'club', fix it
  const ensureCorrectUserType = useCallback(async (uid: string) => {
    try {
      const doc = await firebase.firestore().collection('users').doc(uid).get();
      if (!doc.exists) return;
      const data: any = doc.data() || {};
      
      // Only consider it a club if it has STRONG club indicators
      const looksLikeClub = !!(
        data.clubName &&  // Must have clubName (not just bio mentioning "kulüp")
        (Array.isArray(data.clubTypes) && data.clubTypes.length > 0)  // Must have clubTypes
      );
      
      // Also consult pending cache and stored session
      let sessionSaysClub = false;
      try {
        const pending = await SecureStorage.getCache('pending_profile');
        if (pending?.userType === 'club') sessionSaysClub = true;
        else {
          const session = await SecureStorage.getUserSession();
          if (session?.userType === 'club') sessionSaysClub = true;
        }
      } catch {}

      // Only repair if we have STRONG evidence this should be a club AND explicit accountType='club'
      if (looksLikeClub && data.accountType === 'club' && data.userType !== 'club') {
        console.log('🛠️ Repairing misclassified user to club for UID:', uid);
        await firebase.firestore().collection('users').doc(uid).update({
          userType: 'club',
          accountType: 'club'
        });
        // Refresh local state after repair
        await refreshUserProfile();
      }
      
      // If session says club but data doesn't look like club, fix the session
      if (sessionSaysClub && !looksLikeClub && data.accountType !== 'club') {
        console.log('🛠️ Fixing incorrect session userType for student account:', uid);
        await SecureStorage.setUserSession({
          uid: uid,
          email: data.email || '',
          userType: 'student',  // Reset to student
          displayName: data.displayName || data.firstName || 'User',
          emailVerified: true,
          expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
        });
      }
    } catch (e) {
      console.warn('⚠️ ensureCorrectUserType failed:', e);
    }
  }, [refreshUserProfile]);

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Starting enhanced sign out process...');
      
      // Clear SecureStorage first (primary storage)
      await SecureStorage.clearUserSession();
      console.log('✅ SecureStorage cleared');
      
      // Clear Firebase persistence (fallback)
      await FirebaseAuthPersistenceManager.clearPersistedUser();
      console.log('✅ Firebase persistence cleared');
      
      // Firebase sign out
      await FirebaseAuthPersistenceManager.signOut();
      console.log('✅ Firebase sign out completed');
      
      // Clear local state
      setCurrentUser(null);
      setUserProfile(null);
      setIsEmailVerified(false);
      
      console.log('✅ Enhanced sign out completed successfully');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      
      // Force clear local state even if sign out fails
      setCurrentUser(null);
      setUserProfile(null);
      setIsEmailVerified(false);
    }
  }, []);

  // Kullanıcı tipini belirlemek için çoklu kontrol
  const isClubAccount = React.useMemo(() => {
    if (!userProfile) return false;
    
    // Ana kontroller
    const isClubByUserType = userProfile.userType === 'club';
    const isClubByAccountType = userProfile.accountType === 'club';
    const hasClubName = !!userProfile.clubName;
    const hasClubTypes = userProfile.clubTypes && userProfile.clubTypes.length > 0;
    
    // Kulüp hesabı kontrolleri
    const isClub = isClubByUserType || isClubByAccountType || (hasClubName && hasClubTypes);
    
    // Debug log
    console.log('🔍 User Type Detection:', {
      userType: userProfile.userType,
      accountType: userProfile.accountType,
      hasClubName,
      hasClubTypes,
      finalResult: isClub
    });
    
    return isClub;
  }, [userProfile]);
  
  // Debug log for tracking account type issues
  useEffect(() => {
    if (userProfile && currentUser) {
      console.log('🔍 AuthContext - User profile check:', {
        uid: currentUser.uid,
        userType: userProfile.userType,
        accountType: userProfile.accountType,
        clubName: userProfile.clubName,
        clubTypes: userProfile.clubTypes,
        firstName: userProfile.firstName,
        isClubAccount: isClubAccount
      });
    }
  }, [userProfile, currentUser, isClubAccount]);

  useEffect(() => {
    if (authInitialized) return;

    // Loading'i hemen false yap - splash screen kendi süresini yönetecek
    setLoading(false);
    authInitialized = true; // Mark as initialized immediately to prevent blocking
    
    const initializeAuth = async () => {
      console.log('🚀 Starting enhanced auto sign-in system...');
      
      try {
        // Network manager'ı başlat (lightweight)
        NetworkManager.init();
        
        // Delay auth operations until after splash screen completes (2+ seconds)
        setTimeout(async () => {
          try {
            // Önce SecureStorage'dan kontrol et
            console.log('🔍 DEBUG: Checking SecureStorage for user session...');
            const storedSession = await SecureStorage.getUserSession();
        
  if (storedSession) {
          console.log('✅ Found valid user session in SecureStorage');
          console.log('🔍 DEBUG: User email:', storedSession.email);
          console.log('🔍 DEBUG: User UID:', storedSession.uid);
          console.log('🔍 DEBUG: Has stored password:', !!storedSession.password);
          
          // Kullanıcıyı her durumda giriş yapmış duruma getir
          try {
            const currentFirebaseUser = firebase.auth().currentUser;
            
            if (currentFirebaseUser && currentFirebaseUser.uid === storedSession.uid) {
              console.log('✅ Firebase user already authenticated and matches stored session');
              setCurrentUser(currentFirebaseUser);
              setIsEmailVerified(currentFirebaseUser.emailVerified);
            } else {
              console.log('🔄 Firebase user not found or different, attempting restoration...');
              
              // Eğer stored password varsa, gerçek Firebase sign-in yap
              if (storedSession.password) {
                console.log('🔑 Attempting real Firebase sign-in with stored credentials');
                try {
                  const userCredential = await firebase.auth().signInWithEmailAndPassword(
                    storedSession.email, 
                    storedSession.password
                  );
                  
                  if (userCredential.user) {
                    console.log('✅ Firebase authentication successful - user has full permissions');
                    setCurrentUser(userCredential.user);
                    setIsEmailVerified(userCredential.user.emailVerified);
                  }
                } catch (signInError: any) {
                  console.warn('⚠️ Firebase sign-in failed:', signInError.message);
                  console.log('🔄 Keeping user logged in with stored session data');
                  
                  const basicUser = {
                    uid: storedSession.uid,
                    email: storedSession.email,
                    displayName: storedSession.displayName,
                    emailVerified: storedSession.emailVerified,
                  } as firebase.User;
                  
                  setCurrentUser(basicUser);
                  setIsEmailVerified(storedSession.emailVerified);
                }
              } else {
                console.log('⚠️ No stored password - keeping user logged in with session data');
                
                // Kullanıcıyı giriş yapmış durumda tut
                const basicUser = {
                  uid: storedSession.uid,
                  email: storedSession.email,
                  displayName: storedSession.displayName,
                  emailVerified: storedSession.emailVerified,
                } as firebase.User;
                
                setCurrentUser(basicUser);
                setIsEmailVerified(storedSession.emailVerified);
              }
            }
          } catch (firebaseError) {
            console.warn('⚠️ Firebase error - keeping user logged in with stored session:', firebaseError);
            
            const basicUser = {
              uid: storedSession.uid,
              email: storedSession.email,
              displayName: storedSession.displayName,
              emailVerified: storedSession.emailVerified,
            } as firebase.User;
            
            setCurrentUser(basicUser);
            setIsEmailVerified(storedSession.emailVerified);
          }
          
          // Kullanıcı profilini yükle - hata olsa da devam et
          try {
            const profile = await NetworkManager.handleApiCall(
              () => getUserProfile(storedSession.uid),
              { 
                cacheKey: `profile_${storedSession.uid}`,
                offlineMessage: 'Profil verisi offline modda yüklenemedi',
                retryCount: 1
              }
            );
            
            if (profile.success && profile.data) {
              const normalizedProfile = normalizeProfileDates(profile.data);
              setUserProfile(normalizedProfile);

              // Session'daki userType yanlışsa (ör: 'student' ama Firestore 'club') düzelt
              if (normalizedProfile?.userType && normalizedProfile.userType !== storedSession.userType) {
                console.log(`🛠️ Repairing stored session userType: ${storedSession.userType} -> ${normalizedProfile.userType}`);
                await SecureStorage.setUserSession({
                  ...storedSession,
                  userType: normalizedProfile.userType,
                }, true);
              }
              console.log('✅ AUTO SIGN-IN: User profile loaded successfully');
              // Defensive repair on auto sign-in path as well
              await ensureCorrectUserType(storedSession.uid);
            } else {
              console.warn('⚠️ AUTO SIGN-IN: Profile loading failed, using cached data');
              setUserProfile({
                uid: storedSession.uid,
                email: storedSession.email,
                displayName: storedSession.displayName,
                userType: storedSession.userType,
                emailVerified: storedSession.emailVerified,
                createdAt: new Date()
              });
            }
          } catch (profileError) {
            console.error('❌ Profile loading error, using minimal profile');
            setUserProfile({
              uid: storedSession.uid,
              email: storedSession.email,
              displayName: storedSession.displayName,
              userType: storedSession.userType || 'student',
              emailVerified: storedSession.emailVerified,
              createdAt: new Date()
            });
          }
          
          setLoading(false);
          authInitialized = true;
          
          console.log('🎉 AUTO SIGN-IN SUCCESS: User stays logged in');
          return;
          
        } else {
          console.log('❌ No valid user session found in SecureStorage');
          
          // Firebase persistence'ı kontrol et (fallback)
          await FirebaseAuthPersistenceManager.initializeSafePersistence();
          const persistedUser = await FirebaseAuthPersistenceManager.checkPersistedUser();
          
          if (persistedUser && (persistedUser as any).isFromPersistentRestore) {
            console.log('🔄 Found Firebase persisted user, migrating to SecureStorage...');
            
            if (persistedUser) {
              // Firestore'dan gerçek userType'ı almaya çalış
              let inferredUserType: 'student' | 'club' = 'student';
              try {
                const userDoc = await firebase.firestore().collection('users').doc(persistedUser.uid).get();
                const data = userDoc.data();
                if (data?.userType === 'club') inferredUserType = 'club';
              } catch (e) {
                console.warn('⚠️ Could not fetch user profile during migration, defaulting userType to student');
              }

              await SecureStorage.setUserSession({
                uid: persistedUser.uid,
                email: persistedUser.email || '',
                displayName: persistedUser.displayName || undefined,
                emailVerified: persistedUser.emailVerified || false,
                userType: inferredUserType,
                expiresAt: Date.now() + (90 * 24 * 60 * 60 * 1000)
              });
              
              setCurrentUser(persistedUser);
              setIsEmailVerified(persistedUser.emailVerified || true);
              setLoading(false);
              authInitialized = true;
              
              console.log('✅ Migration completed, user signed in');
              return;
            }
          }
        }
        
          } catch (error) {
            console.error('❌ Auto sign-in system failed:', error);
          }
          
          setLoading(false);
          authInitialized = true;
        }, 2500); // Delay auth operations until after splash screen completes (2+ seconds)
        
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        setLoading(false);
        authInitialized = true;
      }
    };

    initializeAuth();

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!authInitialized) return;

      console.log('🔄 Auth state changed:', user ? `User: ${user.email} (UID: ${user.uid})` : 'No user');

      if (user) {
        setCurrentUser(user as any);
        setIsEmailVerified(user.emailVerified);

        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            const normalizedProfile = normalizeProfileDates(profile);
            setUserProfile(normalizedProfile);
            console.log('✅ User profile loaded');
            // Defensive repair after load
            await ensureCorrectUserType(user.uid);
          }
        } catch (error) {
          console.error('❌ Failed to load user profile:', error);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setIsEmailVerified(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Real-time guard: prevent club → student downgrades
  useEffect(() => {
    // Clean previous listener
    if (userDocUnsubRef.current) {
      try { userDocUnsubRef.current(); } catch {}
      userDocUnsubRef.current = null;
    }
    if (!currentUser?.uid) return;

    const uid = currentUser.uid;
    const unsub = firebase.firestore().collection('users').doc(uid).onSnapshot(async (snap) => {
      try {
        if (!snap.exists) return;
        const data: any = snap.data() || {};
        
        // Club account detection based on email domain and explicit account type
        let userTypeToSet = data.userType || 'student';
        
        if (data.accountType === 'club' || data.isClub === true) {
          // Explicitly marked as club account
          userTypeToSet = 'club';
        } else if (data.email && data.email.includes('@club.')) {
          // Club domain detection
          userTypeToSet = 'club';
        } else if (data.clubName || (Array.isArray(data.clubTypes) && data.clubTypes.length > 0)) {
          // Has club-specific fields
          userTypeToSet = 'club';
        }

        // Update user type if needed
        if (data.userType !== userTypeToSet) {
          await firebase.firestore().collection('users').doc(uid).update({
            userType: userTypeToSet,
            accountType: userTypeToSet
          });
          setUserProfile((prev: any) => prev ? { ...prev, userType: userTypeToSet, accountType: userTypeToSet } : prev);
        }

        // TEMPORARILY DISABLED - Real-time name repair causing issues
        /*
        // Real-time name repair for clubs: avoid generic/email-like displayName/clubName
        const isClub = data.userType === 'club' || data.accountType === 'club' || looksLikeClub || sessionSaysClub;
        if (isClub) {
          const looksLikeEmail = (val?: string) => !!val && val.includes('@');
          const isBlank = (val?: any) => !val || (typeof val === 'string' && val.trim() === '');
          const isGeneric = (val?: string) => {
            const v = (val || '').toString().trim().toLowerCase();
            // Only treat VERY generic names as generic - not short user-provided names
            return v === 'kullanıcı' || v === 'kullanici' || v === 'user' || v === 'anonim kullanıcı' || v === 'anonim' || v === 'kulüp' || v === 'club';
          };
          
          // Only fix if displayName/clubName is truly broken (email, blank, or very generic)
          const displayNameNeedsFix = isBlank(data.displayName) || looksLikeEmail(data.displayName) || isGeneric(data.displayName);
          const clubNameNeedsFix = isBlank(data.clubName) || looksLikeEmail(data.clubName) || isGeneric(data.clubName);
          
          // Age-based protection: Don't repair users created recently (may be in registration flow)
          const userAge = data.createdAt 
            ? (Date.now() - (data.createdAt.seconds ? data.createdAt.toDate().getTime() : new Date(data.createdAt).getTime()))
            : Infinity;
          
          if ((displayNameNeedsFix || clubNameNeedsFix) && userAge > 30000) { // Increased to 30 seconds
            // Try to get from pending profile first
            let bestCandidate: string | undefined;
            try {
              const pending = await SecureStorage.getCache('pending_profile');
              if (pending?.clubName && pending.clubName.trim()) {
                bestCandidate = pending.clubName.trim();
                console.log('🔧 Real-time name repair: Using reserved clubName from pending profile:', bestCandidate);
              }
            } catch {}
            
            if (!bestCandidate) {
              bestCandidate = [data.clubName, data.displayName, data.name, data.username]
                .map((s: any) => (s ?? '').toString().trim())
                .find((s: string) => s.length >= 2 && !looksLikeEmail(s) && !isGeneric(s));
            }
            
            if (bestCandidate) {
              console.log('🔧 Real-time name repair for club:', {
                before: { displayName: data.displayName, clubName: data.clubName },
                after: { displayName: bestCandidate, clubName: bestCandidate }
              });
              
              await firebase.firestore().collection('users').doc(uid).update({
                displayName: bestCandidate,
                clubName: bestCandidate,
                name: bestCandidate
              });
              setUserProfile((prev: any) => prev ? { ...prev, displayName: bestCandidate, clubName: bestCandidate, name: bestCandidate } : prev);
            } else {
              console.log('⚠️ Real-time name repair: No suitable candidate found, skipping');
            }
          } else if (displayNameNeedsFix || clubNameNeedsFix) {
            console.log('⏱️ Real-time name repair: Skipping repair - user too new (age: ' + Math.round(userAge/1000) + 's), may be in registration flow');
          } else {
            console.log('✅ Real-time name repair: Club name fields are fine, no repair needed');
          }
        }
        */
        // End of temporarily disabled real-time name repair
      } catch (e) {
        console.warn('Real-time guard failed:', e);
      }
    });
    userDocUnsubRef.current = unsub;

    return () => {
      if (userDocUnsubRef.current) {
        try { userDocUnsubRef.current(); } catch {}
        userDocUnsubRef.current = null;
      }
    };
  }, [currentUser?.uid]);

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    console.log('🔐 Starting enhanced sign-in process...');
    setLoading(true);
    
    try {
      const result = await NetworkManager.handleApiCall(
        () => firebase.auth().signInWithEmailAndPassword(email.trim(), password),
        { 
          offlineMessage: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin',
          retryCount: 2
        }
      );
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
  const userCredential = result.data;
  const user = userCredential?.user;
      
      if (user) {
        console.log('✅ Firebase sign-in successful');
        
        // Kullanıcı profilini al
        const profileResult = await NetworkManager.handleApiCall(
          () => getUserProfile(user.uid),
          { 
            cacheKey: `profile_${user.uid}`,
            offlineMessage: 'Profil verisi yüklenemedi'
          }
        );
        
        let userProfile: any = null;
        if (profileResult.success && profileResult.data) {
          userProfile = normalizeProfileDates(profileResult.data);
        }
        // Defensive repair on explicit sign-in path
        await ensureCorrectUserType(user.uid);
        // Re-read userType after potential repair to avoid saving stale type in session
        let repairedType: 'student' | 'club' = (userProfile?.userType as any) || 'student';
        try {
          const typeDoc = await firebase.firestore().collection('users').doc(user.uid).get();
          const data: any = typeDoc.data() || {};
          if (data.userType === 'club') repairedType = 'club';
          else if (data.userType === 'student') repairedType = 'student';
        } catch {}
        
        // Ensure we have at least a minimal profile with the corrected type before unlocking app navigation
        if (!userProfile) {
          userProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || undefined,
            userType: repairedType,
            accountType: repairedType,
            emailVerified: user.emailVerified,
            createdAt: new Date()
          };
        } else if (userProfile && userProfile.userType !== repairedType) {
          userProfile = { ...userProfile, userType: repairedType, accountType: repairedType };
        }
        
        // Remember Me aktifse SecureStorage'a kaydet - SINIRSIZ SÜRE
        if (rememberMe) {
          console.log('💾 Saving user session to SecureStorage (UNLIMITED)...');
          await SecureStorage.setUserSession({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || userProfile?.displayName || undefined,
            emailVerified: user.emailVerified,
            userType: repairedType,
            password: password,
            expiresAt: Number.MAX_SAFE_INTEGER // SINIRSIZ SÜRE
          });
          console.log('✅ User session saved successfully with credentials');
        } else {
          console.log('🗑️ Remember Me disabled - clearing any existing session...');
          await SecureStorage.clearUserSession();
        }
        
        // Set profile first so AppNavigator can decide the correct stack without flashing student UI
        if (userProfile) {
          setUserProfile(userProfile);
          console.log('✅ User profile loaded successfully');
        }
        
        setCurrentUser(user);
        setIsEmailVerified(user.emailVerified);
        
        console.log('🎉 Sign-in completed successfully');
        return { success: true };
        
      } else {
        throw new Error('Kullanıcı bilgileri alınamadı');
      }
      
    } catch (error: any) {
      console.error('❌ Sign-in failed:', error);
      let errorMessage = 'Giriş yapılırken bir hata oluştu';
      
      if (error?.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı';
      } else if (error?.code === 'auth/wrong-password') {
        errorMessage = 'E-posta veya şifre hatalı';
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi';
      } else if (error?.code === 'auth/user-disabled') {
        errorMessage = 'Hesabınız devre dışı bırakılmış. Destek ekibiyle iletişime geçin';
      } else if (error?.code === 'auth/too-many-requests') {
        errorMessage = 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
      
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    isEmailVerified,
    checkVerification,
    isClubAccount,
    refreshUserProfile,
    refreshUserData,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
