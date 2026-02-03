/**
 * Mathematical Risk Engine
 * 
 * Implements quantitative risk metrics used in professional finance:
 * - Volatility (annualized standard deviation)
 * - Value at Risk (VaR) - Historical and Parametric methods
 * - Expected Shortfall (CVaR) - Average loss beyond VaR
 * - Relative Uncertainty (from Pyth confidence intervals)
 * - Maximum Drawdown
 * 
 * All formulas are explicit, documented, and deterministic.
 */

import { sum, mean, standardDeviation } from 'simple-statistics';
import { getPriceArray, getStatistics } from './marketHistory';

/**
 * Complete risk metrics for a position or portfolio
 */
export interface RiskMetrics {
  // Price-based metrics
  volatility: number; // Annualized standard deviation of returns
  volatilityDaily: number; // Daily standard deviation
  
  // VaR metrics
  var95: number; // Value at Risk at 95% confidence
  var99: number; // Value at Risk at 99% confidence
  
  // CVaR (Expected Shortfall)
  cvar95: number; // Expected loss beyond VaR 95%
  cvar99: number; // Expected loss beyond VaR 99%
  
  // Drawdown metrics
  maxDrawdown: number; // Maximum peak-to-trough decline
  currentDrawdown: number; // Current decline from peak
  
  // Uncertainty metrics
  relativeUncertainty: number; // From external data source (e.g., Pyth)
  
  // Portfolio-level
  totalValue: number;
  atRiskAmount: number; // var95 as absolute amount
}

/**
 * Calculate Value at Risk using Historical Simulation method
 * 
 * Formula: VaR = |percentile(returns, 1 - confidence)|
 * 
 * @param symbol - Asset symbol
 * @param confidenceLevel - Confidence level (e.g., 0.95)
 * @param positionValue - Position value in USD (for absolute VaR)
 * @returns VaR as decimal (multiply by position for absolute)
 */
export function calculateVaRHistorical(
  symbol: string,
  confidenceLevel: number = 0.95,
  positionValue: number = 1
): { varRelative: number; varAbsolute: number } {
  const prices = getPriceArray(symbol);
  
  if (prices.length < 10) {
    return { varRelative: 0, varAbsolute: 0 };
  }
  
  // Calculate log returns
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const logReturn = Math.log(prices[i] / prices[i - 1]);
    returns.push(logReturn);
  }
  
  // Sort returns
  const sortedReturns = [...returns].sort((a, b) => a - b);
  
  // Find percentile index
  const percentileIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
  
  // VaR is the loss at that percentile (negative return)
  const varReturn = sortedReturns[Math.max(0, percentileIndex)];
  const varRelative = Math.abs(varReturn);
  
  return {
    varRelative,
    varAbsolute: varRelative * positionValue,
  };
}

/**
 * Calculate Value at Risk using Parametric (Variance-Covariance) method
 * 
 * Formula: VaR = μ - z_α × σ
 * 
 * Where:
 * - μ = mean return (often assumed 0 for short horizons)
 * - z_α = z-score for confidence level
 * - σ = standard deviation of returns
 * 
 * @param symbol - Asset symbol
 * @param confidenceLevel - Confidence level
 * @param positionValue - Position value
 * @param timeHorizon - Time horizon in days
 * @returns VaR metrics
 */
export function calculateVaRParametric(
  symbol: string,
  confidenceLevel: number = 0.95,
  positionValue: number = 1,
  timeHorizon: number = 1
): { varRelative: number; varAbsolute: number } {
  const prices = getPriceArray(symbol);
  
  if (prices.length < 10) {
    return { varRelative: 0, varAbsolute: 0 };
  }
  
  // Calculate returns
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  
  // Mean and standard deviation
  const mu = mean(returns);
  const sigma = standardDeviation(returns);
  
  // Z-score for confidence level
  const zScore = getZScore(confidenceLevel);
  
  // Scale to time horizon
  const horizonScale = Math.sqrt(timeHorizon);
  
  // VaR calculation
  const varReturn = -(mu - zScore * sigma * horizonScale);
  const varRelative = Math.max(0, varReturn);
  
  return {
    varRelative,
    varAbsolute: varRelative * positionValue,
  };
}

