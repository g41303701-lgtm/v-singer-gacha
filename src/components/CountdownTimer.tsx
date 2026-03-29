"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/SettingsContext";

interface CountdownTimerProps {
  targetTime: string;
  reductionMinutes?: number;
  onFinished?: () => void;
  serverTimeOffset?: number;
}

export default function CountdownTimer({
  targetTime,
  reductionMinutes = 0,
  onFinished,
  serverTimeOffset = 0,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
  const { t } = useSettings();

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetTime).getTime() - reductionMinutes * 60 * 1000;
      const now = Date.now() + serverTimeOffset;
      const diff = Math.max(0, target - now);

      if (diff === 0 && onFinished) {
        onFinished();
      }

      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        totalMs: diff,
      };
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime, reductionMinutes, serverTimeOffset, onFinished]);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const isFinalPhase = timeLeft.totalMs < 3 * 60 * 60 * 1000;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className={`text-[10px] uppercase tracking-[0.3em] font-[var(--font-orbitron)] ${isFinalPhase ? "text-neon-pink animate-pulse" : "text-neon-blue/70"}`}>
        {isFinalPhase ? t('Final Countdown', 'Final Countdown') : t('Next Draw In', 'Next Draw In')}
      </p>
      <div className="flex items-center gap-1">
        <TimeSegment value={pad(timeLeft.hours)} label="HRS" colorClass={isFinalPhase ? "neon-text-pink" : "neon-text-blue"} />
        <Separator colorClass={isFinalPhase ? "neon-text-pink" : "neon-text-pink"} />
        <TimeSegment value={pad(timeLeft.minutes)} label="MIN" colorClass={isFinalPhase ? "neon-text-pink" : "neon-text-blue"} />
        <Separator colorClass={isFinalPhase ? "neon-text-pink" : "neon-text-pink"} />
        <TimeSegment value={pad(timeLeft.seconds)} label="SEC" colorClass={isFinalPhase ? "neon-text-pink" : "neon-text-blue"} />
      </div>
      
      {isFinalPhase ? (
        <p className="text-[10px] text-neon-pink/50 font-medium tracking-tight mt-1">
          {t('🔒 残り3時間を切ったため短縮ロック中', '🔒 Time locked (Final 3 Hours)')}
        </p>
      ) : reductionMinutes > 0 && (
        <p className="text-xs text-neon-pink animate-pulse">
          {t(
            `⚡ 応援で${reductionMinutes}分短縮済み！`,
            `⚡ Reduced by ${reductionMinutes} min via cheers!`
          )}
        </p>
      )}
    </div>
  );
}

function TimeSegment({ value, label, colorClass }: { value: string; label: string; colorClass: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="glass rounded-lg px-2 py-2 sm:px-3 sm:py-3 w-14 sm:w-20 flex justify-center items-center overflow-hidden">
        <span className={`text-2xl sm:text-4xl ${colorClass} font-[var(--font-orbitron)] tabular-nums tracking-tighter`}>
          {value}
        </span>
      </div>
      <span className="text-[9px] mt-1 text-foreground/40 font-[var(--font-orbitron)] tracking-widest uppercase">
        {label}
      </span>
    </div>
  );
}

function Separator({ colorClass }: { colorClass: string }) {
  return (
    <span className={`timer-segment text-2xl sm:text-4xl ${colorClass} self-start mt-2 sm:mt-3 mx-0.5`}>
      :
    </span>
  );
}
