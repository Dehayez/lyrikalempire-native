# Lyrikal Empire - React Native

React Native mobile app for Lyrikal Empire beat management.

## Prerequisites

- Node.js >= 20
- Xcode (for iOS development)
- Android Studio (for Android development)
- CocoaPods (for iOS)

## Getting Started

### Install Dependencies

```bash
npm install
```

### iOS Setup

```bash
cd ios
pod install
cd ..
```

### Run the App

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

### Start Metro Bundler

```bash
npm start
```

## Project Structure

```
native/
├── android/              # Android native code
├── ios/                  # iOS native code
├── src/
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React Context providers
│   ├── hooks/            # Custom React hooks
│   ├── navigation/       # React Navigation setup
│   ├── screens/          # Screen components
│   │   ├── auth/         # Authentication screens
│   │   ├── dashboard/    # Dashboard screens
│   │   └── main/         # Main app screens
│   ├── services/         # API services
│   ├── theme/            # Design tokens and styling
│   └── utils/            # Utility functions
├── App.tsx               # Main App component
└── index.js              # Entry point
```

## Features

- User authentication (login, register, password reset)
- Beat library with search and filtering
- Audio playback with background support
- Playlist management
- Dashboard for managing beats, genres, moods
- Dark theme UI

## Tech Stack

- React Native 0.83
- React Navigation 7
- react-native-track-player (audio)
- AsyncStorage (persistence)
- Axios (HTTP client)
- Socket.io (real-time features)

## API

The app connects to the Lyrikal Empire backend API at:
- Production: `https://www.lyrikalempire.com/api`
