import { analyzeProfile } from '@/services/analyzer';
import { getSettings, setAnalysisState } from '@/services/storage';
import type { ExtensionMessage, ProfileData } from '@/shared/types';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
  });

  browser.runtime.onMessage.addListener((rawMessage, sender) => {
    const message = rawMessage as ExtensionMessage;

    if (message.type === 'OPEN_OPTIONS') {
      return browser.runtime.openOptionsPage();
    }

    if (message.type === 'OPEN_ANALYSIS_PANEL') {
      const tabId = sender.tab?.id;
      if (tabId) {
        browser.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: true }).catch(() => undefined);
        browser.sidePanel.open({ tabId }).catch(() => undefined);
      }
      void setAnalysisState({ status: 'collecting' });
    }

    if (message.type === 'ANALYZE_PROFILE') {
      void runAnalysis(message.profile);
    }
  });
});

async function runAnalysis(profile: ProfileData) {
  await setAnalysisState({ status: 'loading', profile, startedAt: Date.now() });

  try {
    const settings = await getSettings();
    if (!settings.apiKey) throw new Error('请先在设置中配置您自己的大模型 API Key。');
    const result = await analyzeProfile(profile, settings);
    await setAnalysisState({ status: 'success', profile, result, completedAt: Date.now() });
  } catch (error) {
    await setAnalysisState({
      status: 'error',
      profile,
      message: error instanceof Error ? error.message : '分析失败，请稍后重试。',
    });
  }
}
