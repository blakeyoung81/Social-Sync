'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, FileText, Trash2 } from 'lucide-react';

export const Footer: React.FC = () => {
  const pathname = usePathname();
  
  // Don't show footer on login/signup pages
  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <footer className="border-t border-gray-800/50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-300 mt-auto backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-8 py-6 ml-64">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img 
              src="/social-sync-logo.png" 
              alt="Social Sync Logo" 
              className="h-6 w-auto opacity-80"
            />
            <span className="text-sm">© {new Date().getFullYear()} Social Sync. All rights reserved.</span>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-6">
            <Link 
              href="/privacy-policy" 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm hover:underline decoration-2 underline-offset-2"
            >
              <Shield className="w-4 h-4" />
              Privacy Policy
            </Link>
            
            <Link 
              href="/terms-of-service" 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm hover:underline decoration-2 underline-offset-2"
            >
              <FileText className="w-4 h-4" />
              Terms of Service
            </Link>
            
            <Link 
              href="/data-deletion" 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm hover:underline decoration-2 underline-offset-2"
            >
              <Trash2 className="w-4 h-4" />
              Data Deletion
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

