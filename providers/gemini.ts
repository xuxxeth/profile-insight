import { parseRawInsight, profilePrompt, type LlmProvider } from './base';

export const geminiProvider: LlmProvider = {
  async analyze(profile, settings) {
    const base = settings.baseUrl.replace(/\/$/, '') || 'https://generativelanguage.googleapis.com/v1beta';
    const models = settings.model === 'gemini-flash-latest'
      ? [settings.model, 'gemini-3.1-flash-lite']
      : [settings.model];
    let parseError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: `你是谨慎的社交行为分析助手。只依据给定公开内容总结，不推断敏感属性。只输出完整、有效且字段齐全的 JSON。${attempt ? '上一次输出无法解析，这一次务必检查 JSON 闭合和所有必填字段。' : ''}` }] },
        contents: [{ role: 'user', parts: [{ text: profilePrompt(profile, settings) }] }],
        generationConfig: { temperature: attempt === 0 ? 0.3 : 0, responseMimeType: 'application/json' },
      });

      for (const [index, model] of models.entries()) {
        const response = await fetch(`${base}/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-goog-api-key': settings.apiKey },
          body,
        });
        if (response.ok) {
          const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
          try {
            return parseRawInsight(json.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
          } catch (error) {
            parseError = error;
            break;
          }
        }

        const error = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        const isTemporaryCapacityError = response.status === 429 || response.status === 503;
        if (!isTemporaryCapacityError || index === models.length - 1) {
          throw new Error(error?.error?.message || `Gemini 请求失败（${response.status}），请检查 API 配置。`);
        }
      }
    }

    throw parseError instanceof Error ? parseError : new Error('Gemini 输出无法解析。');
  },
};
