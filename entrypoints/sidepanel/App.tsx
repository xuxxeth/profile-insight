import { useEffect, useState } from 'react';
import { ANALYSIS_KEY, getAnalysisState } from '@/services/storage';
import type { AnalysisState } from '@/shared/types';

function SettingsButton() {
  return <button className="icon-button" onClick={() => browser.runtime.openOptionsPage()} title="设置">⚙</button>;
}

function Skeleton() {
  return <div className="skeleton-wrap"><div className="skeleton short"/><div className="skeleton title"/><div className="skeleton"/><div className="skeleton"/><div className="skeleton card"/></div>;
}

export default function App() {
  const [state, setState] = useState<AnalysisState>({ status: 'idle' });
  useEffect(() => {
    void getAnalysisState().then(setState);
    const listener = (changes: Record<string, Browser.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[ANALYSIS_KEY]?.newValue) setState(changes[ANALYSIS_KEY].newValue as AnalysisState);
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  return <main>
    <header><div><div className="brand">PROFILE INSIGHT · 免费</div><div className="subtitle">使用您自己的大模型 API</div></div><SettingsButton/></header>

    {state.status === 'idle' && <section className="empty">
      <div className="bolt">⚡</div><h1>等待分析</h1><p>请先配置大模型 API，然后打开一个 X 用户主页并点击 Profile Insight 按钮。</p>
      <button className="primary" onClick={() => browser.runtime.openOptionsPage()}>配置大模型 API</button>
    </section>}

    {state.status === 'collecting' && <><div className="profile-line"><span className="avatar">↻</span><div><strong>正在收集公开动态</strong><small>页面会自动向下滚动，最多读取最近 100 条</small></div></div><Skeleton/></>}

    {state.status === 'loading' && <><div className="profile-line"><span className="avatar">{state.profile.displayName.slice(0, 1) || '?'}</span><div><strong>{state.profile.displayName}</strong><small>{state.profile.handle} · 正在分析 {state.profile.posts.length} 条动态</small></div></div><Skeleton/></>}

    {state.status === 'error' && <section className="empty error"><div className="bolt">!</div><h1>分析没有完成</h1><p>{state.message}</p><button className="primary" onClick={() => browser.runtime.openOptionsPage()}>检查模型设置</button></section>}

    {state.status === 'success' && <Result state={state}/>} 
  </main>;
}

function Result({ state }: { state: Extract<AnalysisState, { status: 'success' }> }) {
  const { profile, result } = state;
  const trendLabel = { rising: '升温', stable: '稳定', declining: '降温' } as const;
  const confidenceLabel = { high: '强信号', medium: '中等', low: '弱信号' } as const;
  return <>
    <div className="profile-line"><span className="avatar">{profile.displayName.slice(0, 1) || '?'}</span><div><strong>{profile.displayName || profile.handle}</strong><small>{profile.handle} · {profile.posts.length} 条样本</small></div><span className="mode">AI</span></div>
    <div className="tags">{result.tags.map((tag) => <span key={tag}>#{tag.replace(/^#/, '')}</span>)}</div>
    <section className="panel persona"><label>客户概览</label><p>{result.personaSummary}</p><div className="meta-line"><span>主要语言</span><strong>{result.language.primary}</strong></div><div className="meta-line"><span>沟通风格</span><strong>{result.language.communicationStyle}</strong></div></section>

    <section className="panel"><label>最近在关注什么</label><p className="summary">{result.recentSummary}</p>{result.recentTopics.map((item) => <div className="insight-row" key={`${item.topic}-${item.evidence}`}><div><strong>{item.topic}</strong><span className={`trend ${item.trend}`}>{trendLabel[item.trend]}</span></div><small>“{item.evidence}”</small></div>)}</section>

    <section className="panel"><label>商业意图信号</label>{result.commercialSignals.length ? result.commercialSignals.map((item) => <div className="signal" key={`${item.signal}-${item.evidence}`}><div><strong>{item.signal}</strong><span className={`confidence ${item.confidence}`}>{confidenceLabel[item.confidence]}</span></div><p>“{item.evidence}”</p></div>) : <p className="muted">近期公开内容中没有发现足够明确的商业信号。</p>}</section>

    <section className="panel hook"><label>推荐切入动态</label><blockquote>“{result.recommendedHook.postExcerpt}”</blockquote><p>{result.recommendedHook.reason}</p></section>

    <section className="panel"><label>高频活跃时段</label><div className="time-row"><span>对方当地</span><strong>{result.activity.targetLabel}</strong></div><div className="time-row"><span>我的当地</span><strong>{result.activity.viewerLabel}</strong></div><small className="hint">基于 {result.activity.sampleSize} 条带时间动态 · 对方时区{result.activity.targetTimeZone ? `推测为 ${result.activity.targetTimeZone}` : '未知，暂按我的时区计算'}</small></section>

    <section className="panel"><label>中文沟通策略</label><Suggestion icon="↗" title="商务合作" text={result.icebreakers.bd}/><Suggestion icon="✦" title="自然交流" text={result.icebreakers.general}/></section>

    <section className="panel messages"><label>可直接发送的英文话术</label><CopyMessage title="X 私信" text={result.outreachMessages.xDm}/><CopyMessage title="LinkedIn 私信" text={result.outreachMessages.linkedin}/><CopyMessage title="Cold Email" text={result.outreachMessages.coldEmail}/><CopyMessage title="未回复跟进" text={result.outreachMessages.followUp}/></section>
    <p className="disclaimer">分析仅基于公开内容，可能存在偏差，请勿用于推断敏感属性。</p>
  </>;
}

function Suggestion({ icon, title, text }: { icon: string; title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1200); };
  return <div className="suggestion"><div className="suggestion-title"><span>{icon} {title}</span><button onClick={copy}>{copied ? '已复制' : '复制'}</button></div><p>{text}</p></div>;
}

function CopyMessage({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1200); };
  return <div className="message-card"><div><strong>{title}</strong><button onClick={copy}>{copied ? '✓ 已复制' : '复制英文'}</button></div><p>{text}</p></div>;
}
