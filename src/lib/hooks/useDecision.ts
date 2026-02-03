/**
 * Decision Engine Hook
 * 
 * Provides decision recommendations with full risk certificates.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  generateDecision,
  generateRiskCertificate,
  formatRiskCertificate,
  type DecisionRecommendation,
  type RiskCertificate,
} from '@/lib/decisionEngine';
import type { RiskMetrics } from '@/lib/riskMetrics';
import type { ForecastResult } from '@/lib/forecastEngine';
import type { ProcessedPriceData } from '@/types/MarketData';

interface UseDecisionOptions {
  symbol: string;
  positionValue: number;
}

interface UseDecisionReturn {
  recommendation: DecisionRecommendation | null;
  certificate: RiskCertificate | null;
  isGenerating: boolean;
  generate: (forecast: ForecastResult, risk: RiskMetrics, priceData: ProcessedPriceData) => void;
  approve: (reasoning?: string) => void;
  reject: (reasoning?: string) => void;
  formattedCertificate: string | null;
  status: 'pending' | 'approved' | 'rejected' | null;
}

export function useDecision(options: UseDecisionOptions): UseDecisionReturn {
  const { symbol, positionValue } = options;
  
  const [recommendation, setRecommendation] = useState<DecisionRecommendation | null>(null);
  const [certificate, setCertificate] = useState<RiskCertificate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  const generate = useCallback((
    forecast: ForecastResult,
    risk: RiskMetrics,
    priceData: ProcessedPriceData
  ) => {
    setIsGenerating(true);
    setStatus('pending');
    
    setTimeout(() => {
      const rec = generateDecision(symbol, forecast, risk, positionValue, priceData);
      const cert = generateRiskCertificate(symbol, forecast, risk, positionValue, rec);
      
      setRecommendation(rec);
      setCertificate(cert);
      setIsGenerating(false);
    }, 300);
  }, [symbol, positionValue]);

  const approve = useCallback((reasoning?: string) => {
    setStatus('approved');
    if (certificate) {
      setCertificate({
        ...certificate,
        verifiedBy: 'user',
        verifiedAt: Date.now(),
        approvalReasoning: reasoning,
      });
    }
  }, [certificate]);

  const reject = useCallback((reasoning?: string) => {
    setStatus('rejected');
    if (certificate) {
      setCertificate({
        ...certificate,
        verifiedBy: 'user',
        verifiedAt: Date.now(),
        approvalReasoning: reasoning,
      });
    }
  }, [certificate]);

  const formattedCertificate = useMemo(() => {
    if (!certificate) return null;
    return formatRiskCertificate(certificate);
  }, [certificate]);

  return {
    recommendation,
    certificate,
    isGenerating,
    generate,
    approve,
    reject,
    formattedCertificate,
    status,
  };
}
