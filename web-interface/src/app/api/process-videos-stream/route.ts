import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger } from '@/utils/logger';
import { ProcessingOptions } from '@/types';
import { DEFAULT_SETTINGS } from '@/constants/processing';

// Helper function to build the arguments for the Python script
function buildArgs(options: ProcessingOptions): string[] {
    const args: string[] = [];

    // Basic processing options
    if (options.mode) args.push('--mode', options.mode);
    if (options.title) args.push('--title', options.title);
    if (options.description) args.push('--description', options.description);
    if (options.tags && options.tags.length > 0) args.push('--tags', options.tags.join(','));
    if (options.schedule) args.push('--schedule', options.schedule);

    // Extract values with defaults
    const whisperModel = options.whisperModel || 'small';
    const gptModel = options.gptModel || 'gpt-4o-mini';
    const highlightStyle = options.highlightStyle || 'yellow';
    const brollClipCount = options.brollClipCount || 5;
    const brollClipDuration = options.brollClipDuration || 4;
    const brollTransitionStyle = options.brollTransitionStyle || 'fade';
    const imageGenerationCount = options.imageGenerationCount || 3;
    const imageDisplayDuration = options.imageDisplayDuration || 4;
    const imageQuality = options.imageQuality || 'standard';
    const imageTransitionStyle = options.imageTransitionStyle || 'fade';
    const zoomIntensity = options.zoomIntensity || 'subtle';
    const zoomFrequency = options.zoomFrequency || 'medium';
    const musicTrack = options.musicTrack || 'none';
    const soundEffectPack = options.soundEffectPack || 'none';
    const backgroundMusicVolume = options.backgroundMusicVolume || 50;
    const silenceThreshold = options.silenceThreshold || 0.025;
    const silenceMargin = options.silenceMargin || 0.2;
    const subtitleFontSize = options.subtitleFontSize || 8;
    const captionStyle = options.captionStyle || 'social';
    const captionPosition = options.captionPosition || 'bottom';
    const topicCardStyle = options.topicCardStyle || 'medical';
    const topicCardDuration = options.topicCardDuration || 3;
    const frameStyle = options.frameStyle || 'rainbow';
    const logoDisplayDuration = options.logoDisplayDuration || 1;
    const thumbnailMode = options.thumbnailMode || 'landscape-only';
    
    // Random Mode settings
    const randomModeEnabled = options.randomMode?.enabled || false;
    const randomFrameStyle = options.randomMode?.frameStyle || false;
    const randomMusicTrack = options.randomMode?.musicTrack || false;
    const randomBrollTransition = options.randomMode?.brollTransitionStyle || false;
    const randomImageTransition = options.randomMode?.imageTransitionStyle || false;
    const randomHighlightStyle = options.randomMode?.highlightStyle || false;
    const randomZoomIntensity = options.randomMode?.zoomIntensity || false;
    const randomZoomFrequency = options.randomMode?.zoomFrequency || false;
    const randomCaptionStyle = options.randomMode?.captionStyle || false;
    const randomCaptionAnimation = options.randomMode?.captionAnimation || false;
    const randomTopicCardStyle = options.randomMode?.topicCardStyle || false;
    const randomOutroStyle = options.randomMode?.outroStyle || false;
    const randomSoundEffectPack = options.randomMode?.soundEffectPack || false;

    // Skip flags
    const skipFlags = {
        skipAudio: options.skipAudio,
        skipSilence: options.skipSilence,
        skipTranscription: options.skipTranscription,
        skipGpt: options.skipGpt,
        skipAiHighlights: options.skipAiHighlights,
        skipBroll: options.skipBroll,
        skipImageGeneration: options.skipImageGeneration,
        skipDynamicZoom: options.skipDynamicZoom,
        skipBackgroundMusic: options.skipBackgroundMusic,
        skipSoundEffects: options.skipSoundEffects,
        skipSubtitles: options.skipSubtitles,
        skipTopicCard: options.skipTopicCard,
        skipFrame: options.skipFrame,
        skipFlashLogo: options.skipFlashLogo,
        skipOutro: options.skipOutro,
        skipThumbnail: options.skipThumbnail,
        skipPlaylist: options.skipPlaylist,
        skipMultimediaAnalysis: options.skipMultimediaAnalysis,
    };

    // Audio enhancement options
    if (options.useFfmpegEnhance) args.push('--use-ffmpeg-enhance');
    if (options.useAiDenoiser) args.push('--use-ai-denoiser');
    if (options.useVoicefixer) args.push('--use-voicefixer');

    // Transcription and GPT options
    args.push('--whisper-model', whisperModel);
    args.push('--gpt-model', gptModel);
    args.push('--highlight-style', highlightStyle);

    // B-roll options
    args.push('--broll-clip-count', brollClipCount.toString());
    args.push('--broll-clip-duration', brollClipDuration.toString());
    args.push('--broll-transition-style', brollTransitionStyle);
    
    // Image generation options
    args.push('--image-generation-count', imageGenerationCount.toString());
    args.push('--image-display-duration', imageDisplayDuration.toString());
    args.push('--image-quality', imageQuality);
    args.push('--image-transition-style', imageTransitionStyle);

    // Zoom options
    args.push('--zoom-intensity', zoomIntensity);
    args.push('--zoom-frequency', zoomFrequency);

    // Music options
    args.push('--music-track', musicTrack);
    args.push('--music-background-volume', (backgroundMusicVolume/100).toString());

    // Sound effects options
    args.push('--sound-effect-pack', soundEffectPack);

    // Silence removal options
    args.push('--silence-threshold', silenceThreshold.toString());
    args.push('--silence-margin', silenceMargin.toString());

    // Subtitle options
    args.push('--subtitle-font-size', subtitleFontSize.toString());
    if (options.useAiWordHighlighting) args.push('--use-ai-word-highlighting');

    // Frame options
    args.push('--frame-style', frameStyle);

    // Random Mode options
    if (randomModeEnabled) {
        args.push('--random-mode-enabled');
        if (randomFrameStyle) args.push('--random-frame-style');
        if (randomMusicTrack) args.push('--random-music-track');
        if (randomBrollTransition) args.push('--random-broll-transition');
        if (randomImageTransition) args.push('--random-image-transition');
        if (randomHighlightStyle) args.push('--random-highlight-style');
        if (randomZoomIntensity) args.push('--random-zoom-intensity');
        if (randomZoomFrequency) args.push('--random-zoom-frequency');
        if (randomCaptionStyle) args.push('--random-caption-style');
        if (randomCaptionAnimation) args.push('--random-caption-animation');
        if (randomTopicCardStyle) args.push('--random-topic-card-style');
        if (randomOutroStyle) args.push('--random-outro-style');
        if (randomSoundEffectPack) args.push('--random-sound-effect-pack');
    }

    // Smart Mode options
    if (options.useSmartMode) {
        args.push('--use-smart-mode');
        if (options.smartModeRatio) {
            args.push('--smart-broll-ratio', options.smartModeRatio.brollPerThirtySeconds.toString());
            args.push('--smart-image-ratio', options.smartModeRatio.imagesPerThirtySeconds.toString());
        }
    }

    // Multi-platform and social settings
    if (options.socialPlatforms && options.socialPlatforms.length > 0) {
        args.push('--social-platforms', options.socialPlatforms.join(' '));
    }

    // GPT prompts
    const {
        topicDetectionPrompt,
        transcriptionCorrectionPrompt,
        aiHighlightsPrompt,
        brollAnalysisPrompt,
        imageAnalysisPrompt,
        brollKeywordsPrompt,
        imageGenerationPrompt,
        videoTitlePrompt,
        videoDescriptionPrompt,
        videoTagsPrompt
    } = options;

    // Build comprehensive GPT prompt configs
    const promptConfigs: any = {};

    if (topicDetectionPrompt) {
        promptConfigs.topic_detection = { enabled: true, prompt: topicDetectionPrompt };
    }
    if (transcriptionCorrectionPrompt) {
        promptConfigs.transcription_correction = { enabled: true, prompt: transcriptionCorrectionPrompt };
    }
    if (aiHighlightsPrompt) {
        promptConfigs.ai_highlights = { enabled: true, prompt: aiHighlightsPrompt };
    }
    if (brollAnalysisPrompt) {
        promptConfigs.broll_analysis = { enabled: true, prompt: brollAnalysisPrompt };
    }
    if (imageAnalysisPrompt) {
        promptConfigs.image_analysis = { enabled: true, prompt: imageAnalysisPrompt };
    }
    if (brollKeywordsPrompt) {
        promptConfigs.broll_keywords = { enabled: true, prompt: brollKeywordsPrompt };
    }
    if (imageGenerationPrompt) {
        promptConfigs.image_generation = { enabled: true, prompt: imageGenerationPrompt };
    }
    if (videoTitlePrompt) {
        promptConfigs.video_title = { enabled: true, prompt: videoTitlePrompt };
    }
    if (videoDescriptionPrompt) {
        promptConfigs.video_description = { enabled: true, prompt: videoDescriptionPrompt };
    }
    if (videoTagsPrompt) {
        promptConfigs.video_tags = { enabled: true, prompt: videoTagsPrompt };
    }

    // Add the GPT prompt configs
    if (Object.keys(promptConfigs).length > 0) {
        args.push('--gpt-prompt-configs', JSON.stringify(promptConfigs));
    }
    
    // Add all the skip flags
    for (const [key, value] of Object.entries(skipFlags)) {
        if (value === true) {
            const arg = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
            args.push(arg);
        }
    }

    return args;
}


