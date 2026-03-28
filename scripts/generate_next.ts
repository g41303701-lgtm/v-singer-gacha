import * as dotenv from 'dotenv';
import { runAutoAnalysis } from '../src/lib/gacha_ops';
import { supabaseAdmin as supabase } from '../src/lib/supabase';

// Load .env.local for local testing
dotenv.config({ path: '.env.local' });

async function main() {
  console.log("=========================================");
  console.log("🎯 Starting VTuber Analysis & Stock Script...");
  console.log("=========================================");

  try {
    // 既に公開待ちのストックが十分ある場合は解析をスキップする
    const { count: candidateCount, error: fetchError } = await supabase
      .from('roulette_history')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', false);

    if (fetchError) throw fetchError;

    if (candidateCount !== null && candidateCount > 0) {
      console.log(`✅ Sufficient stock available (${candidateCount}). Skipping generation.`);
      process.exit(0);
    }

    const result = await runAutoAnalysis();
    console.log(`\n✅ Analysis finished successfully.`);
    console.log(`📡 Result: ${result.name} - ${result.status}`);
  } catch (error: any) {
    console.error("\n❌ Analysis Script Error:", error.message);
    process.exit(1);
  }
}

main();
