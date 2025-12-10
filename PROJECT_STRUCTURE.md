# 🏗️ YouTube Uploader - Project Structure

## 📁 Directory Organization

```
Youtube Uploader/
├── 📂 src/                          # Main source code
│   ├── 📂 core/                     # Core processing modules
│   │   └── video_processing.py     # Main video processing pipeline
│   ├── 📂 workflows/                # High-level workflows
│   │   └── youtube_uploader.py     # YouTube upload workflow
│   └── 📂 scripts/                 # Utility scripts
│
├── 📂 web-interface/                # Next.js frontend
│   ├── 📂 src/
│   │   ├── 📂 app/                  # Next.js app router
│   │   ├── 📂 components/           # React components
│   │   ├── 📂 constants/            # Configuration constants
│   │   ├── 📂 hooks/                # Custom React hooks
│   │   ├── 📂 types/                # TypeScript type definitions
│   │   └── 📂 utils/                # Utility functions
│   └── 📂 public/                   # Static assets
│
├── 📂 data/                         # Data storage
│   ├── 📂 assets/                   # Static assets (logos, etc.)
│   ├── 📂 uploads/                  # Processed videos ready for upload
│   └── 📂 temp/                     # Temporary processing files
│
├── 📂 config/                       # Configuration files
│   └── token.json                   # Authentication tokens
│
├── 📂 cache/                        # Cache storage
│   ├── 📂 youtube/                  # YouTube API cache
│   └── 📂 audio_cache/              # Audio processing cache
│
├── 📂 tests/                        # Test files
│   ├── 📂 unit/                     # Unit tests (Python)
│   └── 📂 integration/              # Integration tests (JS)
│
├── 📂 docs/                         # Documentation
│   ├── 📂 implementation/           # Implementation guides
│   ├── 📂 summaries/                # Feature summaries
│   └── *.md                         # General documentation
│
├── 📂 archive/                      # Archived/old files
│   ├── 📂 old_files/                # Random old files
│   └── 📂 cleanup_archive/          # Previous cleanup archives
│
├── 📂 scripts/                      # Standalone utility scripts
├── 📂 assets/                       # Project assets
├── 📂 .venv/                        # Python virtual environment
├── 📂 .git/                         # Git repository
├── 📂 .next/                        # Next.js build files
├── 📂 .cursor/                      # Cursor IDE files
│
├── 📄 requirements.txt              # Python dependencies
├── 📄 README.md                     # Project overview
├── 📄 .gitignore                    # Git ignore rules
└── 📄 PROJECT_STRUCTURE.md          # This file
```

## 🎯 Key Components

### Core Processing (`src/core/`)
- **video_processing.py**: Main video processing pipeline with all AI features
- Handles: transcription, AI enhancement, B-roll, image generation, subtitles, etc.

### Workflows (`src/workflows/`)
- **youtube_uploader.py**: High-level YouTube upload workflow
- Orchestrates the entire process from video input to YouTube upload

### Web Interface (`web-interface/`)
- **Next.js React application** for the user interface
- Real-time processing status, video preview, settings management
- TypeScript for type safety

### Data Management
- **data/**: Organized storage for assets, uploads, and temporary files
- **cache/**: Intelligent caching for YouTube API and audio processing
- **config/**: Secure configuration and authentication storage

### Testing (`tests/`)
- **unit/**: Python unit tests for core functionality
- **integration/**: JavaScript integration tests for workflows

### Documentation (`docs/`)
- **implementation/**: Detailed implementation guides
- **summaries/**: Feature summaries and changelogs
- General documentation files

## 🧹 Cleanup Benefits

### ✅ What Was Cleaned Up:
- **Random Python files** → Moved to `archive/old_files/`
- **Test files scattered everywhere** → Organized in `tests/`
- **Temporary video files** → Moved to `archive/old_files/`
- **Documentation scattered** → Organized in `docs/`
- **Log files and images** → Moved to `archive/old_files/`

### ✅ What Was Preserved:
- **All core functionality** in `src/`
- **Complete web interface** in `web-interface/`
- **All configuration** in `config/` and `cache/`
- **Important documentation** in `docs/`
- **Working tests** in `tests/`

## 🚀 Development Workflow

1. **Core Development**: Work in `src/core/` and `src/workflows/`
2. **Frontend Development**: Work in `web-interface/src/`
3. **Testing**: Add tests to appropriate `tests/` subdirectories
4. **Documentation**: Update docs in `docs/` as needed
5. **Assets**: Store in `data/assets/` or `assets/`

## 📝 Notes

- **All functionality preserved** - nothing was deleted, only organized
- **Clean separation** between core logic, UI, tests, and docs
- **Easy navigation** with logical directory structure
- **Archive available** if anything needs to be recovered
- **Scalable structure** for future development 