# Quick Setup for SocialSync Pro

## Step 1: Configure Environment Variables (Single Source of Truth)

**IMPORTANT:** All environment variables are configured in the root `.env` file at `YoutubeUploader/.env`.

Edit `YoutubeUploader/.env` (NOT `web-interface/.env.local`):

```bash
# Environment variables for Python scripts
# Add your actual API keys here

# OpenAI API Key (for AI-powered features)
OPENAI_API_KEY=sk-proj-...

# Pexels & Pixabay (for B-roll footage)
PEXELS_API_KEY=...
PIXABAY_API_KEY=...

# Facebook & Instagram API Configuration (Optional)
# Get these from https://developers.facebook.com/
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here

# Instagram uses the same Facebook app credentials
INSTAGRAM_APP_ID=your_facebook_app_id_here  
INSTAGRAM_APP_SECRET=your_facebook_app_secret_here
```

**Note:** The Next.js web interface automatically loads these variables from the root `.env` file via `next.config.ts`. There's no need to create or manage a separate `.env.local` file.

## Step 2: Facebook App Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add these products:
   - **Facebook Login**
   - **Instagram Basic Display** 
   - **Pages API**
4. Set OAuth redirect URI: `http://localhost:3000/api/facebook/callback`
5. Copy your App ID and App Secret to the `.env.local` file

## Step 3: Run the Application

```bash
cd web-interface
npm run dev
```

Then go to http://localhost:3000 and navigate to the Multi-Platform Content Manager.

## Step 4: Connect Platforms

- Click on the **Facebook** tab and click "Connect to Facebook"
- Click on the **Instagram** tab and click "Connect to Instagram"
- For **YouTube**, use the existing YouTube authentication system

Your channels and pages will be grouped by email account automatically! 