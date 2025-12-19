# Update Google OAuth Credentials

To make the YouTube integration work with the web interface, you need to update the redirect URI in your Google Cloud Console:

## Steps:

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Navigate to APIs & Services > Credentials**
3. **Find your OAuth 2.0 Client ID** (the one from client_secrets.json: `383320172815-rppmic2u3dhemk3i0p3uuuagh7botu62.apps.googleusercontent.com`)
4. **Click on the pencil icon to edit**
5. **In the "Authorized redirect URIs" section, add:**
   - `http://localhost:3000/api/youtube/callback` (for development)
   - `https://yourdomain.com/api/youtube/callback` (for production, replace with your actual domain)
6. **Click Save**

## Current Setup:
- Your client ID: `383320172815-rppmic2u3dhemk3i0p3uuuagh7botu62.apps.googleusercontent.com`
- Current redirect URI in client_secrets.json: `http://localhost`
- New redirect URI needed: `http://localhost:3000/api/youtube/callback`

## Testing:
After updating the redirect URI, the YouTube authentication flow will work as follows:
1. User clicks "Load My YouTube Channels"
2. If not authenticated, they'll be prompted to authenticate
3. They'll be redirected to Google's OAuth page
4. After approval, they'll be redirected back to `/api/youtube/callback`
5. The callback will handle the token exchange and redirect back to the main app
6. Channels will be automatically loaded 