export async function POST(req: NextRequest): Promise<Response> {
    const pythonScriptPath = path.resolve(process.cwd(), '..', 'src', 'workflows', 'youtube_uploader.py');
    if (!fs.existsSync(pythonScriptPath)) {
        logger.error('Python script not found at:', pythonScriptPath);
        return new Response(JSON.stringify({ error: 'Python script not found' }), { status: 500 });
    }

    try {
        const body = await req.json();
        
        // Merge incoming options with defaults to ensure all keys are present
        const options: ProcessingOptions = { ...DEFAULT_SETTINGS, ...body.options, files: body.files };

        logger.info('🎬 [PROCESSING] Starting video processing with configuration:', {
            mode: options.mode,
            music: options.musicTrack + (options.skipBackgroundMusic ? ' (DISABLED)' : ' (ENABLED)'),
            sfx: options.soundEffectPack + (options.skipSoundEffects ? ' (DISABLED)' : ' (ENABLED)'),
            zoom: { intensity: options.zoomIntensity, frequency: options.zoomFrequency },
            subs: options.subtitleFontSize,
            ai: {
                topic: !options.skipTopicDetection,
                multimedia: !options.skipMultimediaAnalysis,
                image: !options.skipImageGeneration,
            },
            skips: {
                audio: options.skipAudio,
                silence: options.skipSilence,
                music: options.skipBackgroundMusic,
                effects: options.skipSoundEffects,
                broll: options.skipBroll,
                zoom: options.skipDynamicZoom,
            }
        });

        const args = buildArgs(options);
        const allArgs = [...args, '--input-dir', options.inputFolder, ...options.files];
        
        logger.info('🐍 Spawning Python script with arguments:', allArgs.join(' '));

        // Get API keys from server environment variables
        const env = {
            ...process.env,
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            PEXELS_API_KEY: process.env.PEXELS_API_KEY,
            PIXABAY_API_KEY: process.env.PIXABAY_API_KEY,
        };

        const venvPythonPath = path.resolve(process.cwd(), '..', 'venv', 'bin', 'python3');
        const abortController = new AbortController();
        const pythonProcess = spawn(venvPythonPath, [pythonScriptPath, ...allArgs], { 
            signal: abortController.signal,
            stdio: ['pipe', 'pipe', 'pipe'], // Explicit stdio configuration
            env: { 
                ...process.env, 
                OPENAI_API_KEY: process.env.OPENAI_API_KEY,
                PEXELS_API_KEY: process.env.PEXELS_API_KEY,
                PIXABAY_API_KEY: process.env.PIXABAY_API_KEY,
                PYTHONUNBUFFERED: '1', // 🚀 Force unbuffered output for real-time streaming
                PYTHONIOENCODING: 'utf-8' // Ensure UTF-8 encoding
            },
        });
        
        const stream = new ReadableStream({
            start(controller) {
                const send = (data: any) => {
                    try {
                        const message = JSON.stringify(data) + '\n';
                        logger.info(`[STREAM] Sending: ${data.type} - ${data.message?.substring(0, 100)}...`);
                        controller.enqueue(message);
                    } catch (e) {
                        logger.error('Error sending data to client:', e);
                    }
                };
                
                send({ type: 'start', message: '🚀 Process starting...' });

                pythonProcess.stdout.on('data', (data) => {
                    const message = data.toString().trim();
                    if (message) {
                        logger.info(`[STDOUT] ${message}`);
                        send({ type: 'stdout', message });
                    }
                });

                pythonProcess.stderr.on('data', (data) => {
                    const message = data.toString().trim();
                    if (message) {
                        logger.error(`[STDERR] ${message}`);
                        send({ type: 'stderr', message });
                    }
                });

                pythonProcess.on('close', (code) => {
                    logger.info(`[INFO] Python script finished with code ${code}`);
                    send({ type: 'close', message: `Process finished with exit code ${code}` });
                        controller.close();
                });

                pythonProcess.on('error', (err) => {
                    logger.error('[ERROR] Failed to start Python script:', err);
                    send({ type: 'error', message: `Failed to start script: ${err.message}` });
                    controller.error(err);
                });
            },
            cancel() {
                logger.info('[INFO] Client cancelled request. Aborting Python script.');
                if (pythonProcess && !pythonProcess.killed) {
                pythonProcess.kill('SIGINT');
                }
                abortController.abort();
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        logger.error('[ERROR] Failed to process request:', error);
        return new Response(JSON.stringify({ error: `An error occurred: ${error.message}` }), { status: 500 });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
} 