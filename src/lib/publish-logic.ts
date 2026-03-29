import { supabaseAdmin as supabase } from '@/lib/supabase';

/**
 * 待機中の解析結果 (is_published = false) を1件取り出し、公開状態にするロジック。
 * 内部システム（APIルート等）から直接呼び出すための共通関数です。
 * 
 * @returns {success: boolean, message: string, id?: number}
 */
export async function executePublishNextGacha(): Promise<{ success: boolean; message: string; id?: number }> {
  try {
    // 1. 最も古い未公開スタックを取得
    const { data: queue, error: fetchError } = await supabase
      .from('roulette_history')
      .select('id, vtuber_id')
      .eq('is_published', false)
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) throw fetchError;
    
    if (!queue || queue.length === 0) {
      return { 
        success: false, 
        message: 'No queued (unexposed) data found. Please run generate-next first.' 
      };
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
    const nextDrawTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('global_stats')
      .update({
        next_draw_time: nextDrawTime,
        time_reduction_minutes: 0 
      })
      .eq('id', 1);

    console.log(`[Publish Logic] Successfully published entry ${target.id}.`);

    return {
      success: true,
      message: `Entry published successfully.`,
      id: target.id
    };
  } catch (error: any) {
    console.error('[Publish Logic] Error:', error);
    return { success: false, message: error.message };
  }
}
