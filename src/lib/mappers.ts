import type { VtuberData } from '@/types';

/**
 * Supabase の vtubers テーブル行（snake_case）を
 * フロントエンド用の VtuberData 型（camelCase）にマッピングする。
 *
 * roulette_history との JOIN 結果にも対応しており、
 * historyRow を渡せば ai_introduction 等も含めて変換する。
 */
export function mapVtuberRow(
  vtuberRow: any,
  historyRow?: any
): VtuberData {
  return {
    id: vtuberRow.id,
    name: vtuberRow.name,
    channelId: vtuberRow.channel_id,
    channelIcon: vtuberRow.channel_icon,
    description: vtuberRow.description,
    subscriberCount: vtuberRow.subscriber_count ?? 0,
    // history 由来のフィールド（オプショナル）
    aiIntroduction: historyRow?.ai_introduction,
    aiIntroductionEn: historyRow?.ai_introduction_en ?? '',
    medleyData: historyRow?.medley_data,
    drawDate: historyRow?.draw_date,
  };
}
