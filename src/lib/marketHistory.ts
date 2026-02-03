/**
 * Market History Time-Series Engine
 * 
 * Maintains rolling windows of historical price data for statistical analysis.
 * All series are stored in-memory with configurable window sizes.
 * 
 * Mathematical Foundation:
 * - Time-series data structure for statistical operations
 * - Rolling window maintains recency bias (more weight to recent data)
 * - O(1) append, O(n) statistical calculations
 */

import { mean, standardDeviation, variance, min, max } from 'simple-statistics';

/**
 * Historical price point with timestamp
 */
export interface PricePoint {
  price: number;
  timestamp: number; // Unix timestamp in ms
  confidence?: number; // Optional confidence interval from source
}

/**
 * Time series for a single asset
 */
export interface AssetTimeSeries {
  symbol: string;
  prices: PricePoint[];
  maxWindowSize: number;
}

/**
 * Statistical summary of a time series
 */
export interface SeriesStatistics {
  symbol: string;
  count: number;
  mean: number;
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  range: number;
  latestPrice: number;
  latestTimestamp: number;
  // Returns
  totalReturn: number; // (last - first) / first
  annualizedVolatility: number; // stdDev * sqrt(365) for daily data
  // Drawdown
  maxDrawdown: number; // Peak to trough decline
  currentDrawdown: number; // Current decline from peak
}

// In-memory storage for all asset series
const marketHistory: Map<string, AssetTimeSeries> = new Map();

// Default window sizes
const DEFAULT_WINDOW_SIZE = 50;
const EXTENDED_WINDOW_SIZE = 100;

/**
 * Initialize a new asset time series
 * 
 * @param symbol - Asset symbol (e.g., 'BTC', 'ETH')
 * @param maxWindowSize - Maximum number of price points to maintain
 */
export function initializeSeries(
  symbol: string,
  maxWindowSize: number = DEFAULT_WINDOW_SIZE
): AssetTimeSeries {
  const series: AssetTimeSeries = {
    symbol,
    prices: [],
    maxWindowSize,
  };
  marketHistory.set(symbol, series);
  return series;
}

/**
 * Add a price point to an asset's time series
 * 
 * @param symbol - Asset symbol
 * @param price - Price value
 * @param timestamp - Unix timestamp (defaults to now)
 * @param confidence - Optional confidence interval
 * @returns The updated series
 */
export function addPrice(
  symbol: string,
  price: number,
  timestamp: number = Date.now(),
  confidence?: number
): AssetTimeSeries {
  let series = marketHistory.get(symbol);
  
  if (!series) {
    series = initializeSeries(symbol);
  }
  
  // Add new price point
  series.prices.push({
    price,
    timestamp,
    confidence,
  });
  
  // Maintain rolling window - remove oldest if exceeded
  if (series.prices.length > series.maxWindowSize) {
    series.prices.shift();
  }
  
  return series;
}

/**
 * Get the full time series for an asset
 * 
 * @param symbol - Asset symbol
 * @returns The time series or undefined if not found
 */
export function getSeries(symbol: string): AssetTimeSeries | undefined {
  return marketHistory.get(symbol);
}

/**
 * Get price array for an asset (convenience method)
 * 
 * @param symbol - Asset symbol
 * @returns Array of prices or empty array
 */
export function getPriceArray(symbol: string): number[] {
  const series = marketHistory.get(symbol);
  return series ? series.prices.map(p => p.price) : [];
}

/**
 * Get timestamp array for an asset
 * 
 * @param symbol - Asset symbol
 * @returns Array of timestamps
 */
export function getTimestampArray(symbol: string): number[] {
  const series = marketHistory.get(symbol);
  return series ? series.prices.map(p => p.timestamp) : [];
}

/**
 * Calculate volatility (annualized standard deviation of returns)
 * 
 * Formula: σ_annual = σ_daily × √365
 * 
 * @param symbol - Asset symbol
 * @returns Annualized volatility or 0 if insufficient data
 */
export function getVolatility(symbol: string): number {
  const series = marketHistory.get(symbol);
  
  if (!series || series.prices.length < 2) {
    return 0;
  }
  
  // Calculate log returns: ln(P_t / P_{t-1})
  const returns: number[] = [];
  for (let i = 1; i < series.prices.length; i++) {
    const prevPrice = series.prices[i - 1].price;
    const currPrice = series.prices[i].price;
    const logReturn = Math.log(currPrice / prevPrice);
    returns.push(logReturn);
  }
  
  if (returns.length < 2) {
    return 0;
  }
  
  // Calculate standard deviation of returns
  const returnStdDev = standardDeviation(returns);
  
  // Annualize (assuming data points are roughly evenly spaced)
  // For high-frequency data, we estimate daily count
  const dataPointsPerDay = estimateDataFrequency(series);
  const annualizationFactor = Math.sqrt(365 * dataPointsPerDay);
  
  return returnStdDev * annualizationFactor;
}

/**
 * Calculate maximum drawdown from peak
 * 
 * Formula: MD = max((Peak - Trough) / Peak)
 * 
 * @param symbol - Asset symbol
 * @returns Maximum drawdown as decimal (e.g., 0.5 = 50%)
 */
