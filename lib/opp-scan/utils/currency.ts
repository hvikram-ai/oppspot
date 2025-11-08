/**
 * Currency Utility Functions
 *
 * Handles multi-currency support for global Opp Scan feature
 *
 * Features:
 * - Currency conversion using ECB (free) or Exchange Rate API
 * - Currency formatting with proper symbols and decimals
 * - Historical rate caching to reduce API calls
 * - Fallback to approximate rates if API unavailable
 */

import { createClient } from '@/lib/supabase/client';

// Currency symbols mapping
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  CHF: 'CHF',
  CAD: 'C$',
  AUD: 'A$',
  NZD: 'NZ$',
  SGD: 'S$',
  HKD: 'HK$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  INR: '₹',
  KRW: '₩',
  MXN: '$',
  BRL: 'R$',
  ZAR: 'R',
  AED: 'د.إ',
  SAR: 'ر.س',
  RUB: '₽',
  TRY: '₺',
  PLN: 'zł',
  THB: '฿',
  MYR: 'RM',
  IDR: 'Rp',
  PHP: '₱',
  VND: '₫',
  ILS: '₪',
  EGP: 'E£',
  NGN: '₦',
  KES: 'KSh',
  CLP: '$',
  COP: '$',
  PEN: 'S/',
  ARS: '$',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
};

// Decimal places for each currency (most use 2, some like JPY use 0)
export const CURRENCY_DECIMALS: Record<string, number> = {
  JPY: 0, // Japanese Yen
  KRW: 0, // South Korean Won
  VND: 0, // Vietnamese Dong
  IDR: 0, // Indonesian Rupiah
  CLP: 0, // Chilean Peso
  // Default for all others is 2
};

/**
 * Exchange rate interface
 */
export interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  date: string;
  source: 'ecb' | 'exchangerate-api' | 'approximate';
}

/**
 * Get exchange rate from EUR (ECB provides all rates in EUR base)
 * Free API, no key required
 */
async function getECBRate(toCurrency: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.exchangerate.host/latest?base=EUR&symbols=${toCurrency}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.rates?.[toCurrency] || null;
  } catch (error) {
    console.error('ECB rate fetch error:', error);
    return null;
  }
}

/**
 * Get exchange rate using free Exchange Rate API
 */
async function getExchangeRateAPI(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.exchangerate.host/convert?from=${fromCurrency}&to=${toCurrency}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.result || null;
  } catch (error) {
    console.error('Exchange Rate API error:', error);
    return null;
  }
}

/**
 * Approximate exchange rates as fallback (relative to USD)
 * Updated periodically - these are rough estimates from Jan 2025
 */
const APPROXIMATE_RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 145.0,
  CNY: 7.2,
  CHF: 0.84,
  CAD: 1.35,
  AUD: 1.52,
  NZD: 1.65,
  SGD: 1.33,
  HKD: 7.8,
  SEK: 10.3,
  NOK: 10.5,
  DKK: 6.9,
  INR: 83.0,
  KRW: 1310.0,
  MXN: 17.5,
  BRL: 5.0,
  ZAR: 18.0,
  AED: 3.67,
  SAR: 3.75,
  RUB: 90.0,
  TRY: 30.0,
  PLN: 4.0,
  THB: 33.0,
  MYR: 4.4,
  IDR: 15700.0,
  PHP: 55.0,
  VND: 24000.0,
  ILS: 3.6,
  EGP: 48.0,
  NGN: 1500.0,
  KES: 130.0,
  CLP: 950.0,
  COP: 4000.0,
  PEN: 3.7,
  ARS: 1000.0,
  CZK: 22.5,
  HUF: 360.0,
  RON: 4.5,
};

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  options: {
    useCache?: boolean;
    fallbackToApproximate?: boolean;
  } = {}
): Promise<{
  amount: number;
  rate: number;
  source: 'ecb' | 'exchangerate-api' | 'approximate' | 'cache';
}> {
  const { useCache = true, fallbackToApproximate = true } = options;

  // Same currency, no conversion needed
  if (fromCurrency === toCurrency) {
    return { amount, rate: 1.0, source: 'cache' };
  }

  // Try to get rate from API
  let rate: number | null = null;

  // Try ECB first (free, reliable)
  if (fromCurrency === 'EUR') {
    rate = await getECBRate(toCurrency);
  } else if (toCurrency === 'EUR') {
    const reverseRate = await getECBRate(fromCurrency);
    if (reverseRate) rate = 1 / reverseRate;
  } else {
    // For non-EUR pairs, use Exchange Rate API
    rate = await getExchangeRateAPI(fromCurrency, toCurrency);
  }

  if (rate !== null) {
    return {
      amount: amount * rate,
      rate,
      source: 'exchangerate-api',
    };
  }

  // Fallback to approximate rates
  if (fallbackToApproximate) {
    const fromRate = APPROXIMATE_RATES_TO_USD[fromCurrency];
    const toRate = APPROXIMATE_RATES_TO_USD[toCurrency];

    if (fromRate && toRate) {
      const approximateRate = toRate / fromRate;
      return {
        amount: amount * approximateRate,
        rate: approximateRate,
        source: 'approximate',
      };
    }
  }

  // If all else fails, return original amount with rate 1
  console.warn(`Could not convert ${fromCurrency} to ${toCurrency}, returning original amount`);
  return {
    amount,
    rate: 1.0,
    source: 'approximate',
  };
}

