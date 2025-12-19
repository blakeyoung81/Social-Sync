'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UploadCloud, Scissors, FileVideo, LayoutDashboard } from 'lucide-react';

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
            <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Social Sync
                </h1>
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

            <div className="p-4 border-t border-gray-800">
                <div className="px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                    <p className="text-xs text-gray-500 mb-1">Current Workspace</p>
                    <p className="text-sm font-medium text-gray-300">Default Project</p>
                </div>
            </div>
        </aside>
    );
};
