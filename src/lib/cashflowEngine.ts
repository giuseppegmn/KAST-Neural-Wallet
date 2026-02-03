/**
 * Cashflow Forecast Engine
 *
 * Goal: forecast near-term wallet balance (7d) using deterministic statistics.
 *
 * This is NOT a black-box ML model. It is an explainable estimator built from:
 * - observed daily net flows (income - expenses)
 * - mean + standard deviation
 * - confidence interval around the forecast
 *
 * Rationale:
 * - For a prototype, the most important leap is modeling USER cashflow, not only market prices.
 * - Deterministic + auditable beats "AI vibes" in finance.
 */

import { mean, standardDeviation } from 'simple-statistics';

export interface CashflowEvent {
  /** Unix ms */
  timestamp: number;
  /** Positive for income, negative for expense (USD) */
  amount: number;
  /** Optional category label */
  category?: string;
  /** Optional description */
  description?: string;
}

export interface CashflowForecastResult {
  horizonDays: number;
  confidenceLevel: number;

  startingBalance: number;
  expectedEndingBalance: number;
  lowerBound: number;
  upperBound: number;
  errorMargin: number;

  // Diagnostics
  inputDays: number;
  meanDailyNet: number;
  stdDailyNet: number;
  probabilityOfOverdraft: number; // P(endingBalance < 0)

  assumptions: string[];
}

/**
 * Aggregate events into daily net flows.
 */
export function toDailyNetFlows(events: CashflowEvent[], days: number): number[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const start = now - days * dayMs;

  const buckets = new Array(days).fill(0);
  for (const e of events) {
    if (e.timestamp < start || e.timestamp > now) continue;
    const idx = Math.min(days - 1, Math.max(0, Math.floor((e.timestamp - start) / dayMs)));
    buckets[idx] += e.amount;
  }
  return buckets;
}

/**
 * Deterministic cashflow forecast:
 * endingBalance = startingBalance + horizonDays * meanDailyNet
 * CI uses z-value * stdDailyNet * sqrt(horizonDays)
 */
export function forecastCashflow(
  startingBalance: number,
  events: CashflowEvent[],
  horizonDays: number = 7,
  lookbackDays: number = 30,
  confidenceLevel: number = 0.95
): CashflowForecastResult | null {
  const daily = toDailyNetFlows(events, lookbackDays);
  const nonZero = daily.some(v => v !== 0);
  if (!nonZero) return null;

  const mu = mean(daily);
  const sigma = daily.length >= 2 ? standardDeviation(daily) : 0;

  const expectedEnding = startingBalance + horizonDays * mu;
  const z = getZValue(confidenceLevel);
  const err = z * sigma * Math.sqrt(horizonDays);

  // Approximate overdraft probability assuming normality of aggregate net flow
  // P(ending < 0) = Phi((0 - expectedEnding)/ (sigma*sqrt(horizon)))
  const denom = sigma * Math.sqrt(horizonDays);
  const pOverdraft = denom > 0 ? normalCdf((0 - expectedEnding) / denom) : (expectedEnding < 0 ? 1 : 0);

  return {
    horizonDays,
    confidenceLevel,

    startingBalance,
    expectedEndingBalance: expectedEnding,
    lowerBound: expectedEnding - err,
    upperBound: expectedEnding + err,
    errorMargin: err,

    inputDays: lookbackDays,
    meanDailyNet: mu,
    stdDailyNet: sigma,
    probabilityOfOverdraft: pOverdraft,

    assumptions: [
      'Daily net cashflow is approximately stationary over the lookback window.',
      'Aggregate net flow uncertainty scales with sqrt(time).',
      'Overdraft probability assumes a normal distribution for aggregate net flow.'
    ],
  };
}

function getZValue(confidenceLevel: number): number {
  // Common values; fallback to ~1.96
  if (confidenceLevel >= 0.99) return 2.576;
  if (confidenceLevel >= 0.95) return 1.96;
  if (confidenceLevel >= 0.90) return 1.645;
  return 1.28;
}

// Standard normal CDF approximation (Abramowitz and Stegun)
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let p = d * t * (
    0.3193815 + t * (
      -0.3565638 + t * (
        1.781478 + t * (
          -1.821256 + t * 1.330274
        )
      )
    )
  );
  if (z > 0) p = 1 - p;
  return p;
}
