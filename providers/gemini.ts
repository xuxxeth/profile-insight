import { parseRawInsight, profilePrompt, type LlmProvider } from './base';

export const geminiProvider: LlmProvider = {
  async analyze(profile, settings) {
    const base = settings.baseUrl.replace(/\/$/, '') || 'https://generativelanguage.googleapis.com/v1beta';
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: '你是谨慎的社交行为分析助手。只依据给定公开内容总结，不推断敏感属性。只输出 JSON。' }] },
      contents: [{ role: 'user', parts: [{ text: profilePrompt(profile, settings.outputLanguage) }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
    });
    const models = settings.model === 'gemini-flash-latest'
      ? [settings.model, 'gemini-3.1-flash-lite']
      : [settings.model];

    for (const [index, model] of models.entries()) {
      const response = await fetch(`${base}/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': settings.apiKey },
        body,
      });
      if (response.ok) {
        const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        return parseRawInsight(json.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
      }

      const error = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      const isTemporaryCapacityError = response.status === 429 || response.status === 503;
      if (!isTemporaryCapacityError || index === models.length - 1) {
        throw new Error(error?.error?.message || `Gemini 请求失败（${response.status}），请检查 API 配置。`);
      }
    }

    throw new Error('Gemini 暂时不可用，请稍后重试。');
  },
};
