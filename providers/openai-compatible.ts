import { parseRawInsight, profilePrompt, type LlmProvider } from './base';

export const openAiCompatibleProvider: LlmProvider = {
  async analyze(profile, settings) {
    const response = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: '你是谨慎的社交行为分析助手。只依据给定公开内容进行总结，不推断敏感属性。必须只输出有效 JSON。' },
          { role: 'user', content: profilePrompt(profile, settings.outputLanguage) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`模型接口请求失败（${response.status}），请检查 API 配置。`);
    const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return parseRawInsight(json.choices?.[0]?.message?.content ?? '');
  },
};
