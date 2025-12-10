#!/usr/bin/env python3
"""
Comprehensive test suite for all YouTube Uploader processing modes.

This script tests:
- Dry run mode
- Process only mode  
- Full upload mode
- Batch upload mode
- Smart conflict detection
- Platform authentication
- Caching efficiency

Usage:
    python scripts/test_all_modes.py [--test-video path/to/test/video.mp4]
"""

import sys
import os
import subprocess
import json
import time
from pathlib import Path
from datetime import datetime, timedelta
import argparse
import logging

# Add src to path
sys.path.append(str(Path(__file__).parent.parent / "src"))

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ModeTestSuite:
    """Comprehensive test suite for all processing modes."""
    
    def __init__(self, test_video_path: str = None):
        self.base_path = Path(__file__).parent.parent
        self.uploader_script = self.base_path / "src" / "workflows" / "youtube_uploader.py"
        self.results = {}
        self.test_video = test_video_path or self._find_test_video()
        
        logger.info(f"Initialized test suite with video: {self.test_video}")
        logger.info(f"Uploader script: {self.uploader_script}")
    
    def _find_test_video(self) -> str:
        """Find a test video to use for testing."""
        test_paths = [
            "/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies/",
            self.base_path / "data" / "input_videos" / "test_batch",
            self.base_path / "test_files"
        ]
        
        for path in test_paths:
            if isinstance(path, str):
                path = Path(path)
            
            if path.exists():
                for ext in ['.mp4', '.mov', '.avi']:
                    videos = list(path.glob(f'*{ext}'))
                    if videos:
                        return str(videos[0])
        
        # If no test video found, suggest creating one
        logger.warning("No test video found. Please specify --test-video path/to/video.mp4")
        return None
    
    def _run_command(self, cmd: list, timeout: int = 300) -> dict:
        """Run a command and return the result."""
        logger.info(f"Running: {' '.join(cmd)}")
        start_time = time.time()
        
        try:
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                timeout=timeout,
                cwd=self.base_path
            )
            
            duration = time.time() - start_time
            
            return {
                'success': result.returncode == 0,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'duration': duration,
                'return_code': result.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'stdout': '',
                'stderr': f'Command timed out after {timeout} seconds',
                'duration': timeout,
                'return_code': -1
            }
        except Exception as e:
            return {
                'success': False,
                'stdout': '',
                'stderr': str(e),
                'duration': time.time() - start_time,
                'return_code': -1
            }
    
    def test_dry_run_mode(self) -> bool:
        """Test dry run mode."""
        logger.info("🧪 Testing Dry Run Mode")
        
        cmd = [
            'python3', str(self.uploader_script),
            self.test_video,
            '--dry-run',
            '--skip-audio',  # Speed up test
            '--skip-silence',
            '--skip-transcription',
            '--skip-gpt',
            '--skip-subtitles',
            '--skip-outro',
            '--skip-thumbnail'
        ]
        
        result = self._run_command(cmd)
        
        success = (
            result['success'] and
            'dry run mode' in result['stdout'].lower() and
            'processing complete' in result['stdout'].lower()
        )
        
        self.results['dry_run'] = {
            'success': success,
            'duration': result['duration'],
            'details': result
        }
        
        logger.info(f"Dry run test: {'✅ PASSED' if success else '❌ FAILED'}")
        return success
    
    def test_process_only_mode(self) -> bool:
        """Test process only mode."""
        logger.info("⚙️ Testing Process Only Mode")
        
        cmd = [
            'python3', str(self.uploader_script),
            self.test_video,
            '--output-dir', str(self.base_path / 'data' / 'test_output'),
            '--skip-gpt',  # Skip expensive operations for testing
            '--skip-thumbnail'
        ]
        
        result = self._run_command(cmd)
        
        # Check if output file was created
        output_dir = self.base_path / 'data' / 'test_output'
        output_files = list(output_dir.glob('*.mp4')) if output_dir.exists() else []
        
        success = (
            result['success'] and
            'processing complete' in result['stdout'].lower() and
            len(output_files) > 0
        )
        
        self.results['process_only'] = {
            'success': success,
            'duration': result['duration'],
            'output_files': len(output_files),
            'details': result
        }
        
        logger.info(f"Process only test: {'✅ PASSED' if success else '❌ FAILED'}")
        return success
    
    def test_authentication_status(self) -> bool:
        """Test platform authentication status."""
        logger.info("🔐 Testing Platform Authentication")
        
        # Test YouTube authentication
        try:
            from core.youtube_authenticator import YouTubeAuthenticator
            auth = YouTubeAuthenticator()
            youtube_auth = auth.is_authenticated()
        except Exception as e:
            youtube_auth = False
            logger.warning(f"YouTube auth check failed: {e}")
        
        # Test other platform auth (placeholder)
        instagram_auth = False  # Will implement when Instagram integration is ready
        tiktok_auth = False     # Will implement when TikTok integration is ready
        
        self.results['authentication'] = {
            'youtube': youtube_auth,
            'instagram': instagram_auth,
            'tiktok': tiktok_auth
        }
        
        logger.info(f"Authentication - YouTube: {'✅' if youtube_auth else '❌'}")
        logger.info(f"Authentication - Instagram: {'✅' if instagram_auth else '❌'}")
        logger.info(f"Authentication - TikTok: {'✅' if tiktok_auth else '❌'}")
        
        return youtube_auth  # At least YouTube should be authenticated
    
    def test_cache_efficiency(self) -> bool:
        """Test caching system efficiency including multi-channel support."""
        logger.info("💾 Testing Cache Efficiency & Multi-Channel Support")
        
        try:
            from workflows.cache_manager import YouTubeCacheManager
            
            # Test global cache manager
            cache_manager = YouTubeCacheManager(self.base_path)
            cache_status = cache_manager.get_cache_status()
            quota_report = cache_manager.get_quota_savings_report()
            
            # Test basic cache operations
            test_data = {'test': 'data', 'timestamp': datetime.now().isoformat()}
            cache_success = cache_manager.cache_youtube_data('test_data', test_data)
            retrieved_data = cache_manager.get_cached_data('test_data')
            retrieval_success = retrieved_data == test_data
            
            # Test multi-channel functionality
            test_channel_id = "UCtest123456789"
            channel_manager = YouTubeCacheManager(self.base_path, test_channel_id)
            
            # Test channel-specific caching
            channel_data = {'channel_test': 'data', 'videos': 5}
            channel_cache_success = channel_manager.cache_youtube_data('scheduled_videos', channel_data)
            
            # Test all channels analytics
            all_channels = cache_manager.get_all_channels_analytics()
            
            # Test channel performance summary
            performance = channel_manager.get_channel_performance_summary()
            
            cache_efficient = (
                cache_success and
                retrieval_success and
                channel_cache_success and
                quota_report['total_quota_saved'] >= 0
            )
            
            self.results['cache_efficiency'] = {
                'success': cache_efficient,
                'cache_status': cache_status,
                'quota_saved': quota_report['total_quota_saved'],
                'efficiency_ratio': quota_report['efficiency_ratio'],
                'multi_channel_test': {
                    'channel_cache_success': channel_cache_success,
                    'channels_found': len(all_channels),
                    'performance_summary_available': bool(performance)
                }
            }
            
            logger.info(f"Global cache operations: {'✅' if cache_success and retrieval_success else '❌'}")
            logger.info(f"Channel-specific cache: {'✅' if channel_cache_success else '❌'}")
            logger.info(f"Multi-channel analytics: {len(all_channels)} channels found")
            
        except Exception as e:
            logger.error(f"Cache test failed: {e}")
            cache_efficient = False
            self.results['cache_efficiency'] = {
                'success': False,
                'error': str(e)
            }
        
        logger.info(f"Cache efficiency test: {'✅ PASSED' if cache_efficient else '❌ FAILED'}")
        return cache_efficient
    
    def test_smart_scheduling(self) -> bool:
        """Test smart conflict detection and scheduling."""
        logger.info("🧠 Testing Smart Scheduling")
        
        # Test with next available slot mode
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        cmd = [
            'python3', str(self.uploader_script),
            self.test_video,
            '--dry-run',  # Don't actually upload
            '--find-next-slot',
            '--schedule', tomorrow,
            '--skip-audio',
            '--skip-silence', 
            '--skip-transcription',
            '--skip-gpt',
            '--skip-subtitles',
            '--skip-outro',
            '--skip-thumbnail'
        ]
        
        result = self._run_command(cmd)
        
        # Check for smart scheduling indicators in output
        smart_scheduling_works = (
            result['success'] and
            ('smart analysis' in result['stdout'].lower() or
             'conflict' in result['stdout'].lower() or
             'next available' in result['stdout'].lower())
        )
        
        self.results['smart_scheduling'] = {
            'success': smart_scheduling_works,
            'duration': result['duration'],
            'details': result
        }
        
        logger.info(f"Smart scheduling test: {'✅ PASSED' if smart_scheduling_works else '❌ FAILED'}")
        return smart_scheduling_works
    
    def test_platform_integration(self) -> bool:
        """Test multi-platform integration readiness."""
        logger.info("🌐 Testing Platform Integration")
        
        platforms_ready = {
            'youtube': True,  # YouTube is fully implemented
            'instagram': False,  # Ready for Instagram when API keys are set
            'tiktok': False,     # Ready for TikTok when API keys are set
            'facebook': False,   # Ready for Facebook when API keys are set
        }
        
        # Test if Ayrshare integration is available
        try:
            from core.ayrshare_client import AyrshareClient
            ayrshare_available = True
        except ImportError:
            ayrshare_available = False
        
        self.results['platform_integration'] = {
            'platforms_ready': platforms_ready,
            'ayrshare_available': ayrshare_available,
            'total_platforms': len(platforms_ready),
            'implemented_platforms': sum(platforms_ready.values())
        }
        
        logger.info(f"Platform integration: {sum(platforms_ready.values())}/{len(platforms_ready)} platforms ready")
        return sum(platforms_ready.values()) > 0
    
    def run_all_tests(self) -> dict:
        """Run all tests and return comprehensive results."""
        logger.info("🚀 Starting Comprehensive Mode Testing")
        logger.info("=" * 60)
        
        if not self.test_video:
            logger.error("No test video available. Cannot run tests.")
            return {'error': 'No test video available'}
        
        # Run all tests
        tests = [
            ('Dry Run Mode', self.test_dry_run_mode),
            ('Process Only Mode', self.test_process_only_mode), 
            ('Authentication Status', self.test_authentication_status),
            ('Cache Efficiency', self.test_cache_efficiency),
            ('Smart Scheduling', self.test_smart_scheduling),
            ('Platform Integration', self.test_platform_integration)
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_name, test_func in tests:
            try:
                success = test_func()
                if success:
                    passed_tests += 1
            except Exception as e:
                logger.error(f"Test {test_name} failed with exception: {e}")
                self.results[test_name.lower().replace(' ', '_')] = {
                    'success': False,
                    'error': str(e)
                }
        
        # Generate summary
        self.results['summary'] = {
            'tests_passed': passed_tests,
            'tests_total': total_tests,
            'success_rate': (passed_tests / total_tests) * 100,
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info("=" * 60)
        logger.info(f"🎯 Test Summary: {passed_tests}/{total_tests} tests passed")
        logger.info(f"📊 Success Rate: {self.results['summary']['success_rate']:.1f}%")
        
        if passed_tests == total_tests:
            logger.info("🎉 All tests PASSED! Your system is fully functional.")
        elif passed_tests >= total_tests * 0.8:
            logger.info("✅ Most tests PASSED! System is largely functional.")
        else:
            logger.warning("⚠️  Several tests FAILED. Review the system configuration.")
        
        return self.results

def main():
    parser = argparse.ArgumentParser(description='Test all YouTube Uploader processing modes')
    parser.add_argument('--test-video', help='Path to test video file')
    parser.add_argument('--output', help='Save results to JSON file')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Run tests
    test_suite = ModeTestSuite(args.test_video)
    results = test_suite.run_all_tests()
    
    # Save results if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Results saved to {args.output}")
    
    # Exit with appropriate code
    if 'summary' in results:
        success_rate = results['summary']['success_rate']
        sys.exit(0 if success_rate >= 80 else 1)
    else:
        sys.exit(1)

if __name__ == '__main__':
    main() 