# Environment Variables Setup for Authentication

## Required Environment Variables

Add these to your root `.env` file (`YoutubeUploader/.env`):

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here-generate-with-openssl-rand-base64-32

# Database (SQLite - automatically created)
DATABASE_URL="file:./dev.db"
```

## Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use an online generator: https://generate-secret.vercel.app/32

## For Production (Vercel)

Add these environment variables in Vercel Dashboard:

1. Go to Project Settings → Environment Variables
2. Add:
   - `NEXTAUTH_URL` = `https://your-domain.vercel.app`
   - `NEXTAUTH_SECRET` = (generate a new secret)
   - `DATABASE_URL` = (if using external database, otherwise SQLite file will be created)

## Database Setup

The SQLite database will be automatically created when you run:

```bash
cd web-interface
npx prisma db push
```

For production, consider using:
- **Vercel Postgres** (recommended)
- **Supabase**
- **PlanetScale**
- **Railway**

To use Postgres, update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then run migrations:

```bash
npx prisma migrate dev --name init
```

## Testing Authentication

1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000`
3. You'll be redirected to `/login`
4. Create an account or sign in
5. Access your dashboard at `/dashboard`
6. Connect your social media accounts

