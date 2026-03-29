import { supabase } from './supabase';
import { fetchLatestMusicVideos, fetchAudioBuffer, fetchChannelData, generateMedleyAudio } from './youtube';
import { uploadChorusAudio } from './storage';
import { generateAiIntroductionWithAudio, generateIntegratedIntroduction } from './gemini';
import { getRecentVtuberIds } from './history';
import { MedleySong } from '@/types';

/**
 * フォールバック処理: アーカイブ（過去の公開履歴）から再選出する
 */
export async function fallbackFromArchive(reason: string) {
  console.warn(`⚠️ Entering Fallback Mode: ${reason}`);
  
  // 1. 過去に公開された履歴からランダムに1件取得 (直近10件は避ける)
  const recentIds = await getRecentVtuberIds(10);

  const { data: pastWinners, error: selectError } = await supabase
    .from('roulette_history')
    .select('*, vtubers(*)')
    .not('vtuber_id', 'in', `(${[...recentIds].join(',') || '0'})`)
    .limit(1);

  if (selectError || !pastWinners || pastWinners.length === 0) {
    throw new Error(`Fallback failed: Could not find any past records. ${selectError?.message}`);
  }

  const pastWinner = pastWinners[0];
  const v = pastWinner.vtubers;
  console.log(`♻️ Re-selecting ${v.name} from archive.`);

  // 2. YouTube から最新メタデータを取得
  try {
    const meta = await fetchChannelData(v.channel_id);
    await supabase.from('vtubers').update({
      channelIcon: meta.channelIcon,
      subscriberCount: meta.subscriberCount
    }).eq('id', v.id);
    console.log("✅ YouTube metadata updated for fallback VTuber.");
  } catch (e) {
    console.warn("⚠️ YouTube update failed during fallback. Proceeding with existing archive data.");
  }

  // 3. roulette_history に新規ストック挿入
  const today = new Date().toISOString().split('T')[0];
  const { error: insertError } = await supabase
    .from('roulette_history')
    .insert({
      vtuber_id: v.id,
      draw_date: today,
      ai_introduction: pastWinner.ai_introduction,
      ai_introduction_en: pastWinner.ai_introduction_en,
      medley_data: pastWinner.medley_data,
      is_published: false,
    });

  if (insertError) throw insertError;
  return { name: v.name, status: 'fallback_queued' };
}

/**
 * 候補の選出・解析・ストック追加を一気に行う
 */
export async function runAutoAnalysis(): Promise<{ name: string; status: string }> {
  console.log('--- runAutoAnalysis Started ---');

  // 1. 候補の取得
  const { data: candidates, error: fetchErr } = await supabase
    .from('vtubers')
    .select('id, name, channel_id, description, discovery_video_ids')
    .eq('is_candidate', true);

  if (fetchErr || !candidates || candidates.length === 0) {
    return await fallbackFromArchive("No candidates available for analysis");
  }

  // 2. 直近の履歴を避けて選出
  const recentIds = await getRecentVtuberIds(20);
  const finalCandidates = candidates.filter(v => !recentIds.has(v.id));
  const target = (finalCandidates.length > 0 ? finalCandidates : candidates)[Math.floor(Math.random() * (finalCandidates.length > 0 ? finalCandidates : candidates).length)];

  console.log(`🎯 Target Selected: ${target.name} (${target.id})`);

  try {
    // 3. 解析フェーズ
    let videoDataArray = [];
    if (target.discovery_video_ids && Array.isArray(target.discovery_video_ids)) {
      videoDataArray = target.discovery_video_ids;
    } else {
      videoDataArray = await fetchLatestMusicVideos(target.channel_id, 3);
    }
    
    const medleyData: MedleySong[] = [];
    const medleySegments = [];

    for (const video of videoDataArray) {
      console.log(`  🎵 Analyzing: ${video.videoTitle}...`);
      const audioBuffer = await fetchAudioBuffer(video.videoId);
      const analysis = await generateAiIntroductionWithAudio(audioBuffer, video.videoTitle);
      
      const chorusStart = analysis.chorus_start;
      const chorusEnd = analysis.chorus_end > chorusStart ? analysis.chorus_end : chorusStart + 15;

      medleySegments.push({
        buffer: audioBuffer,
        chorusStart,
        chorusEnd
      });

      medleyData.push({
        videoId: video.videoId,
        videoTitle: video.videoTitle,
        chorusStart: chorusStart,
        chorusEnd: chorusEnd,
        voiceAnalysis: analysis.voice_analysis,
      });
    }

    // メドレー音声生成とアップロード
    console.log(`  📦 Generating medley audio...`);
    const mp3Buffer = await generateMedleyAudio(medleySegments);
    const audioUrl = await uploadChorusAudio(mp3Buffer, target.id, 'medley');

    if (medleyData.length > 0) {
      medleyData[0].audioUrl = audioUrl;
    }

    // 統合紹介文生成
    console.log("🤖 Generating integrated introduction...");
    const aiIntro = await generateIntegratedIntroduction(target.name, target.description || '', medleyData);

    // roulette_history へ保存
    const today = new Date().toISOString().split('T')[0];
    const { error: insertError } = await supabase.from('roulette_history').insert({
      vtuber_id: target.id,
      draw_date: today,
      ai_introduction: aiIntro.ja,
      ai_introduction_en: aiIntro.en,
      medley_data: medleyData,
      is_published: false,
    });

    if (insertError) throw insertError;

    // 候補フラグを下ろす
    await supabase.from('vtubers').update({ is_candidate: false }).eq('id', target.id);
    
    console.log(`🌟 Successfully generated stock for: ${target.name}`);
    return { name: target.name, status: 'queued' };

  } catch (err: any) {
    console.error("❌ Analysis Error:", err.message);

    // エラーが発生したVtuberで次回以降も止まり続けないように、候補フラグを下ろす
    await supabase.from('vtubers').update({ is_candidate: false }).eq('id', target.id);

    try {
      return await fallbackFromArchive(`Analysis Failure for ${target.name}: ${err.message}`);
    } catch (fallbackErr: any) {
      console.error("❌ Fallback Error:", fallbackErr.message);
      throw new Error(`Target [${target.name}] discarded due to error: ${err.message}. And Fallback failed: ${fallbackErr.message}`);
    }
  }
}
