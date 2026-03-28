-- roulette_history テーブルの不要なカラム（total_hearts, chorus_start）を削除
ALTER TABLE public.roulette_history DROP COLUMN IF EXISTS total_hearts;
ALTER TABLE public.roulette_history DROP COLUMN IF EXISTS chorus_start;

COMMENT ON TABLE public.roulette_history IS 'Vtuber Roulette History (Cleanup: total_hearts and chorus_start removed)';
