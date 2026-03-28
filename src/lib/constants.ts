/**
 * 共通定数定義
 * youtube.ts と discovery.ts で重複していた SEARCH_REGEX を統一し、
 * 検索クエリ等の設定値もここに集約する。
 */

/** 音楽関連動画を判定するための正規表現 */
export const MUSIC_VIDEO_REGEX = /歌ってみた|うたってみた|cover|covered|mv|music video|弾き語り|オリジナル曲|オリジナルソング|original|歌って|歌った|歌う|song/i;

/** Discovery 時に使用する YouTube 検索クエリ */
export const SEARCH_QUERIES = [
  'Vtuber Cover',
  'Vtuber 歌ってみた',
  'Vtuber オリジナル曲',
  '新人Vtuber Cover',
  '新人Vtuber 歌ってみた',
  '新人Vtuber オリジナル曲',
];

/** 検索状態リセットまでの日数 */
export const SEARCH_RESET_DAYS = 7;

/** 音楽動画とみなす再生時間の範囲（秒） */
export const MUSIC_DURATION_RANGE = { min: 60, max: 600 } as const;

/** VTuber候補とみなすための最低音楽動画数 */
export const MIN_MUSIC_VIDEOS_FOR_CANDIDATE = 3;
