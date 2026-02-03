/**
 * Token Selector Component
 * Dropdown for selecting supported tokens
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { SUPPORTED_TOKENS, type SupportedToken } from '@/types/MarketData';

interface TokenSelectorProps {
  value: SupportedToken;
  onChange: (token: SupportedToken) => void;
  className?: string;
  disabled?: boolean;
}

export function TokenSelector({
  value,
  onChange,
  className,
  disabled = false,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedToken = SUPPORTED_TOKENS.find(t => t.symbol === value);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg border transition-all',
          'bg-[#1a1a1a] border-white/10 text-white',
          !disabled && 'hover:border-white/20 cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'border-[#00d4aa] ring-1 ring-[#00d4aa]/20'
        )}
      >
        <div className="flex items-center gap-3">
          <TokenIcon symbol={value} />
          <div className="text-left">
            <span className="font-medium">{value}</span>
            <span className="text-gray-500 text-sm ml-2">
              {selectedToken?.displayName}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
            {SUPPORTED_TOKENS.map((token) => (
              <button
                key={token.symbol}
                type="button"
                onClick={() => {
                  onChange(token.symbol);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                  'hover:bg-white/5',
                  value === token.symbol && 'bg-[#00d4aa]/10'
                )}
              >
                <TokenIcon symbol={token.symbol} />
                <div>
                  <span className="font-medium">{token.symbol}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    {token.displayName}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
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
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
      style={{ backgroundColor: colors[symbol] || '#666' }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}
