-- roulette_history テーブルの不要なカラム（video_id, video_title）を削除
-- これらのデータは medley_data (JSONB) に統合されているため冗長です。

ALTER TABLE public.roulette_history DROP COLUMN IF EXISTS video_id;
ALTER TABLE public.roulette_history DROP COLUMN IF EXISTS video_title;

-- PostgRESTのキャッシュ更新用
COMMENT ON TABLE public.roulette_history IS 'Vtuber Roulette History (Cleanup: video_id and video_title removed)';
