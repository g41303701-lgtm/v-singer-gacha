import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapVtuberRow } from '@/lib/mappers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. まずグローバル統計を取得し、現在時刻と比較（レイジー公開のトリガー）
    let { data: stats, error: statsError } = await supabase
      .from('global_stats')
      .select('*')
      .eq('id', 1)
      .single();

    if (statsError) throw statsError;

    // もし時間がゼロ（または過ぎている）なら、即座にpublishAPIを内部から叩く
    if (Date.now() >= new Date(stats.next_draw_time).getTime()) {
      console.log('⏰ current route: Time is up! Publishing instantly from access trigger.');
      const origin = new URL(request.url).origin;
      const publishRes = await fetch(`${origin}/api/admin/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (publishRes.ok) {
        // パブリッシュに成功した場合、新しい時間が入った統計を再取得する
        const { data: newStats } = await supabase.from('global_stats').select('*').eq('id', 1).single();
        if (newStats) stats = newStats;
      } else {
        console.error('Auto publish failed during access trigger:', await publishRes.text());
      }
    }

    // 2. 最新の公開済み履歴1件を取得 (必ず最新のpublishステータスを取得できる)
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
        return NextResponse.json({ 
          currentVtuber: null, 
          nextDrawTime: stats.next_draw_time,
          totalHearts: stats.total_hearts,
          timeReductionMinutes: stats.time_reduction_minutes
        });
      }
      throw historyError;
    }

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
