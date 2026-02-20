//src/types/auction.ts
export interface Auction {
  id: string;
  chit_group_id: string;
  month_number: number;
  winner_chit_member_id: string;
  original_bid: string;
  winning_amount: string;
  commission: string;
  carry_previous: string;
  raw_dividend: string;
  roundoff_dividend: string;
  carry_next: string;
  calculation_data: {
    total_amount: number;
    total_members: number;
    monthly_contribution: number;
    dividend_per_member: number;
    amount_to_collect: number;
    commission_type: string;
    commission_value: number;
    round_off_value: number;
    original_bid: number;
    winning_amount: number;
    commission: number;
    carry_previous: number;
    raw_dividend: number;
    roundoff_dividend: number;
    carry_next: number;
  };
  created_at: string;
  winner_chit_member?: {
    ticket_number: number;
    member: { name: { value: string } };
  };
}