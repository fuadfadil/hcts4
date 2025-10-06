/**
 * Commission Calculator for HCTS Platform
 * Calculates platform commission (1%) on healthcare service transactions
 */

export class CommissionCalculator {
  private static readonly COMMISSION_RATE = 0.01; // 1%

  /**
   * Calculate commission amount for a given transaction amount
   * @param amount - The transaction amount
   * @returns The commission amount (1% of transaction)
   */
  static calculateCommission(amount: number): number {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    return Math.round(amount * this.COMMISSION_RATE * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate the net amount after deducting commission
   * @param amount - The original transaction amount
   * @returns The amount after commission deduction
   */
  static calculateNetAmount(amount: number): number {
    const commission = this.calculateCommission(amount);
    return Math.round((amount - commission) * 100) / 100;
  }

  /**
   * Get commission breakdown for a transaction
   * @param amount - The transaction amount
   * @returns Object containing original amount, commission, and net amount
   */
  static getCommissionBreakdown(amount: number) {
    const commission = this.calculateCommission(amount);
    const netAmount = this.calculateNetAmount(amount);

    return {
      originalAmount: amount,
      commissionAmount: commission,
      netAmount: netAmount,
      commissionRate: this.COMMISSION_RATE
    };
  }
}