/**
 * Statistical Forecasting Engine
 * 
 * Implements real forecasting models with mathematical rigor:
 * 1. Rolling Linear Regression with confidence intervals
 * 2. Exponential Smoothing (Holt-Winters style)
 * 3. Mean Reversion model
 * 
 * All models are deterministic and fully explainable.
 * No LLM. No heuristics. Pure statistics.
 */

import { linearRegression, linearRegressionLine, standardDeviation, mean } from 'simple-statistics';
import { getPriceArray, getTimestampArray } from './marketHistory';

/**
 * Forecast result with confidence bounds
 */
export interface ForecastResult {
  // Point estimate
  expectedValue: number;
  
  // Confidence interval
  lowerBound: number;
  upperBound: number;
  
  // Error metrics
  errorMargin: number; // Half-width of CI
  confidenceLevel: number; // e.g., 0.95 for 95%
  
  // Model metadata
  model: string;
  modelParams: Record<string, number>;
  
  // Input data summary
  inputDataPoints: number;
  forecastHorizon: number; // Steps ahead
  
  // Model diagnostics
  rSquared?: number; // For regression models
  rmse?: number; // Root mean squared error
}

/**
 * Forecast model type
 */
export type ForecastModel = 'rolling_regression' | 'exponential_smoothing' | 'mean_reversion';

/**
 * Rolling Linear Regression Forecast
 * 
 * Model: P(t) = α + βt + ε
 * 
 * Forecast: P(t+h) = α + β(t+h)
 * 
 * Confidence Interval:
 * CI = P̂ ± t_(α/2, n-2) × SE × √(1 + 1/n + (t+h - t̄)²/Sxx)
 * 
 * @param symbol - Asset symbol
 * @param horizon - Forecast horizon (steps ahead)
 * @param confidenceLevel - Confidence level (default 0.95)
 * @returns Forecast result
 */
export function forecastRollingRegression(
  symbol: string,
  horizon: number = 7,
  confidenceLevel: number = 0.95
): ForecastResult | null {
  const prices = getPriceArray(symbol);
  const timestamps = getTimestampArray(symbol);
  
  if (prices.length < 10) {
    return null; // Insufficient data
  }
  
  // Create time index (normalized to start at 0)
  const startTime = timestamps[0];
  const timeIndex = timestamps.map(t => (t - startTime) / (1000 * 60 * 60 * 24)); // Days
  
  // Prepare data for regression: [x, y] pairs
  const data: Array<[number, number]> = timeIndex.map((t, i) => [t, prices[i]]);
  
  // Fit linear regression
  const regression = linearRegression(data);
  const regressionFn = linearRegressionLine(regression);
  
  // Calculate R-squared
  const yMean = mean(prices);
  const ssTotal = prices.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = prices.reduce((sum, _, i) => {
    const predicted = regressionFn(timeIndex[i]);
    return sum + Math.pow(prices[i] - predicted, 2);
  }, 0);
  const rSquared = 1 - (ssResidual / ssTotal);
  
  // Calculate RMSE
  const rmse = Math.sqrt(ssResidual / prices.length);
  
  // Forecast point
  const lastTime = timeIndex[timeIndex.length - 1];
  const forecastTime = lastTime + horizon;
  const expectedValue = regressionFn(forecastTime);
  
  // Calculate confidence interval
  // Simplified approach: use RMSE scaled by time distance
  const n = prices.length;
  const timeMean = mean(timeIndex);
  const sxx = timeIndex.reduce((sum, t) => sum + Math.pow(t - timeMean, 2), 0);
  
  // Standard error of forecast
  const timeDistance = Math.pow(forecastTime - timeMean, 2) / sxx;
  const seForecast = rmse * Math.sqrt(1 + 1/n + timeDistance);
  
  // t-value for confidence level (approximate for n > 30)
  const tValue = getTValue(confidenceLevel, n - 2);
  
  const marginOfError = tValue * seForecast;
  
  return {
    expectedValue,
    lowerBound: Math.max(0, expectedValue - marginOfError),
    upperBound: expectedValue + marginOfError,
    errorMargin: marginOfError,
    confidenceLevel,
    model: 'rolling_regression',
    modelParams: {
      alpha: regression.b, // Intercept
      beta: regression.m,  // Slope
      rSquared,
      rmse,
    },
    inputDataPoints: prices.length,
    forecastHorizon: horizon,
    rSquared,
    rmse,
  };
}

/**
 * Exponential Smoothing Forecast (Holt's Linear Method)
 * 
 * Level: L_t = αY_t + (1-α)(L_{t-1} + T_{t-1})
 * Trend: T_t = β(L_t - L_{t-1}) + (1-β)T_{t-1}
 * Forecast: F_{t+h} = L_t + h × T_t
 * 
 * @param symbol - Asset symbol
 * @param horizon - Forecast horizon
 * @param alpha - Level smoothing factor (0-1, default 0.3)
 * @param beta - Trend smoothing factor (0-1, default 0.1)
 * @param confidenceLevel - Confidence level
 * @returns Forecast result
 */
