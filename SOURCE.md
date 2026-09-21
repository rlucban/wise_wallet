# WiseWallet — SDK 57 Upgrade Plan

## Current Status
- SDK version: **57.0.24** ✅ (confirmed via `node -e` check)
- Expo Router: `expo-router@latest` installed and working
- Context files (ThemeContext, UserProfileContext, etc.): ✅ All migrated

## Remaining Issues
- **Missing default exports on 26 route files** → FIXED ✅
- **expo-notifications Android** → BROKEN ❌ (removed from SDK 53+)
  - expo-notifications' push/remote notifications removed in SDK 53
  - Local notifications still need to work on SDK 57

## What We Need to Do
- [ ] **Replace expo-notifications** with react-native-notifications **or**
- [ ] **Use a development build** instead (keeps expo-notifications code)

### Option A: Switch to react-native-notifications
- [ ] Rewrite `utils/notifications.ts` to use `react-native-notifications`
- [ ] Remove expo-notifications imports
- [ ] Migrate all API calls: `getPermissionsAsync`, `scheduleNotificationAsync`, `setNotificationHandler`, `setNotificationChannelAsync`, `cancelAllScheduledNotificationsAsync`, etc.
- [ ] Update `SystemAlertsContext.tsx` imports if needed
- [ ] Update `TransactionsContext.tsx` (if it references expo-notifications)
- [ ] Test notifications work after migrating

### Option B: Use a Development Build
- [ ] Install `expo-cli` if not already installed
- [ ] Run `npx expo prebuild --development`
- [ ] Or use dev client (`npx expo start --dev-client`)
- [ ] Test everything

## Test the final app
- Run `npx expo start --clear`
- Verify notifications work
- Verify all routes load

## Notes
- We're targeting SDK 57 explicitly (not a development build)
- Local notifications are enough for the app (no need for push/remote)
- react-native-notifications supports local notifications on SDK 57
- Expo Go with SDK 57 works, but needs development build for some features
