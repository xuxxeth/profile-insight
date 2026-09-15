import type { AnalysisPurpose, PlatformId, ProfileData } from '@/shared/types';

export interface CollectionControls {
  onProgress?: (count: number) => void;
  isCancelled?: () => boolean;
}

export interface PlatformAdapter {
  id: PlatformId;
  isProfilePage(): boolean;
  collectProfile(purpose: AnalysisPurpose, controls?: CollectionControls): Promise<ProfileData>;
}
