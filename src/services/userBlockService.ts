import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';

interface BlockFunctionResponse {
  success: boolean;
  message?: string;
  blockedUserId?: string;
}

class UserBlockService {
  private functions = getFunctions();

  async blockUser(targetUserId: string, metadata?: { targetDisplayName?: string }) {
    try {
      const blockUserCallable = httpsCallable(this.functions, 'blockUserAccount');
      const result = await blockUserCallable({
        targetUserId,
        targetDisplayName: metadata?.targetDisplayName || ''
      }) as HttpsCallableResult<BlockFunctionResponse>;
      return result.data;
    } catch (error) {
      console.error('❌ Failed to block user:', error);
      throw error;
    }
  }

  async unblockUser(targetUserId: string) {
    try {
      const unblockCallable = httpsCallable(this.functions, 'unblockUserAccount');
      const result = await unblockCallable({ targetUserId }) as HttpsCallableResult<BlockFunctionResponse>;
      return result.data;
    } catch (error) {
      console.error('❌ Failed to unblock user:', error);
      throw error;
    }
  }
}

export const userBlockService = new UserBlockService();

