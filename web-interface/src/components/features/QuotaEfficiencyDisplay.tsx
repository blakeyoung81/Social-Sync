'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Database, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface CacheStatus {
  youtube?: {
    scheduled_videos: {
      exists: boolean;
      age_hours: number;
      status: 'fresh' | 'good' | 'stale' | 'missing' | 'corrupted';
      last_updated: string | null;
      data_count: number;
    };
    playlists: {
      exists: boolean;
      age_hours: number;
      status: 'fresh' | 'good' | 'stale' | 'missing' | 'corrupted';
      last_updated: string | null;
      data_count: number;
    };
  };
  total_quota_saved: number;
  recommendations: string[];
}

interface QuotaSavingsReport {
  total_quota_saved: number;
  total_quota_used: number;
  efficiency_ratio: number;
  scheduled_videos: {
    cache_hits: number;
    quota_per_hit_saved: number;
    total_saved: number;
  };
  playlists: {
    cache_hits: number;
    quota_per_hit_saved: number;
    total_saved: number;
  };
}

export function QuotaEfficiencyDisplay() {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [quotaReport, setQuotaReport] = useState<QuotaSavingsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCacheStatus = async () => {
    try {
      const response = await fetch('/api/cache-status');
      const data = await response.json();
      setCacheStatus(data.cache_status);
      
      // Check if quota_report has an error or missing data
      if (data.quota_report && !data.quota_report.error && typeof data.quota_report.total_quota_saved === 'number') {
        setQuotaReport(data.quota_report);
      } else {
        console.warn('Quota report has errors or missing data:', data.quota_report);
        // Set a default quota report with safe values
        setQuotaReport({
          total_quota_saved: 0,
          total_quota_used: 0,
          efficiency_ratio: 1,
          scheduled_videos: {
            cache_hits: 0,
            quota_per_hit_saved: 500,
            total_saved: 0
          },
          playlists: {
            cache_hits: 0,
            quota_per_hit_saved: 50,
            total_saved: 0
          }
        });
      }
    } catch (error) {
      console.error('Error fetching cache status:', error);
    } finally {
      setLoading(false);
    }
  };

  const forceRefreshCache = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/refresh-cache', { method: 'POST' });
      await fetchCacheStatus(); // Refresh status
    } catch (error) {
      console.error('Error refreshing cache:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCacheStatus();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchCacheStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fresh': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'stale': return 'bg-yellow-500';
      case 'missing': return 'bg-red-500';
      case 'corrupted': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fresh':
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      case 'stale':
      case 'missing':
      case 'corrupted':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const formatAge = (hours: number | null) => {
    if (hours === null || hours === undefined) return 'Unknown';
    if (hours < 1) return 'Less than 1 hour';
    if (hours < 24) return `${Math.round(hours)} hours`;
    const days = Math.round(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading quota efficiency data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cacheStatus || !quotaReport) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-700">
            No cache data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quota Savings Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>Ultra-Efficient Quota Usage</span>
          </CardTitle>
          <CardDescription>
            Advanced caching system saves thousands of quota units
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Savings */}
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {(quotaReport.total_quota_saved || 0).toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Quota Units Saved</div>
              <div className="text-xs text-green-600 mt-1">
                vs. {quotaReport.total_quota_used || 0} used
              </div>
            </div>

            {/* Efficiency Ratio */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(quotaReport.efficiency_ratio || 1)}x
              </div>
              <div className="text-sm text-blue-700">Efficiency Multiplier</div>
              <div className="text-xs text-blue-600 mt-1">
                Cache vs. API calls
              </div>
            </div>

            {/* Videos Per Day */}
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {Math.floor((10000 - (quotaReport.total_quota_used || 0) / 7) / 1600)}
              </div>
              <div className="text-sm text-purple-700">Videos/Day Possible</div>
              <div className="text-xs text-purple-600 mt-1">
                With remaining quota
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Cache Status</span>
            </CardTitle>
            <CardDescription>
              Real-time status of cached YouTube data
            </CardDescription>
          </div>
          <Button
            onClick={forceRefreshCache}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Scheduled Videos Cache */}
            {cacheStatus.youtube?.scheduled_videos && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(cacheStatus.youtube.scheduled_videos.status)}
                  <div>
                    <div className="font-medium">Scheduled Videos</div>
                    <div className="text-sm text-gray-700">
                      {cacheStatus.youtube.scheduled_videos?.data_count || 0} scheduled dates cached
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`${getStatusColor(cacheStatus.youtube.scheduled_videos.status)} text-white`}>
                    {cacheStatus.youtube.scheduled_videos.status}
                  </Badge>
                  <div className="text-xs text-gray-700 mt-1">
                    {formatAge(cacheStatus.youtube.scheduled_videos.age_hours)} old
                  </div>
                </div>
              </div>
            )}

            {/* Playlists Cache */}
            {cacheStatus.youtube?.playlists && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(cacheStatus.youtube.playlists.status)}
                  <div>
                    <div className="font-medium">Playlists</div>
                    <div className="text-sm text-gray-700">
                      {cacheStatus.youtube.playlists?.data_count || 0} playlists cached
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`${getStatusColor(cacheStatus.youtube.playlists.status)} text-white`}>
                    {cacheStatus.youtube.playlists.status}
                  </Badge>
                  <div className="text-xs text-gray-700 mt-1">
                    {formatAge(cacheStatus.youtube.playlists.age_hours)} old
                  </div>
                </div>
              </div>
            )}

            {/* Fallback message if no cache data */}
            {(!cacheStatus.youtube?.scheduled_videos && !cacheStatus.youtube?.playlists) && (
              <div className="text-center py-8 text-gray-700">
                <Database className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No cache data available</p>
                <p className="text-sm">Process some videos to initialize the cache</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Savings Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Quota Savings Breakdown</CardTitle>
          <CardDescription>
            How the caching system saves quota units
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scheduled Videos Savings */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Scheduled Videos Cache</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Cache hits:</span>
                    <span className="font-medium">{quotaReport.scheduled_videos?.cache_hits || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Units saved per hit:</span>
                    <span className="font-medium">{quotaReport.scheduled_videos?.quota_per_hit_saved || 500}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total saved:</span>
                    <span className="font-bold text-green-600">
                      {(quotaReport.scheduled_videos?.total_saved || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Playlists Savings */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Playlists Cache</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Cache hits:</span>
                    <span className="font-medium">{quotaReport.playlists?.cache_hits || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Units saved per hit:</span>
                    <span className="font-medium">{quotaReport.playlists?.quota_per_hit_saved || 50}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total saved:</span>
                    <span className="font-bold text-green-600">
                      {(quotaReport.playlists?.total_saved || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {cacheStatus.recommendations && cacheStatus.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span>Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cacheStatus.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-center space-x-2 text-orange-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{recommendation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 