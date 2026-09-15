import { analyzeProfile } from '@/services/analyzer';
import { cacheResult, getCachedResult } from '@/services/cache';
import { saveHistory } from '@/services/history';
import { ensureApiPermission } from '@/services/connection-test';
import { getSettings, setAnalysisState } from '@/services/storage';
import type { ExtensionMessage, ProfileData } from '@/shared/types';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
    void setAnalysisState({ status: 'idle' });
  });

  browser.runtime.onMessage.addListener((rawMessage, sender) => {
    const message = rawMessage as ExtensionMessage;

    if (message.type === 'OPEN_OPTIONS') {
      return browser.runtime.openOptionsPage();
    }

    if (message.type === 'REQUEST_API_PERMISSION') {
      return ensureApiPermission(message.baseUrl)
        .then(() => ({ ok: true }))
        .catch((error) => ({ ok: false, message: error instanceof Error ? error.message : '域名授权失败' }));
    }

    if (message.type === 'OPEN_ANALYSIS_PANEL') {
      const tabId = sender.tab?.id;
      if (tabId) {
        browser.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: true }).catch(() => undefined);
        browser.sidePanel.open({ tabId }).catch(() => undefined);
      }
      void setAnalysisState({ status: 'collecting', purpose: message.purpose, collected: 0, tabId });
    }

    if (message.type === 'COLLECTION_PROGRESS') {
      void setAnalysisState({ status: 'collecting', purpose: message.purpose, collected: message.collected, tabId: sender.tab?.id });
    }

    if (message.type === 'CANCEL_COLLECTION' && message.tabId) {
      void browser.tabs.sendMessage(message.tabId, message).catch(() => undefined);
    }

    if (message.type === 'ANALYZE_PROFILE') {
      void runAnalysis(message.profile);
    }

    if (message.type === 'REANALYZE_PROFILE') {
      void runAnalysis(message.profile, true);
    }
  });
});

async function runAnalysis(profile: ProfileData, bypassCache = false) {
  await setAnalysisState({ status: 'loading', profile, startedAt: Date.now() });

  try {
    const settings = await getSettings();
    if (!settings.apiKey) throw new Error('请先在设置中配置您自己的大模型 API Key。');
    if (!bypassCache) {
      const cached = await getCachedResult(profile, settings);
      if (cached) {
        await saveHistory(profile, cached);
        await setAnalysisState({ status: 'success', profile, result: cached, completedAt: Date.now(), cached: true });
        return;
      }
    }
    const result = await analyzeProfile(profile, settings);
    await cacheResult(profile, settings, result);
    await saveHistory(profile, result);
    await setAnalysisState({ status: 'success', profile, result, completedAt: Date.now() });
  } catch (error) {
    await setAnalysisState({
      status: 'error',
      profile,
      message: error instanceof Error ? error.message : '分析失败，请稍后重试。',
    });
  }
}
