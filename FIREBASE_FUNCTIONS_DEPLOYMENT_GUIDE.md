# Firebase Cloud Functions Deployment Guide

## 📋 Prerequisites

Before deploying Firebase Cloud Functions, ensure you have:

1. **Node.js 18 or higher** installed
2. **Firebase CLI** installed globally
3. **Firebase project** with Blaze (pay-as-you-go) plan
4. **Firebase Admin SDK** permissions

## 🚀 Step-by-Step Deployment

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

Verify installation:
```bash
firebase --version
```

### Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window for authentication.

### Step 3: Initialize Firebase in Your Project

If not already initialized, run from your project root:

```bash
firebase init
```

Select:
- ✅ Functions: Configure a Cloud Functions directory
- ✅ Firestore: Deploy rules
- ✅ Use existing project: universe-a6f60

Configure Functions:
- Language: **TypeScript**
- Use ESLint: **Yes**
- Install dependencies: **Yes**

### Step 4: Install Function Dependencies

```bash
cd functions
npm install
```

### Step 5: Build Functions

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `lib/` directory.

### Step 6: Test Locally (Optional but Recommended)

```bash
firebase emulators:start
```

This starts local emulators for:
- Functions: http://localhost:5001
- Firestore: http://localhost:8080
- Functions UI: http://localhost:4000

Test your functions locally before deploying!

### Step 7: Deploy to Firebase

Deploy all functions:
```bash
firebase deploy --only functions
```

Or deploy specific functions:
```bash
firebase deploy --only functions:sendPushNotification
firebase deploy --only functions:sendManualNotification
firebase deploy --only functions:sendBatchNotifications
```

### Step 8: Deploy Firestore Rules and Indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Step 9: Verify Deployment

Check Firebase Console:
1. Go to https://console.firebase.google.com/
2. Select your project (universe-a6f60)
3. Navigate to **Functions** tab
4. You should see:
   - ✅ sendPushNotification
   - ✅ sendManualNotification
   - ✅ sendBatchNotifications
   - ✅ cleanupOldNotifications

## 🔒 Firestore Security Rules

Update your `firestore.rules` to allow notification creation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User can read their own notifications
    match /notifications/{notificationId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      
      // Only authenticated users can create notifications
      allow create: if request.auth != null;
      
      // Users can update read status of their own notifications
      allow update: if request.auth != null && 
                       resource.data.userId == request.auth.uid &&
                       request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);
      
      // No delete permissions (handled by Cloud Function)
      allow delete: if false;
    }
    
    // Users collection rules
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 📊 Firestore Indexes

Update your `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "read", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## 🧪 Testing Your Functions

### Test Automatic Push Notification (Firestore Trigger)

```typescript
// In your React Native app
import hybridPushService from './src/services/hybridPushNotificationService';

await hybridPushService.sendToUser('user-id-here', {
  title: 'Test Notification',
  body: 'This is a test push notification',
  type: 'announcement',
  data: { testData: 'value' },
});
```

### Test Manual Push Notification (Callable Function)

```typescript
await hybridPushService.sendImmediateToUser('user-id-here', {
  title: 'Urgent Alert',
  body: 'This sends immediately via callable function',
  type: 'event',
});
```

### Test Batch Notifications

```typescript
const result = await hybridPushService.sendBatchToUsers(
  ['user1', 'user2', 'user3'],
  {
    title: 'Announcement',
    body: 'Important update for all users',
    type: 'announcement',
  }
);

console.log(`Sent: ${result.success}, Failed: ${result.failed}`);
```

## 📱 Update Your React Native App

### 1. Replace Old Service

Find all usages of `UnifiedPushNotificationHelper` and replace with `HybridPushNotificationService`:

```typescript
// Old
import { UnifiedPushNotificationHelper } from './services/unifiedPushNotificationHelper';
await UnifiedPushNotificationHelper.sendToUser(userId, payload);