export function getDrawdown(symbol: string): { max: number; current: number } {
  const series = marketHistory.get(symbol);
  
  if (!series || series.prices.length < 2) {
    return { max: 0, current: 0 };
  }
  
  const prices = series.prices.map(p => p.price);
  
  let peak = prices[0];
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  
  for (let i = 0; i < prices.length; i++) {
    const price = prices[i];
    
    // Update peak
    if (price > peak) {
      peak = price;
    }
    
    // Calculate drawdown from current peak
    const drawdown = (peak - price) / peak;
    
    // Update max drawdown
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
    
    // Current drawdown is from the latest price
    if (i === prices.length - 1) {
      currentDrawdown = drawdown;
    }
  }
  
  return { max: maxDrawdown, current: currentDrawdown };
}

/**
 * Get comprehensive statistics for a time series
 * 
 * @param symbol - Asset symbol
 * @returns Statistical summary or null if insufficient data
 */
export function getStatistics(symbol: string): SeriesStatistics | null {
  const series = marketHistory.get(symbol);
  
  if (!series || series.prices.length < 2) {
    return null;
  }
  
  const prices = series.prices.map(p => p.price);
  const timestamps = series.prices.map(p => p.timestamp);
  
  const priceMean = mean(prices);
  const priceVariance = variance(prices);
  const priceStdDev = standardDeviation(prices);
  const priceMin = min(prices);
  const priceMax = max(prices);
  
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const totalReturn = (lastPrice - firstPrice) / firstPrice;
  
  const annualizedVol = getVolatility(symbol);
  const drawdown = getDrawdown(symbol);
  
  return {
    symbol,
    count: prices.length,
    mean: priceMean,
    variance: priceVariance,
    stdDev: priceStdDev,
    min: priceMin,
    max: priceMax,
    range: priceMax - priceMin,
    latestPrice: lastPrice,
    latestTimestamp: timestamps[timestamps.length - 1],
    totalReturn,
    annualizedVolatility: annualizedVol,
    maxDrawdown: drawdown.max,
    currentDrawdown: drawdown.current,
  };
}

/**
 * Get all tracked asset symbols
 * 
 * @returns Array of symbols
 */
export function getAllSymbols(): string[] {
  return Array.from(marketHistory.keys());
}

/**
 * Clear all historical data (for testing/reset)
 */
export function clearAllHistory(): void {
  marketHistory.clear();
}

/**
 * Estimate data frequency (points per day)
 * 
 * @param series - Time series
 * @returns Estimated data points per day
 */
function estimateDataFrequency(series: AssetTimeSeries): number {
  if (series.prices.length < 2) {
    return 1; // Default to daily
  }
  
  const firstTime = series.prices[0].timestamp;
  const lastTime = series.prices[series.prices.length - 1].timestamp;
  const timeSpanMs = lastTime - firstTime;
  const timeSpanDays = timeSpanMs / (1000 * 60 * 60 * 24);
  
  if (timeSpanDays <= 0) {
    return 1;
  }
  
  return series.prices.length / timeSpanDays;
}

/**
 * Seed historical data with synthetic prices for testing/demo
 * This creates realistic-looking price movements using geometric Brownian motion
 * 
 * @param symbol - Asset symbol
 * @param initialPrice - Starting price
 * @param days - Number of days of history
 * @param volatility - Annualized volatility
 * @param drift - Expected return (annualized)
 */
export function seedSyntheticHistory(
  symbol: string,
  initialPrice: number,
  days: number = 30,
  volatility: number = 0.5, // 50% annual volatility
  drift: number = 0.1 // 10% annual return
): AssetTimeSeries {
  const series = initializeSeries(symbol, EXTENDED_WINDOW_SIZE);
  
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  
  // Geometric Brownian Motion parameters
  const dt = 1 / 365; // Daily time step
  const mu = drift; // Drift
  const sigma = volatility; // Volatility
  
  let currentPrice = initialPrice;
  
  for (let i = days; i >= 0; i--) {
    const timestamp = now - (i * msPerDay);
    
    // Add price point
    addPrice(symbol, currentPrice, timestamp);
    
    // Generate next price using GBM
    // dS/S = μdt + σdW
    const randomShock = randomNormal();
    const priceChange = mu * dt + sigma * Math.sqrt(dt) * randomShock;
    currentPrice = currentPrice * Math.exp(priceChange);
  }
  
  return series;
}

/**
 * Box-Muller transform for standard normal random numbers
 * @returns Random sample from N(0, 1)
 */
function randomNormal(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Calculate rolling statistics over a window
 * 
 * @param symbol - Asset symbol
 * @param windowSize - Size of rolling window
 * @returns Array of rolling statistics
 */
export function getRollingStatistics(
  symbol: string,
  windowSize: number = 20
): Array<{ timestamp: number; mean: number; stdDev: number }> {
  const series = marketHistory.get(symbol);
  
  if (!series || series.prices.length < windowSize) {
    return [];
  }
  
  const results: Array<{ timestamp: number; mean: number; stdDev: number }> = [];
  
  for (let i = windowSize - 1; i < series.prices.length; i++) {
    const window = series.prices.slice(i - windowSize + 1, i + 1);
    const prices = window.map(p => p.price);
    
    results.push({
      timestamp: series.prices[i].timestamp,
      mean: mean(prices),
      stdDev: standardDeviation(prices),
    });
  }
  
  return results;
}