/**
 * Calculate Conditional Value at Risk (Expected Shortfall)
 * 
 * CVaR is the expected loss given that we are in the tail (beyond VaR)
 * 
 * Formula: CVaR = E[X | X < -VaR]
 * 
 * @param symbol - Asset symbol
 * @param confidenceLevel - Confidence level
 * @param positionValue - Position value
 * @returns CVaR metrics
 */
export function calculateCVaR(
  symbol: string,
  confidenceLevel: number = 0.95,
  positionValue: number = 1
): { cvarRelative: number; cvarAbsolute: number } {
  const prices = getPriceArray(symbol);
  
  if (prices.length < 10) {
    return { cvarRelative: 0, cvarAbsolute: 0 };
  }
  
  // Calculate returns
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  
  // Calculate VaR threshold
  const { varRelative } = calculateVaRHistorical(symbol, confidenceLevel);
  const varThreshold = -varRelative; // Negative because it's a loss
  
  // Find all returns worse than VaR
  const tailReturns = returns.filter(r => r < varThreshold);
  
  if (tailReturns.length === 0) {
    return { cvarRelative: varRelative, cvarAbsolute: varRelative * positionValue };
  }
  
  // CVaR is the average of tail returns
  const cvarReturn = mean(tailReturns);
  const cvarRelative = Math.abs(cvarReturn);
  
  return {
    cvarRelative,
    cvarAbsolute: cvarRelative * positionValue,
  };
}

/**
 * Calculate volatility metrics
 * 
 * @param symbol - Asset symbol
 * @returns Volatility metrics
 */
export function calculateVolatility(symbol: string): {
  daily: number;
  annualized: number;
  weekly: number;
  monthly: number;
} {
  const prices = getPriceArray(symbol);
  
  if (prices.length < 2) {
    return { daily: 0, annualized: 0, weekly: 0, monthly: 0 };
  }
  
  // Calculate log returns
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  
  // Daily volatility
  const dailyVol = standardDeviation(returns);
  
  // Scale to different time periods
  // σ_T = σ_daily × √T
  return {
    daily: dailyVol,
    annualized: dailyVol * Math.sqrt(365),
    weekly: dailyVol * Math.sqrt(7),
    monthly: dailyVol * Math.sqrt(30),
  };
}

/**
 * Calculate comprehensive risk metrics for an asset
 * 
 * @param symbol - Asset symbol
 * @param positionValue - Position value in USD
 * @param relativeUncertainty - External uncertainty measure (from Pyth)
 * @returns Complete risk metrics
 */
export function calculateRiskMetrics(
  symbol: string,
  positionValue: number = 0,
  relativeUncertainty: number = 0
): RiskMetrics {
  // Get historical statistics
  const stats = getStatistics(symbol);
  
  // Volatility
  const vol = calculateVolatility(symbol);
  
  // VaR calculations
  const var95 = calculateVaRParametric(symbol, 0.95, positionValue);
  const var99 = calculateVaRParametric(symbol, 0.99, positionValue);
  
  // CVaR calculations
  const cvar95 = calculateCVaR(symbol, 0.95, positionValue);
  const cvar99 = calculateCVaR(symbol, 0.99, positionValue);
  
  // Drawdown
  const drawdown = stats ? { max: stats.maxDrawdown, current: stats.currentDrawdown } : { max: 0, current: 0 };
  
  return {
    volatility: vol.annualized,
    volatilityDaily: vol.daily,
    var95: var95.varRelative,
    var99: var99.varRelative,
    cvar95: cvar95.cvarRelative,
    cvar99: cvar99.cvarRelative,
    maxDrawdown: drawdown.max,
    currentDrawdown: drawdown.current,
    relativeUncertainty,
    totalValue: positionValue,
    atRiskAmount: var95.varAbsolute,
  };
}

/**
 * Calculate portfolio-level risk metrics
 * 
 * @param positions - Array of {symbol, value} objects
 * @returns Portfolio risk metrics
 */
