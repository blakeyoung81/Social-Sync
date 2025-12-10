import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, RefreshCw, AlertCircle, CheckCircle2, Image, Brain, Mic } from 'lucide-react';

interface OpenAIUsageTrackerProps {
  apiKey?: string;
  onUsageUpdate?: (usage: any) => void;
}

interface UsageData {
  totalCost: number;
  gptCost: number;
  dalleCost: number;
  dalleImageCount: number;
  whisperCost: number;
  startDate: string;
  endDate: string;
}

export const OpenAIUsageTracker: React.FC<OpenAIUsageTrackerProps> = ({ 
  apiKey, 
  onUsageUpdate 
}) => {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchUsage = async () => {
    if (!apiKey || !apiKey.trim()) {
      setError('No API key provided');
      return;
    }

    // Simple validation - just check if it looks like an OpenAI key
    if (!apiKey.startsWith('sk-')) {
      setError('Invalid API key format - must start with sk-');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/openai-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch usage data');
      }

      setUsage(result.currentMonth);
      setLastUpdated(result.lastUpdated);
      
      if (onUsageUpdate) {
        onUsageUpdate(result);
      }

    } catch (err: any) {
      console.error('Usage fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiKey) {
      fetchUsage();
    }
  }, [apiKey]);

  if (!apiKey) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Real OpenAI Usage Tracking
        </h3>
        <div className="text-center py-8 text-gray-500">
          <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Enter your OpenAI API key to track real usage</p>
          <p className="text-sm">Get precise spending data directly from OpenAI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Real OpenAI Usage This Month
        </h3>
        <button
          onClick={fetchUsage}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {usage && (
        <>
          {/* Total Cost */}
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                ${usage.totalCost.toFixed(3)}
              </div>
              <div className="text-sm text-green-700">
                Total spent this month ({usage.startDate} to {usage.endDate})
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* GPT Costs */}
            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Brain className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <div className="text-xl font-bold text-blue-600">
                ${usage.gptCost.toFixed(3)}
              </div>
              <div className="text-sm text-blue-700">GPT-4o-mini</div>
              <div className="text-xs text-blue-600 mt-1">
                Text generation & processing
              </div>
            </div>

            {/* DALL-E Costs */}
            <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <Image className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <div className="text-xl font-bold text-purple-600">
                ${usage.dalleCost.toFixed(2)}
              </div>
              <div className="text-sm text-purple-700">
                DALL-E 3 ({usage.dalleImageCount} images)
              </div>
              <div className="text-xs text-purple-600 mt-1">
                Thumbnail generation
              </div>
            </div>

            {/* Whisper Costs */}
            <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <Mic className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <div className="text-xl font-bold text-orange-600">
                ${usage.whisperCost.toFixed(3)}
              </div>
              <div className="text-sm text-orange-700">Whisper API</div>
              <div className="text-xs text-orange-600 mt-1">
                Audio transcription
              </div>
            </div>
          </div>

          {/* Comparison Note */}
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">Usage Insights</span>
            </div>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>• DALL-E thumbnails typically account for ~93% of costs ($0.04/image)</p>
              <p>• GPT text processing is very economical (~$0.003/video)</p>
              <p>• Whisper runs locally in SocialSync Pro (FREE)</p>
              {usage.totalCost < 1 && (
                <p>• 💡 Your usage is very efficient! Consider enabling more AI features.</p>
              )}
            </div>
          </div>

          {lastUpdated && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}; 