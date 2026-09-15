import type { InsightResult, ProfileData } from '@/shared/types';

export const HISTORY_KEY = 'profileInsightHistory';
const MAX_HISTORY = 30;

export interface HistoryEntry {
  id: string;
  profile: ProfileData;
  result: InsightResult;
  analyzedAt: number;
}

function entryId(profile: ProfileData) {
  return `${profile.platform}:${profile.handle.toLowerCase()}:${profile.analysisPurpose}`;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const stored = await browser.storage.local.get(HISTORY_KEY);
  return Array.isArray(stored[HISTORY_KEY]) ? stored[HISTORY_KEY] as HistoryEntry[] : [];
}

export async function saveHistory(profile: ProfileData, result: InsightResult) {
  const id = entryId(profile);
  const current = (await getHistory()).filter((entry) => entry.id !== id);
  const entry: HistoryEntry = { id, profile, result, analyzedAt: Date.now() };
  await browser.storage.local.set({ [HISTORY_KEY]: [entry, ...current].slice(0, MAX_HISTORY) });
}

export async function deleteHistoryEntry(id: string) {
  await browser.storage.local.set({ [HISTORY_KEY]: (await getHistory()).filter((entry) => entry.id !== id) });
}

export async function clearHistory() {
  await browser.storage.local.remove(HISTORY_KEY);
}
