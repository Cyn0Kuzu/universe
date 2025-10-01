/**
 * 🏆 Profile Leaderboard Card Component
 * Displays user ranking and stats in profile
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export interface ProfileLeaderboardCardProps {
  rank: number;
  totalScore: number;
  weeklyScore: number;
  monthlyScore: number;
  badgeCount: number;
  onPress?: () => void;
}

export const ProfileLeaderboardCard: React.FC<ProfileLeaderboardCardProps> = ({
  rank,
  totalScore,
  weeklyScore,
  monthlyScore,
  badgeCount,
  onPress
}) => {
  const getRankColor = () => {
    if (rank === 1) return ['#FFD700', '#FFA500'];
    if (rank === 2) return ['#C0C0C0', '#A9A9A9'];
    if (rank === 3) return ['#CD7F32', '#8B4513'];
    return ['#667eea', '#764ba2'];
  };

  const getRankIcon = () => {
    if (rank <= 3) return 'trophy';
    return 'medal';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={getRankColor()}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.rankContainer}>
              <Ionicons
                name={getRankIcon()}
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.rankText}>#{rank}</Text>
            </View>
            <Text style={styles.titleText}>Sıralamanız</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalScore.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Toplam Puan</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyScore.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Bu Hafta</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{monthlyScore.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Bu Ay</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{badgeCount}</Text>
              <Text style={styles.statLabel}>Rozet</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width - 32,
    alignSelf: 'center',
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  gradient: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  titleText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'flex-end',
  },
});

export default ProfileLeaderboardCard;
