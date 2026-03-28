import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=========================================");
  console.log("🚀 Initializing Heart Aggregation Data...");
  console.log("=========================================");

  // 1. 現在の global_stats を取得
  const { data: stats, error: fetchError } = await supabase
    .from('global_stats')
    .select('*')
    .eq('id', 1)
    .single();

  if (fetchError) {
    console.error("❌ Failed to fetch global_stats:", fetchError.message);
    console.log("💡 Make sure you have run the following SQL in Supabase Dashboard first:");
    console.log("ALTER TABLE global_stats ADD COLUMN last_aggregated_hearts BIGINT DEFAULT 0;");
    process.exit(1);
  }

  console.log(`📊 Current total_hearts: ${stats.total_hearts}`);
  
  // 2. last_aggregated_hearts を現在の total_hearts に同期
  const { error: updateError } = await supabase
    .from('global_stats')
    .update({ 
      last_aggregated_hearts: stats.total_hearts 
    })
    .eq('id', 1);

  if (updateError) {
    console.error("❌ Failed to update global_stats:", updateError.message);
    console.log("💡 If the error says 'column last_aggregated_hearts does not exist', run this SQL:");
    console.log("ALTER TABLE global_stats ADD COLUMN last_aggregated_hearts BIGINT DEFAULT 0;");
  } else {
    console.log("✅ last_aggregated_hearts initialized successfully!");
  }
}

main();
