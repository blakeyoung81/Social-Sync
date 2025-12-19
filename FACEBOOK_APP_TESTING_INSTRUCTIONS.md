# Facebook App Testing Instructions

## ⚠️ IMPORTANT: Fix Data Deletion URL

**Current (WRONG):** `https://socialsync.today/data`  
**Correct:** `https://socialsync.today/data-deletion`

**Update this in your Facebook App settings immediately!**

---

## Testing Instructions for Web

### Where can we find the app?

```
https://socialsync.today
```

**Verification:** Use Facebook's debugger tool to verify access: https://developers.facebook.com/tools/debug/

---

### Provide instructions for accessing the app so we may complete our review

```
Social Sync is a multi-platform content management application that allows users to connect their social media accounts (YouTube, Facebook, Instagram, TikTok) and manage content across platforms.

ACCESS INSTRUCTIONS:
1. Navigate to https://socialsync.today
2. You will be redirected to the login page at https://socialsync.today/login
3. Click "Sign up" to create a test account (or use test credentials provided below)
4. After signing up, you will be automatically logged in and redirected to the dashboard
5. From the dashboard (https://socialsync.today/dashboard), you can:
   - Connect social media accounts (YouTube, Facebook, Instagram, TikTok)
   - View connected accounts and their status
   - Access the main content management features

FACEBOOK LOGIN INTEGRATION:
Yes, Social Sync uses Facebook Login for authentication and to connect user's Facebook accounts. Users can:
- Connect their Facebook account from the dashboard
- Authorize Social Sync to manage their Facebook pages and posts
- Post content to Facebook through the application

The Facebook Login integration uses the following Meta APIs:
- Facebook Login (OAuth 2.0)
- Facebook Graph API for page management
- Pages API for posting content

To test Facebook Login:
1. Go to https://socialsync.today/dashboard
2. Click "Connect" on the Facebook card
3. Complete Facebook OAuth flow
4. Grant necessary permissions (pages_manage_posts, pages_read_engagement, pages_show_list)
5. Return to dashboard to see connected status

NAVIGATION:
- Main app: https://socialsync.today (requires login)
- Login: https://socialsync.today/login
- Signup: https://socialsync.today/signup
- Dashboard: https://socialsync.today/dashboard (requires login)
- Privacy Policy: https://socialsync.today/privacy-policy (public)
- Terms of Service: https://socialsync.today/terms-of-service (public)
- Data Deletion: https://socialsync.today/data-deletion (public)
```

---

### Test Credentials (if payment or membership is required)

```
No payment or membership is required to access the app. All features are available to free users.

TEST ACCOUNT CREDENTIALS:
Email: reviewer@socialsync.today
Password: [Please contact blake@ivytutoring.net for test credentials]

Alternatively, reviewers can create their own account using the signup form at:
https://socialsync.today/signup

No payment, subscription, or membership is required to access any features.
```

---

### Payment/Download Codes

```
N/A - Social Sync is a web application, not a downloadable app. No app store codes are required.

The application is free to use and does not require any payment or subscription.
```

---

### In-App Purchases/Subscriptions

```
N/A - Social Sync does not have any in-app purchases, subscriptions, or paid features. All functionality is available to all users at no cost.
```

---

### Geographic Restrictions

```
N/A - Social Sync is available globally with no geographic restrictions, geo-blocking, or geo-fencing. The application can be accessed from any location worldwide.

All features are available to users regardless of their geographic location.
```

---

## Required URLs Summary

**Privacy Policy URL:**
```
https://socialsync.today/privacy-policy
```

**Terms of Service URL:**
```
https://socialsync.today/terms-of-service
```

**Data Deletion Instructions URL:** ⚠️ **FIX THIS:**
```
https://socialsync.today/data-deletion
```
(Currently shows as `https://socialsync.today/data` - this is incorrect!)

**App Icon (1024 x 1024):**
```
https://socialsync.today/app-icon.png
```

**Website URL:**
```
https://socialsync.today
```

---

## Contact Information

**Contact Email:** blake@ivytutoring.net  
**Data Protection Officer:** Blake (blake@ivytutoring.net)

---

## Quick Checklist

- [ ] Fix Data Deletion URL to `https://socialsync.today/data-deletion`
- [ ] Upload app icon (1024x1024 PNG) - available at `https://socialsync.today/app-icon.png`
- [ ] Fill in testing instructions using the template above
- [ ] Verify all URLs are accessible
- [ ] Test Facebook Login flow
- [ ] Submit for review

