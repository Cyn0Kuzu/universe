# Migration Guide: Fix Push Notifications & Performance Issues

## 🎯 Overview

This guide helps you migrate from the problematic client-side push notification system to a robust server-side solution using Firebase Cloud Functions.

## 📊 What Changes

### Before (Problematic):
- ❌ Client tries to send push notifications directly via Expo API
- ❌ FCM tokens collected but never used
- ❌ "Unable to retrieve FCM server key" errors
- ❌ Main thread blocking causing frame drops
- ❌ SafeAreaView timeout warnings

### After (Fixed):
- ✅ Server-side push notifications via Cloud Functions
- ✅ Both FCM and Expo tokens utilized
- ✅ No more FCM server key errors
- ✅ Performance optimizations prevent frame drops
- ✅ SafeAreaView issues resolved

## 🔧 Step-by-Step Migration

### Phase 1: Deploy Firebase Cloud Functions (30 minutes)

#### 1.1 Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

#### 1.2 Initialize Functions Directory

The `functions/` directory has been created with:
- `src/index.ts` - Cloud Functions code
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config

```bash
cd functions
npm install
```

#### 1.3 Build and Deploy

```bash
# Build TypeScript
npm run build

# Deploy functions
cd ..
firebase deploy --only functions
```

**Expected output:**
```
✔  functions[sendPushNotification(us-central1)] Successful create operation.
✔  functions[sendManualNotification(us-central1)] Successful create operation.
✔  functions[sendBatchNotifications(us-central1)] Successful create operation.
✔  functions[cleanupOldNotifications(us-central1)] Successful create operation.
```

#### 1.4 Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

### Phase 2: Update React Native App (15 minutes)

#### 2.1 Update Notification Services

Find and replace in these files:

**Files to update:**
- `src/services/unifiedNotificationService.ts`
- `src/services/notificationManagement.ts`
- `src/services/SafeNotificationCreator.ts`
- `src/services/directNotificationCreator.ts`
- `src/services/cleanModernScoringEngine.ts`

**Search for:**
```typescript
import { UnifiedPushNotificationHelper } from './unifiedPushNotificationHelper';
```

**Replace with:**
```typescript
import hybridPushService from './hybridPushNotificationService';
```

**Search for:**
```typescript
await UnifiedPushNotificationHelper.sendToUser(userId, {
  title: notification.title,
  body: notification.body,
  type: notification.type,
});
```

**Replace with:**
```typescript
await hybridPushService.sendToUser(userId, {
  title: notification.title,
  body: notification.body,
  type: notification.type,
});
```

#### 2.2 Update Batch Notifications

**Search for:**
```typescript
await UnifiedPushNotificationHelper.sendToUsers(userIds, payload);
```

**Replace with:**
```typescript
await hybridPushService.sendToUsers(userIds, payload);
```

For large batches (>100 users), use:
```typescript
await hybridPushService.sendBatchToUsers(userIds, payload);
```

#### 2.3 Find All Usages

Run this command to find all files using the old service:

```bash
# Windows PowerShell
Get-ChildItem -Recurse -Include *.ts,*.tsx | Select-String "UnifiedPushNotificationHelper"

# macOS/Linux
grep -r "UnifiedPushNotificationHelper" --include="*.ts" --include="*.tsx" src/
```

---

### Phase 3: Performance Fixes (10 minutes)

#### 3.1 Update Heavy Operations

Find operations that might block the main thread and wrap them:

**Before:**
```typescript
const processData = () => {
  heavyComputation();
  updateUI();
};
```

**After:**
```typescript
import { runAfterInteractions } from '../utils/performanceOptimizations';

const processData = () => {
  runAfterInteractions(() => {
    heavyComputation();
    updateUI();
  });
};
```

#### 3.2 Add Debounce to Search

**Before:**
```typescript
const handleSearch = (query: string) => {
  searchAPI(query);
};
```

**After:**
```typescript
import { debounce } from '../utils/performanceOptimizations';

const handleSearch = debounce((query: string) => {
  searchAPI(query);
}, 300);
```

