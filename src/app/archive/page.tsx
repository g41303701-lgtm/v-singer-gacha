"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Music, Loader2, Mic2 } from "lucide-react";
import Header from "@/components/Header";
import type { ArchiveEntry, VtuberData } from "@/types";
import { useSettings } from "@/lib/SettingsContext";
import VtuberShowcase from "@/components/VtuberShowcase";

export default function ArchivePage() {
  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { t } = useSettings();

  useEffect(() => {
    async function fetchArchive() {
      try {
        setHasError(false);
        const res = await fetch("/api/roulette/history");
        if (!res.ok) throw new Error("Failed to fetch archive history");
        const data = await res.json();
        setArchive(data);
      } catch (err: any) {
        console.error(err);
        setHasError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchArchive();
  }, []); // Only on mount

  const filteredArchive = useMemo(() => {
    if (!searchQuery.trim()) return archive;
    const query = searchQuery.toLowerCase();
    return archive.filter(
      (entry) =>
        entry.vtuber.name.toLowerCase().includes(query) ||
        entry.drawDate.includes(query)
    );
  }, [archive, searchQuery]);

  return (
    <>
      <Header />

      <main className="relative z-10 pt-20 pb-16 px-4 sm:px-12 lg:px-24 min-h-screen">
        <div className="w-full flex flex-col items-center">
          {/* Title Area */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 w-full"
          >
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 font-[var(--font-orbitron)] tracking-wider">
              <span className="neon-text-blue">ARCHIVE</span>
            </h1>
            <p className="text-sm text-foreground/50 tracking-widest">
              {t('過去に出会った歌ウマVtuber', "V-singers you've previously met")}
            </p>
          </motion.div>

          {/* Search Area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-md mx-auto mb-12"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <input
                type="text"
                placeholder={t("名前で検索...", "Search by name...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl glass
                  border border-foreground/10 focus:border-neon-blue/50
                  text-sm text-foreground placeholder-foreground/30
                  outline-none transition-all duration-300
                  focus:shadow-[0_0_15px_rgba(0,242,255,0.15)]"
                id="archive-search"
                disabled={loading}
              />
            </div>
          </motion.div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-neon-blue animate-spin" />
            </div>
          )}

          {!loading && hasError && (
            <div className="w-full glass p-8 rounded-2xl neon-border-pink text-center max-w-lg">
              <p className="text-neon-pink mb-2 font-bold">ERROR</p>
              <p className="text-foreground/70 text-sm">
                {t("アーカイブデータの取得に失敗しました。", "Failed to fetch archive data.")}
              </p>
            </div>
          )}

          {/* Archive Grid */}
          {!loading && !hasError && (
            <div className="flex flex-col gap-6 w-full max-w-6xl">
              <AnimatePresence mode="popLayout">
                {filteredArchive.map((entry) => (
                  <CollapsibleArchiveCard
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedId === entry.id}
                    onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {!loading && !hasError && filteredArchive.length === 0 && archive.length > 0 && (
            <div className="text-center py-20 w-full">
              <Music className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
              <p className="text-foreground/40">
                {t('該当する結果がありません', 'No matching results found')}
              </p>
            </div>
          )}
          
          {!loading && !hasError && archive.length === 0 && (
            <div className="text-center py-20 w-full glass rounded-xl border border-foreground/10 max-w-lg">
              <Mic2 className="w-12 h-12 text-neon-blue/40 mx-auto mb-4" />
              <p className="text-foreground/60 mb-2">
                {t('まだアーカイブがありません。', 'No archives yet.')}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function CollapsibleArchiveCard({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: ArchiveEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [details, setDetails] = useState<VtuberData | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useSettings();

  useEffect(() => {
    if (isExpanded && !details && !loading) {
      setLoading(true);
      fetch(`/api/archive/${entry.id}`)
        .then(res => res.json())
        .then(data => {
          setDetails(data.vtuber);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch details:", err);
          setLoading(false);
        });
    }
  }, [isExpanded, details, loading, entry.id]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`w-full glass rounded-2xl overflow-hidden border transition-all duration-500
        ${isExpanded 
          ? "border-neon-blue/40 shadow-[0_0_30px_rgba(0,242,255,0.1)] mb-4" 
          : "border-foreground/5 hover:border-neon-blue/20 mb-2"
        }`}
    >
      {/* Summary Header (Always Visible) */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-6 text-left group"
      >
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-foreground/10 group-hover:border-neon-blue/40 transition-colors flex-shrink-0">
            {entry.vtuber.channelIcon ? (
              <img src={entry.vtuber.channelIcon} alt={entry.vtuber.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-foreground/5 flex items-center justify-center">
                <Mic2 className="w-6 h-6 text-foreground/20" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold group-hover:text-neon-blue transition-colors truncate">
              {entry.vtuber.name}
            </h3>
            <p className="text-xs text-foreground/40 mt-1 font-[var(--font-orbitron)]">
              {entry.drawDate}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 ml-4">
           {isExpanded ? (
             <div className="text-neon-blue text-xs uppercase tracking-widest font-[var(--font-orbitron)] animate-pulse">
               {t('表示中', 'OPEN')}
             </div>
           ) : (
             <div className="w-8 h-8 rounded-full border border-foreground/10 flex items-center justify-center group-hover:border-neon-blue/40 group-hover:bg-neon-blue/5 transition-all">
                <span className="text-lg text-foreground/40 group-hover:text-neon-blue">+</span>
             </div>
           )}
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden bg-black/20"
          >
            <div className="p-4 sm:p-10 border-t border-foreground/5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-8 h-8 text-neon-blue animate-spin" />
                  <p className="text-xs text-neon-blue/50 tracking-widest font-[var(--font-orbitron)]">LOADING DATA...</p>
                </div>
              ) : details ? (
                <VtuberShowcase vtuber={details} isAutoPlay={true} />
              ) : (
                <div className="text-center py-10 text-red-400 text-sm">
                  {t('データの読み込みに失敗しました。', 'Failed to load details.')}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
