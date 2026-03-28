-- 1. vtubers テーブルへの候補フラグ追加
ALTER TABLE public.vtubers 
ADD COLUMN IF NOT EXISTS is_candidate BOOLEAN DEFAULT true;

-- 2. roulette_history テーブルへの公開フラグ追加
ALTER TABLE public.roulette_history 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- 既存データの初期化
-- 過去に一度でも排出されたVtuberは候補から外す
UPDATE public.vtubers 
SET is_candidate = false 
WHERE id IN (SELECT vtuber_id FROM public.roulette_history);

-- すべての過去履歴を「公開済み」に設定
UPDATE public.roulette_history 
SET is_published = true;