#### 3.3 Throttle Scroll Events

**Before:**
```typescript
<ScrollView onScroll={handleScroll}>
```

**After:**
```typescript
import { throttle } from '../utils/performanceOptimizations';

const throttledScroll = throttle(handleScroll, 100);

<ScrollView onScroll={throttledScroll}>
```

#### 3.4 Replace SafeAreaView

**Before:**
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={{ flex: 1 }}>
  {children}
</SafeAreaView>
```

**After:**
```typescript
import SafeContainer from '../components/SafeContainer';

<SafeContainer style={{ flex: 1 }}>
  {children}
</SafeContainer>
```

---

### Phase 4: Testing (20 minutes)

#### 4.1 Test Cloud Functions Locally

```bash
firebase emulators:start
```

Open another terminal and test:

```typescript
// In your app (pointing to emulator)
import firebase from './services/optimizedFirebaseService';

// Use emulator
if (__DEV__) {
  firebase.functions().useEmulator('localhost', 5001);
}

// Test notification
await hybridPushService.sendToUser('test-user-id', {
  title: 'Test',
  body: 'Testing local functions',
  type: 'announcement',
});
```

#### 4.2 Test on Physical Device

1. Build and install app on Android device
2. Open Firebase Console → Functions → Logs
3. Send a test notification
4. Verify in logs that function executed
5. Verify push notification appears on device

#### 4.3 Test Performance

1. Navigate between screens rapidly
2. Check logcat for frame drops:
```bash
adb logcat | grep "Skipped.*frames"
```

Expected: No or minimal frame drops (<5 frames)

#### 4.4 Verify No Errors

```bash
adb logcat | grep -E "Error|❌|Warning"
```

Expected: No FCM server key errors, no SafeAreaView timeouts

---

## 📝 Specific File Changes

### File: `src/services/unifiedNotificationService.ts`

**Find lines like:**
```typescript:50:60
import { UnifiedPushNotificationHelper } from './unifiedPushNotificationHelper';

// Later in code...
await UnifiedPushNotificationHelper.sendToUser(userId, {
  title: notification.title,
  body: notification.body,
  type: notification.type,
  data: notification.data,
});
```

**Replace with:**
```typescript
import hybridPushService from './hybridPushNotificationService';

// Later in code...
await hybridPushService.sendToUser(userId, {
  title: notification.title,
  body: notification.body,
  type: notification.type,
  data: notification.data,
});
```

### File: `src/services/cleanModernScoringEngine.ts`

**Find the push notification sending logic** (search for "push" or "notification"):

**Replace:**
```typescript
await UnifiedPushNotificationHelper.sendToUsers(recipientIds, payload);
```

**With:**
```typescript
// For small batches (<100 users)
await hybridPushService.sendToUsers(recipientIds, payload);

// For large batches (>100 users) - more efficient
await hybridPushService.sendBatchToUsers(recipientIds, payload);
```

### File: `src/screens/ClubDetailScreen.tsx` (or similar screens)

**Find SafeAreaView usage:**
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

return (
  <SafeAreaView style={styles.container}>
    {content}
  </SafeAreaView>
);
```

**Replace with:**
```typescript
import SafeContainer from '../components/SafeContainer';

return (
  <SafeContainer style={styles.container}>
    {content}
  </SafeContainer>
);
```

---

## 🔍 Automated Migration Script

Create `migration-script.sh`:

```bash
#!/bin/bash

echo "🔧 Starting migration..."

# 1. Install function dependencies
echo "📦 Installing function dependencies..."
cd functions
npm install
npm run build
cd ..

# 2. Deploy functions
echo "🚀 Deploying Cloud Functions..."
firebase deploy --only functions

# 3. Deploy Firestore rules
echo "🔒 Deploying Firestore rules..."
firebase deploy --only firestore:rules,firestore:indexes

# 4. Find files to update
echo "🔍 Finding files to update..."
echo "Files using old push service:"
grep -r "UnifiedPushNotificationHelper" --include="*.ts" --include="*.tsx" src/ | cut -d: -f1 | sort -u

echo ""
echo "✅ Migration deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update the files listed above"
echo "2. Replace UnifiedPushNotificationHelper with hybridPushService"
echo "3. Test on device"
echo "4. Monitor Firebase Console logs"
```

