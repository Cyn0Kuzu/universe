import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Öğrenci ekranları
import HomeScreen from '../screens/Home/HomeScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import EventsScreen from '../screens/Home/EventsScreen';
import ClubsScreen from '../screens/Clubs/ClubsScreen';
import StatisticsLeaderboardScreen from '../screens/Leaderboard/StatisticsLeaderboardScreen';
import ViewClubScreen from '../screens/Clubs/ViewClubScreen';
import ViewEventScreen from '../screens/Events/EventDetailScreen_Tabbed';
import EventDetailScreen_Tabbed from '../screens/Events/EventDetailScreen_Tabbed';
// import ClubEventsListScreen from '../screens/Club/ClubEventsListScreen'; // Not needed anymore
import ClubFollowersScreen from '../screens/Clubs/ClubFollowersScreen';
import ClubFollowingScreen from '../screens/Club/ClubFollowingScreen';
import ClubMembersScreen from '../screens/Club/ClubMembersScreen';
import ViewProfileScreen from '../screens/Profile/ViewProfileScreen';
import ProfileFollowersScreen from '../screens/Profile/ProfileFollowersScreen';
import ProfileFollowingScreen from '../screens/Profile/ProfileFollowingScreen';
import StudentEventsListScreen from '../screens/Profile/StudentEventsListScreen';
import NotificationScreen from '../screens/Home/NotificationScreen';
import MyMembershipsScreen from '../screens/Profile/MyMembershipsScreen';
// import ClubProfileScreen from '../screens/Club/ClubProfileScreen'; // Import sorunu

// Öğrenci navigasyonu için tipler
export type StudentTabParamList = {
  Home: undefined;
  Clubs: undefined;
  Events: undefined;
  Leaders: undefined;
  Profile: undefined;
};

export type StudentStackParamList = {
  StudentTabs: undefined;
  ViewClub: { clubId: string };
  ClubProfile: { clubId: string };
  ViewEvent: { eventId: string; showDetailTabs?: boolean; initialTab?: number; event?: any };
  ClubFollowers: { clubId: string };
  ClubFollowing: { clubId: string };
  ClubMembers: { clubId: string };
  // ViewClubEvents: { clubId: string; clubName?: string }; // Removed - using Events with clubId filter instead
  StudentEventsList: { userId: string; userName?: string };
  ViewProfile: { userId: string };
  ProfileFollowers: { userId: string };
  ProfileFollowing: { userId: string };
  Notifications: undefined;
  Events: { filter?: string, clubId?: string } | undefined;
  Clubs: undefined;
  MyMemberships: undefined; // Yeni ekran - Üye Olduklarım
  // Buraya diğer stack ekranları eklenebilir
};

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
  }
}

const StudentTab = createBottomTabNavigator<StudentTabParamList>();
const StudentStack = createNativeStackNavigator<StudentStackParamList>();

const StudentTabNavigator = () => {
  const theme = useTheme() as CustomTheme;

  return (
    <StudentTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          elevation: 10,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        }
      }}
    >
      <StudentTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ color, size }: { color: string, size: number }) => (
            <MaterialCommunityIcons name="home-variant" color={color} size={size} />
          ),
        }}
      />
      <StudentTab.Screen
        name="Clubs"
        component={ClubsScreen}
        options={{
          tabBarLabel: 'Kulüpler',
          tabBarIcon: ({ color, size }: { color: string, size: number }) => (
            <MaterialCommunityIcons name="account-group" color={color} size={size} />
          ),
        }}
      />
      <StudentTab.Screen
        name="Events"
        component={EventsScreen}
        options={{
          tabBarLabel: 'Etkinlikler',
          tabBarIcon: ({ color, size }: { color: string, size: number }) => (
            <MaterialCommunityIcons name="calendar" color={color} size={size} />
          ),
        }}
      />
      <StudentTab.Screen
        name="Leaders"
        component={StatisticsLeaderboardScreen}
        options={{
          tabBarLabel: 'Liderler',
          tabBarIcon: ({ color, size }: { color: string, size: number }) => (
            <MaterialCommunityIcons name="star-circle" color={color} size={size} />
          ),
        }}
      />
      <StudentTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }: { color: string, size: number }) => (
            <MaterialCommunityIcons name="account-circle" color={color} size={size} />
          ),
        }}
      />
    </StudentTab.Navigator>
  );
};

const StudentNavigator = () => {
  return (
    <StudentStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <StudentStack.Screen name="StudentTabs" component={StudentTabNavigator} />
      <StudentStack.Screen 
        name="ViewClub" 
        component={ViewClubScreen} 
        options={{
          headerShown: false
        }}
      />
      <StudentStack.Screen 
        name="ClubProfile" 
        component={ClubsScreen} 
        options={{
          headerShown: false
        }}
      />
      <StudentStack.Screen 
        name="ViewEvent" 
        component={EventDetailScreen_Tabbed} 
        options={{
          headerShown: false,
          title: 'Etkinlik Detayları'
        }}
      />
      {/* EventDetailScreen_Tabbed rotası kaldırıldı çünkü artık ViewEvent yönlendirmesi kullanılıyor */}
      <StudentStack.Screen 
        name="ClubFollowers" 
        component={ClubFollowersScreen}
        options={{
          headerShown: false
        }}
      />
      <StudentStack.Screen 
        name="ClubFollowing" 
        component={ClubFollowingScreen}
        options={{
          headerShown: false
        }}
      />
      <StudentStack.Screen 
        name="ClubMembers" 
        component={ClubMembersScreen}
        options={{
          headerShown: false
        }}
      />
      <StudentStack.Screen 
        name="ViewProfile" 
        component={ViewProfileScreen}
        options={{
          headerShown: false
        }}
      />
      <StudentStack.Screen 
        name="Events" 
        component={EventsScreen} 
        options={{
          headerShown: false
        }}
      />
      <StudentStack.Screen 
        name="Clubs" 
        component={ClubsScreen} 
        options={{
          headerShown: false
        }}
      />
      <StudentStack.Screen 
        name="ProfileFollowers" 
        component={ProfileFollowersScreen}
        options={{
          headerShown: false
        }}
      />
      <StudentStack.Screen 
        name="ProfileFollowing" 
        component={ProfileFollowingScreen}
        options={{
          headerShown: false
        }}
      />
      <StudentStack.Screen 
        name="StudentEventsList" 
        component={StudentEventsListScreen}
        options={{
          headerShown: false
        }}
      />
      {/* ViewClubEvents ekranı kaldırıldı - Events ekranı ile değiştirildi */}
      <StudentStack.Screen 
        name="Notifications" 
        component={NotificationScreen}
        options={{
          headerShown: false
        }}
      />
      <StudentStack.Screen 
        name="MyMemberships" 
        component={MyMembershipsScreen}
        options={{
          headerShown: false
        }}
      />
    </StudentStack.Navigator>
  );
};

export default StudentNavigator;
