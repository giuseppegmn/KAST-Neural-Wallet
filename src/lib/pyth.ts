/**
 * Pyth Network Integration Module
 * 
 * Production-grade integration with Pyth Network via Hermes API.
 * Provides real-time price data with confidence intervals.
 * 
 * Features:
 * - Dynamic asset listing
 * - Real-time price fetching
 * - Data freshness validation
 * - Relative uncertainty calculation
 * - Automatic history recording
 */

import type { 
  SupportedToken, 
  ProcessedPriceData,
  TokenConfig,
  PythPriceFeed,
} from '@/types/MarketData';
import {
  PYTH_HERMES_BASE_URL,
  STALE_THRESHOLD_MS,
  MAX_ACCEPTABLE_UNCERTAINTY,
  SUPPORTED_TOKENS,
} from '@/types/MarketData';
import { addPrice } from './marketHistory';

// Re-export types for convenience
export type { SupportedToken, ProcessedPriceData } from '@/types/MarketData';
export { SUPPORTED_TOKENS } from '@/types/MarketData';

/**
 * Fetch latest price updates for given token symbols
 * 
 * @param symbols - Array of token symbols
 * @returns Array of processed price data
 */
export async function fetchPriceUpdates(
  symbols: SupportedToken[]
): Promise<ProcessedPriceData[]> {
  const feedIds = symbols.map(getFeedIdForSymbol);
  
  try {
    const response = await fetch(
      `${PYTH_HERMES_BASE_URL}/v2/updates/price/latest?` +
      feedIds.map(id => `ids[]=${id}`).join('&') +
      '&encoding=hex'
    );

    if (!response.ok) {
      throw new Error(`Pyth API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.parsed || !Array.isArray(data.parsed)) {
      throw new Error('Invalid response format from Pyth API');
    }

    const processed = data.parsed.map((feed: PythPriceFeed) => processPriceFeed(feed));
    
    // Update market history with new prices
    for (const priceData of processed) {
      addPrice(priceData.symbol, priceData.price, priceData.publishTime, priceData.confidence);
    }
    
    return processed;
  } catch (error) {
    console.error('Failed to fetch Pyth price updates:', error);
    throw error;
  }
}

/**
 * Fetch price updates for specific feed IDs directly
 * 
 * @param feedIds - Array of Pyth feed IDs
 * @returns Array of processed price data
 */
export async function fetchPriceUpdatesByFeedIds(
  feedIds: string[]
): Promise<ProcessedPriceData[]> {
  try {
    const response = await fetch(
      `${PYTH_HERMES_BASE_URL}/v2/updates/price/latest?` +
      feedIds.map(id => `ids[]=${id}`).join('&') +
      '&encoding=hex'
    );

    if (!response.ok) {
      throw new Error(`Pyth API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.parsed || !Array.isArray(data.parsed)) {
      throw new Error('Invalid response format from Pyth API');
    }

    const processed = data.parsed.map((feed: PythPriceFeed) => processPriceFeed(feed));
    
    // Update market history
    for (const priceData of processed) {
      addPrice(priceData.symbol, priceData.price, priceData.publishTime, priceData.confidence);
    }
    
    return processed;
  } catch (error) {
    console.error('Failed to fetch Pyth price updates:', error);
    throw error;
  }
}

/**
 * Process raw Pyth feed into usable format with computed metrics
 * 
 * @param feed - Raw Pyth price feed
 * @returns Processed price data
 */
function processPriceFeed(feed: PythPriceFeed): ProcessedPriceData {
  const { price, conf, expo, publishTime } = feed.price;
  
  // Convert from integer representation with exponent
  const priceValue = Number(price) * Math.pow(10, expo);
  const confidenceValue = Number(conf) * Math.pow(10, expo);
  
  // Compute relative uncertainty: conf / |price|
  const relativeUncertainty = priceValue !== 0 
    ? confidenceValue / Math.abs(priceValue) 
    : Infinity;
  
  // Check data freshness
  const now = Date.now();
  const publishTimeMs = publishTime * 1000; // Pyth uses seconds
  const dataFreshnessMs = now - publishTimeMs;
  const isStale = dataFreshnessMs > STALE_THRESHOLD_MS;
  
  // Determine validity
  const isValid = !isStale && relativeUncertainty <= MAX_ACCEPTABLE_UNCERTAINTY;
  
  const symbol = getSymbolForFeedId(feed.id);
  
  return {
    symbol,
    price: priceValue,
    confidence: confidenceValue,
    publishTime: publishTimeMs,
    expo,
    relativeUncertainty,
    dataFreshnessMs,
    isStale,
    isValid,
  };
}

/**
 * Get Pyth feed ID for a token symbol
 * 
 * @param symbol - Token symbol
 * @returns Pyth feed ID
 */
export function getFeedIdForSymbol(symbol: SupportedToken): string {
  const token = SUPPORTED_TOKENS.find(t => t.symbol === symbol);
  if (!token) {
    throw new Error(`Unsupported token: ${symbol}`);
  }
  return token.pythFeedId;
}

/**
 * Get token symbol for a Pyth feed ID
 * 
 * @param feedId - Pyth feed ID
 * @returns Token symbol
 */
function getSymbolForFeedId(feedId: string): string {
  const token = SUPPORTED_TOKENS.find(t => t.pythFeedId === feedId);
  return token?.symbol || 'UNKNOWN';
}

/**
 * Get token configuration by symbol
 * 
 * @param symbol - Token symbol
 * @returns Token configuration
 */
export function getTokenConfig(symbol: SupportedToken): TokenConfig {
  const token = SUPPORTED_TOKENS.find(t => t.symbol === symbol);
  if (!token) {
    throw new Error(`Unsupported token: ${symbol}`);
  }
  return token;
}

/**
 * Format price with appropriate decimals
 * 
 * @param price - Price value
 * @param decimals - Number of decimal places
 * @returns Formatted price string
 */
export function formatPrice(price: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);
}

