//src/types/payment.ts
export interface Payment {
  id: string;
  chit_group_id: string;
  chit_member_id: string;
  month_number: number;
  amount_paid: string;
  payment_method: 'CASH' | 'UPI' | 'BANK_TRANSFER';
  upi_id: string | null;
  payment_date: string;
  status: 'PARTIAL' | 'COMPLETED';
  notes: string | null;
  created_at: string;
  chit_member?: {
    ticket_number: number;
    member: { name: { value: string } };
  };
}