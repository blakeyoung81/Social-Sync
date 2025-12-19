# Pre-Publish Checklist for Social Sync

Use this checklist before making the repository public on GitHub.

## ✅ Security & Privacy

- [ ] `.env` file is in `.gitignore` and not committed
- [ ] `config/token.json` is ignored
- [ ] `config/client_secrets.json` is ignored
- [ ] `config/active_youtube_account.json` is ignored
- [ ] No API keys hardcoded in source files
- [ ] No passwords or secrets in code
- [ ] Privacy Policy page exists and is accessible
- [ ] Terms of Service page exists and is accessible
- [ ] Data Deletion page exists and is accessible

## ✅ Documentation

- [ ] README.md is complete and accurate
- [ ] CONTRIBUTING.md exists
- [ ] LICENSE file exists (MIT)
- [ ] All documentation URLs are correct
- [ ] Installation instructions are clear
- [ ] Configuration guide is included

## ✅ Code Quality

- [ ] Code follows project style guidelines
- [ ] No console.log statements with sensitive data
- [ ] Error handling is appropriate
- [ ] TypeScript types are properly defined
- [ ] No TODO comments with sensitive information

## ✅ Repository Structure

- [ ] `.gitignore` is comprehensive
- [ ] `.github/workflows/ci.yml` exists
- [ ] Issue templates are set up
- [ ] Project structure is organized
- [ ] No unnecessary files committed

## ✅ Branding

- [ ] All references updated to "Social Sync"
- [ ] App icon is included (1024x1024)
- [ ] Consistent naming throughout
- [ ] Footer links are correct

## ✅ Functionality

- [ ] Application builds successfully
- [ ] No build errors
- [ ] Environment variables are properly configured
- [ ] API routes handle missing keys gracefully

## ✅ GitHub Configuration

- [ ] Repository name is set (social-sync)
- [ ] Description is added
- [ ] Topics/tags are added
- [ ] Repository is set to Public
- [ ] Issues are enabled
- [ ] Discussions enabled (optional)

## ✅ Deployment

- [ ] Vercel deployment configured (if applicable)
- [ ] Environment variables set in Vercel
- [ ] Deployment URLs are correct
- [ ] Facebook app URLs are updated

## Final Steps

1. Review all changes: `git status`
2. Test build: `cd web-interface && npm run build`
3. Verify .gitignore: `git check-ignore .env`
4. Create initial commit
5. Push to GitHub
6. Verify repository is public
7. Test cloning: `git clone https://github.com/YOUR_USERNAME/social-sync.git`

---

**Ready to publish?** Follow the steps in [GITHUB_SETUP.md](./GITHUB_SETUP.md)

