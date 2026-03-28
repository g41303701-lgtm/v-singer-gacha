import { supabase } from './supabase';

/**
 * 直近 N件 の roulette_history から vtuber_id のセットを取得する。
 * 候補選出時の重複回避ロジック（gacha_ops.ts の runAutoAnalysis / fallbackFromArchive）
 * で共通利用される。
 */
export async function getRecentVtuberIds(limit: number): Promise<Set<string>> {
  const { data: recentHistory } = await supabase
    .from('roulette_history')
    .select('vtuber_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  return new Set((recentHistory || []).map((h: any) => h.vtuber_id));
}
