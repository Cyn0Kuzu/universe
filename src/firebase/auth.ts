import { firebase, auth, firestore } from './config';
import { SecureStorage } from '../utils/secureStorage';
import FirebaseAuthPersistenceManager from './authPersistenceManager';

// User registration types
interface StudentRegistrationData {
  email: string;
  password: string;
  fullName: string;
  university?: string;
  department?: string;
  classLevel?: string;
  userType: 'student';
}

interface ClubRegistrationData {
  email: string;
  password: string;
  fullName: string;
  university?: string;
  description?: string;
  clubType?: string;  // Keep for backward compatibility
  clubTypes?: string[]; // New field for multiple club types
  userType: 'club';
}

type UserRegistrationData = StudentRegistrationData | ClubRegistrationData;

// Register a new user
export const registerUser = async (userData: UserRegistrationData): Promise<firebase.auth.UserCredential> => {
  try {
    // Validate input data
    if (!userData.email || !userData.password || !userData.fullName) {
      throw new Error('Gerekli alanlar eksik: email, password, fullName');
    }
    
    if (userData.password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır');
    }
    
    // Create the user account with Firebase Authentication
    const userCredential = await auth.createUserWithEmailAndPassword(
      userData.email,
      userData.password
    );
    
    const user = userCredential.user;
    
    if (user) {
      // Update profile with display name
      await user.updateProfile({
        displayName: userData.fullName
      });
      
      // Send email verification
      await user.sendEmailVerification();
      
      // Create a user document in Firestore
      const derivedUsername = (userData.email?.split('@')[0] || `user${Date.now().toString().slice(-6)}`).toLowerCase();
      const baseDoc: any = {
        uid: user.uid,
        email: userData.email,
        // Keep both for backward compatibility with various UI reads
        displayName: userData.fullName,
        fullName: userData.fullName,
        name: userData.fullName, // Also add generic name field
        userType: userData.userType,
        accountType: userData.userType,
        username: derivedUsername,
        emailVerified: false,
        createdAt: new Date(), // Use actual Date instead of serverTimestamp
        ...(userData.userType === 'student' 
          ? { 
              university: userData.university || '',
              department: userData.department || '',
              classLevel: userData.classLevel || '',
            }
          : {
              university: userData.university || '',
              description: userData.description || '',
              clubName: userData.fullName || '',
              clubType: userData.userType === 'club' ? (userData as ClubRegistrationData).clubType || '' : '',
              clubTypes: userData.userType === 'club' ? (userData as ClubRegistrationData).clubTypes || [] : [],
              bio: userData.description || '',
            }
        )
      };

  // Preserve any previously written preservation fields if doc exists
  // and merge to avoid wiping _preserve* fields or other data written elsewhere
      // Carry preservation fields if they exist in provided registration payload
      try {
        if ((userData as any)._preserveUsername) baseDoc._preserveUsername = (userData as any)._preserveUsername;
        if ((userData as any)._preserveClubName) baseDoc._preserveClubName = (userData as any)._preserveClubName;
        if ((userData as any)._preserveDisplayName) baseDoc._preserveDisplayName = (userData as any)._preserveDisplayName;
      } catch {}
      await firestore.collection('users').doc(user.uid).set(baseDoc, { merge: true });
      // Also create mapping docs for username and email (best-effort)
      try {
        if (baseDoc.username) {
          await firestore.collection('usernames').doc(String(baseDoc.username).toLowerCase()).set({ userId: user.uid, createdAt: new Date() });
        }
        if (baseDoc.email) {
          await firestore.collection('emails').doc(String(baseDoc.email).toLowerCase()).set({ userId: user.uid, createdAt: new Date() });
        }
      } catch (e) {
        console.warn('Non-fatal: failed to create username/email mapping docs during registerUser:', e);
      }
    }
    
    return userCredential;
  } catch (error) {
    throw error;
  }
};

// Sign in an existing user
export const signIn = async (email: string, password: string): Promise<firebase.auth.UserCredential> => {
  try {
    // Use safe sign in from persistence manager
    const userCredential = await FirebaseAuthPersistenceManager.safeSignIn(email, password);
    return userCredential;
  } catch (error) {
    throw error;
  }
};

