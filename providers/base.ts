import type { ProfileData, Settings } from '@/shared/types';

export interface RawInsight {
  tags: string[];
  persona_summary: string;
  icebreaker_suggestions: { bd: string; recruitment: string; general: string };
  language_analysis: { primary_language: string; communication_style: string };
  recent_summary: string;
  recent_topics: Array<{ topic: string; trend: 'rising' | 'stable' | 'declining'; evidence: string }>;
  commercial_signals: Array<{ signal: string; confidence: 'high' | 'medium' | 'low'; evidence: string }>;
  recommended_hook: { post_excerpt: string; reason: string };
  outreach_messages: { x_dm: string; linkedin: string; cold_email: string; follow_up: string };
}

export interface LlmProvider { analyze(profile: ProfileData, settings: Settings): Promise<RawInsight> }

export function profilePrompt(profile: ProfileData, language: Settings['outputLanguage']) {
  const posts = profile.posts.map((post, index) => `${index + 1}. [${post.timestamp ?? '未知时间'}] ${post.text.slice(0, 600)}`).join('\n');
  const analysisLanguage = language === 'zh-CN' ? '简体中文' : '英文';
  return `你正在帮助一名外贸或出海销售人员研究潜在客户。只根据提供的公开资料回答，不得猜测种族、宗教、健康、政治倾向等敏感属性。没有明确证据时，商业信号返回空数组，不要编造。evidence 和 post_excerpt 必须引用或忠实截取动态中的短句。\n\n来源平台: ${profile.platform}\n用户: ${profile.displayName} ${profile.handle}\nBio: ${profile.bio || '无'}\n位置: ${profile.location || '未知'}\n动态列表（从新到旧）:\n${posts || '没有可用动态'}\n\n分析说明使用${analysisLanguage}；outreach_messages 中的四种可发送话术必须使用自然、简洁、非推销腔的英文，并基于具体公开内容个性化。严格返回以下 JSON，不得添加其他文字：\n{"tags":["3-5个标签"],"persona_summary":"一句话职业画像，不做心理诊断","language_analysis":{"primary_language":"主要语言","communication_style":"沟通风格"},"recent_summary":"最近动态重点摘要","recent_topics":[{"topic":"近期主题","trend":"rising|stable|declining","evidence":"证据短句"}],"commercial_signals":[{"signal":"合作、采购、招聘、发布、融资、参展或痛点等明确信号","confidence":"high|medium|low","evidence":"证据短句"}],"recommended_hook":{"post_excerpt":"最适合用于开场的动态短句","reason":"为何适合作为切入点"},"icebreaker_suggestions":{"bd":"中文商务策略","recruitment":"中文招聘策略","general":"中文日常策略"},"outreach_messages":{"x_dm":"可直接发送的简短英文 X 私信","linkedin":"可直接发送的英文 LinkedIn 私信","cold_email":"包含 Subject 的英文 Cold Email","follow_up":"未回复时的简短英文跟进"}}`;
}

export function parseRawInsight(value: unknown): RawInsight {
  const data = typeof value === 'string' ? JSON.parse(value.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()) : value;
  if (!data || typeof data !== 'object') throw new Error('模型没有返回有效 JSON。');
  const candidate = data as Partial<RawInsight>;
  const ice = candidate.icebreaker_suggestions;
  const language = candidate.language_analysis;
  const hook = candidate.recommended_hook;
  const outreach = candidate.outreach_messages;
  if (!Array.isArray(candidate.tags) || !candidate.tags.every((tag) => typeof tag === 'string') || typeof candidate.persona_summary !== 'string' || !ice || typeof ice.bd !== 'string' || typeof ice.recruitment !== 'string' || typeof ice.general !== 'string' || !language || typeof language.primary_language !== 'string' || typeof language.communication_style !== 'string' || typeof candidate.recent_summary !== 'string' || !hook || typeof hook.post_excerpt !== 'string' || typeof hook.reason !== 'string' || !outreach || typeof outreach.x_dm !== 'string' || typeof outreach.linkedin !== 'string' || typeof outreach.cold_email !== 'string' || typeof outreach.follow_up !== 'string') {
    throw new Error('模型返回的数据结构不符合要求。');
  }
  const trends = new Set(['rising', 'stable', 'declining']);
  const confidences = new Set(['high', 'medium', 'low']);
  const recentTopics = Array.isArray(candidate.recent_topics) ? candidate.recent_topics.filter((item) => item && typeof item.topic === 'string' && typeof item.evidence === 'string' && trends.has(item.trend)).slice(0, 5) : [];
  const commercialSignals = Array.isArray(candidate.commercial_signals) ? candidate.commercial_signals.filter((item) => item && typeof item.signal === 'string' && typeof item.evidence === 'string' && confidences.has(item.confidence)).slice(0, 5) : [];
  return { tags: candidate.tags.slice(0, 5), persona_summary: candidate.persona_summary, icebreaker_suggestions: ice, language_analysis: language, recent_summary: candidate.recent_summary, recent_topics: recentTopics, commercial_signals: commercialSignals, recommended_hook: hook, outreach_messages: outreach };
}
