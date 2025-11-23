/**
 * Unified Scoring Service
 * Handles scoring logic for events and activities
 */
export const unifiedScoringService = {
  calculateEventScore: (attendance: number, baseScore: number = 100) => {
    return Math.floor(baseScore * (1 + attendance * 0.1));
  },
  
  calculateActivityScore: (activityType: string) => {
    const scores: Record<string, number> = {
      'event_join': 50,
      'event_like': 10,
      'event_comment': 15,
      'club_follow': 25,
      'default': 5,
    };
    return scores[activityType] || scores.default;
  }
};