// Sign out the current user
export const logOut = async (): Promise<void> => {
  try {
    // Use safe sign out from persistence manager
    await FirebaseAuthPersistenceManager.safeSignOut();
  } catch (error) {
    throw error;
  }
};

// Check if email exists in database
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const usersQuery = await firestore
      .collection('users')
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();
    
    return !usersQuery.empty;
  } catch (error) {
    console.error('Error checking email existence:', error);
    throw new Error('Email kontrolü yapılırken bir hata oluştu.');
  }
};

// Send password reset email with email validation
export const resetPasswordWithValidation = async (email: string): Promise<void> => {
  try {
    // First check if email exists in our database
    const emailExists = await checkEmailExists(email);
    
    if (!emailExists) {
      throw new Error('Bu e-posta adresi sistemimizde kayıtlı değil.');
    }
    
    // If email exists, send reset link
    await auth.sendPasswordResetEmail(email);
  } catch (error) {
    throw error;
  }
};

// Send password reset email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await auth.sendPasswordResetEmail(email);
  } catch (error) {
    throw error;
  }
};

// Rate limiting for email verification
let lastEmailVerificationTime = 0;
const EMAIL_VERIFICATION_COOLDOWN = 60000; // 1 minute

// Send email verification
export const sendEmailVerification = async (): Promise<void> => {
  try {
    const now = Date.now();
    
    // Check rate limiting
    if (now - lastEmailVerificationTime < EMAIL_VERIFICATION_COOLDOWN) {
      const remainingTime = Math.ceil((EMAIL_VERIFICATION_COOLDOWN - (now - lastEmailVerificationTime)) / 1000);
      console.log(`Email verification rate limited. Try again in ${remainingTime} seconds.`);
      throw new Error(`Lütfen ${remainingTime} saniye bekleyip tekrar deneyin.`);
    }
    
    // Use persistence manager for email verification
    await FirebaseAuthPersistenceManager.sendEmailVerification();
    lastEmailVerificationTime = now; // Update rate limiting timestamp
    
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/too-many-requests') {
      throw new Error('Çok fazla istek gönderildi. Lütfen bir süre bekleyip tekrar deneyin.');
    }
    
    throw error;
  }
};