export function forecastExponentialSmoothing(
  symbol: string,
  horizon: number = 7,
  alpha: number = 0.3,
  beta: number = 0.1,
  confidenceLevel: number = 0.95
): ForecastResult | null {
  const prices = getPriceArray(symbol);
  
  if (prices.length < 10) {
    return null;
  }
  
  // Initialize level and trend
  let level = prices[0];
  let trend = prices[1] - prices[0];
  
  // Apply smoothing
  for (let i = 1; i < prices.length; i++) {
    const prevLevel = level;
    level = alpha * prices[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  
  // Forecast
  const expectedValue = level + horizon * trend;
  
  // Calculate prediction interval
  // Approximate using recent residuals
  const residuals: number[] = [];
  let tempLevel = prices[0];
  let tempTrend = prices[1] - prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    const forecast = tempLevel + tempTrend;
    const residual = prices[i] - forecast;
    residuals.push(residual);
    
    const prevLevel = tempLevel;
    tempLevel = alpha * prices[i] + (1 - alpha) * (tempLevel + tempTrend);
    tempTrend = beta * (tempLevel - prevLevel) + (1 - beta) * tempTrend;
  }
  
  const residualStdDev = standardDeviation(residuals);
  const zValue = getZValue(confidenceLevel);
  
  // Scale error by horizon (uncertainty increases with time)
  const horizonScale = Math.sqrt(horizon);
  const marginOfError = zValue * residualStdDev * horizonScale;
  
  return {
    expectedValue,
    lowerBound: Math.max(0, expectedValue - marginOfError),
    upperBound: expectedValue + marginOfError,
    errorMargin: marginOfError,
    confidenceLevel,
    model: 'exponential_smoothing',
    modelParams: {
      alpha,
      beta,
      finalLevel: level,
      finalTrend: trend,
      residualStdDev,
    },
    inputDataPoints: prices.length,
    forecastHorizon: horizon,
    rmse: Math.sqrt(mean(residuals.map(r => r * r))),
  };
}

/**
 * Mean Reversion Forecast (Ornstein-Uhlenbeck inspired)
 * 
 * Model: dX_t = θ(μ - X_t)dt + σdW_t
 * 
 * Where:
 * - μ = long-term mean
 * - θ = speed of reversion
 * - σ = volatility
 * 
 * @param symbol - Asset symbol
 * @param horizon - Forecast horizon
 * @param confidenceLevel - Confidence level
 * @returns Forecast result
 */
export function forecastMeanReversion(
  symbol: string,
  horizon: number = 7,
  confidenceLevel: number = 0.95
): ForecastResult | null {
  const prices = getPriceArray(symbol);
  
  if (prices.length < 20) {
    return null;
  }
  
  // Estimate long-term mean (μ)
  const longTermMean = mean(prices);
  
  // Estimate speed of reversion (θ) using AR(1) coefficient
  // X_t - μ = φ(X_{t-1} - μ) + ε_t
  // θ = -ln(φ) for continuous time approximation
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(prices[i] - prices[i - 1]);
  }
  
  // Calculate AR(1) coefficient using OLS
  const y = returns.slice(1);
  const x = returns.slice(0, -1);
  
  const xMean = mean(x);
  const yMean = mean(y);
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < x.length; i++) {
    numerator += (x[i] - xMean) * (y[i] - yMean);
    denominator += Math.pow(x[i] - xMean, 2);
  }
  
  const phi = denominator !== 0 ? numerator / denominator : 0;
  const theta = Math.max(0.01, -Math.log(Math.abs(phi))); // Speed of reversion
  
  // Estimate volatility (σ)
  const returnStdDev = standardDeviation(returns);
  
  // Current deviation from mean
  const currentPrice = prices[prices.length - 1];
  const deviation = currentPrice - longTermMean;
  
  // Expected value: reverts toward mean
  // E[X_{t+h}] = μ + (X_t - μ) × e^(-θh)
  const decayFactor = Math.exp(-theta * horizon);
  const expectedValue = longTermMean + deviation * decayFactor;
  
  // Variance increases with time but bounded
  // Var(X_{t+h}) = σ²/(2θ) × (1 - e^(-2θh))
  const variance = (returnStdDev * returnStdDev) / (2 * theta) * (1 - Math.exp(-2 * theta * horizon));
  const stdDev = Math.sqrt(variance);
  
  const zValue = getZValue(confidenceLevel);
  const marginOfError = zValue * stdDev;
  
  return {
    expectedValue,
    lowerBound: Math.max(0, expectedValue - marginOfError),
    upperBound: expectedValue + marginOfError,
    errorMargin: marginOfError,
    confidenceLevel,
    model: 'mean_reversion',
    modelParams: {
      longTermMean,
      theta: theta,
      sigma: returnStdDev,
      currentDeviation: deviation,
      halfLife: Math.log(2) / theta, // Time to revert 50%
    },
    inputDataPoints: prices.length,
    forecastHorizon: horizon,
    rmse: returnStdDev,
  };
}

