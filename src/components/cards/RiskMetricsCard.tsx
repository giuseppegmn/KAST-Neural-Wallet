/**
 * Risk Metrics Card
 * Displays computed risk metrics with explanations
 */

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { formatRiskMetrics } from '@/lib/riskMetrics';
import type { RiskMetrics } from '@/lib/riskMetrics';
import { AlertTriangle, Shield, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface RiskMetricsCardProps {
  metrics: RiskMetrics;
  portfolioValue: number;
  scenario: string;
  className?: string;
}

export function RiskMetricsCard({
  metrics,
  className,
}: RiskMetricsCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const formatted = formatRiskMetrics(metrics);
  
  // Determine risk level based on VaR
  const getRiskLevel = () => {
    if (metrics.var95 > 0.15) return { level: 'HIGH', color: 'error' as const };
    if (metrics.var95 > 0.1) return { level: 'MEDIUM', color: 'warning' as const };
    return { level: 'LOW', color: 'success' as const };
  };
  
  const riskLevel = getRiskLevel();

  return (
    <Card variant="glass" className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <div>
              <CardTitle>Risk Assessment</CardTitle>
              <p className="text-sm text-gray-500">
                Deterministic calculation
              </p>
            </div>
          </div>
          <Badge variant={riskLevel.color}>
            {riskLevel.level} RISK
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <MetricBox
              label="VaR 95%"
              value={formatted.var95}
              tooltip="Maximum expected loss at 95% confidence"
            />
            <MetricBox
              label="CVaR 95%"
              value={formatted.cvar95}
              tooltip="Expected Shortfall - average loss beyond VaR"
            />
            <MetricBox
              label="Volatility (Ann.)"
              value={formatted.volatility}
              tooltip="Annualized standard deviation of returns"
            />
            <MetricBox
              label="Max Drawdown"
              value={formatted.maxDrawdown}
              tooltip="Maximum peak-to-trough decline"
              isWarning={metrics.maxDrawdown > 0.2}
            />
          </div>
          
          {/* At Risk Amount */}
          <div className="bg-[#0a0a0a] rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Amount at Risk (VaR 95%)</p>
            <p className="text-xl font-semibold text-red-400">
              {formatted.atRiskAmount}
            </p>
          </div>
          
          {/* Details Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            leftIcon={<FileText className="w-4 h-4" />}
            rightIcon={showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            className="w-full justify-between"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
          
          {/* Detailed Metrics */}
          {showDetails && (
            <div className="bg-[#0a0a0a] rounded-lg p-4 font-mono text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">VaR 99%:</span>
                  <span>{(metrics.var99 * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">CVaR 99%:</span>
                  <span>{(metrics.cvar99 * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Daily Volatility:</span>
                  <span>{(metrics.volatilityDaily * 100).toFixed(3)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Relative Uncertainty:</span>
                  <span>{(metrics.relativeUncertainty * 100).toFixed(3)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Drawdown:</span>
                  <span>{(metrics.currentDrawdown * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Warning for high risk */}
          {metrics.var95 > 0.15 && (
            <div className="flex items-start gap-2 text-red-400 bg-red-500/10 rounded-lg p-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">
                High risk detected. VaR exceeds 15%. This action requires careful consideration 
                and explicit approval.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricBoxProps {
  label: string;
  value: string;
  tooltip: string;
  isWarning?: boolean;
}

function MetricBox({ label, value, tooltip, isWarning }: MetricBoxProps) {
  return (
    <div 
      className="bg-[#0a0a0a] rounded-lg p-3"
      title={tooltip}
    >
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${isWarning ? 'text-yellow-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
