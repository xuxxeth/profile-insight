import { getActiveAdapter } from '@/adapters/platforms/registry';
import { hasPrivacyConsent, recordPrivacyConsent } from '@/services/privacy';
import { getSettings } from '@/services/storage';
import type { AnalysisPurpose, ExtensionMessage } from '@/shared/types';

const PURPOSES: Array<{ value: AnalysisPurpose; label: string; icon: string }> = [
  { value: 'sales', label: '寻找客户', icon: '◎' },
  { value: 'partnership', label: '商务合作', icon: '↗' },
  { value: 'recruitment', label: '招聘人才', icon: '◇' },
  { value: 'investment', label: '投资调研', icon: '⌁' },
  { value: 'networking', label: '日常交流', icon: '✦' },
];

async function requestPrivacyConsent() {
  if (await hasPrivacyConsent()) return true;
  return new Promise<boolean>((resolve) => {
    document.getElementById('profile-insight-consent')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'profile-insight-consent';
    Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '2147483647', display: 'grid', placeItems: 'center', padding: '20px', background: 'rgba(5,6,10,.72)', backdropFilter: 'blur(5px)' });
    const dialog = document.createElement('div');
    Object.assign(dialog.style, { width: 'min(440px,100%)', padding: '24px', borderRadius: '18px', border: '1px solid #353a4d', background: '#11131b', color: '#eef0f8', boxShadow: '0 24px 80px rgba(0,0,0,.55)', fontFamily: 'Inter,system-ui,sans-serif' });
    dialog.innerHTML = `<div style="color:#93a0ff;font-size:11px;font-weight:800;letter-spacing:.12em">首次分析前确认</div><h2 style="font-size:20px;margin:10px 0">公开主页数据如何处理</h2><p style="color:#b4b8c6;font-size:13px;line-height:1.7;margin:0">插件将读取当前主页的公开资料与动态，并发送到您配置的大模型服务进行分析。API Key、设置和分析结果保存在此浏览器本地，插件开发者不运营中转服务器，也不会接收这些数据。</p><p style="color:#777d91;font-size:11px;line-height:1.6">数据处理同时受您所选大模型服务商的隐私政策约束。请仅分析您有权处理的公开信息。</p>`;
    const actions = document.createElement('div');
    Object.assign(actions.style, { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '9px', marginTop: '18px' });
    const cancel = document.createElement('button');
    cancel.textContent = '取消';
    const accept = document.createElement('button');
    accept.textContent = '同意并继续';
    Object.assign(cancel.style, { padding: '11px', borderRadius: '10px', border: '1px solid #353a4d', background: '#1a1d27', color: '#b9becf', cursor: 'pointer' });
    Object.assign(accept.style, { padding: '11px', borderRadius: '10px', border: '0', background: 'linear-gradient(135deg,#536dfe,#8b5cf6)', color: '#fff', fontWeight: '700', cursor: 'pointer' });
    cancel.onclick = () => { overlay.remove(); resolve(false); };
    accept.onclick = async () => { await recordPrivacyConsent(); overlay.remove(); resolve(true); };
    actions.append(cancel, accept); dialog.appendChild(actions); overlay.appendChild(dialog); document.body.appendChild(overlay);
  });
}