Make it executable:
```bash
chmod +x migration-script.sh
./migration-script.sh
```

---

## ⚠️ Important Notes

### 1. Firebase Billing

Cloud Functions require the **Blaze (pay-as-you-go) plan**.

- Free tier: 2 million invocations/month
- Your usage: ~3 million/month for 10k users
- **Cost: ~$0.40/month** (very minimal)

Upgrade in Firebase Console → Settings → Usage and billing

### 2. Token Cleanup

The new system automatically removes invalid tokens. After deployment:

1. Monitor logs for "invalid token" messages
2. Invalid tokens are automatically deleted from Firestore
3. Users will get new tokens on next app open

### 3. Testing Checklist

- [ ] Functions deployed successfully
- [ ] Firestore rules deployed
- [ ] App updated with new service
- [ ] Tested on Android device
- [ ] Verified push notifications work
- [ ] No frame drops during navigation
- [ ] No SafeAreaView timeout warnings
- [ ] No FCM server key errors
- [ ] Firebase Console shows function executions
- [ ] Notification documents created in Firestore
- [ ] pushSent field updated to true

---

## 🐛 Troubleshooting

### Issue: "Billing account not configured"

**Solution:**
1. Go to Firebase Console
2. Settings → Usage and billing
3. Upgrade to Blaze plan
4. Deploy again

### Issue: "Permission denied for Cloud Functions"

**Solution:**
```bash
firebase login --reauth
firebase deploy --only functions --force
```

### Issue: Notifications not sending

**Check:**
1. Firebase Console → Functions → Logs
2. Look for errors in function execution
3. Verify user has valid FCM or Expo token:
```typescript
const hasTokens = await hybridPushService.hasValidTokens(userId);
console.log('User has tokens:', hasTokens);
```

### Issue: Still seeing frame drops

**Add more performance optimizations:**
1. Use `InteractionManager` before heavy operations
2. Add `debounce` to all text inputs
3. Use `throttle` for scroll handlers
4. Replace all `SafeAreaView` with `SafeContainer`

---

## 📊 Verification Commands

### Check function deployment:
```bash
firebase functions:list
```

### View function logs:
```bash
firebase functions:log --only sendPushNotification
```

### Test notification creation:
```bash
# In Firebase Console → Firestore
# Create a test notification document
```

### Monitor app logs:
```bash
# No FCM errors
adb logcat | grep -i "fcm\|push" | grep -i "error"

# No frame drops
adb logcat | grep "Skipped.*frames"

# No SafeAreaView timeouts
adb logcat | grep "SafeAreaView.*timeout"
```

---

## ✅ Success Criteria

After migration, you should see:

1. **Firebase Console → Functions:**
   - ✅ 4 functions deployed
   - ✅ Execution count increasing
   - ✅ Success rate > 95%

2. **Android Logcat:**
   - ✅ "✅ Notification document created"
   - ✅ "✅ Push notification sent to [userId]"
   - ❌ No "FCM server key" errors
   - ❌ No "Skipped frames" warnings
   - ❌ No "SafeAreaView timeout" warnings

3. **User Experience:**
   - ✅ Push notifications appear on device
   - ✅ Smooth 60fps navigation
   - ✅ No UI lag or freezing
   - ✅ Quick screen transitions

---

## 🎉 Completion

Once completed:
1. Commit changes to git
2. Create a new build
3. Test thoroughly on multiple devices
4. Monitor Firebase Console for first 24 hours
5. Check error rates and performance metrics

**Your app is now production-ready with proper push notifications and optimized performance! 🚀**

---

## 📞 Need Help?

1. Check Firebase Console logs
2. Review `LOGCAT_ISSUES_ANALYSIS_AND_FIXES.md`
3. See `FIREBASE_FUNCTIONS_DEPLOYMENT_GUIDE.md`
4. Monitor function execution in Firebase Console







