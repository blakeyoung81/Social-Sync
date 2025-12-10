import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { TimelineTrack, TimelineItem, TrackType } from '@/types/timeline';

interface TimelineStore {
  tracks: TimelineTrack[];
  selectedItems: string[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  zoomLevel: number;
  
  // Actions
  setTracks: (tracks: TimelineTrack[]) => void;
  addTrack: (track: TimelineTrack) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<TimelineTrack>) => void;
  
  setSelectedItems: (items: string[]) => void;
  addSelectedItem: (itemId: string) => void;
  removeSelectedItem: (itemId: string) => void;
  
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setZoomLevel: (zoom: number) => void;
  
  // Timeline operations
  moveItem: (itemId: string, newStart: number, newTrackId?: string) => void;
  resizeItem: (itemId: string, newStart: number, newEnd: number) => void;
  duplicateItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
}

export const useTimelineStore = create<TimelineStore>()(
  immer((set, get) => ({
    tracks: [],
    selectedItems: [],
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    zoomLevel: 1,
    
    setTracks: (tracks) => set({ tracks }),
    
    addTrack: (track) => set((state) => {
      state.tracks.push(track);
    }),
    
    removeTrack: (trackId) => set((state) => {
      state.tracks = state.tracks.filter(t => t.id !== trackId);
      state.selectedItems = state.selectedItems.filter(itemId => 
        !state.tracks.find(t => t.items.some(i => i.id === itemId))
      );
    }),
    
    updateTrack: (trackId, updates) => set((state) => {
      const track = state.tracks.find(t => t.id === trackId);
      if (track) {
        Object.assign(track, updates);
      }
    }),
    
    setSelectedItems: (items) => set({ selectedItems: items }),
    
    addSelectedItem: (itemId) => set((state) => {
      if (!state.selectedItems.includes(itemId)) {
        state.selectedItems.push(itemId);
      }
    }),
    
    removeSelectedItem: (itemId) => set((state) => {
      state.selectedItems = state.selectedItems.filter(id => id !== itemId);
    }),
    
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setCurrentTime: (time) => set({ currentTime: time }),
    setDuration: (duration) => set({ duration }),
    setZoomLevel: (zoom) => set({ zoomLevel: Math.max(0.1, Math.min(5, zoom)) }),
    
    moveItem: (itemId, newStart, newTrackId) => set((state) => {
      // Find the item across all tracks
      let item: TimelineItem | undefined;
      let sourceTrack: TimelineTrack | undefined;
      
      for (const track of state.tracks) {
        const foundItem = track.items.find(i => i.id === itemId);
        if (foundItem) {
          item = foundItem;
          sourceTrack = track;
          break;
        }
      }
      
      if (!item || !sourceTrack) return;
      
      // Remove from source track
      sourceTrack.items = sourceTrack.items.filter(i => i.id !== itemId);
      
      // Add to target track (or back to source)
      const targetTrackId = newTrackId || sourceTrack.id;
      const targetTrack = state.tracks.find(t => t.id === targetTrackId);
      
      if (targetTrack) {
        const duration = item.end - item.start;
        const updatedItem = {
          ...item,
          trackId: targetTrackId,
          start: newStart,
          end: newStart + duration
        };
        targetTrack.items.push(updatedItem);
      }
    }),
    
    resizeItem: (itemId, newStart, newEnd) => set((state) => {
      for (const track of state.tracks) {
        const item = track.items.find(i => i.id === itemId);
        if (item) {
          item.start = newStart;
          item.end = newEnd;
          item.duration = newEnd - newStart;
          break;
        }
      }
    }),
    
    duplicateItem: (itemId) => set((state) => {
      for (const track of state.tracks) {
        const item = track.items.find(i => i.id === itemId);
        if (item) {
          const newItem = {
            ...item,
            id: `${item.id}_copy_${Date.now()}`,
            start: item.end,
            end: item.end + item.duration
          };
          track.items.push(newItem);
          break;
        }
      }
    }),
    
    deleteItem: (itemId) => set((state) => {
      for (const track of state.tracks) {
        track.items = track.items.filter(i => i.id !== itemId);
      }
      state.selectedItems = state.selectedItems.filter(id => id !== itemId);
    })
  }))
); 