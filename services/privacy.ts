const CONSENT_KEY = 'profileInsightPrivacyConsent';
const CONSENT_VERSION = 1;

export async function hasPrivacyConsent() {
  const stored = await browser.storage.local.get(CONSENT_KEY);
  const consent = stored[CONSENT_KEY] as { version?: number } | undefined;
  return consent?.version === CONSENT_VERSION;
}

export async function recordPrivacyConsent() {
  await browser.storage.local.set({ [CONSENT_KEY]: { version: CONSENT_VERSION, acceptedAt: Date.now() } });
}

export async function revokePrivacyConsent() {
  await browser.storage.local.remove(CONSENT_KEY);
}
