import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@subradar/sameday_notif_anchors';

export type SameDayNotifAnchor = {
  nextChargeDate: string;
  reminderDays: number;
  fireAtISO: string;
};

export async function loadSameDayAnchors(): Promise<Record<string, SameDayNotifAnchor>> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return {};
    const out: Record<string, SameDayNotifAnchor> = {};
    for (const [id, val] of Object.entries(v as Record<string, unknown>)) {
      const o = val as Partial<SameDayNotifAnchor>;
      if (
        typeof o.nextChargeDate === 'string' &&
        typeof o.reminderDays === 'number' &&
        typeof o.fireAtISO === 'string'
      ) {
        out[id] = {
          nextChargeDate: o.nextChargeDate,
          reminderDays: o.reminderDays,
          fireAtISO: o.fireAtISO,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function saveSameDayAnchors(anchors: Record<string, SameDayNotifAnchor>): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(anchors));
}

export function pruneSameDayAnchors(
  anchors: Record<string, SameDayNotifAnchor>,
  validRenewalIds: Set<string>,
): Record<string, SameDayNotifAnchor> {
  const out: Record<string, SameDayNotifAnchor> = { ...anchors };
  for (const id of Object.keys(out)) {
    if (!validRenewalIds.has(id)) delete out[id];
  }
  return out;
}
