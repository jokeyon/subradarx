import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';

let shareInboxReadSingle: Promise<string | null> | null = null;

function appGroupId(): string | null {
  const bid = Constants.expoConfig?.ios?.bundleIdentifier;
  if (!bid) return null;
  const fromPlist = Constants.expoConfig?.ios?.infoPlist?.AppGroup as string | undefined;
  if (typeof fromPlist === 'string' && fromPlist.startsWith('group.')) return fromPlist;
  return `group.${bid}`;
}

function appGroupRoot(): Directory | null {
  const id = appGroupId();
  if (!id) return null;
  const containers = Paths.appleSharedContainers;
  const dir = containers[id];
  return dir ?? null;
}

/** Write payload from the iOS Share Extension; host app reads via `readShareInboxPayload`. */
export function writeShareInboxPayload(text: string): void {
  const root = appGroupRoot();
  if (!root) throw new Error('share-inbox: no app group container');
  const sub = new Directory(root, 'subradax-share');
  if (!sub.exists) sub.create({ intermediates: true });
  const file = new File(sub, 'latest-payload.txt');
  if (file.exists) {
    try {
      file.delete();
    } catch {
      /* replace */
    }
  }
  file.write(text, { encoding: 'utf8' });
}

/**
 * Host app: read once and delete (single-slot inbox).
 * Concurrent callers share one read (React Strict Mode safe).
 */
export function readShareInboxPayload(): Promise<string | null> {
  if (!shareInboxReadSingle) {
    shareInboxReadSingle = (async () => {
      try {
        const root = appGroupRoot();
        if (!root) return null;
        const file = new File(root, 'subradax-share', 'latest-payload.txt');
        if (!file.exists) return null;
        const text = await file.text();
        try {
          file.delete();
        } catch {
          /* best-effort */
        }
        return text;
      } finally {
        shareInboxReadSingle = null;
      }
    })();
  }
  return shareInboxReadSingle;
}
