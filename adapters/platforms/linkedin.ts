import type { AnalysisPurpose, ProfileData, ProfilePost, ProfilePostKind } from '@/shared/types';
import type { CollectionControls, PlatformAdapter } from './base';

const MAX_POSTS = 100;
const MAX_SCROLL_ROUNDS = 80;
const MAX_UNCHANGED_ROUNDS = 12;
const MAX_COLLECTION_MS = 150_000;
const SUMMARY_KEY = 'profile-insight-linkedin-summary';

interface LinkedInSummary {
  slug: string;
  displayName: string;
  bio: string;
  location: string;
  profileUrl: string;
}

function profileEntity() {
  const personal = location.pathname.match(/^\/in\/([^/]+)/i);
  if (personal?.[1]) return { kind: 'person' as const, slug: personal[1], basePath: `/in/${personal[1]}` };
  const company = location.pathname.match(/^\/company\/([^/]+)/i);
  if (company?.[1]) return { kind: 'company' as const, slug: company[1], basePath: `/company/${company[1]}` };
  return null;
}

function profileSlug() {
  return profileEntity()?.slug ?? '';
}

function isActivityPage() {
  return /^\/in\/[^/]+\/recent-activity\/(?:all|posts|comments|reactions)\/?$/i.test(location.pathname)
    || /^\/company\/[^/]+\/posts\/?$/i.test(location.pathname);
}

function isAuthWall() {
  return Boolean(document.querySelector('form[action*="login"], input[name="session_key"]'))
    || /(?:authwall|signup|login)/i.test(location.pathname);
}

function firstText(selectors: string[]) {
  for (const selector of selectors) {
    const value = document.querySelector<HTMLElement>(selector)?.innerText.trim();
    if (value) return value;
  }
  return '';
}

function readProfileSummary(): LinkedInSummary {
  const entity = profileEntity();
  const slug = entity?.slug ?? '';
  const stored = sessionStorage.getItem(SUMMARY_KEY);
  let previous: Partial<LinkedInSummary> = {};
  try { previous = stored ? JSON.parse(stored) as LinkedInSummary : {}; } catch { /* ignore stale data */ }
  const heading = firstText([
    'main [id$="Topcard"] h2',
    'main .update-components-actor__title span[dir="ltr"]',
    'main h1',
  ]);
  const displayName = heading.replace(/(?:’s|'s)?\s+(?:Activity|动态).*$/i, '').trim();
  return {
    slug,
    displayName: displayName || previous.displayName || slug,
    bio: firstText([
      'main [id$="About"] [data-testid="expandable-text-box"]',
      'main .text-body-medium.break-words',
      'main [data-generated-suggestion-target]',
    ]) || previous.bio || '',
    location: firstText(['main .text-body-small.inline.t-black--light.break-words', 'main [class*="top-card"] [class*="location"]']) || previous.location || '',
    profileUrl: `${location.origin}${entity?.basePath ?? `/in/${slug}`}/`,
  };
}

function rememberProfileSummary() {
  const summary = readProfileSummary();
  sessionStorage.setItem(SUMMARY_KEY, JSON.stringify(summary));
}

function cleanProfilePath(pathname: string) {
  return pathname.replace(/\/+$/, '').toLowerCase();
}

function isOwnedByProfile(container: HTMLElement, slug: string) {
  const expected = (profileEntity()?.basePath ?? `/in/${slug}`).toLowerCase();
  const actorSelectors = [
    '.update-components-actor__meta-link[href]',
    '.update-components-actor__image[href]',
    'a[aria-label*="职业档案"][href]',
    'a[aria-label*="profile"][href]',
  ];
  for (const selector of actorSelectors) {
    const actor = container.querySelector<HTMLAnchorElement>(selector);
    if (!actor) continue;
    try { return cleanProfilePath(new URL(actor.href).pathname) === expected; } catch { return false; }
  }
  return Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"], a[href*="/company/"]')).some((link) => {
    try { return cleanProfilePath(new URL(link.href).pathname) === expected; } catch { return false; }
  });
}