export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  main() {
    let busy = false;
    let cancelRequested = false;

    browser.runtime.onMessage.addListener((rawMessage) => {
      const message = rawMessage as ExtensionMessage;
      if (message.type === 'CANCEL_COLLECTION') cancelRequested = true;
    });

    const inject = () => {
      const adapter = getActiveAdapter();
      if (!adapter || document.getElementById('profile-insight-btn')) return;
      const anchor = document.querySelector<HTMLElement>('div[data-testid="UserName"]');
      if (!anchor) return;

      const button = document.createElement('button');
      button.id = 'profile-insight-btn';
      button.type = 'button';
      button.textContent = '⚡ Profile Insight';
      button.setAttribute('aria-label', 'Analyze this profile with Profile Insight');
      Object.assign(button.style, {
        marginTop: '10px', padding: '7px 12px', borderRadius: '9999px', border: '1px solid #536dfe',
        background: 'linear-gradient(135deg,#536dfe,#8b5cf6)', color: '#fff', fontWeight: '700',
        fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(83,109,254,.28)',
      });

      const menu = document.createElement('div');
      document.getElementById('profile-insight-purpose-menu')?.remove();
      menu.id = 'profile-insight-purpose-menu';
      Object.assign(menu.style, {
        display: 'none', position: 'fixed', zIndex: '2147483647', width: '168px',
        padding: '7px', borderRadius: '13px', border: '1px solid #303546', background: '#11131b',
        boxShadow: '0 14px 40px rgba(0,0,0,.55)', isolation: 'isolate',
      });

      const runAnalysis = async (purpose: AnalysisPurpose) => {
        if (busy) return;
        menu.style.display = 'none';
        busy = true;
        cancelRequested = false;
        try {
          if (!await requestPrivacyConsent()) return;
          const settings = await getSettings();
          if (!settings.apiKey) {
            await browser.runtime.sendMessage({ type: 'OPEN_OPTIONS' } satisfies ExtensionMessage);
            throw new Error('请先配置大模型 API');
          }
          const permission = await browser.runtime.sendMessage({ type: 'REQUEST_API_PERMISSION', baseUrl: settings.baseUrl } satisfies ExtensionMessage) as { ok: boolean; message?: string };
          if (!permission?.ok) throw new Error(permission?.message || '未获得模型 API 域名权限');
          button.disabled = true;
          button.textContent = '正在收集动态…';
          await browser.runtime.sendMessage({ type: 'OPEN_ANALYSIS_PANEL', purpose } satisfies ExtensionMessage);
          const profile = await adapter.collectProfile(purpose, {
            isCancelled: () => cancelRequested,
            onProgress: (collected) => {
              button.textContent = `正在收集 ${collected}/100…`;
              void browser.runtime.sendMessage({ type: 'COLLECTION_PROGRESS', purpose, collected } satisfies ExtensionMessage);
            },
          });
          if (!profile.posts.length) throw new Error('没有收集到可分析的动态');
          await browser.runtime.sendMessage({ type: 'ANALYZE_PROFILE', profile } satisfies ExtensionMessage);
          button.textContent = `已收集 ${profile.posts.length} 条动态`;
        } catch (error) {
          button.textContent = error instanceof Error ? error.message : '收集失败，请重试';
        } finally {
          busy = false;
          button.disabled = false;
          window.setTimeout(() => { button.textContent = '⚡ Profile Insight'; }, 2400);
        }
      };

      for (const purpose of PURPOSES) {
        const option = document.createElement('button');
        option.type = 'button';
        option.textContent = `${purpose.icon}  ${purpose.label}`;
        Object.assign(option.style, {
          display: 'block', width: '100%', padding: '9px 10px', border: '0', borderRadius: '8px',
          background: 'transparent', color: '#e8eaf6', textAlign: 'left', fontSize: '13px', cursor: 'pointer',
        });
        option.addEventListener('mouseenter', () => { option.style.background = '#25293a'; });
        option.addEventListener('mouseleave', () => { option.style.background = 'transparent'; });
        option.addEventListener('click', () => { void runAnalysis(purpose.value); });
        menu.appendChild(option);
      }

      button.addEventListener('click', () => {
        if (busy) return;
        if (menu.style.display !== 'none') {
          menu.style.display = 'none';
          return;
        }
        const rect = button.getBoundingClientRect();
        const left = Math.min(Math.max(8, rect.left), window.innerWidth - 176);
        menu.style.left = `${left}px`;
        menu.style.top = `${Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 230))}px`;
        menu.style.display = 'block';
      });

      anchor.style.position = 'relative';
      anchor.appendChild(button);
      document.body.appendChild(menu);
    };

    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) lastUrl = location.href;
      inject();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    inject();
  },
});
