/** Domain types shared by the business logic and the data layer. Timestamps are Unix ms. */

export type Shift = {
  id: number;
  startedAt: number;
  /** null while the shift is open. */
  endedAt: number | null;
  /** Rate per delivery copied from settings when the shift started (integer pesos). */
  rate: number;
};

export type ClosedShift = Shift & { endedAt: number };

export type Delivery = {
  id: number;
  shiftId: number;
  address: string;
  createdAt: number;
};

/** A shift with its delivery count, as most screens need it. */
export type ShiftWithCount = Shift & { deliveryCount: number };

export type MonthKey = {
  year: number;
  /** 1–12 */
  month: number;
};

export type MonthClosure = MonthKey & {
  id: number;
  closedAt: number;
};
