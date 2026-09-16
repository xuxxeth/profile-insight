import { useEffect, useState } from 'react';
import { ANALYSIS_KEY, getAnalysisState } from '@/services/storage';
import type { AnalysisState } from '@/shared/types';
import { deleteHistoryEntry, getHistory, HISTORY_KEY, type HistoryEntry } from '@/services/history';

function SettingsButton() {
  return <button className="icon-button" onClick={() => browser.runtime.openOptionsPage()} title="设置">⚙</button>;
}

function Skeleton() {
  return <div className="skeleton-wrap"><div className="skeleton short"/><div className="skeleton title"/><div className="skeleton"/><div className="skeleton"/><div className="skeleton card"/></div>;
}

export default function App() {
  const [state, setState] = useState<AnalysisState>({ status: 'idle' });
  const [view, setView] = useState<'analysis' | 'history'>('analysis');
  useEffect(() => {
    void getAnalysisState().then(setState);
    const listener = (changes: Record<string, Browser.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[ANALYSIS_KEY]) setState((changes[ANALYSIS_KEY].newValue as AnalysisState | undefined) ?? { status: 'idle' });
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  return <main>
    <header><div><div className="brand">PROFILE INSIGHT · 免费</div><div className="subtitle">使用您自己的大模型 API</div></div><div className="header-actions"><button className={`icon-button history-button ${view === 'history' ? 'active' : ''}`} onClick={() => setView(view === 'history' ? 'analysis' : 'history')} title="分析历史">{view === 'history' ? '←' : '☷'}</button><SettingsButton/></div></header>

    {view === 'history' ? <HistoryView onOpen={(entry) => { setState({ status: 'success', profile: entry.profile, result: entry.result, completedAt: entry.analyzedAt, cached: true }); setView('analysis'); }}/> : <>

    {state.status === 'idle' && <section className="empty">
      <div className="bolt">⚡</div><h1>等待分析</h1><p>请先配置大模型 API，然后打开 X 或 LinkedIn 用户主页并点击 Profile Insight 按钮。</p>
      <button className="primary" onClick={() => browser.runtime.openOptionsPage()}>配置大模型 API</button>
    </section>}

    {state.status === 'collecting' && <section className="collecting"><div className="profile-line"><span className="avatar">↻</span><div><strong>{state.stage || '正在收集公开动态'}</strong><small>{purposeName(state.purpose)} · 已加载 {state.loaded ?? state.collected} 条，提取 {state.collected} 条有效动态</small></div></div><div className="progress"><span style={{ width: `${Math.max(3, state.collected)}%` }}/></div><p>页面会自动滚动，达到 100 条或确认没有更多动态时开始分析。</p>{state.profileUrl && <a className="return-profile" href={state.profileUrl} target="_blank" rel="noreferrer">打开个人主页 ↗</a>}{state.collected > 0 && <button className="secondary" onClick={() => browser.runtime.sendMessage({ type: 'CANCEL_COLLECTION', tabId: state.tabId })}>停止并分析已有 {state.collected} 条</button>}<Skeleton/></section>}

    {state.status === 'loading' && <><div className="profile-line"><span className="avatar">{state.profile.displayName.slice(0, 1) || '?'}</span><div><strong>{state.profile.displayName}</strong><small>{state.profile.handle} · 正在分析 {state.profile.posts.length} 条动态</small></div></div><Skeleton/></>}

    {state.status === 'error' && <section className="empty error"><div className="bolt">!</div><h1>分析没有完成</h1><p>{state.message}</p>{state.tabId && state.purpose && <button className="primary" onClick={() => browser.runtime.sendMessage({ type: 'RETRY_COLLECTION', tabId: state.tabId })}>重新加载并继续采集</button>}{state.profileUrl && <a className="error-link" href={state.profileUrl} target="_blank" rel="noreferrer">打开个人主页 ↗</a>}<button className="secondary" onClick={() => browser.runtime.openOptionsPage()}>检查模型设置</button></section>}

    {state.status === 'success' && <Result state={state}/>} 
    </>}
  </main>;
}

function HistoryView({ onOpen }: { onOpen: (entry: HistoryEntry) => void }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState('');
  const load = () => { void getHistory().then(setHistory); };
  useEffect(() => {
    load();
    const listener = (changes: Record<string, Browser.storage.StorageChange>, area: string) => { if (area === 'local' && changes[HISTORY_KEY]) load(); };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);
  const filtered = history.filter((entry) => `${entry.profile.displayName} ${entry.profile.handle} ${entry.profile.platform}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="history-view"><div className="history-title"><div><h1>分析历史</h1><p>最近保存的 {history.length} 位联系人</p></div></div><input className="history-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名或账号"/>{filtered.length ? <div className="history-list">{filtered.map((entry) => <div className="history-item" key={entry.id}><button className="history-main" onClick={() => onOpen(entry)}><span className="avatar">{entry.profile.displayName.slice(0, 1) || '?'}</span><span><strong>{entry.profile.displayName || entry.profile.handle}</strong><small>{entry.profile.platform} · {purposeName(entry.profile.analysisPurpose)} · {new Date(entry.analyzedAt).toLocaleDateString()}</small></span></button><button className="history-delete" title="删除" onClick={() => void deleteHistoryEntry(entry.id)}>×</button></div>)}</div> : <div className="history-empty">{history.length ? '没有匹配的记录' : '完成一次分析后，客户会出现在这里。'}</div>}</section>;
}

function Result({ state }: { state: Extract<AnalysisState, { status: 'success' }> }) {
  const { profile, result } = state;
  const trendLabel = { rising: '升温', stable: '稳定', declining: '降温' } as const;
  const confidenceLabel = { high: '强信号', medium: '中等', low: '弱信号' } as const;
  return <>
    <div className="profile-line"><span className="avatar">{profile.displayName.slice(0, 1) || '?'}</span><div><strong>{profile.displayName || profile.handle}</strong><small>{profile.handle} · {profile.posts.length} 条样本</small></div><span className="mode">{state.cached ? '缓存' : 'AI'}</span></div>
    {state.cached && <button className="refresh" onClick={() => browser.runtime.sendMessage({ type: 'REANALYZE_PROFILE', profile })}>↻ 忽略缓存，重新调用模型分析</button>}
    <div className="tags">{result.tags.map((tag) => <span key={tag}>#{tag.replace(/^#/, '')}</span>)}</div>
    <section className="panel persona"><label>客户概览</label><p>{result.personaSummary}</p><div className="meta-line"><span>主要语言</span><strong>{result.language.primary}</strong></div><div className="meta-line"><span>沟通风格</span><strong>{result.language.communicationStyle}</strong></div></section>

    <section className="panel"><label>最近在关注什么</label><p className="summary">{result.recentSummary}</p>{result.recentTopics.map((item) => <div className="insight-row" key={`${item.topic}-${item.evidence}`}><div><strong>{item.topic}</strong><span className={`trend ${item.trend}`}>{trendLabel[item.trend]}</span></div><small>“{item.evidence}”</small><SourceLink url={item.sourceUrl}/></div>)}</section>

    <section className="panel"><label>商业意图信号</label>{result.commercialSignals.length ? result.commercialSignals.map((item) => <div className="signal" key={`${item.signal}-${item.evidence}`}><div><strong>{item.signal}</strong><span className={`confidence ${item.confidence}`}>{confidenceLabel[item.confidence]}</span></div><p>“{item.evidence}”</p><SourceLink url={item.sourceUrl}/></div>) : <p className="muted">近期公开内容中没有发现足够明确的商业信号。</p>}</section>

    <section className="panel hook"><label>推荐切入动态</label><blockquote>“{result.recommendedHook.postExcerpt}”</blockquote><p>{result.recommendedHook.reason}</p><SourceLink url={result.recommendedHook.sourceUrl}/></section>

    <section className="panel"><label>高频活跃时段</label><div className="time-row"><span>对方当地</span><strong>{result.activity.targetLabel}</strong></div><div className="time-row"><span>我的当地</span><strong>{result.activity.viewerLabel}</strong></div><small className="hint">基于 {result.activity.sampleSize} 条带时间动态 · 对方时区{result.activity.targetTimeZone ? `推测为 ${result.activity.targetTimeZone}` : '未知，暂按我的时区计算'}</small></section>

    <section className="panel"><label>中文沟通策略</label><Suggestion icon="↗" title="商务合作" text={result.icebreakers.bd}/><Suggestion icon="✦" title="自然交流" text={result.icebreakers.general}/></section>

    <section className="panel messages"><label>可直接发送的英文话术</label><CopyMessage title="X 私信" text={result.outreachMessages.xDm}/><CopyMessage title="LinkedIn 私信" text={result.outreachMessages.linkedin}/><CopyMessage title="Cold Email" text={result.outreachMessages.coldEmail}/><CopyMessage title="未回复跟进" text={result.outreachMessages.followUp}/></section>
    <p className="disclaimer">分析仅基于公开内容，可能存在偏差，请勿用于推断敏感属性。</p>
  </>;
}

function purposeName(purpose: import('@/shared/types').AnalysisPurpose) {
  return { sales: '寻找客户', partnership: '商务合作', recruitment: '招聘人才', investment: '投资调研', networking: '日常交流' }[purpose];
}

function SourceLink({ url }: { url: string }) {
  return url ? <a className="source-link" href={url} target="_blank" rel="noreferrer">查看原动态 ↗</a> : null;
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
