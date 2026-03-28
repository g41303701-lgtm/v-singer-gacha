import { NextResponse } from 'next/server';
import { runAutoAnalysis } from '@/lib/gacha_ops';
import { verifyAdminAuth } from '@/lib/auth';

// 開発用・CRONジョブ用エンドポイント (現在は手動呼び出し推奨)
export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 共通ロジックを使って解析・ストック作成を実行
    const result = await runAutoAnalysis();

    return NextResponse.json({ 
      success: true, 
      message: `Stock generated: ${result.name}`,
      data: result 
    });

  } catch (error: any) {
    console.error('Error in generate-next route:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