// Check email verification status
export const checkEmailVerification = async (): Promise<boolean> => {
  try {
    console.log('🔍 Checking email verification status...');
    
    // Use persistence manager for email verification check
    const isVerified = await FirebaseAuthPersistenceManager.checkEmailVerification();
    
    if (isVerified) {
      console.log('✅ Email is verified! Updating Firestore...');
      
      const user = FirebaseAuthPersistenceManager.getCurrentUser();
      if (user) {
        // Try to update the user's document in Firestore
        try {
          // Check if document exists first
          const userDoc = await firestore.collection('users').doc(user.uid).get();
          
          console.log('🔍 checkEmailVerification: Document check:', {
            exists: userDoc.exists,
            userId: user.uid,
            dataKeys: userDoc.exists ? Object.keys(userDoc.data() || {}) : []
          });
          
          if (userDoc.exists) {
            const data = userDoc.data() || {};
            console.log('🔍 checkEmailVerification: Existing document data preview:', {
              displayName: data.displayName,
              username: data.username,
              email: data.email,
              totalFields: Object.keys(data).length
            });
            const currentUsername = (data.username || '').toLowerCase();
            await firestore.collection('users').doc(user.uid).update({
              emailVerified: true,
              verifiedAt: new Date(),
              ...(currentUsername && { username: currentUsername })
            });
            console.log('✅ User document updated with verification status - only updated emailVerified, verifiedAt, username');
            // Repair username mapping if missing
            if (currentUsername) {
              const unameRef = firestore.collection('usernames').doc(currentUsername);
              const unameDoc = await unameRef.get();
              if (!unameDoc.exists) {
                await unameRef.set({ userId: user.uid, createdAt: new Date() });
              }
            }
            console.log('✅ User document updated with verification status');
          } else {
            // Create a basic profile if it doesn't exist
            // Try to derive userType from pending cache or stored session if available
            let derivedUserType: 'student' | 'club' = 'student';
            let pendingProfile: any = null;
            try {
              pendingProfile = await SecureStorage.getCache('pending_profile');
              if (pendingProfile?.userType === 'club') {
                derivedUserType = 'club';
              } else {
                const session = await SecureStorage.getUserSession();
                if (session?.userType === 'club') derivedUserType = 'club';
              }
            } catch {}

            const normalizedPendingUsername = (pendingProfile?.username || (user.email?.split('@')[0] || '')).toLowerCase();
            const baseDoc: any = {
              uid: user.uid,
              email: user.email,
              displayName: pendingProfile?.displayName || user.displayName || '',
              username: normalizedPendingUsername || `user${Date.now().toString().slice(-6)}`,
              emailVerified: true,
              verifiedAt: new Date(),
              createdAt: new Date(),
              userType: derivedUserType,
              accountType: derivedUserType,
            };
            // Merge some pending fields if present for better initial UX
            if (pendingProfile) {
              baseDoc.bio = pendingProfile.bio || '';
              baseDoc.university = pendingProfile.university || '';
              if (derivedUserType === 'student') {
                baseDoc.department = pendingProfile.department || '';
                baseDoc.classLevel = pendingProfile.classLevel || '';
              } else {
                baseDoc.clubName = pendingProfile.clubName || baseDoc.displayName || '';
                baseDoc.clubTypes = Array.isArray(pendingProfile.clubTypes) ? pendingProfile.clubTypes : [];
                baseDoc.clubType = baseDoc.clubTypes?.[0] || '';
              }
            }

            // Keep aliases - but only if they don't already exist (preserve registration data)
            if (!baseDoc.fullName) baseDoc.fullName = baseDoc.displayName || (baseDoc.email ? String(baseDoc.email).split('@')[0] : 'Kullanıcı');
            if (!baseDoc.name) baseDoc.name = baseDoc.displayName || baseDoc.fullName;

            // Merge create to avoid wiping preservation fields created during registration flow
            // Use merge to preserve any existing data from registration
            await firestore.collection('users').doc(user.uid).set(baseDoc, { merge: true });
            // Create username mapping
            if (baseDoc.username) {
              await firestore.collection('usernames').doc(baseDoc.username.toLowerCase()).set({ userId: user.uid, createdAt: new Date() });
            }
            console.log('✅ User document created with verification status');
          }
        } catch (firestoreError) {
          console.error("❌ Error updating verification status in Firestore:", firestoreError);
          // Continue anyway as the auth verification is the source of truth
        }
      }
    } else {
      console.log('❌ Email is not yet verified');
    }
    
    return isVerified;
  } catch (error) {
    console.error('Error checking email verification:', error);
    return false;
  }
};

