-- 歌ウマVtuberルーレット データベース改修スクリプト
-- 「Gacha」から「Roulette」へのシステム名称変更および、メドレー機能(3曲分の情報)用のカラムを追加します。
-- SupabaseのSQL Editorにコピー＆ペーストして実行してください。

-- 1. テーブル名のリネーム (gacha_history -> roulette_history)
-- ※もし「roulette_history」が既に存在する場合はエラーになりますが、そのままで構いません。
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gacha_history') THEN
    ALTER TABLE public.gacha_history RENAME TO roulette_history;
  END IF;
END $$;

-- 2. メドレー再生用データ（JSONB形式）カラムの追加
-- 3曲分のサビ開始・終了時間、ID、タイトル、歌声特徴を配列で格納します。
ALTER TABLE public.roulette_history 
ADD COLUMN IF NOT EXISTS medley_data JSONB DEFAULT '[]'::jsonb;

-- 3. インデックスのリネーム (オプション: 将来的な混乱を防ぐため)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'gacha_history_vtuber_id_idx') THEN
    ALTER INDEX public.gacha_history_vtuber_id_idx RENAME TO roulette_history_vtuber_id_idx;
  END IF;
END $$;
