"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Music, Archive, Headphones, Volume2, VolumeX, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useSettings } from "@/lib/SettingsContext";

export default function Header() {
  const pathname = usePathname();
  const { lang, toggleLang, t, isMuted, volume, handleVolumeChange, toggleMute } = useSettings();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="w-full px-4 sm:px-12 lg:px-24">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Headphones className="w-8 h-8 text-neon-blue" />
              <Music className="w-4 h-4 text-neon-pink absolute -top-1 -right-1" />
            </motion.div>
            <div className="flex flex-col">
              <span className="font-[var(--font-orbitron)] text-sm font-bold tracking-wider neon-text-blue">
                V-SINGER
              </span>
              <span className="text-[10px] text-neon-pink font-medium tracking-widest">
                GACHA
              </span>
            </div>
          </Link>

          {/* Navigation + Controls */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Nav Links */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <NavLink href="/" isActive={pathname === "/"}>
                <Music className="w-4 h-4" />
                <span className="hidden sm:inline">{t('ガチャ', 'Gacha')}</span>
              </NavLink>
              <NavLink href="/archive" isActive={pathname === "/archive"}>
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline">{t('アーカイブ', 'Archive')}</span>
              </NavLink>
            </nav>

            {/* Divider */}
            <div className="h-6 w-px bg-foreground/10 mx-1 hidden sm:block" />

            {/* Volume Control */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg glass border border-foreground/10 hover:border-neon-pink/30 transition-all duration-300"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0
                  ? <VolumeX className="w-4 h-4 text-foreground/40" />
                  : <Volume2 className="w-4 h-4 text-neon-pink/70" />
                }
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 h-1 appearance-none bg-foreground/10 rounded-full cursor-pointer accent-neon-pink"
              />
              <span className="text-[10px] text-foreground/30 w-6 text-right tabular-nums hidden sm:inline">
                {isMuted ? 0 : volume}
              </span>
            </div>

            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg glass border border-foreground/10 hover:border-neon-blue/30 transition-all duration-300"
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-neon-blue/50" />
              <span className="text-[10px] font-[var(--font-orbitron)] tracking-wider">
                <span className={lang === 'ja' ? 'text-neon-blue' : 'text-foreground/30'}>JA</span>
                <span className="text-foreground/20 mx-0.5">/</span>
                <span className={lang === 'en' ? 'text-neon-blue' : 'text-foreground/30'}>EN</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`
        relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
        transition-all duration-300
        ${
          isActive
            ? "text-neon-blue neon-border-blue bg-neon-blue/5"
            : "text-foreground/60 hover:text-neon-blue hover:bg-neon-blue/5"
        }
      `}
    >
      {children}
      {isActive && (
        <motion.div
          layoutId="activeNav"
          className="absolute inset-0 rounded-lg neon-border-blue bg-neon-blue/5"
          style={{ zIndex: -1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </Link>
  );
}
