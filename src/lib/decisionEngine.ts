/**
 * Decision Intelligence Engine
 * 
 * Consumes forecasts and risk metrics to generate actionable recommendations.
 * All outputs are numerically grounded with explicit statistical backing.
 * 
 * Philosophy: Explainable, conservative, human-in-the-loop
 */

import type { ForecastResult } from './forecastEngine';
import type { RiskMetrics } from './riskMetrics';
import type { ProcessedPriceData } from '@/types/MarketData';
import { formatForecast } from './forecastEngine';
import { formatRiskMetrics } from './riskMetrics';

/**
 * Decision recommendation types
 */
export type DecisionType = 'hold' | 'reduce_exposure' | 'increase_stable' | 'take_profit' | 'add_collateral';

/**
 * Decision recommendation with full numerical backing
 */
export interface DecisionRecommendation {
  // Core recommendation
  type: DecisionType;
  title: string;
  description: string;
  
  // Confidence and urgency
  confidenceScore: number; // 0-100
  urgency: 'low' | 'medium' | 'high' | 'critical';
  
  // Numerical justification
  justification: {
    forecastExpected: number;
    forecastLower: number;
    forecastUpper: number;
    volatility: number;
    var95: number;
    maxDrawdown: number;
    dataQuality: number; // 0-100
  };
  
  // Risk assessment
  riskAssessment: {
    worstCaseLoss: number; // Absolute USD
    worstCaseLossPct: number;
    probabilityOfLoss: number; // Based on forecast distribution
    recommendedMaxPosition: number;
  };
  
  // Action parameters
  suggestedAction: {
    type: string;
    amount: number;
    targetAsset?: string;
    reasoning: string;
  };
  
  // Alternative actions
  alternatives: Array<{
    type: DecisionType;
    description: string;
    confidenceScore: number;
  }>;
  
  // Timestamp
  generatedAt: number;
}

/**
 * Risk Certificate - The core audit document
 */
export interface RiskCertificate {
  // Metadata
  certificateId: string;
  generatedAt: number;
  version: string;
  
  // Inputs
  inputs: {
    asset: string;
    currentPrice: number;
    positionValue: number;
    forecastHorizon: number;
    confidenceLevel: number;
    dataPoints: number;
  };
  
  // Model used
  model: {
    name: string;
    parameters: Record<string, number | string>;
    formula: string;
  };
  
  // Outputs
  outputs: {
    forecast: {
      expected: number;
      lowerBound: number;
      upperBound: number;
      errorMargin: number;
    };
    risk: {
      volatility: number;
      var95: number;
      var99: number;
      cvar95: number;
      maxDrawdown: number;
    };
    decision: {
      recommendation: string;
      confidence: number;
      worstCase: number;
    };
  };
  
  // Assumptions and limitations
  assumptions: string[];
  limitations: string[];
  
  // Human verification
  verifiedBy?: string;
  verifiedAt?: number;
  approvalReasoning?: string;
}

/**
 * Generate a decision recommendation based on forecast and risk
 * 
 * @param symbol - Asset symbol
 * @param forecast - Forecast result
 * @param risk - Risk metrics
 * @param positionValue - Current position value in USD
 * @param priceData - Current price data
 * @returns Decision recommendation
 */
export function generateDecision(
  _symbol: string,
  forecast: ForecastResult,
  risk: RiskMetrics,
  positionValue: number,
  priceData: ProcessedPriceData
): DecisionRecommendation {
  // Calculate data quality score
  const dataQuality = calculateDataQuality(forecast, risk, priceData);
  
  // Determine decision type based on forecast and risk
  const decisionType = determineDecisionType(forecast, risk, positionValue);
  
  // Calculate probability of loss from forecast distribution
  const probLoss = calculateProbabilityOfLoss(forecast, positionValue);
  
  // Calculate worst case scenario
  const worstCaseLoss = positionValue * risk.cvar95;
  const worstCaseLossPct = risk.cvar95;
  
  // Recommended max position based on VaR
  const maxAcceptableLoss = positionValue * 0.05; // 5% max loss
  const recommendedMaxPosition = maxAcceptableLoss / risk.var95;
  
  // Build justification with actual numbers
  const justification = {
    forecastExpected: forecast.expectedValue,
    forecastLower: forecast.lowerBound,
    forecastUpper: forecast.upperBound,
    volatility: risk.volatility,
    var95: risk.var95,
    maxDrawdown: risk.maxDrawdown,
    dataQuality,
  };
  
  // Determine urgency
  const urgency = determineUrgency(risk, probLoss);
  
  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore(dataQuality, forecast, risk);
  
  // Build suggested action
  const suggestedAction = buildSuggestedAction(decisionType, positionValue, risk, forecast);
  
  // Generate alternatives
  const alternatives = generateAlternatives(decisionType, forecast, risk, positionValue);
  
  return {
    type: decisionType,
    title: getDecisionTitle(decisionType),
    description: getDecisionDescription(decisionType, forecast, risk),
    confidenceScore,
    urgency,
    justification,
    riskAssessment: {
      worstCaseLoss,
      worstCaseLossPct,
      probabilityOfLoss: probLoss,
      recommendedMaxPosition,
    },
    suggestedAction,
    alternatives,
    generatedAt: Date.now(),
  };
}