function classifyPost(container: HTMLElement, text: string): ProfilePostKind {
  const content = container.innerText.toLowerCase();
  if (/(reposted|转发了|轉發了|分享了这篇|分享了這篇)/i.test(content)) return 'repost';
  if (container.querySelector('a[href*="/pulse/"], a[href*="/newsletter/"]')) return 'article';
  if (container.querySelector('video, [data-view-name*="video"], [class*="video"]')) return 'video';
  if (container.querySelector('[data-view-name*="document"], iframe[src*="document"], a[href*="document"]')) return 'document';
  if (container.querySelector('img:not(.update-components-actor__avatar-image)')) return 'image';
  if (/commented on|评论了|評論了/i.test(content.slice(0, Math.max(160, text.length)))) return 'comment';
  return 'post';
}

function parseRelativeTime(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  const match = normalized.match(/(\d+)\s*(秒|分钟|小时|天|周|个月|月|年|mo|yr|s|m|h|d|w|y)(?:\b|前|ago|$)/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  const milliseconds: Record<string, number> = {
    '秒': 1_000, s: 1_000, '分钟': 60_000, m: 60_000, '小时': 3_600_000, h: 3_600_000,
    '天': 86_400_000, d: 86_400_000, '周': 604_800_000, w: 604_800_000,
    '个月': 2_629_800_000, '月': 2_629_800_000, mo: 2_629_800_000,
    '年': 31_557_600_000, yr: 31_557_600_000, y: 31_557_600_000,
  };
  const duration = milliseconds[unit];
  return duration ? new Date(Date.now() - amount * duration).toISOString() : null;
}

function readVisiblePosts(slug: string) {
  const dedicatedActivityRoot = document.querySelector<HTMLElement>('main .pv-recent-activity-detail__core-rail')
    ?? document.querySelector<HTMLElement>('main [id$="activity_posts_pillContent"]')
    ?? (profileEntity()?.kind === 'company' ? document.querySelector<HTMLElement>('main .scaffold-finite-scroll__content, main [data-view-name="organization-posts-feed"]') : null);
  const activityRoot = dedicatedActivityRoot ?? document.querySelector<HTMLElement>('main');
  if (!activityRoot) return { posts: [] as ProfilePost[], loaded: 0, urns: [] as string[] };
  const feedArticles = activityRoot.querySelectorAll<HTMLElement>('article[data-urn*="urn:li:activity"], .feed-shared-update-v2[data-urn*="urn:li:activity"]');
  const sduiCards = activityRoot.querySelectorAll<HTMLElement>('[role="listitem"]');
  const containers = feedArticles.length > 0 ? feedArticles : sduiCards.length > 0 ? sduiCards : activityRoot.querySelectorAll<HTMLElement>(
    '[data-testid="carousel-child-container"], [data-urn*="urn:li:activity"], [data-id*="urn:li:activity"], .feed-shared-update-v2, article',
  );
  const posts: ProfilePost[] = [];
  const seen = new Set<string>();
  const urns = new Set<string>();

  for (const container of containers) {
    const urn = container.getAttribute('data-urn')
      ?? container.querySelector<HTMLElement>('[data-urn*="urn:li:activity"]')?.getAttribute('data-urn')
      ?? Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href*="urn:li:activity:"]'))[0]?.href.match(/urn:li:activity:\d+/)?.[0]
      ?? '';
    if (urn) urns.add(urn);
    const activityLink = Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href]')).find((link) =>
      /(?:\/feed\/update\/urn:li:activity:|\/posts\/)/i.test(link.href),
    );
    // 专属 Activity 列表中的转发卡片可能显示原作者，不能再用 actor 严格过滤。
    // 只有找不到专属列表、退化到整个 main 时，才要求作者链接匹配目标账号。
    if (!dedicatedActivityRoot && !isOwnedByProfile(container, slug)) continue;
    if (/(promoted|sponsored|推广|贊助|赞助)/i.test(container.innerText.slice(0, 300))) continue;
    const textElement = container.querySelector<HTMLElement>(
      '[data-testid="expandable-text-box"], .update-components-text, .feed-shared-inline-show-more-text, [data-test-id="main-feed-activity-card__commentary"], [data-view-name="feed-commentary"]',
    );
    const fallbackTexts = Array.from(container.querySelectorAll<HTMLElement>('div[dir="auto"], span[dir="ltr"]'))
      .map((element) => element.innerText.trim())
      .filter((value) => value.length >= 12);
    const postText = (textElement?.innerText.trim() || fallbackTexts.sort((a, b) => b.length - a.length)[0] || '').trim();
    if (!postText) continue;
    const entity = profileEntity();
    const fallbackActivityUrl = entity?.kind === 'company'
      ? `${location.origin}${entity.basePath}/posts/?feedView=all`
      : `${location.origin}/in/${slug}/recent-activity/all/`;
    const url = activityLink?.href || (urn ? `${location.origin}/feed/update/${urn}/` : fallbackActivityUrl);
    const key = urn || activityLink?.href || postText;
    if (seen.has(key)) continue;
    seen.add(key);
    const time = container.querySelector('time');
    const relative = container.querySelector<HTMLElement>('.update-components-actor__sub-description, [class*="actor__sub-description"]')?.innerText
      ?? Array.from(container.querySelectorAll<HTMLElement>('p, span')).map((element) => element.innerText.trim())
        .find((value) => /^\d+\s*(?:秒|分钟|小时|天|周|个月|月|年|mo|yr|s|m|h|d|w|y)(?:\s|•|前|ago|$)/i.test(value))
      ?? '';
    posts.push({ text: postText, timestamp: time?.getAttribute('datetime') || parseRelativeTime(relative), url, kind: classifyPost(container, postText) });
  }
  const ariaLoaded = Array.from(activityRoot.querySelectorAll<HTMLElement>('[aria-live="polite"]'))
    .map((element) => element.innerText.match(/(?:loaded|已加载|已載入)\s*(\d+)|(?:已加载|已載入)\s*(\d+)/i))
    .find(Boolean);
  const announcedCount = Number(ariaLoaded?.[1] ?? ariaLoaded?.[2] ?? 0);
  return { posts, loaded: Math.max(containers.length, announcedCount), urns: Array.from(urns) };
}

