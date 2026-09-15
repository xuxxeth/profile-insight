export type ProviderKind = 'openai-compatible' | 'gemini';
export type AnalysisPurpose = 'sales' | 'partnership' | 'recruitment' | 'investment' | 'networking';
export type PlatformId = 'X' | 'LinkedIn' | 'Facebook';

export interface Settings {
  provider: ProviderKind;
  apiKey: string;
  baseUrl: string;
  model: string;
  outputLanguage: 'zh-CN' | 'en';
  sellerName: string;
  companyName: string;
  offer: string;
  advantages: string;
  targetAudience: string;
  callToAction: string;
  bannedWords: string;
}

export interface ProfilePost { text: string; timestamp: string | null; url: string }

export interface ProfileData {
  platform: PlatformId;
  displayName: string;
  handle: string;
  bio: string;
  location: string;
  profileUrl: string;
  analysisPurpose: AnalysisPurpose;
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
  recentTopics: Array<{ topic: string; trend: 'rising' | 'stable' | 'declining'; evidence: string; sourceUrl: string }>;
  commercialSignals: Array<{ signal: string; confidence: 'high' | 'medium' | 'low'; evidence: string; sourceUrl: string }>;
  recommendedHook: { postExcerpt: string; reason: string; sourceUrl: string };
  outreachMessages: { xDm: string; linkedin: string; coldEmail: string; followUp: string };
  activity: ActivityPeriod;
}

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'collecting'; purpose: AnalysisPurpose; collected: number; tabId?: number }
  | { status: 'loading'; profile: ProfileData; startedAt: number }
  | { status: 'success'; profile: ProfileData; result: InsightResult; completedAt: number; cached?: boolean }
  | { status: 'error'; profile?: ProfileData; message: string };

export type ExtensionMessage =
  | { type: 'OPEN_ANALYSIS_PANEL'; purpose: AnalysisPurpose }
  | { type: 'COLLECTION_PROGRESS'; purpose: AnalysisPurpose; collected: number }
  | { type: 'CANCEL_COLLECTION'; tabId?: number }
  | { type: 'ANALYZE_PROFILE'; profile: ProfileData }
  | { type: 'REANALYZE_PROFILE'; profile: ProfileData }
  | { type: 'REQUEST_API_PERMISSION'; baseUrl: string }
  | { type: 'OPEN_OPTIONS' };
