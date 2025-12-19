# Facebook App Configuration Guide

## Required Information for Facebook App Submission

After deploying to Vercel, use the following URLs and information to complete your Facebook app configuration.

## App Details

- **App ID:** 675685062119042
- **Display Name:** Step Sync
- **Contact Email:** blake@ivytutoring.net
- **Category:** Social Media Management / Content Creation Tools

## Required URLs (After Deployment)

Once deployed to Vercel, your app will have a URL like: `https://your-app-name.vercel.app`

### 1. Privacy Policy URL
```
https://your-app-name.vercel.app/privacy-policy
```

### 2. Terms of Service URL
```
https://your-app-name.vercel.app/terms-of-service
```

### 3. Data Deletion Instructions URL
```
https://your-app-name.vercel.app/data-deletion
```

### 4. App Icon
- **File:** `web-interface/public/app-icon.png`
- **Size:** 1024 x 1024 pixels
- **Format:** PNG
- Upload this file in the Facebook App Dashboard under "App Icon"

## App Domains

Add your Vercel domain:
```
your-app-name.vercel.app
```

## OAuth Redirect URIs

Add these redirect URIs in Facebook App Settings → Facebook Login → Settings:

```
https://your-app-name.vercel.app/api/facebook/callback
https://your-app-name.vercel.app/api/instagram/callback
```

## Threads App Configuration

- **Threads App ID:** 1171590041321273
- **Threads Display Name:** Social Media Manager
- **Threads App Secret:** (Use the same secret or create a separate one)

## Data Protection Officer (GDPR - Optional)

If required for GDPR compliance:

- **Name:** [Your Name or Company Name]
- **Email:** blake@ivytutoring.net
- **Address:** [Your Business Address]
  - Street Address: [Your Street]
  - City: [Your City]
  - State/Province: [Your State]
  - ZIP/Postal Code: [Your ZIP]
  - Country: United States

## Step-by-Step Configuration

1. **Go to Facebook Developers:** https://developers.facebook.com/apps/

2. **Select Your App:** App ID 675685062119042

3. **Fill in Required Fields:**

   a. **App Icon:**
      - Click "Upload" next to App icon
      - Select `web-interface/public/app-icon.png` (1024x1024)

   b. **Privacy Policy URL:**
      - Enter: `https://your-app-name.vercel.app/privacy-policy`
      - Click "Save"

   c. **Terms of Service URL:**
      - Enter: `https://your-app-name.vercel.app/terms-of-service`
      - Click "Save"

   d. **User Data Deletion:**
      - Enter: `https://your-app-name.vercel.app/data-deletion`
      - Click "Save"

   e. **Category:**
      - Select: "Social Media Management" or "Content Creation Tools"

   f. **App Domains:**
      - Add: `your-app-name.vercel.app`

   g. **Contact Email:**
      - Verify: blake@ivytutoring.net

4. **Configure Facebook Login:**
   - Go to Facebook Login → Settings
   - Add Valid OAuth Redirect URIs:
     - `https://your-app-name.vercel.app/api/facebook/callback`

5. **Configure Instagram Basic Display:**
   - Go to Instagram → Basic Display
   - Add Valid OAuth Redirect URIs:
     - `https://your-app-name.vercel.app/api/instagram/callback`

6. **Threads Configuration:**
   - Go to Threads settings
   - Threads App ID: 1171590041321273
   - Threads Display Name: Social Media Manager

7. **Save All Changes**

## Verification Checklist

- [ ] App icon uploaded (1024x1024)
- [ ] Privacy Policy URL added and accessible
- [ ] Terms of Service URL added and accessible
- [ ] Data Deletion URL added and accessible
- [ ] Category selected
- [ ] App domains configured
- [ ] OAuth redirect URIs configured
- [ ] Contact email verified
- [ ] Threads app configured (if applicable)

## After Configuration

Once all fields are filled:
1. Click "Save Changes"
2. Your app should show as "Eligible for Submission"
3. You can then submit for review if needed

## Important Notes

- Replace `your-app-name.vercel.app` with your actual Vercel deployment URL
- All URLs must be publicly accessible (HTTPS)
- Privacy Policy, Terms, and Data Deletion pages must be live before submission
- App icon must be exactly 1024x1024 pixels

## Troubleshooting

**"App icon not uploading":**
- Ensure file is exactly 1024x1024 pixels
- Use PNG format
- File size should be under 5MB

**"Privacy Policy URL not accessible":**
- Ensure Vercel deployment is live
- Check that the URL uses HTTPS
- Verify the page loads correctly

**"OAuth redirect URI errors":**
- Ensure URIs match exactly (including trailing slashes)
- Use HTTPS, not HTTP
- Check that API routes are deployed correctly

