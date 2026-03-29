import * as dotenv from 'dotenv';
import { runDiscovery } from '../src/lib/discovery';
import { supabaseAdmin as supabase } from '../src/lib/supabase';

// Load .env.local for local testing
dotenv.config({ path: '.env.local' });

async function main() {
  console.log("=========================================");
  console.log("🚀 Starting VTuber Discovery Script...");
  console.log("=========================================");

  try {
    // 候補（is_candidate = true）の数を確認する
    const { count: candidateCount, error: fetchError } = await supabase
      .from('vtubers')
      .select('*', { count: 'exact', head: true })
      .eq('is_candidate', true);

    if (fetchError) throw fetchError;

    if (candidateCount !== null && candidateCount > 0) {
      console.log(`✅ Candidates available (${candidateCount}). Skipping discovery.`);
      process.exit(0);
    }

    console.log("⚠️ Stock empty (0). Triggering new discovery...");
    const { foundCount } = await runDiscovery(10);
    console.log(`\n✅ Discovery finished successfully. Found ${foundCount} new candidates.`);
  } catch (error: any) {
    console.error("\n❌ Discovery Script Error:", error.message);
    process.exit(1);
  }
}

main();
