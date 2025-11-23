import type firebase from 'firebase/compat/app';
import { getFirebaseCompatSync } from '../firebase/compat';

const ADMIN_AUTH_EMAIL = 'cayankuzu.0@gmail.com';
const ADMIN_AUTH_PASSWORD = ' universe'; // leading space intentional

const ensureAdminUserDocument = async (user: firebase.User | null): Promise<void> => {
  if (!user) {
    return;
  }

  const firebaseCompat = getFirebaseCompatSync();
  const firestore = firebaseCompat.firestore();
  const FieldValue = firebaseCompat.firestore.FieldValue;
  const userRef = firestore.collection('users').doc(user.uid);

  const baseProfile = {
    uid: user.uid,
    email: ADMIN_AUTH_EMAIL,
    name: 'Universe Admin',
    displayName: 'Universe Admin',
    userType: 'student',
    role: 'admin',
    isAdminPanelAccount: true,
    lastAdminLoginAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const existingDoc = await userRef.get();
  if (existingDoc.exists) {
    await userRef.set(baseProfile, { merge: true });
  } else {
    await userRef.set({
      ...baseProfile,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
};

export const ensureAdminSession = async (): Promise<void> => {
  const firebaseCompat = getFirebaseCompatSync();
  const auth = firebaseCompat.auth();

  if (auth.currentUser?.email === ADMIN_AUTH_EMAIL) {
    await ensureAdminUserDocument(auth.currentUser);
    return;
  }

  if (auth.currentUser) {
    await auth.signOut();
  }

  try {
    const credential = await auth.signInWithEmailAndPassword(
      ADMIN_AUTH_EMAIL,
      ADMIN_AUTH_PASSWORD
    );
    await ensureAdminUserDocument(credential.user);
  } catch (error: any) {
    if (error?.code === 'auth/user-not-found' || error?.code === 'auth/invalid-login-credentials') {
      console.log('📝 Creating new admin account...');
      try {
        const newCredential = await auth.createUserWithEmailAndPassword(
          ADMIN_AUTH_EMAIL,
          ADMIN_AUTH_PASSWORD
        );
        await ensureAdminUserDocument(newCredential.user);
        console.log('✅ Admin account created successfully');
        return;
      } catch (createError: any) {
        console.error('❌ Failed to create admin account:', createError);
        if (createError?.code === 'auth/email-already-in-use') {
          // Account exists but password is wrong - send password reset email
          console.log('⚠️ Admin account exists with different password, sending password reset email...');
          try {
            await auth.sendPasswordResetEmail(ADMIN_AUTH_EMAIL);
            console.log('✅ Password reset email sent to', ADMIN_AUTH_EMAIL);
            throw new Error('Admin hesabı mevcut ancak şifre yanlış. Şifre sıfırlama e-postası gönderildi. Lütfen e-postanızı kontrol edin ve şifrenizi sıfırlayın.');
          } catch (resetError: any) {
            if (resetError?.message?.includes('şifre sıfırlama')) {
              throw resetError;
            }
            console.error('❌ Failed to send password reset email:', resetError);
            throw new Error('Admin hesabı mevcut ancak şifre yanlış. Lütfen Firebase Console\'dan şifreyi sıfırlayın veya e-postanıza gelen şifre sıfırlama linkini kullanın.');
          }
        }
        throw createError;
      }
    }
    throw error;
  }
};

export default {
  ensureAdminSession,
};

