"use client";

import { useState, useCallback, useRef } from "react";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/lib/SettingsContext";

interface HeartButtonProps {
  onHeart: () => void;
  totalHearts: number;
  isLocked?: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

export default function HeartButton({ onHeart, totalHearts, isLocked = false }: HeartButtonProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const nextId = useRef(0);
  const { t } = useSettings();

  const colors = [
    "#00f2ff",
    "#ff00e5",
    "#a855f7",
    "#f472b6",
    "#22d3ee",
    "#fb923c",
  ];

  const handleClick = useCallback(() => {
    onHeart();
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);

    // Generate one particle
    const newParticle: Particle = {
      id: nextId.current++,
      x: 0,
      y: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 24,
      rotation: 0,
    };

    setParticles((prev) => [...prev, newParticle]);

    // Remove particle after animation
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
    }, 1200);
  }, [onHeart]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Particle container */}
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          <AnimatePresence>
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                initial={{
                  x: "-50%",
                  y: "-50%",
                  opacity: 0,
                  scale: 0.5,
                }}
                animate={{
                  y: -150,
                  opacity: [0, 1, 1, 0],
                  scale: [0.5, 1.2, 1.5],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2"
                style={{ color: particle.color }}
              >
                <Heart
                  fill="currentColor"
                  className="drop-shadow-[0_0_10px_currentColor]"
                  style={{ width: particle.size, height: particle.size }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Heart button */}
        <motion.button
          onClick={handleClick}
          whileTap={{ scale: 0.85 }}
          className={`
            relative w-16 h-16 sm:w-20 sm:h-20 rounded-full
            flex items-center justify-center cursor-pointer
            transition-all duration-200
            ${isLocked ? "grayscale opacity-60" : ""}
            ${isPressed ? "bg-neon-pink/30" : "bg-neon-pink/10"}
            border-2 border-neon-pink/50
            hover:border-neon-pink hover:bg-neon-pink/20
            active:bg-neon-pink/30
            group
          `}
          style={{
            boxShadow: isPressed && !isLocked
              ? "0 0 30px rgba(255, 0, 229, 0.6), 0 0 60px rgba(255, 0, 229, 0.3)"
              : isLocked ? "none" : "0 0 15px rgba(255, 0, 229, 0.3)",
          }}
          aria-label={t("応援ハートを送る", "Send a cheer heart")}
        >
          <Heart
            className={`w-8 h-8 sm:w-10 sm:h-10 transition-transform ${
              isLocked ? "text-foreground/40" : "text-neon-pink"
            } ${
              isPressed ? "scale-125" : "group-hover:scale-110"
            }`}
            fill={isPressed ? "currentColor" : "none"}
            strokeWidth={2}
          />
        </motion.button>
      </div>

      {/* Heart count */}
      <div className="text-center">
        <p className={`font-[var(--font-orbitron)] text-lg sm:text-xl font-bold ${isLocked ? "text-foreground/40" : "neon-text-pink"}`}>
          {totalHearts.toLocaleString()}
        </p>
        <p className="text-[10px] text-foreground/50 tracking-wider">
          HEARTS
        </p>
      </div>
    </div>
  );
}
