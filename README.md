# Social Sync

**Multi-platform content creation with intelligent automation**

Social Sync is a powerful social media management platform that helps content creators process videos, schedule posts, and publish across multiple platforms including YouTube, Facebook, Instagram, TikTok, and more.

## ✨ Features

- 🎬 **Video Processing**: AI-powered video editing, transcription, and enhancement
- 📅 **Smart Scheduling**: Intelligent content scheduling with conflict detection
- 🌐 **Multi-Platform**: Manage YouTube, Facebook, Instagram, TikTok, and more
- 🤖 **AI-Powered**: OpenAI integration for content optimization and generation
- 📊 **Analytics**: Real-time tracking and performance insights
- 🎨 **Modern UI**: Beautiful, responsive web interface built with Next.js

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+ with venv
- API keys (OpenAI, Pexels, Pixabay)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/social-sync.git
   cd social-sync
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install Node.js dependencies**
   ```bash
   cd web-interface
   npm install
   ```

4. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   OPENAI_API_KEY=your_openai_key_here
   PEXELS_API_KEY=your_pexels_key_here
   PIXABAY_API_KEY=your_pixabay_key_here
   ```

5. **Start the development server**
   ```bash
   cd web-interface
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
social-sync/
├── web-interface/          # Next.js web application
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   ├── api/         # API routes
│   │   └── ...
│   └── package.json
├── src/                  # Python backend
│   ├── core/            # Core functionality
│   ├── workflows/       # Processing workflows
│   └── ...
├── scripts/             # Utility scripts
├── config/              # Configuration files
├── data/                # Data storage
└── README.md
```

## 🔧 Configuration

### Environment Variables

All environment variables are configured in the root `.env` file:

```bash
# Required
OPENAI_API_KEY=sk-proj-...
PEXELS_API_KEY=...
PIXABAY_API_KEY=...

# Optional - Social Media Platforms
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
```

### Google API Setup

1. Place your Google API credentials in `config/client_secrets.json`
2. Run the YouTube authentication flow when prompted

## 📚 Documentation

- **[Deployment Guide](./web-interface/DEPLOYMENT.md)** - Deploy to Vercel or other platforms
- **[Facebook App Setup](./web-interface/FACEBOOK_APP_SETUP.md)** - Configure Facebook/Instagram integration
- **[Quick Start Guide](./QUICK_START.md)** - Detailed setup instructions
- **[Architecture](./web-interface/ARCHITECTURE.md)** - System design and architecture

## 🛠️ Development

### Running Locally

```bash
# Start Python backend (if needed)
source venv/bin/activate
python src/workflows/youtube_uploader.py

# Start Next.js frontend
cd web-interface
npm run dev
```

### Building for Production

```bash
cd web-interface
npm run build
npm start
```

## 🚢 Deployment

### Vercel (Recommended)

```bash
cd web-interface
vercel
```

See [DEPLOYMENT.md](./web-interface/DEPLOYMENT.md) for detailed instructions.

### Docker

```bash
docker build -t social-sync ./web-interface
docker run -p 3000:3000 --env-file .env social-sync
```

## 🔒 Security

- All API keys are stored in environment variables (never committed)
- OAuth tokens are securely stored
- Privacy Policy, Terms of Service, and Data Deletion pages included
- GDPR compliant data handling

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

- **Email:** blake@ivytutoring.net
- **Issues:** [GitHub Issues](https://github.com/yourusername/social-sync/issues)

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- Next.js for the amazing framework
- All the open-source libraries that make this possible

---

Made with ❤️ by the Social Sync team
