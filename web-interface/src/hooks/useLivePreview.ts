import { useState, useEffect, useCallback, useRef } from 'react';
import { ProcessingOptions } from '@/types';

interface LivePreviewState {
  isProcessing: boolean;
  previewUrl: string | null;
  currentStep: string;
  progress: number;
  error: string | null;
  processingId: string | null;
}

export function useLivePreview(
  videoPath: string | null,
  options: ProcessingOptions,
  autoStart: boolean = true
) {
  const [state, setState] = useState<LivePreviewState>({
    isProcessing: false,
    previewUrl: null,
    currentStep: '',
    progress: 0,
    error: null,
    processingId: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousOptionsRef = useRef<string>('');

  // Function to start preview processing
  const startPreview = useCallback(async () => {
    if (!videoPath) return;

    // Cancel any existing processing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setState((prev) => ({
      ...prev,
      isProcessing: true,
      error: null,
      currentStep: 'Starting preview...',
      progress: 0,
    }));

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Start preview processing
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath,
          options,
          previewMode: true, // Flag to indicate preview mode
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Preview failed: ${response.statusText}`);
      }

      const { processingId } = await response.json();

      setState((prev) => ({ ...prev, processingId }));

      // Connect to SSE for progress updates
      const eventSource = new EventSource(`/api/preview/progress/${processingId}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          setState((prev) => ({
            ...prev,
            currentStep: data.step,
            progress: data.progress,
          }));
        } else if (data.type === 'complete') {
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            previewUrl: data.previewUrl,
            progress: 100,
          }));
          eventSource.close();
        } else if (data.type === 'error') {
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            error: data.message,
          }));
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: 'Connection to preview server lost',
        }));
        eventSource.close();
      };
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: error.message,
        }));
      }
    }
  }, [videoPath, options]);

  // Debounced preview update
  const updatePreview = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      startPreview();
    }, 1000); // Wait 1 second after last change
  }, [startPreview]);

  // Auto-start on mount if enabled
  useEffect(() => {
    if (autoStart && videoPath) {
      startPreview();
    }
  }, [autoStart, videoPath, startPreview]);

  // Watch for option changes and trigger preview update
  useEffect(() => {
    const currentOptions = JSON.stringify(options);
    
    if (previousOptionsRef.current && previousOptionsRef.current !== currentOptions) {
      updatePreview();
    }
    
    previousOptionsRef.current = currentOptions;
  }, [options, updatePreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startPreview,
    cancelPreview: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setState((prev) => ({
        ...prev,
        isProcessing: false,
      }));
    },
  };
}
