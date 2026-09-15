import { collectXProfile, isXProfilePage } from '@/adapters/platforms/x';
import type { ExtensionMessage } from '@/shared/types';

export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  main() {
    let busy = false;

    const inject = () => {
      if (!isXProfilePage() || document.getElementById('profile-insight-btn')) return;
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

      button.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        button.disabled = true;
        button.textContent = '正在收集动态…';
        try {
          await browser.runtime.sendMessage({ type: 'OPEN_ANALYSIS_PANEL' } satisfies ExtensionMessage);
          const profile = await collectXProfile();
          await browser.runtime.sendMessage({ type: 'ANALYZE_PROFILE', profile } satisfies ExtensionMessage);
          button.textContent = `已收集 ${profile.posts.length} 条动态`;
        } catch (error) {
          button.textContent = error instanceof Error ? error.message : '收集失败，请重试';
        } finally {
          busy = false;
          button.disabled = false;
          window.setTimeout(() => { button.textContent = '⚡ Profile Insight'; }, 2400);
        }
      });

      anchor.appendChild(button);
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
