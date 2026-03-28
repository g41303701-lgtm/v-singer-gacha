-- roulette_history テーブルの draw_date カラムにかかっているユニーク制約を解除します。
-- これにより、同じ日付で複数の解析結果を保存できるようになります。

DO $$ 
DECLARE 
    rec RECORD;
BEGIN
    -- draw_date カラムに関連するユニーク制約（u）を検索して削除
    -- ※Supabaseで自動生成された制約名が不明なため、ループですべてのユニーク制約を対象にします
    FOR rec IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.roulette_history'::regclass 
        AND contype = 'u'
    ) LOOP
        EXECUTE 'ALTER TABLE public.roulette_history DROP CONSTRAINT ' || rec.conname;
    END LOOP;
END $$;
