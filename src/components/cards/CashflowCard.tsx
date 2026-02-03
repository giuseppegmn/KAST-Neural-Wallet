import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import type { CashflowForecastResult } from '@/lib/cashflowEngine';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface Props {
  forecast: CashflowForecastResult | null;
}

export function CashflowCard({ forecast }: Props) {
  if (!forecast) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Cashflow Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">Insufficient cashflow data to generate a forecast.</p>
        </CardContent>
      </Card>
    );
  }

  const isOverdraftLikely = forecast.probabilityOfOverdraft > 0.25;
  const delta = forecast.expectedEndingBalance - forecast.startingBalance;

  return (
    <Card variant="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Cashflow Forecast (next {forecast.horizonDays}d)</CardTitle>
          <Badge variant={isOverdraftLikely ? 'error' : 'success'}>
            P(Overdraft): {(forecast.probabilityOfOverdraft * 100).toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Starting balance</span>
            <span className="font-semibold">${forecast.startingBalance.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Expected ending balance</span>
            <span className="font-semibold">${forecast.expectedEndingBalance.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Confidence interval ({Math.round(forecast.confidenceLevel * 100)}%)</span>
            <span className="font-semibold">
              ${forecast.lowerBound.toFixed(2)} – ${forecast.upperBound.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {delta >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#00d4aa]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className="text-gray-400">Expected net change:</span>
            <span className={delta >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}>
              {delta >= 0 ? '+' : ''}${delta.toFixed(2)}
            </span>
          </div>

          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-gray-500">
              Mean daily net: ${forecast.meanDailyNet.toFixed(2)} | Std: ${forecast.stdDailyNet.toFixed(2)} (lookback {forecast.inputDays}d)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
