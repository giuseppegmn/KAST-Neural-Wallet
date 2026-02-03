/**
 * Market Data Card
 * Displays real-time price data from Pyth Network
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { formatPrice, formatUncertainty, formatFreshness } from '@/lib/pyth';
import type { ProcessedPriceData } from '@/types/MarketData';
import { Activity, Clock } from 'lucide-react';

interface MarketDataCardProps {
  data: ProcessedPriceData;
  className?: string;
}

export function MarketDataCard({ data, className }: MarketDataCardProps) {
  const isSafe = !data.isStale && data.relativeUncertainty <= 0.01;
  
  return (
    <Card variant="glass" className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TokenIcon symbol={data.symbol} />
            <div>
              <CardTitle>{data.symbol}</CardTitle>
              <p className="text-sm text-gray-500">
                Pyth Network Feed
              </p>
            </div>
          </div>
          <Badge variant={isSafe ? 'success' : data.isStale ? 'error' : 'warning'}>
            {isSafe ? 'Valid' : data.isStale ? 'Stale' : 'High Uncertainty'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {formatPrice(data.price)}
            </span>
            <span className="text-sm text-gray-500">
              USD
            </span>
          </div>
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <MetricRow
              icon={<Activity className="w-4 h-4" />}
              label="Confidence"
              value={formatUncertainty(data.relativeUncertainty)}
              isWarning={data.relativeUncertainty > 0.005}
            />
            <MetricRow
              icon={<Clock className="w-4 h-4" />}
              label="Data Freshness"
              value={formatFreshness(data.dataFreshnessMs)}
              isWarning={data.isStale}
            />
          </div>
          
          {/* Status Message */}
          {!isSafe && (
            <div className="text-sm text-yellow-400 bg-yellow-500/10 rounded-lg p-3">
              {data.isStale 
                ? `Data is ${formatFreshness(data.dataFreshnessMs)} old. Simulations blocked.`
                : `Uncertainty ${formatUncertainty(data.relativeUncertainty)} exceeds safe threshold.`
              }
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  isWarning?: boolean;
}

function MetricRow({ icon, label, value, isWarning }: MetricRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={isWarning ? 'text-yellow-400' : 'text-gray-400'}>
        {icon}
      </span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-medium ${isWarning ? 'text-yellow-400' : 'text-white'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function TokenIcon({ symbol }: { symbol: string }) {
  const colors: Record<string, string> = {
    BTC: '#F7931A',
    ETH: '#627EEA',
    SOL: '#14F195',
    USDC: '#2775CA',
    USDT: '#26A17B',
  };

  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
      style={{ backgroundColor: colors[symbol] || '#666' }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}
