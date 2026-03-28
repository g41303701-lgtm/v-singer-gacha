import { NextResponse } from 'next/server';
import { runDiscovery } from '@/lib/discovery';
import { verifyAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { foundCount } = await runDiscovery(10);
    
    return NextResponse.json({
      success: true,
      message: `Discovery finished. Found ${foundCount} new candidates.`,
      foundCount
    });
  } catch (error: any) {
    console.error('Discovery Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
