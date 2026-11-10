import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import { shortUpdateId, shortVersion } from '@/logic/version';

/** App version for the footer in Ajustes ("1.0"). */
export function appVersion(): string {
  return shortVersion(Constants.expoConfig?.version ?? '1.0.0');
}

/**
 * Short id of the OTA update the app is running ("0f2a9c1e"), or null when it runs the bundle
 * that came inside the APK (or in development).
 */
export function installedUpdateId(): string | null {
  if (!Updates.isEnabled || Updates.isEmbeddedLaunch) return null;
  return shortUpdateId(Updates.updateId);
}
