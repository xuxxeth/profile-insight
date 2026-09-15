import { useEffect, useState } from 'react';
import { clearAllLocalData, clearApiKey, clearCurrentAnalysis, DEFAULT_SETTINGS, getSettings, saveSettings } from '@/services/storage';
import { ensureApiPermission, revokeOptionalApiPermissions, testConnection } from '@/services/connection-test';
import { clearCache } from '@/services/cache';
import { clearHistory } from '@/services/history';
import { revokePrivacyConsent } from '@/services/privacy';
import type { Settings } from '@/shared/types';

const presets = {
  'openai-compatible': { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-flash-latest' },
} as const;

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS); const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'idle' | 'testing' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const [dataStatus, setDataStatus] = useState('');
  useEffect(() => { void getSettings().then(setSettings); }, []);
  const update = (patch: Partial<Settings>) => setSettings((value) => ({ ...value, ...patch }));
  const chooseProvider = (provider: Settings['provider']) => update({ provider, ...presets[provider] });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await ensureApiPermission(settings.baseUrl);
      await saveSettings(settings);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } catch (error) {
      setTestStatus({ type: 'error', message: error instanceof Error ? error.message : '保存失败' });
    }
  };
  const runTest = async () => {
    setTestStatus({ type: 'testing', message: '正在连接…' });
    try { setTestStatus({ type: 'success', message: await testConnection(settings) }); }
    catch (error) { setTestStatus({ type: 'error', message: error instanceof Error ? error.message : '连接失败' }); }
  };
  const runDataAction = async (label: string, action: () => Promise<void>, confirm = false) => {
    if (confirm && !window.confirm(`确定要${label}吗？此操作无法撤销。`)) return;
    await action();
    setDataStatus(`${label}完成`);
    window.setTimeout(() => setDataStatus(''), 1800);
  };
  return <main><div className="eyebrow">PROFILE INSIGHT · 免费使用</div><h1>连接您的大模型</h1><p className="lead">插件不收取费用。API Key 只保存在当前浏览器中，请求由扩展直接发送给所选模型服务，模型产生的费用由对应服务商收取。</p>
    <form onSubmit={submit}>
      <label>接口类型<select value={settings.provider} onChange={(event) => chooseProvider(event.target.value as Settings['provider'])}><option value="openai-compatible">OpenAI 兼容接口</option><option value="gemini">Google Gemini</option></select></label>
      <label>API Key<input required type="password" value={settings.apiKey} onChange={(event) => update({ apiKey: event.target.value.trim() })} placeholder="请输入您自己的 API Key" autoComplete="off"/></label>
      <label>Base URL<input value={settings.baseUrl} onChange={(event) => update({ baseUrl: event.target.value.trim() })}/></label>
      <label>模型名称<input value={settings.model} onChange={(event) => update({ model: event.target.value.trim() })}/></label>
      <label>输出语言<select value={settings.outputLanguage} onChange={(event) => update({ outputLanguage: event.target.value as Settings['outputLanguage'] })}><option value="zh-CN">简体中文</option><option value="en">English</option></select></label>
      <div className="section-title"><strong>我的业务资料</strong><span>用于生成真正符合您业务的个性化话术，仅保存在本地。</span></div>
      <div className="field-grid"><label>您的称呼<input value={settings.sellerName} onChange={(event) => update({ sellerName: event.target.value })} placeholder="例如：Alex"/></label><label>公司名称<input value={settings.companyName} onChange={(event) => update({ companyName: event.target.value })} placeholder="例如：Acme Trading"/></label></div>
      <label>产品或服务<textarea value={settings.offer} onChange={(event) => update({ offer: event.target.value })} placeholder="您提供什么产品或服务？"/></label>
      <label>核心优势<textarea value={settings.advantages} onChange={(event) => update({ advantages: event.target.value })} placeholder="交期、认证、定制能力、价格或成功案例等"/></label>
      <label>目标客户<input value={settings.targetAudience} onChange={(event) => update({ targetAudience: event.target.value })} placeholder="例如：欧洲消费电子品牌采购负责人"/></label>
      <label>期望对方行动<input value={settings.callToAction} onChange={(event) => update({ callToAction: event.target.value })} placeholder="例如：回复消息或预约 15 分钟通话"/></label>
      <label>禁用表达<input value={settings.bannedWords} onChange={(event) => update({ bannedWords: event.target.value })} placeholder="例如：best price, dear friend, kindly"/></label>
      <div className="note"><strong>插件永久免费 · BYOK</strong><span>支持 Gemini、DeepSeek、OpenAI、Groq、SiliconFlow，以及其他兼容 Chat Completions 的服务。</span></div>
      {testStatus.type !== 'idle' && <div className={`test-status ${testStatus.type}`}>{testStatus.message}</div>}
      <div className="actions"><button className="test" type="button" disabled={testStatus.type === 'testing'} onClick={() => void runTest()}>测试连接</button><button className="save" type="submit">{saved ? '✓ 已保存' : '保存设置'}</button></div>
    </form>
    <section className="data-management"><div><h2>本地数据管理</h2><p>以下数据都保存在当前浏览器中，您可以随时删除。</p></div>{dataStatus && <div className="data-status">✓ {dataStatus}</div>}<div className="data-actions"><button onClick={() => void runDataAction('清除分析缓存', clearCache)}>清除缓存</button><button onClick={() => void runDataAction('清除分析历史', clearHistory, true)}>清除历史</button><button onClick={() => void runDataAction('清除当前结果', clearCurrentAnalysis)}>清除当前结果</button><button onClick={() => void runDataAction('删除 API Key', async () => { await clearApiKey(); setSettings((value) => ({ ...value, apiKey: '' })); }, true)}>删除 API Key</button><button onClick={() => void runDataAction('撤回隐私授权', revokePrivacyConsent)}>撤回隐私授权</button><button className="danger" onClick={() => void runDataAction('删除全部本地数据', async () => { await clearAllLocalData(); await revokeOptionalApiPermissions(); setSettings(DEFAULT_SETTINGS); }, true)}>删除全部数据</button></div></section>
  </main>;
}
