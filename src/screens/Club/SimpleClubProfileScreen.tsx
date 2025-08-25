import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { firebase } from '../../firebase/config';
import ClubScoreFixService from '../../services/clubScoreFixService';

const SimpleClubProfileScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const [clubStats, setClubStats] = useState({
    totalPoints: 0,
    userScoresPoints: 0,
    clubStatsInteractions: 0,
    calculatedPoints: 0,
    source: 'none'
  });
  const [loading, setLoading] = useState(false);

  const loadRealScores = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    setLoading(true);
    try {
      console.log('🔍 Loading real scores for club:', currentUser.uid);
      
      // Get userScores
      let userScoresPoints = 0;
      const userScoreDoc = await firebase.firestore().collection('userScores').doc(currentUser.uid).get();
      if (userScoreDoc.exists) {
        const data = userScoreDoc.data();
        userScoresPoints = data?.totalPoints || 0;
        console.log('📊 UserScores points:', userScoresPoints);
      }
      
      // Get clubStats
      let clubStatsInteractions = 0;
      const clubStatsDoc = await firebase.firestore().collection('clubStats').doc(currentUser.uid).get();
      if (clubStatsDoc.exists) {
        const data = clubStatsDoc.data();
        clubStatsInteractions = data?.totalInteractions || 0;
        console.log('📊 ClubStats interactions:', clubStatsInteractions);
      }
      
      const calculatedPoints = clubStatsInteractions * 10;
      console.log('🔢 Calculated points (interactions * 10):', calculatedPoints);
      
      setClubStats({
        totalPoints: userScoresPoints || calculatedPoints,
        userScoresPoints,
        clubStatsInteractions,
        calculatedPoints,
        source: userScoresPoints > 0 ? 'userScores' : 'clubStats'
      });
      
    } catch (error) {
      console.error('❌ Error loading scores:', error);
      Alert.alert('Error', 'Failed to load scores');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const syncScores = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      console.log('🔄 SimpleClubProfile: Starting complete score fix...');
      
      // ⭐ YENİ: Kapsamlı puan sistemi düzeltmesi
      const fixResult = await ClubScoreFixService.fixCompleteClubScore(currentUser.uid);
      
      if (fixResult.success) {
        console.log('✅ SimpleClubProfile: Score fix completed:', fixResult);
        Alert.alert(
          'Sync Complete', 
          `✅ Puan sistemi başarıyla düzeltildi!\n\n` +
          `📊 Toplam Puan: ${fixResult.totalPoints}\n` +
          `🏆 Level: ${fixResult.level}\n\n` +
          `${fixResult.message}`
        );
      } else {
        console.error('❌ SimpleClubProfile: Score fix failed:', fixResult.message);
        Alert.alert('Sync Failed', `❌ Puan sistemi düzeltilemedi:\n${fixResult.message}`);
      }
      
      // Reload scores to reflect changes
      loadRealScores();
      
    } catch (error) {
      console.error('❌ SimpleClubProfile: Error syncing scores:', error);
      Alert.alert('Error', 'Failed to sync scores: ' + (error as Error).message);
    }
  }, [currentUser, loadRealScores]);

  useEffect(() => {
    loadRealScores();
  }, [loadRealScores]);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRealScores} />}
    >
      <Text style={styles.title}>Club Profile - Real Scores</Text>
      <Text style={styles.subtitle}>Club: {currentUser?.uid}</Text>
      
      <View style={styles.statsContainer}>
        <Text style={styles.statItem}>Display Score: {clubStats.totalPoints}</Text>
        <Text style={styles.statItem}>UserScores Points: {clubStats.userScoresPoints}</Text>
        <Text style={styles.statItem}>ClubStats Interactions: {clubStats.clubStatsInteractions}</Text>
        <Text style={styles.statItem}>Calculated Points: {clubStats.calculatedPoints}</Text>
        <Text style={styles.statItem}>Source: {clubStats.source}</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <Button mode="contained" onPress={loadRealScores} style={styles.button}>
          Reload Scores
        </Button>
        
        <Button mode="contained" onPress={syncScores} style={styles.button}>
          Sync Real Scores
        </Button>
      </View>
      
      <Text style={styles.note}>
        If scores don't match, tap "Sync Real Scores" to fix them.
        Database clubStats interactions * 10 should equal displayed score.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666'
  },
  statsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30
  },
  statItem: {
    fontSize: 16,
    marginBottom: 10,
    fontFamily: 'monospace'
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 30
  },
  button: {
    marginVertical: 5
  },
  note: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});

export default SimpleClubProfileScreen;
