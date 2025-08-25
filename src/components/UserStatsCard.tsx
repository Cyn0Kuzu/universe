/**
 * 📊 User Stats Card Component
 * Displays user statistics and achievements
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

export interface UserStatsCardProps {
  totalScore: number;
  eventsJoined: number;
  clubsFollowed: number;
  badgeCount?: number;
  rank?: number;
  weeklyScore?: number;
  monthlyScore?: number;
  onPress?: () => void;
}

const UserStatsCard: React.FC<UserStatsCardProps> = ({
  totalScore,
  eventsJoined,
  clubsFollowed,
  badgeCount = 0,
  rank,
  weeklyScore = 0,
  monthlyScore = 0,
  onPress
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
              <Text style={styles.titleText}>İstatistiklerim</Text>
            </View>
            {rank && (
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{rank}</Text>
              </View>
            )}
          </View>

          {/* Main Stats */}
          <View style={styles.mainStats}>
            <View style={styles.mainStatItem}>
              <Text style={styles.mainStatValue}>
                {totalScore.toLocaleString()}
              </Text>
              <Text style={styles.mainStatLabel}>Toplam Puan</Text>
            </View>
            
            {weeklyScore > 0 && (
              <View style={styles.mainStatItem}>
                <Text style={styles.mainStatValue}>
                  {weeklyScore.toLocaleString()}
                </Text>
                <Text style={styles.mainStatLabel}>Bu Hafta</Text>
              </View>
            )}
          </View>

          {/* Secondary Stats */}
          <View style={styles.secondaryStats}>
            <View style={styles.secondaryStatItem}>
              <Ionicons name="calendar" size={16} color="#FFFFFF" />
              <Text style={styles.secondaryStatText}>{eventsJoined} Etkinlik</Text>
            </View>
            
            <View style={styles.secondaryStatItem}>
              <Ionicons name="people" size={16} color="#FFFFFF" />
              <Text style={styles.secondaryStatText}>{clubsFollowed} Kulüp</Text>
            </View>
            
            {badgeCount > 0 && (
              <View style={styles.secondaryStatItem}>
                <Ionicons name="ribbon" size={16} color="#FFFFFF" />
                <Text style={styles.secondaryStatText}>{badgeCount} Rozet</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          {onPress && (
            <View style={styles.footer}>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </View>
          )}
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  rankBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  mainStatItem: {
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  mainStatLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  secondaryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  secondaryStatText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
    opacity: 0.9,
  },
  footer: {
    alignItems: 'flex-end',
  },
});

export default UserStatsCard;
