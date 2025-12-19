# 🚀 Deployment Guide - SocialSync Pro

## Site Status: ✅ Working & Ready to Deploy

The site is currently running locally at `http://localhost:3000` and the build completes successfully.

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

Vercel is the easiest deployment option for Next.js applications.

#### Prerequisites
1. Install Vercel CLI (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

#### Deploy Steps

1. **Navigate to web-interface directory:**
   ```bash
   cd web-interface
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```

3. **Set Environment Variables:**
   After initial deployment, add your environment variables in Vercel dashboard:
   - Go to your project settings → Environment Variables
   - Add the following variables:
     - `OPENAI_API_KEY`
     - `PEXELS_API_KEY`
     - `PIXABAY_API_KEY`
     - `FACEBOOK_APP_ID` (optional)
     - `FACEBOOK_APP_SECRET` (optional)
     - `INSTAGRAM_APP_ID` (optional)
     - `INSTAGRAM_APP_SECRET` (optional)

4. **For Production Deployment:**
   ```bash
   vercel --prod
   ```

#### Important Notes for Vercel Deployment

⚠️ **Limitations:**
- This application uses local file system access and Python scripts
- Some features may require serverless functions or external services
- File uploads and video processing may need additional infrastructure

**Recommended:** Use Vercel for the web interface, but keep Python backend on a separate server or use Vercel Serverless Functions for API routes.

### Option 2: Docker Deployment

For self-hosted deployment with full control:

1. **Create Dockerfile** (already referenced in README):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and run:**
   ```bash
   docker build -t socialsync-pro .
   docker run -p 3000:3000 --env-file ../.env socialsync-pro
   ```

### Option 3: Manual Server Deployment

1. **Build the application:**
   ```bash
   cd web-interface
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

3. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start npm --name "socialsync-pro" -- start
   pm2 save
   pm2 startup
   ```

## Environment Variables Setup

### For Vercel:
Add environment variables in the Vercel dashboard under Project Settings → Environment Variables.

### For Docker/Manual:
Create a `.env.production` file or use environment variables:
```bash
export OPENAI_API_KEY=your_key_here
export PEXELS_API_KEY=your_key_here
export PIXABAY_API_KEY=your_key_here
```

## Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test API endpoints are working
- [ ] Check that video processing features work (may need backend server)
- [ ] Verify YouTube authentication flow
- [ ] Test file upload functionality
- [ ] Monitor error logs

## Current Status

✅ **Build:** Successful  
✅ **Local Server:** Running on port 3000  
✅ **Dependencies:** Installed  
✅ **TypeScript:** No errors  
✅ **Ready for Deployment:** Yes

## Quick Deploy Command

```bash
cd web-interface && vercel --prod
```

## Troubleshooting

### Build Fails
- Check Node.js version (requires 18+)
- Clear `.next` folder and rebuild
- Check for missing dependencies

### Environment Variables Not Loading
- Verify variables are set in deployment platform
- Restart deployment after adding variables
- Check `next.config.ts` for correct variable names

### API Routes Not Working
- Some API routes require Python backend
- Consider deploying Python backend separately
- Use Vercel Serverless Functions for API routes

## Support

For deployment issues, check:
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- Project README.md for more details

