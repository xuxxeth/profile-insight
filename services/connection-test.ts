import type { Settings } from '@/shared/types';

function apiOriginPattern(baseUrl: string) {
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:') throw new Error('Base URL 必须使用 HTTPS。');
  return `${url.origin}/*`;
}

export async function ensureApiPermission(baseUrl: string) {
  const origin = apiOriginPattern(baseUrl);
  if (await browser.permissions.contains({ origins: [origin] })) return;
  const granted = await browser.permissions.request({ origins: [origin] });
  if (!granted) throw new Error('未获得该 API 域名的访问权限。');
}

export async function revokeOptionalApiPermissions() {
  const permissions = await browser.permissions.getAll();
  const origins = (permissions.origins ?? []).filter((origin) => !origin.includes('x.com') && !origin.includes('twitter.com'));
  if (origins.length) await browser.permissions.remove({ origins });
}

async function errorMessage(response: Response) {
  const value = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  return value?.error?.message || `请求失败（${response.status}）`;
}

export async function testConnection(settings: Settings) {
  if (!settings.apiKey) throw new Error('请先填写 API Key。');
  if (!settings.model) throw new Error('请先填写模型名称。');
  await ensureApiPermission(settings.baseUrl);
  const base = settings.baseUrl.replace(/\/$/, '');

  if (settings.provider === 'gemini') {
    const response = await fetch(`${base}/models/${encodeURIComponent(settings.model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': settings.apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with OK only.' }] }], generationConfig: { maxOutputTokens: 8 } }),
    });
    if (!response.ok) throw new Error(await errorMessage(response));
    return 'Gemini 连接成功';
  }

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({ model: settings.model, messages: [{ role: 'user', content: 'Reply with OK only.' }], max_tokens: 8, temperature: 0 }),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return '模型连接成功';
}
