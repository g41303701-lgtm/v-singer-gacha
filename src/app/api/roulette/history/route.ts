import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapVtuberRow } from '@/lib/mappers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // 過去の排出履歴をvtubersテーブルと結合して取得
    const { data: history, error: historyError } = await supabase
      .from('roulette_history')
      .select(`
        id,
        draw_date,
        vtubers (
          id,
          name,
          channel_id,
          channel_icon,
          description,
          subscriber_count
        )
      `)
      .eq('is_published', true)
      .order('draw_date', { ascending: false })
      .limit(limit);

    if (historyError) throw historyError;

    // 重複排除ロジック: vtuber_id をキーにして最新の1件のみ残す
    const uniqueHistory: any[] = [];
    const seenVtuberIds = new Set<string>();

    for (const entry of (history || [])) {
      const vtuber = Array.isArray(entry.vtubers) ? entry.vtubers[0] : entry.vtubers;
      const vId = vtuber?.id;
      if (vId && !seenVtuberIds.has(vId)) {
        uniqueHistory.push({ ...entry, vtuber });
        seenVtuberIds.add(vId);
      }
    }

    // クライアントで扱うArchiveEntryの形式にマッピング
    const formattedHistory = uniqueHistory.map((entry: any) => ({
      id: entry.id,
      vtuber: mapVtuberRow(entry.vtuber, { draw_date: entry.draw_date }),
      drawDate: entry.draw_date,
    }));

    return NextResponse.json(formattedHistory);
  } catch (error: any) {
    console.error('Error fetching roulette history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch archive history' },
      { status: 500 }
    );
  }
}
