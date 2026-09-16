import type { PlatformAdapter } from './base';
import { linkedinAdapter } from './linkedin';
import { xAdapter } from './x';

// FacebookAdapter 后续在权限启用时注册到这里。
const adapters: PlatformAdapter[] = [xAdapter, linkedinAdapter];

export function getActiveAdapter() {
  return adapters.find((adapter) => adapter.isProfilePage()) ?? null;
}

export function registeredPlatforms() {
  return adapters.map((adapter) => adapter.id);
}
