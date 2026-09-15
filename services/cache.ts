import type { InsightResult, ProfileData, Settings } from '@/shared/types';

const CACHE_KEY = 'profileInsightResultCache';
const MAX_AGE = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 30;

interface CacheEntry { key: string; result: InsightResult; createdAt: number }

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function cacheKey(profile: ProfileData, settings: Settings) {
  const content = profile.posts.map((post) => `${post.url}:${post.timestamp}:${post.text}`).join('|');
  const context = [settings.provider, settings.baseUrl, settings.model, settings.outputLanguage, settings.sellerName, settings.companyName, settings.offer, settings.advantages, settings.targetAudience, settings.callToAction, settings.bannedWords].join('|');
  return `${profile.platform}:${profile.handle}:${profile.analysisPurpose}:${hash(content)}:${hash(context)}`;
}

async function entries() {
  const stored = await browser.storage.local.get(CACHE_KEY);
  const values = Array.isArray(stored[CACHE_KEY]) ? stored[CACHE_KEY] as CacheEntry[] : [];
  return values.filter((entry) => Date.now() - entry.createdAt < MAX_AGE);
}

export async function getCachedResult(profile: ProfileData, settings: Settings) {
  return (await entries()).find((entry) => entry.key === cacheKey(profile, settings))?.result ?? null;
}

export async function cacheResult(profile: ProfileData, settings: Settings, result: InsightResult) {
  const key = cacheKey(profile, settings);
  const current = (await entries()).filter((entry) => entry.key !== key);
  await browser.storage.local.set({ [CACHE_KEY]: [{ key, result, createdAt: Date.now() }, ...current].slice(0, MAX_ENTRIES) });
}

export async function clearCache() {
  await browser.storage.local.remove(CACHE_KEY);
}
