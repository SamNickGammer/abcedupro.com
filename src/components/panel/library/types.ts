export type SlotDefinition = { id: string; label: string; time: string; color?: string | null };
export type SeatRow = { row: string; seats: number[] };
export type SeatLayout = Record<string, SeatRow[]>;

export type LibraryConfig = {
  slot_definitions: SlotDefinition[];
  pricing_tiers: Record<string, number>;
  locker_price: number;
  locker_numbers: number[];
  seat_layout: SeatLayout;
};

export type LibraryMeta = {
  total_seats: number;
  total_slots: number;
  total_lockers: number;
};

export type MonthSummary = {
  month: number;
  month_label: string;
  total_bookings: number;
  confirmed_count: number;
  secured_count: number;
  collected_amount: number;
  pending_amount: number;
  used_lockers: number;
  occupied_slot_seats: number;
  occupancy_percent: number;
};

export type Booking = {
  booking_id: number;
  booking_group_id: string;
  member_id: number;
  name: string;
  phone: string | null;
  note: string | null;
  status: "confirmed" | "secured";
  block: string;
  seat_id: string;
  seat_label: string;
  slots: string[];
  lockers: number[];
  price: number;
  booking_year: number;
  booking_month: number;
  group_months: number[];
  payment: {
    status: "pending" | "paid";
    method: string | null;
    collectedBy: string | null;
    note: string | null;
    paidAt: string | null;
  };
  created_at: string;
  createdAt: string | null;
};

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;
