import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mapVtuberRow } from '@/lib/mappers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) throw new Error("ID is required");

    const { data: entry, error } = await supabase
      .from('roulette_history')
      .select(`
        id,
        draw_date,
        ai_introduction,
        ai_introduction_en,
        medley_data,
        vtubers (
          id,
          name,
          channel_id,
          channel_icon,
          description,
          subscriber_count
        )
      `)
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error) throw error;
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const vtuber = Array.isArray(entry.vtubers) ? entry.vtubers[0] : entry.vtubers;

    const formattedDetail = {
      id: entry.id,
      vtuber: mapVtuberRow(vtuber, entry),
      drawDate: entry.draw_date,
    };

    return NextResponse.json(formattedDetail);
  } catch (error: any) {
    console.error('Error fetching archive detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch archive detail' },
      { status: 500 }
    );
  }
}
