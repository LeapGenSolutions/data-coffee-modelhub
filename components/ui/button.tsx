import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'accent-outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = [
      'inline-flex items-center justify-center gap-2 font-semibold',
      'transition-all duration-200 ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hub-accent focus-visible:ring-offset-2 focus-visible:ring-offset-hub-bg',
      'disabled:opacity-50 disabled:pointer-events-none',
      'active:scale-[0.97] cursor-pointer select-none',
    ].join(' ');

    const variants: Record<string, string> = {
      default: [
        'bg-hub-accent text-white hover:bg-hub-accent-hi',
        'shadow-md shadow-hub-accent/20 hover:shadow-lg hover:shadow-hub-accent/30',
      ].join(' '),
      outline: [
        'border border-hub-border bg-transparent text-hub-text',
        'hover:bg-hub-hover hover:border-hub-text-muted/40',
        'shadow-sm',
      ].join(' '),
      secondary: [
        'bg-hub-panel border border-hub-border text-hub-text',
        'hover:bg-hub-hover hover:border-hub-text-muted/40',
        'shadow-sm',
      ].join(' '),
      ghost: [
        'text-hub-text-sec hover:bg-hub-hover hover:text-hub-text',
        'rounded-lg',
      ].join(' '),
      destructive: [
        'bg-red-600 text-white hover:bg-red-500',
        'shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30',
      ].join(' '),
      'accent-outline': [
        'border border-hub-accent/40 bg-hub-accent/10 text-hub-accent-hi',
        'hover:bg-hub-accent/20 hover:border-hub-accent/60',
        'shadow-sm shadow-hub-accent/10',
      ].join(' '),
    };

    const sizes: Record<string, string> = {
      default: 'px-4 py-2.5 text-[13px] rounded-[10px]',
      sm: 'px-3 py-1.5 text-xs rounded-[9px]',
      lg: 'px-5 py-3 text-sm rounded-[12px]',
      icon: 'w-[34px] h-[34px] p-0 rounded-[9px]',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