/**
 * Format relative uncertainty as percentage
 * 
 * @param uncertainty - Relative uncertainty value
 * @returns Formatted percentage string
 */
export function formatUncertainty(uncertainty: number): string {
  return `${(uncertainty * 100).toFixed(3)}%`;
}

/**
 * Format data freshness in human-readable format
 * 
 * @param ms - Milliseconds
 * @returns Formatted string
 */
export function formatFreshness(ms: number): string {
  if (ms < 1000) return '< 1s';
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  return `${Math.floor(ms / 3600000)}h`;
}

/**
 * Check if price data is safe to use for simulations
 * 
 * @param data - Processed price data
 * @returns Safety check result
 */
export function isPriceDataSafe(data: ProcessedPriceData): {
  safe: boolean;
  reason?: string;
} {
  if (data.isStale) {
    return {
      safe: false,
      reason: `Data is stale (${formatFreshness(data.dataFreshnessMs)} old). Maximum allowed: 60s`,
    };
  }
  
  if (data.relativeUncertainty > MAX_ACCEPTABLE_UNCERTAINTY) {
    return {
      safe: false,
      reason: `Uncertainty too high (${formatUncertainty(data.relativeUncertainty)}). Maximum allowed: 1%`,
    };
  }
  
  return { safe: true };
}

/**
 * Compute USD value for a token amount
 * 
 * @param tokenAmount - Token amount
 * @param priceData - Price data
 * @param tokenDecimals - Token decimals
 * @returns USD value
 */
export function computeUsdValue(
  tokenAmount: number,
  priceData: ProcessedPriceData,
  tokenDecimals: number
): number {
  const normalizedAmount = tokenAmount * Math.pow(10, -tokenDecimals);
  return normalizedAmount * priceData.price;
}

/**
 * Get all supported tokens
 * 
 * @returns Array of supported token configurations
 */
export function getSupportedTokens(): TokenConfig[] {
  return SUPPORTED_TOKENS;
}

/**
 * Get supported token symbols
 * 
 * @returns Array of token symbols
 */
export function getSupportedSymbols(): SupportedToken[] {
  return SUPPORTED_TOKENS.map(t => t.symbol);
}
