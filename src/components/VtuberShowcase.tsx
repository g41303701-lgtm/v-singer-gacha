"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Mic2, Music, VolumeX, ExternalLink, Play } from "lucide-react";
import TypewriterText from "@/components/TypewriterText";
import MedleySpectrum from "@/components/MedleySpectrum";
import type { VtuberData } from "@/types";
import { useSettings } from "@/lib/SettingsContext";

interface VtuberShowcaseProps {
  vtuber: VtuberData;
  onShare?: () => void;
  isAutoPlay?: boolean;
}

const CACHE = new Map<string, ArrayBuffer>();

export default function VtuberShowcase({ vtuber, onShare, isAutoPlay = true }: VtuberShowcaseProps) {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const { lang, effectiveVolume, isMuted, t } = useSettings();
  
  // Memoize introduction to prevent flickering unless data or language actually changes
  const displayedIntroduction = useMemo(() => {
    return (lang === 'en' && vtuber.aiIntroductionEn
      ? vtuber.aiIntroductionEn
      : vtuber.aiIntroduction) || "";
  }, [lang, vtuber.aiIntroduction, vtuber.aiIntroductionEn]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);

  // CRITICAL: Memoize medleySongs to prevent resetting the entire audio chain on re-render (e.g. language toggle)
  const medleySongs = useMemo(() => vtuber.medleyData || [], [vtuber.medleyData]);

  const initAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      const masterGain = ctx.createGain();
      // Apply initial volume immediately
      masterGain.gain.setValueAtTime(effectiveVolume / 100, ctx.currentTime);
      
      analyser.connect(masterGain);
      masterGain.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      masterGainRef.current = masterGain;
      
      setAnalyserNode(analyser);
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }, []);

  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        effectiveVolume / 100, 
        audioCtxRef.current.currentTime, 
        0.1
      );
      if (audioCtxRef.current.state === "suspended" && effectiveVolume > 0) {
        audioCtxRef.current.resume().catch(console.error);
      }
    }
  }, [effectiveVolume]);

  const fetchAndDecode = async (url: string, ctx: AudioContext): Promise<AudioBuffer> => {
    let arrayBuffer: ArrayBuffer;
    if (CACHE.has(url)) {
      arrayBuffer = CACHE.get(url)!.slice(0);
    } else {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch audio");
      const buffer = await res.arrayBuffer();
      CACHE.set(url, buffer);
      arrayBuffer = buffer.slice(0);
    }
    return await ctx.decodeAudioData(arrayBuffer);
  };

  const playMedley = useCallback(async () => {
    try {
      if (medleySongs.length === 0) return;

      const audioUrl = medleySongs[0]?.audioUrl;
      if (!audioUrl) throw new Error("Audio URL is missing");

      initAudioCtx();
      const ctx = audioCtxRef.current!;
      const buffer = await fetchAndDecode(audioUrl, ctx);

      if (audioCtxRef.current !== ctx) {
        return;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(analyserRef.current!);

      const now = ctx.currentTime;
      source.start(now);
      currentSourceRef.current = source;
      startTimeRef.current = now;

      source.onended = () => {
        if (audioCtxRef.current && currentSourceRef.current === source) {
          playMedley();
        }
      };

      setIsPlaying(true);
      setHasError(false);
    } catch (err) {
      console.error("Failed to play medley audio:", err);
      setHasError(true);
      setIsPlaying(false);
    }
  }, [medleySongs, initAudioCtx]);

  useEffect(() => {
    if (isAutoPlay) {
      playMedley();
    }
    return () => {
      if (currentSourceRef.current) {
        currentSourceRef.current.stop();
        currentSourceRef.current.disconnect();
        currentSourceRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(console.error);
        audioCtxRef.current = null;
      }
    };
  }, [playMedley, isAutoPlay]);

  useEffect(() => {
    if (!isPlaying || medleySongs.length === 0) return;
    let animId: number;

    const checkTime = () => {
      if (audioCtxRef.current && currentSourceRef.current) {
         const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
         let accumulated = 0;
         let newIndex = 0;

         for (let i = 0; i < medleySongs.length; i++) {
           const song = medleySongs[i];
           const dur = song.chorusEnd - song.chorusStart;
           accumulated += dur;
           if (i < medleySongs.length - 1) accumulated -= 1.5; 
           
           if (elapsed < accumulated) {
             newIndex = i;
             break;
           }
         }
         
         newIndex = Math.min(newIndex, medleySongs.length - 1);
         setCurrentSongIndex((prev) => {
           if (prev !== newIndex) return newIndex;
           return prev;
         });
      }
      animId = requestAnimationFrame(checkTime);
    };

    animId = requestAnimationFrame(checkTime);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, medleySongs]);

  return (
    <div
      className="w-full flex flex-col items-center justify-center mx-auto"
      onClick={() => {
        if (audioCtxRef.current?.state === "suspended") {
          audioCtxRef.current.resume();
        }
      }}
    >
      <div className="relative w-full flex flex-col lg:flex-row items-center lg:items-start lg:justify-center gap-8 lg:gap-24 select-none pt-4">
        {/* 1. Left Column: Icon & Medley Title */}
        <div className="flex flex-col items-center flex-shrink-0 z-10 w-full lg:w-[400px] pt-10">
          <div className="relative flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 mb-20 lg:mb-24">
            <div className="absolute inset-[-80px] sm:inset-[-110px] pointer-events-none z-0">
              <MedleySpectrum analyserNode={analyserNode} isMuted={isMuted} />
            </div>

            <div className="absolute inset-[-12px] rounded-full bg-gradient-to-br from-neon-blue/20 to-neon-pink/20 blur-2xl animate-pulse z-0" />
            
            <motion.div
              className="relative w-full h-full rounded-full overflow-hidden animate-float animate-pulse-glow z-10"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-full h-full bg-background/80 backdrop-blur-sm flex items-center justify-center border-[3px] border-foreground/10 rounded-full overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                {vtuber.channelIcon ? (
                  <img src={vtuber.channelIcon} alt={vtuber.name} className="w-full h-full object-cover" />
                ) : (
                  <Mic2 className="w-16 h-16 sm:w-20 sm:h-20 text-neon-blue/60" />
                )}
              </div>
            </motion.div>
          </div>

          {medleySongs.length > 0 && !hasError && (
            <div className="flex items-center gap-2 w-full justify-center overflow-hidden h-6">
              <Music className={`w-4 h-4 shrink-0 ${isPlaying ? 'text-neon-pink animate-pulse' : 'text-neon-pink/50'}`} />
              <div className="text-xs sm:text-sm font-medium text-foreground/90 truncate flex items-center gap-2 max-w-[85%]">
                <AnimatePresence mode="wait">
                  <motion.span 
                    key={currentSongIndex} 
                    initial={{ opacity: 0, x: 10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -10 }} 
                    transition={{ duration: 0.2 }}
                    className="truncate block"
                  >
                    {medleySongs[currentSongIndex].videoTitle}
                  </motion.span>
                </AnimatePresence>
                <span className="text-[10px] font-[var(--font-orbitron)] text-neon-pink/70 shrink-0">
                  [{currentSongIndex + 1}/{medleySongs.length}]
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Right Column: Name & Intro */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left flex-1 min-w-0 z-10 pt-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3 }} 
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4"
          >
            <span className="neon-text-blue">{vtuber.name}</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 flex justify-center lg:justify-start"
          >
            <a 
              href={`https://www.youtube.com/channel/${vtuber.channelId}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/30 bg-red-500/10 text-sm sm:text-base text-red-400 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 transition-all font-[var(--font-orbitron)] group shadow-[0_0_15px_rgba(255,0,0,0.1)] hover:shadow-[0_0_25px_rgba(255,0,0,0.25)]"
            >
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform fill-current" />
              <span className="font-bold tracking-wide">{t('YouTubeチャンネル', 'YouTube Channel')}</span>
              <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
            </a>
          </motion.div>

          <div className="w-full mb-8">
            <div className="flex items-center gap-2 mb-4 lg:justify-start justify-center">
              <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
              <span className="text-xs font-[var(--font-orbitron)] text-neon-blue/70 tracking-widest uppercase">AI Medley Analysis</span>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={lang} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <div className="text-sm sm:text-base text-foreground/80 leading-relaxed font-medium">
                  <TypewriterText text={displayedIntroduction} speed={30} delay={lang === 'ja' ? 1200 : 200} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {onShare && (
            <button
              onClick={onShare}
              className="flex items-center justify-center gap-3 px-6 py-3 rounded-full glass
                border border-neon-blue/20 hover:border-neon-pink/40 hover:bg-neon-pink/10
                text-foreground hover:text-white
                transition-all duration-300 cursor-pointer group shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_30px_rgba(255,0,229,0.3)] hover:-translate-y-1"
            >
              <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform text-neon-pink" />
              <span className="font-semibold tracking-wide">{t('結果をシェアする', 'Share Result')}</span>
            </button>
          )}
        </div>

        {hasError && (
          <div className="absolute bottom-[-60px] lg:bottom-4 lg:right-4 w-full lg:w-auto max-w-md p-3 bg-black/60 backdrop-blur-md border border-red-500/30 rounded-xl flex items-start gap-4 text-left z-20">
            <VolumeX className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/70">
              {t('音声データの読み込みに失敗しました。', 'Failed to load audio.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
