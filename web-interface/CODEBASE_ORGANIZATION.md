# Codebase Organization

## Directory Structure

```
web-interface/
├── docs/                    # Documentation files
│   ├── README.md           # Documentation index
│   ├── AUTHENTICATION_SETUP.md
│   ├── DEPLOYMENT.md
│   └── ...
├── public/                  # Static assets
│   ├── social-sync-logo.png # Main logo
│   ├── app-icon.png        # App icon (1024x1024)
│   └── ...
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/           # API routes
│   │   ├── dashboard/    # User dashboard
│   │   ├── login/         # Login page
│   │   ├── signup/        # Signup page
│   │   └── ...            # Other pages
│   ├── components/        # React components
│   │   ├── layout/       # Layout components
│   │   ├── features/     # Feature components
│   │   ├── forms/        # Form components
│   │   └── ui/           # UI components
│   ├── lib/              # Utilities and helpers
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── prisma/               # Database schema
├── middleware.ts         # Next.js middleware
└── package.json          # Dependencies
```

## Component Organization

### Layout Components (`src/components/layout/`)
- `Sidebar.tsx` - Main navigation sidebar
- `Footer.tsx` - Footer component

### Feature Components (`src/components/features/`)
- Feature-specific components
- Organized by functionality

### Form Components (`src/components/forms/`)
- Reusable form components
- Form validation utilities

### UI Components (`src/components/ui/`)
- Basic UI elements
- Reusable design system components

## API Routes Organization

### Authentication (`src/app/api/auth/`)
- `[...nextauth]/route.ts` - NextAuth configuration
- `signup/route.ts` - User registration

### User Management (`src/app/api/user/`)
- `connections/route.ts` - Get user connections
- `connections/[platform]/route.ts` - Manage platform connections

### Platform APIs (`src/app/api/{platform}/`)
- `youtube/` - YouTube API routes
- `facebook/` - Facebook API routes
- `instagram/` - Instagram API routes
- `tiktok/` - TikTok API routes

## Cleanup Completed

✅ Removed duplicate folders:
- `src/app/analysis 2/`
- `src/app/api 2/`
- `src/app/editor 2/`
- `src/app/music 2/`
- `src/components/features 2/`
- `src/components/forms 2/`
- `src/components/ui 2/`

✅ Organized documentation:
- Moved all `.md` files to `docs/` folder
- Created documentation index

✅ Removed temporary files:
- `temp_page.tsx`
- `page.tsx.backup`

✅ Updated logo usage:
- Sidebar now uses Social Sync logo
- Login page uses logo
- Signup page uses logo
- Dashboard uses logo
- Home page uses logo

## Best Practices

1. **Components**: Keep components focused and reusable
2. **API Routes**: Group by functionality
3. **Types**: Centralize TypeScript types
4. **Utils**: Keep utility functions pure and testable
5. **Documentation**: Keep docs in `docs/` folder

## Naming Conventions

- **Components**: PascalCase (e.g., `VideoUpload.tsx`)
- **Files**: kebab-case for non-components (e.g., `video-utils.ts`)
- **Folders**: kebab-case (e.g., `video-editor/`)
- **API Routes**: kebab-case (e.g., `user-connections/`)

