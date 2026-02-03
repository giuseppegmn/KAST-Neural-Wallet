/**
 * Market Data Hook
 * 
 * Combines Pyth real-time data with historical time-series management.
 * Provides a unified interface for all market data needs.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPriceUpdates, type ProcessedPriceData } from '@/lib/pyth';
import { 
  getStatistics, 
  getVolatility, 
  getDrawdown,
  seedSyntheticHistory,
  type SeriesStatistics,
} from '@/lib/marketHistory';
import type { SupportedToken } from '@/types/MarketData';

interface UseMarketDataOptions {
  tokens: SupportedToken[];
  refreshInterval?: number; // ms
  useSyntheticData?: boolean; // For demo/testing
  enabled?: boolean;
}

interface UseMarketDataReturn {
  // Real-time prices
  prices: ProcessedPriceData[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number | null;
  
  // Historical statistics
  getAssetStats: (symbol: string) => SeriesStatistics | null;
  getAssetVolatility: (symbol: string) => number;
  getAssetDrawdown: (symbol: string) => { max: number; current: number };
  
  // Actions
  refresh: () => Promise<void>;
  seedSynthetic: (symbol: SupportedToken, initialPrice: number) => void;
}

export function useMarketData(options: UseMarketDataOptions): UseMarketDataReturn {
  const { 
    tokens, 
    refreshInterval = 10000, 
    useSyntheticData = false,
    enabled = true 
  } = options;
  
  const [prices, setPrices] = useState<ProcessedPriceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // Fetch data from Pyth
  const fetchData = useCallback(async () => {
    if (!enabled || tokens.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const priceData = await fetchPriceUpdates(tokens);
      
      if (isMountedRef.current) {
        setPrices(priceData);
        setLastUpdated(Date.now());
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch prices'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [tokens, enabled]);

  // Seed synthetic data for demo
  const seedSynthetic = useCallback((symbol: SupportedToken, initialPrice: number) => {
    seedSyntheticHistory(symbol, initialPrice, 60, 0.6, 0.15);
  }, []);

  // Get asset statistics
  const getAssetStats = useCallback((symbol: string): SeriesStatistics | null => {
    return getStatistics(symbol);
  }, []);

  // Get asset volatility
  const getAssetVolatility = useCallback((symbol: string): number => {
    return getVolatility(symbol);
  }, []);

  // Get asset drawdown
  const getAssetDrawdown = useCallback((symbol: string): { max: number; current: number } => {
    return getDrawdown(symbol);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (useSyntheticData) {
      // Seed synthetic data for all tokens
      const initialPrices: Record<SupportedToken, number> = {
        BTC: 45000,
        ETH: 2800,
        SOL: 98,
        USDC: 1,
        USDT: 1,
      };
      
      tokens.forEach(token => {
        seedSynthetic(token, initialPrices[token]);
      });
      
      // Set mock prices
      setPrices(tokens.map(t => ({
        symbol: t,
        price: initialPrices[t],
        confidence: initialPrices[t] * 0.001,
        publishTime: Date.now(),
        expo: -8,
        relativeUncertainty: 0.001,
        dataFreshnessMs: 0,
        isStale: false,
        isValid: true,
      })));
      
      setLastUpdated(Date.now());
    } else {
      fetchData();
    }
  }, [fetchData, useSyntheticData, tokens, seedSynthetic]);

  // Setup refresh interval
  useEffect(() => {
    if (!enabled || refreshInterval <= 0 || useSyntheticData) return;
    
    intervalRef.current = setInterval(fetchData, refreshInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval, enabled, useSyntheticData]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    prices,
    isLoading,
    error,
    lastUpdated,
    getAssetStats,
    getAssetVolatility,
    getAssetDrawdown,
    refresh: fetchData,
    seedSynthetic,
  };
}
