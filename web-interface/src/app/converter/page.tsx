'use client';

import React from 'react';
import { Scissors, Upload, Zap } from 'lucide-react';

export default function ConverterPage() {
    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Long Form to Short Form
                </h1>
                <p className="text-gray-400">
                    Repurpose your long videos into engaging viral shorts using AI.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px] border-dashed hover:border-blue-500/50 transition-colors group cursor-pointer">
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-200">Upload Source Video</h3>
                    <p className="text-gray-500 text-center max-w-sm">
                        Drag and drop your long-form video here, or click to browse. Supported formats: MP4, MOV, MKV.
                    </p>
                </div>

                {/* Feature Preview */}
                <div className="space-y-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Scissors className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-200">Smart Clipping</h3>
                                <p className="text-sm text-gray-400">AI identifies the most engaging moments.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <Zap className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-200">Auto Captions</h3>
                                <p className="text-sm text-gray-400">Generate animated captions instantly.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800/20 rounded-xl p-6 text-center mt-8">
                        <p className="text-gray-500 text-sm">Select a video to unlock these features</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
