# SocialSync Pro - YouTube Uploader & Multi-Platform Manager

## 📁 Project Structure

This project has been organized into a clean, logical folder structure:

### 🎯 Core Application
- **`web-interface/`** - Next.js web application with modern UI
  - Real-time analytics dashboard
  - Multi-platform upload management
  - Video processing workflow
  - OpenAI integration for content optimization

### 🛠️ Scripts
- **`scripts/youtube_management/`** - YouTube-specific operations
  - `delete_and_restore_recent_videos.py` - Smart deletion with preview
  - `delete_recent_videos.py` - Remove recent uploads
  - `restore_videos.py` - Restore deleted content
  - And more management utilities

- **`scripts/duplicate_cleanup/`** - Duplicate detection and cleanup
  - `youtube_duplicate_finder.py` - AI-powered duplicate detection
  - `cleanup_duplicates.py` - Automated cleanup workflow
  - `show_real_duplicates.py` - Review duplicate candidates

- **`scripts/data_analysis/`** - Data analysis and insights
  - `analyze_similar_titles.py` - Title similarity analysis
  - `check_data.py` - Data validation utilities

### 📚 Documentation
- **`docs/`** - All project documentation
  - `README.md` - Main project documentation
  - `COST_BREAKDOWN.md` - OpenAI API cost analysis
  - `FACEBOOK_INSTAGRAM_SETUP.md` - Social media platform setup
  - `MULTI_PLATFORM_GUIDE.md` - Multi-platform deployment guide

### ⚙️ Configuration
- **`config/`** - Configuration files
  - `client_secrets.json` - Google API credentials
  - `token.json` - OAuth tokens
  - `active_youtube_account.json` - Active account settings
  - Next.js and TypeScript configuration files

### 💾 Data & Cache
- **`cache/`** - Cache files for performance
  - `playlists_cache.json` - YouTube playlist cache
  - `youtube_duplicates.json` - Duplicate detection cache

- **`data/`** - Input and output data
  - Video files and processing results

### 🗄️ Archive
- **`archive/`** - Historical files and temporary data
  - Deletion plans, temporary files, and legacy content

- **`cleanup_archive/`** - Old versions and deprecated code
  - Legacy Python scripts and outdated source code

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   cd web-interface && npm install
   ```

2. **Configure API Keys** (Single Source of Truth: root `.env`)
   
   Edit the `.env` file in the root `YoutubeUploader/` directory:
   ```bash
   # Environment variables for Python scripts
   # Add your actual API keys here
   
   OPENAI_API_KEY=sk-proj-...
   PEXELS_API_KEY=...
   PIXABAY_API_KEY=...
   ```
   
   Optional: For social media features, add:
   ```bash
   FACEBOOK_APP_ID=...
   FACEBOOK_APP_SECRET=...
   INSTAGRAM_APP_ID=...
   INSTAGRAM_APP_SECRET=...
   ```
   
   **Note:** The web interface automatically reads from this root `.env` file via `next.config.ts`. No need for a separate `.env.local` file.

3. **Set Up Google API Credentials**
   - Place your Google API credentials in `config/client_secrets.json`
   - Run the YouTube authentication flow when prompted

4. **Start the Application**
   ```bash
   cd web-interface && npm run dev
   ```

5. **Access the Dashboard**
   - Open http://localhost:3000
   - Navigate to Analytics for performance insights
   - Use the upload interface for video processing

## 🔧 Key Features

- **Smart Analytics**: Real-time tracking of uploads vs processing
- **Preview Mode**: See what will be deleted before taking action
- **Multi-Platform**: YouTube, Instagram, Facebook, TikTok support
- **AI-Powered**: OpenAI integration for content optimization
- **Efficient Caching**: Ultra-fast API quota management
- **Modern UI**: Beautiful, responsive web interface

## 📈 Recent Updates

- Fixed analytics to properly distinguish uploaded vs processed videos
- Enhanced preview functionality with detailed operation insights
- Improved folder organization for better maintainability
- Added comprehensive processing mode breakdowns
- Enhanced UI with rich metadata display

---

For detailed setup instructions and platform-specific guides, see the documentation in the `docs/` folder. 