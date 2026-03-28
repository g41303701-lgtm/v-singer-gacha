"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Sparkles, Loader2, Mic2 } from "lucide-react";
import Header from "@/components/Header";
import VtuberShowcase from "@/components/VtuberShowcase";
import CountdownTimer from "@/components/CountdownTimer";
import HeartButton from "@/components/HeartButton";
import type { RouletteState } from "@/types";
import { useSettings } from "@/lib/SettingsContext";

export default function Home() {
  const [rouletteState, setRouletteState] = useState<RouletteState | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const { t } = useSettings();

  // 初期データ取得
  useEffect(() => {
    async function fetchCurrent() {
      try {
        setHasError(false);
        const res = await fetch("/api/roulette/current");
        if (!res.ok) throw new Error("Failed to fetch current roulette data");
        const data = await res.json();
        setRouletteState(data);
        
        // もし既に時間が過ぎていたら完了状態にする
        const nextTime = new Date(data.nextDrawTime).getTime();
        if (nextTime <= Date.now()) {
          setIsFinished(true);
        }
      } catch (err: any) {
        console.error(err);
        setHasError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchCurrent();
  }, []); // Only on mount

  const nextDrawTimeMs = rouletteState?.nextDrawTime 
    ? new Date(rouletteState.nextDrawTime).getTime() 
    : 0;
  const isReductionLocked = nextDrawTimeMs - Date.now() < 3 * 60 * 60 * 1000;

  const handleHeart = useCallback(async () => {
    if (!rouletteState?.currentVtuber) return;

    // 1. Optimistic Update (1クリック＝1秒短縮、ただし3時間を切っている場合は増やさない)
    setRouletteState((prev) => {
      if (!prev) return prev;
      
      if (isReductionLocked) {
        // ロック中は何もしない
        return prev;
      }

      const newTotal = prev.totalHearts + 1;
      const currentNextTime = new Date(prev.nextDrawTime).getTime();
      const newNextDrawTime = new Date(currentNextTime - 1000).toISOString();

      return {
        ...prev,
        totalHearts: newTotal,
        nextDrawTime: newNextDrawTime,
      };
    });

    // 2. サーバーへ短縮リクエスト
    try {
      await fetch("/api/hearts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Failed to sync heart:", err);
    }
  }, [rouletteState, isReductionLocked]);

  const handleShare = () => {
    if (!rouletteState?.currentVtuber) return;
    const name = rouletteState.currentVtuber.name;
    const text = t(
      `🎤 今日の #歌ウマVtuberガチャ は「${name}」！\nみんなも聴いてみて！\n`,
      `🎤 Today's #歌ウマVtuberガチャ is "${name}"!\nYou've got to hear this voice!\n`
    );
    const url = typeof window !== "undefined" ? window.location.href : "";
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  return (
    <>
      <Header />

      <main className="relative z-10 pt-20 pb-32 px-4 sm:px-12 lg:px-24 min-h-screen flex flex-col">
        <div className="w-full flex-1 flex flex-col items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <Loader2 className="w-12 h-12 text-neon-blue animate-spin" />
              <p className="text-neon-blue/80 font-[var(--font-orbitron)] tracking-widest animate-pulse">
                INITIALIZING...
              </p>
            </div>
          )}

          {!loading && hasError && (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="glass p-8 rounded-2xl neon-border-pink text-center">
                <p className="text-neon-pink mb-2 font-bold">ERROR</p>
                <p className="text-foreground/70 text-sm">
                  {t("データの読み込みに失敗しました。", "Failed to load data.")}
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-6 px-6 py-2 rounded-full border border-neon-pink/50 text-neon-pink text-sm hover:bg-neon-pink/10 transition-colors"
                >
                  {t('リトライ', 'RETRY')}
                </button>
              </div>
            </div>
          )}

          {!loading && !hasError && (!rouletteState || !rouletteState.currentVtuber) && (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="glass p-8 rounded-2xl neon-border-blue text-center">
                <Sparkles className="w-10 h-10 text-neon-blue mx-auto mb-4 animate-pulse" />
                <p className="text-foreground/70 text-sm mb-4">
                  {t(
                    'まだ本日のガチャ（Vtuber）が生成されていません。\n管理者APIを実行してデータを生成してください。',
                    'Today\'s gacha (Vtuber) has not been generated yet.\nPlease run the admin API to generate data.'
                  )}
                </p>
              </div>
            </div>
          )}

          {!loading && !hasError && rouletteState && rouletteState.currentVtuber && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col relative"
            >
              {/* Main Content: Vtuber Showcase */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full"
              >
                <VtuberShowcase vtuber={rouletteState.currentVtuber} onShare={handleShare} isAutoPlay={true} />
              </motion.div>

              {/* Bottom Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 mt-12 w-full pt-8 border-t border-foreground/5 relative z-10">
                <AnimatePresence mode="wait">
                  {isFinished ? (
                    <motion.div
                      key="refresh-prompt"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-4 py-4"
                    >
                      <div className="px-6 py-2 rounded-full glass border border-neon-blue/30 bg-neon-blue/5">
                        <p className="text-neon-blue text-sm font-bold tracking-widest animate-pulse">
                          {t('新しいVtuberが到着しました！', 'NEW VTUBER HAS ARRIVED!')}
                        </p>
                      </div>
                      <button
                        onClick={() => window.location.reload()}
                        className="group relative px-8 py-3 rounded-xl bg-neon-blue text-background font-bold text-sm overflow-hidden transition-all hover:scale-105 active:scale-95"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                           <Sparkles className="w-4 h-4" />
                           {t('ガチャを更新する', 'RELOAD GACHA')}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="timer-controls"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-row items-center justify-center gap-6 sm:gap-12"
                    >
                      <CountdownTimer
                        targetTime={rouletteState.nextDrawTime}
                        reductionMinutes={0}
                        onFinished={() => setIsFinished(true)}
                      />

                      <div className="flex items-center">
                        <HeartButton
                          onHeart={handleHeart}
                          totalHearts={rouletteState.totalHearts}
                          isLocked={isReductionLocked}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </>
  );
}
