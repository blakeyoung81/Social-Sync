# Multi-Platform Social Media Posting Guide

## Overview
The YouTube Uploader now supports posting your videos and descriptions to multiple social media platforms simultaneously using the Ayrshare API. This feature allows you to maximize your content's reach across YouTube, Facebook, Twitter/X, LinkedIn, Instagram, TikTok, and more.

## Supported Platforms
- **YouTube** (primary platform)
- **Facebook** (personal profiles and pages)
- **Twitter/X** (posts with video links)
- **LinkedIn** (professional posts)
- **Instagram** (business accounts)
- **TikTok** (via Ayrshare)
- **Pinterest** (pins with video content)
- **Reddit** (community posts)
- **Telegram** (channel posts)

## Setup Instructions

### 1. Get Your Ayrshare API Key
1. Visit [Ayrshare.com](https://ayrshare.com)
2. Sign up for an account
3. Choose a plan that supports your desired platforms
4. Navigate to your dashboard and copy your API key

### 2. Configure the Web Interface
1. Open the YouTube Uploader web interface
2. In the **Configuration** section, add your **Ayrshare API Key**
3. Select the platforms you want to post to in the **Multi-Platform Posting** section
4. Your preferences will be saved in your browser

### 3. Connect Your Social Media Accounts
1. Log into your Ayrshare dashboard
2. Connect each social media account you want to post to
3. Authorize Ayrshare to post on your behalf
4. Test the connections in the Ayrshare dashboard

## Usage

### Via Web Interface
1. Upload your videos as usual
2. Configure your processing options
3. Select your desired social media platforms
4. Run **Full Upload** or **Batch Upload** mode
5. The system will:
   - Process and upload to YouTube first
   - Generate platform-appropriate content for each selected platform
   - Post to all selected social media platforms
   - Show results for each platform in the web interface

### Via Command Line
```bash
python src/workflows/youtube_uploader.py your_video.mp4 \
  --ayrshare-key "your-api-key" \
  --social-platforms facebook twitter linkedin \
  --schedule 2024-01-15
```

## Platform-Specific Features

### Facebook
- Posts video description as text
- Includes YouTube link
- Uses video thumbnail as post image

### Twitter/X
- Creates tweet with video description (truncated to character limit)
- Includes YouTube link with hashtags
- May include thumbnail image

### LinkedIn
- Professional formatting of description
- Includes YouTube link
- Uses video thumbnail

### Instagram
- Business account required
- Posts description with YouTube link
- Uses video thumbnail as image post

### TikTok
- Currently supports link sharing via Ayrshare
- Description adapted for TikTok audience

## Content Adaptation

The system automatically adapts your content for each platform:

1. **Title**: Optimized for each platform's character limits
2. **Description**: 
   - Full description for platforms that support it
   - Truncated with "read more" link for character-limited platforms
3. **Hashtags**: Platform-appropriate hashtag formatting
4. **Media**: 
   - Thumbnail images for image-based posts
   - Video links for platforms that support them

## Error Handling

If posting to a platform fails:
- The error is logged in the processing output
- Other platforms continue to be processed
- YouTube upload is not affected
- Detailed error information is provided for troubleshooting

## Best Practices

1. **Test First**: Use a few test videos to ensure all platforms are configured correctly
2. **Platform Guidelines**: Ensure your content complies with each platform's community guidelines
3. **Timing**: Consider optimal posting times for each platform
4. **Content Adaptation**: Review how your content appears on each platform
5. **Engagement**: Monitor and respond to engagement across all platforms

## Troubleshooting

### Common Issues
1. **Platform Connection Failed**: Re-authorize the platform in your Ayrshare dashboard
2. **Content Rejected**: Check platform-specific content guidelines
3. **API Limits**: Ensure you haven't exceeded your Ayrshare plan limits
4. **Missing Thumbnails**: Enable thumbnail generation in processing options

### Getting Help
- Check the Ayrshare documentation: [docs.ayrshare.com](https://docs.ayrshare.com)
- Review platform-specific API documentation
- Check the processing logs for detailed error messages

## Cost Considerations

- Ayrshare operates on a credit-based system
- Each post to each platform consumes credits
- Monitor your usage in the Ayrshare dashboard
- Consider upgrading your plan for high-volume posting

## Security

- API keys are stored locally in your browser
- Never share your Ayrshare API key
- Regularly review connected accounts in your Ayrshare dashboard
- Use environment variables for production deployments 