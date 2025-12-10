export interface TimelineTrack {
  id: string;
  type: TrackType;
  name: string;
  isVisible: boolean;
  isLocked: boolean;
  height: number;
  color: string;
  items: TimelineItem[];
  zIndex: number;
}

export enum TrackType {
  VIDEO = 'video',
  AUDIO = 'audio',
  CAPTIONS = 'captions',
  BROLL = 'broll',
  OVERLAY = 'overlay',
  TRANSITION = 'transition',
  EFFECT = 'effect'
}

export interface TimelineItem {
  id: string;
  trackId: string;
  start: number;
  end: number;
  duration: number;
  type: TrackType;
  data: any; // Specific data based on track type
  isSelected: boolean;
  isLocked: boolean;
  opacity: number;
}

export interface VideoTrackItem extends TimelineItem {
  type: TrackType.VIDEO;
  data: {
    videoPath: string;
    thumbnailPath?: string;
    isCut?: boolean;
    clipId?: string;
  };
}

export interface AudioTrackItem extends TimelineItem {
  type: TrackType.AUDIO;
  data: {
    audioPath?: string;
    waveformData?: number[];
    volume: number;
    isMuted: boolean;
    isCut?: boolean;
  };
}

export interface CaptionTrackItem extends TimelineItem {
  type: TrackType.CAPTIONS;
  data: {
    text: string;
    style: CaptionStyle;
    position: {
      x: number;
      y: number;
    };
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
  };
}

export interface BRollTrackItem extends TimelineItem {
  type: TrackType.BROLL;
  data: {
    mediaPath: string;
    mediaType: 'video' | 'image';
    thumbnailPath?: string;
    transition?: TransitionType;
    opacity: number;
    scale: number;
    position: {
      x: number;
      y: number;
    };
  };
}

export interface OverlayTrackItem extends TimelineItem {
  type: TrackType.OVERLAY;
  data: {
    overlayType: 'text' | 'image' | 'shape' | 'animation';
    content: any;
    position: {
      x: number;
      y: number;
    };
    scale: number;
    rotation: number;
  };
}

export interface TransitionTrackItem extends TimelineItem {
  type: TrackType.TRANSITION;
  data: {
    transitionType: TransitionType;
    easing: string;
    direction?: string;
  };
}

export interface EffectTrackItem extends TimelineItem {
  type: TrackType.EFFECT;
  data: {
    effectType: string;
    parameters: Record<string, any>;
    intensity: number;
  };
}

export enum CaptionStyle {
  TYPEWRITER = 'typewriter',
  BOUNCE = 'bounce',
  GLOW = 'glow',
  KARAOKE = 'karaoke',
  POP = 'pop',
  SLIDE = 'slide',
  SCALE = 'scale',
  RAINBOW = 'rainbow'
}

export enum TransitionType {
  FADE = 'fade',
  SLIDE_LEFT = 'slide-left',
  SLIDE_RIGHT = 'slide-right',
  SLIDE_UP = 'slide-up',
  SLIDE_DOWN = 'slide-down',
  ZOOM_IN = 'zoom-in',
  ZOOM_OUT = 'zoom-out',
  DISSOLVE = 'dissolve',
  WIPE = 'wipe'
}

export interface TimelineState {
  tracks: TimelineTrack[];
  currentTime: number;
  duration: number;
  zoomLevel: number;
  playheadPosition: number;
  selectedItems: string[];
  clipboard: TimelineItem[];
  undoStack: TimelineState[];
  redoStack: TimelineState[];
}

export interface TrackControls {
  canAddTrack: boolean;
  canRemoveTrack: boolean;
  canReorderTracks: boolean;
  canToggleVisibility: boolean;
  canToggleLock: boolean;
  canResizeTrack: boolean;
}

export interface TimelineViewport {
  startTime: number;
  endTime: number;
  pixelsPerSecond: number;
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
}

export interface TrackOperations {
  addTrack: (type: TrackType, name?: string) => void;
  removeTrack: (trackId: string) => void;
  reorderTracks: (trackIds: string[]) => void;
  toggleTrackVisibility: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  resizeTrack: (trackId: string, height: number) => void;
  addItem: (trackId: string, item: Omit<TimelineItem, 'id' | 'trackId'>) => void;
  removeItem: (itemId: string) => void;
  moveItem: (itemId: string, newTrackId: string, newStart: number) => void;
  resizeItem: (itemId: string, newStart: number, newEnd: number) => void;
  duplicateItem: (itemId: string) => void;
  cutItem: (itemId: string, cutTime: number) => void;
  splitItem: (itemId: string, splitTime: number) => void;
} 