// New
import hybridPushService from './services/hybridPushNotificationService';
await hybridPushService.sendToUser(userId, payload);
```

### 2. Update All Notification Services

Search for these files and update them:
- `src/services/unifiedNotificationService.ts`
- `src/services/notificationManagement.ts`
- `src/services/SafeNotificationCreator.ts`
- `src/services/directNotificationCreator.ts`
- `src/services/cleanModernScoringEngine.ts`

Replace the import and usage of push notification service.

## 🔍 Monitoring and Debugging

### View Function Logs

```bash
firebase functions:log
```

Or in Firebase Console:
1. Go to Functions tab
2. Click on a function
3. View "Logs" tab

### Check Function Execution

```bash
# Real-time logs
firebase functions:log --only sendPushNotification
```

### Common Issues and Solutions

#### Issue 1: "Billing account not configured"
**Solution:** Upgrade to Blaze (pay-as-you-go) plan in Firebase Console

#### Issue 2: "Permission denied"
**Solution:** Ensure you have Owner/Editor role in Firebase project

#### Issue 3: "Function deployment failed"
**Solution:** 
```bash
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
firebase deploy --only functions
```

#### Issue 4: "FCM token invalid"
**Solution:** The function automatically removes invalid tokens. Check logs:
```bash
firebase functions:log | grep "invalid"
```

## 💰 Cost Estimation

Firebase Cloud Functions pricing (Blaze plan):

**Free Tier (per month):**
- 2 million invocations
- 400,000 GB-seconds
- 200,000 CPU-seconds
- 5GB network egress

**Beyond Free Tier:**
- Invocations: $0.40 per million
- Compute time: $0.0000025 per GB-second
- Network egress: $0.12 per GB

**Estimated monthly cost for your app:**
- 10,000 active users
- 10 notifications per user per day
- = 3 million function invocations per month
- **Estimated cost: ~$0.40/month** (very minimal!)

## 🎯 Performance Optimization

### Reduce Cold Starts

Keep functions warm:
```bash
# Cloud Scheduler (requires Blaze plan)
firebase functions:config:set warm.enabled=true
```

### Batch Operations

Use `sendBatchNotifications` for multiple users instead of individual calls.

### Monitor Performance

Firebase Console → Functions → Performance tab shows:
- Execution time
- Memory usage
- Success rate

## ✅ Deployment Checklist

- [ ] Firebase CLI installed
- [ ] Logged into Firebase
- [ ] Functions built successfully (`npm run build`)
- [ ] Functions deployed (`firebase deploy --only functions`)
- [ ] Firestore rules deployed
- [ ] Firestore indexes deployed
- [ ] React Native app updated with new service
- [ ] Tested on development environment
- [ ] Tested with emulators
- [ ] Verified in Firebase Console
- [ ] Tested push notifications on physical device
- [ ] Monitoring set up
- [ ] Error handling tested

## 🔄 CI/CD Integration (Optional)

### GitHub Actions Example

Create `.github/workflows/deploy-functions.yml`:

```yaml
name: Deploy Firebase Functions

on:
  push:
    branches:
      - main
    paths:
      - 'functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd functions
          npm ci
      
      - name: Build functions
        run: |
          cd functions
          npm run build
      
      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

Get Firebase token:
```bash
firebase login:ci
```

Add token to GitHub Secrets as `FIREBASE_TOKEN`.

## 📞 Support

If you encounter issues:

1. Check Firebase Console logs
2. Run `firebase functions:log`
3. Test with emulators first
4. Check Firestore rules
5. Verify billing is enabled

## 🎉 Success!

Once deployed, your push notifications will:
- ✅ Send automatically when notification documents are created
- ✅ Work with both FCM and Expo tokens
- ✅ Handle errors gracefully
- ✅ Remove invalid tokens automatically
- ✅ Maintain notification history in Firestore
- ✅ Scale automatically with your user base

**Your push notification system is now production-ready! 🚀**







