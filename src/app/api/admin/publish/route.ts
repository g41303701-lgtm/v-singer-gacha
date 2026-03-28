import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * 待機中の解析結果 (is_published = false) を1件取り出し、公開状態にする。
 */
export async function POST(request: Request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. 最も古い未公開スタックを取得
    const { data: queue, error: fetchError } = await supabase
      .from('roulette_history')
      .select('id, vtuber_id')
      .eq('is_published', false)
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) throw fetchError;
    if (!queue || queue.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No queued (unexposed) data found. Please run generate-next first.' 
      }, { status: 404 });
    }

    const target = queue[0];

    // 2. 公開状態 (is_published = true) に更新
    const today = new Date().toISOString().split('T')[0];
    const { error: updateError } = await supabase
      .from('roulette_history')
      .update({ 
        is_published: true,
        draw_date: today // 公開日を今日に設定
      })
      .eq('id', target.id);

    if (updateError) throw updateError;

    // 3. global_statsリセット (次の更新時間を24時間後に設定)
    // 3. global_statsリセット (次の更新時間を24時間後に設定)
    const nextDrawTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('global_stats')
      .update({
        next_draw_time: nextDrawTime,
        time_reduction_minutes: 0 
      })
      .eq('id', 1);

    console.log(`Successfully published entry ${target.id}.`);

    // 4. ストック補充フェーズ (Cloudflare Edge非対応のためスキップ)
    // 実際の補充は GitHub Actions (auto_replenish_stock.yml) が定期的または手動で行います
    let replenishmentLog = 'Replenishment skipped (Requires full Node.js environment, handled by GitHub Actions).';

    return NextResponse.json({
      success: true,
      message: `Entry published successfully. ${replenishmentLog}`,
      id: target.id
    });
  } catch (error: any) {
    console.error('Publish Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
