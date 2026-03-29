import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { MUSIC_VIDEO_REGEX } from './constants';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function fetchLatestMusicVideos(channelId: string, maxResults: number = 3) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not defined.');
  }

  // 1. チャンネルの uploads プレイリストIDを取得
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
  const channelRes = await fetch(channelUrl);
  const channelData = await channelRes.json();

  if (!channelData.items || channelData.items.length === 0) {
    throw new Error(`Channel not found for ID: ${channelId}`);
  }

  const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

  // 2. アップロード動画リストから最大50件検索対象として取得
  const playlistItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${YOUTUBE_API_KEY}`;
  const playlistItemsRes = await fetch(playlistItemsUrl);
  const playlistItemsData = await playlistItemsRes.json();

  if (!playlistItemsData.items || playlistItemsData.items.length === 0) {
    throw new Error('No videos found for this channel.');
  }

  // 3. 正規表現に合致する動画から上位を取得
  const matchedVideos = playlistItemsData.items.filter((item: any) => {
    const title = (item.snippet.title || '').normalize('NFKC');
    return MUSIC_VIDEO_REGEX.test(title);
  });

  if (matchedVideos.length === 0) {
    throw new Error('No music-related videos found that match the search keywords.');
  }

  // 最大 maxResults 件返す
  return matchedVideos.slice(0, maxResults).map((v: any) => ({
    videoId: v.snippet.resourceId.videoId,
    videoTitle: v.snippet.title,
    publishedAt: v.snippet.publishedAt,
  }));
}

/**
 * YouTube動画のオーディオデータを最高品質でメモリ（Buffer）上にダウンロードする機能。
 * Native Audio などの各種API処理に渡すために用います。
 */
export async function fetchAudioBuffer(videoId: string): Promise<Buffer> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  return new Promise((resolve, reject) => {
    // Next.js環境での __dirname パス解決バグを回避するため、まずローカルバイナリを探す
    const fs = require('fs');
    const ext = os.platform() === 'win32' ? '.exe' : '';
    let binaryPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', `yt-dlp${ext}`);
    
    // GitHub ActionsなどでAPI制限回避のためバイナリダウンロードをスキップした場合、
    // pipでインストールされたグローバルの yt-dlp を使用する
    if (!fs.existsSync(binaryPath)) {
      binaryPath = 'yt-dlp';
    }
    
    const tmpDir = os.tmpdir();
    const outputPath = path.join(tmpDir, `yt_${videoId}_${Date.now()}.m4a`);

    const args = [
      '-f', 'bestaudio/best', // 最も品質の良いオーディオ（無ければ動画込みの最高品質）
      '-x', '--audio-format', 'm4a', // 確実にm4aに変換して出力
      '-o', outputPath
    ];

    if (process.env.YOUTUBE_COOKIES_PATH) {
      args.push('--cookies', process.env.YOUTUBE_COOKIES_PATH);
    }
    args.push(videoUrl);

    // stdoutへのパイプではなくファイル書き出しを行い、ログのみ取得する
    const child = spawn(binaryPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'], 
    });

    let stderrOutput = '';
    child.stderr?.on('data', (chunk) => {
      stderrOutput += chunk.toString();
    });
    
    // yt-dlp は -o でファイル指定するとエラー以外のログをstdoutに出力する
    let stdoutLogs = '';
    child.stdout?.on('data', (chunk) => {
      stdoutLogs += chunk.toString();
    });

    child.on('close', (code) => {
      try {
        if (code === 0 && fs.existsSync(outputPath)) {
          const buffer = fs.readFileSync(outputPath);
          resolve(buffer);
        } else {
          // エラーメッセージの抽出
          const errMsg = stderrOutput.split('\n').filter(l => l.includes('ERROR:')).join(' ') 
            || stderrOutput.trim() || stdoutLogs.trim() || 'Unknown extraction error';
          reject(new Error(`Exit code ${code} for video ${videoId}. Reason: ${errMsg}`));
        }
      } catch (err) {
        reject(err);
      } finally {
        // 一時ファイルのクリーンアップ
        if (fs.existsSync(outputPath)) {
          try { fs.unlinkSync(outputPath); } catch (_) {}
        }
      }
    });
    
    child.on('error', (err) => {
      reject(err);
    });
  });
}
export async function fetchChannelData(channelId: string) {
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY is not defined.');

  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    throw new Error(`Channel data not found for ID: ${channelId}`);
  }

  const item = data.items[0];
  return {
    channelIcon: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    subscriberCount: parseInt(item.statistics.subscriberCount, 10) || 0,
    title: item.snippet.title,
    description: item.snippet.description
  };
}

interface MedleySegment {
  buffer: Buffer;
  chorusStart: number;
  chorusEnd: number;
}

/**
 * 複数の音声Bufferのサビ区間を切り出し、FFmpegを用いて1つのMP3ファイル（メドレー）に結合する。
 * 各曲の間は1.5秒のクロスフェードで接続し、全体として最初と最後にフェードイン・フェードアウトをかける。
 */
export async function generateMedleyAudio(segments: MedleySegment[]): Promise<Buffer> {
  const fs = await import('fs');
  const tmpDir = os.tmpdir();

  if (segments.length === 0) {
    throw new Error('No segments provided for medley generation.');
  }

  const inputs = segments.map((s, i) => {
    const p = path.join(tmpDir, `input_${Date.now()}_${i}.m4a`);
    fs.writeFileSync(p, s.buffer);
    return p;
  });

  const outputPath = path.join(tmpDir, `medley_${Date.now()}.mp3`);

  let filterComplex = "";
  let totalDur = 0;
  const crossfadeDur = 1.5;

  segments.forEach((s, i) => {
    const dur = s.chorusEnd - s.chorusStart;
    filterComplex += `[${i}:a]atrim=start=${s.chorusStart}:duration=${dur},asetpts=PTS-STARTPTS[a${i}];`;
    totalDur += dur;
  });

  totalDur -= crossfadeDur * (segments.length - 1);

  if (segments.length >= 3) {
    filterComplex += `[a0][a1]acrossfade=d=${crossfadeDur}[c01];`;
    filterComplex += `[c01][a2]acrossfade=d=${crossfadeDur}[c_final];`;
  } else if (segments.length === 2) {
    filterComplex += `[a0][a1]acrossfade=d=${crossfadeDur}[c_final];`;
  } else {
    filterComplex += `[a0]anull[c_final];`;
  }

  const fadeOutStart = Math.max(0, totalDur - 1);
  filterComplex += `[c_final]afade=t=in:st=0:d=1,afade=t=out:st=${fadeOutStart}:d=1[final]`;

  const args = ['-y'];
  inputs.forEach(inp => {
    args.push('-i', inp);
  });
  args.push('-filter_complex', filterComplex);
  args.push('-map', '[final]');
  args.push('-codec:a', 'libmp3lame', '-q:a', '4');
  args.push(outputPath);

  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let stderrOutput = '';
    child.stderr?.on('data', (chunk) => { stderrOutput += chunk.toString(); });

    child.on('close', (code) => {
      try {
        if (code === 0 && fs.existsSync(outputPath)) {
          const result = fs.readFileSync(outputPath);
          resolve(result);
        } else {
          console.error('ffmpeg crossfade error:', stderrOutput);
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      } finally {
        inputs.forEach(inp => { try { fs.unlinkSync(inp); } catch {} });
        try { fs.unlinkSync(outputPath); } catch {}
      }
    });

    child.on('error', (err) => {
      inputs.forEach(inp => { try { fs.unlinkSync(inp); } catch {} });
      try { fs.unlinkSync(outputPath); } catch {}
      reject(err);
    });
  });
}

