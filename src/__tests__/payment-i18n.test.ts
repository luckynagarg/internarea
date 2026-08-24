/**
 * Payment i18n Coverage Tests
 *
 * Verifies that every key referenced by the payment-related flows
 * (subscription, payment success/failed/cancel pages, subscription history,
 * dashboard, profile) exists in ALL 6 locale dictionaries.
 *
 * Run: npm run test -- payment-i18n
 */

import { describe, it, expect } from '@jest/globals';

import en from '@/i18n/dictionaries/en';
import hi from '@/i18n/dictionaries/hi';
import fr from '@/i18n/dictionaries/fr';
import es from '@/i18n/dictionaries/es';
import pt from '@/i18n/dictionaries/pt';
import zh from '@/i18n/dictionaries/zh';

const dicts: Record<string, any> = { en, hi, fr, es, pt, zh };

// Keys that MUST exist in every dictionary for payment flows to render
// (English is the fallback, but we assert presence so missing translations
// surface in CI rather than silently falling back).
const REQUIRED_KEYS: string[] = [
  // payment namespace
  'payment.success',
  'payment.successDesc',
  'payment.failed',
  'payment.failedDesc',
  'payment.cancelled',
  'payment.cancelledDesc',
  'payment.pending',
  'payment.pendingDesc',
  'payment.verifyingPayment',
  'payment.verifyingDesc',
  'payment.orderId',
  'payment.paymentId',
  'payment.amountPaid',
  'payment.status',
  'payment.invoice',
  'payment.manageSubscription',
  'payment.refreshStatus',
  'payment.retryPayment',
  'payment.backToSubscription',
  // subscription namespace (payment-adjacent)
  'subscription.paymentConfirmationPending',
  'subscription.goToSubscription',
  'subscription.renewalDate',
  'subscription.historyDesc',
  'subscription.orderLabel',
  'subscription.paymentLabel',
  'subscription.historyLoadError',
  'subscription.upiIdLabel',
  'subscription.invoice',
  // status namespace (payment transaction states)
  'status.failed',
  'status.created',
  'status.cancelled',
  // profile namespace
  'profile.activeApplications',
  'profile.acceptedApplications',
  'profile.viewApplications',
  'profile.yourResumes',
];

function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc: any, part: string) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return acc[part];
  }, obj);
}

describe('Payment i18n coverage', () => {
  const langs = Object.keys(dicts);

  it('loads all 6 locale dictionaries', () => {
    expect(langs).toHaveLength(6);
    for (const lang of langs) {
      expect(typeof dicts[lang]).toBe('object');
    }
  });

  for (const lang of langs) {
    describe(`${lang} dictionary`, () => {
      for (const key of REQUIRED_KEYS) {
        it(`has key "${key}"`, () => {
          const v = getByPath(dicts[lang], key);
          expect(typeof v).toBe('string');
          expect(v.length).toBeGreaterThan(0);
        });
      }
    });
  }

  it('payment.successDesc supports {plan} interpolation', () => {
    const v = getByPath(dicts.en, 'payment.successDesc');
    expect(v).toContain('{plan}');
  });

  it('payment.cancelledDesc supports {plan} interpolation', () => {
    const v = getByPath(dicts.en, 'payment.cancelledDesc');
    expect(v).toContain('{plan}');
  });
});
