// Export common UI components
export { UserAvatar, UniversalAvatar } from './common';

// Legal Components
export { TermsOfService, PrivacyPolicy } from './legal';

// Notification & Activity Components
export { default as NotificationModal } from './NotificationModal';
export { default as StudentNotificationModal } from './StudentNotificationModal';

// Club Components
export { default as ClubMemberStats } from './ClubMemberStats';

// Main Components
export { default as ClubEventCard } from './ClubEventCard';
export { default as StudentEventCard } from './StudentEventCard';
export { default as CustomDateTimePicker } from './CustomDateTimePicker';
export { default as EventDetailModal } from './EventDetailModal';
export { default as UpcomingEventsList } from './UpcomingEventsList';
export { default as UserProfileModal } from './UserProfileModal';

// Professional Components (Android 15+ Support)
export { default as GlobalErrorBoundary } from './common/GlobalErrorBoundary';
export { SafeAreaContainer, ResponsiveContent } from './common/SafeAreaContainer';
export { default as ScreenAdapter, MobileScreen, TabletScreen, FoldableScreen } from './common/ScreenAdapter';
