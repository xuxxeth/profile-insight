import { parseRawInsight, profilePrompt, type LlmProvider } from './base';

export const openAiCompatibleProvider: LlmProvider = {
  async analyze(profile, settings) {
    let parseError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
        body: JSON.stringify({
          model: settings.model,
          temperature: attempt === 0 ? 0.3 : 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: `你是谨慎的社交行为分析助手。只依据给定公开内容进行总结，不推断敏感属性。必须只输出完整、有效且字段齐全的 JSON。${attempt ? '上一次输出无法解析，这一次务必检查 JSON 闭合和所有必填字段。' : ''}` },
            { role: 'user', content: profilePrompt(profile, settings) },
          ],
        }),
      });
      if (!response.ok) throw new Error(`模型接口请求失败（${response.status}），请检查 API 配置。`);
      const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      try {
        return parseRawInsight(json.choices?.[0]?.message?.content ?? '');
      } catch (error) {
        parseError = error;
      }
    }
    throw parseError instanceof Error ? parseError : new Error('模型输出无法解析。');
  },
};
