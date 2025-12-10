// Centralized API key management
export class APIKeyManager {
  private static readonly STORAGE_KEY = 'openaiApiKey';

  static get(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(this.STORAGE_KEY) || '';
  }

  static set(apiKey: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, apiKey);
  }

  static clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static isValid(apiKey: string): boolean {
    return apiKey.startsWith('sk-') && apiKey.length > 20;
  }
}

// React hook for API key management
import { useState, useEffect } from 'react';

export const useAPIKey = () => {
  const [apiKey, setApiKeyState] = useState<string>('');

  useEffect(() => {
    setApiKeyState(APIKeyManager.get());
  }, []);

  const setApiKey = (newApiKey: string) => {
    setApiKeyState(newApiKey);
    APIKeyManager.set(newApiKey);
  };

  return {
    apiKey,
    setApiKey,
    isValid: APIKeyManager.isValid(apiKey),
    clear: () => {
      setApiKeyState('');
      APIKeyManager.clear();
    }
  };
}; 