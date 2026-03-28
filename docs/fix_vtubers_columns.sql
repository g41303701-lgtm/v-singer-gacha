-- vtubers テーブルの不足カラムを一括追加
-- エラー（既にある場合はスキップ）を回避しながら追加します

ALTER TABLE public.vtubers 
ADD COLUMN IF NOT EXISTS channel_icon text;

ALTER TABLE public.vtubers 
ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.vtubers 
ADD COLUMN IF NOT EXISTS subscriber_count integer;

ALTER TABLE public.vtubers 
ADD COLUMN IF NOT EXISTS is_candidate boolean DEFAULT true;

-- ついでに roulette_history の構成も再確認 (is_published)
ALTER TABLE public.roulette_history 
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

-- キャッシュの更新（PostgRESTが認識しやすくなるよう、明示的にコメント付与などでトリガー）
COMMENT ON TABLE public.vtubers IS 'Vtuber information for the roulette system';
