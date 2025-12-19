'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { UploadCloud, Scissors, FileVideo, User, LogOut } from 'lucide-react';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    href: string;
    isActive: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, href, isActive }) => {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                isActive
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent hover:border-gray-700/50'
            }`}
        >
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full"></div>
            )}
            <Icon className={`w-5 h-5 transition-colors relative z-10 ${isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'}`} />
            <span className="font-semibold relative z-10">{label}</span>
        </Link>
    );
};

export const Sidebar: React.FC = () => {
    const pathname = usePathname();
    const { data: session } = useSession();

    const navItems = [
        {
            label: 'Batch Uploader',
            href: '/',
            icon: UploadCloud,
        },
        {
            label: 'Long to Short',
            href: '/converter',
            icon: Scissors,
        },
        {
            label: 'Video Editor',
            href: '/editor',
            icon: FileVideo,
        },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-r border-gray-800/50 flex flex-col z-50 shadow-2xl backdrop-blur-xl">
            {/* Logo Section */}
            <div className="p-6 border-b border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-800/30">
                <Link href="/" className="flex items-center gap-3 group hover:opacity-90 transition-all">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                        <img 
                            src="/social-sync-logo.png" 
                            alt="Social Sync Logo" 
                            className="h-10 w-auto relative z-10"
                        />
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-purple-200">
                        Social Sync
                    </h1>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <SidebarItem
                        key={item.href}
                        icon={item.icon}
                        label={item.label}
                        href={item.href}
                        isActive={pathname === item.href}
                    />
                ))}
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-gray-800/50 bg-gradient-to-t from-gray-900/50 to-transparent space-y-2">
                {session ? (
                    <>
                        <Link
                            href="/dashboard"
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                                pathname === '/dashboard'
                                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent hover:border-gray-700/50'
                            }`}
                        >
                            <User className={`w-5 h-5 transition-colors ${pathname === '/dashboard' ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'}`} />
                            <span className="font-semibold">My Account</span>
                        </Link>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-semibold">Sign Out</span>
                        </button>
                    </>
                ) : (
                    <Link
                        href="/login"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent hover:border-gray-700/50"
                    >
                        <User className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                        <span className="font-semibold">Sign In</span>
                    </Link>
                )}
            </div>
        </aside>
    );
};
