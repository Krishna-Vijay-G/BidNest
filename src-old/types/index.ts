// ============================================
// BidNest: Core TypeScript Type Definitions
// ============================================

// ---- Enums ----
export type UserRole = 'admin' | 'member';
export type ChitStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type CommissionType = 'percentage' | 'fixed';
export type AuctionStatus = 'scheduled' | 'open' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'waived';
export type PaymentType = 'contribution' | 'payout';
export type TransactionType =
  | 'contribution_received'
  | 'payout_disbursed'
  | 'commission_deducted'
  | 'dividend_distributed'
  | 'adjustment';
export type NotificationType =
  | 'payment_reminder'
  | 'auction_result'
  | 'payment_confirmation'
  | 'group_created'
  | 'member_added'
  | 'general';

// ---- Database Row Types ----

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: UserRole;
  avatar_url: string | null;
  push_subscription: PushSubscriptionJSON | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Chit-fund participant (no auth account required)
export interface AppMember {
  id: string;
  name: string;
  nickname: string;
  mobile: string;
  upi_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChitGroup {
  id: string;
  name: string;
  total_amount: number;
  num_members: number;
  monthly_contribution: number;
  duration_months: number;
  commission_type: CommissionType;
  commission_value: number;
  dividend_rounding_enabled: boolean;
  dividend_rounding_value: number;
  status: ChitStatus;
  start_date: string | null;
  end_date: string | null;
  current_month: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  chit_group_id: string;
  app_member_id: string | null;
  ticket_number: number;
  has_received_payout: boolean;
  payout_month: number | null;
  payout_amount: number | null;
  total_paid: number;
  total_dividends_received: number;
  is_active: boolean;
  joined_at: string;
  updated_at: string;
  // Joined fields
  app_member?: AppMember;
  chit_group?: ChitGroup;
}

// Winning member joined type used in auctions
export interface MonthlyAuction {
  id: string;
  chit_group_id: string;
  month_number: number;
  auction_date: string;
  status: AuctionStatus;
  winning_member_id: string | null;
  bid_amount: number | null;
  winner_payout: number | null;
  foreman_commission: number | null;
  dividend_pool: number | null;
  per_member_dividend: number | null;
  rounded_per_member_dividend: number | null;
  rounding_discount_total: number;
  effective_contribution: number | null;
  adjusted_effective_contribution: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  winning_member?: Member & { app_member?: AppMember };
  chit_group?: ChitGroup;
}

export interface AuctionBid {
  id: string;
  auction_id: string;
  member_id: string;
  bid_amount: number;
  is_winning_bid: boolean;
  created_at: string;
  // Joined fields
  member?: Member & { app_member?: AppMember };
}

export interface Payment {
  id: string;
  chit_group_id: string;
  member_id: string;
  auction_id: string | null;
  month_number: number;
  payment_type: PaymentType;
  amount_due: number;
  amount_paid: number;
  dividend_applied: number;
  net_payable: number;
  status: PaymentStatus;
  paid_at: string | null;
  due_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  member?: Member & { app_member?: AppMember };
  chit_group?: ChitGroup;
}

export interface Dividend {
  id: string;
  chit_group_id: string;
  auction_id: string;
  member_id: string;
  month_number: number;
  amount: number;
  is_applied: boolean;
  created_at: string;
  // Joined fields
  member?: Member & { app_member?: AppMember };
}

export interface DividendRoundingHistory {
  id: string;
  chit_group_id: string;
  auction_id: string;
  month_number: number;
  calculated_dividend: number;
  rounded_dividend: number;
  rounding_difference: number;
  total_rounding_discount: number;
  applied_to_month: number | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  chit_group_id: string;
  member_id: string | null;
  auction_id: string | null;
  month_number: number | null;
  transaction_type: TransactionType;
  amount: number;
  running_balance: number | null;
  description: string | null;
  reference_id: string | null;
  created_at: string;
  // Joined fields
  member?: Member & { app_member?: AppMember };
}

export interface Notification {
  id: string;
  user_id: string;
  chit_group_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  is_push_sent: boolean;
  push_sent_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---- Form / Input Types ----

export interface CreateChitGroupInput {
  name: string;
  total_amount: number;
  num_members: number;
  commission_type: CommissionType;
  commission_value: number;
  dividend_rounding_enabled?: boolean;
  dividend_rounding_value?: number;
  start_date: string;
}

export interface AddMemberInput {
  chit_group_id: string;
  app_member_id: string;
  ticket_number: number;
}

export interface ConductAuctionInput {
  auction_id: string;
  winning_member_id: string;
  bid_amount: number;
}

export interface RecordPaymentInput {
  payment_id: string;
  amount_paid: number;
  notes?: string;
}

export interface CreateAppMemberInput {
  name: string;
  nickname: string;
  mobile: string;
  upi_id?: string;
}

export interface CreateUserInput {
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  password: string;
  role?: UserRole;
}

// ---- Calculation Types ----

export interface AuctionCalculation {
  total_amount: number;
  bid_discount: number;
  winner_payout: number;
  foreman_commission: number;
  dividend_pool: number;
  per_member_dividend: number;
  rounded_dividend: number;
  rounding_difference: number;
  rounding_total: number;
  effective_contribution: number;
}

export interface MemberLedger {
  member: Member & { user: User };
  total_paid: number;
  total_dividends: number;
  net_payable: number;
  pending_months: number;
  payments: Payment[];
  dividends: Dividend[];
}

// ---- Dashboard Summary Types ----

export interface DashboardSummary {
  total_groups: number;
  active_groups: number;
  completed_groups: number;
  total_members: number;
  total_collections: number;
  total_payouts: number;
  total_commissions: number;
  pending_payments: number;
}

export interface GroupSummary {
  group: ChitGroup;
  member_count: number;
  completed_auctions: number;
  remaining_auctions: number;
  total_collected: number;
  total_paid_out: number;
  total_commission: number;
}

// ---- Push Subscription ----
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ---- API Response Types ----
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ---- Pagination ----
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
