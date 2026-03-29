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
    const maxTargetVideos = 3;
    let videoDataArray: any[] = [];

    let primaryVideos = [];
    if (target.discovery_video_ids && Array.isArray(target.discovery_video_ids)) {
      primaryVideos = target.discovery_video_ids;
    }

    // 予備として、チャンネルから最新の歌動画を15件取得する
    const fallbackVideos = await fetchLatestMusicVideos(target.channel_id, 15);

    const seenIds = new Set();
    for (const v of [...primaryVideos, ...fallbackVideos]) {
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        videoDataArray.push(v);
      }
    }
    
    const medleyData: MedleySong[] = [];
    const medleySegments: any[] = [];

    for (const video of videoDataArray) {
      if (medleySegments.length >= maxTargetVideos) {
        break; // 目標数（3曲）に達したら探索終了
      }

      console.log(`  🎵 Analyzing: ${video.videoTitle}...`);
      try {
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
      } catch (videoErr: any) {
        console.warn(`  ⚠️ Skipping video ${video.videoId} due to error: ${videoErr.message}`);
        continue; // エラー時は次の動画を探索
      }
    }

    if (medleySegments.length < maxTargetVideos) {
      throw new Error(`Failed to collect ${maxTargetVideos} valid videos for this VTuber (Found only ${medleySegments.length}). Proceeding to next candidate.`);
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
