//src/utils/dividend.ts
export interface AuctionCalculation {
  winning_amount: number;
  commission: number;
  carry_previous: number;
  raw_dividend: number;
  /** Per-member rounded dividend (divided by total_members first, then rounded down) */
  per_member_dividend: number;
  /** Total rounded pool = per_member_dividend × total_members */
  roundoff_dividend: number;
  /** Remaining amount carried to next month = raw_dividend - roundoff_dividend */
  carry_next: number;
}

export interface CalculationInput {
  total_amount: number;
  /** Number of members in the chit group (used for per-member division) */
  total_members: number;
  original_bid: number;
  commission_type: "PERCENT" | "FIXED";
  commission_value: number;
  round_off_value: number;
  carry_previous: number;
}

export function calculateAuction(input: CalculationInput): AuctionCalculation {
  const {
    total_amount,
    total_members,
    original_bid,
    commission_type,
    commission_value,
    round_off_value,
    carry_previous,
  } = input;

  // winning amount = total pot - bid
  const winning_amount = total_amount - original_bid;

  // commission on winning amount (percent) or a fixed fee
  const commission =
    commission_type === "PERCENT"
      ? (winning_amount * commission_value) / 100
      : commission_value;

  // raw dividend pool = bid - commission + carry from previous month
  const raw_dividend = original_bid - commission + carry_previous;

  // ── NEW per-member-first logic ──────────────────────────────────────────
  // 1. Divide the pool per member FIRST
  const per_member_raw = raw_dividend / total_members;

  // 2. Round each member's share DOWN to the nearest round_off_value
  const per_member_dividend =
    Math.floor(per_member_raw / round_off_value) * round_off_value;

  // 3. Total rounded pool (what actually gets distributed)
  const roundoff_dividend = per_member_dividend * total_members;

  // 4. Remainder carries to next month
  const carry_next = raw_dividend - roundoff_dividend;
  // ────────────────────────────────────────────────────────────────────────

  return {
    winning_amount,
    commission,
    carry_previous,
    raw_dividend,
    per_member_dividend,
    roundoff_dividend,
    carry_next,
  };
}