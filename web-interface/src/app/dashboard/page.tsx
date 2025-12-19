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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-30"></div>
                <img 
                  src="/social-sync-logo.png" 
                  alt="Social Sync Logo" 
                  className="h-16 w-auto relative z-10"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  Welcome back, {session.user?.name || session.user?.email?.split('@')[0]}!
                </h1>
                <p className="text-gray-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Manage your social media connections
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
              >
                Go to Editor
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold border border-gray-200"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Social Connections */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Connected Accounts</h2>
            <div className="text-sm text-gray-500">
              {connections.length} of {platforms.length} connected
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const connection = getConnectionStatus(platform.id);
              const Icon = platform.icon;
              const isConnected = !!connection;

              return (
                <div
                  key={platform.id}
                  className={`group relative border-2 rounded-2xl p-6 transition-all duration-300 overflow-hidden ${
                    isConnected
                      ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg shadow-green-500/10'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10'
                  }`}
                >
                  {isConnected && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  )}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${isConnected ? 'bg-green-100' : 'bg-gray-100'} transition-colors`}>
                          <Icon className={`w-6 h-6 ${platform.color}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{platform.name}</h3>
                          {isConnected && connection.platformUsername ? (
                            <p className="text-sm text-gray-600">@{connection.platformUsername}</p>
                          ) : (
                            <p className="text-sm text-gray-400">Not connected</p>
                          )}
                        </div>
                      </div>
                      {isConnected ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      ) : (
                        <XCircle className="w-6 h-6 text-gray-300" />
                      )}
                    </div>

                    {isConnected ? (
                      <button
                        onClick={() => disconnectPlatform(platform.id)}
                        className="w-full py-2.5 px-4 bg-red-500/10 text-red-700 rounded-xl hover:bg-red-500/20 transition-all font-semibold border border-red-200 hover:border-red-300"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => connectPlatform(platform.id)}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-4 px-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">{session.user?.email}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-4 px-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Settings className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Account Management</p>
                  <p className="text-sm text-gray-600">Manage your account preferences</p>
                </div>
              </div>
              <button className="px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-semibold hover:bg-blue-50 rounded-lg transition-colors">
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