/**
 * Ensemble Forecast (combines multiple models)
 * 
 * Takes weighted average of all available forecasts
 * Weights based on historical accuracy (inverse RMSE)
 * 
 * @param symbol - Asset symbol
 * @param horizon - Forecast horizon
 * @param confidenceLevel - Confidence level
 * @returns Ensemble forecast
 */
export function forecastEnsemble(
  symbol: string,
  horizon: number = 7,
  confidenceLevel: number = 0.95
): ForecastResult | null {
  const forecasts: ForecastResult[] = [];
  
  // Generate forecasts from all models
  const regression = forecastRollingRegression(symbol, horizon, confidenceLevel);
  if (regression) forecasts.push(regression);
  
  const smoothing = forecastExponentialSmoothing(symbol, horizon, 0.3, 0.1, confidenceLevel);
  if (smoothing) forecasts.push(smoothing);
  
  const meanRev = forecastMeanReversion(symbol, horizon, confidenceLevel);
  if (meanRev) forecasts.push(meanRev);
  
  if (forecasts.length === 0) {
    return null;
  }
  
  if (forecasts.length === 1) {
    return forecasts[0];
  }
  
  // Calculate weights based on inverse RMSE
  const weights = forecasts.map(f => {
    const rmse = f.rmse || 1;
    return 1 / (rmse * rmse); // Inverse variance weighting
  });
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);
  
  // Weighted average of point estimates
  const expectedValue = forecasts.reduce(
    (sum, f, i) => sum + f.expectedValue * normalizedWeights[i],
    0
  );
  
  // Combine confidence intervals (conservative approach: max width)
  const lowerBounds = forecasts.map(f => f.lowerBound);
  const upperBounds = forecasts.map(f => f.upperBound);
  
  const lowerBound = Math.min(...lowerBounds);
  const upperBound = Math.max(...upperBounds);
  const errorMargin = (upperBound - lowerBound) / 2;
  
  // Weighted average RMSE
  const ensembleRmse = forecasts.reduce(
    (sum, f, i) => sum + (f.rmse || 1) * normalizedWeights[i],
    0
  );
  
  return {
    expectedValue,
    lowerBound,
    upperBound,
    errorMargin,
    confidenceLevel,
    model: 'ensemble',
    modelParams: {
      modelsUsed: forecasts.length,
      weights: normalizedWeights.length > 0 ? normalizedWeights[0] : 0,
      individualForecasts: forecasts.length,
    },
    inputDataPoints: Math.max(...forecasts.map(f => f.inputDataPoints)),
    forecastHorizon: horizon,
    rmse: ensembleRmse,
  };
}

/**
 * Get t-value for given confidence level and degrees of freedom
 */
function getTValue(confidenceLevel: number, df: number): number {
  // Approximation for t-distribution
  // For df > 30, t ≈ z (normal distribution)
  if (df > 30) {
    return getZValue(confidenceLevel);
  }
  
  // Common t-values table
  const tTable: Record<number, Record<number, number>> = {
    0.9: { 5: 2.015, 10: 1.812, 20: 1.725, 30: 1.697 },
    0.95: { 5: 2.571, 10: 2.228, 20: 2.086, 30: 2.042 },
    0.99: { 5: 4.032, 10: 3.169, 20: 2.845, 30: 2.750 },
  };
  
  const level = Math.round(confidenceLevel * 100) / 100;
  const levelTable = tTable[level];
  
  if (!levelTable) {
    return getZValue(confidenceLevel); // Fallback to normal
  }
  
  // Find closest df
  const dfs = Object.keys(levelTable).map(Number).sort((a, b) => a - b);
  const closestDf = dfs.find(d => d >= df) || dfs[dfs.length - 1];
  
  return levelTable[closestDf] || getZValue(confidenceLevel);
}

/**
 * Get z-value for given confidence level (normal distribution)
 */
function getZValue(confidenceLevel: number): number {
  // Common z-values
  const zTable: Record<number, number> = {
    0.8: 1.282,
    0.9: 1.645,
    0.95: 1.960,
    0.99: 2.576,
    0.999: 3.291,
  };
  
  const level = Math.round(confidenceLevel * 100) / 100;
  return zTable[level] || 1.96; // Default to 95%
}

/**
 * Format forecast for display
 */
export function formatForecast(forecast: ForecastResult): {
  expected: string;
  range: string;
  confidence: string;
  model: string;
} {
  const formatPrice = (n: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 2 
    }).format(n);
  
  return {
    expected: formatPrice(forecast.expectedValue),
    range: `${formatPrice(forecast.lowerBound)} - ${formatPrice(forecast.upperBound)}`,
    confidence: `${(forecast.confidenceLevel * 100).toFixed(0)}%`,
    model: forecast.model,
  };
}