/**
 * Generate a risk certificate for audit purposes
 * 
 * @param symbol - Asset symbol
 * @param forecast - Forecast result
 * @param risk - Risk metrics
 * @param positionValue - Position value
 * @param decision - Decision recommendation
 * @returns Risk certificate
 */
export function generateRiskCertificate(
  symbol: string,
  forecast: ForecastResult,
  risk: RiskMetrics,
  positionValue: number,
  decision: DecisionRecommendation
): RiskCertificate {
  const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    certificateId,
    generatedAt: Date.now(),
    version: '1.0.0',
    
    inputs: {
      asset: symbol,
      currentPrice: forecast.expectedValue, // Using forecast as proxy
      positionValue,
      forecastHorizon: forecast.forecastHorizon,
      confidenceLevel: forecast.confidenceLevel,
      dataPoints: forecast.inputDataPoints,
    },
    
    model: {
      name: forecast.model,
      parameters: forecast.modelParams,
      formula: getModelFormula(forecast.model),
    },
    
    outputs: {
      forecast: {
        expected: forecast.expectedValue,
        lowerBound: forecast.lowerBound,
        upperBound: forecast.upperBound,
        errorMargin: forecast.errorMargin,
      },
      risk: {
        volatility: risk.volatility,
        var95: risk.var95,
        var99: risk.var99,
        cvar95: risk.cvar95,
        maxDrawdown: risk.maxDrawdown,
      },
      decision: {
        recommendation: decision.title,
        confidence: decision.confidenceScore,
        worstCase: decision.riskAssessment.worstCaseLoss,
      },
    },
    
    assumptions: [
      'Historical returns are representative of future behavior',
      'Price movements follow approximately normal distribution',
      'Volatility is constant over the forecast horizon',
      'No extreme market events (black swans) during forecast period',
      'Liquidity is sufficient for position adjustments',
    ],
    
    limitations: [
      'Past performance does not guarantee future results',
      'VaR assumes normal distribution (underestimates tail risk)',
      'Forecast accuracy decreases with longer horizons',
      'External factors (news, regulations) not modeled',
      'Correlation with other assets not considered',
    ],
  };
}

/**
 * Determine decision type based on forecast and risk
 */
function determineDecisionType(
  forecast: ForecastResult,
  risk: RiskMetrics,
  _positionValue: number
): DecisionType {
  // High volatility + negative forecast = reduce exposure
  if (risk.volatility > 0.5 && forecast.expectedValue < forecast.lowerBound * 1.1) {
    return 'reduce_exposure';
  }
  
  // Very high VaR = add collateral or reduce
  if (risk.var95 > 0.1) { // 10% VaR
    return 'add_collateral';
  }
  
  // Large drawdown = reduce exposure
  if (risk.currentDrawdown > 0.15) { // 15% drawdown
    return 'reduce_exposure';
  }
  
  // High uncertainty = move to stable
  if (risk.relativeUncertainty > 0.02) { // 2% uncertainty
    return 'increase_stable';
  }
  
  // Positive forecast with low risk = hold or take profit
  if (forecast.expectedValue > forecast.lowerBound * 1.05 && risk.var95 < 0.05) {
    return 'take_profit';
  }
  
  // Default: hold
  return 'hold';
}

/**
 * Calculate probability of loss from forecast distribution
 * Assumes normal distribution around expected value
 */
