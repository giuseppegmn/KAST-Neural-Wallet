/**
 * Recommendation Card
 * Displays AI recommendation with human-in-the-loop approval flow
 */

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Button, Badge, Alert } from '@/components/ui';
import type { Recommendation, SimulationResult } from '@/types/FinancialState';
import { Brain, Check, X, Edit, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface RecommendationCardProps {
  recommendation: Recommendation | null;
  simulationResult: SimulationResult | null;
  isGenerating: boolean;
  onApprove: (reasoning?: string) => void;
  onReject: (reasoning?: string) => void;
  onModify: (modifiedAmount: number, reasoning?: string) => void;
  className?: string;
}

export function RecommendationCard({
  recommendation,
  simulationResult,
  isGenerating,
  onApprove,
  onReject,
  onModify,
  className,
}: RecommendationCardProps) {
  const [showJustification, setShowJustification] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [modifiedAmount, setModifiedAmount] = useState<number | null>(null);
  const [reasoning, setReasoning] = useState('');

  if (isGenerating) {
    return (
      <Card variant="glass" className={className}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#00d4aa]/10 flex items-center justify-center animate-pulse">
              <Brain className="w-6 h-6 text-[#00d4aa]" />
            </div>
            <p className="text-gray-400">Analyzing your portfolio...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) {
    return (
      <Card variant="glass" className={className}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
              <Brain className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-gray-500">Click "Generate Recommendation" to begin</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPending = simulationResult?.isApproved === null;
  const isApproved = simulationResult?.isApproved === true;
  const isRejected = simulationResult?.isApproved === false;

  return (
    <Card variant="glass" className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#00d4aa]/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#00d4aa]" />
            </div>
            <div>
              <CardTitle>{recommendation.title}</CardTitle>
              <p className="text-sm text-gray-500">
                Confidence: {recommendation.confidenceScore}%
              </p>
            </div>
          </div>
          <Badge 
            variant={
              recommendation.riskLevel === 'low' ? 'success' :
              recommendation.riskLevel === 'medium' ? 'warning' : 'error'
            }
          >
            {recommendation.riskLevel.toUpperCase()} RISK
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Description */}
          <p className="text-gray-300">{recommendation.description}</p>

          {/* Suggested Action */}
          <div className="bg-[#0a0a0a] rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-2">Suggested Action</p>
            <p className="font-medium">{recommendation.suggestedAction.description}</p>
            {recommendation.suggestedAction.amount > 0 && (
              <p className="text-[#00d4aa] mt-1">
                ${recommendation.suggestedAction.amount.toLocaleString()}
              </p>
            )}
          </div>

          {/* Expected Outcome */}
          <div className="grid grid-cols-3 gap-4">
            <OutcomeBox
              label="Expected Benefit"
              value={`$${recommendation.expectedOutcome.benefit.toLocaleString()}`}
              variant="positive"
            />
            <OutcomeBox
              label="Risk Exposure"
              value={`$${recommendation.expectedOutcome.risk.toLocaleString()}`}
              variant="negative"
            />
            <OutcomeBox
              label="Timeframe"
              value={recommendation.expectedOutcome.timeframe}
              variant="neutral"
            />
          </div>

          {/* Justification Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowJustification(!showJustification)}
            leftIcon={<Info className="w-4 h-4" />}
            rightIcon={showJustification ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            className="w-full justify-between"
          >
            {showJustification ? 'Hide Analysis' : 'Why This Recommendation?'}
          </Button>

          {/* Justification */}
          {showJustification && (
            <div className="bg-[#0a0a0a] rounded-lg p-4">
              <pre className="text-sm text-gray-400 whitespace-pre-wrap font-sans">
                {recommendation.justification}
              </pre>
            </div>
          )}

          {/* Alternatives */}
          {recommendation.alternativeOptions && recommendation.alternativeOptions.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAlternatives(!showAlternatives)}
                rightIcon={showAlternatives ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                className="w-full justify-between"
              >
                Alternative Options
              </Button>

              {showAlternatives && (
                <div className="space-y-2">
                  {recommendation.alternativeOptions.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => setModifiedAmount(option.amount)}
                      className="w-full text-left bg-[#0a0a0a] rounded-lg p-3 hover:bg-[#1a1a1a] transition-colors"
                    >
                      <p className="font-medium">{option.description}</p>
                      {option.amount > 0 && (
                        <p className="text-sm text-gray-500">
                          ${option.amount.toLocaleString()}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Status Messages */}
          {isApproved && (
            <Alert variant="success" title="Action Approved">
              This recommendation has been approved and will be executed.
            </Alert>
          )}
          {isRejected && (
            <Alert variant="error" title="Action Rejected">
              This recommendation has been rejected. No action will be taken.
            </Alert>
          )}

          {/* Reasoning Input */}
          {isPending && (
            <div>
              <label className="text-sm text-gray-500 mb-2 block">
                Reasoning (optional)
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
      {isPending && (
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
            {modifiedAmount !== null && modifiedAmount !== recommendation.suggestedAction.amount && (
              <Button
                variant="outline"
                onClick={() => onModify(modifiedAmount, reasoning)}
                leftIcon={<Edit className="w-4 h-4" />}
                className="flex-1"
              >
                Modify & Approve
              </Button>
            )}
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

interface OutcomeBoxProps {
  label: string;
  value: string;
  variant: 'positive' | 'negative' | 'neutral';
}

function OutcomeBox({ label, value, variant }: OutcomeBoxProps) {
  const colors = {
    positive: 'text-[#00d4aa]',
    negative: 'text-red-400',
    neutral: 'text-white',
  };

  return (
    <div className="bg-[#0a0a0a] rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-semibold ${colors[variant]}`}>{value}</p>
    </div>
  );
}
