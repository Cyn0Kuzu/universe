import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Text,
  useTheme,
  ActivityIndicator,
  Chip,
  Button,
  Portal,
  Modal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SearchBar, SearchResultCard } from '../../components/common';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/LoadingStates';
import SearchService, { SearchResult, SearchFilters } from '../../services/searchService';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

const SearchScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [popularSuggestions, setPopularSuggestions] = useState<string[]>([]);

  // Filters
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    sortBy: 'relevance',
    limit: 20
  });

  // Load popular suggestions on mount
  useEffect(() => {
    loadPopularSuggestions();
  }, []);

  const loadPopularSuggestions = async () => {
    try {
      const suggestions = await SearchService.getPopularSuggestions(10);
      setPopularSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading popular suggestions:', error);
    }
  };

  // Perform search
  const performSearch = useCallback(async (query: string = searchQuery) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Searching for:', query, 'with filters:', filters);
      const results = await SearchService.search(query.trim(), filters);
      setSearchResults(results);
      
      if (results.length === 0) {
        setError('Arama kriterlerinize uygun sonuç bulunamadı.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Arama sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters]);

  // Handle search input change
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    // Clear results when search is empty
    if (!text.trim()) {
      setSearchResults([]);
      setError(null);
    }
  };

  // Handle search submission
  const handleSearch = (query?: string) => {
    performSearch(query);
  };

  // Handle suggestion tap
  const handleSuggestionTap = (suggestion: string) => {
    setSearchQuery(suggestion);
    handleSearch(suggestion);
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (!searchQuery.trim()) return;
    
    setRefreshing(true);
    await performSearch();
    setRefreshing(false);
  };

  // Handle clear
  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  // Handle filter change
  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    if (searchQuery.trim()) {
      performSearch();
    }
  };

  // Handle result press
  const handleResultPress = (result: SearchResult) => {
    console.log('🔍 Search result pressed:', result.type, result.id, result.title);
    
    try {
      switch (result.type) {
        case 'event':
          console.log('📅 Navigating to event:', result.id);
          (navigation as any).navigate('ViewEvent', { eventId: result.id });
          break;
        case 'club':
          console.log('🏢 Navigating to club:', result.id);
          (navigation as any).navigate('ViewClub', { clubId: result.id });
          break;
        case 'user':
          console.log('👤 Navigating to user profile:', result.id);
          (navigation as any).navigate('ViewProfile', { userId: result.id });
          break;
        default:
          console.warn('Unknown result type:', result.type);
      }
    } catch (error) {
      console.error('Error navigating to result:', error);
      Alert.alert('Hata', 'Sayfa açılırken bir hata oluştu.');
    }
  };

  // Render filter chips
  const renderFilterChips = () => (
    <View style={styles.filterChipsContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[
          { key: 'all', label: 'Tümü' },
          { key: 'event', label: 'Etkinlikler' },
          { key: 'club', label: 'Kulüpler' },
          { key: 'user', label: 'Kullanıcılar' }
        ]}
        renderItem={({ item }) => (
          <Chip
            selected={filters.type === item.key}
            onPress={() => handleFilterChange({ type: item.key as any })}
            style={[
              styles.filterChip,
              filters.type === item.key && { backgroundColor: theme.colors.primary + '20' }
            ]}
            textStyle={[
              styles.filterChipText,
              filters.type === item.key && { color: theme.colors.primary }
            ]}
          >
            {item.label}
          </Chip>
        )}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.filterChipsContent}
      />
    </View>
  );

  // Render popular suggestions
  const renderPopularSuggestions = () => (
    <View style={styles.suggestionsContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Popüler Aramalar
      </Text>
      <View style={styles.suggestionsGrid}>
        {popularSuggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.suggestionItem, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleSuggestionTap(suggestion)}
          >
            <MaterialCommunityIcons
              name="trending-up"
              size={16}
              color={theme.colors.primary}
              style={styles.suggestionIcon}
            />
            <Text
              style={[styles.suggestionText, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {suggestion}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => {
    if (loading) return null;
    
    if (!searchQuery.trim()) {
      return renderPopularSuggestions();
    }
    
    if (error) {
      return (
        <ErrorState
          title="Arama Hatası"
          description={error}
          retryText="Tekrar Dene"
          onRetry={() => performSearch()}
        />
      );
    }
    
    return (
      <EmptyState
        title="Sonuç Bulunamadı"
        description={`"${searchQuery}" için herhangi bir sonuç bulunamadı. Farklı anahtar kelimeler deneyin.`}
        icon="magnify-close"
        actionText="Filtreleri Temizle"
        onAction={() => {
          setFilters({ type: 'all', sortBy: 'relevance', limit: 20 });
          performSearch();
        }}
      />
    );
  };

  // Render search result item
  const renderResultItem = ({ item }: { item: SearchResult }) => (
    <SearchResultCard
      result={item}
      onPress={() => handleResultPress(item)}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearchChange}
          onSearch={handleSearch}
          onClear={handleClear}
          placeholder="Etkinlik, kulüp veya kullanıcı ara..."
          showCancelButton={false}
          loading={loading}
          style={styles.searchBar}
        />
        
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => setShowFilters(true)}
        >
          <MaterialCommunityIcons
            name="tune"
            size={20}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      {renderFilterChips()}

      {/* Results */}
      <View style={styles.resultsContainer}>
        {searchResults.length > 0 && (
          <Text style={[styles.resultsCount, { color: theme.colors.text }]}>
            {searchResults.length} sonuç bulundu
          </Text>
        )}
        
        {loading && searchResults.length === 0 ? (
          <LoadingState message="Aranıyor..." />
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderResultItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.colors.primary]}
              />
            }
            contentContainerStyle={styles.resultsList}
            ListEmptyComponent={renderEmptyState}
          />
        )}
      </View>

      {/* Filter Modal */}
      <Portal>
        <Modal
          visible={showFilters}
          onDismiss={() => setShowFilters(false)}
          contentContainerStyle={[
            styles.filterModal,
            { backgroundColor: theme.colors.surface }
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Arama Filtreleri
          </Text>
          
          {/* Sorting Options */}
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Sıralama
          </Text>
          
          {[
            { key: 'relevance', label: 'İlgililik' },
            { key: 'date', label: 'Tarih' },
            { key: 'popularity', label: 'Popülerlik' },
            { key: 'alphabetical', label: 'Alfabetik' }
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={styles.filterOption}
              onPress={() => handleFilterChange({ sortBy: option.key as any })}
            >
              <Text style={[styles.filterOptionText, { color: theme.colors.onSurface }]}>
                {option.label}
              </Text>
              {filters.sortBy === option.key && (
                <MaterialCommunityIcons
                  name="check"
                  size={20}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>
          ))}
          
          <Button
            mode="contained"
            onPress={() => setShowFilters(false)}
            style={styles.closeButton}
          >
            Kapat
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  searchBar: {
    flex: 1,
    marginRight: 12,
    marginVertical: 0,
    marginHorizontal: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  filterChipsContainer: {
    paddingVertical: 10,
  },
  filterChipsContent: {
    paddingHorizontal: 20,
  },
  filterChip: {
    marginRight: 8,
    height: 32,
  },
  filterChipText: {
    fontSize: 12,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 20,
    paddingVertical: 8,
    opacity: 0.7,
  },
  resultsList: {
    paddingBottom: 20,
  },
  suggestionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginVertical: 4,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  suggestionIcon: {
    marginRight: 6,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterModal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  filterOptionText: {
    fontSize: 16,
  },
  closeButton: {
    marginTop: 20,
  },
});

export default SearchScreen;
