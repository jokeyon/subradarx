export type BillingCycle = 'weekly' | 'monthly' | 'yearly';

export interface Renewal {
  id: string;
  name: string;
  amount: number;
  currencyCode: string;
  billingCycle: BillingCycle;
  /** Local calendar date `yyyy-MM-dd` */
  nextChargeDate: string;
  reminderDays: number;
  notes: string;
  /**
   * Optional HTTPS link to the provider’s subscription management or cancel page.
   * Opened in the system browser from the edit screen.
   */
  cancelUrl?: string;
}
