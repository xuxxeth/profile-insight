export type ProviderKind = 'openai-compatible' | 'gemini';

export interface Settings {
  provider: ProviderKind;
  apiKey: string;
  baseUrl: string;
  model: string;
  outputLanguage: 'zh-CN' | 'en';
}

export interface ProfilePost { text: string; timestamp: string | null }

export interface ProfileData {
  platform: 'X';
  displayName: string;
  handle: string;
  bio: string;
  location: string;
  profileUrl: string;
  posts: ProfilePost[];
}

export interface ActivityPeriod {
  targetLabel: string;
  viewerLabel: string;
  targetTimeZone: string | null;
  viewerTimeZone: string;
  confidence: 'high' | 'medium' | 'unknown';
  sampleSize: number;
}

export interface InsightResult {
  tags: string[];
  personaSummary: string;
  icebreakers: { bd: string; recruitment: string; general: string };
  language: { primary: string; communicationStyle: string };
  recentSummary: string;
  recentTopics: Array<{ topic: string; trend: 'rising' | 'stable' | 'declining'; evidence: string }>;
  commercialSignals: Array<{ signal: string; confidence: 'high' | 'medium' | 'low'; evidence: string }>;
  recommendedHook: { postExcerpt: string; reason: string };
  outreachMessages: { xDm: string; linkedin: string; coldEmail: string; followUp: string };
  activity: ActivityPeriod;
}

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'collecting' }
  | { status: 'loading'; profile: ProfileData; startedAt: number }
  | { status: 'success'; profile: ProfileData; result: InsightResult; completedAt: number }
  | { status: 'error'; profile?: ProfileData; message: string };

export type ExtensionMessage =
  | { type: 'OPEN_ANALYSIS_PANEL' }
  | { type: 'ANALYZE_PROFILE'; profile: ProfileData }
  | { type: 'OPEN_OPTIONS' };
