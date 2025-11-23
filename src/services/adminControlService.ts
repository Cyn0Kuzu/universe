import type firebase from 'firebase/compat/app';
import { getFirebaseCompatSync } from '../firebase/compat';
import { ensureAdminSession } from './adminSessionManager';
import SecureStorage, { AdminCredentials } from '../utils/secureStorage';

const firebaseCompat = getFirebaseCompatSync();
const firestore = firebaseCompat.firestore();
const FieldValue = firebaseCompat.firestore.FieldValue;

const ADMIN_DOC_REF = firestore.collection('adminConfigs').doc('controlPanel');
const PUSH_COLLECTION = firestore.collection('adminPushQueue');

export interface AdminBannerConfig {
  enabled: boolean;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  persistent?: boolean;
  bannerId?: string;
  updatedAt?: any;
}

export type AdminPushDeliveryMode = 'global' | 'localOnly';
export type AdminPushAudience = 'all' | 'students' | 'clubs';

export interface AdminPushPayload {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  category?: string;
  deliveryMode?: AdminPushDeliveryMode;
  audience?: AdminPushAudience;
}

const DEFAULT_ADMIN_CREDENTIALS: AdminCredentials = {
  username: 'universe',
  password: ' universe', // leading space intentional
};

const ensureAdminAuth = async () => {
  await ensureAdminSession();
};

export const AdminControlService = {
  DEFAULT_ADMIN_CREDENTIALS,

  async getAdminCredentials(): Promise<AdminCredentials> {
    return SecureStorage.getAdminCredentials(DEFAULT_ADMIN_CREDENTIALS);
  },

  async updateAdminCredentials(username: string, password: string): Promise<void> {
    return SecureStorage.setAdminCredentials({ username, password });
  },

  async publishBanner(config: Omit<AdminBannerConfig, 'updatedAt'>): Promise<void> {
    await ensureAdminAuth();
    const bannerId = config.bannerId || `${Date.now()}`;
    await ADMIN_DOC_REF.set(
      {
        banner: {
          ...config,
          bannerId,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
  },

  async clearBanner(): Promise<void> {
    await ensureAdminAuth();
    await ADMIN_DOC_REF.set(
      {
        banner: {
          enabled: false,
          message: '',
          title: '',
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
  },

  async getBannerConfig(): Promise<AdminBannerConfig | null> {
    const snapshot = await ADMIN_DOC_REF.get();
    return (snapshot.data()?.banner as AdminBannerConfig) ?? null;
  },

  subscribeToBanner(callback: (banner: AdminBannerConfig | null) => void): () => void {
    return ADMIN_DOC_REF.onSnapshot(
      (snapshot) => {
        const data = snapshot.data();
        if (data?.banner) {
          callback(data.banner as AdminBannerConfig);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('❌ Admin banner listener error:', error);
        callback(null);
      }
    );
  },

  async sendPushNotification(payload: AdminPushPayload): Promise<void> {
    await ensureAdminAuth();
    const doc: Record<string, any> = {
      title: payload.title,
      message: payload.message,
      createdAt: FieldValue.serverTimestamp(),
      delivered: false,
      category: payload.category || 'announcement',
      deliveryMode: payload.deliveryMode || 'global',
      audience: payload.audience || 'all',
    };

    if (payload.ctaLabel?.trim()) {
      doc.ctaLabel = payload.ctaLabel.trim();
    }
    if (payload.ctaUrl?.trim()) {
      doc.ctaUrl = payload.ctaUrl.trim();
    }

    await PUSH_COLLECTION.add(doc);
  },

  subscribeToPushQueue(callback: (changes: firebase.firestore.DocumentChange[]) => void): () => void {
    return PUSH_COLLECTION.orderBy('createdAt', 'asc').onSnapshot(
      (snapshot) => {
        callback(snapshot.docChanges());
      },
      (error) => {
        console.error('❌ Admin push listener error:', error);
      }
    );
  },
};

export default AdminControlService;

