/**
 * Reusable Card Component
 * Consistent styling across the application
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'bordered' | 'elevated';
  hover?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className,
  variant = 'default',
  hover = false,
  onClick,
}: CardProps) {
  const baseStyles = 'rounded-xl overflow-hidden';
  
  const variantStyles = {
    default: 'bg-[#1a1a1a] border border-white/5',
    glass: 'glass border border-white/10',
    bordered: 'bg-transparent border border-white/20',
    elevated: 'bg-[#1a1a1a] shadow-xl border border-white/5',
  };
  
  const hoverStyles = hover
    ? 'transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg hover:border-[#00d4aa]/30 cursor-pointer'
    : '';

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], hoverStyles, className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-white/5', className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold text-white', className)}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-gray-400 mt-1', className)}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-white/5 flex items-center gap-3', className)}>
      {children}
    </div>
  );
}
