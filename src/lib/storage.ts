import { supabaseAdmin } from './supabase';

const BUCKET_NAME = 'chorus-audio';

/**
 * Supabase Storage にサビ音声ファイルをアップロードし、パブリック URL を返す。
 * バケット `chorus-audio` は事前に Supabase Dashboard で作成し、public に設定しておく。
 */
export async function uploadChorusAudio(
  mp3Buffer: Buffer,
  vtuberId: string,
  videoId: string,
  supabaseClient?: any
): Promise<string> {
  // ワーカー用に外部から渡されたクライアント or 共通の管理クライアントを使用
  const client = supabaseClient || supabaseAdmin;

  const filePath = `${vtuberId}/${videoId}.mp3`;

  const { error } = await client.storage
    .from(BUCKET_NAME)
    .upload(filePath, mp3Buffer, {
      contentType: 'audio/mpeg',
      upsert: true, // 再生成時は上書き
    });

  if (error) {
    throw new Error(`Failed to upload chorus audio: ${error.message}`);
  }

  // パブリック URL を取得
  const { data } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
}
