export interface VtuberData {
  id: string; // Database UUID
  name: string;
  channelId: string;
  channelIcon?: string;
  description: string;
  aiIntroduction?: string; // Optional for summaries
  aiIntroductionEn?: string; // Optional for summaries
  subscriberCount: number;
  drawDate?: string; 
  medleyData?: MedleySong[]; // Optional for summaries
  discoveryVideoIds?: { videoId: string; videoTitle: string }[];
}

export interface MedleySong {
  videoId: string;
  videoTitle: string;
  chorusStart: number;
  chorusEnd: number;
  voiceAnalysis: string;
  audioUrl?: string; 
}

export interface RouletteState {
  currentVtuber: VtuberData | null;
  nextDrawTime: string; 
  totalHearts: number;
  timeReductionMinutes: number;
  serverTime: number; // 同期用のサーバー時刻
}

export interface ArchiveEntry {
  id: string; // roulette_history UUID
  vtuber: VtuberData;
  drawDate: string; 
}
