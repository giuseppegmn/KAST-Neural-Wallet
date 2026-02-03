/**
 * Forecast Card
 * 
 * Displays statistical forecast with confidence intervals and model details.
 */

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import type { ForecastResult } from '@/lib/forecastEngine';
import { ChevronDown, ChevronUp, TrendingUp, Calculator } from 'lucide-react';

interface ForecastCardProps {
  forecast: ForecastResult | null;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function ForecastCard({ forecast, isGenerating, onGenerate }: ForecastCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (isGenerating) {
    return (
      <Card variant="glass">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-400">Running statistical models...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!forecast) {
    return (
      <Card variant="glass">
        <CardContent className="py-8 text-center">
          <p className="text-gray-500 mb-4">No forecast generated yet</p>
          <Button onClick={onGenerate} variant="primary">
            Generate Forecast
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formatPrice = (n: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 2 
    }).format(n);

  return (
    <Card variant="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-[#00d4aa]" />
            <CardTitle>Statistical Forecast</CardTitle>
          </div>
          <Badge variant="info">{forecast.model}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Main Forecast */}
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-1">Expected Value ({forecast.forecastHorizon} days)</p>
            <p className="text-4xl font-bold text-[#00d4aa]">{formatPrice(forecast.expectedValue)}</p>
          </div>

          {/* Confidence Interval */}
          <div className="bg-[#0a0a0a] rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-2">
              {(forecast.confidenceLevel * 100).toFixed(0)}% Confidence Interval
            </p>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-sm text-gray-500">Lower</p>
                <p className="font-semibold">{formatPrice(forecast.lowerBound)}</p>
              </div>
              <div className="flex-1 mx-4 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-[#00d4aa]"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Upper</p>
                <p className="font-semibold">{formatPrice(forecast.upperBound)}</p>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              Error Margin: ±{formatPrice(forecast.errorMargin)}
            </p>
          </div>

          {/* Model Details Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            leftIcon={<Calculator className="w-4 h-4" />}
            rightIcon={showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            className="w-full justify-between"
          >
            Model Parameters
          </Button>

          {showDetails && (
            <div className="bg-[#0a0a0a] rounded-lg p-4 font-mono text-sm">
              <p className="text-gray-500 mb-2">Model: {forecast.model}</p>
              <p className="text-gray-500 mb-2">Data Points: {forecast.inputDataPoints}</p>
              {forecast.rmse && (
                <p className="text-gray-500 mb-2">RMSE: {formatPrice(forecast.rmse)}</p>
              )}
              {forecast.rSquared !== undefined && (
                <p className="text-gray-500 mb-2">R²: {forecast.rSquared.toFixed(4)}</p>
              )}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-gray-500 mb-2">Parameters:</p>
                {Object.entries(forecast.modelParams).map(([key, value]) => (
                  <p key={key} className="text-gray-400">
                    {key}: {typeof value === 'number' ? value.toFixed(4) : String(value)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
