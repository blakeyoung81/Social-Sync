import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface ProcessingSettings {
  cutSilences: boolean;
  cutBadTakes: boolean;
  removeFiller: boolean;
  addSmartCaptions: boolean;
  likeSubscribeButton: boolean;
  jumpCutZoom: boolean;
  enhanceAudio: boolean;
  aiBackground: boolean;
  savedAt: string;
  version: string;
}

const SETTINGS_FILE = path.join(process.cwd(), '..', 'config', 'processing_settings.json');

export async function POST(request: NextRequest) {
  try {
    const settings: Omit<ProcessingSettings, 'savedAt' | 'version'> = await request.json();

    const settingsWithMeta: ProcessingSettings = {
      ...settings,
      savedAt: new Date().toISOString(),
      version: '1.0'
    };

    // Ensure config directory exists
    const configDir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Save settings to file
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsWithMeta, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Processing settings saved successfully',
      settings: settingsWithMeta
    });

  } catch (error) {
    console.error('Error saving processing settings:', error);
    return NextResponse.json(
      { error: 'Failed to save processing settings' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      // Return default settings if file doesn't exist
      const defaultSettings: ProcessingSettings = {
        cutSilences: true,
        cutBadTakes: true,
        removeFiller: true,
        addSmartCaptions: true,
        likeSubscribeButton: true,
        jumpCutZoom: false,
        enhanceAudio: false,
        aiBackground: false,
        savedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      return NextResponse.json({
        success: true,
        settings: defaultSettings,
        isDefault: true
      });
    }

    const settingsData = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const settings: ProcessingSettings = JSON.parse(settingsData);

    return NextResponse.json({
      success: true,
      settings,
      isDefault: false
    });

  } catch (error) {
    console.error('Error loading processing settings:', error);
    return NextResponse.json(
      { error: 'Failed to load processing settings' },
      { status: 500 }
    );
  }
} 