import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';

export interface ReportPayload {
  reportedUserId: string;
  reportedUserName?: string;
  reportedUserEmail?: string;
  title: string;
  topic: string;
  description: string;
  attachmentUrl?: string;
  contactEmail?: string;
}

interface ReportResponse {
  success: boolean;
  message?: string;
  reportId?: string;
}

class ReportSubmissionService {
  private functions = getFunctions();

  async submitUserReport(payload: ReportPayload): Promise<ReportResponse> {
    try {
      const submitReportCallable = httpsCallable(this.functions, 'submitUserReport');
      const result = await submitReportCallable(payload) as HttpsCallableResult<ReportResponse>;
      return result.data;
    } catch (error) {
      console.error('❌ Failed to submit report:', error);
      throw error;
    }
  }
}

export const reportSubmissionService = new ReportSubmissionService();

