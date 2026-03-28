-- 歌ウマVtuberガチャ データベーススキーマ初期化スクリプト
-- SupabaseのSQL Editorにコピー＆ペーストして実行してください

-- 1. vtubers (マスターデータ) テーブル
CREATE TABLE IF NOT EXISTS public.vtubers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    subscriber_count TEXT,
    tags TEXT[] DEFAULT '{}',
    social_links JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. gacha_history (排出履歴) テーブル
CREATE TABLE IF NOT EXISTS public.gacha_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vtuber_id UUID REFERENCES public.vtubers(id) ON DELETE CASCADE,
    draw_date DATE UNIQUE NOT NULL, -- 1日1件の制約
    ai_introduction TEXT,
    video_id TEXT,
    video_title TEXT,
    total_hearts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. global_stats (グローバル状態管理) テーブル
CREATE TABLE IF NOT EXISTS public.global_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- 常にid=1のみ存在
    next_draw_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_hearts INTEGER DEFAULT 0,
    time_reduction_minutes INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期データの挿入 (global_stats)
INSERT INTO public.global_stats (id, next_draw_time, total_hearts, time_reduction_minutes)
VALUES (1, NOW() + INTERVAL '24 hours', 0, 0)
ON CONFLICT (id) DO NOTHING;

-- オプション: RLSポリシーの設定（今回はシンプルにするため、パブリック参照を許可）
ALTER TABLE public.vtubers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gacha_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_stats ENABLE ROW LEVEL SECURITY;

-- 全員がRead可能にするポリシー
CREATE POLICY "Enable read access for all users - vtubers" ON public.vtubers FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users - gacha_history" ON public.gacha_history FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users - global_stats" ON public.global_stats FOR SELECT USING (true);

-- APIからのWriteを許可する（※実運用ではService Role Keyのみ更新可能とし、RLSはより厳密に設定することを推奨）
CREATE POLICY "Enable insert/update for anon - gacha_history" ON public.gacha_history FOR ALL USING (true);
CREATE POLICY "Enable insert/update for anon - global_stats" ON public.global_stats FOR ALL USING (true);
CREATE POLICY "Enable insert/update for anon - vtubers" ON public.vtubers FOR ALL USING (true);
