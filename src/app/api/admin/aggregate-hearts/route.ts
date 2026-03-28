import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. global_statsの現在の値を取得
    const { data: stats, error: statsError } = await supabase
      .from('global_stats')
      .select('total_hearts, next_draw_time, last_aggregated_hearts')
      .eq('id', 1)
      .single();

    if (statsError) throw statsError;

    const totalHearts = stats.total_hearts || 0;
    const lastAggregated = stats.last_aggregated_hearts || 0;
    const diff = totalHearts - lastAggregated;

    if (diff <= 0) {
      return NextResponse.json({
        success: true,
        message: 'No new hearts to aggregate.',
        diff: 0
      });
    }

    // 1回 = 1秒短縮
    const reductionSeconds = diff;
    const currentNextTime = new Date(stats.next_draw_time).getTime();
    
    // next_draw_time を削減秒数だけ早める
    const newNextDrawTime = new Date(currentNextTime - reductionSeconds * 1000).toISOString();
    // 経過記録としての総時間短縮（分）も再計算しておく（UI表示用などがあれば）
    const totalReductionMinutes = Math.floor(totalHearts / 60);

    // 2. global_statsを更新
    const { error: statsUpdateError } = await supabase
      .from('global_stats')
      .update({
        next_draw_time: newNextDrawTime,
        last_aggregated_hearts: totalHearts,
        time_reduction_minutes: totalReductionMinutes
      })
      .eq('id', 1);

    if (statsUpdateError) throw statsUpdateError;

    return NextResponse.json({
      success: true,
      message: `Successfully aggregated ${diff} hearts and reduced nextDrawTime by ${diff} seconds.`,
      diff,
      newNextDrawTime
    });

  } catch (error: any) {
    console.error('Error aggregating hearts:', error);
    return NextResponse.json(
      { error: 'Failed to aggregate heart counts', details: error.message },
      { status: 500 }
    );
  }
}