function getActivityRoot() {
  return document.querySelector<HTMLElement>('main .pv-recent-activity-detail__core-rail')
    ?? document.querySelector<HTMLElement>('main [id$="activity_posts_pillContent"]')
    ?? (profileEntity()?.kind === 'company' ? document.querySelector<HTMLElement>('main .scaffold-finite-scroll__content, main [data-view-name="organization-posts-feed"]') : null)
    ?? document.querySelector<HTMLElement>('main');
}

function visibleActivityCards(root: HTMLElement) {
  const legacyCards = root.querySelectorAll<HTMLElement>(
    'article[data-urn*="urn:li:activity"], .feed-shared-update-v2[data-urn*="urn:li:activity"]',
  );
  return legacyCards.length > 0 ? legacyCards : root.querySelectorAll<HTMLElement>('[role="listitem"], [data-testid="carousel-child-container"]');
}

async function scrollAndWaitForMore() {
  const root = getActivityRoot();
  if (!root) return false;
  const cards = visibleActivityCards(root);
  const lastCard = cards[cards.length - 1];
  const previousCount = cards.length;
  const previousHeight = document.documentElement.scrollHeight;
  if (lastCard) lastCard.scrollIntoView({ block: 'end', behavior: 'auto' });
  window.scrollBy({ top: Math.max(500, window.innerHeight * 0.65), behavior: 'auto' });

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (changed = false) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(timeout);
      resolve(changed);
    };
    const observer = new MutationObserver(() => {
      if (visibleActivityCards(root).length > previousCount || document.documentElement.scrollHeight > previousHeight) {
        window.setTimeout(() => finish(true), 700);
      }
    });
    const timeout = window.setTimeout(finish, 3500);
    observer.observe(root, { childList: true, subtree: true });
  });
}

async function completeProfileSummary(summary: LinkedInSummary): Promise<LinkedInSummary> {
  if (summary.bio && summary.location && summary.displayName !== summary.slug) return summary;
  try {
    const response = await fetch(summary.profileUrl, { credentials: 'include' });
    if (!response.ok) return summary;
    const documentCopy = new DOMParser().parseFromString(await response.text(), 'text/html');
    const value = (selector: string) => documentCopy.querySelector<HTMLElement>(selector)?.textContent?.trim() ?? '';
    const name = value('main [id$="Topcard"] h2') || value('main h1');
    const bio = value('main [id$="About"] [data-testid="expandable-text-box"]') || value('main .text-body-medium.break-words');
    const locationText = value('main .text-body-small.inline.t-black--light.break-words');
    return { ...summary, displayName: name || summary.displayName, bio: bio || summary.bio, location: locationText || summary.location };
  } catch {
    return summary;
  }
}