function calculateProbabilityOfLoss(
  forecast: ForecastResult,
  positionValue: number
): number {
  if (positionValue === 0) return 0;
  
  // Standard deviation from error margin
  // For 95% CI: margin = 1.96 * σ
  const sigma = forecast.errorMargin / 1.96;
  
  if (sigma === 0) return forecast.expectedValue < 0 ? 1 : 0;
  
  // Z-score for break-even (0 return)
  const z = (0 - forecast.expectedValue) / sigma;
  
  // CDF of standard normal at z
  return normalCDF(z);
}

/**
 * Standard normal cumulative distribution function
 */
function normalCDF(x: number): number {
  // Approximation using error function
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1 + sign * y);
}

/**
 * Calculate data quality score (0-100)
 */
function calculateDataQuality(
  forecast: ForecastResult,
  risk: RiskMetrics,
  priceData: ProcessedPriceData
): number {
  let score = 100;
  
  // Deduct for stale data
  if (priceData.isStale) score -= 30;
  
  // Deduct for high uncertainty
  score -= Math.min(30, priceData.relativeUncertainty * 3000);
  
  // Deduct for high volatility
  score -= Math.min(20, risk.volatility * 40);
  
  // Deduct for insufficient data
  if (forecast.inputDataPoints < 20) score -= 20;
  
  return Math.max(0, score);
}

/**
 * Determine urgency level
 */
function determineUrgency(risk: RiskMetrics, probLoss: number): DecisionRecommendation['urgency'] {
  if (risk.var95 > 0.15 || probLoss > 0.3) return 'critical';
  if (risk.var95 > 0.1 || probLoss > 0.2) return 'high';
  if (risk.var95 > 0.05 || probLoss > 0.1) return 'medium';
  return 'low';
}

/**
 * Calculate overall confidence score
 */
