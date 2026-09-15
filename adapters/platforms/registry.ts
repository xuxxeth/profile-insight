import type { PlatformAdapter } from './base';
import { xAdapter } from './x';

// LinkedInAdapter 和 FacebookAdapter 后续在各自权限启用时注册到这里。
const adapters: PlatformAdapter[] = [xAdapter];

export function getActiveAdapter() {
  return adapters.find((adapter) => adapter.isProfilePage()) ?? null;
}

export function registeredPlatforms() {
  return adapters.map((adapter) => adapter.id);
}
