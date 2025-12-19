'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { UploadCloud, Scissors, FileVideo, LayoutDashboard, User, LogOut } from 'lucide-react';

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
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                    ? 'bg-blue-600/10 text-blue-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
        >
            <Icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-white'}`} />
            <span className="font-medium">{label}</span>
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
        <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-50">
            <div className="p-6 border-b border-gray-800">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Image 
                        src="/social-sync-logo.png" 
                        alt="Social Sync Logo" 
                        width={40}
                        height={40}
                        className="h-10 w-auto"
                        priority
                    />
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Social Sync
                    </h1>
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-2">
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

            <div className="p-4 border-t border-gray-800 space-y-2">
                {session ? (
                    <>
                        <Link
                            href="/dashboard"
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                                pathname === '/dashboard'
                                    ? 'bg-blue-600/10 text-blue-500'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                        >
                            <User className={`w-5 h-5 ${pathname === '/dashboard' ? 'text-blue-500' : 'text-gray-400 group-hover:text-white'}`} />
                            <span className="font-medium">My Account</span>
                        </Link>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-gray-400 hover:text-white hover:bg-gray-800"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Sign Out</span>
                        </button>
                    </>
                ) : (
                    <Link
                        href="/login"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group text-gray-400 hover:text-white hover:bg-gray-800"
                    >
                        <User className="w-5 h-5 text-gray-400 group-hover:text-white" />
                        <span className="font-medium">Sign In</span>
                    </Link>
                )}
            </div>
        </aside>
    );
};
