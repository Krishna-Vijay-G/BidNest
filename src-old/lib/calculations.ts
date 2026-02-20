// ============================================
// BidNest: Financial Calculation Utilities
// All chit fund math in one place - no bugs allowed
// ============================================

import type { AuctionCalculation, CommissionType } from '@/types';

/**
 * Calculate the foreman commission based on type
 */
export function calculateCommission(
  bidDiscount: number,
  commissionType: CommissionType,
  commissionValue: number
): number {
  if (bidDiscount <= 0) return 0;
  
  if (commissionType === 'percentage') {
    return roundToTwo((bidDiscount * commissionValue) / 100);
  }
  return Math.min(commissionValue, bidDiscount); // Commission can't exceed bid
}

/**
 * Round dividend down to nearest multiple of roundingValue
 * Example: roundDividend(667, 50) = 650
 *          roundDividend(643, 100) = 600
 */
export function roundDividend(dividend: number, roundingValue: number): number {
  if (roundingValue <= 0) return dividend;
  return Math.floor(dividend / roundingValue) * roundingValue;
}

/**
 * Full auction calculation
 * 
 * Formula:
 * - Winner Payout = Total Amount - Bid Discount
 * - Foreman Commission = f(Bid Discount, Commission Type, Commission Value)
 * - Dividend Pool = Bid Discount - Foreman Commission
 * - Per Member Dividend = Dividend Pool / Number of Members
 * - Rounded Dividend = Floor(Per Member Dividend / Rounding Value) * Rounding Value
 * - Effective Contribution = Monthly Contribution - Rounded Dividend
 */
export function calculateAuctionResults(
  totalAmount: number,
  bidDiscount: number,
  numMembers: number,
  commissionType: CommissionType,
  commissionValue: number,
  roundingEnabled: boolean = false,
  roundingValue: number = 100
): AuctionCalculation {
  // Validation
  if (totalAmount <= 0) throw new Error('Total amount must be positive');
  if (bidDiscount < 0) throw new Error('Bid discount cannot be negative');
  if (bidDiscount > totalAmount) throw new Error('Bid discount cannot exceed total amount');
  if (numMembers < 2) throw new Error('Must have at least 2 members');
  
  const monthlyContribution = roundToTwo(totalAmount / numMembers);
  const winnerPayout = roundToTwo(totalAmount - bidDiscount);
  const foremanCommission = calculateCommission(bidDiscount, commissionType, commissionValue);
  const dividendPool = roundToTwo(bidDiscount - foremanCommission);
  const perMemberDividend = roundToTwo(dividendPool / numMembers);
  
  // Apply rounding if enabled
  const roundedDividend = roundingEnabled 
    ? roundToTwo(roundDividend(perMemberDividend, roundingValue))
    : perMemberDividend;
  
  const roundingDifference = roundToTwo(perMemberDividend - roundedDividend);
  const roundingTotal = roundToTwo(roundingDifference * numMembers);
  
  const effectiveContribution = roundToTwo(monthlyContribution - roundedDividend);

  // Validation checks
  if (foremanCommission > bidDiscount) {
    throw new Error('Commission cannot exceed bid discount');
  }
  if (effectiveContribution < 0) {
    throw new Error('Effective contribution cannot be negative');
  }

  return {
    total_amount: totalAmount,
    bid_discount: bidDiscount,
    winner_payout: winnerPayout,
    foreman_commission: foremanCommission,
    dividend_pool: dividendPool,
    per_member_dividend: perMemberDividend,
    rounded_dividend: roundedDividend,
    rounding_difference: roundingDifference,
    rounding_total: roundingTotal,
    effective_contribution: effectiveContribution,
  };
}

/**
 * Calculate member's net position
 */
export function calculateMemberBalance(
  totalPaid: number,
  totalDividendsReceived: number,
  hasReceivedPayout: boolean,
  payoutAmount: number | null,
  totalAmount: number,
  monthlyContribution: number,
  currentMonth: number,
  durationMonths: number
): {
  totalPaid: number;
  totalDividends: number;
  netPaid: number; // totalPaid - totalDividends
  payoutReceived: number;
  pendingMonths: number;
  estimatedRemainingDue: number;
} {
  const netPaid = roundToTwo(totalPaid - totalDividendsReceived);
  const pendingMonths = Math.max(0, durationMonths - currentMonth);
  const estimatedRemainingDue = roundToTwo(pendingMonths * monthlyContribution);

  return {
    totalPaid,
    totalDividends: totalDividendsReceived,
    netPaid,
    payoutReceived: hasReceivedPayout ? (payoutAmount || 0) : 0,
    pendingMonths,
    estimatedRemainingDue,
  };
}

/**
 * Validate chit group parameters
 */
export function validateChitGroupParams(
  totalAmount: number,
  numMembers: number,
  commissionType: CommissionType,
  commissionValue: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (totalAmount <= 0) errors.push('Total amount must be positive');
  if (numMembers < 2) errors.push('Must have at least 2 members');
  if (!Number.isInteger(numMembers)) errors.push('Number of members must be a whole number');
  
  // Check that total_amount is evenly divisible by num_members (for DB constraint)
  const monthlyContribution = totalAmount / numMembers;
  const roundedContribution = Math.round(monthlyContribution * 100) / 100;
  if (Math.abs(roundedContribution * numMembers - totalAmount) > 0.01) {
    errors.push(`Total amount must be evenly divisible by number of members. ₹${totalAmount} ÷ ${numMembers} = ₹${roundedContribution.toFixed(2)} (doesn't divide evenly)`);
  }

  if (commissionType === 'percentage') {
    if (commissionValue < 0 || commissionValue > 100) {
      errors.push('Commission percentage must be between 0 and 100');
    }
  } else {
    if (commissionValue < 0) {
      errors.push('Commission amount cannot be negative');
    }
    if (commissionValue > totalAmount) {
      errors.push('Commission cannot exceed total amount');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Round to 2 decimal places (financial rounding)
 */
export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Format currency in INR
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with Indian numbering system (lakhs, crores)
 */
export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return roundToTwo((part / total) * 100);
}
