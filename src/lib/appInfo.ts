import Constants from 'expo-constants';

import { shortVersion } from '@/logic/version';

/** App version for the footer in Ajustes ("1.0"). */
export function appVersion(): string {
  return shortVersion(Constants.expoConfig?.version ?? '1.0.0');
}
