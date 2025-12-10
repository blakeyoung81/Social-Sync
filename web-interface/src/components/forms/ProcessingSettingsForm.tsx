import React from 'react';
import { Label } from '../ui/label';

interface ProcessingSettingsFormProps {
  processingSettings: {
    openaiKey: string;
    pexelsApiKey: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ProcessingSettingsForm({ 
  processingSettings, 
  handleInputChange 
}: ProcessingSettingsFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col space-y-2">
          <Label htmlFor="openaiKey">OpenAI API Key</Label>
          <input
            id="openaiKey"
            name="openaiKey"
            type="password"
            placeholder="sk-..."
            value={processingSettings.openaiKey}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="flex flex-col space-y-2">
          <Label htmlFor="pexelsApiKey">Pexels API Key</Label>
          <input
            id="pexelsApiKey"
            name="pexelsApiKey"
            type="password"
            placeholder="Your Pexels API Key"
            value={processingSettings.pexelsApiKey}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
} 