// Get the current user's profile data
export const getUserProfile = async (userId: string) => {
  try {
    // Force fresh read from server (not cache)
    const userDoc = await firestore.collection('users').doc(userId).get({ source: 'server' });
    
    if (userDoc.exists) {
      // Firestore'dan profil bilgisini al
      const profileData = userDoc.data() || {};
      // Try to get any pending registration data to avoid generic fallbacks
      let pendingProfile: any = null;
      try {
        pendingProfile = await SecureStorage.getCache('pending_profile').catch(() => null);
      } catch {}
      
      // DEBUG: Username durumunu logla
      console.log('🔍 getUserProfile: Raw data from Firestore:', {
        username: profileData.username,
        displayName: profileData.displayName,
        clubName: profileData.clubName,
        email: profileData.email,
        userType: profileData.userType,
        accountType: profileData.accountType,
        _preserveUsername: profileData._preserveUsername,
        _preserveClubName: profileData._preserveClubName,
        _preserveDisplayName: profileData._preserveDisplayName,
        uid: profileData.uid,
        documentId: userId,
        documentExists: userDoc.exists,
        allKeys: Object.keys(profileData)
      });
      
      // Eksik olabilecek profil alanlarını kontrol et ve tamamla
      const updatedFields: any = {};
      let needsUpdate = false;
      
      // Avatar ve kapak bilgilerini kontrol et
      if (!profileData?.avatarIcon && !profileData?.profileImage) {
        updatedFields.avatarIcon = 'account';
        updatedFields.avatarColor = '#1E88E5';
        needsUpdate = true;
      }
      
      if (!profileData?.coverIcon && !profileData?.coverImage) {
        updatedFields.coverIcon = 'city-variant';
        updatedFields.coverColor = '#0D47A1';
        needsUpdate = true;
      }
      
      // UserType kontrol ve çıkarım (no downgrade policy)
      const bioText = (profileData?.bio || '').toString().toLowerCase();
      const displayNameText = (profileData?.displayName || '').toString().toLowerCase();
  const looksLikeClubStrong = !!(
        profileData?.clubName ||
        (Array.isArray(profileData?.clubTypes) && profileData.clubTypes.length > 0) ||
        profileData?.description ||
        bioText.includes('kulüp') || bioText.includes('kulup') ||
        displayNameText.includes('kulüp') || displayNameText.includes('kulup')
      );

      // Derive type from multiple signals
  let inferredFromSignals: 'student' | 'club' = 'student';
      try {
        if (profileData?.accountType === 'club') inferredFromSignals = 'club';
        else if (looksLikeClubStrong) inferredFromSignals = 'club';
        else {
          const pending = await SecureStorage.getCache('pending_profile');
          if (pending?.userType === 'club') inferredFromSignals = 'club';
          else {
            const session = await SecureStorage.getUserSession();
            if (session?.userType === 'club') inferredFromSignals = 'club';
          }
        }
      } catch {}

      if (!profileData?.userType) {
        // If missing, set from signals (prefer club when indicated)
        console.log('🔧 getUserProfile: userType missing, using signals:', {
          inferredFromSignals,
          profileDataUserType: profileData?.userType,
          profileDataAccountType: profileData?.accountType
        });
        updatedFields.userType = inferredFromSignals;
        updatedFields.accountType = inferredFromSignals;
        needsUpdate = true;
      } else if (profileData.userType !== 'club' && inferredFromSignals === 'club') {
        // Repair misclassified: promote to club when any strong signal exists
        updatedFields.userType = 'club';
        updatedFields.accountType = 'club';
        needsUpdate = true;
      } else if (profileData.userType === 'club' && inferredFromSignals === 'student') {
        // Never downgrade club to student - PRESERVE EXISTING CLUB STATUS
        console.log('🛡️ getUserProfile: Preserving existing club status, ignoring student signals');
        // Ensure accountType mirrors club
        if (profileData?.accountType !== 'club') {
          updatedFields.accountType = 'club';
          needsUpdate = true;
        }
      }
      // Ensure accountType mirrors userType when set and not above handled
      if (profileData?.userType && profileData?.accountType !== profileData.userType && !updatedFields.accountType) {
        updatedFields.accountType = profileData.userType;
        needsUpdate = true;
      }
      
      // Username kontrol et - sadece gerçekten yoksa ya da boşsa üret
      const currentUsername = (profileData?.username || '').toString().trim();
      
      // CRITICAL FIX: Eğer username email formatında ise ve preserved username varsa, preserved olanı kullan
      const preservedUsername = (profileData?._preserveUsername || '').toString().trim();
      const looksLikeEmailPrefix = currentUsername && currentUsername.includes('@') === false && 
                                   profileData?.email && currentUsername === profileData.email.split('@')[0];
      
      if (looksLikeEmailPrefix && preservedUsername && preservedUsername !== currentUsername) {
        console.log('🔧 getUserProfile: Username corrupted with email prefix, restoring from preserved:', 
                   { current: currentUsername, preserved: preservedUsername });
        updatedFields.username = preservedUsername;
        needsUpdate = true;
      } else if (!currentUsername) {
        console.log('⚠️ getUserProfile: Username not found in profile data');
        
        // Önce preserved username kontrol et
        if (preservedUsername) {
          console.log('🔧 getUserProfile: Restoring username from preservation field:', preservedUsername);
          updatedFields.username = preservedUsername;
          needsUpdate = true;
        } else {
          // Pending profile'dan username al
          try {
            const pendingProfile = await SecureStorage.getCache('pending_profile').catch(() => null);
            if (pendingProfile?.username && pendingProfile.username.trim()) {
              const reservedUsername = pendingProfile.username.toLowerCase().trim();
              console.log('🔧 getUserProfile: Using reserved username from pending profile:', reservedUsername);
              updatedFields.username = reservedUsername;
              needsUpdate = true;
            } else {
              // Pending profile yoksa, usernames mapping'inden kurtarmayı dene
              try {
                // Try finding a usernames doc that maps back to this userId
                const unameSnap = await firestore
                  .collection('usernames')
                  .where('userId', '==', userId)
                  .limit(1)
                  .get();
                if (!unameSnap.empty) {
                  const recoveredUsername = unameSnap.docs[0].id.toLowerCase();
                  console.log('🔧 getUserProfile: Recovered username from usernames mapping:', recoveredUsername);
                  updatedFields.username = recoveredUsername;
                  needsUpdate = true;
                } else {
                  // Son çare: email'den üret
                  const email = profileData?.email || '';
                  const fallbackUsername = email.split('@')[0] || `user${Date.now().toString().slice(-6)}`;
                  console.log('🔧 getUserProfile: No mapping found, generating fallback:', fallbackUsername);
                  updatedFields.username = fallbackUsername;
                  needsUpdate = true;
                }
              } catch (mapErr) {
                const email = profileData?.email || '';
                const fallbackUsername = email.split('@')[0] || `user${Date.now().toString().slice(-6)}`;
                console.log('🔧 getUserProfile: Mapping lookup failed, generating fallback:', fallbackUsername, mapErr);
                updatedFields.username = fallbackUsername;
                needsUpdate = true;
              }
            }
          } catch (e) {
            console.error('❌ getUserProfile: Error accessing pending profile:', e);
            // Hata durumunda email'den üret
            const email = profileData?.email || '';
            const fallbackUsername = email.split('@')[0] || `user${Date.now().toString().slice(-6)}`;
            console.log('🔧 getUserProfile: Error fallback username:', fallbackUsername);
            updatedFields.username = fallbackUsername;
            needsUpdate = true;
          }
        }
      } else {
        // Username var, dokunma
        console.log('✅ getUserProfile: Username exists, leaving untouched:', currentUsername);
      }

      // DisplayName/ClubName normalizasyonu
      const looksLikeEmail = (val?: string) => !!val && val.includes('@');
      const isBlank = (val?: any) => !val || (typeof val === 'string' && val.trim() === '');
      const userType: 'student' | 'club' = (profileData.userType === 'club' || profileData.accountType === 'club') ? 'club' : 'student';

      // Compute best display name
      const isGenericName = (val?: string) => {
        const v = (val || '').toString().trim().toLowerCase();
        return v === 'kullanıcı' || v === 'kullanici' || v === 'user' || v === 'anonim kullanıcı' || v === 'anonim';
      };
      
      let computedDisplayName = profileData.displayName as string | undefined;
      
      // ÖNEMLİ DEĞİŞİKLİK: Sadece gerçekten boş/geçersiz ise onar
      const needsDisplayNameRepair = isBlank(profileData.displayName) || 
                                   looksLikeEmail(profileData.displayName) || 
                                   (userType === 'club' && isGenericName(profileData.displayName));
      
      if (needsDisplayNameRepair) {
        if (userType === 'student') {
          // Prefer pending/preserved values to avoid generic defaults
          const preserved = (profileData?._preserveDisplayName || '').toString().trim();
          const pendingDN = (pendingProfile?.displayName || pendingProfile?.fullName || '').toString().trim();
          const fn = (profileData.firstName || '').toString().trim();
          const ln = (profileData.lastName || '').toString().trim();
          const full = (profileData.fullName || '').toString().trim();
          if (preserved) computedDisplayName = preserved;
          else if (pendingDN) computedDisplayName = pendingDN;
          else if (fn || ln) computedDisplayName = `${fn} ${ln}`.trim();
          else if (full) computedDisplayName = full;
          else if (profileData.email) computedDisplayName = String(profileData.email).split('@')[0];
          else computedDisplayName = 'Kullanıcı';
        } else {
          const preservedClub = (profileData?._preserveClubName || '').toString().trim();
          const clubName = (profileData.clubName || '').toString().trim() || preservedClub || (pendingProfile?.clubName || '').toString().trim();
          const uname = (profileData.username || '').toString().trim();
          if (clubName) computedDisplayName = clubName;
          else if (uname) computedDisplayName = uname;
          else if (profileData.email) computedDisplayName = String(profileData.email).split('@')[0];
          else computedDisplayName = 'Kulüp';
        }
        
        // Önce preserved displayName kontrol et
        const preservedDisplayName = (profileData?._preserveDisplayName || '').toString().trim();
        if (preservedDisplayName && !isGenericName(preservedDisplayName)) {
          console.log('🔧 getUserProfile: Restoring displayName from preservation field:', preservedDisplayName);
          updatedFields.displayName = preservedDisplayName;
          needsUpdate = true;
        } else {
          // If we have a pending display name, use it to avoid generic fallback overwriting later writes
          const pendingDN = (pendingProfile?.displayName || pendingProfile?.fullName || '').toString().trim();
          if (pendingDN && !isGenericName(pendingDN)) {
            console.log('🔧 getUserProfile: Using pending displayName:', pendingDN);
            updatedFields.displayName = pendingDN;
            needsUpdate = true;
          } else {
            // Only set computed fallback if the user was created more than 30 seconds ago
            // This prevents overwriting during active registration flows
            const userAge = profileData.createdAt 
              ? (Date.now() - (profileData.createdAt.seconds ? profileData.createdAt.toDate().getTime() : new Date(profileData.createdAt).getTime()))
              : Infinity;
            
            console.log('🔍 getUserProfile: Age calculation debug:', {
              createdAt: profileData.createdAt,
              createdAtType: typeof profileData.createdAt,
              userAgeMs: userAge,
              userAgeSec: Math.round(userAge / 1000),
              ageCheckPassed: userAge > 30000
            });
            
            if (userAge > 30000) { // Only apply fallbacks after 30 seconds (increased from 10)
              console.log('🔧 getUserProfile: Using computed displayName (user age check passed):', computedDisplayName);
              updatedFields.displayName = computedDisplayName;
              needsUpdate = true;
            } else {
              console.log('⏱️ getUserProfile: Skipping displayName fallback - user too new, may be in registration flow');
            }
          }
        }
      } else {
        // Display name exists but check if preserve field is different and should be restored
        const preservedDisplayName = (profileData?._preserveDisplayName || '').toString().trim();
        const currentDisplayName = (profileData.displayName || '').toString().trim();
        
        if (preservedDisplayName && 
            !isGenericName(preservedDisplayName) && 
            preservedDisplayName !== currentDisplayName && 
            isGenericName(currentDisplayName)) { // Current is generic, preserved is not
          
          console.log('🔧 getUserProfile: Restoring displayName from preserve field (current is generic):', {
            current: currentDisplayName,
            preserved: preservedDisplayName
          });
          updatedFields.displayName = preservedDisplayName;
          needsUpdate = true;
        } else {
          console.log('✅ getUserProfile: DisplayName exists and valid, leaving untouched:', profileData.displayName);
        }
      }

      // Ensure clubName present and sane for club accounts
      if (userType === 'club') {
        const clubNameRaw = (profileData.clubName || '').toString().trim();
        if (isBlank(clubNameRaw) || looksLikeEmail(clubNameRaw)) {
          // Önce preserved clubName kontrol et
          const preservedClubName = (profileData?._preserveClubName || '').toString().trim();
          if (preservedClubName) {
            console.log('🔧 getUserProfile: Restoring clubName from preservation field:', preservedClubName);
            updatedFields.clubName = preservedClubName;
            needsUpdate = true;
          } else {
            // Önce preserved clubName kontrol et, sonra pending profile
            const preservedClubName = (profileData?._preserveClubName || '').toString().trim();
            if (preservedClubName) {
              console.log('🔧 getUserProfile: Restoring clubName from preservation field:', preservedClubName);
              updatedFields.clubName = preservedClubName;
              needsUpdate = true;
            } else {
              // Pending profile'dan clubName al
              try {
                const pendingProfile = await SecureStorage.getCache('pending_profile').catch(() => null);
                if (pendingProfile?.clubName && pendingProfile.clubName.trim()) {
                  console.log('🔧 getUserProfile: Using reserved clubName from pending profile:', pendingProfile.clubName);
                  updatedFields.clubName = pendingProfile.clubName.trim();
                  needsUpdate = true;
                } else {
                  console.log('🔧 getUserProfile: Using computed clubName:', computedDisplayName);
                  updatedFields.clubName = computedDisplayName;
                  needsUpdate = true;
                }
              } catch (e) {
                console.log('⚠️ getUserProfile: Error accessing pending profile for clubName, using computed:', computedDisplayName);
                updatedFields.clubName = computedDisplayName;
                needsUpdate = true;
              }
            }
          }
        } else {
          console.log('✅ getUserProfile: Club name exists, leaving untouched:', clubNameRaw);
        }
      }

      // Ensure fullName for student accounts for compatibility with older UIs
      if (userType === 'student') {
        const full = (profileData.fullName || '').toString().trim();
        if (isBlank(full)) {
          const fn = (profileData.firstName || '').toString().trim();
          const ln = (profileData.lastName || '').toString().trim();
          const fallback = (fn || ln) ? `${fn} ${ln}`.trim() : (computedDisplayName || 'Kullanıcı');
          
          // Only set fallback if user is not in active registration (age check)
          const userAge = profileData.createdAt 
            ? (Date.now() - (profileData.createdAt.seconds ? profileData.createdAt.toDate().getTime() : new Date(profileData.createdAt).getTime()))
            : Infinity;
            
          if (userAge > 10000 || (pendingProfile?.fullName || pendingProfile?.displayName)) {
            updatedFields.fullName = (pendingProfile?.fullName || pendingProfile?.displayName || fallback);
            needsUpdate = true;
          }
        }
      }
      
      // Boş üniversite kontrolü - sadece gerçekten boşsa güncelle
      if (profileData?.userType === 'club') {
        const currentUniversity = (profileData?.university || '').toString().trim();
        if (!currentUniversity) {
          // Önce pending profile'dan üniversite bilgisini al
          const pendingProfile = await SecureStorage.getCache('pending_profile').catch(() => null);
          const reservedUniversity = pendingProfile?.university;
          
          if (reservedUniversity && reservedUniversity.trim()) {
            console.log("Using reserved university for club:", reservedUniversity);
            updatedFields.university = reservedUniversity;
            needsUpdate = true;
          } else if (profileData.universityId) {
            console.log("Using universityId as fallback for club");
            updatedFields.university = profileData.universityId;
            needsUpdate = true;
          } else {
            console.log("Setting default university for club with no university data");
            updatedFields.university = 'other';
            needsUpdate = true;
          }
        } else {
          console.log("Club university field already set:", currentUniversity);
        }
      }
      
      // Club type kontrolü
      if (profileData?.userType === 'club' && (!profileData?.clubType || profileData.clubType === '')) {
        updatedFields.clubType = profileData.clubTypeId || 'other';
        needsUpdate = true;
      }
      
      // Club types (multiple) kontrolü
      if (profileData?.userType === 'club' && (!profileData?.clubTypes || !Array.isArray(profileData.clubTypes))) {
        // If there's a single clubType, use it as the first item in clubTypes
        updatedFields.clubTypes = profileData.clubType ? [profileData.clubType] : ['other'];
        needsUpdate = true;
      }
      
      // createdAt kontrolü
      if (!profileData?.createdAt) {
        // Use a real timestamp instead of FieldValue.serverTimestamp()
        updatedFields.createdAt = new Date();
        needsUpdate = true;
      } else if (profileData?.createdAt && typeof profileData.createdAt === 'object' && 
                !profileData.createdAt.seconds && !profileData.createdAt.toDate) {
        // If createdAt exists but is a FieldValue object, convert it to a real timestamp
        updatedFields.createdAt = new Date();
        needsUpdate = true;
      }
      
      // Check for badges and add default badge if none exists
      if (!profileData?.badges || profileData.badges.length === 0) {
        updatedFields.badges = [
          { name: 'Yeni Üye', icon: 'star', color: '#FFD700' }
        ];
        needsUpdate = true;
      }
      
      // Ensure a generic `name` alias mirrors a good displayName for legacy components (only if truly missing)
      {
        const currentNameVal = (profileData as any)?.name;
        const currentName = String(currentNameVal || '').trim();
        const bestDisplay = (
          updatedFields.displayName ||
          profileData.displayName ||
          profileData.clubName ||
          profileData.fullName ||
          (pendingProfile?.displayName || pendingProfile?.fullName || '')
        ).toString().trim();
        if (!currentName || currentName.toLowerCase() === 'undefined' || currentName.toLowerCase().includes('@')) {
          // Only set fallback if user is not in active registration (age check)
          const userAge = profileData.createdAt 
            ? (Date.now() - (profileData.createdAt.seconds ? profileData.createdAt.toDate().getTime() : new Date(profileData.createdAt).getTime()))
            : Infinity;
            
          if (userAge > 10000 || bestDisplay) {
            updatedFields.name = bestDisplay || (profileData.email ? String(profileData.email).split('@')[0] : (userType === 'club' ? 'Kulüp' : 'Kullanıcı'));
            needsUpdate = true;
          }
        }
      }

      // Eksik bilgiler varsa profili güncelle
      if (needsUpdate) {
        // Preservation fields'ları koru
        if (profileData?._preserveUsername) {
          updatedFields._preserveUsername = profileData._preserveUsername;
        }
        if (profileData?._preserveClubName) {
          updatedFields._preserveClubName = profileData._preserveClubName;
        }
        if (profileData?._preserveDisplayName) {
          updatedFields._preserveDisplayName = profileData._preserveDisplayName;
        }
        
        console.log('🔧 getUserProfile: Updating with preserved fields:', {
          updating: Object.keys(updatedFields),
          hasPreserveUsername: !!profileData?._preserveUsername,
          hasPreserveClubName: !!profileData?._preserveClubName,
          hasPreserveDisplayName: !!profileData?._preserveDisplayName
        });
        
        // Re-check latest snapshot to avoid overwriting fresh values (race-proofing)
        try {
          const latest = await firestore.collection('users').doc(userId).get({ source: 'server' });
          const latestData = latest.exists ? (latest.data() || {}) : {};
          // If displayName/fullName/name just got set by another flow, drop our generic fallback
          if (updatedFields.displayName && latestData.displayName && latestData.displayName !== profileData.displayName) {
            // Keep the latest non-empty displayName
            if ((latestData.displayName || '').toString().trim()) delete updatedFields.displayName;
          }
          if (updatedFields.fullName && latestData.fullName && latestData.fullName !== profileData.fullName) {
            if ((latestData.fullName || '').toString().trim()) delete updatedFields.fullName;
          }
          if (updatedFields.name && latestData.name && latestData.name !== (profileData as any).name) {
            if ((latestData.name || '').toString().trim()) delete updatedFields.name;
          }
        } catch {}
        if (Object.keys(updatedFields).length > 0) {
          await firestore.collection('users').doc(userId).update(updatedFields);
        }
        // Best-effort: if we just added a username, ensure mapping doc exists
        try {
          if (updatedFields.username) {
            const uname = String(updatedFields.username).toLowerCase();
            const ref = firestore.collection('usernames').doc(uname);
            const doc = await ref.get();
            if (!doc.exists) {
              await ref.set({ userId, createdAt: new Date() });
            }
          }
        } catch (e) {
          console.warn('Failed to ensure username mapping (non-fatal):', e);
        }
        return { ...profileData, ...updatedFields };
      }
      
      return profileData;
    } else {
      // Get user from auth
      const user = auth.currentUser;
      
      if (user) {
        // Create a basic profile if one doesn't exist
        const normalizedUsername = (user.email?.split('@')[0] || '').toLowerCase();
        const basicProfile: any = {
          email: user.email,
          uid: userId,
          emailVerified: user.emailVerified,
          displayName: user.displayName || '',
          username: normalizedUsername || `user${Date.now().toString().slice(-6)}`,
          avatarIcon: 'account',
          avatarColor: '#1E88E5',
          coverIcon: 'city-variant',
          coverColor: '#0D47A1',
          userType: 'student',
          accountType: 'student',
          createdAt: new Date(),
          badges: [
            { name: 'Yeni Üye', icon: 'star', color: '#FFD700' }
          ],
        };
        
        if (!basicProfile.fullName) basicProfile.fullName = basicProfile.displayName || (basicProfile.email ? String(basicProfile.email).split('@')[0] : 'Kullanıcı');
        if (!basicProfile.name) basicProfile.name = basicProfile.displayName || basicProfile.fullName;

        // Save the basic profile
        await firestore.collection('users').doc(userId).set(basicProfile, { merge: true });
        
        // Ensure username mapping exists
        if (basicProfile.username) {
          const unameRef = firestore.collection('usernames').doc(basicProfile.username.toLowerCase());
          const unameDoc = await unameRef.get();
          if (!unameDoc.exists) {
            await unameRef.set({ userId, createdAt: new Date() });
          }
        }
        return basicProfile;
      } else {
        throw new Error('User profile not found and no current user');
      }
    }
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    throw error;
  }
};
