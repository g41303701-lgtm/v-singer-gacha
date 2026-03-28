import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fetchAudioBuffer, generateMedleyAudio } from '../src/lib/youtube';
import { uploadChorusAudio } from '../src/lib/storage';

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
  console.log("🚀 Starting Medley Audio Migration...");
  console.log("=========================================");

  // 1. バケットの存在確認と作成
  console.log("🛠️ Step 1: Checking/Creating 'chorus-audio' bucket...");
  const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
  if (bucketListError) {
    console.error("Failed to list buckets:", bucketListError);
    process.exit(1);
  }

  const bucketExists = buckets.find(b => b.name === 'chorus-audio');
  if (!bucketExists) {
    console.log("📁 'chorus-audio' bucket not found. Creating it as Public...");
    const { error: createError } = await supabase.storage.createBucket('chorus-audio', { public: true });
    if (createError) {
      console.error("❌ Failed to create bucket:", createError.message);
      process.exit(1);
    }
    console.log("✅ Bucket created successfully!");
  } else {
    // 既存バケットがPublicかどうかの更新設定（念のため）
    await supabase.storage.updateBucket('chorus-audio', { public: true });
    console.log("✅ 'chorus-audio' bucket is ready.");
  }

  // 2. 更新が必要な履歴データの取得
  console.log("\n🔍 Step 2: Fetching old roulette_history records without audioUrl...");
  const { data: histories, error: fetchError } = await supabase
    .from('roulette_history')
    .select('*')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error("❌ Failed to fetch history:", fetchError.message);
    process.exit(1);
  }

  // audioUrl を持たないデータを抽出
  const targets = (histories || []).filter(h => {
    const medleyData = h.medley_data || [];
    if (medleyData.length === 0) return false;
    // 最初の要素に audioUrl が無いものだけ再生成
    return !medleyData[0].audioUrl;
  });

  if (targets.length === 0) {
    console.log("🎉 All records are up-to-date! No migration needed.");
    return;
  }

  console.log(`⏳ Found ${targets.length} records to process.`);

  // 3. データごとに1ファイル化処理を実行
  for (let i = 0; i < targets.length; i++) {
    const record = targets[i];
    console.log(`\n--- [${i + 1}/${targets.length}] Processing VTuber_ID: ${record.vtuber_id} ---`);
    
    try {
      const medleyData = record.medley_data as any[];
      const segments = [];

      for (const song of medleyData) {
        console.log(`  🎵 Downloading audio: ${song.videoTitle || song.videoId} ...`);
        const audioBuffer = await fetchAudioBuffer(song.videoId);
        segments.push({
          buffer: audioBuffer,
          chorusStart: song.chorusStart,
          chorusEnd: song.chorusEnd
        });
      }

      console.log(`  🔗 Generating single medley (ffmpeg)...`);
      const mp3Buffer = await generateMedleyAudio(segments);

      console.log(`  ☁️ Uploading to Supabase Storage...`);
      const audioUrl = await uploadChorusAudio(mp3Buffer, record.vtuber_id, 'medley', supabase);

      // medleyData にURLを付与
      medleyData[0].audioUrl = audioUrl;

      console.log(`  💾 Saving updated record to database...`);
      const { error: updateError } = await supabase
        .from('roulette_history')
        .update({ medley_data: medleyData })
        .eq('id', record.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`✅ Success for record ID: ${record.id}`);

    } catch (err: any) {
      console.error(`❌ Failed to process record ${record.id}:`, err.message);
    }
  }

  console.log("\n🎯 Migration completed!");
}

main();
