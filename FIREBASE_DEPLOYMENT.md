# 🚀 Firebase Deployment Commands

## Deploy Firestore Rules
firebase deploy --only firestore:rules

## Deploy Storage Rules  
firebase deploy --only storage

## Deploy Both Rules
firebase deploy --only firestore:rules,storage

## Full Firebase Deploy
firebase deploy

## Preview Deployment (Test)
firebase deploy --only firestore:rules --debug

# 📋 Pre-Deployment Checklist

## ✅ Before Deployment
- [ ] Test rules with Firebase Emulator
- [ ] Verify all image upload flows work
- [ ] Test security rules with different user roles
- [ ] Backup existing rules
- [ ] Test on development environment first

## 🔐 Security Verification
- [ ] Anonymous access blocked
- [ ] User ownership enforced
- [ ] File size limits working
- [ ] File type validation active
- [ ] Admin controls functional

## 📱 App Testing
- [ ] Profile image upload works
- [ ] Cover image upload works  
- [ ] Image deletion works
- [ ] Thumbnail generation works
- [ ] Error handling tested

## 🚀 Production Deployment
firebase deploy --only firestore:rules,storage --project production

# Note: Replace 'production' with your actual Firebase project ID