async function collectLinkedInProfile(purpose: AnalysisPurpose, controls?: CollectionControls): Promise<ProfileData> {
  const entity = profileEntity();
  const slug = profileSlug();
  if (!slug || !isActivityPage()) throw new Error('请在 LinkedIn 用户的动态页面进行分析');
  if (isAuthWall()) throw new Error('请先登录 LinkedIn，再重新分析');
  const collected = new Map<string, ProfilePost>();
  const discoveredUrns = new Set<string>();
  let unchangedRounds = 0;
  let loaded = 0;
  const startedAt = Date.now();

  for (let round = 0; round < MAX_SCROLL_ROUNDS && collected.size < MAX_POSTS && Date.now() - startedAt < MAX_COLLECTION_MS; round += 1) {
    if (controls?.isCancelled?.()) break;
    const before = collected.size;
    const beforeUrns = discoveredUrns.size;
    const snapshot = readVisiblePosts(slug);
    loaded = Math.max(loaded, snapshot.loaded);
    for (const urn of snapshot.urns) discoveredUrns.add(urn);
    for (const post of snapshot.posts) {
      collected.set(post.url === location.href ? post.text : post.url, post);
      if (collected.size >= MAX_POSTS) break;
    }
    controls?.onProgress?.(collected.size, {
      loaded: Math.max(loaded, discoveredUrns.size),
      stage: unchangedRounds > 2 ? '正在等待 LinkedIn 加载更多动态' : '正在筛选本人公开动态',
      profileUrl: `${location.origin}${entity?.basePath ?? `/in/${slug}`}/`,
    });
    unchangedRounds = before === collected.size && beforeUrns === discoveredUrns.size ? unchangedRounds + 1 : 0;
    if (unchangedRounds >= MAX_UNCHANGED_ROUNDS) break;
    const changed = await scrollAndWaitForMore();
    if (changed) unchangedRounds = Math.max(0, unchangedRounds - 1);
  }

  controls?.onProgress?.(collected.size, { loaded: Math.max(loaded, discoveredUrns.size), stage: entity?.kind === 'company' ? '正在补全公司资料' : '正在补全个人资料', profileUrl: `${location.origin}${entity?.basePath ?? `/in/${slug}`}/` });
  const summary = await completeProfileSummary(readProfileSummary());
  return {
    platform: 'LinkedIn', displayName: summary.displayName, handle: slug, bio: summary.bio,
    location: summary.location, profileUrl: summary.profileUrl, analysisPurpose: purpose,
    posts: Array.from(collected.values()).slice(0, MAX_POSTS),
  };
}

export const linkedinAdapter: PlatformAdapter = {
  id: 'LinkedIn',
  isProfilePage: () => Boolean(profileSlug()),
  getButtonAnchor: () => {
    const activityHeading = document.querySelector<HTMLElement>(
      'main .pv-recent-activity-detail__core-rail > section.artdeco-card > h2',
    );
    if (activityHeading) return activityHeading;
    if (profileEntity()?.kind === 'company') {
      return document.querySelector<HTMLElement>('main h1, main .org-top-card-summary__title, main .org-top-card-primary-content__title');
    }
    const topCard = document.querySelector<HTMLElement>('main [id$="Topcard"]');
    const alternateName = Array.from(topCard?.querySelectorAll<HTMLElement>('p') ?? [])
      .find((element) => /^\([^()]+\)$/.test(element.innerText.trim()));
    return alternateName ?? topCard?.querySelector<HTMLElement>('h2') ?? document.querySelector<HTMLElement>('main h1');
  },
  getCollectionPageUrl: () => {
    if (isActivityPage()) return null;
    rememberProfileSummary();
    const entity = profileEntity();
    return entity?.kind === 'company'
      ? `${location.origin}${entity.basePath}/posts/?feedView=all`
      : `${location.origin}/in/${profileSlug()}/recent-activity/all/`;
  },
  collectProfile: collectLinkedInProfile,
};
