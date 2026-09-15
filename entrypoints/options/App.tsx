import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '@/services/storage';
import type { Settings } from '@/shared/types';

const presets = {
  'openai-compatible': { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-flash-latest' },
} as const;

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS); const [saved, setSaved] = useState(false);
  useEffect(() => { void getSettings().then(setSettings); }, []);
  const update = (patch: Partial<Settings>) => setSettings((value) => ({ ...value, ...patch }));
  const chooseProvider = (provider: Settings['provider']) => update({ provider, ...presets[provider] });
  const submit = async (event: React.FormEvent) => { event.preventDefault(); await saveSettings(settings); setSaved(true); window.setTimeout(() => setSaved(false), 1600); };
  return <main><div className="eyebrow">PROFILE INSIGHT · 免费使用</div><h1>连接您的大模型</h1><p className="lead">插件不收取费用。API Key 只保存在当前浏览器中，请求由扩展直接发送给所选模型服务，模型产生的费用由对应服务商收取。</p>
    <form onSubmit={submit}>
      <label>接口类型<select value={settings.provider} onChange={(event) => chooseProvider(event.target.value as Settings['provider'])}><option value="openai-compatible">OpenAI 兼容接口</option><option value="gemini">Google Gemini</option></select></label>
      <label>API Key<input required type="password" value={settings.apiKey} onChange={(event) => update({ apiKey: event.target.value.trim() })} placeholder="请输入您自己的 API Key" autoComplete="off"/></label>
      <label>Base URL<input value={settings.baseUrl} onChange={(event) => update({ baseUrl: event.target.value.trim() })}/></label>
      <label>模型名称<input value={settings.model} onChange={(event) => update({ model: event.target.value.trim() })}/></label>
      <label>输出语言<select value={settings.outputLanguage} onChange={(event) => update({ outputLanguage: event.target.value as Settings['outputLanguage'] })}><option value="zh-CN">简体中文</option><option value="en">English</option></select></label>
      <div className="note"><strong>插件永久免费 · BYOK</strong><span>支持 Gemini、DeepSeek、OpenAI、Groq、SiliconFlow，以及其他兼容 Chat Completions 的服务。</span></div>
      <button className="save" type="submit">{saved ? '✓ 已保存' : '保存设置'}</button>
    </form>
  </main>;
}
