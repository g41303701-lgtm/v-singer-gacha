import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing in environment variables.');
}

// サーバーサイド・クライアントサイド共通のSupabaseクライアント（Anon Key）
export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'dummy_key'
);

// サーバーサイド専用：RLSバイパスが必要な操作用（Storage, 管理系）
export const supabaseAdmin = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseServiceKey || supabaseAnonKey || 'dummy_key'
);
