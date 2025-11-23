import React, { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import AdminControlService from '../../services/adminControlService';

const PROCESSED_PUSH_IDS_KEY = 'admin_processed_push_ids';
const MAX_STORED_PUSH_IDS = 50;

const AdminPushListener: React.FC = () => {
  const processedIdsRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const hydrateProcessedIds = async () => {
      try {
        const stored = await AsyncStorage.getItem(PROCESSED_PUSH_IDS_KEY);
        if (stored && isMounted) {
          const parsed: string[] = JSON.parse(stored);
          processedIdsRef.current = new Set(parsed);
        }
      } catch (error) {
        console.warn('⚠️ Failed to hydrate admin push cache:', error);
      } finally {
        if (isMounted) {
          hydratedRef.current = true;
        }
      }
    };

    const persistProcessedIds = async () => {
      const ids = Array.from(processedIdsRef.current).slice(-MAX_STORED_PUSH_IDS);
      processedIdsRef.current = new Set(ids);
      try {
        await AsyncStorage.setItem(PROCESSED_PUSH_IDS_KEY, JSON.stringify(ids));
      } catch (error) {
        console.warn('⚠️ Failed to persist admin push cache:', error);
      }
    };

    hydrateProcessedIds();

    const unsubscribe = AdminControlService.subscribeToPushQueue(async (changes) => {
      if (!hydratedRef.current) {
        return;
      }

      for (const change of changes) {
        if (change.type !== 'added') continue;
        const doc = change.doc;

        if (processedIdsRef.current.has(doc.id)) {
          continue;
        }

        const data = doc.data();
        if (!data?.title || !data?.message) {
          console.warn('⚠️ Skip invalid admin push payload', doc.id);
          continue;
        }

        if (data.deliveryMode && data.deliveryMode !== 'localOnly') {
          continue;
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: data.title,
            body: data.message,
            data,
          },
          trigger: null,
        }).catch((error) => console.warn('⚠️ Failed to schedule admin push:', error));

        processedIdsRef.current.add(doc.id);
        await persistProcessedIds();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return null;
};

export default AdminPushListener;

