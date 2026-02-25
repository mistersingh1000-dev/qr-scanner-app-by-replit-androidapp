# replit.md

## Overview

QR Scanner is a cross-platform mobile application built with Expo (React Native) that allows users to scan QR codes and barcodes using their device camera. The app detects the type of scanned content (URL, email, phone, WiFi, text) and provides appropriate actions. It maintains a local scan history using AsyncStorage. The project follows a dual-architecture pattern with an Expo/React Native frontend and an Express.js backend server, though the backend is minimal and the core functionality is client-side. GitHub integration is connected for code backup.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- 2026-02-22: Built full QR Scanner app with camera integration, scan history, and content type detection
- 2026-02-22: Added expo-camera, expo-clipboard, expo-crypto packages
- 2026-02-22: Created ScanHistoryProvider context with AsyncStorage persistence
- 2026-02-22: Updated app.json branding to "QR Scanner" with camera permissions
- 2026-02-22: Connected GitHub integration for code backup

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture (`newArchEnabled: true`)
- **Routing**: expo-router with file-based routing. The app uses a tab layout (`app/(tabs)/`) with two main screens:
  - `index.tsx` — Camera-based QR/barcode scanner screen
  - `history.tsx` — List of previously scanned items
- **State Management**: React Context (`ScanHistoryProvider` in `lib/scan-history.tsx`) for scan history, TanStack React Query for server state management
- **Local Storage**: `@react-native-async-storage/async-storage` for persisting scan history on-device
- **UI Libraries**: react-native-reanimated (animations), react-native-gesture-handler, expo-blur, expo-haptics, expo-clipboard
- **Camera**: expo-camera for QR/barcode scanning with `CameraView` and `BarcodeScanningResult`
- **Styling**: Plain React Native StyleSheet with a custom color theme system (`constants/colors.ts`) supporting light/dark modes with teal (#00D4AA) accent color
- **Error Handling**: Custom `ErrorBoundary` class component with an `ErrorFallback` UI

### Backend (Express.js)

- **Framework**: Express 5 with TypeScript, compiled via esbuild for production
- **API Pattern**: Routes registered in `server/routes.ts`, prefixed with `/api`
- **CORS**: Dynamic CORS configuration supporting Replit dev/deployment domains and localhost for Expo web development
- **Static Serving**: In production, serves a static landing page from `server/templates/landing-page.html` and built Expo web assets

### Shared Code

- `shared/schema.ts` — Database schema and TypeScript types shared between server and client
- Path aliases: `@/*` maps to project root, `@shared/*` maps to `./shared/*`

### Build & Development

- **Dev mode**: Two parallel processes — `expo:dev` for the Expo dev server and `server:dev` for the Express backend (using tsx)
- **Production build**: Expo web assets built via custom `scripts/build.js`, server bundled with esbuild
- **Replit integration**: Environment variables `REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`, `EXPO_PUBLIC_DOMAIN` used for dev/deployment URL configuration

## External Dependencies

### Key NPM Packages
- **expo** (~54.0.27) — Core mobile framework
- **expo-camera** — QR code and barcode scanning
- **expo-clipboard** — Copy scanned data to clipboard
- **expo-crypto** — UUID generation for scan history items
- **expo-router** — File-based navigation
- **express** (^5.0.1) — Backend HTTP server
- **@tanstack/react-query** — Async state management for API calls
- **@react-native-async-storage/async-storage** — Local data persistence
- **@octokit/rest** — GitHub API client for code backup

### Platform Permissions
- **iOS**: `NSCameraUsageDescription` for camera access
- **Android**: `CAMERA` permission
