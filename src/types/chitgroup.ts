//src/types/chitgroup.ts
export interface ChitGroup {
  id: string;
  user_id: string;
  name: string;
  total_amount: string;
  total_members: number;
  monthly_amount: string;
  duration_months: number;
  commission_type: 'PERCENT' | 'FIXED';
  commission_value: string;
  round_off_value: number;
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
  created_at: string;
  chit_members?: ChitMemberBasic[];
  auctions?: AuctionBasic[];
  payments?: PaymentBasic[];
}

export interface ChitMemberBasic {
  id: string;
  ticket_number: number;
  is_active: boolean;
}

export interface AuctionBasic {
  id: string;
  month_number: number;
}

export interface PaymentBasic {
  id: string;
  amount_paid: string;
}