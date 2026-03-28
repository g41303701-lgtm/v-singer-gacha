import * as dotenv from 'dotenv';
import { runAutoAnalysis } from '../src/lib/gacha_ops';

// Load .env.local for local testing
dotenv.config({ path: '.env.local' });

async function main() {
  console.log("=========================================");
  console.log("🎯 Starting VTuber Analysis & Stock Script...");
  console.log("=========================================");

  try {
    const result = await runAutoAnalysis();
    console.log(`\n✅ Analysis finished successfully.`);
    console.log(`📡 Result: ${result.name} - ${result.status}`);
  } catch (error: any) {
    console.error("\n❌ Analysis Script Error:", error.message);
    process.exit(1);
  }
}

main();
