-- 歌ウマVtuberガチャ データベース拡張スクリプト
-- Gemini Native Audio連携機能の追加に伴い、既存のテーブルに変更を加えます。
-- SupabaseのSQL Editorにコピー＆ペーストして実行してください。

-- 1. gacha_history テーブルに、サビ開始位置（chorus_start）を保存するカラムを追加
ALTER TABLE public.gacha_history 
ADD COLUMN IF NOT EXISTS chorus_start INTEGER DEFAULT 0;

-- 既存のai_introductionは、引き続き歌声分析（voice_analysis）の保存先として利用します。
