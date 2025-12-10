interface ProcessingSession {
  id: string;
  timestamp: string;
  mode: string;
  videoCount: number;
  videosUploaded: number; // NEW: Videos actually uploaded to platforms
  processingTimeMinutes: number;
  totalCost: number;
  features: {
    transcription: boolean;
    thumbnails: boolean;
    gptCorrection: boolean;
    silenceCutting: boolean;
    audioEnhancement: boolean;
  };
  platforms: string[];
  success: boolean;
  errorType?: string;
  silenceStats?: {
    totalSecondsRemoved: number;
    avgPercentageReduction: number;
  };
}

interface AnalyticsData {
  sessions: ProcessingSession[];
  totals: {
    videosProcessed: number;
    videosUploaded: number; // NEW: Total videos actually uploaded
    totalCost: number;
    totalTimeSaved: number;
    successRate: number;
  };
  lastUpdated: string;
}

class AnalyticsManager {
  private data: AnalyticsData;
  private readonly maxSessions = 100; // Keep last 100 sessions

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): AnalyticsData {
    if (typeof window === 'undefined') {
      return this.getDefaultData();
    }

    try {
      const stored = localStorage.getItem('socialSyncAnalytics');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate and migrate if needed
        return this.validateData(parsed);
      }
    } catch (error) {
      console.warn('Failed to load analytics data:', error);
    }

    return this.getDefaultData();
  }

  private getDefaultData(): AnalyticsData {
    return {
      sessions: [],
      totals: {
        videosProcessed: 0,
        videosUploaded: 0,
        totalCost: 0,
        totalTimeSaved: 0,
        successRate: 0,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  private validateData(data: any): AnalyticsData {
    // Basic validation and migration
    if (!data.sessions) data.sessions = [];
    if (!data.totals) data.totals = this.getDefaultData().totals;
    if (!data.lastUpdated) data.lastUpdated = new Date().toISOString();
    
    // Migrate existing sessions to include videosUploaded
    data.sessions = data.sessions.map((session: any) => {
      if (session.videosUploaded === undefined) {
        // Retroactively calculate uploads based on mode and success
        session.videosUploaded = session.success ? (
          session.mode === 'dry-run' || session.mode === 'process-only' ? 0 : session.videoCount || 0
        ) : 0;
      }
      return session;
    });
    
    // Ensure totals has videosUploaded
    if (data.totals.videosUploaded === undefined) {
      data.totals.videosUploaded = 0;
    }
    
    // Keep only recent sessions
    data.sessions = data.sessions.slice(-this.maxSessions);
    
    return data;
  }

  private saveData(): void {
    if (typeof window === 'undefined') return;

    try {
      this.data.lastUpdated = new Date().toISOString();
      localStorage.setItem('socialSyncAnalytics', JSON.stringify(this.data));
    } catch (error) {
      console.warn('Failed to save analytics data:', error);
    }
  }

  private recalculateTotals(): void {
    const sessions = this.data.sessions;
    
    this.data.totals = {
      videosProcessed: sessions.reduce((sum, s) => sum + s.videoCount, 0),
      videosUploaded: sessions.reduce((sum, s) => sum + (s.videosUploaded || 0), 0),
      totalCost: sessions.reduce((sum, s) => sum + s.totalCost, 0),
      totalTimeSaved: sessions.reduce((sum, s) => {
        return sum + (s.silenceStats?.totalSecondsRemoved || 0);
      }, 0),
      successRate: sessions.length > 0 ? 
        (sessions.filter(s => s.success).length / sessions.length) * 100 : 0,
    };
  }

  trackProcessingSession(session: Omit<ProcessingSession, 'id' | 'timestamp'>): void {
    // Calculate videos uploaded based on mode
    const videosUploaded = session.success ? (
      session.mode === 'dry-run' || session.mode === 'process-only' ? 0 : session.videoCount
    ) : 0;

    const newSession: ProcessingSession = {
      ...session,
      videosUploaded,
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.data.sessions.push(newSession);
    
    // Keep only recent sessions
    if (this.data.sessions.length > this.maxSessions) {
      this.data.sessions = this.data.sessions.slice(-this.maxSessions);
    }

    this.recalculateTotals();
    this.saveData();
  }

  getAnalyticsData(): AnalyticsData {
    return { ...this.data };
  }

  getWeeklyStats() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentSessions = this.data.sessions.filter(
      s => new Date(s.timestamp) > weekAgo
    );

    const quotaSaved = recentSessions.reduce((sum, s) => {
      // Estimate quota units saved by smart caching
      const baseQuota = s.videoCount * 1600; // Base upload quota
      const smartCachingSavings = Math.min(baseQuota * 0.15, 2500); // 15% savings, max 2500
      return sum + smartCachingSavings;
    }, 0);

    return {
      sessionsThisWeek: recentSessions.length,
      videosThisWeek: recentSessions.reduce((sum, s) => sum + s.videoCount, 0),
      videosUploadedThisWeek: recentSessions.reduce((sum, s) => sum + (s.videosUploaded || 0), 0),
      costThisWeek: recentSessions.reduce((sum, s) => sum + s.totalCost, 0),
      quotaSaved: Math.round(quotaSaved),
      avgProcessingTime: recentSessions.length > 0 ?
        recentSessions.reduce((sum, s) => sum + s.processingTimeMinutes, 0) / recentSessions.length : 0,
    };
  }

  getFeatureUsageStats() {
    const sessions = this.data.sessions;
    if (sessions.length === 0) return {};

    return {
      transcription: (sessions.filter(s => s.features.transcription).length / sessions.length) * 100,
      thumbnails: (sessions.filter(s => s.features.thumbnails).length / sessions.length) * 100,
      gptCorrection: (sessions.filter(s => s.features.gptCorrection).length / sessions.length) * 100,
      silenceCutting: (sessions.filter(s => s.features.silenceCutting).length / sessions.length) * 100,
      audioEnhancement: (sessions.filter(s => s.features.audioEnhancement).length / sessions.length) * 100,
    };
  }

  getPlatformUsageStats() {
    const allPlatforms: Record<string, number> = {};
    
    this.data.sessions.forEach(session => {
      session.platforms.forEach(platform => {
        allPlatforms[platform] = (allPlatforms[platform] || 0) + 1;
      });
    });

    return allPlatforms;
  }

  clearData(): void {
    this.data = this.getDefaultData();
    this.saveData();
  }
}

export const analyticsManager = new AnalyticsManager();
export type { ProcessingSession, AnalyticsData }; 