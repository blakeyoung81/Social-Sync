'use client';

import { useState, useEffect } from 'react';
import VideoSelector from '../../components/VideoSelector';
import VideoSetupScreen from '@/components/VideoSetupScreen';
import VideoEditor from '@/components/VideoEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, ArrowLeft, HelpCircle, Undo, Download, Files, Edit, Sliders, 
  Search, Split, Gauge, MoreHorizontal, Folder, FileText, Scissors, Zap, 
  RotateCcw, Video, Image, Subtitles, Sparkles, X, Maximize2, MessageCircle, Trash2, 
  Plus, Type, FolderOpen, Loader, CheckCircle, Hourglass, Settings, BrainCircuit 
} from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Video {
  name: string;
  path: string;
  duration?: string;
  size?: string;
}

interface ProcessingOptions {
  cutSilences: boolean;
  cutBadTakes: boolean;
  removeFiller: boolean;
  addSmartCaptions: boolean;
  likeSubscribeButton: boolean;
  jumpCutZoom: boolean;
  enhanceAudio: boolean;
  aiBackground: boolean;
}

type EditorStep = 'select' | 'setup' | 'processing' | 'edit';

export default function EditorPage() {
  const [currentStep, setCurrentStep] = useState<EditorStep>('select');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions | null>(null);
  const [processingProgress, setProcessingProgress] = useState<string[]>([]);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);

  // Define processing steps with status
  const initialProcessingSteps = [
    { name: 'Video Analysis', status: 'pending', icon: <Settings size={18} /> },
    { name: 'Silence Detection', status: 'pending', icon: <Zap size={18} /> },
    { name: 'Transcription', status: 'pending', icon: <FileText size={18} /> },
    { name: 'Smart Captions', status: 'pending', icon: <Sparkles size={18} /> },
    { name: 'AI B-Roll Selection', status: 'pending', icon: <BrainCircuit size={18} /> }
  ];
  const [processingSteps, setProcessingSteps] = useState(initialProcessingSteps);

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
    setCurrentStep('setup');
  };

  const handleProcessAndEdit = async (options: ProcessingOptions) => {
    if (!selectedVideo) return;
    
    setProcessingOptions(options);
    setCurrentStep('processing');
    setProcessingProgress([]);
    setIsProcessingComplete(false);

    try {
      // Background processing pipeline
      await runBackgroundProcessing(selectedVideo, options);
      setIsProcessingComplete(true);
      
      // Small delay to show completion, then move to editor
      setTimeout(() => {
        setCurrentStep('edit');
      }, 1500);
    } catch (error) {
      console.error('Processing failed:', error);
      // Could add error handling here
    }
  };

  const runBackgroundProcessing = async (video: Video, options: ProcessingOptions) => {
    try {
      setProcessingSteps(initialProcessingSteps); // Reset steps to initial state
      setProcessingProgress(['🚀 Initializing processing pipeline...']);
      
      const steps = [];
      
      // Build processing steps based on options
      if (options.addSmartCaptions) {
        steps.push({
          name: 'Smart captions generation',
          api: '/api/transcribe-video',
          payload: { videoPath: video.path }
        });
      }
      
      if (options.cutSilences) {
        steps.push({
          name: 'Silence analysis',
          api: '/api/analyze-silence',
          payload: { videoPath: video.path }
        });
      }
      
      if (options.removeFiller) {
        steps.push({
          name: 'AI highlights detection',
          api: '/api/detect-highlights',
          payload: { videoPath: video.path, checkExisting: true }
        });
      }

      // Execute each step with data flow
      let transcriptData: any = null;
      
      for (const step of steps) {
        setProcessingSteps(prev => prev.map(s => s.name === step.name ? { ...s, status: 'processing' } : s));
        
        try {
          // Modify payload based on step type and available data
          let payload: any = { ...step.payload };
          
          if (step.name === 'AI highlights detection' && transcriptData) {
            // If we have transcript data, use it for highlights detection
            payload = {
              transcript: transcriptData.fullText,
              segments: transcriptData.segments,
              videoTitle: video.name,
              videoDuration: video.duration || 0,
              videoPath: video.path,
              checkExisting: false // Force processing since we have transcript
            };
          }
          
          const response: Response = await fetch(step.api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            throw new Error(`${step.name} failed`);
          }

          const result: any = await response.json();
          
          if (result.success) {
            // Store transcript data for subsequent steps
            if (step.name === 'Smart captions generation' && result.segments) {
              transcriptData = result;
            }
            
            setProcessingSteps(prev => prev.map(s => s.name === step.name ? { ...s, status: 'completed' } : s));
          } else {
            throw new Error(result.error || `${step.name} failed`);
          }
          
          // Add small delay for UX
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          setProcessingSteps(prev => prev.map(s => s.name === step.name ? { ...s, status: 'failed' } : s));
          throw error;
        }
      }

      /*
      // Apply GPT correction if captions were generated
      if (options.addSmartCaptions) {
        setProcessingProgress(prev => [...prev, '⏳ Applying GPT corrections...']);
        
        try {
          const response = await fetch('/api/gpt-correct-transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoPath: video.path })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setProcessingProgress(prev => {
                const newProgress = [...prev];
                newProgress[newProgress.length - 1] = '✅ GPT corrections applied';
                return newProgress;
              });
            }
          }
        } catch (error) {
          console.error('GPT correction failed:', error);
          setProcessingProgress(prev => {
            const newProgress = [...prev];
            newProgress[newProgress.length - 1] = '⚠️ GPT corrections skipped';
            return newProgress;
          });
        }
      }
      */

      setProcessingProgress(prev => [...prev, '🎉 Processing complete!']);
      
    } catch (error) {
      setProcessingProgress(prev => [...prev, `❌ Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      throw error;
    }
  };

  const handleBackToSelect = () => {
    setCurrentStep('select');
    setSelectedVideo(null);
    setProcessingOptions(null);
    setProcessingProgress([]);
    setIsProcessingComplete(false);
  };

  const handleBackToSetup = () => {
    setCurrentStep('setup');
    setProcessingProgress([]);
    setIsProcessingComplete(false);
  };

  if (currentStep === 'select') {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl">🎬</span>
              <h1 className="text-3xl font-bold text-white">Video Editor</h1>
            </div>
            <p className="text-gray-300">Select a video to enhance and edit</p>
          </div>
          
          <VideoSelector onVideoSelect={handleVideoSelect} />
          
          <div className="mt-8 text-center">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              ← Back to Bulk Processor
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'setup' && selectedVideo) {
    return (
      <VideoSetupScreen 
        selectedVideo={selectedVideo}
        onProcessAndEdit={handleProcessAndEdit}
        onBack={handleBackToSelect}
      />
    );
  }

  if (currentStep === 'processing' && selectedVideo && processingOptions) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <h1 className="text-2xl font-bold text-white">Processing Your Video</h1>
            </div>
            <p className="text-gray-300">Applying selected enhancements in the background...</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                🎬 {selectedVideo.name}
              </h3>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-3">
                {processingSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3 text-white">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {step.status === 'pending' && <Hourglass size={18} className="text-gray-400" />}
                      {step.status === 'processing' && <Loader size={18} className="text-blue-400 animate-spin" />}
                      {step.status === 'completed' && <CheckCircle size={18} className="text-green-400" />}
                      {step.status === 'failed' && <X size={18} className="text-red-400" />}
                    </div>
                    <span className={
                      step.status === 'completed' ? 'text-green-400' : 
                      step.status === 'failed' ? 'text-red-400' : 'text-white'
                    }>
                      {step.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={handleBackToSetup}
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              Cancel Processing
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'edit' && selectedVideo) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-4">
        <VideoEditor 
          video={{
            id: selectedVideo.name,
            name: selectedVideo.name,
            path: selectedVideo.path,
            duration: 0, // Will be loaded by the editor
            size: 0, // Will be loaded by the editor
            extension: selectedVideo.path.split('.').pop() || 'mp4',
            sizeFormatted: '0 MB',
            isSupported: true,
            warnings: [],
          }}
        />
      </div>
    );
  }

  return null;
} 