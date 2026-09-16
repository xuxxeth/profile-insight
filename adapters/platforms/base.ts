import type { AnalysisPurpose, PlatformId, ProfileData } from '@/shared/types';

export interface CollectionControls {
  onProgress?: (count: number, details?: { loaded: number; stage: string; profileUrl?: string }) => void;
  isCancelled?: () => boolean;
}

export interface PlatformAdapter {
  id: PlatformId;
  isProfilePage(): boolean;
  getButtonAnchor(): HTMLElement | null;
  getCollectionPageUrl?(): string | null;
  collectProfile(purpose: AnalysisPurpose, controls?: CollectionControls): Promise<ProfileData>;
}
