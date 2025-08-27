# Universe - Student Club Management App

A modern React Native application for managing university student clubs and events.

## 🚀 Features

- **Student Management**: Profile management, leaderboards, notifications
- **Club Management**: Event creation, member management, analytics
- **Event System**: Event discovery, attendance tracking, calendar integration
- **Real-time Features**: Live notifications, real-time leaderboards
- **Modern UI**: Material Design with dark/light theme support

## 🛠 Tech Stack

- **Framework**: React Native with Expo SDK 50
- **Language**: TypeScript
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Navigation**: React Navigation v6
- **UI Library**: React Native Paper v4
- **State Management**: Context API
- **Testing**: Jest + React Native Testing Library

## 📱 Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

## 🔧 Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd universe
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

3. Configure Firebase:
   - Create a Firebase project
   - Download configuration files
   - Update `src/firebase/config.ts`

4. Start the development server:
```bash
npx expo start
```

## 📁 Project Structure

```
src/
├── components/        # Reusable UI components
├── screens/          # Screen components
├── navigation/       # Navigation configuration
├── contexts/         # React Context providers
├── firebase/         # Firebase configuration and services
├── hooks/           # Custom React hooks
├── services/        # Business logic and API services
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── theme/           # Design system and styling
├── constants/       # App constants
└── tests/           # Test files and configuration
```

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## 🏗 Building

### Development Build
```bash
npx expo build:android
npx expo build:ios
```

### Production Build
```bash
eas build --platform all
```

## 📝 Scripts

- `npm start` - Start Expo development server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript compiler

## 🔒 Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

- Development Team
- Design Team
- QA Team

## 📞 Support

For support, email support@universe-app.com or create an issue in the repository.
