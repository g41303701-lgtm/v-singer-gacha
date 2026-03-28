-- 1. vtubers テーブルに探索時に見つけた動画IDを保存するカラムを追加
ALTER TABLE public.vtubers ADD COLUMN IF NOT EXISTS discovery_video_ids JSONB;

-- 2. 検索状態（ページトークンとリセット日時）を管理するテーブルを作成
CREATE TABLE IF NOT EXISTS public.search_state (
    id SERIAL PRIMARY KEY,
    query TEXT UNIQUE NOT NULL,
    next_page_token TEXT,
    last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- トリガーで updated_at を自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_search_state_updated_at
    BEFORE UPDATE ON public.search_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- コメント追加
COMMENT ON COLUMN public.vtubers.discovery_video_ids IS 'JSON array of {videoId, videoTitle} found during discovery';
COMMENT ON TABLE public.search_state IS 'Stores YouTube search pagination state per query for quota optimization';
