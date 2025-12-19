# Quick Start - Authentication System

## ✅ What's Ready

- User signup and login
- User dashboard
- Social media account connections (per user)
- Protected routes

## 🚀 Quick Setup (3 Steps)

### Step 1: Add Environment Variables

Add to `YoutubeUploader/.env`:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=2W0VzntuUzWnL4fJzA8TqHNhBsg7Muw8Rr791ukEL8A=
DATABASE_URL="file:./dev.db"
```

### Step 2: Initialize Database

```bash
cd web-interface
npx prisma generate
npx prisma db push
```

### Step 3: Start Server

```bash
npm run dev
```

## 🎯 How to Use

1. **Visit** `http://localhost:3000`
2. **Sign Up** - Create your account
3. **Go to Dashboard** - Click "My Account" in sidebar
4. **Connect Platforms** - Click "Connect" for YouTube, Facebook, Instagram, TikTok
5. **Post Content** - Use the main app to create and post content

## 📱 User Flow

```
Login → Dashboard → Connect Accounts → Post Content
```

## 🔐 Security

- All routes require authentication (except login/signup)
- Passwords are hashed
- Sessions are secure
- Social connections stored per user

---

**Ready to use!** 🎉

