/**
 * Policy Engine - Deterministic Decision Intelligence
 * 
 * Policy-based rules for financial decisions.
 * Human-in-the-loop required for all actions.
 */

import type { 
  PolicyRule, 
  PolicyCondition,
  PolicyAction,
} from '@/types/FinancialState';

/**
 * Policy Engine Configuration
 */
export interface PolicyEngineConfig {
  maxDailySpendUsd: number;
  maxSingleTransactionUsd: number;
  maxUncertaintyForAutoApprove: number;
  requireApprovalAboveUsd: number;
  preferredStablecoins: string[];
  blockedTokens: string[];
}

const DEFAULT_CONFIG: PolicyEngineConfig = {
  maxDailySpendUsd: 1000,
  maxSingleTransactionUsd: 500,
  maxUncertaintyForAutoApprove: 0.005, // 0.5%
  requireApprovalAboveUsd: 100,
  preferredStablecoins: ['USDC', 'USDT'],
  blockedTokens: [],
};

/**
 * Evaluate a policy condition against current state
 */
export function evaluateCondition(
  condition: PolicyCondition,
  context: {
    amount: number;
    token: string;
    uncertainty: number;
    dailySpent: number;
  }
): boolean {
  switch (condition.type) {
    case 'amount_threshold': {
      const threshold = condition.params.threshold as number;
      const operator = condition.params.operator as 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
      return compareValues(context.amount, threshold, operator);
    }
      
    case 'token_restriction': {
      const allowedParam = condition.params.allowed as string | undefined;
      const blockedParam = condition.params.blocked as string | undefined;
      const allowedTokens = allowedParam ? allowedParam.split(',') : undefined;
      const blockedTokens = blockedParam ? blockedParam.split(',') : undefined;
      if (blockedTokens?.includes(context.token)) return false;
      if (allowedTokens && !allowedTokens.includes(context.token)) return false;
      return true;
    }
      
    case 'time_restriction': {
      const hour = new Date().getHours();
      const allowedHoursStr = condition.params.allowedHours as string | undefined;
      const allowedHours = allowedHoursStr 
        ? (allowedHoursStr.split(',').map(Number) as [number, number]) 
        : undefined;
      if (allowedHours) {
        return hour >= allowedHours[0] && hour <= allowedHours[1];
      }
      return true;
    }
      
    case 'uncertainty_threshold': {
      const maxUncertainty = condition.params.max as number;
      return context.uncertainty <= maxUncertainty;
    }
      
    default:
      return true;
  }
}

/**
 * Apply policy rules to determine action
 */
export function applyPolicies(
  _scenario: unknown,
  policies: PolicyRule[],
  context: {
    amount: number;
    token: string;
    uncertainty: number;
    dailySpent: number;
  }
): PolicyAction {
  // Check active policies in order
  for (const policy of policies.filter(p => p.isActive)) {
    const conditionMet = evaluateCondition(policy.condition, context);
    
    if (conditionMet) {
      return policy.action;
    }
  }
  
  // Default: require approval
  return {
    type: 'require_approval',
    message: 'No matching policy. Manual approval required.',
  };
}

/**
 * Compare two values with operator
 */
function compareValues(
  a: number,
  b: number,
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
): boolean {
  switch (operator) {
    case 'gt': return a > b;
    case 'lt': return a < b;
    case 'eq': return a === b;
    case 'gte': return a >= b;
    case 'lte': return a <= b;
    default: return false;
  }
}

/**
 * Create default policy rules
 */
export function createDefaultPolicies(): PolicyRule[] {
  return [
    {
      id: 'block-high-uncertainty',
      name: 'Block High Uncertainty',
      condition: {
        type: 'uncertainty_threshold',
        params: { max: 0.05 },
      },
      action: {
        type: 'block',
        message: 'Transaction blocked: Price uncertainty exceeds 5%',
      },
      isActive: true,
      createdAt: Date.now(),
    },
    {
      id: 'require-approval-large',
      name: 'Require Approval for Large Transactions',
      condition: {
        type: 'amount_threshold',
        params: { threshold: 100, operator: 'gte' },
      },
      action: {
        type: 'require_approval',
        message: 'Transaction requires manual approval (>$100)',
      },
      isActive: true,
      createdAt: Date.now(),
    },
    {
      id: 'stablecoin-only',
      name: 'Stablecoin Only',
      condition: {
        type: 'token_restriction',
        params: { allowed: 'USDC,USDT' },
      },
      action: {
        type: 'require_approval',
        message: 'Non-stablecoin transaction requires approval',
      },
      isActive: false, // Disabled by default
      createdAt: Date.now(),
    },
  ];
}

export { DEFAULT_CONFIG };
