-- 英語版紹介文カラムの追加
-- SupabaseのSQL Editorにコピー＆ペーストして実行してください。

ALTER TABLE public.roulette_history 
ADD COLUMN IF NOT EXISTS ai_introduction_en TEXT DEFAULT '';
