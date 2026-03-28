import { MedleySong } from '@/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ========== 共通ヘルパー ==========

/**
 * Gemini API を呼び出し、404 の場合はフォールバックモデルに切り替える共通ヘルパー。
 * テキスト専用とマルチモーダル（音声付き）の両方で利用される。
 */
async function callGeminiWithFallback(
  primaryModel: string,
  fallbackModel: string,
  requestBody: object
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined.');
  }

  const buildUrl = (model: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  let res = await fetch(buildUrl(primaryModel), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok && res.status === 404) {
    console.log(`${primaryModel} not found, falling back to ${fallbackModel}...`);
    res = await fetch(buildUrl(fallbackModel), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  }

  if (!res.ok) {
    const errBody = await res.text();
    console.error('Gemini API Error details:', errBody);
    throw new Error(`Gemini API Error: ${res.statusText}`);
  }

  const data = await res.json();
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!result) {
    console.warn('Gemini API returned success but no text content.');
  }
  return result || '';
}

// ========== テキスト生成 ==========

/**
 * Gemini 3.1 Flash Lite を用いた統合紹介文生成（日→英シーケンシャル生成）
 * 1. まず日本語のキャッチーな紹介文を生成します
 * 2. 続けてその生成結果を元に、自然な英語に翻訳します
 */
export async function generateIntegratedIntroduction(
  vtuberName: string,
  description: string,
  analyzedSongs: MedleySong[]
): Promise<{ ja: string; en: string }> {
  const songsInfoText = analyzedSongs.map((song, index) => `
楽曲${index + 1}: ${song.videoTitle}
歌声の特徴（AIによる客観的評価）: ${song.voiceAnalysis}
`).join('\n');

  // ============== 1. 日本語の紹介文を生成 ==============
  const jaPrompt = `あなたはVtuberの魅力を伝える専門プロデューサーです。以下のVtuberについて、「初見のリスナーが興味を持つような、ワクワクする魅力的な紹介文（2〜3行程度のキャッチーなもの）」を生成してください。特に「歌の活動・魅力」にフォーカスしてください。

Vtuber名: ${vtuberName}
チャンネル概要:
${description.slice(0, 500)}

以下は、最新の歌動画3曲からAIが聞き取ったこの人物の「歌声の特徴」です。これらの特徴を総合的にまとめて、このVtuberの歌の凄さを伝えてください。
${songsInfoText}

※注意事項
- 敬称略で構いません。
- 出力は紹介文の日本語テキストのみとしてください。`;

  let jaResult = `${vtuberName} の魅力的な歌声をお楽しみください！`;
  try {
    const rawJa = await callGeminiWithFallback(
      'gemini-3.1-flash-lite-preview',
      'gemini-1.5-flash',
      { contents: [{ parts: [{ text: jaPrompt }] }] }
    );
    if (rawJa) {
      jaResult = rawJa.trim();
      console.log('Successfully generated Japanese intro.');
    }
  } catch (error: any) {
    console.error('Failed to generate Japanese intro:', error.message);
  }

  // ============== 2. 生成された日本語を英語に翻訳 ==============
  const enPrompt = `以下の日本語のVTuber紹介文を、英語として自然でキャッチーな文章に翻訳してください。直訳ではなく、海外のVTuberファンやリスナーがワクワクするような魅力的な英語表現に意訳してください。

[紹介文]
${jaResult}

※注意事項
- 出力は翻訳された英語のテキストのみとしてください（余計な解説やタグは不要です）。`;

  let enResult = `Enjoy the captivating vocals of ${vtuberName}!`;
  try {
    const rawEn = await callGeminiWithFallback(
      'gemini-3.1-flash-lite-preview',
      'gemini-1.5-flash',
      { contents: [{ parts: [{ text: enPrompt }] }] }
    );
    if (rawEn) {
      enResult = rawEn.trim();
      console.log('Successfully generated English intro.');
    }
  } catch (error: any) {
    console.error('Failed to generate English translation:', error.message);
  }

  return {
    ja: jaResult,
    en: enResult,
  };
}

// ========== オーディオ解析 ==========

export interface NativeAudioAnalysisResult {
  chorus_start: number;
  chorus_end: number;
  voice_analysis: string;
}

/**
 * Gemini File APIを用いたオーディオ・ネイティブ解析
 */
export async function generateAiIntroductionWithAudio(
  audioBuffer: Buffer,
  videoTitle: string
): Promise<NativeAudioAnalysisResult> {
  const promptText = `この音声データはVtuberの歌ってみた（MV）動画「${videoTitle}」です。
Gemini FlashのNative Audio解析機能を用いて、以下の3点を解析しJSONで出力してください。

1. chorus_start: 最も盛り上がる「サビ」部分が始まるタイムスタンプ（秒数、整数値のみ）
2. chorus_end: その「サビ」部分が終わるタイムスタンプ（秒数、整数値のみ）
3. voice_analysis: この人物の歌声の特徴や魅力についての専門的な解説（100〜150文字程度）

必ず以下のJSONスキーマに従ってください。フォーマット以外の文字列やMarkdownのコードブロック記法 (\`\`\`json など) は含めないでください。
{
  "chorus_start": 65,
  "chorus_end": 85,
  "voice_analysis": "透き通るような高音と力強いビブラートが特徴的で..."
}`;

  const requestBody = {
    contents: [{
      parts: [
        { 
          inlineData: { 
            mimeType: 'audio/m4a', 
            data: audioBuffer.toString('base64') 
          } 
        },
        { text: promptText }
      ]
    }],
    generationConfig: {
      responseMimeType: "application/json",
    }
  };

  const rawText = await callGeminiWithFallback(
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-flash',
    requestBody
  );

  if (!rawText) {
    throw new Error('Gemini API returned empty response.');
  }

  try {
    // Markdownのコードブロックが含まれる場合を考慮してクリーンアップ
    const cleanJson = rawText.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return {
      chorus_start: typeof parsed.chorus_start === 'number' ? parsed.chorus_start : parseInt(parsed.chorus_start) || 0,
      chorus_end: typeof parsed.chorus_end === 'number' ? parsed.chorus_end : parseInt(parsed.chorus_end) || 0,
      voice_analysis: parsed.voice_analysis || '解析情報が取得できませんでした',
    };
  } catch (e) {
    console.error('Failed to parse Gemini JSON output:', rawText);
    throw new Error('Invalid JSON from Gemini.');
  }
}
