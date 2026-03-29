import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// サイト全体へのアクセスをメンテナンスページへ転送します。
// 復旧の際は、この middleware.ts ファイルを削除またはリネーム（例: middleware.ts.bk）してください。
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // メンテナンスページ自体、および必要な静的ファイルなどは除外する
  if (
    pathname.startsWith('/maintenance') ||
    pathname.includes('.') || // 静的ファイル (favicon.ico, png など)
    pathname.startsWith('/_next') || // Next.js の内部パス
    pathname.startsWith('/api/maintenance') // 必要であれば API も除外
  ) {
    return NextResponse.next();
  }

  // それ以外の全アクセスを /maintenance へリダイレクトする
  const url = request.nextUrl.clone();
  url.pathname = '/maintenance';
  return NextResponse.redirect(url);
}

// すべてのパスで動作するように設定
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) -> API も停止したい場合は含める
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
