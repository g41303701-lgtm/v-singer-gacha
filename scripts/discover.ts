import * as dotenv from 'dotenv';
import { runDiscovery } from '../src/lib/discovery';

// Load .env.local for local testing
dotenv.config({ path: '.env.local' });

async function main() {
  console.log("=========================================");
  console.log("🚀 Starting VTuber Discovery Script...");
  console.log("=========================================");

  try {
    const { foundCount } = await runDiscovery(10);
    console.log(`\n✅ Discovery finished successfully. Found ${foundCount} new candidates.`);
  } catch (error: any) {
    console.error("\n❌ Discovery Script Error:", error.message);
    process.exit(1);
  }
}

main();
