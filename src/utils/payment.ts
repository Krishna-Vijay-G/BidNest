//src/utils/payment.ts
export function getPaymentStatus(amountPaid: number, amountDue: number): 'PARTIAL' | 'COMPLETED' {
  return amountPaid >= amountDue ? 'COMPLETED' : 'PARTIAL';
}

export function getRemainingAmount(amountDue: number, amountPaid: number): number {
  return Math.max(0, amountDue - amountPaid);
}