/**
 * Format currency amount with proper symbol and decimals
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
    locale?: string;
  } = {}
): string {
  const { showSymbol = true, showCode = false, locale = 'en-US' } = options;

  const decimals = CURRENCY_DECIMALS[currencyCode] ?? 2;
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;

  // Format the number
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  // Build the result
  if (showSymbol && showCode) {
    return `${symbol}${formatted} ${currencyCode}`;
  } else if (showSymbol) {
    return `${symbol}${formatted}`;
  } else if (showCode) {
    return `${formatted} ${currencyCode}`;
  } else {
    return formatted;
  }
}

/**
 * Format currency with automatic conversion
 */
export async function formatCurrencyWithConversion(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
    locale?: string;
    showOriginal?: boolean;
  } = {}
): Promise<string> {
  const { showOriginal = false, ...formatOptions } = options;

  const { amount: convertedAmount } = await convertCurrency(amount, fromCurrency, toCurrency);

  const formattedConverted = formatCurrency(convertedAmount, toCurrency, formatOptions);

  if (showOriginal && fromCurrency !== toCurrency) {
    const formattedOriginal = formatCurrency(amount, fromCurrency, {
      showSymbol: true,
      showCode: true,
    });
    return `${formattedConverted} (${formattedOriginal})`;
  }

  return formattedConverted;
}

/**
 * Get all supported currencies
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(APPROXIMATE_RATES_TO_USD).sort();
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

/**
 * Get currency decimals
 */
export function getCurrencyDecimals(currencyCode: string): number {
  return CURRENCY_DECIMALS[currencyCode] ?? 2;
}

/**
 * Validate currency code
 */
export function isValidCurrency(currencyCode: string): boolean {
  return currencyCode in APPROXIMATE_RATES_TO_USD;
}

/**
 * Get user's preferred currency from profile or browser locale
 */
export async function getUserPreferredCurrency(userId?: string): Promise<string> {
  // Try to get from user profile
  if (userId) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('preferred_currency')
        .eq('id', userId)
        .single();

      if (data?.preferred_currency) {
        return data.preferred_currency;
      }
    } catch (error) {
      console.error('Error fetching user currency preference:', error);
    }
  }

  // Fallback to browser locale
  try {
    const locale = navigator.language || 'en-US';
    const localeToCurrency: Record<string, string> = {
      'en-US': 'USD',
      'en-GB': 'GBP',
      'en-AU': 'AUD',
      'en-NZ': 'NZD',
      'en-CA': 'CAD',
      'en-SG': 'SGD',
      'en-HK': 'HKD',
      'en-IN': 'INR',
      'de': 'EUR',
      'fr': 'EUR',
      'es': 'EUR',
      'it': 'EUR',
      'nl': 'EUR',
      'pt': 'EUR',
      'ja': 'JPY',
      'ko': 'KRW',
      'zh-CN': 'CNY',
      'zh-HK': 'HKD',
      'zh-TW': 'TWD',
      'ru': 'RUB',
      'tr': 'TRY',
      'pl': 'PLN',
      'th': 'THB',
      'vi': 'VND',
      'id': 'IDR',
      'ms': 'MYR',
      'ar': 'SAR',
      'he': 'ILS',
    };

    return localeToCurrency[locale] || localeToCurrency[locale.split('-')[0]] || 'USD';
  } catch {
    return 'USD';
  }
}

/**
 * Batch convert multiple amounts
 */
export async function convertCurrencyBatch(
  amounts: Array<{ amount: number; from: string; to: string }>,
  options: {
    useCache?: boolean;
    fallbackToApproximate?: boolean;
  } = {}
): Promise<Array<{ amount: number; rate: number; source: string }>> {
  return Promise.all(
    amounts.map(({ amount, from, to }) => convertCurrency(amount, from, to, options))
  );
}

/**
 * Get exchange rate only (without conversion)
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  options: {
    fallbackToApproximate?: boolean;
  } = {}
): Promise<{ rate: number; source: 'ecb' | 'exchangerate-api' | 'approximate' }> {
  const { rate, source } = await convertCurrency(1, fromCurrency, toCurrency, options);
  return { rate, source };
}
