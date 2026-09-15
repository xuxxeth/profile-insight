import type { AnalysisState, Settings } from '@/shared/types';

const SETTINGS_KEY = 'profileInsightSettings';
export const ANALYSIS_KEY = 'profileInsightAnalysis';

export const DEFAULT_SETTINGS: Settings = {
  provider: 'openai-compatible',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  outputLanguage: 'zh-CN',
  sellerName: '',
  companyName: '',
  offer: '',
  advantages: '',
  targetAudience: '',
  callToAction: '',
  bannedWords: '',
};

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  const settings = { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] as Partial<Settings> | undefined) };
  if (settings.provider === 'gemini' && ['gemini-2.5-flash', 'gemini-3.1-flash-lite'].includes(settings.model)) {
    settings.model = 'gemini-flash-latest';
    await saveSettings(settings);
  }
  return settings;
}

export async function saveSettings(settings: Settings) {
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function setAnalysisState(state: AnalysisState) {
  await browser.storage.local.set({ [ANALYSIS_KEY]: state });
}

export async function getAnalysisState(): Promise<AnalysisState> {
  const stored = await browser.storage.local.get(ANALYSIS_KEY);
  return (stored[ANALYSIS_KEY] as AnalysisState | undefined) ?? { status: 'idle' };
}

export async function clearCurrentAnalysis() {
  await setAnalysisState({ status: 'idle' });
}

export async function clearApiKey() {
  const settings = await getSettings();
  await saveSettings({ ...settings, apiKey: '' });
}

export async function clearAllLocalData() {
  await browser.storage.local.clear();
}
