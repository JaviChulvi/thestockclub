import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Currency code to symbol mapping
 */
const CURRENCY_SYMBOLS = {
  AUD: 'A$',
  BRL: 'R$',
  CAD: 'C$',
  CHF: 'CHF',
  CNH: '¥',
  CNY: '¥',
  DKK: 'kr',
  EUR: '€',
  GBP: '£',
  GBp: 'p',      // Pence (1/100 of GBP)
  HKD: 'HK$',
  HUF: 'Ft',
  ILA: '₪',      // Israeli Agorot
  JPY: '¥',
  MXN: 'MX$',
  NOK: 'kr',
  NZD: 'NZ$',
  PLN: 'zł',
  SEK: 'kr',
  SGD: 'S$',
  USD: '$',
  ZAc: 'c',      // South African cents
};

/**
 * Get the currency symbol for a given currency code
 * @param {string} currencyCode - The ISO currency code (e.g., 'USD', 'EUR')
 * @returns {string} The currency symbol
 */
export function getCurrencySymbol(currencyCode) {
  if (!currencyCode) return '$';
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

/**
 * Format a price with the appropriate currency symbol
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - The ISO currency code
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted price with currency symbol
 */
export function formatPrice(amount, currencyCode, decimals = 2) {
  if (amount === null || amount === undefined) return 'N/A';

  const symbol = getCurrencySymbol(currencyCode);
  const formattedAmount = Number(amount).toFixed(decimals);

  // Currencies where symbol comes after the amount
  const suffixCurrencies = ['SEK', 'NOK', 'DKK', 'PLN', 'HUF', 'CHF'];

  if (suffixCurrencies.includes(currencyCode)) {
    return `${formattedAmount} ${symbol}`;
  }

  return `${symbol}${formattedAmount}`;
}

/**
 * Format a return value with sign and percentage
 */
export function formatReturn(value, decimals = 2) {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${parseFloat(value).toFixed(decimals)}%`;
}

/**
 * Get Tailwind color class for a return value
 */
export function getReturnColor(value) {
  if (value === null || value === undefined) return 'text-gray-600';
  return value >= 0 ? 'text-green-600' : 'text-red-600';
}

/**
 * Format a number with specified decimal places
 */
export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const num = parseFloat(value);
  if (isNaN(num)) return 'N/A';
  return num.toFixed(decimals);
}

/**
 * Format a value as percentage
 */
export function formatPercentage(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const num = parseFloat(value);
  if (isNaN(num)) return 'N/A';
  return `${num.toFixed(decimals)}%`;
}

/**
 * Format large numbers with T/B/M suffixes
 */
export function formatBigNumber(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const num = parseFloat(value);
  if (isNaN(num)) return 'N/A';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toFixed(2)}`;
}

