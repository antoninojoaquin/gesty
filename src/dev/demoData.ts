/**
 * DEVELOPMENT ONLY: sample data shaped like docs/diseno/ (to review screens on a phone).
 * Loaded with a long press on the home logo when __DEV__; never shipped to users.
 */
import type { BackupData } from '@/logic/backup';
import type { Delivery, MonthClosure, Shift } from '@/logic/types';

const STREETS = [
  'Belgrano 1450',
  'San Martín 820',
  'Rivadavia 1132',
  'Mitre 315, dto 2',
  'Buenos Aires 211',
  'Sarmiento 1780',
  'Moreno 954',
  'Lavalle 402',
  'Urquiza 1290',
  'Alem 77',
];

/** Fri/Sat/Sun of the latest full weekend before `now`, as local dates at midnight. */
function lastWeekend(now: Date): Date[] {
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  do sunday.setDate(sunday.getDate() - 1);
  while (sunday.getDay() !== 0);
  return [-2, -1, 0].map((offset) => new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + offset));
}

/** The first 12 Fri/Sat/Sun of a month. */
function weekendsOfMonth(year: number, month0: number): Date[] {
  const days: Date[] = [];
  for (let d = 1; days.length < 12 && d <= 31; d++) {
    const date = new Date(year, month0, d);
    if (date.getMonth() !== month0) break;
    if ([5, 6, 0].includes(date.getDay())) days.push(date);
  }
  return days;
}

export function buildDemoData(nowTs: number): BackupData {
  const now = new Date(nowTs);
  const shifts: Shift[] = [];
  const deliveries: Delivery[] = [];
  let street = 0;

  function addShift(day: Date, count: number, startMinute: number) {
    const id = shifts.length + 1;
    const startedAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 21, startMinute).getTime();
    // One delivery every ~15 minutes, ending a few minutes after the last one.
    const step = 15 * 60_000;
    for (let i = 0; i < count; i++) {
      deliveries.push({
        id: deliveries.length + 1,
        shiftId: id,
        address: STREETS[street++ % STREETS.length],
        createdAt: startedAt + (i + 1) * step,
      });
    }
    shifts.push({ id, startedAt, endedAt: startedAt + (count + 1) * step, rate: 3000 });
  }

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  weekendsOfMonth(prevMonth.getFullYear(), prevMonth.getMonth()).forEach((day) => addShift(day, 14, 0));

  const [fri, sat, sun] = lastWeekend(now);
  addShift(fri, 15, 2);
  addShift(sat, 14, 0);
  addShift(sun, 10, 10);

  const monthClosures: MonthClosure[] = [
    { id: 1, year: prevMonth.getFullYear(), month: prevMonth.getMonth() + 1, closedAt: nowTs },
  ];

  return { settings: { rate: 3000 }, shifts, deliveries, monthClosures };
}
