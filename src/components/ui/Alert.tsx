/**
 * Alert Component for notifications and warnings
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  className?: string;
}

export function Alert({
  children,
  variant = 'info',
  title,
  className,
}: AlertProps) {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
  };
  
  const Icon = icons[variant];
  
  const variantStyles = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    success: 'bg-[#00d4aa]/10 border-[#00d4aa]/20 text-[#00d4aa]',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          <div className="text-sm opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
}
