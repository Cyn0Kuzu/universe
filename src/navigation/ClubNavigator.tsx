import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useDeviceLayout, getNavigationBarStyle, getNavigationLabelStyle, getNavigationIconStyle, getNavigationItemStyle } from '../utils/deviceLayoutUtils';

interface CustomTheme {
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
    placeholder: string;
    cardBorder: string;
    lightGray: string;
    secondaryBlue: string;
    darkBlue: string;
  };
}

// Kulüp ekranları
import ClubHomeScreen from '../screens/Club/ClubHomeScreen';
import ClubEventsScreen from '../screens/Club/ClubEventsScreen';
import ClubMembersScreen from '../screens/Club/ClubMembersScreen';
import ClubEventsListScreen from '../screens/Club/ClubEventsListScreen';
import CreateEventScreen from '../screens/Club/CreateEventScreen';
import EventAttendeesScreen from '../screens/Club/EventAttendeesScreen';
import ClubFollowersScreen from '../screens/Club/ClubFollowersScreen';
import ClubFollowingScreen from '../screens/Club/ClubFollowingScreen';
import ClubProfileScreen from '../screens/Club/ClubProfileScreen';
import MembershipApplicationsScreen from '../screens/Club/MembershipApplicationsScreen';
import ViewEventScreen from '../screens/Club/ViewEventScreen';

// Ortak ekranlar
import EventDetailScreen_Tabbed from '../screens/Events/EventDetailScreen_Tabbed';
import ViewProfileScreen from '../screens/Profile/ViewProfileScreen';
import ViewClubScreen from '../screens/Clubs/ViewClubScreen';
import StatisticsLeaderboardScreen from '../screens/Leaderboard/StatisticsLeaderboardScreen';
import NotificationScreen from '../screens/Home/NotificationScreen';
import EventsScreen from '../screens/Home/EventsScreen';

// Kulüp navigasyonu için tipler
export type ClubTabParamList = {
  ClubHome: undefined;
  ClubEvents: undefined;
  ClubMembers: undefined;
  ClubProfile: undefined;
};

export type ClubStackParamList = {
  ClubTabs: undefined;
  CreateEvent: undefined;
  EditEvent: { eventId: string };
  ViewEvent: { eventId: string; showDetailTabs?: boolean; initialTab?: number; event?: any };
  EventAttendees: { eventId: string };
  ClubFollowers: { clubId: string };
  ClubFollowing: { clubId: string };
  ClubEventsList: { clubId: string; clubName: string };
  ViewProfile: { userId: string };
  ViewClub: { clubId: string };
  Leaderboard: undefined;
  NotificationScreen: undefined;
  EventsScreen: undefined;
  LeaderboardScreen: undefined;
  MembershipApplications: undefined; // Üyelik başvuruları
  ViewEventScreen: { eventId: string }; // Kulüp etkinlik görüntüleme
};

const ClubTab = createBottomTabNavigator<ClubTabParamList>();
const ClubStack = createNativeStackNavigator<ClubStackParamList>();

