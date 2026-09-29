import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full bg-hub-bg border border-hub-border rounded-[9px]',
        'px-3 py-2.5 text-[13px] text-hub-text',
        'placeholder:text-hub-text-muted',
        'outline-none',
        'focus:border-hub-accent focus:ring-1 focus:ring-hub-accent/30',
        'transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
