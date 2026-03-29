import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { executePublishNextGacha } from '@/lib/publish-logic';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * 待機中の解析結果 (is_published = false) を1件取り出し、公開状態にする。
 */
export async function POST(request: Request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await executePublishNextGacha();

    if (!result.success) {
      if (result.message.includes('No queued')) {
        return NextResponse.json({ success: false, message: result.message }, { status: 404 });
      }
      throw new Error(result.message);
    }

    // 4. ストック補充フェーズ (Cloudflare Edge非対応のためスキップ)
    // 実際の補充は GitHub Actions (auto_replenish_stock.yml) が定期的または手動で行います
    let replenishmentLog = 'Replenishment skipped (Requires full Node.js environment, handled by GitHub Actions).';

    return NextResponse.json({
      success: true,
      message: `Entry published successfully. ${replenishmentLog}`,
      id: result.id
    });
  } catch (error: any) {
    console.error('Publish Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