const ClubTabNavigator = () => {
  const theme = useTheme() as CustomTheme;
  const deviceLayout = useDeviceLayout();
  const insets = useDeviceLayout().safeAreaInsets;

  return (
    <ClubTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          ...getNavigationBarStyle(),
          // CRITICAL: Use safe area insets to position tab bar above system navigation
          // This ensures tab bar sits right above phone's gesture navigation bar
          paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
          height: (deviceLayout.navigationBar.height - deviceLayout.navigationBar.paddingBottom) + (insets.bottom > 0 ? insets.bottom : 20),
        },
        tabBarLabelStyle: getNavigationLabelStyle(),
        tabBarIconStyle: {}, // Empty style to prevent icon hiding
        tabBarItemStyle: getNavigationItemStyle(),
        tabBarShowLabel: true,
        tabBarAllowFontScaling: false,
      }}
    >
      <ClubTab.Screen
        name="ClubHome"
        component={ClubHomeScreen}
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ color, size, focused }: { color: string, size: number, focused: boolean }) => {
            const iconSize = (size && size > 0) ? size : Math.max(deviceLayout.navigationBar.iconSize || 24, 24);
            const iconColor = color || (focused ? theme.colors.primary : '#9CA3AF');
            return (
              <MaterialCommunityIcons 
                name="home-variant" 
                color={iconColor} 
                size={iconSize}
              />
            );
          },
        }}
      />
      <ClubTab.Screen
        name="ClubEvents"
        component={ClubEventsScreen}
        options={{
          tabBarLabel: 'Etkinlikler',
          tabBarIcon: ({ color, size, focused }: { color: string, size: number, focused: boolean }) => {
            const iconSize = (size && size > 0) ? size : Math.max(deviceLayout.navigationBar.iconSize || 24, 24);
            const iconColor = color || (focused ? theme.colors.primary : '#9CA3AF');
            return (
              <MaterialCommunityIcons 
                name="calendar" 
                color={iconColor} 
                size={iconSize}
              />
            );
          },
        }}
      />
      <ClubTab.Screen
        name="ClubMembers"
        component={ClubMembersScreen}
        options={{
          tabBarLabel: 'Üyeler',
          tabBarIcon: ({ color, size, focused }: { color: string, size: number, focused: boolean }) => {
            const iconSize = (size && size > 0) ? size : Math.max(deviceLayout.navigationBar.iconSize || 24, 24);
            const iconColor = color || (focused ? theme.colors.primary : '#9CA3AF');
            return (
              <MaterialCommunityIcons 
                name="account-group" 
                color={iconColor} 
                size={iconSize}
              />
            );
          },
        }}
      />
      <ClubTab.Screen
        name="ClubProfile"
        component={ClubProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size, focused }: { color: string, size: number, focused: boolean }) => {
            const iconSize = (size && size > 0) ? size : Math.max(deviceLayout.navigationBar.iconSize || 24, 24);
            const iconColor = color || (focused ? theme.colors.primary : '#9CA3AF');
            return (
              <MaterialCommunityIcons 
                name="account" 
                color={iconColor} 
                size={iconSize}
              />
            );
          },
        }}
      />
    </ClubTab.Navigator>
  );
};

const ClubNavigator = () => {
  return (
    <ClubStack.Navigator
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <ClubStack.Screen name="ClubTabs" component={ClubTabNavigator} />
      <ClubStack.Screen name="CreateEvent" component={CreateEventScreen} />
      <ClubStack.Screen 
        name="EditEvent" 
        component={CreateEventScreen}
        options={{
          headerShown: false,
          title: 'Etkinliği Düzenle'
        }}
      />
      <ClubStack.Screen 
        name="ViewEvent" 
        component={EventDetailScreen_Tabbed}
        options={{
          headerShown: false,
          title: 'Etkinlik Detayları'
        }}
      />
      <ClubStack.Screen 
        name="EventAttendees" 
        component={EventAttendeesScreen}
        options={{
          headerShown: false
        }}
      />
      <ClubStack.Screen 
        name="ClubFollowers" 
        component={ClubFollowersScreen}
        options={{
          headerShown: false
        }}
      />
      <ClubStack.Screen 
        name="ClubFollowing" 
        component={ClubFollowingScreen}
        options={{
          headerShown: false
        }}
      />
      <ClubStack.Screen 
        name="ClubEventsList" 
        component={ClubEventsListScreen}
        options={{
          headerShown: false
        }}
      />
      <ClubStack.Screen 
        name="ViewProfile" 
        component={ViewProfileScreen}
        options={{
          headerShown: false
        }}
      />
      <ClubStack.Screen 
        name="ViewClub" 
        component={ViewClubScreen}
        options={{
          headerShown: false
        }}
      />
      <ClubStack.Screen 
        name="Leaderboard" 
        component={StatisticsLeaderboardScreen}
        options={{
          headerShown: false,
          title: 'Lider Tablosu'
        }}
      />
      <ClubStack.Screen 
        name="NotificationScreen" 
        component={NotificationScreen}
        options={{
          headerShown: false,
          title: 'Bildirimler'
        }}
      />
      <ClubStack.Screen 
        name="EventsScreen" 
        component={EventsScreen}
        options={{
          headerShown: false,
          title: 'Etkinlikler'
        }}
      />
      <ClubStack.Screen 
        name="LeaderboardScreen" 
        component={StatisticsLeaderboardScreen}
        options={{
          headerShown: false,
          title: 'Lider Tablosu'
        }}
      />
      <ClubStack.Screen 
        name="MembershipApplications" 
        component={MembershipApplicationsScreen}
        options={{
          headerShown: false,
          title: 'Üyelik Başvuruları'
        }}
      />
      <ClubStack.Screen 
        name="ViewEventScreen" 
        component={ViewEventScreen}
        options={{
          headerShown: false,
          title: 'Etkinlik Görüntüle'
        }}
      />
    </ClubStack.Navigator>
  );
};

export default ClubNavigator;
