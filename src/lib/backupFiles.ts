import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { exportData } from '@/db/backup';
import type { Db } from '@/db/types';
import { backupFileName, buildBackup, parseBackup, serializeBackup, type ParseBackupResult } from '@/logic/backup';

/** Writes every shift, delivery, closure and the rate to a JSON file and opens the share menu. */
export async function shareBackup(db: Db): Promise<void> {
  const now = Date.now();
  const text = serializeBackup(buildBackup(await exportData(db), now));
  const file = new File(Paths.cache, backupFileName(now));
  if (file.exists) file.delete();
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
