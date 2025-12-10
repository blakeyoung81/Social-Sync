import React, { useRef, useEffect } from 'react';
import { Zap, CheckCircle2, Scissors, FileText, Youtube } from 'lucide-react';
import type { ProcessingStep, ProcessingStatus as ProcessingStatusType, VideoCompletion, ProcessingOptions, BatchProgress, SilenceCutStats } from '@/types';

interface ProcessingStatusProps {
  processing: boolean;
  processingStatus: string[];
  batchProgress: BatchProgress | null;
  currentStep: string;
  completedSteps: string[];
  progressPercentage: number;
  silenceCutStats: SilenceCutStats | null;
  videoCompletions: VideoCompletion[];
  processingSteps: ProcessingStep[];
  options: ProcessingOptions;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  processing,
  processingStatus,
  batchProgress,
  currentStep,
  completedSteps,
  progressPercentage,
  silenceCutStats,
  videoCompletions,
  processingSteps,
  options,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new status messages arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [processingStatus]);

  const renderApiWarnings = (options: ProcessingOptions) => {
    const warnings = [];
    
    // Check if AI features are enabled but OpenAI key is missing
    if ((!options.skipImageGeneration || !options.skipMultimediaAnalysis || !options.skipAiHighlights) && !options.openaiKey) {
      warnings.push(
        <div key="openai-warning" className="mb-2 p-2 bg-amber-50 border-l-4 border-amber-500 text-amber-700 text-sm">
          <strong>⚠️ OpenAI API Key Missing:</strong> DALL-E images and AI features won't work
        </div>
      );
    }
    
    // Check if B-roll is enabled but Pexels key is missing
    if (!options.skipBroll && !options.pexelsApiKey) {
      warnings.push(
        <div key="pexels-warning" className="mb-2 p-2 bg-amber-50 border-l-4 border-amber-500 text-amber-700 text-sm">
          <strong>⚠️ Pexels API Key Missing:</strong> B-roll footage won't be downloaded
        </div>
      );
    }
    
    return warnings.length > 0 ? (
      <div className="mb-3">
        {warnings}
      </div>
    ) : null;
  };

  // Debug: Always show component while debugging
  if (!processing && processingStatus.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: '#111827' }}>
        <Zap className="text-yellow-600 animate-pulse" />
        Processing in Progress
      </h2>
      
      {renderApiWarnings(options)}

      {/* Batch Progress */}
      {batchProgress && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-blue-900">Batch Progress</h3>
            <span className="text-blue-700 font-medium">
              {batchProgress.currentVideo} of {batchProgress.totalVideos}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(batchProgress.currentVideo / batchProgress.totalVideos) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-blue-700">
            Currently processing: <strong>{batchProgress.videoName}</strong>
          </p>
        </div>
      )}

      {/* Processing Steps Visual */}
      <div className="mb-6">
        <h3 className="font-bold mb-4" style={{ color: '#111827' }}>Processing Pipeline</h3>
        <div className="flex flex-wrap gap-3 justify-start">
          {processingSteps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.name);
            const isCurrent = currentStep === step.name;
            const StepIcon = step.icon;
            
            return (
              <div key={step.name} className="flex items-center">
                <div
                  className={`p-3 rounded-lg border-2 transition-all duration-500 min-w-[140px] transform ${
                    isCompleted
                      ? 'bg-green-50 border-green-400 shadow-lg scale-105 animate-bounce-once'
                      : isCurrent
                      ? 'bg-yellow-50 border-yellow-400 shadow-xl scale-110 animate-pulse-strong'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-full transition-all duration-300 ${
                      isCompleted
                        ? 'bg-green-500 animate-pulse'
                        : isCurrent
                        ? 'bg-yellow-500 animate-pulse'
                        : 'bg-gray-300'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                      ) : isCurrent ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <StepIcon className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors duration-300 ${
                      isCompleted
                        ? 'text-green-800'
                        : isCurrent
                        ? 'text-yellow-800'
                        : 'text-gray-600'
                    }`} style={{
                      color: isCompleted ? '#166534' : isCurrent ? '#92400e' : '#4b5563'
                    }}>
                      {step.name}
                    </span>
                  </div>
                  
                  {isCurrent && progressPercentage > 0 && (
                    <div className="mt-2 animate-fadeIn">
                      <div className="w-full bg-yellow-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-500 ease-out animate-shimmer"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs mt-1 font-semibold" style={{ color: '#92400e' }}>
                        {Math.round(progressPercentage)}% complete
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Add animated arrow between steps */}
                {index < processingSteps.length - 1 && (
                  <div className={`mx-2 text-2xl transition-all duration-300 ${
                    isCompleted ? 'text-green-500 animate-pulse' : 'text-gray-400'
                  }`}>
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Silence Cut Statistics */}
      {silenceCutStats && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg animate-slideIn">
          <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
            <Scissors className="w-4 h-4" />
            Silence Removal Stats
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-purple-700 font-medium">Time Saved:</span>
              <div className="text-purple-900 font-bold">
                {silenceCutStats.minutes_saved}m {silenceCutStats.seconds_saved}s
              </div>
            </div>
            <div>
              <span className="text-purple-700 font-medium">Percentage:</span>
              <div className="text-purple-900 font-bold">{silenceCutStats.percentage?.toFixed(1)}%</div>
            </div>
            <div>
              <span className="text-purple-700 font-medium">Original:</span>
              <div className="text-purple-900 font-bold">
                {Math.floor(silenceCutStats.original_duration / 60)}:{(silenceCutStats.original_duration % 60).toFixed(0).padStart(2, '0')}
              </div>
            </div>
            <div>
              <span className="text-purple-700 font-medium">New Length:</span>
              <div className="text-purple-900 font-bold">
                {Math.floor(silenceCutStats.new_duration / 60)}:{(silenceCutStats.new_duration % 60).toFixed(0).padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Completions */}
      {videoCompletions.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#111827' }}>
            <CheckCircle2 className="text-green-600" />
            Uploaded Videos ({videoCompletions.length})
          </h3>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {videoCompletions.map((completion, index) => (
              <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg animate-slideIn">
                <div className="flex items-center justify-between">
                  <div>
                    {completion.title && (
                      <h4 className="font-medium text-green-900">{completion.title}</h4>
                    )}
                    {completion.filename && (
                      <p className="text-sm text-green-700">{completion.filename}</p>
                    )}
                    {completion.date && completion.time && (
                      <p className="text-xs text-green-600">
                        Scheduled: {completion.date} at {completion.time}
                      </p>
                    )}
                    {completion.playlists && completion.playlists.length > 0 && (
                      <p className="text-xs text-green-600">
                        Playlists: {completion.playlists.join(', ')}
                      </p>
                    )}
                    {/* Subtitle fallback warning */}
                    {completion.subtitle_fallback && (
                      <p className="text-xs text-orange-600 mt-1 font-semibold">
                        ⚠️ Subtitle fallback used: Original timing preserved due to GPT correction issue.
                      </p>
                    )}
                  </div>
                  {completion.url && (
                    <a
                      href={completion.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-full hover:bg-green-700 transition-colors"
                    >
                      View
                    </a>
                  )}
                </div>
                {completion.silence_stats && (
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs text-green-600">
                      🔇 Saved {completion.silence_stats.minutes_saved}m {completion.silence_stats.seconds_saved}s 
                      ({completion.silence_stats.percentage.toFixed(1)}% reduction)
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Log Output */}
      <div className="mt-6">
        <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#111827' }}>
          <FileText className="w-4 h-4" />
          Processing Log
        </h3>
        <div 
          ref={logContainerRef}
          className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm border border-gray-700"
        >
          {processingStatus.length === 0 ? (
            <div className="text-gray-400 italic">Waiting for processing to start...</div>
          ) : (
            processingStatus.map((msg, i) => (
              <pre key={i} className="whitespace-pre-wrap break-words text-green-400 mb-1 leading-relaxed font-bold animate-fadeIn" style={{
                animationDelay: `${i * 0.05}s`
              }}>{msg}</pre>
            ))
          )}
          {/* Debug info */}
          <div className="text-xs text-gray-500 mt-2 border-t border-gray-700 pt-2">
            Debug: {processingStatus.length} messages
          </div>
        </div>
      </div>
    </div>
  );
}; 