export function calculatePortfolioRisk(
  positions: Array<{ symbol: string; value: number }>
): RiskMetrics & { diversification: number } {
  const totalValue = sum(positions.map(p => p.value));
  
  if (totalValue === 0 || positions.length === 0) {
    return {
      volatility: 0,
      volatilityDaily: 0,
      var95: 0,
      var99: 0,
      cvar95: 0,
      cvar99: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      relativeUncertainty: 0,
      totalValue: 0,
      atRiskAmount: 0,
      diversification: 0,
    };
  }
  
  // Weighted average of individual risks
  let weightedVar95 = 0;
  let weightedVol = 0;
  let weightedUncertainty = 0;
  
  for (const position of positions) {
    const weight = position.value / totalValue;
    const metrics = calculateRiskMetrics(position.symbol, position.value);
    
    weightedVar95 += metrics.var95 * weight;
    weightedVol += metrics.volatility * weight;
    weightedUncertainty += metrics.relativeUncertainty * weight;
  }
  
  // Diversification benefit (simplified)
  // In reality, would use correlation matrix
  const diversification = positions.length > 1 ? 0.85 : 1.0;
  
  return {
    volatility: weightedVol * diversification,
    volatilityDaily: weightedVol * diversification / Math.sqrt(365),
    var95: weightedVar95 * diversification,
    var99: weightedVar95 * 1.5 * diversification, // Approximate
    cvar95: weightedVar95 * 1.2 * diversification, // CVaR > VaR
    cvar99: weightedVar95 * 1.8 * diversification,
    maxDrawdown: weightedVar95 * 2, // Approximate
    currentDrawdown: 0,
    relativeUncertainty: weightedUncertainty,
    totalValue,
    atRiskAmount: weightedVar95 * totalValue * diversification,
    diversification,
  };
}

/**
 * Get Z-score for confidence level
 */
function getZScore(confidenceLevel: number): number {
  const zScores: Record<number, number> = {
    0.8: 0.842,
    0.9: 1.282,
    0.95: 1.645,
    0.99: 2.326,
    0.999: 3.090,
  };
  
  return zScores[confidenceLevel] || 1.645;
}

/**
 * Format risk metrics for display
 */
export function formatRiskMetrics(metrics: RiskMetrics): {
  volatility: string;
  var95: string;
  var99: string;
  cvar95: string;
  maxDrawdown: string;
  atRiskAmount: string;
} {
  const formatPct = (n: number) => `${(n * 100).toFixed(2)}%`;
  const formatUsd = (n: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0 
    }).format(n);
  
  return {
    volatility: formatPct(metrics.volatility),
    var95: formatPct(metrics.var95),
    var99: formatPct(metrics.var99),
    cvar95: formatPct(metrics.cvar95),
    maxDrawdown: formatPct(metrics.maxDrawdown),
    atRiskAmount: formatUsd(metrics.atRiskAmount),
  };
}

/**
 * Generate a risk assessment report
 * 
 * @param symbol - Asset symbol
 * @param positionValue - Position value
 * @returns Human-readable risk report
 */
export function generateRiskReport(
  symbol: string,
  positionValue: number
): string {
  const metrics = calculateRiskMetrics(symbol, positionValue);
  const formatted = formatRiskMetrics(metrics);
  
  return `
RISK ASSESSMENT REPORT
======================
Asset: ${symbol}
Position Value: $${positionValue.toLocaleString()}

VOLATILITY METRICS
- Annualized Volatility: ${formatted.volatility}
- Daily Volatility: ${(metrics.volatilityDaily * 100).toFixed(3)}%

VALUE AT RISK (VaR)
- VaR 95%: ${formatted.var95} (${formatted.atRiskAmount})
- VaR 99%: ${formatted.var99}

EXPECTED SHORTFALL (CVaR)
- CVaR 95%: ${formatted.cvar95}
- CVaR 99%: ${(metrics.cvar99 * 100).toFixed(2)}%

DRAWDOWN METRICS
- Maximum Drawdown: ${formatted.maxDrawdown}
- Current Drawdown: ${(metrics.currentDrawdown * 100).toFixed(2)}%

METHODOLOGY
- VaR calculated using parametric method (variance-covariance)
- CVaR is the expected loss beyond VaR threshold
- Volatility is annualized standard deviation of log returns
- All calculations use historical price data

INTERPRETATION
There is a 5% probability that losses will exceed ${formatted.var95} 
(${(metrics.var95 * positionValue).toLocaleString()}) over the next day.
In the worst 5% of cases, the average loss is expected to be ${formatted.cvar95}.
  `.trim();
}
