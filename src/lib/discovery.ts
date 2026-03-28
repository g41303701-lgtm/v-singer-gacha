import { supabase } from './supabase';
import {
  SEARCH_QUERIES,
  MUSIC_VIDEO_REGEX,
  SEARCH_RESET_DAYS,
  MUSIC_DURATION_RANGE,
  MIN_MUSIC_VIDEOS_FOR_CANDIDATE,
} from './constants';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function runDiscovery(maxLoops = 5): Promise<{ foundCount: number }> {
  console.log('🚀 Starting Optimized Production Discovery (High-Efficiency Mode)...');
  let totalFound = 0;
  
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY is not defined.');

  const { data: existingVtubers } = await supabase.from('vtubers').select('channel_id');
  const existingChannelIds = new Set((existingVtubers || []).map(v => v.channel_id));

  // 1. 各クエリの件数・トークン・リセット状態をDBから取得
  const { data: dbStates } = await supabase.from('search_state').select('*');
  const stateMap = new Map((dbStates || []).map(s => [s.query, s]));

  const queryStates = SEARCH_QUERIES.map(q => {
    const s = stateMap.get(q);
    let nextToken = s?.next_page_token;
    let lastResetAt = s?.last_reset_at ? new Date(s.last_reset_at) : new Date();

    // 1週間（7日）経過していたらリセット
    const diffDays = (Date.now() - lastResetAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays >= SEARCH_RESET_DAYS) {
      console.log(`♻️  Weekly Reset for: [${q}]`);
      nextToken = undefined;
      lastResetAt = new Date();
    }

    return { query: q, nextToken, lastResetAt, isActive: true };
  });

  let currentSet = 0;
  while (currentSet < maxLoops) {
    console.log(`\n--- Discovery Set #${currentSet + 1} ---`);
    let foundInThisSet = 0;

    for (const state of queryStates) {
      if (!state.isActive) continue;

      console.log(`🔍 Searching [${state.query}] (Page Context: ${state.nextToken || 'START'})...`);
      
      try {
        const url: string = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(state.query)}&type=video&maxResults=50&relevanceLanguage=ja${state.nextToken ? `&pageToken=${state.nextToken}` : ''}&key=${YOUTUBE_API_KEY}`;
        
        const res: Response = await fetch(url);
        const data: any = await res.json();
        
        if (!data.items || data.items.length === 0) {
          if (data.error) {
            console.error(`  ❌ YouTube API Error [${state.query}]:`, JSON.stringify(data.error, null, 2));
            if (data.error.errors?.[0]?.reason === 'quotaExceeded') throw new Error(`Quota Exceeded: ${state.query}`);
          }
          state.isActive = false;
          continue;
        }

        // 次回のためのトークンを更新
        state.nextToken = data.nextPageToken;
        if (!state.nextToken) state.isActive = false;

        // ページ内のチャンネルIDを抽出して一意にする
        const channelIdsOnPage = [...new Set(data.items.map((item: any) => item.snippet.channelId))];
        const newPotentialIds = channelIdsOnPage.filter(id => !existingChannelIds.has(id as string));
        
        if (newPotentialIds.length === 0) {
          console.log(`  ℹ️  No new channels on this page.`);
          continue;
        }

        // 【最適化】 チャンネル情報（uploadsプレイリストID等）を 50件一括取得 (1ユニットのみ消費)
        console.log(`  📦 Bundling ${newPotentialIds.length} channel info requests...`);
        const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet,statistics&id=${newPotentialIds.join(',')}&key=${YOUTUBE_API_KEY}`;
        const cRes = await fetch(channelsUrl);
        const cData = await cRes.json();

        for (const channelInfo of (cData.items || [])) {
          try {
            const channelId = channelInfo.id;
            const channelSnippet = channelInfo.snippet;
            const uploadsId = channelInfo.contentDetails?.relatedPlaylists?.uploads;
            
            if (!uploadsId) continue;

            // 各チャンネルの動画属性精査
            const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=50&key=${YOUTUBE_API_KEY}`;
            const pRes = await fetch(playlistUrl);
            const pData = await pRes.json();
            const pageVideoIds = (pData.items || []).map((v: any) => v.contentDetails.videoId).join(',');

            if (!pageVideoIds) continue;

            const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${pageVideoIds}&key=${YOUTUBE_API_KEY}`;
            const vRes = await fetch(videosUrl);
            const vData = await vRes.json();

            const musicVideos = (vData.items || []).filter((v: any) => {
              // 全角英数を半角に正規化して判定
              const normalizedTitle = (v.snippet.title || '').normalize('NFKC');
              const isSong = MUSIC_VIDEO_REGEX.test(normalizedTitle);
              const isRegularUpload = v.snippet.liveBroadcastContent === 'none';
              const duration = parseISO8601Duration(v?.contentDetails?.duration);
              return isSong && isRegularUpload && (duration >= MUSIC_DURATION_RANGE.min && duration <= MUSIC_DURATION_RANGE.max);
            });
            
            if (musicVideos.length >= MIN_MUSIC_VIDEOS_FOR_CANDIDATE) {
              const infoToSave = musicVideos.slice(0, 3).map((v: any) => ({ videoId: v.id, videoTitle: v.snippet.title }));
              
              const { error: insertError } = await supabase.from('vtubers').insert({
                channel_id: channelId,
                name: channelSnippet.title,
                channel_icon: channelSnippet.thumbnails?.high?.url || channelSnippet.thumbnails?.default?.url,
                description: channelSnippet.description,
                subscriber_count: parseInt(channelInfo.statistics.subscriberCount) || 0,
                is_candidate: true,
                discovery_video_ids: infoToSave // 【最適化】 見つけた動画を保存
              });

              if (!insertError) {
                console.log(`🌟 Success: Added ${channelSnippet.title}`);
                totalFound++;
                foundInThisSet++;
                existingChannelIds.add(channelId as string);
              }
            }
          } catch (e: any) {
            console.warn(`  ⚠️ Skipped channel: ${e.message}`);
          }
        }
      } catch (err: any) {
        console.error(`  ⚠️ Set Error [${state.query}]:`, err.message);
        if (err.message.includes('Quota')) throw err;
      }
    }

    // セットごとに状態をDBに保存
    console.log("💾 Saving search states to DB...");
    for (const state of queryStates) {
      await supabase.from('search_state').upsert({
        query: state.query,
        next_page_token: state.nextToken,
        last_reset_at: state.lastResetAt.toISOString(),
      }, { onConflict: 'query' });
    }

    if (foundInThisSet > 0) {
      console.log(`✅ Set completed with ${foundInThisSet} findings. Finishing.`);
      break;
    }

    currentSet++;
    if (queryStates.every(s => !s.isActive)) break;
  }

  return { foundCount: totalFound };
}


// ISO 8601形式 (PT3M45S等) を秒数に変換
function parseISO8601Duration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}
