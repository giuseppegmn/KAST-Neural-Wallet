/**
 * Decision Card
 * 
 * Displays decision recommendation with full risk assessment and approval flow.
 */

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button, Badge, Alert } from '@/components/ui';
import type { DecisionRecommendation, RiskCertificate } from '@/lib/decisionEngine';
import { Check, X, FileText, ChevronDown, ChevronUp, Shield } from 'lucide-react';

interface DecisionCardProps {
  recommendation: DecisionRecommendation | null;
  certificate: RiskCertificate | null;
  formattedCertificate: string | null;
  status: 'pending' | 'approved' | 'rejected' | null;
  isGenerating: boolean;
  onApprove: (reasoning?: string) => void;
  onReject: (reasoning?: string) => void;
}

export function DecisionCard({
  recommendation,
  certificate,
  formattedCertificate,
  status,
  isGenerating,
  onApprove,
  onReject,
}: DecisionCardProps) {
  const [showCertificate, setShowCertificate] = useState(false);
  const [reasoning, setReasoning] = useState('');

  if (isGenerating) {
    return (
      <Card variant="glass">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-400">Analyzing risk metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendation || !certificate) {
    return (
      <Card variant="glass">
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Generate a forecast first to see recommendations</p>
        </CardContent>
      </Card>
    );
  }

  const urgencyColors = {
    low: 'success',
    medium: 'warning',
    high: 'error',
    critical: 'error',
  } as const;

  const formatUsd = (n: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0 
    }).format(n);

  const formatPct = (n: number) => `${(n * 100).toFixed(2)}%`;

  return (
    <Card variant="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#8b5cf6]" />
            <CardTitle>Decision Recommendation</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={urgencyColors[recommendation.urgency]}>
              {recommendation.urgency.toUpperCase()}
            </Badge>
            {status && (
              <Badge variant={status === 'approved' ? 'success' : 'error'}>
                {status.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Title & Description */}
          <div>
            <h3 className="text-xl font-semibold mb-2">{recommendation.title}</h3>
            <p className="text-gray-400">{recommendation.description}</p>
          </div>

          {/* Numerical Justification */}
          <div className="bg-[#0a0a0a] rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-3">Numerical Justification</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Forecast Expected</p>
                <p className="font-medium">{formatUsd(recommendation.justification.forecastExpected)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Forecast Range</p>
                <p className="font-medium">
                  {formatUsd(recommendation.justification.forecastLower)} - {formatUsd(recommendation.justification.forecastUpper)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Volatility</p>
                <p className="font-medium">{formatPct(recommendation.justification.volatility)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">VaR 95%</p>
                <p className="font-medium">{formatPct(recommendation.justification.var95)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Max Drawdown</p>
                <p className="font-medium">{formatPct(recommendation.justification.maxDrawdown)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Data Quality</p>
                <p className="font-medium">{recommendation.justification.dataQuality}/100</p>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-[#0a0a0a] rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-3">Risk Assessment</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Worst Case Loss</p>
                <p className="font-medium text-red-400">
                  {formatUsd(recommendation.riskAssessment.worstCaseLoss)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Probability of Loss</p>
                <p className="font-medium">
                  {formatPct(recommendation.riskAssessment.probabilityOfLoss)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Recommended Max Position</p>
                <p className="font-medium text-[#00d4aa]">
                  {formatUsd(recommendation.riskAssessment.recommendedMaxPosition)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Confidence Score</p>
                <p className="font-medium">{recommendation.confidenceScore}%</p>
              </div>
            </div>
          </div>

          {/* Suggested Action */}
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#00d4aa]/20">
            <p className="text-sm text-gray-500 mb-2">Suggested Action</p>
            <p className="font-medium">{recommendation.suggestedAction.type.toUpperCase()}</p>
            {recommendation.suggestedAction.amount > 0 && (
              <p className="text-[#00d4aa]">{formatUsd(recommendation.suggestedAction.amount)}</p>
            )}
            <p className="text-sm text-gray-400 mt-2">{recommendation.suggestedAction.reasoning}</p>
          </div>

          {/* Risk Certificate Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCertificate(!showCertificate)}
            leftIcon={<FileText className="w-4 h-4" />}
            rightIcon={showCertificate ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            className="w-full justify-between"
          >
            Risk Certificate
          </Button>

          {showCertificate && formattedCertificate && (
            <div className="bg-[#0a0a0a] rounded-lg p-4 font-mono text-xs text-gray-400 overflow-x-auto max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{formattedCertificate}</pre>
            </div>
          )}

          {/* Status Messages */}
          {status === 'approved' && (
            <Alert variant="success" title="Decision Approved">
              This recommendation has been approved. Action can be executed.
            </Alert>
          )}
          {status === 'rejected' && (
            <Alert variant="error" title="Decision Rejected">
              This recommendation has been rejected. No action will be taken.
            </Alert>
          )}

          {/* Reasoning Input */}
          {status === 'pending' && (
            <div>
              <label className="text-sm text-gray-500 mb-2 block">
                Decision Reasoning (optional)
              </label>
              <textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Why are you making this decision?"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#00d4aa]/50 resize-none"
                rows={2}
              />
            </div>
          )}
        </div>
      </CardContent>

      {/* Action Buttons */}
      {status === 'pending' && (
        <CardFooter>
          <div className="flex gap-3 w-full">
            <Button
              variant="secondary"
              onClick={() => onReject(reasoning)}
              leftIcon={<X className="w-4 h-4" />}
              className="flex-1"
            >
              Reject
            </Button>
            <Button
              variant="primary"
              onClick={() => onApprove(reasoning)}
              leftIcon={<Check className="w-4 h-4" />}
              className="flex-1"
            >
              Approve
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
