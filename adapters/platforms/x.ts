import type { ProfileData, ProfilePost } from '@/shared/types';

const RESERVED_PATHS = new Set(['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search', 'compose']);
const MAX_POSTS = 100;
const MAX_SCROLL_ROUNDS = 60;
const MAX_UNCHANGED_ROUNDS = 5;

function currentHandle() {
  const handle = location.pathname.split('/').filter(Boolean)[0] ?? '';
  return RESERVED_PATHS.has(handle.toLowerCase()) ? '' : handle;
}

export function isXProfilePage() {
  return Boolean(currentHandle() && document.querySelector('div[data-testid="UserName"]'));
}

function text(selector: string) {
  return document.querySelector<HTMLElement>(selector)?.innerText.trim() ?? '';
}

function readVisiblePosts(handle: string): ProfilePost[] {
  const seen = new Set<string>();
  const posts: ProfilePost[] = [];

  for (const article of document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]')) {
    const statusLink = Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]'))
      .find((link) => link.querySelector('time'));
    const belongsToProfile = Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href]')).some((link) => {
      const href = link.getAttribute('href')?.toLowerCase();
      return href === `/${handle.toLowerCase()}` || href?.startsWith(`/${handle.toLowerCase()}/status/`);
    });
    const textElement = article.querySelector<HTMLElement>('div[data-testid="tweetText"]');
    if (!statusLink || !textElement || !belongsToProfile) continue;
    const postText = textElement.innerText.trim();
    const id = statusLink.getAttribute('href') ?? postText;
    if (!postText || seen.has(id)) continue;
    seen.add(id);
    posts.push({ text: postText, timestamp: article.querySelector('time')?.getAttribute('datetime') ?? null });
  }
  return posts;
}

export async function collectXProfile(): Promise<ProfileData> {
  const handle = currentHandle();
  if (!handle) throw new Error('当前页面不是用户主页');
  const originalY = window.scrollY;
  const collected = new Map<string, ProfilePost>();
  let unchangedRounds = 0;

  for (let round = 0; round < MAX_SCROLL_ROUNDS && collected.size < MAX_POSTS; round += 1) {
    const before = collected.size;
    for (const post of readVisiblePosts(handle)) {
      collected.set(`${post.timestamp}:${post.text}`, post);
      if (collected.size >= MAX_POSTS) break;
    }
    unchangedRounds = collected.size === before ? unchangedRounds + 1 : 0;
    if (unchangedRounds >= MAX_UNCHANGED_ROUNDS) break;
    const visibleArticles = document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]');
    const lastArticle = visibleArticles[visibleArticles.length - 1];
    if (lastArticle) lastArticle.scrollIntoView({ block: 'end', behavior: 'auto' });
    else window.scrollBy({ top: Math.max(window.innerHeight, 800), behavior: 'auto' });
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
  }
  window.scrollTo({ top: originalY, behavior: 'smooth' });

  return {
    platform: 'X',
    displayName: text('div[data-testid="UserName"] span'),
    handle: `@${handle}`,
    bio: text('div[data-testid="UserDescription"]'),
    location: text('span[data-testid="UserLocation"]'),
    profileUrl: `${location.origin}/${handle}`,
    posts: Array.from(collected.values()).slice(0, MAX_POSTS),
  };
}
