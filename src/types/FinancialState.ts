/**
 * Financial State Types for Decision Intelligence Engine
 * All monetary values in USD (lowest unit)
 */

export interface UserBalance {
  totalUsd: number;
  availableUsd: number;
  lockedUsd: number;
  byToken: Record<string, TokenBalance>;
}

export interface TokenBalance {
  symbol: string;
  amount: number;
  usdValue: number;
  lastUpdated: number;
}

export interface ExpensePattern {
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  categoryBreakdown: Record<ExpenseCategory, number>;
  volatilityScore: number; // 0-1, computed from variance
}

export type ExpenseCategory = 
  | 'food'
  | 'transport'
  | 'entertainment'
  | 'utilities'
  | 'shopping'
  | 'health'
  | 'education'
  | 'other';

export interface RiskProfile {
  maxDailySpend: number;
  maxSingleTransaction: number;
  preferredTokens: string[];
  avoidVolatileAssets: boolean;
  requireApprovalAbove: number;
}

export interface SimulationResult {
  id: string;
  timestamp: number;
  scenario: SimulationScenario;
  outcome: {
    projectedBalance: number;
    projectedChange: number;
    confidenceInterval: [number, number]; // [lower, upper]
  };
  riskMetrics: RiskMetrics;
  isApproved: boolean | null; // null = pending
  approvedAt?: number;
  approvedBy?: 'user' | 'policy';
}

export interface SimulationScenario {
  type: 'spend' | 'save' | 'invest' | 'convert';
  amount: number;
  fromToken?: string;
  toToken?: string;
  description: string;
}

export interface RiskMetrics {
  valueAtRisk: number; // VaR at 95% confidence
  relativeUncertainty: number;
  stressMultiplier: number;
  worstCaseScenario: number;
  liquidationRisk: 'none' | 'low' | 'medium' | 'high';
}

export interface PolicyRule {
  id: string;
  name: string;
  condition: PolicyCondition;
  action: PolicyAction;
  isActive: boolean;
  createdAt: number;
}

export interface PolicyCondition {
  type: 'amount_threshold' | 'token_restriction' | 'time_restriction' | 'uncertainty_threshold';
  params: Record<string, number | string | boolean>;
}

export interface PolicyAction {
  type: 'require_approval' | 'block' | 'allow' | 'notify';
  message?: string;
}

export interface Recommendation {
  id: string;
  type: 'spend' | 'save' | 'invest' | 'convert' | 'alert';
  title: string;
  description: string;
  justification: string;
  confidenceScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  suggestedAction: SimulationScenario;
  expectedOutcome: {
    benefit: number;
    risk: number;
    timeframe: string;
  };
  requiresApproval: boolean;
  alternativeOptions?: SimulationScenario[];
}

export interface DecisionRecord {
  id: string;
  recommendationId: string;
  decision: 'approved' | 'rejected' | 'modified';
  modifiedScenario?: SimulationScenario;
  timestamp: number;
  userId: string;
  reasoning?: string;
}
