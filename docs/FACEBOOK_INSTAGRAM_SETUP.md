# Facebook & Instagram Authentication Setup

This YouTube Uploader application now supports cross-platform posting to Facebook and Instagram. Here's how to set it up:

## 🚀 Quick Start (Development Mode)

The application is currently configured to run in **development mode** with mock authentication. This means you can test the Facebook and Instagram authentication flow without needing real API credentials.

### What Works in Development Mode:
- ✅ Authentication flow simulation
- ✅ Mock user accounts and pages
- ✅ UI testing and development
- ✅ Integration testing

## 🔐 Production Setup

To enable real Facebook and Instagram posting, you'll need to configure actual API credentials:

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app with these products:
   - **Facebook Login** (for user authentication)
   - **Instagram Basic Display** (for Instagram access)
   - **Pages API** (for Facebook page posting)

3. Configure OAuth redirect URIs:
   - Development: `http://localhost:3000/api/facebook/callback`
   - Production: `https://yourdomain.com/api/facebook/callback`

### Step 2: Environment Variables

Create a `.env.local` file in the `web-interface/` directory:

```bash
# Set to 'false' for production
DEV_MODE=false

# Facebook API Credentials
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/facebook/callback

# Instagram API Credentials (usually same as Facebook)
INSTAGRAM_APP_ID=your_facebook_app_id_here  
INSTAGRAM_APP_SECRET=your_facebook_app_secret_here
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/callback

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
```

### Step 3: Required Permissions

Configure these permissions in your Facebook App:

**Facebook Permissions:**
- `pages_manage_posts` - Post to Facebook pages
- `pages_read_engagement` - Read page engagement data  
- `pages_show_list` - Access user's pages
- `publish_video` - Upload videos to pages

**Instagram Permissions:**
- `user_profile` - Access Instagram profile info
- `user_media` - Access user's media

## 📱 How It Works

### Authentication Flow

1. **User clicks "Connect Facebook/Instagram"**
2. **Redirected to OAuth authorization**
3. **User grants permissions**
4. **Tokens stored securely in HTTP-only cookies**
5. **User can now post to connected accounts**

### Facebook Integration

- Posts to **Facebook Pages** (not personal profiles)
- Supports video uploads with custom content
- AI-generated captions and hashtags
- Scheduled posting capabilities

### Instagram Integration

- Posts to **Instagram Business/Creator accounts**
- Video and image sharing
- Platform-optimized content generation
- Hashtag optimization

## 🛠️ Technical Implementation

### API Endpoints Created

```
/api/facebook/auth         # Initiate Facebook OAuth
/api/facebook/callback     # Handle OAuth callback
/api/facebook/status       # Check connection status

/api/instagram/auth        # Initiate Instagram OAuth  
/api/instagram/callback    # Handle OAuth callback
/api/instagram/status      # Check connection status
```

### Components Added

- **`SocialMediaManager`** - Main authentication UI component
- **Facebook/Instagram authentication flows**
- **Status checking and account management**
- **Integration with existing multi-platform system**

## 🔒 Security Features

- **HTTP-only cookies** for token storage
- **CSRF protection** with state parameters
- **Token refresh** handling
- **Secure credential management**

## 🧪 Testing

### Development Mode Testing

1. Start the application: `npm run dev`
2. Go to Multi-Platform Content Manager
3. Click "Connect Facebook Account" or "Connect Instagram Account"
4. You'll be redirected through mock authentication
5. Test the UI with simulated connected accounts

### Production Testing

1. Set `DEV_MODE=false` in environment variables
2. Configure real API credentials
3. Test OAuth flow with real Facebook/Instagram accounts
4. Verify posting capabilities

## ⚡ Features

### Multi-Platform Posting
- **Unified content creation** across platforms
- **AI-powered content generation** for each platform
- **Platform-specific optimizations** (character limits, hashtags)
- **Scheduled posting** coordination

### Account Management
- **Multiple account support** (Facebook pages, Instagram accounts)
- **Persistent authentication** (tokens stored securely)
- **Easy disconnection** and re-authentication
- **Status monitoring** and error handling

### Integration Benefits
- **Seamless workflow** with existing YouTube processing
- **Consistent UI/UX** with YouTube authentication
- **Shared scheduling system** across all platforms
- **Centralized content management**

## 🚀 Future Enhancements

- **Instagram Stories** posting
- **Facebook Groups** posting
- **Advanced analytics** integration
- **Bulk content management**
- **Template system** for multi-platform content

## 📞 Support

For setup issues or questions:
1. Check the browser console for authentication errors
2. Verify environment variables are set correctly
3. Ensure Facebook App permissions are configured properly
4. Test in development mode first before switching to production

---

**Note:** This implementation prioritizes security and user experience while maintaining compatibility with the existing YouTube Uploader workflow. 