/**
 * Market Data Types for Pyth Network Integration
 * All timestamps in milliseconds
 */

export interface PythPriceFeed {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publishTime: number;
  };
  emaPrice?: {
    price: string;
    conf: string;
    expo: number;
    publishTime: number;
  };
  metadata?: {
    symbol: string;
    assetType: string;
  };
}

export interface PythPriceUpdate {
  binary: {
    data: string[];
    encoding: 'base64';
  };
  parsed: PythPriceFeed[];
}

export interface ProcessedPriceData {
  symbol: string;
  price: number;
  confidence: number;
  publishTime: number;
  expo: number;
  // Computed metrics
  relativeUncertainty: number; // conf / |price|
  dataFreshnessMs: number; // now - publishTime
  isStale: boolean; // freshness > 60s
  isValid: boolean; // all checks pass
}

export type SupportedToken = 'BTC' | 'ETH' | 'SOL' | 'USDC' | 'USDT';

export interface TokenConfig {
  symbol: SupportedToken;
  pythFeedId: string;
  decimals: number;
  displayName: string;
  icon?: string;
}

export const SUPPORTED_TOKENS: TokenConfig[] = [
  {
    symbol: 'BTC',
    pythFeedId: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
    decimals: 8,
    displayName: 'Bitcoin',
  },
  {
    symbol: 'ETH',
    pythFeedId: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    decimals: 8,
    displayName: 'Ethereum',
  },
  {
    symbol: 'SOL',
    pythFeedId: 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
    decimals: 8,
    displayName: 'Solana',
  },
  {
    symbol: 'USDC',
    pythFeedId: 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
    decimals: 6,
    displayName: 'USD Coin',
  },
  {
    symbol: 'USDT',
    pythFeedId: '2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
    decimals: 6,
    displayName: 'Tether',
  },
];

export const PYTH_HERMES_BASE_URL = 'https://hermes.pyth.network';
export const STALE_THRESHOLD_MS = 60000; // 60 seconds
export const MAX_ACCEPTABLE_UNCERTAINTY = 0.01; // 1%
