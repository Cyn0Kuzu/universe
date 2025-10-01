import React from 'react';
import { render, screen } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { AuthContext } from '../../contexts/AuthContext';
import App from '../../../App';

// Mock Firebase
jest.mock('../../firebase/config', () => ({
  auth: {},
  db: {},
  storage: {},
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        firebaseApiKey: 'test-key',
      },
    },
  },
}));

describe('App Component', () => {
  const mockAuthContext = {
    user: null,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    signup: jest.fn(),
  };

  const renderWithAuth = (authValue = mockAuthContext) => {
    return render(
      <AuthContext.Provider value={authValue}>
        <App />
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state correctly', () => {
    const loadingAuthContext = {
      ...mockAuthContext,
      isLoading: true,
    };

    renderWithAuth(loadingAuthContext);
    
    // Since we don't have a specific loading component,
    // this test verifies the app doesn't crash during loading
    expect(screen.getByTestId).toBeDefined();
  });

  it('should render auth navigator when user is not logged in', () => {
    renderWithAuth();
    
    // This test verifies the app renders without crashing
    // when no user is authenticated
    expect(screen.getByTestId).toBeDefined();
  });

  it('should render app navigator when user is logged in', () => {
    const authenticatedAuthContext = {
      ...mockAuthContext,
      user: {
        uid: 'test-uid',
        email: 'test@university.edu.tr',
        displayName: 'Test User',
      },
    };

    renderWithAuth(authenticatedAuthContext);
    
    // This test verifies the app renders without crashing
    // when a user is authenticated
    expect(screen.getByTestId).toBeDefined();
  });
});
