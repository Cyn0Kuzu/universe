# Developer Onboarding Guide

## Welcome to Universe!

This guide will help you get started with the Universe React Native application development.

## 🎯 Quick Start

### 1. Environment Setup
```bash
# Install Node.js 18+
# Install Expo CLI
npm install -g @expo/cli

# Clone and setup project
git clone [repository-url]
cd universe
npm install --legacy-peer-deps
```

### 2. Firebase Configuration
1. Get Firebase configuration from team lead
2. Update `src/firebase/config.ts` with your credentials
3. Ensure you have access to the development Firebase project

### 3. Run the Application
```bash
# Start development server
npm start

# Run on specific platform
npm run android  # Android
npm run ios      # iOS
npm run web      # Web
```

## 📁 Project Architecture

### Core Directories
- `src/screens/` - Screen components organized by feature
- `src/components/` - Reusable UI components
- `src/services/` - Business logic and API calls
- `src/utils/` - Utility functions and helpers
- `src/types/` - TypeScript type definitions
- `src/theme/` - Design system and styling

### Design Patterns
- **Context API** for state management
- **Service Layer** for business logic
- **Custom Hooks** for reusable logic
- **Utility Functions** for common operations

## 🛠 Development Workflow

### 1. Code Quality
```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

### 2. Testing
```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### 3. Git Workflow
1. Create feature branch: `git checkout -b feature/feature-name`
2. Make changes and commit: `git commit -m "feat: description"`
3. Push and create PR: `git push origin feature/feature-name`
4. Request code review

## 🏗 Key Features to Understand

### 1. Authentication System
- Firebase Auth integration
- Persistent login state
- Role-based access (Student/Club)

### 2. Navigation Structure
- Stack navigators for each user type
- Tab navigation for main screens
- Modal navigation for overlays

### 3. Data Management
- Firestore for real-time data
- Context providers for state
- Service classes for data operations

### 4. UI Components
- React Native Paper for Material Design
- Custom theme system
- Responsive design patterns

## 📋 Common Tasks

### Adding a New Screen
1. Create screen component in appropriate directory
2. Add navigation route
3. Update TypeScript types
4. Add tests

### Adding a New Service
1. Create service class in `src/services/`
2. Export from `src/services/index.ts`
3. Add TypeScript interfaces
4. Write unit tests

### Styling Components
1. Use theme system from `src/theme/`
2. Follow Material Design principles
3. Ensure responsive design
4. Test on multiple screen sizes

## 🐛 Debugging

### Common Issues
1. **Metro bundler issues**: Clear cache with `npx expo start --clear`
2. **Module resolution**: Check import paths and aliases
3. **Firebase errors**: Verify configuration and permissions
4. **Navigation issues**: Check route names and parameters

### Debug Tools
- React Native Debugger
- Flipper for network inspection
- VS Code debugging configuration
- Console logging (remove before production)

## 📚 Resources

### Documentation
- [React Native Docs](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Firebase for React Native](https://rnfirebase.io/)
- [React Navigation](https://reactnavigation.org/)

### Team Resources
- Design System Guide (link to internal docs)
- API Documentation (link to backend docs)
- Code Review Guidelines (link to team guidelines)

## 🤝 Getting Help

1. **Code Issues**: Create issue in repository
2. **Design Questions**: Contact design team
3. **Backend Issues**: Contact backend team
4. **General Questions**: Use team Slack channel

## ✅ Checklist for New Developers

- [ ] Environment setup complete
- [ ] Can run app on device/simulator
- [ ] Firebase access configured
- [ ] First successful build
- [ ] Code quality tools working
- [ ] Tests running successfully
- [ ] Team communication channels joined

Welcome to the team! 🚀
