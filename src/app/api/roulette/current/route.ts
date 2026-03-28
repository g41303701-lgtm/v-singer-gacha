import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapVtuberRow } from '@/lib/mappers';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
  try {
    // 1. 最新の公開済み履歴1件を取得 (is_published = true)
    const { data: history, error: historyError } = await supabase
      .from('roulette_history')
      .select(`
        *,
        vtubers (*)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (historyError) {
      if (historyError.code === 'PGRST116') {
        // 公開済みの履歴がない場合
        const { data: stats } = await supabase.from('global_stats').select('*').eq('id', 1).single();
        return NextResponse.json({ 
          currentVtuber: null, 
          nextDrawTime: stats?.next_draw_time || new Date().toISOString(),
          totalHearts: 0,
          timeReductionMinutes: 0
        });
      }
      throw historyError;
    }

    // 2. グローバル統計（次回更新時間、累計ハートなど）を取得
    const { data: stats, error: statsError } = await supabase
      .from('global_stats')
      .select('*')
      .eq('id', 1)
      .single();

    if (statsError) throw statsError;

    // 3. レスポンス形式に整形
    const vtuber = Array.isArray(history.vtubers) ? history.vtubers[0] : history.vtubers;
    const currentVtuber = mapVtuberRow(vtuber, history);

    return NextResponse.json({
      currentVtuber,
      nextDrawTime: stats.next_draw_time,
      totalHearts: stats.total_hearts,
      timeReductionMinutes: stats.time_reduction_minutes,
    });
  } catch (error: any) {
    console.error('Error fetching current roulette:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
