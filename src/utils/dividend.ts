export interface AuctionCalculation {
  winning_amount: number;
  commission: number;
  carry_previous: number;
  raw_dividend: number;
  roundoff_dividend: number;
  carry_next: number;
}

export interface CalculationInput {
  total_amount: number;
  original_bid: number;
  commission_type: "PERCENT" | "FIXED";
  commission_value: number;
  round_off_value: number;
  carry_previous: number;
}

export function calculateAuction(input: CalculationInput): AuctionCalculation {
  const {
    total_amount,
    original_bid,
    commission_type,
    commission_value,
    round_off_value,
    carry_previous,
  } = input;

  // winning amount = total - bid
  const winning_amount = total_amount - original_bid;

  // commission = percent of winning amount or fixed value
  const commission =
    commission_type === "PERCENT"
      ? (winning_amount * commission_value) / 100
      : commission_value;

  // raw dividend = bid - commission + carry from previous month
  const raw_dividend = original_bid - commission + carry_previous;

  // round down to nearest round_off_value
  const roundoff_dividend =
    Math.floor(raw_dividend / round_off_value) * round_off_value;

  // carry forward to next month
  const carry_next = raw_dividend - roundoff_dividend;

  return {
    winning_amount,
    commission,
    carry_previous,
    raw_dividend,
    roundoff_dividend,
    carry_next,
  };
}