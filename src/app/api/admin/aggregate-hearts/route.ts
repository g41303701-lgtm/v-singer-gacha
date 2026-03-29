import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';
import { executePublishNextGacha } from '@/lib/publish-logic';

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
    const diff = Math.max(0, totalHearts - lastAggregated);

    // 1回 = 1秒短縮
    const currentNextTime = new Date(stats.next_draw_time).getTime();
    const newNextDrawTime = currentNextTime - diff * 1000;
    let published = false;

    // 時間が現在時刻を過ぎている（カウントダウン0）場合は、自動公開ロジックを直接叩く
    if (Date.now() >= newNextDrawTime) {
      console.log('Time is up! Triggering automatic publish from backend logic...');
      const publishRes = await executePublishNextGacha();
      
      if (publishRes.success) {
        published = true;
      } else {
        console.error('Auto publish failed:', publishRes.message);
      }
    }

    // 2. global_statsを更新
    const updateData: any = {
      last_aggregated_hearts: totalHearts,
      time_reduction_minutes: Math.floor(totalHearts / 60)
    };

    // 公開されなかった場合のみ、短縮された時間を上書き保存する
    // (公開された場合は publish API がすでに +24時間 をセットしているため触らない)
    if (!published && diff > 0) {
      updateData.next_draw_time = new Date(newNextDrawTime).toISOString();
    }

    const { error: statsUpdateError } = await supabase
      .from('global_stats')
      .update(updateData)
      .eq('id', 1);

    if (statsUpdateError) throw statsUpdateError;

    return NextResponse.json({
      success: true,
      message: published 
        ? `Time is up! Triggered publish for new gacha.`
        : (diff > 0 ? `Aggregated ${diff} hearts and reduced nextDrawTime.` : 'No new hearts, time not reached yet.'),
      diff,
      published
    });

  } catch (error: any) {
    console.error('Error aggregating hearts:', error);
    return NextResponse.json(
      { error: 'Failed to aggregate heart counts', details: error.message },
      { status: 500 }
    );
  }
}
