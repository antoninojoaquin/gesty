/**
 * Every icon the app uses, imported one by one.
 *
 * Do NOT import icons from 'lucide-react-native' directly: Metro does not tree-shake, so the
 * package entry point pulls all ~2000 icons (~1.9 MB) into the bundle and every OTA update.
 * To add an icon, import it here from 'lucide-react-native/icons/<kebab-name>'.
 * (A test enforces this: src/__tests__/icons.test.ts.)
 */
export type { LucideIcon } from 'lucide-react-native';

export { default as AlertCircle } from 'lucide-react-native/icons/circle-alert';
export { default as Check } from 'lucide-react-native/icons/check';
export { default as ChevronLeft } from 'lucide-react-native/icons/chevron-left';
export { default as ChevronRight } from 'lucide-react-native/icons/chevron-right';
export { default as CircleCheck } from 'lucide-react-native/icons/circle-check';
export { default as Clock } from 'lucide-react-native/icons/clock';
export { default as Database } from 'lucide-react-native/icons/database';
export { default as Download } from 'lucide-react-native/icons/download';
export { default as History } from 'lucide-react-native/icons/history';
export { default as Info } from 'lucide-react-native/icons/info';
export { default as Lock } from 'lucide-react-native/icons/lock';
export { default as LockOpen } from 'lucide-react-native/icons/lock-open';
export { default as Pencil } from 'lucide-react-native/icons/pencil';
export { default as Play } from 'lucide-react-native/icons/play';
export { default as Plus } from 'lucide-react-native/icons/plus';
export { default as Settings } from 'lucide-react-native/icons/settings';
export { default as Share2 } from 'lucide-react-native/icons/share-2';
export { default as Square } from 'lucide-react-native/icons/square';
export { default as Trash2 } from 'lucide-react-native/icons/trash-2';
export { default as Upload } from 'lucide-react-native/icons/upload';
