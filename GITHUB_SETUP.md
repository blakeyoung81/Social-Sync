# GitHub Repository Setup Guide

This guide will help you set up a new public GitHub repository for Social Sync.

## Step 1: Create New GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Repository name: `social-sync`
3. Description: `Multi-platform content creation with intelligent automation`
4. Visibility: **Public** ✅
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Update Remote URL

After creating the repository, update your git remote:

```bash
# Remove old remote (if exists)
git remote remove origin

# Add new remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/social-sync.git

# Verify remote
git remote -v
```

## Step 3: Update Repository URL in Files

Update the repository URL in these files:

1. **README.md** - Replace `yourusername` with your GitHub username
2. **package.json** - Update repository URL
3. **CONTRIBUTING.md** - Update repository URL

## Step 4: Final Checks Before Pushing

### Verify Sensitive Files Are Ignored

```bash
# Check that .env is ignored
git check-ignore .env

# Check that config files are ignored
git check-ignore config/token.json
git check-ignore config/client_secrets.json
```

### Review What Will Be Committed

```bash
# See all changes
git status

# See what files will be added
git add -n .
```

### Important: Ensure These Are NOT Committed

- ✅ `.env` files
- ✅ `config/token.json`
- ✅ `config/client_secrets.json`
- ✅ `config/active_youtube_account.json`
- ✅ `node_modules/`
- ✅ `.next/`
- ✅ `venv/`
- ✅ Large video/audio files

## Step 5: Commit and Push

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Initial commit: Social Sync - Multi-platform content management platform"

# Push to GitHub
git push -u origin main
```

## Step 6: Configure GitHub Repository Settings

After pushing, configure your repository:

1. **Go to Settings → Secrets and variables → Actions**
   - Add secrets for CI/CD (if needed):
     - `OPENAI_API_KEY` (for CI builds)
     - `PEXELS_API_KEY`
     - `PIXABAY_API_KEY`

2. **Go to Settings → Pages** (if you want GitHub Pages)
   - Source: GitHub Actions

3. **Go to Settings → General**
   - Add topics: `social-media`, `content-management`, `video-processing`, `nextjs`, `python`
   - Add description
   - Enable Discussions (optional)
   - Enable Issues ✅
   - Enable Wiki (optional)

4. **Create a Release**
   - Go to Releases → Create a new release
   - Tag: `v1.0.0`
   - Title: `Social Sync v1.0.0`
   - Description: Initial release

## Step 7: Update Documentation URLs

After pushing, update any hardcoded URLs in documentation:

- Replace `yourusername` with your actual GitHub username
- Update deployment URLs if deploying to Vercel

## Step 8: Verify Public Access

1. Visit your repository: `https://github.com/YOUR_USERNAME/social-sync`
2. Verify it's public
3. Check that README displays correctly
4. Verify all files are visible (except ignored ones)

## Security Checklist

Before making the repository public, ensure:

- [ ] No API keys in code
- [ ] No passwords or secrets committed
- [ ] `.env` files are in `.gitignore`
- [ ] `config/token.json` is ignored
- [ ] `config/client_secrets.json` is ignored
- [ ] No personal information exposed
- [ ] Privacy Policy, Terms, and Data Deletion pages are included

## Post-Publication

After making the repository public:

1. **Add Badges** (optional) to README:
   ```markdown
   ![License](https://img.shields.io/badge/license-MIT-blue.svg)
   ![Node](https://img.shields.io/badge/node-18+-green.svg)
   ```

2. **Enable GitHub Actions** for CI/CD

3. **Set up Vercel Integration** (if deploying):
   - Connect GitHub repo to Vercel
   - Configure environment variables in Vercel dashboard

4. **Share the Repository**:
   - Update social media profiles
   - Add to your portfolio
   - Share with the community

## Troubleshooting

### "Repository already exists"
- Choose a different name or delete the existing repository

### "Permission denied"
- Check your GitHub authentication
- Verify you have write access to the repository

### "Large files detected"
- Use Git LFS for large files or exclude them
- Check `.gitignore` is working correctly

## Next Steps

1. ✅ Repository is public
2. ✅ Documentation is complete
3. ✅ CI/CD is set up
4. ✅ Ready for contributions!

---

**Need Help?** Open an issue or contact blake@ivytutoring.net

