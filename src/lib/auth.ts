/**
 * 管理API共通の認証チェック。
 *
 * 以下の2方式を統一的にサポートする:
 *   1. URL query: ?secret=CRON_SECRET
 *   2. Header:    Authorization: Bearer SERVICE_ROLE_KEY
 *
 * 開発環境 (NODE_ENV !== 'production') では常に許可する。
 */
export function verifyAdminAuth(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true;

  // 方式1: query parameter
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  if (secret && secret === process.env.CRON_SECRET) return true;

  // 方式2: Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) return true;

  return false;
}
