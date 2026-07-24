import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'success' | 'usage' | 'provider' | 'warning';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const baseStyles = [
    'inline-flex items-center gap-1.5',
    'px-2.5 py-[3px] rounded-full',
    'text-[10.5px] font-semibold leading-none',
    'transition-colors duration-150 select-none',
  ].join(' ');

  const variants: Record<string, string> = {
    default: [
      'bg-hub-hover/80 text-hub-text-sec',
      'border border-hub-border/80',
    ].join(' '),
    outline: [
      'bg-transparent text-hub-text-muted',
      'border border-hub-border',
    ].join(' '),
    success: [
      'text-[#7EE2BC] bg-[rgba(16,163,127,0.14)]',
      'border border-[rgba(16,163,127,0.25)]',
    ].join(' '),
    usage: [
      'text-[#9DB0FF] bg-[rgba(110,142,247,0.14)]',
      'border border-[rgba(110,142,247,0.25)]',
    ].join(' '),
    provider: [
      'text-hub-text bg-hub-panel/80',
      'border border-hub-border',
      'backdrop-blur-sm',
    ].join(' '),
    warning: [
      'text-amber-400 bg-amber-500/10',
      'border border-amber-500/25',
    ].join(' '),
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    />
  );
}
