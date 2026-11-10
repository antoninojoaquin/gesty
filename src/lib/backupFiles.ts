import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { exportData } from '@/db/backup';
import type { Db } from '@/db/types';
import {
  backupFileName,
  buildBackup,
  isBackupFileName,
  parseBackup,
  serializeBackup,
  type ParseBackupResult,
} from '@/logic/backup';

/** Deletes backup files left in the cache by previous exports, so they don't pile up. */
function deleteOldExports(): void {
  for (const entry of Paths.cache.list()) {
    if (entry instanceof File && isBackupFileName(entry.name)) {
      try {
        entry.delete();
      } catch {
        // Not worth failing the export over a leftover file.
      }
    }
  }
}

/** Writes every shift, delivery, closure and the rate to a JSON file and opens the share menu. */
export async function shareBackup(db: Db): Promise<void> {
  const now = Date.now();
  const text = serializeBackup(buildBackup(await exportData(db), now));
  deleteOldExports();
  const file = new File(Paths.cache, backupFileName(now));
  await file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Guardar respaldo de Gesty' });
}

/**
 * Lets the user pick an exported file and validates it. Returns null if they cancel.
 * Any file type is allowed: files received over WhatsApp or Drive often lose their JSON type.
 *
 * The file is read straight from the content:// URI Android hands back. Copying it to the cache
 * first (copyToCacheDirectory) puts it in the app-wide cache, which expo-file-system refuses to
 * read inside Expo Go ("Missing 'READ' permission").
 */
export async function pickBackup(): Promise<ParseBackupResult | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false });
  if (result.canceled || result.assets.length === 0) return null;
  const text = await new File(result.assets[0].uri).text();
  return parseBackup(text);
}
