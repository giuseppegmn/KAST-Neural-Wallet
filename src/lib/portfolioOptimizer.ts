/**
 * Portfolio Optimizer (Prototype)
 *
 * Purpose:
 * - convert forecasts + risk metrics into a concrete portfolio decision.
 *
 * Design:
 * - deterministic
 * - explainable
 * - brute-force discrete search (no black-box optimization)
 *
 * IMPORTANT:
 * - This module does NOT execute anything. It only suggests an allocation.
 */

import type { RiskMetrics } from './riskMetrics';

export type AllocationBucket = 'CASH' | 'STABLE_EARN' | 'SOL_STAKING';

export interface AllocationInputs {
  totalUSD: number;
  // Expected yields (APY) for buckets
  stableEarnApy: number; // e.g. 0.06
  solStakingApy: number; // e.g. 0.07

  // Risk for SOL bucket (derived from SOL price history)
  solRisk: RiskMetrics;

  // Constraints
  maxVar95LossPct: number; // e.g. 0.10 means at most 10% VaR loss on SOL bucket value
  maxUncertainty: number;  // relative uncertainty threshold
  currentRelativeUncertainty: number;

  // Horizon
  horizonDays: number;
  stepPct?: number; // default 5
}

export interface AllocationPlan {
  horizonDays: number;
  allocations: Record<AllocationBucket, number>; // percent 0..1
  expectedReturnUSD: number;
  worstCaseLossUSD: number;
  worstCaseLossPct: number;
  objectiveScore: number;
  reasoning: string[];
}

/**
 * Compute expected simple return over horizon given APY.
 */
function expectedReturnOverHorizon(totalUSD: number, apy: number, horizonDays: number): number {
  const daily = apy / 365;
  return totalUSD * daily * horizonDays;
}

/**
 * Conservative worst-case for SOL bucket using CVaR95.
 * risk.cvar95 is negative (e.g. -0.12) representing loss fraction.
 */
function worstCaseLossSol(solUSD: number, solRisk: RiskMetrics): number {
  const lossFrac = Math.abs(solRisk.cvar95);
  return solUSD * lossFrac;
}

/**
 * Brute-force allocation search.
 */
export function optimizeAllocation(input: AllocationInputs): AllocationPlan {
  const stepPct = Math.max(1, Math.min(20, input.stepPct ?? 5));
  const step = stepPct / 100;

  // Hard safety gate: if uncertainty is too high, force stable/cash.
  const uncertaintyTooHigh = input.currentRelativeUncertainty > input.maxUncertainty;

  let best: AllocationPlan | null = null;

  const candidates: number[] = [];
  for (let x = 0; x <= 1 + 1e-9; x += step) candidates.push(Math.min(1, Math.max(0, +x.toFixed(4))));

  for (const solPct of candidates) {
    if (uncertaintyTooHigh && solPct > 0) continue;

    // remaining goes to stableEarn and cash. We'll split stable vs cash as another loop.
    for (const stablePct of candidates) {
      const cashPct = 1 - solPct - stablePct;
      if (cashPct < -1e-9) continue;
      const cash = Math.max(0, cashPct);

      // Constraints: VaR limit on SOL bucket
      const solUSD = input.totalUSD * solPct;
      const varLossPct = Math.abs(input.solRisk.var95);
      const varLossUSD = solUSD * varLossPct;
      const maxAllowedVarUSD = solUSD * input.maxVar95LossPct;
      if (varLossUSD > maxAllowedVarUSD + 1e-9) continue;

      // Expected returns
      const expectedStable = expectedReturnOverHorizon(input.totalUSD * stablePct, input.stableEarnApy, input.horizonDays);
      const expectedSol = expectedReturnOverHorizon(solUSD, input.solStakingApy, input.horizonDays);
      const expectedCash = 0;
      const expectedReturn = expectedStable + expectedSol + expectedCash;

      // Worst-case loss: only SOL bucket considered (conservative)
      const worstLoss = worstCaseLossSol(solUSD, input.solRisk);
      const worstLossPct = input.totalUSD > 0 ? worstLoss / input.totalUSD : 0;

      // Objective: maximize expected return penalized by worst-case loss
      // Score = E[ret] - lambda * worstLoss
      const lambda = 0.35; // conservative
      const score = expectedReturn - lambda * worstLoss;

      const plan: AllocationPlan = {
        horizonDays: input.horizonDays,
        allocations: {
          CASH: cash,
          STABLE_EARN: stablePct,
          SOL_STAKING: solPct,
        },
        expectedReturnUSD: expectedReturn,
        worstCaseLossUSD: worstLoss,
        worstCaseLossPct,
        objectiveScore: score,
        reasoning: [],
      };

      if (!best || plan.objectiveScore > best.objectiveScore) {
        best = plan;
      }
    }
  }

  // Fallback: all stable earn if nothing fits
  if (!best) {
    best = {
      horizonDays: input.horizonDays,
      allocations: { CASH: 0, STABLE_EARN: 1, SOL_STAKING: 0 },
      expectedReturnUSD: expectedReturnOverHorizon(input.totalUSD, input.stableEarnApy, input.horizonDays),
      worstCaseLossUSD: 0,
      worstCaseLossPct: 0,
      objectiveScore: 0,
      reasoning: [],
    };
  }

  best.reasoning = buildReasoning(input, best, uncertaintyTooHigh);
  return best;
}

function buildReasoning(input: AllocationInputs, plan: AllocationPlan, uncertaintyTooHigh: boolean): string[] {
  const r: string[] = [];
  r.push(`Objective: maximize expected return over ${input.horizonDays}d while penalizing worst-case loss (CVaR95).`);
  r.push(`Discrete search step: ${input.stepPct ?? 5}%.`);
  r.push(`Stable Earn APY: ${(input.stableEarnApy * 100).toFixed(2)}%; SOL Staking APY: ${(input.solStakingApy * 100).toFixed(2)}%.`);
  r.push(`SOL risk: VaR95 ${(input.solRisk.var95 * 100).toFixed(2)}%, CVaR95 ${(input.solRisk.cvar95 * 100).toFixed(2)}%, Vol ${(input.solRisk.volatility * 100).toFixed(2)}%.`);
  r.push(`Pyth relative uncertainty: ${(input.currentRelativeUncertainty * 100).toFixed(3)}% (max allowed ${(input.maxUncertainty * 100).toFixed(3)}%).`);

  if (uncertaintyTooHigh) {
    r.push('Safety gate: Pyth uncertainty is above threshold → SOL allocation forced to 0%.');
  }

  const a = plan.allocations;
  r.push(`Selected allocation: CASH ${(a.CASH*100).toFixed(0)}% | STABLE_EARN ${(a.STABLE_EARN*100).toFixed(0)}% | SOL_STAKING ${(a.SOL_STAKING*100).toFixed(0)}%.`);
  r.push(`Expected return: $${plan.expectedReturnUSD.toFixed(2)}; worst-case loss (CVaR95): $${plan.worstCaseLossUSD.toFixed(2)} (${(plan.worstCaseLossPct*100).toFixed(2)}%).`);

  return r;
}
