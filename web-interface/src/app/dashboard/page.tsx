'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Youtube, Facebook, Instagram, Music, 
  Link2, LogOut, User, Settings, 
  CheckCircle2, XCircle, Loader2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SocialConnection {
  id: string;
  platform: string;
  platformUsername: string | null;
  connected: boolean;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchConnections();
    }
  }, [session]);

  // Handle success messages from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('youtube_connected') === 'true') {
      toast.success('YouTube connected successfully!');
      router.replace('/dashboard');
    }
    if (params.get('facebook_connected') === 'true') {
      toast.success('Facebook connected successfully!');
      router.replace('/dashboard');
    }
    if (params.get('instagram_connected') === 'true') {
      toast.success('Instagram connected successfully!');
      router.replace('/dashboard');
    }
    if (params.get('tiktok_connected') === 'true') {
      toast.success('TikTok connected successfully!');
      router.replace('/dashboard');
    }
  }, [router]);

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/user/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectPlatform = async (platform: string) => {
    try {
      // Redirect to platform auth
      const authUrl = `/api/${platform}/auth`;
      window.location.href = authUrl;
    } catch (error) {
      toast.error(`Failed to connect ${platform}`);
    }
  };

  const disconnectPlatform = async (platform: string) => {
    try {
      const response = await fetch(`/api/user/connections/${platform}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`Disconnected from ${platform}`);
        fetchConnections();
      } else {
        toast.error(`Failed to disconnect ${platform}`);
      }
    } catch (error) {
      toast.error(`Failed to disconnect ${platform}`);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
    toast.success('Signed out successfully');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const platforms = [
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-600' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
    { id: 'tiktok', name: 'TikTok', icon: Music, color: 'text-black' },
    { id: 'pinterest', name: 'Pinterest', icon: Link2, color: 'text-red-500' },
  ];

  const getConnectionStatus = (platform: string) => {
    return connections.find(c => c.platform === platform);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/social-sync-logo.png" 
                alt="Social Sync Logo" 
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {session.user?.name || session.user?.email}!
                </h1>
                <p className="text-gray-600">Manage your social media connections</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Editor
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Social Connections */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Connected Accounts</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const connection = getConnectionStatus(platform.id);
              const Icon = platform.icon;
              const isConnected = !!connection;

              return (
                <div
                  key={platform.id}
                  className={`border-2 rounded-lg p-6 transition-all ${
                    isConnected
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-8 h-8 ${platform.color}`} />
                      <div>
                        <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                        {isConnected && connection.platformUsername && (
                          <p className="text-sm text-gray-600">@{connection.platformUsername}</p>
                        )}
                      </div>
                    </div>
                    {isConnected ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  {isConnected ? (
                    <button
                      onClick={() => disconnectPlatform(platform.id)}
                      className="w-full py-2 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => connectPlatform(platform.id)}
                      className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">{session.user?.email}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Account Management</p>
                  <p className="text-sm text-gray-600">Manage your account preferences</p>
                </div>
              </div>
              <button className="px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

