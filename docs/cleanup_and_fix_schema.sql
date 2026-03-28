-- vtubers テーブルのカラム整理と不要カラムの削除（エラー回避強化版）
DO $$ 
BEGIN
    -- 1. icon_url と channel_icon 両方が存在する場合
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vtubers' AND column_name='icon_url') AND 
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vtubers' AND column_name='channel_icon') THEN
        -- icon_url を削除
        ALTER TABLE public.vtubers DROP COLUMN icon_url;
    
    -- 2. icon_url のみ存在する場合
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vtubers' AND column_name='icon_url') THEN
        ALTER TABLE public.vtubers RENAME COLUMN icon_url TO channel_icon;
    END IF;

    -- 3. channel_icon がまだ無い場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vtubers' AND column_name='channel_icon') THEN
        ALTER TABLE public.vtubers ADD COLUMN channel_icon text;
    END IF;

    -- 4. 不要なカラムの削除
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vtubers' AND column_name='social_links') THEN
        ALTER TABLE public.vtubers DROP COLUMN social_links;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vtubers' AND column_name='tags') THEN
        ALTER TABLE public.vtubers DROP COLUMN tags;
    END IF;

    -- 5. subscriber_count を TEXT から INTEGER へ変換
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vtubers' AND column_name='subscriber_count' AND data_type='text') THEN
        ALTER TABLE public.vtubers ALTER COLUMN subscriber_count TYPE integer USING (subscriber_count::integer);
    END IF;

END $$;

-- 必要な追加カラムの最終確認
ALTER TABLE public.vtubers ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.vtubers ADD COLUMN IF NOT EXISTS is_candidate boolean DEFAULT true;
ALTER TABLE public.roulette_history ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

-- PostgRESTのキャッシュ更新用
COMMENT ON TABLE public.vtubers IS 'Consolidated Vtuber master data (Updated)';
