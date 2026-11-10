import { parseBackup, buildBackup, serializeBackup } from '@/logic/backup';
import { groupShiftsByMonth } from '@/logic/months';
import { at } from '@/logic/testing';

import { buildDemoData } from '../demoData';

describe('demo data', () => {
  const now = at(2026, 11, 10, 12, 0);
  const data = buildDemoData(now);

  it('is a valid backup', () => {
    expect(parseBackup(serializeBackup(buildBackup(data, now))).ok).toBe(true);
  });

  it('looks like the designs: closed previous month and 3 shifts in the current one', () => {
    const counts = new Map(data.shifts.map((s) => [s.id, 0]));
    for (const d of data.deliveries) counts.set(d.shiftId, (counts.get(d.shiftId) ?? 0) + 1);
    const withCounts = data.shifts.map((s) => ({ ...s, deliveryCount: counts.get(s.id) ?? 0 }));
    const groups = groupShiftsByMonth(withCounts, data.monthClosures, now);
    expect(groups.map((g) => [g.month, g.status, g.shiftCount, g.deliveryCount, g.total])).toEqual([
      [11, 'current', 3, 39, 117000],
      [10, 'closed', 12, 168, 504000],
    ]);
  });
});
