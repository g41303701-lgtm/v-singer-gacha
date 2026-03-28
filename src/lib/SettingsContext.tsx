"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface SettingsContextType {
  // Language
  lang: 'ja' | 'en';
  toggleLang: () => void;
  t: (ja: string, en: string) => string;
  // Volume
  volume: number;
  isMuted: boolean;
  effectiveVolume: number;
  setVolume: (v: number) => void;
  setIsMuted: (m: boolean) => void;
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleMute: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const STORAGE_KEY = "v_singer_settings";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<'ja' | 'en'>('ja');
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(true); // 初期反映はミュート（自動再生ブロック対策）
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { lang: sLang, volume: sVol } = JSON.parse(saved);
        if (sLang) setLang(sLang);
        if (typeof sVol === 'number') setVolume(sVol);
        // We purposefully do NOT restore isMuted to ensure the app starts muted on reload
      } catch (e) {
        console.error("Failed to parse settings:", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lang, volume, isMuted }));
  }, [lang, volume, isMuted, isInitialized]);

  const toggleLang = useCallback(() => {
    setLang(prev => prev === 'ja' ? 'en' : 'ja');
  }, []);

  const t = useCallback((ja: string, en: string) => {
    return lang === 'ja' ? ja : en;
  }, [lang]);

  const effectiveVolume = isMuted ? 0 : volume;

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    setIsMuted(newVol === 0);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const nextMuted = !prev;
      // If unmuting while volume is 0, bump it to 50 so it's audible
      if (!nextMuted && volume === 0) {
        setVolume(50);
      }
      return nextMuted;
    });
  }, [volume]);

  return (
    <SettingsContext.Provider value={{
      lang,
      toggleLang,
      t,
      volume,
      isMuted,
      effectiveVolume,
      setVolume,
      setIsMuted,
      handleVolumeChange,
      toggleMute,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