function calculateConfidenceScore(
  dataQuality: number,
  forecast: ForecastResult,
  risk: RiskMetrics
): number {
  let score = dataQuality;
  
  // Adjust based on forecast error
  const errorPct = forecast.errorMargin / forecast.expectedValue;
  score -= Math.min(20, errorPct * 100);
  
  // Adjust based on risk
  score -= Math.min(20, risk.volatility * 40);
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Build suggested action
 */
function buildSuggestedAction(
  type: DecisionType,
  positionValue: number,
  risk: RiskMetrics,
  _forecast: ForecastResult
): DecisionRecommendation['suggestedAction'] {
  switch (type) {
    case 'reduce_exposure':
      return {
        type: 'sell',
        amount: positionValue * 0.2, // Reduce by 20%
        reasoning: `Reduce exposure due to high volatility (${(risk.volatility * 100).toFixed(1)}%) and unfavorable forecast`,
      };
      
    case 'increase_stable':
      return {
        type: 'swap',
        amount: positionValue * 0.3,
        targetAsset: 'USDC',
        reasoning: `Move to stablecoins due to high uncertainty (${(risk.relativeUncertainty * 100).toFixed(2)}%)`,
      };
      
    case 'add_collateral':
      return {
        type: 'deposit',
        amount: positionValue * risk.var95 * 1.5,
        reasoning: `Add collateral to cover VaR exposure (${(risk.var95 * 100).toFixed(1)}%)`,
      };
      
    case 'take_profit':
      return {
        type: 'sell',
        amount: positionValue * 0.1,
        reasoning: 'Take partial profits given favorable forecast',
      };
      
    default:
      return {
        type: 'hold',
        amount: 0,
        reasoning: 'No action required based on current risk profile',
      };
  }
}

/**
 * Generate alternative actions
 */
function generateAlternatives(
  currentType: DecisionType,
  _forecast: ForecastResult,
  risk: RiskMetrics,
  _positionValue: number
): DecisionRecommendation['alternatives'] {
  const alternatives: DecisionRecommendation['alternatives'] = [];
  
  if (currentType !== 'hold') {
    alternatives.push({
      type: 'hold',
      description: 'Maintain current position and monitor',
      confidenceScore: 60,
    });
  }
  
  if (currentType !== 'reduce_exposure' && risk.var95 > 0.05) {
    alternatives.push({
      type: 'reduce_exposure',
      description: 'Reduce position size by 10%',
      confidenceScore: 70,
    });
  }
  
  if (currentType !== 'increase_stable' && risk.volatility > 0.3) {
    alternatives.push({
      type: 'increase_stable',
      description: 'Convert 50% to USDC',
      confidenceScore: 65,
    });
  }
  
  return alternatives;
}

/**
 * Get decision title
 */
function getDecisionTitle(type: DecisionType): string {
  const titles: Record<DecisionType, string> = {
    hold: 'Hold Position',
    reduce_exposure: 'Reduce Exposure',
    increase_stable: 'Increase Stablecoin Allocation',
    take_profit: 'Take Partial Profits',
    add_collateral: 'Add Collateral',
  };
  return titles[type];
}

/**
 * Get decision description
 */
function getDecisionDescription(
  type: DecisionType,
  forecast: ForecastResult,
  risk: RiskMetrics
): string {
  const formattedForecast = formatForecast(forecast);
  const formattedRisk = formatRiskMetrics(risk);
  
  switch (type) {
    case 'reduce_exposure':
      return `High risk environment detected. Volatility at ${formattedRisk.volatility} with VaR of ${formattedRisk.var95}. Forecast shows ${formattedForecast.expected} with wide confidence interval.`;
      
    case 'increase_stable':
      return `Market uncertainty elevated (${(risk.relativeUncertainty * 100).toFixed(2)}%). Consider reducing volatile asset exposure.`;
      
    case 'add_collateral':
      return `Position at risk. VaR ${formattedRisk.var95} indicates potential for significant losses. Additional collateral recommended.`;
      
    case 'take_profit':
      return `Favorable conditions for profit-taking. Forecast at ${formattedForecast.expected} with manageable risk (${formattedRisk.var95} VaR).`;
      
    default:
      return `Current position appropriate given forecast (${formattedForecast.expected}) and risk profile (${formattedRisk.volatility} volatility).`;
  }
}

/**
 * Get model formula for documentation
 */
function getModelFormula(modelName: string): string {
  const formulas: Record<string, string> = {
    rolling_regression: 'P(t) = α + βt + ε, CI = P̂ ± t_(α/2) × SE × √(1 + 1/n + (t-t̄)²/Sxx)',
    exponential_smoothing: 'L_t = αY_t + (1-α)(L_{t-1}+T_{t-1}), T_t = β(L_t-L_{t-1}) + (1-β)T_{t-1}',
    mean_reversion: 'dX_t = θ(μ-X_t)dt + σdW_t, E[X_{t+h}] = μ + (X_t-μ)e^(-θh)',
    ensemble: 'Weighted average of component models, weights ∝ 1/RMSE²',
  };
  
  return formulas[modelName] || 'Statistical model with documented parameters';
}

/**
 * Format risk certificate for display
 */
export function formatRiskCertificate(cert: RiskCertificate): string {
  return `
RISK CERTIFICATE
================
ID: ${cert.certificateId}
Generated: ${new Date(cert.generatedAt).toISOString()}
Version: ${cert.version}

INPUTS
------
Asset: ${cert.inputs.asset}
Position Value: $${cert.inputs.positionValue.toLocaleString()}
Forecast Horizon: ${cert.inputs.forecastHorizon} days
Confidence Level: ${(cert.inputs.confidenceLevel * 100).toFixed(0)}%
Data Points: ${cert.inputs.dataPoints}

MODEL
-----
Name: ${cert.model.name}
Formula: ${cert.model.formula}

OUTPUTS
-------
Forecast Expected: $${cert.outputs.forecast.expected.toFixed(2)}
Forecast Range: $${cert.outputs.forecast.lowerBound.toFixed(2)} - $${cert.outputs.forecast.upperBound.toFixed(2)}
Volatility: ${(cert.outputs.risk.volatility * 100).toFixed(2)}%
VaR 95%: ${(cert.outputs.risk.var95 * 100).toFixed(2)}%
CVaR 95%: ${(cert.outputs.risk.cvar95 * 100).toFixed(2)}%
Max Drawdown: ${(cert.outputs.risk.maxDrawdown * 100).toFixed(2)}%

DECISION
--------
Recommendation: ${cert.outputs.decision.recommendation}
Confidence: ${cert.outputs.decision.confidence}%
Worst Case: $${cert.outputs.decision.worstCase.toLocaleString()}

ASSUMPTIONS
-----------
${cert.assumptions.map(a => `• ${a}`).join('\n')}

LIMITATIONS
-----------
${cert.limitations.map(l => `• ${l}`).join('\n')}
  `.trim();
}
