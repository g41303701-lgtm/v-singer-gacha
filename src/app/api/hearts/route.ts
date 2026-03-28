import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 実際はキャッシュさせず、POSTリクエストのたびに確実にデクリメント・データベース更新を行います
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. global_statsの更新（total_heartsのみカウントアップ、ただし3時間前からは無効）
    const { data: stats, error: statsError } = await supabase
      .from('global_stats')
      .select('total_hearts, next_draw_time')
      .eq('id', 1)
      .single();

    if (statsError) throw statsError;

    // 3時間を切っているかチェック (3時間 = 10,800,000ミリ秒)
    const nextDrawTime = new Date(stats.next_draw_time).getTime();
    const now = Date.now();
    const isLocked = nextDrawTime - now < 3 * 60 * 60 * 1000;

    if (isLocked) {
      // 3時間を切っている場合はカウントを増やさず、現在の値をそのまま返す
      return NextResponse.json({
        success: true,
        globalHearts: stats.total_hearts,
        locked: true
      });
    }

    const newGlobalHearts = stats.total_hearts + 1;

    const { error: statsUpdateError } = await supabase
      .from('global_stats')
      .update({ total_hearts: newGlobalHearts })
      .eq('id', 1);

    if (statsUpdateError) throw statsUpdateError;

    // 最新の応援数のみを返し、時間操作はバッジ処理に任せる
    return NextResponse.json({
      success: true,
      globalHearts: newGlobalHearts,
    });

  } catch (error: any) {
    console.error('Error handling heart click:', error);
    return NextResponse.json(
      { error: 'Failed to update heart counts' },
      { status: 500 }
    );
  }
}
