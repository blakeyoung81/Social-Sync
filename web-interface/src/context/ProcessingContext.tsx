import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { ProcessingOptions, VideoCompletion, BatchProgress, SilenceCutStats } from '../types';
import { DEFAULT_SETTINGS } from '../constants/processing';

interface ProcessingState {
  isProcessing: boolean;
  processingStatus: string[];
  currentStep: string;
  completedSteps: string[];
  progressPercentage: number;
  batchProgress: BatchProgress | null;
  silenceCutStats: SilenceCutStats | null;
  videoCompletions: VideoCompletion[];
  error: string | null;
}

type ProcessingAction =
  | { type: 'START_PROCESSING' }
  | { type: 'STOP_PROCESSING' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'ADD_STATUS'; payload: string }
  | { type: 'SET_CURRENT_STEP'; payload: string }
  | { type: 'ADD_COMPLETED_STEP'; payload: string }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'SET_BATCH_PROGRESS'; payload: BatchProgress | null }
  | { type: 'SET_SILENCE_STATS'; payload: SilenceCutStats | null }
  | { type: 'ADD_VIDEO_COMPLETION'; payload: VideoCompletion }
  | { type: 'RESET_STATE' };

const initialState: ProcessingState = {
  isProcessing: false,
  processingStatus: [],
  currentStep: '',
  completedSteps: [],
  progressPercentage: 0,
  batchProgress: null,
  silenceCutStats: null,
  videoCompletions: [],
  error: null,
};

function processingReducer(state: ProcessingState, action: ProcessingAction): ProcessingState {
  switch (action.type) {
    case 'START_PROCESSING':
      return {
        ...state,
        isProcessing: true,
        error: null,
        processingStatus: [],
        currentStep: '',
        completedSteps: [],
        progressPercentage: 0,
        videoCompletions: [],
      };

    case 'STOP_PROCESSING':
      return {
        ...state,
        isProcessing: false,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isProcessing: false,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'ADD_STATUS':
      return {
        ...state,
        processingStatus: [...state.processingStatus, action.payload],
      };

    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
        progressPercentage: 0,
      };

    case 'ADD_COMPLETED_STEP':
      return {
        ...state,
        completedSteps: [...state.completedSteps, action.payload],
      };

    case 'SET_PROGRESS':
      return {
        ...state,
        progressPercentage: action.payload,
      };

    case 'SET_BATCH_PROGRESS':
      return {
        ...state,
        batchProgress: action.payload,
      };

    case 'SET_SILENCE_STATS':
      return {
        ...state,
        silenceCutStats: action.payload,
      };

    case 'ADD_VIDEO_COMPLETION':
      return {
        ...state,
        videoCompletions: [...state.videoCompletions, action.payload],
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

interface ProcessingContextType {
  state: ProcessingState;
  dispatch: React.Dispatch<ProcessingAction>;
  // Convenience functions
  startProcessing: () => void;
  stopProcessing: () => void;
  setError: (error: string) => void;
  clearError: () => void;
  addStatus: (status: string) => void;
  setCurrentStep: (step: string) => void;
  addCompletedStep: (step: string) => void;
  setProgress: (progress: number) => void;
  setBatchProgress: (progress: BatchProgress | null) => void;
  setSilenceStats: (stats: SilenceCutStats | null) => void;
  addVideoCompletion: (completion: VideoCompletion) => void;
  resetState: () => void;
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

export function ProcessingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(processingReducer, initialState);

  const contextValue: ProcessingContextType = {
    state,
    dispatch,
    startProcessing: () => dispatch({ type: 'START_PROCESSING' }),
    stopProcessing: () => dispatch({ type: 'STOP_PROCESSING' }),
    setError: (error: string) => dispatch({ type: 'SET_ERROR', payload: error }),
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
    addStatus: (status: string) => dispatch({ type: 'ADD_STATUS', payload: status }),
    setCurrentStep: (step: string) => dispatch({ type: 'SET_CURRENT_STEP', payload: step }),
    addCompletedStep: (step: string) => dispatch({ type: 'ADD_COMPLETED_STEP', payload: step }),
    setProgress: (progress: number) => dispatch({ type: 'SET_PROGRESS', payload: progress }),
    setBatchProgress: (progress: BatchProgress | null) => dispatch({ type: 'SET_BATCH_PROGRESS', payload: progress }),
    setSilenceStats: (stats: SilenceCutStats | null) => dispatch({ type: 'SET_SILENCE_STATS', payload: stats }),
    addVideoCompletion: (completion: VideoCompletion) => dispatch({ type: 'ADD_VIDEO_COMPLETION', payload: completion }),
    resetState: () => dispatch({ type: 'RESET_STATE' }),
  };

  return (
    <ProcessingContext.Provider value={contextValue}>
      {children}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  const context = useContext(ProcessingContext);
  if (context === undefined) {
    throw new Error('useProcessing must be used within a ProcessingProvider');
  }
  return context;
} 