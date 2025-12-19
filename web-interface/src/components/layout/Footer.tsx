'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, FileText, Trash2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-800 bg-gray-900/50 mt-auto">
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <span>© {new Date().getFullYear()} Social Sync. All rights reserved.</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-6">
            <Link 
              href="/privacy-policy" 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <Shield className="w-4 h-4" />
              Privacy Policy
            </Link>
            
            <Link 
              href="/terms-of-service" 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <FileText className="w-4 h-4" />
              Terms of Service
            </Link>
            
            <Link 
              href="/data-deletion" 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
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

