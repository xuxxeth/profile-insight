import { geminiProvider } from '@/providers/gemini';
import { openAiCompatibleProvider } from '@/providers/openai-compatible';
import type { ProfileData, Settings, InsightResult } from '@/shared/types';
import { analyzeActivity } from './activity-time';

export async function analyzeProfile(profile: ProfileData, settings: Settings): Promise<InsightResult> {
  const activity = analyzeActivity(profile.posts, profile.location);
  const raw = await (settings.provider === 'gemini' ? geminiProvider : openAiCompatibleProvider).analyze(profile, settings);
  const resolveSourceUrl = (suggested: string, evidence: string) => {
    const exact = profile.posts.find((post) => post.url === suggested);
    if (exact) return exact.url;
    return profile.posts.find((post) => evidence && post.text.includes(evidence.replace(/^“|”$/g, '')))?.url ?? '';
  };
  return {
    tags: raw.tags,
    personaSummary: raw.persona_summary,
    icebreakers: raw.icebreaker_suggestions,
    language: { primary: raw.language_analysis.primary_language, communicationStyle: raw.language_analysis.communication_style },
    recentSummary: raw.recent_summary,
    recentTopics: raw.recent_topics.map((item) => ({ topic: item.topic, trend: item.trend, evidence: item.evidence, sourceUrl: resolveSourceUrl(item.source_url, item.evidence) })),
    commercialSignals: raw.commercial_signals.map((item) => ({ signal: item.signal, confidence: item.confidence, evidence: item.evidence, sourceUrl: resolveSourceUrl(item.source_url, item.evidence) })),
    recommendedHook: { postExcerpt: raw.recommended_hook.post_excerpt, reason: raw.recommended_hook.reason, sourceUrl: resolveSourceUrl(raw.recommended_hook.source_url, raw.recommended_hook.post_excerpt) },
    outreachMessages: { xDm: raw.outreach_messages.x_dm, linkedin: raw.outreach_messages.linkedin, coldEmail: raw.outreach_messages.cold_email, followUp: raw.outreach_messages.follow_up },
    activity,
  };
}
