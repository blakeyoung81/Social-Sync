#!/usr/bin/env python3
"""
Ayrshare API Client - Handles posting to multiple social media platforms via Ayrshare.
Supports Facebook, Twitter/X, LinkedIn, Instagram, TikTok, and more with AI-powered 
platform-specific content generation and advanced analytics.
"""

import os
import requests
import json
import logging
from typing import Dict, List, Optional, Union, Any, Tuple
from pathlib import Path
import time
import openai
from datetime import datetime, timezone
import re

logger = logging.getLogger(__name__)

class AyrshareClient:
    """Enhanced client for Ayrshare API with AI-powered content generation and analytics."""
    
    def __init__(self, api_key: str, openai_client: Optional[openai.OpenAI] = None):
        """Initialize the Ayrshare client with API key and optional OpenAI client."""
        self.api_key = api_key
        self.openai_client = openai_client
        self.base_url = "https://app.ayrshare.com/api"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Enhanced platform configurations with best practices
        self.platform_config = {
            "facebook": {
                "max_length": 2000,
                "supports_video": True,
                "supports_images": True,
                "hashtag_limit": 30,
                "optimal_length": 100,
                "engagement_tips": ["Ask questions", "Use emojis", "Include CTAs"],
                "default_prompt": "Create an engaging Facebook post for this medical education video. Make it conversational and educational, encouraging engagement. Include relevant medical hashtags and a call to action.",
                "content_style": "conversational",
                "best_posting_times": ["13:00", "15:00", "19:00"]
            },
            "twitter": {
                "max_length": 280,
                "supports_video": True,
                "supports_images": True,
                "hashtag_limit": 2,
                "optimal_length": 200,
                "engagement_tips": ["Use 1-2 hashtags", "Include media", "Be concise"],
                "default_prompt": "Create a concise, engaging tweet for this medical education video. Keep it under 240 characters. Use relevant medical hashtags and make it shareable.",
                "content_style": "concise",
                "best_posting_times": ["09:00", "12:00", "18:00"]
            },
            "linkedin": {
                "max_length": 3000,
                "supports_video": True,
                "supports_images": True,
                "hashtag_limit": 5,
                "optimal_length": 300,
                "engagement_tips": ["Professional tone", "Industry insights", "Career advice"],
                "default_prompt": "Create a professional LinkedIn post for this medical education content. Focus on educational and career development aspects. Make it valuable for medical professionals and students.",
                "content_style": "professional",
                "best_posting_times": ["08:00", "12:00", "17:00"]
            },
            "instagram": {
                "max_length": 2200,
                "supports_video": True,
                "supports_images": True,
                "hashtag_limit": 30,
                "optimal_length": 150,
                "engagement_tips": ["Visual storytelling", "Use 5-10 hashtags", "Stories format"],
                "default_prompt": "Create an Instagram post for this medical education video. Make it visually appealing and educational. Use relevant medical and education hashtags.",
                "content_style": "visual",
                "best_posting_times": ["11:00", "14:00", "20:00"]
            },
            "tiktok": {
                "max_length": 150,
                "supports_video": True,
                "supports_images": False,
                "hashtag_limit": 5,
                "optimal_length": 100,
                "engagement_tips": ["Trending sounds", "Quick cuts", "Mobile-first"],
                "default_prompt": "Create a short, catchy TikTok description for this medical education video. Make it trendy and engaging for a younger audience.",
                "content_style": "trendy",
                "best_posting_times": ["06:00", "19:00", "21:00"]
            },
            "telegram": {
                "max_length": 4096,
                "supports_video": True,
                "supports_images": True,
                "hashtag_limit": 10,
                "optimal_length": 500,
                "engagement_tips": ["Markdown formatting", "Detailed content", "Links"],
                "default_prompt": "Create a detailed Telegram channel post for this medical education video. Use markdown formatting for emphasis. Make it comprehensive and educational.",
                "content_style": "detailed",
                "best_posting_times": ["09:00", "13:00", "20:00"]
            }
        }
        
        # Analytics tracking
        self.analytics = {
            "posts_created": 0,
            "successful_posts": 0,
            "failed_posts": 0,
            "platforms_used": set(),
            "content_generated": 0,
            "last_post_time": None
        }
    
    def validate_connection(self) -> Dict[str, Any]:
        """Validate Ayrshare API connection and get account info."""
        try:
            response = requests.get(
                f"{self.base_url}/user",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                user_data = response.json()
                
                # Get connected platforms
                profiles_response = requests.get(
                    f"{self.base_url}/profiles",
                    headers=self.headers,
                    timeout=10
                )
                
                connected_platforms = []
                if profiles_response.status_code == 200:
                    profiles_data = profiles_response.json()
                    if "profiles" in profiles_data:
                        for profile in profiles_data["profiles"]:
                            if profile.get("status") == "active":
                                connected_platforms.append(profile.get("platform", "").lower())
                
                return {
                    "status": "success",
                    "user": user_data,
                    "connected_platforms": connected_platforms,
                    "validation_time": datetime.now(timezone.utc).isoformat()
                }
            else:
                return {
                    "status": "failed",
                    "error": f"API returned status {response.status_code}",
                    "message": response.text
                }
                
        except Exception as e:
            logger.error(f"Connection validation failed: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "message": "Failed to connect to Ayrshare API"
            }
    
    def generate_platform_content(
        self, 
        title: str, 
        description: str,
        platform: str, 
        custom_prompt: Optional[str] = None,
        hashtag_prompt: Optional[str] = None,
        max_length: Optional[int] = None,
        content_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate enhanced platform-specific content using AI with context awareness."""
        
        if not self.openai_client:
            logger.warning("OpenAI client not available for content generation")
            fallback_content = self._generate_fallback_content(title, description, platform)
            return {
                "content": fallback_content["content"],
                "hashtags": fallback_content["hashtags"],
                "full_text": fallback_content["full_text"],
                "generated_by": "fallback",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        platform_info = self.platform_config.get(platform, {})
        content_max_length = max_length or platform_info.get("max_length", 500)
        optimal_length = platform_info.get("optimal_length", content_max_length // 2)
        content_style = platform_info.get("content_style", "informative")
        
        # Enhanced context-aware prompt
        context_info = ""
        if content_context:
            if content_context.get("video_duration"):
                context_info += f"Video duration: {content_context['video_duration']} minutes. "
            if content_context.get("target_audience"):
                context_info += f"Target audience: {content_context['target_audience']}. "
            if content_context.get("content_type"):
                context_info += f"Content type: {content_context['content_type']}. "
        
        # Generate main content with enhanced prompting
        content_prompt = custom_prompt or platform_info.get("default_prompt", "Create an engaging post for this content.")
        
        enhanced_prompt = f"""
{content_prompt}

{context_info}

Video Title: {title}
Original Description: {description}

Platform Requirements:
- Platform: {platform.title()}
- Style: {content_style}
- Optimal length: {optimal_length} characters (max {content_max_length})
- Engagement tips: {', '.join(platform_info.get('engagement_tips', []))}

Instructions:
1. Create engaging, educational content appropriate for {platform}
2. Use {content_style} tone and style
3. Target length around {optimal_length} characters
4. Include educational value and key medical concepts
5. NO hashtags in main content (will be added separately)
6. End with appropriate call-to-action for {platform}

Return only the post content, nothing else.
"""
        
        try:
            # Generate main content
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": enhanced_prompt}],
                temperature=0.7,
                max_tokens=300
            )
            generated_content = response.choices[0].message.content.strip()
            
            # Clean and optimize content
            generated_content = self._clean_content(generated_content, platform)
            
            # Ensure content fits within limits
            if len(generated_content) > content_max_length:
                generated_content = self._truncate_content(generated_content, content_max_length)
                
        except Exception as e:
            logger.error(f"Failed to generate content for {platform}: {e}")
            fallback_content = self._generate_fallback_content(title, description, platform)
            return {
                "content": fallback_content["content"],
                "hashtags": fallback_content["hashtags"],
                "full_text": fallback_content["full_text"],
                "generated_by": "fallback_after_error",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        # Generate hashtags
        hashtags = self._generate_hashtags(
            title, generated_content, platform, hashtag_prompt
        )
        
        # Combine content and hashtags
        full_text = self._combine_content_and_hashtags(generated_content, hashtags, platform)
        
        # Update analytics
        self.analytics["content_generated"] += 1
        
        return {
            "content": generated_content,
            "hashtags": hashtags,
            "full_text": full_text,
            "generated_by": "ai",
            "platform_optimized": True,
            "character_count": len(full_text),
            "optimal_length": optimal_length,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "style": content_style
        }
    
    def _generate_hashtags(
        self, 
        title: str, 
        content: str, 
        platform: str, 
        custom_prompt: Optional[str] = None
    ) -> str:
        """Generate optimized hashtags for the platform."""
        
        if not self.openai_client:
            return self._get_default_hashtags(platform)
        
        platform_info = self.platform_config.get(platform, {})
        hashtag_limit = platform_info.get("hashtag_limit", 5)
        
        if hashtag_limit == 0:
            return ""
        
        hashtag_prompt = custom_prompt or f"""
Generate {min(hashtag_limit, 8)} highly relevant and trending hashtags for this {platform} post about medical education.

Title: {title}
Content: {content}

Requirements:
- Maximum {hashtag_limit} hashtags
- Focus on medical education, USMLE, and relevant specialties
- Include trending medical hashtags
- Consider {platform} best practices
- Return hashtags separated by spaces, each starting with #
- No explanations, just hashtags

Example format: #MedicalEducation #USMLE #Step1 #Cardiology
"""
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": hashtag_prompt}],
                temperature=0.5,
                max_tokens=100
            )
            hashtags_raw = response.choices[0].message.content.strip()
            
            # Clean and validate hashtags
            hashtag_list = re.findall(r'#\w+', hashtags_raw)
            hashtags = ' '.join(hashtag_list[:hashtag_limit])
            
            return hashtags
            
        except Exception as e:
            logger.error(f"Failed to generate hashtags for {platform}: {e}")
            return self._get_default_hashtags(platform)
    
    def _get_default_hashtags(self, platform: str) -> str:
        """Get default hashtags for platform when AI generation fails."""
        default_tags = {
            "facebook": "#MedicalEducation #USMLE #Learning #Medicine #Education",
            "twitter": "#MedEd #USMLE",
            "linkedin": "#MedicalEducation #USMLE #MedicalStudents #Healthcare #Learning",
            "instagram": "#MedicalEducation #USMLE #MedStudent #Medicine #Learning #Study #Healthcare #Education",
            "tiktok": "#MedEd #USMLE #Study #Learning #Medicine",
            "telegram": "#MedicalEducation #USMLE #Medicine #Learning #Education"
        }
        return default_tags.get(platform, "#MedicalEducation #USMLE #Learning")
    
    def _clean_content(self, content: str, platform: str) -> str:
        """Clean and optimize content for the specific platform."""
        # Remove any accidental hashtags from main content
        content = re.sub(r'#\w+', '', content)
        
        # Clean up extra whitespace
        content = re.sub(r'\s+', ' ', content).strip()
        
        # Platform-specific cleaning
        if platform == "twitter":
            # Ensure no overly long sentences for Twitter
            sentences = content.split('. ')
            if len(sentences) > 2:
                content = '. '.join(sentences[:2]) + '.'
        
        elif platform == "linkedin":
            # Ensure professional language
            content = content.replace("awesome", "excellent")
            content = content.replace("amazing", "remarkable")
        
        return content
    
    def _truncate_content(self, content: str, max_length: int) -> str:
        """Intelligently truncate content while preserving meaning."""
        if len(content) <= max_length:
            return content
        
        # Try to truncate at sentence boundary
        sentences = content.split('. ')
        truncated = ""
        
        for sentence in sentences:
            if len(truncated + sentence + '. ') <= max_length - 3:  # Reserve space for "..."
                truncated += sentence + '. '
            else:
                break
        
        if truncated:
            return truncated.rstrip() + "..."
        else:
            # Fallback: hard truncate
            return content[:max_length-3] + "..."
    
    def _combine_content_and_hashtags(self, content: str, hashtags: str, platform: str) -> str:
        """Combine content and hashtags optimally for each platform."""
        if not hashtags:
            return content
        
        if platform in ["facebook", "linkedin", "instagram", "telegram"]:
            # Separate with double newline for better readability
            return f"{content}\n\n{hashtags}"
        elif platform in ["twitter", "tiktok"]:
            # Single space for character efficiency
            return f"{content} {hashtags}"
        else:
            return f"{content}\n\n{hashtags}"
    
    def _generate_fallback_content(self, title: str, description: str, platform: str) -> Dict[str, str]:
        """Generate fallback content when AI is unavailable."""
        platform_info = self.platform_config.get(platform, {})
        max_length = platform_info.get("max_length", 500)
        
        # Create basic content
        content = f"{title}\n\n{description[:max_length//2]}"
        if len(content) > max_length - 50:  # Reserve space for hashtags
            content = content[:max_length-50] + "..."
        
        hashtags = self._get_default_hashtags(platform)
        full_text = self._combine_content_and_hashtags(content, hashtags, platform)
        
        return {
            "content": content,
            "hashtags": hashtags,
            "full_text": full_text
        }
    
    def preview_content(
        self,
        title: str,
        description: str,
        platforms: List[str],
        platform_configs: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Dict[str, Dict[str, Any]]:
        """Generate content previews for multiple platforms without posting."""
        
        previews = {}
        platform_configs = platform_configs or {}
        
        for platform in platforms:
            try:
                logger.info(f"🔍 Generating preview for {platform.title()}...")
                
                platform_config = platform_configs.get(platform, {})
                
                preview = self.generate_platform_content(
                    title=title,
                    description=description,
                    platform=platform,
                    custom_prompt=platform_config.get("contentPrompt"),
                    hashtag_prompt=platform_config.get("hashtagPrompt"),
                    max_length=platform_config.get("contentLength")
                )
                
                # Add preview-specific metadata
                preview["is_preview"] = True
                preview["character_limit"] = self.platform_config[platform]["max_length"]
                preview["optimal_range"] = f"{self.platform_config[platform].get('optimal_length', 100)}-{self.platform_config[platform]['max_length']}"
                
                previews[platform] = preview
                
            except Exception as e:
                logger.error(f"Failed to generate preview for {platform}: {e}")
                previews[platform] = {
                    "error": str(e),
                    "content": f"Preview generation failed for {platform}",
                    "is_preview": True
                }
        
        return previews
    
    def post_to_multiple_platforms(
        self, 
        platforms: List[str],
        title: str,
        description: str,
        youtube_url: Optional[str] = None,
        video_path: Optional[Path] = None,
        thumbnail_path: Optional[Path] = None,
        platform_configs: Optional[Dict[str, Dict[str, Any]]] = None,
        schedule_date: Optional[str] = None,
        content_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Dict]:
        """Enhanced posting to multiple platforms with improved analytics and error handling."""
        results = {}
        platform_configs = platform_configs or {}
        
        # Update analytics
        self.analytics["posts_created"] += len(platforms)
        self.analytics["last_post_time"] = datetime.now(timezone.utc).isoformat()
        
        for platform in platforms:
            try:
                logger.info(f"🚀 Generating content for {platform.title()}...")
                
                # Add platform to analytics
                self.analytics["platforms_used"].add(platform)
                
                # Get platform-specific configuration
                platform_config = platform_configs.get(platform, {})
                custom_prompt = platform_config.get("contentPrompt")
                hashtag_prompt = platform_config.get("hashtagPrompt")
                max_length = platform_config.get("contentLength")
                
                # Generate platform-specific content with context
                generated_content = self.generate_platform_content(
                    title=title,
                    description=description,
                    platform=platform,
                    custom_prompt=custom_prompt,
                    hashtag_prompt=hashtag_prompt,
                    max_length=max_length,
                    content_context=content_context
                )
                
                # Prepare post data
                post_data = {
                    "post": generated_content["full_text"],
                    "platforms": [platform]
                }
                
                # Add YouTube link if available
                if youtube_url:
                    post_data["post"] += f"\n\n🎥 Watch the full video: {youtube_url}"
                
                # Add media if available and supported
                if video_path and video_path.exists():
                    post_data["mediaUrls"] = [str(video_path)]
                elif thumbnail_path and thumbnail_path.exists():
                    post_data["mediaUrls"] = [str(thumbnail_path)]
                
                # Add scheduling if specified
                if schedule_date:
                    post_data["scheduleDate"] = schedule_date
                elif platform_config.get("postingTime"):
                    # Use platform-specific posting time if available
                    today = datetime.now().strftime("%Y-%m-%d")
                    post_data["scheduleDate"] = f"{today}T{platform_config['postingTime']}:00Z"
                
                logger.info(f"📝 Generated content for {platform}: {generated_content['content'][:100]}...")
                
                # Make API call to Ayrshare
                response = self.post_content(post_data)
                
                if response.get("status") == "success":
                    logger.info(f"✅ Successfully posted to {platform.title()}")
                    self.analytics["successful_posts"] += 1
                    
                    results[platform] = {
                        "status": "success",
                        "post_id": response.get("id"),
                        "content": generated_content["content"],
                        "hashtags": generated_content["hashtags"],
                        "full_text": generated_content["full_text"],
                        "url": response.get("postUrl"),
                        "character_count": generated_content.get("character_count"),
                        "platform_optimized": generated_content.get("platform_optimized"),
                        "generation_method": generated_content.get("generated_by"),
                        "timestamp": generated_content.get("timestamp"),
                        "response": response
                    }
                else:
                    error_msg = response.get("errors", ["Unknown error"])
                    logger.error(f"❌ Failed to post to {platform}: {error_msg}")
                    self.analytics["failed_posts"] += 1
                    
                    results[platform] = {
                        "status": "failed",
                        "error": str(error_msg),
                        "content": generated_content["content"],
                        "character_count": generated_content.get("character_count"),
                        "generation_method": generated_content.get("generated_by"),
                        "timestamp": generated_content.get("timestamp"),
                        "response": response
                    }
                    
            except Exception as e:
                logger.error(f"💥 Exception posting to {platform}: {e}")
                self.analytics["failed_posts"] += 1
                
                results[platform] = {
                    "status": "failed",
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            
            # Add delay between posts to avoid rate limiting
            time.sleep(2)
        
        # Log final analytics
        logger.info(f"📊 Posting complete: {self.analytics['successful_posts']} successful, {self.analytics['failed_posts']} failed")
        
        return results
    
    def post_content(self, post_data: Dict) -> Dict:
        """Make API call to Ayrshare to post content with enhanced error handling."""
        try:
            logger.debug(f"Posting to Ayrshare: {json.dumps(post_data, indent=2)}")
            
            response = requests.post(
                f"{self.base_url}/post",
                headers=self.headers,
                json=post_data,
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.debug(f"Ayrshare response: {json.dumps(result, indent=2)}")
            return result
            
        except requests.RequestException as e:
            logger.error(f"Ayrshare API request failed: {e}")
            return {"status": "error", "errors": [str(e)]}
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Ayrshare response: {e}")
            return {"status": "error", "errors": ["Invalid JSON response from Ayrshare"]}
    
    def get_profile_info(self) -> Dict:
        """Get profile information and connected platforms with enhanced details."""
        try:
            response = requests.get(
                f"{self.base_url}/profiles",
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            result = response.json()
            
            # Enhance with additional platform details
            if "profiles" in result:
                for profile in result["profiles"]:
                    platform = profile.get("platform", "").lower()
                    if platform in self.platform_config:
                        profile["max_length"] = self.platform_config[platform]["max_length"]
                        profile["optimal_length"] = self.platform_config[platform].get("optimal_length")
                        profile["best_posting_times"] = self.platform_config[platform].get("best_posting_times", [])
            
            return result
            
        except requests.RequestException as e:
            logger.error(f"Failed to get profile info: {e}")
            return {"error": str(e)}
    
    def validate_platforms(self, platforms: List[str]) -> Tuple[List[str], Dict[str, str]]:
        """Validate platforms and return connected platforms with status details."""
        try:
            profile_info = self.get_profile_info()
            connected_platforms = []
            platform_status = {}
            
            if "profiles" in profile_info:
                for profile in profile_info["profiles"]:
                    platform = profile.get("platform", "").lower()
                    status = profile.get("status", "unknown")
                    
                    platform_status[platform] = status
                    
                    if platform in platforms and status == "active":
                        connected_platforms.append(platform)
            
            # Check for platforms not found in profile
            for platform in platforms:
                if platform not in platform_status:
                    platform_status[platform] = "not_connected"
            
            # Log validation results with detailed status
            for platform in platforms:
                status = platform_status.get(platform, "unknown")
                if status == "active":
                    logger.info(f"✅ {platform.title()} is connected and active")
                elif status == "inactive":
                    logger.warning(f"⚠️ {platform.title()} is connected but inactive")
                elif status == "not_connected":
                    logger.warning(f"❌ {platform.title()} is not connected")
                else:
                    logger.warning(f"❓ {platform.title()} status unknown: {status}")
            
            return connected_platforms, platform_status
            
        except Exception as e:
            logger.error(f"Platform validation failed: {e}")
            # Return original list with unknown status if validation fails
            return platforms, {platform: "unknown" for platform in platforms}
    
    def get_analytics(self) -> Dict[str, Any]:
        """Get detailed analytics about posting activity."""
        return {
            **self.analytics,
            "platforms_used": list(self.analytics["platforms_used"]),
            "success_rate": (
                self.analytics["successful_posts"] / self.analytics["posts_created"] * 100 
                if self.analytics["posts_created"] > 0 else 0
            ),
            "analytics_generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    def reset_analytics(self) -> None:
        """Reset analytics counters."""
        self.analytics = {
            "posts_created": 0,
            "successful_posts": 0,
            "failed_posts": 0,
            "platforms_used": set(),
            "content_generated": 0,
            "last_post_time": None
        }
        logger.info("📊 Analytics reset")
    
    def get_platform_recommendations(self, title: str, description: str) -> Dict[str, Dict[str, Any]]:
        """Get platform-specific recommendations for content optimization."""
        recommendations = {}
        
        for platform, config in self.platform_config.items():
            optimal_length = config.get("optimal_length", 200)
            max_length = config["max_length"]
            
            # Calculate content score based on length
            estimated_length = len(title) + len(description) + 50  # Rough estimate
            
            if estimated_length <= optimal_length:
                score = "excellent"
            elif estimated_length <= max_length:
                score = "good"
            else:
                score = "needs_optimization"
            
            recommendations[platform] = {
                "suitability_score": score,
                "estimated_length": estimated_length,
                "optimal_range": f"{optimal_length//2}-{optimal_length}",
                "max_length": max_length,
                "content_style": config.get("content_style", "informative"),
                "engagement_tips": config.get("engagement_tips", []),
                "best_posting_times": config.get("best_posting_times", []),
                "hashtag_limit": config.get("hashtag_limit", 5)
            }
        
        return recommendations

def create_social_media_content(title: str, description: str, youtube_url: str, platforms: List[str]) -> Dict[str, str]:
    """Create platform-specific content from video metadata (legacy function for backward compatibility)."""
    content = {}
    
    # Base content
    base_content = f"{title}\n\n{description}"
    if youtube_url:
        base_content += f"\n\n🎥 Watch the full video: {youtube_url}"
    
    # Platform-specific adaptations
    for platform in platforms:
        if platform == 'twitter':
            # Twitter: Keep it short and punchy
            twitter_content = f"{title}"
            if len(twitter_content) > 200:
                twitter_content = title[:197] + "..."
            if youtube_url:
                twitter_content += f"\n\n🎥 {youtube_url}"
            content[platform] = twitter_content
            
        elif platform == 'linkedin':
            # LinkedIn: Professional and educational
            linkedin_content = f"📚 {title}\n\n{description[:500]}"
            if len(description) > 500:
                linkedin_content += "..."
            if youtube_url:
                linkedin_content += f"\n\n🎥 Watch the complete explanation: {youtube_url}"
            linkedin_content += "\n\n#MedicalEducation #USMLE #Step1 #MedStudent"
            content[platform] = linkedin_content
            
        elif platform == 'facebook':
            # Facebook: Detailed with engagement
            facebook_content = f"{title}\n\n{description}"
            if youtube_url:
                facebook_content += f"\n\n🎥 Check out the full video: {youtube_url}"
            facebook_content += "\n\n👍 Like if this helped you! Share with fellow medical students!"
            content[platform] = facebook_content
            
        elif platform == 'instagram':
            # Instagram: Visual focus with hashtags
            instagram_content = f"{title}\n\n{description[:400]}"
            if len(description) > 400:
                instagram_content += "..."
            instagram_content += "\n\n#MedicalEducation #USMLE #Step1 #MedStudent #Learning #Study #Medicine #Education"
            content[platform] = instagram_content
            
        elif platform == 'tiktok':
            # TikTok: Short and catchy
            tiktok_content = f"{title}"
            if len(title) > 100:
                tiktok_content = title[:97] + "..."
            tiktok_content += "\n\n#medical #education #usmle #study #learning"
            content[platform] = tiktok_content
            
        elif platform == 'telegram':
            # Telegram: Detailed with formatting
            telegram_content = f"🎓 **{title}**\n\n{description}"
            if youtube_url:
                telegram_content += f"\n\n🎥 [Watch Video]({youtube_url})"
            content[platform] = telegram_content
            
        else:
            # Default content for other platforms
            content[platform] = base_content
    
    return content

def test_ayrshare_connection(api_key: str) -> bool:
    """Test the Ayrshare API connection with enhanced validation."""
    try:
        client = AyrshareClient(api_key)
        validation_result = client.validate_connection()
        
        if validation_result.get("status") == "success":
            logger.info("✅ Ayrshare API connection successful")
            connected_platforms = validation_result.get("connected_platforms", [])
            logger.info(f"Connected platforms: {connected_platforms}")
            
            # Log platform recommendations
            if connected_platforms:
                logger.info("Platform capabilities:")
                for platform in connected_platforms:
                    if platform in client.platform_config:
                        config = client.platform_config[platform]
                        logger.info(f"  • {platform.title()}: {config['max_length']} chars, {config.get('hashtag_limit', 0)} hashtags")
            
            return True
        else:
            error_msg = validation_result.get("error", "Unknown error")
            logger.error(f"❌ Failed to connect to Ayrshare API: {error_msg}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Ayrshare connection test failed: {e}")
        return False 